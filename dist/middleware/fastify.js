"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registerHooks = registerHooks;
const index_1 = require("../core/index");
/**
 * Creates a Fastify plugin that registers the Firestore cache middleware.
 * This is the recommended way to use fire-memoize with Fastify.
 *
 * @param fastify The Fastify instance.
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Fastify plugin function.
 */
function registerHooks(fastify, firestore) {
    // Add the middleware using Fastify's addHook method - use preHandler to ensure it runs before route handlers
    fastify.addHook("preHandler", async (req, reply) => {
        const cleanup = (0, index_1.createRequestCache)(firestore);
        // Store cleanup function in request context for later use
        req.fireCacheCleanup = cleanup;
    });
    // Add cleanup hook to ensure cache is cleared after response
    fastify.addHook("onResponse", (request, reply, done) => {
        const cleanup = request.fireCacheCleanup;
        if (cleanup) {
            cleanup();
        }
        done();
    });
}
