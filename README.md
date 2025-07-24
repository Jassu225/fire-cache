# fire-cache

**fire-cache** is a transparent, request-scoped caching library for Google Firestore (Node.js), designed for use with Express, NestJS, and Koa. It dramatically reduces redundant Firestore reads within a single request, while guaranteeing data freshness and type safety.

---

## Features

- ⚡ **Zero-config, request-scoped cache** for Firestore document reads
- 🧩 **Works with Express, NestJS, and Koa** via simple middleware
- 🔒 **Type-safe**: supports both `firebase-admin` and `@google-cloud/firestore` SDKs
- 🧪 **Battle-tested**: includes both mock-based and real Firestore integration tests
- 🦾 **No stale queries**: only caches documents, never query result sets

---

## Installation

```bash
npm install fire-cache
```

---

## Usage

### 1. Express

```ts
import express from 'express';
import { createExpressFirestoreCache } from 'fire-cache/middleware/express';
import admin from 'firebase-admin';

admin.initializeApp({ /* ... */ });
const firestore = admin.firestore();

const app = express();
app.use(createExpressFirestoreCache(firestore));

// ...your routes
```

### 2. NestJS

```ts
import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { createNestjsFirestoreCache } from 'fire-cache/middleware/nestjs';
import admin from 'firebase-admin';

admin.initializeApp({ /* ... */ });
const firestore = admin.firestore();

@Module({
  // ...
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(createNestjsFirestoreCache(firestore)).forRoutes('*');
  }
}
```

### 3. Koa

```ts
import Koa from 'koa';
import { createKoaFirestoreCache } from 'fire-cache/middleware/koa';
import admin from 'firebase-admin';

admin.initializeApp({ /* ... */ });
const firestore = admin.firestore();

const app = new Koa();
app.use(createKoaFirestoreCache(firestore));

// ...your routes
```

---

## How It Works

- **Monkey-patches** the `get()` methods of Firestore's `DocumentReference` and `Query` prototypes.
- Caches only individual document reads (`DocumentReference.get()`), never query result sets.
- When a query is run, all returned documents are updated in the cache, ensuring maximum freshness.
- The cache is cleared at the end of each request.

---

## API

### Core

```ts
import { createRequestCache } from 'fire-cache/core/cache';

const cleanup = createRequestCache(firestore);
// ...do Firestore reads
cleanup(); // restores original methods and clears cache
```

### Middleware

- `createExpressFirestoreCache(firestore)`
- `createNestjsFirestoreCache(firestore)`
- `createKoaFirestoreCache(firestore)`

Each middleware sets up and tears down the cache automatically per request.

---

## Type Safety

- Works with both `firebase-admin` and `@google-cloud/firestore` SDKs.
- All cache and patching logic is fully typed.

---

## Testing

- **Unit tests**: Fast, mock-based, cover all core logic.
- **Integration tests**: Use a real Firestore instance (see `.env.test` and `FIREBASE_SERVICE_ACCOUNT`).

---

## Contributing

PRs and issues welcome! Please add tests for new features.

---

## License

MIT