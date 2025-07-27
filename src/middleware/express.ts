import type { Request, Response, NextFunction } from 'express';
import { createRequestCache, FirestoreInstance } from '../core/index';
import onFinished from 'on-finished';

/**
 * Creates an Express middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns An Express middleware function.
 */
export function fireCacheMiddleware(firestore: FirestoreInstance) {
    return (_: Request, res: Response, next: NextFunction) => {
        const cleanup = createRequestCache(firestore);
        onFinished(res, cleanup);
        next();
    };
}