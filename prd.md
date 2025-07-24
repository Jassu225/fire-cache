# Product Requirements Document: fire-cache

This document outlines the requirements for the `fire-cache` npm package.

## 1. Overview

`fire-cache` is a server-side caching library for Google Firestore, designed to reduce database reads by caching documents on a per-request basis. It integrates with popular Node.js frameworks like Express.js, NestJS, and Koa.js using a middleware-based approach.

## 2. Core Features

- Request-level in-memory caching for Firestore documents.
- Automatic cache lifecycle management (creation at request start, clearing at request end).
- Seamless integration with Express.js, NestJS, and Koa.js.
- Written in TypeScript with modern ES Module syntax.
- Aims to be a thin, performant wrapper around `@google-cloud/firestore`.

## 3. Chosen API Design: Transparent Middleware (Monkey-Patching)

`fire-cache` will use a "monkey-patching" strategy to provide a seamless and transparent caching experience. This approach prioritizes ease of use, requiring no changes to the developer's existing data-fetching logic.

### 3.1. Core Caching Strategy: Strongly-Typed, Document-Level Caching

The core of the library is a request-scoped, in-memory cache for individual Firestore documents. To ensure both API compatibility and type safety, the library will cache the full `DocumentSnapshot` object, not just the raw data.

The caching logic is as follows:

1.  **`DocumentReference.get()`**: When a single document is requested, the cache is checked first. If the document is present, the cached `Promise<DocumentSnapshot>` is returned immediately. If not, the request proceeds to Firestore, and the resulting promise is stored in the cache before being returned.

2.  **`Query.get()`**: To ensure data freshness, the results of queries (`QuerySnapshot` objects) are **never** cached. Instead, the query is always executed against Firestore. After the `QuerySnapshot` is received, the library iterates through the resulting documents (`.docs` array) and **unconditionally writes each `DocumentSnapshot` to the cache**. This ensures that any subsequent `get()` calls for these documents—even if they were already in the cache—will resolve with the most up-to-date version retrieved by the query.

### 3.2. Type Safety

To provide a robust developer experience, the library will be strongly typed. It will define and use unified union types that represent the corresponding objects from both the `@google-cloud/firestore` and `firebase-admin` SDKs. This includes:
-   `DocumentDataType`
-   `DocumentSnapshotType`
-   `QuerySnapshotType`
-   `DocumentReferenceType`
-   `QueryType`

The internal cache will be strictly typed as `Map<string, Promise<DocumentSnapshotType>>`.

This hybrid approach ensures that queries always return the latest set of documents while still providing significant performance gains by caching the individual documents for subsequent `get` calls within the same request.

### 3.2. Middleware and Lifecycle

The library will provide a middleware function for each supported framework (Express, NestJS, Koa). This middleware will:
1.  Create a new `Map` to serve as the document cache for the current request.
2.  "Patch" the `get` methods on the prototypes of Firestore's `DocumentReference` and `Query` objects with the logic described above.
3.  Attach a "cleanup" function to the response object (e.g., on the `finish` event) to clear the cache and restore the original `get` methods, preventing memory leaks and cross-request pollution.

### 3.2. Framework Integration Examples

#### Express.js / Koa.js

```typescript
import { fireCacheMiddleware } from 'fire-cache';
import { Firestore } from '@google-cloud/firestore';

const app = express(); // or new Koa()
const firestore = new Firestore();

// The middleware is initialized with the Firestore instance
app.use(fireCacheMiddleware(firestore));

// No other changes are needed. Any `firestore.collection(...).get()` call
// within a request handler will now be automatically cached.
```

#### NestJS

For NestJS, we can provide a `FireCacheModule`.

```typescript
// app.module.ts
import { Module } from '@nestjs/common';
import { FireCacheModule } from 'fire-cache/nestjs';
import { Firestore } from '@google-cloud/firestore';

@Module({
  imports: [
    FireCacheModule.forRoot({
      // Provide the Firestore instance
      firestore: new Firestore(),
    }),
  ],
})
export class AppModule {}
```
The `FireCacheModule` would register a global interceptor that performs the same monkey-patching logic as the Express middleware.

### 3.3. Supported Firestore SDKs

To maximize utility for server-side development, `fire-cache` will support the following two SDKs:
1.  **`@google-cloud/firestore`**: The standalone Node.js client library for Firestore.
2.  **`firebase-admin`**: The all-in-one Firebase Admin SDK, from which the Firestore service can be accessed.

The middleware will be designed to accept a Firestore instance from either package.

### 3.1. Alternative 1: Decorator-Based API

- **Description:** Utilizes decorators (e.g., `@EnableFireCache`) for frameworks like NestJS to declaratively enable caching on specific controller methods.
- **Pros:** Idiomatic for decorator-based frameworks, clean, and easy to read.
- **Cons:** Not portable to frameworks like Express or Koa, requiring a separate API design for them.

### 3.2. Alternative 2: Explicit Wrapper Class

- **Description:** Developers import and use a `FireCache` class to explicitly wrap their Firestore queries. A middleware would inject a request-scoped instance of this class.
- **Pros:** Clear and unambiguous, giving developers fine-grained control over what is cached.
- **Cons:** More verbose, requiring developers to modify their query code.

### 3.3. Alternative 3: Monkey-Patching

- **Description:** The middleware transparently intercepts all Firestore `get()` calls by temporarily modifying the Firestore client's prototypes during a request.
- **Pros:** Requires no changes to existing application logic. Very easy to integrate.
- **Cons:** Can be considered "magic," potentially making debugging difficult. It's also more susceptible to breaking with updates to the underlying Firestore library.
