# fire-memoize

**fire-memoize** is a minimalist, transparent, request-scoped caching library for Google Firestore (Node.js), designed for use with Express, NestJS, Koa, and Fastify. It dramatically reduces redundant Firestore reads within a single request, while guaranteeing data freshness and type safety.

## Features

- ⚡ **Zero-config, request-scoped cache** for Firestore document reads
- 🧩 **Works with Express, NestJS, Koa, and Fastify** via simple middleware
- 🔒 **Type-safe**: Supports both `firebase-admin` and `@google-cloud/firestore` SDKs
- 🧪 **Battle-tested**: Includes both mock-based and real Firestore integration tests
- 🦾 **No stale queries**: Only caches documents, never query result sets

## Installation

```bash
npm install fire-memoize
```

### Optional Peer Dependencies

Depending on your framework of choice, you may need to install additional packages:

- `@nestjs/common` (for NestJS)
- `on-finished` (for Express)
- `rxjs` (for Koa)
- `fastify` (for Fastify)

## Usage

### 1. Express

```ts
import express from "express";
import { fireCacheMiddleware } from "fire-memoize/middleware/express";
import admin, { ServiceAccount } from "firebase-admin";

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

const app = express();
app.use(fireCacheMiddleware(firestore));

// ... your Express routes and middleware
```

### 2. NestJS

```ts
import { MiddlewareConsumer, Module, NestModule } from "@nestjs/common";
import { FireCacheModule } from "fire-memoize/middleware/nestjs";
import admin, { ServiceAccount } from "firebase-admin";

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

@Module({
  imports: [
    FireCacheModule.forRoot({ firestore }),
    // ... your other modules
  ],
})
export class AppModule {}
```

### 3. Koa

```ts
import Koa from "koa";
import { fireCacheMiddleware } from "fire-memoize/middleware/koa";
import admin, { ServiceAccount } from "firebase-admin";

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

const app = new Koa();
app.use(fireCacheMiddleware(firestore));

// ... your Koa routes and middleware
```

### 4. Fastify

```ts
import Fastify from "fastify";
import { registerHooks } from "fire-memoize/middleware/fastify";
import admin, { ServiceAccount } from "firebase-admin";

// Initialize Firebase Admin SDK
const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

const fastify = Fastify();

// Register the fire-memoize hooks
registerHooks(fastify, firestore);

// ... your Fastify routes and middleware
```

> **Note**: Fastify v3.0.0+ requires external middleware plugins. If you need Express-style middleware support, you can use `@fastify/express` or `@fastify/middie` plugins. However, the `registerHooks` function provided by fire-memoize works natively with Fastify's plugin system and doesn't require additional middleware plugins.

## How It Works

- **Monkey-patches** the `get()` methods of Firestore's DocumentReference and Query prototypes.
- Caches only individual document reads (`DocumentReference.get()`), never query result sets.
- When a query is run, all returned documents are updated in the cache, ensuring maximum freshness.
- The cache is cleared automatically at the end of each request by the provided framework middleware.

## API

### Core

It's easy to add to any other framework or environment where direct middleware support isn't available, by manually managing the cache:

```ts
import { createRequestCache } from "fire-memoize/core";

// Initialize your Firestore instance
// const firestore = ...;

const cleanup = createRequestCache(firestore);
// ... Perform your Firestore reads (e.g., in a request handler)
cleanup(); // Call cleanup when done to restore original methods and clear the cache
```

Below are the examples to integrate with Next.js `Pages router` and `App router`

### 1. Next.js (Pages router)

For Next.js API routes or getServerSideProps, you can easily integrate fire-memoize using its core createRequestCache function to ensure request-scoped caching.

```ts
// pages/api/users.ts
import type { NextApiRequest, NextApiResponse } from "next";
import admin, { ServiceAccount } from "firebase-admin";
import { createRequestCache } from "fire-memoize/core"; // Import from the core module

// Initialize Firebase Admin SDK (do this once globally in a real app, e.g., in lib/firebaseAdmin.ts)
const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  let cleanup: (() => void) | undefined;

  try {
    // Initialize the request-scoped cache for this specific request
    cleanup = createRequestCache(firestore);

    const userId = (req.query.userId as string) || "exampleUser123";
    const userDocRef = firestore.collection("users").doc(userId);

    // First read for the user document (will hit Firestore if not already cached by a query)
    const userSnapshot1 = await userDocRef.get();
    const userData1 = userSnapshot1.data();

    // Subsequent read for the same user document within the same request (will hit cache)
    const userSnapshot2 = await userDocRef.get();
    const userData2 = userSnapshot2.data(); // This data comes from the in-request cache

    res.status(200).json({
      message: "Firestore reads cached with fire-memoize in Next.js API route.",
      userData: userData1,
    });
  } catch (error) {
    console.error("Error in Next.js API route:", error);
    res.status(500).json({
      error: "Internal Server Error",
      details: (error as Error).message,
    });
  } finally {
    // Crucially, clean up the cache at the end of the request
    if (cleanup) {
      cleanup();
    }
  }
}
```

### 2. Next.js (App Router route.ts)

Integrating fire-memoize with Next.js App Router `route.ts` files is similar to `Pages router`, leveraging the core createRequestCache function for request-scoped caching.

```ts
// app/api/users/[userId]/route.ts
import { NextRequest, NextResponse } from "next/server";
import admin, { ServiceAccount } from "firebase-admin";
import { createRequestCache } from "fire-memoize/core"; // Import from the core module

const firebaseApp = !admin.apps.length
  ? admin.initializeApp({
      credential: admin.credential.cert(
        JSON.parse(
          Buffer.from(
            // value in FIREBASE_SERVICE_ACCOUNT is btoa(JSON.stringify(<service_account.json>))
            process.env.FIREBASE_SERVICE_ACCOUNT as string,
            "base64"
          ).toString("utf-8")
        ) as ServiceAccount
      ),
    })
  : admin.app();

const firestore = admin.firestore(firebaseApp);

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  let cleanup: (() => void) | undefined;

  try {
    // Initialize the request-scoped cache for this specific request
    cleanup = createRequestCache(firestore);

    const userId = params.userId;
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const userDocRef = firestore.collection("users").doc(userId);

    // First read for the user document (will hit Firestore if not already cached by a query)
    console.log(`[GET /api/users/${userId}] Attempting first read...`);
    const userSnapshot1 = await userDocRef.get();
    const userData1 = userSnapshot1.data();
    console.log(`[GET /api/users/${userId}] First read data:`, userData1);

    // Subsequent read for the same user document within the same request (will hit cache)
    console.log(`[GET /api/users/${userId}] Attempting second read...`);
    const userSnapshot2 = await userDocRef.get();
    const userData2 = userSnapshot2.data(); // This data comes from the in-request cache
    console.log(
      `[GET /api/users/${userId}] Second read data (from cache):`,
      userData2
    );

    return NextResponse.json({
      message:
        "Firestore reads cached with fire-memoize in Next.js App Router.",
      userData: userData1,
    });
  } catch (error) {
    console.error("Error in Next.js App Router route:", error);
    return NextResponse.json(
      { error: "Internal Server Error", details: (error as Error).message },
      { status: 500 }
    );
  } finally {
    // Crucially, clean up the cache at the end of the request
    if (cleanup) {
      cleanup();
      console.log(`[GET /api/users/${userId}] fire-memoize cache cleaned up.`);
    }
  }
}
```

### Middleware

The following functions provide ready-to-use middleware for your chosen framework:

- `fireCacheMiddleware(firestore)` (Express middleware)
- `FireCacheModule.forRoot({ firestore })` (NestJS module)
- `fireCacheMiddleware(firestore)` (Koa middleware)
- `registerHooks(fastify, firestore)` (Fastify hooks)

Each middleware function automatically sets up the request-scoped cache at the beginning of a request and tears it down (clearing the cache and restoring original Firestore methods) when the request finishes.

## Safe Multiple `docRef.get()` Calls

Thanks to **fire-memoize**'s request-scoped caching, you can safely call `docRef.get()` multiple times within a single request without incurring redundant Firestore reads. The library ensures that the actual Firestore call for a specific document happens only once per request, and subsequent calls for the same document will retrieve the data from the in-memory cache.

This means you can structure your code for readability and modularity, calling docRef.get() whenever you need a document, without worrying about performance overhead from repeated database access.

**Pseudo-code Example:**

```ts
// Inside a single request handler or service method:

const userDocRef = firestore.collection("users").doc("someUserId");

// First call to get the user document
const userSnapshot1 = await userDocRef.get(); // Actual Firestore read happens here (if not already cached)
const userData1 = userSnapshot1.data();

// Later in the same request, you might need the same user document again
const userSnapshot2 = await userDocRef.get(); // Data is retrieved from the fire-memoize cache, NO new Firestore read
const userData2 = userSnapshot2.data();

// Even later, another component might request it
const userSnapshot3 = await userDocRef.get(); // Still from cache, NO new Firestore read
const userData3 = userSnapshot3.data();

// All three calls to docRef.get() result in only ONE actual Firestore read
// for the document 'users/someUserId' during this request's lifecycle.
```

## Type Safety

- Works seamlessly with both `firebase-admin` and `@google-cloud/firestore` SDKs.
- All internal cache and patching logic is fully type-safe, providing a robust development experience.

## Testing

**fire-memoize** includes comprehensive tests to ensure reliability:

- **Unit tests**: Fast, mock-based tests that cover all core logic.
- **Integration tests**: These tests use a real Firestore instance. To run them, ensure you have a `FIREBASE_SERVICE_ACCOUNT` environment variable in `.env.test` set with the base64-encoded JSON string of your Firebase service account key (e.g. `atob(JSON.stringify(service_account.json))`).

You can run the mock tests with:

```bash
npm run test:mock
```

And the Firebase Admin integration tests with:

```bash
npm run test:firebase-admin
```

## Contributing

We welcome contributions! Please feel free to open PRs or issues. When submitting new features, please include corresponding tests.

## License

MIT
