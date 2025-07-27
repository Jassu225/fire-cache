import type { Request, Response, NextFunction } from 'express';
import { FirestoreInstance } from '../core/index';
/**
 * Creates an Express middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns An Express middleware function.
 */
export declare function fireCacheMiddleware(firestore: FirestoreInstance): (_: Request, res: Response, next: NextFunction) => void;
