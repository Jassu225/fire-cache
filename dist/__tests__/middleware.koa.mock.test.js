"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const koa_1 = __importDefault(require("koa"));
const supertest_1 = __importDefault(require("supertest"));
const koa_2 = require("../src/middleware/koa");
const mock_test_helper_1 = require("./mock-test-helper");
describe('Koa Middleware', () => {
    let app;
    let firestore;
    beforeEach(() => {
        app = new koa_1.default();
        const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
        firestore = (0, mock_test_helper_1.mockFirestore)({ users: [userDoc] });
        app.use((0, koa_2.fireCacheMiddleware)(firestore));
        mock_test_helper_1.getCallCountRef.current = 0;
    });
    it('should cache document gets within a single request', async () => {
        app.use(async (ctx) => {
            const docRef = firestore.collection('users').doc('user1');
            await docRef.get(); // First call
            await docRef.get(); // Second call (should be cached)
            ctx.status = 200;
            ctx.body = 'OK';
        });
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        expect(mock_test_helper_1.getCallCountRef.current).toBe(1);
    });
    it('should not cache across different requests', async () => {
        app.use(async (ctx) => {
            const docRef = firestore.collection('users').doc('user1');
            await docRef.get();
            ctx.status = 200;
            ctx.body = 'OK';
        });
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        await (0, supertest_1.default)(app.callback()).get('/').expect(200);
        expect(mock_test_helper_1.getCallCountRef.current).toBe(2);
    });
});
