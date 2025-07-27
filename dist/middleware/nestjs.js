"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var FireCacheModule_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.FireCacheModule = exports.FIRESTORE_INSTANCE_PROVIDER = void 0;
exports.FireCacheInterceptor = FireCacheInterceptor;
const common_1 = require("@nestjs/common");
const operators_1 = require("rxjs/operators");
const index_1 = require("../core/index");
/**
 * Creates a NestJS Interceptor that enables request-level caching for Firestore.
 * This interceptor should be provided with a Firestore instance.
 */
function FireCacheInterceptor(firestore) {
    let CacheInterceptor = class CacheInterceptor {
        intercept(context, next) {
            const cleanup = (0, index_1.createRequestCache)(firestore);
            return next.handle().pipe((0, operators_1.tap)({
                // The `finalize` operator would be better, but `tap` with `complete` and `error` covers most cases.
                complete: cleanup,
                error: cleanup,
            }));
        }
    };
    CacheInterceptor = __decorate([
        (0, common_1.Injectable)()
    ], CacheInterceptor);
    return CacheInterceptor;
}
// We also need to export a module for easy integration.
const common_2 = require("@nestjs/common");
exports.FIRESTORE_INSTANCE_PROVIDER = '@@__FIRESTORE_INSTANCE__@@'; // Export this constant
let FireCacheModule = FireCacheModule_1 = class FireCacheModule {
    static forRoot(options) {
        return {
            module: FireCacheModule_1,
            providers: [
                {
                    provide: exports.FIRESTORE_INSTANCE_PROVIDER,
                    useValue: options.firestore,
                },
                {
                    provide: 'APP_INTERCEPTOR',
                    useFactory: (firestore) => {
                        return FireCacheInterceptor(firestore);
                    },
                    inject: [exports.FIRESTORE_INSTANCE_PROVIDER],
                }
            ],
        };
    }
};
exports.FireCacheModule = FireCacheModule;
exports.FireCacheModule = FireCacheModule = FireCacheModule_1 = __decorate([
    (0, common_2.Module)({})
], FireCacheModule);
