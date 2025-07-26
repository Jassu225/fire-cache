"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const express_2 = require("../src/middleware/express");
const test_helper_1 = require("./test-helper");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const uuid_1 = require("uuid");
const shouldRun = !!test_helper_1.serviceAccount;
(shouldRun ? describe : describe.skip)('Express Middleware integration with real Firestore', () => {
    let app;
    let firestore;
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
        if (firebase_admin_1.default.apps.length) {
            await firebase_admin_1.default.app().delete();
        }
    });
    beforeEach(() => {
        app = (0, express_1.default)();
        app.use((0, express_2.fireCacheMiddleware)(firestore));
    });
    it('should cache document gets within a single request', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        app.get('/test', async (req, res) => {
            try {
                const docRef = firestore.collection(test_helper_1.testCollection).doc(testDocId);
                await docRef.get(); // First call
                await docRef.get(); // Second call (should be cached)
                res.sendStatus(200);
            }
            catch (error) {
                console.error('Error in /test endpoint:', error);
                res.sendStatus(500);
            }
        });
        await (0, supertest_1.default)(app).get('/test').expect(200);
        expect(mockGet).toHaveBeenCalledTimes(1);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
    it('should not cache across different requests', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        app.get('/test', async (req, res) => {
            try {
                const docRef = firestore.collection(test_helper_1.testCollection).doc(testDocId);
                await docRef.get();
                res.sendStatus(200);
            }
            catch (error) {
                console.error('Error in /test endpoint:', error);
                res.sendStatus(500);
            }
        });
        await (0, supertest_1.default)(app).get('/test').expect(200);
        await (0, supertest_1.default)(app).get('/test').expect(200);
        expect(mockGet).toHaveBeenCalledTimes(2);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
});
