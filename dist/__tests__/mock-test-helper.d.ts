import type { FirestoreInstance } from '../src/core/cache';
export declare const getCallCountRef: {
    current: number;
};
export declare const mockFirestore: (collections: Record<string, any>) => FirestoreInstance;
