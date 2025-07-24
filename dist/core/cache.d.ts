import type { Firestore, DocumentReference, Query, DocumentData, DocumentSnapshot, QuerySnapshot } from '@google-cloud/firestore';
import type { firestore as adminFirestore } from 'firebase-admin';
export type FirestoreInstance = Firestore | adminFirestore.Firestore;
export type DocumentDataType = DocumentData | adminFirestore.DocumentData;
export type DocumentSnapshotType = DocumentSnapshot | adminFirestore.DocumentSnapshot;
export type QuerySnapshotType = QuerySnapshot | adminFirestore.QuerySnapshot;
export type DocumentReferenceType = DocumentReference | adminFirestore.DocumentReference;
export type QueryType = Query | adminFirestore.Query;
/**
 * Creates a request-scoped cache and patches the `get` methods of the provided
 * Firestore instance to use the cache.
 *
 * @param firestore The Firestore instance to patch.
 * @returns A function to clean up the patch and clear the cache.
 */
export declare function createRequestCache(firestore: FirestoreInstance): () => void;
