"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.fireCacheMiddleware = fireCacheMiddleware;
const cache_js_1 = require("../core/cache.js");
const on_finished_1 = __importDefault(require("on-finished"));
/**
 * Creates an Express middleware that enables request-level caching for Firestore.
 *
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns An Express middleware function.
 */
function fireCacheMiddleware(firestore) {
    return (_, res, next) => {
        const cleanup = (0, cache_js_1.createRequestCache)(firestore);
        (0, on_finished_1.default)(res, cleanup);
        next();
    };
}
