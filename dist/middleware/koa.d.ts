import type { Context, Next } from 'koa';
import { FirestoreInstance } from '../core/cache.js';
/**
 * Creates a Koa middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Koa middleware function.
 */
export declare function fireCacheMiddleware(firestore: FirestoreInstance): (ctx: Context, next: Next) => Promise<void>;
