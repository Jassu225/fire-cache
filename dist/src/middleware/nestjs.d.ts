import { NestInterceptor } from '@nestjs/common';
import { FirestoreInstance } from '../core/cache.js';
/**
 * Creates a NestJS Interceptor that enables request-level caching for Firestore.
 * This interceptor should be provided with a Firestore instance.
 */
export declare function FireCacheInterceptor(firestore: FirestoreInstance): Type<NestInterceptor>;
import { DynamicModule, Type } from '@nestjs/common';
export declare const FIRESTORE_INSTANCE_PROVIDER = "@@__FIRESTORE_INSTANCE__@@";
export declare class FireCacheModule {
    static forRoot(options: {
        firestore: FirestoreInstance;
    }): DynamicModule;
}
