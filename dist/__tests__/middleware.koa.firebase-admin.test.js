"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const supertest_1 = __importDefault(require("supertest"));
const koa_2 = require("../src/middleware/koa");
const test_helper_1 = require("./test-helper");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const uuid_1 = require("uuid");
const shouldRun = !!test_helper_1.serviceAccount;
(shouldRun ? describe : describe.skip)('Koa Middleware integration with real Firestore', () => {
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
        app = new koa_1.default();
        app.use((0, koa_2.fireCacheMiddleware)(firestore));
    });
    it('should cache document gets within a single request', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        app.use(async (ctx) => {
            try {
                const docRef = firestore.collection(test_helper_1.testCollection).doc(testDocId);
                await docRef.get(); // First call
                await docRef.get(); // Second call (should be cached)
                ctx.status = 200;
                ctx.body = 'OK';
            }
            catch (error) {
                console.error('Error in /test endpoint:', error);
                ctx.status = 500;
                ctx.body = 'Internal Server Error';
            }
        });
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        expect(mockGet).toHaveBeenCalledTimes(1);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
    it('should not cache across different requests', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        app.use(async (ctx) => {
            try {
                const docRef = firestore.collection(test_helper_1.testCollection).doc(testDocId);
                await docRef.get();
                ctx.status = 200;
                ctx.body = 'OK';
            }
            catch (error) {
                console.error('Error in /test endpoint:', error);
                ctx.status = 500;
                ctx.body = 'Internal Server Error';
            }
        });
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        expect(mockGet).toHaveBeenCalledTimes(2);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
});
