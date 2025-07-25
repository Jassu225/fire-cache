import { Injectable, NestInterceptor, ExecutionContext, CallHandler } from '@nestjs/common';
import { Observable } from 'rxjs';
import { tap } from 'rxjs/operators';
import { createRequestCache, FirestoreInstance } from '../core/cache.js';

/**
 * Creates a NestJS Interceptor that enables request-level caching for Firestore.
 * This interceptor should be provided with a Firestore instance.
 */
export function FireCacheInterceptor(firestore: FirestoreInstance): Type<NestInterceptor> {
    @Injectable()
    class CacheInterceptor implements NestInterceptor {
        intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
            const cleanup = createRequestCache(firestore);

            return next.handle().pipe(
                tap({
                    // The `finalize` operator would be better, but `tap` with `complete` and `error` covers most cases.
                    complete: cleanup,
                    error: cleanup,
                }),
            );
        }
    }
    return CacheInterceptor;
}

// We also need to export a module for easy integration.
import { DynamicModule, Module, Type } from '@nestjs/common';

export const FIRESTORE_INSTANCE_PROVIDER = '@@__FIRESTORE_INSTANCE__@@'; // Export this constant

@Module({})
export class FireCacheModule {
    static forRoot(options: { firestore: FirestoreInstance }): DynamicModule {
        return {
            module: FireCacheModule,
            providers: [
                {
                    provide: FIRESTORE_INSTANCE_PROVIDER,
                    useValue: options.firestore,
                },
                {
                    provide: 'APP_INTERCEPTOR',
                    useFactory: (firestore: FirestoreInstance) => {
                        return FireCacheInterceptor(firestore);
                    },
                    inject: [FIRESTORE_INSTANCE_PROVIDER],
                }
            ],
        };
    }
}