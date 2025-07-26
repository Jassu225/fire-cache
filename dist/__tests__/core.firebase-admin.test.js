"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const cache_1 = require("../src/core/cache");
const uuid_1 = require("uuid");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const test_helper_1 = require("./test-helper");
const shouldRun = !!test_helper_1.serviceAccount;
(shouldRun ? describe : describe.skip)('fire-cache integration with real Firestore', () => {
    let firestore;
    let cleanup;
    let testDocId;
    beforeAll(async () => {
        if (!firebase_admin_1.default.apps.length) {
            firebase_admin_1.default.initializeApp({
                credential: firebase_admin_1.default.credential.cert(test_helper_1.serviceAccount),
            });
        }
        firestore = firebase_admin_1.default.firestore();
        testDocId = (0, uuid_1.v4)();
        await firestore.collection(test_helper_1.testCollection).doc(testDocId).set({ foo: 'bar', ts: Date.now() });
    });
    afterAll(async () => {
        if (!firestore)
            return;
        await firestore.collection(test_helper_1.testCollection).doc(testDocId).delete();
        // Optionally delete the collection if needed
        if (firebase_admin_1.default.apps.length) {
            await firebase_admin_1.default.app().delete();
        }
    });
    it('should cache a real document get request', async () => {
        if (!firestore)
            return;
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        cleanup = (0, cache_1.createRequestCache)(firestore);
        const docRef = firestore.collection(test_helper_1.testCollection).doc(testDocId);
        // First call (cache miss)
        const snap1 = await docRef.get();
        expect(snap1.exists).toBe(true);
        expect(snap1.data()?.foo).toBe('bar');
        expect(mockGet).toHaveBeenCalledTimes(1);
        // Second call (should hit cache, not Firestore)
        const snap2 = await docRef.get();
        expect(snap2.exists).toBe(true);
        expect(snap2.data()?.foo).toBe('bar');
        expect(mockGet).toHaveBeenCalledTimes(1);
        docRefPrototype.get = originalGet; // Restore original get method
        cleanup();
    });
});
