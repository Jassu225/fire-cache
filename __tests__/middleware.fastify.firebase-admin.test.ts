import Fastify, { FastifyInstance } from "fastify";
import request from "supertest";
import { registerHooks } from "../src/middleware/fastify";
import type {
  FirestoreInstance,
  DocumentReferenceType,
} from "../src/core/index";
import { serviceAccount, testCollection } from "./test-helper";
import admin from "firebase-admin";
import { v4 as uuidV4 } from "uuid";

const shouldRun = !!serviceAccount;

(shouldRun ? describe : describe.skip)(
  "Fastify Middleware integration with real Firestore",
  () => {
    let app: FastifyInstance;
    let firestore: FirestoreInstance;
    let testDocId: string;

    beforeAll(async () => {
      if (!admin.apps.length) {
        admin.initializeApp({
          credential: admin.credential.cert(serviceAccount),
        });
      }
      firestore = admin.firestore();
      testDocId = uuidV4();
      await firestore
        .collection(testCollection)
        .doc(testDocId)
        .set({ foo: "bar", ts: Date.now() });
    });

    afterAll(async () => {
      if (!firestore) return;
      await firestore.collection(testCollection).doc(testDocId).delete();
      if (admin.apps.length) {
        await admin.app().delete();
      }
    });

    beforeEach(async () => {
      app = Fastify();
      registerHooks(app, firestore);
    });

    afterEach(async () => {
      if (app) {
        try {
          await app.close();
        } catch (error) {
          console.error("Error closing Fastify app:", error);
        }
      }
    });

    it("should cache document gets within a single request", async () => {
      const docRefPrototype = Object.getPrototypeOf(
        firestore.collection(testCollection).doc(testDocId)
      ) as DocumentReferenceType;
      const originalGet = docRefPrototype.get;
      const mockGet = jest.fn(originalGet);
      docRefPrototype.get = mockGet;

      app.get("/test", async (req, reply) => {
        try {
          const docRef = firestore.collection(testCollection).doc(testDocId);
          await docRef.get(); // First call
          await docRef.get(); // Second call (should be cached)
          reply.send({ status: "OK" });
        } catch (error) {
          console.error("Error in /test endpoint:", error);
          reply.status(500).send({ error: "Internal Server Error" });
        }
      });

      // Wait for app to be ready
      await app.ready();

      // Make the request
      const response = await request(app.server).get("/test").expect(200);
      expect(mockGet).toHaveBeenCalledTimes(1);

      // Cleanup the patched method
      docRefPrototype.get = originalGet;
    }, 10000); // Add timeout

    it("should not cache across different requests", async () => {
      const docRefPrototype = Object.getPrototypeOf(
        firestore.collection(testCollection).doc(testDocId)
      ) as DocumentReferenceType;
      const originalGet = docRefPrototype.get;
      const mockGet = jest.fn(originalGet);
      docRefPrototype.get = mockGet;

      app.get("/test", async (req, reply) => {
        try {
          const docRef = firestore.collection(testCollection).doc(testDocId);
          await docRef.get();
          reply.send({ status: "OK" });
        } catch (error) {
          console.error("Error in /test endpoint:", error);
          reply.status(500).send({ error: "Internal Server Error" });
        }
      });

      await app.ready();
      await request(app.server).get("/test").expect(200);
      await request(app.server).get("/test").expect(200);
      expect(mockGet).toHaveBeenCalledTimes(2);

      // Cleanup the patched method
      docRefPrototype.get = originalGet;
    }, 10000); // Add timeout
  }
);
