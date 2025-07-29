import type { FastifyInstance, FastifyRequest, FastifyReply } from "fastify";
import { createRequestCache, FirestoreInstance } from "../core/index";

export const CLEAN_UP_KEY = Symbol();

/**
 * Creates a Fastify plugin that registers the Firestore cache middleware.
 * This is the recommended way to use fire-memoize with Fastify.
 *
 * @param fastify The Fastify instance.
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Fastify plugin function.
 */

export function registerHooks(
  fastify: FastifyInstance,
  firestore: FirestoreInstance
) {
  // Add the middleware using Fastify's addHook method - use preHandler to ensure it runs before route handlers
  fastify.addHook(
    "preHandler",
    async (req: FastifyRequest, reply: FastifyReply) => {
      const cleanup = createRequestCache(firestore);

      // Store cleanup function in request context for later use
      (req as any)[CLEAN_UP_KEY] = cleanup;
    }
  );

  // Add cleanup hook to ensure cache is cleared after response
  fastify.addHook(
    "onResponse",
    (request: FastifyRequest, reply: any, done: () => void) => {
      const cleanup = (request as any)[CLEAN_UP_KEY];
      if (cleanup) {
        cleanup();
      }
      done();
    }
  );
}
