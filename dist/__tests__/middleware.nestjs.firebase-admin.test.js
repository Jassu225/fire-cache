"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const common_1 = require("@nestjs/common");
const testing_1 = require("@nestjs/testing");
const supertest_1 = __importDefault(require("supertest"));
const nestjs_1 = require("../src/middleware/nestjs");
const test_helper_1 = require("./test-helper");
const firebase_admin_1 = __importDefault(require("firebase-admin"));
const uuid_1 = require("uuid");
const shouldRun = !!test_helper_1.serviceAccount;
(shouldRun ? describe : describe.skip)('NestJS Middleware integration with real Firestore', () => {
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
    beforeEach(async () => {
        const moduleRef = await testing_1.Test.createTestingModule({
            controllers: [TestController],
            providers: [
                {
                    provide: nestjs_1.FIRESTORE_INSTANCE_PROVIDER,
                    useValue: firestore,
                },
                {
                    provide: 'APP_INTERCEPTOR',
                    useFactory: (firestoreInstance) => new ((0, nestjs_1.FireCacheInterceptor)(firestoreInstance))(),
                    inject: [nestjs_1.FIRESTORE_INSTANCE_PROVIDER],
                },
            ],
        }).compile();
        app = moduleRef.createNestApplication();
        await app.init();
    });
    afterEach(async () => {
        await app.close();
    });
    let TestController = class TestController {
        firestoreInstance;
        constructor(firestoreInstance) {
            this.firestoreInstance = firestoreInstance;
        }
        async cacheDocument() {
            const docRef = this.firestoreInstance.collection(test_helper_1.testCollection).doc(testDocId);
            await docRef.get(); // First call
            await docRef.get(); // Second call (should be cached)
            return 'OK';
        }
        async noCacheAcrossRequests() {
            const docRef = this.firestoreInstance.collection(test_helper_1.testCollection).doc(testDocId);
            await docRef.get();
            return 'OK';
        }
    };
    __decorate([
        (0, common_1.Get)('cache-document'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], TestController.prototype, "cacheDocument", null);
    __decorate([
        (0, common_1.Get)('no-cache-across-requests'),
        __metadata("design:type", Function),
        __metadata("design:paramtypes", []),
        __metadata("design:returntype", Promise)
    ], TestController.prototype, "noCacheAcrossRequests", null);
    TestController = __decorate([
        (0, common_1.Controller)('test'),
        __param(0, (0, common_1.Inject)(nestjs_1.FIRESTORE_INSTANCE_PROVIDER)),
        __metadata("design:paramtypes", [Object])
    ], TestController);
    it('should cache document gets within a single request', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/cache-document')
            .expect(200);
        expect(mockGet).toHaveBeenCalledTimes(1);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
    it('should not cache across different requests', async () => {
        const docRefPrototype = Object.getPrototypeOf(firestore.collection(test_helper_1.testCollection).doc(testDocId));
        const originalGet = docRefPrototype.get;
        const mockGet = jest.fn(originalGet);
        docRefPrototype.get = mockGet;
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/no-cache-across-requests')
            .expect(200);
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/no-cache-across-requests')
            .expect(200);
        expect(mockGet).toHaveBeenCalledTimes(2);
        // Cleanup the patched method
        docRefPrototype.get = originalGet;
    });
});
