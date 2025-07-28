import type { FastifyInstance } from "fastify";
import { FirestoreInstance } from "../core/index";
/**
 * Creates a Fastify plugin that registers the Firestore cache middleware.
 * This is the recommended way to use fire-memoize with Fastify.
 *
 * @param fastify The Fastify instance.
 * @param firestore The Firestore instance from `@google-cloud/firestore` or `firebase-admin`.
 * @returns A Fastify plugin function.
 */
export declare function registerHooks(fastify: FastifyInstance, firestore: FirestoreInstance): void;
