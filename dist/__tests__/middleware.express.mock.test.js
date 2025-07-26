"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const supertest_1 = __importDefault(require("supertest"));
const express_2 = require("../src/middleware/express");
const mock_test_helper_1 = require("./mock-test-helper");
// --- Tests ---
describe('Express Middleware', () => {
    let app;
    let firestore;
    beforeEach(() => {
        app = (0, express_1.default)();
        const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
        firestore = (0, mock_test_helper_1.mockFirestore)({ users: [userDoc] });
        app.use((0, express_2.fireCacheMiddleware)(firestore));
        mock_test_helper_1.getCallCountRef.current = 0;
    });
    it('should cache document gets within a single request', async () => {
        app.get('/test', async (req, res) => {
            try {
                const docRef = firestore.collection('users').doc('user1');
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
        expect(mock_test_helper_1.getCallCountRef.current).toBe(1); // Should only call the underlying get once
    });
    it('should not cache across different requests', async () => {
        app.get('/test', async (req, res) => {
            try {
                const docRef = firestore.collection('users').doc('user1');
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
        expect(mock_test_helper_1.getCallCountRef.current).toBe(2);
    });
});
