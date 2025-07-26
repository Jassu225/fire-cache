"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireCacheMiddleware = fireCacheMiddleware;
const cache_js_1 = require("../core/cache.js");
/**
 * Creates a Koa middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Koa middleware function.
 */
function fireCacheMiddleware(firestore) {
    return async (ctx, next) => {
        const cleanup = (0, cache_js_1.createRequestCache)(firestore);
        try {
            await next();
        }
        finally {
            cleanup();
        }
    };
}
