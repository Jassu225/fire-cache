import type { Context, Next } from 'koa';
import { createRequestCache, FirestoreInstance } from '../core/cache.js';

/**
 * Creates a Koa middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Koa middleware function.
 */
export function fireCacheMiddleware(firestore: FirestoreInstance) {
    return async (ctx: Context, next: Next) => {
        const cleanup = createRequestCache(firestore);
        try {
            await next();
        } finally {
            cleanup();
        }
    };
}