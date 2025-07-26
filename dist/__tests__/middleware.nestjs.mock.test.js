"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
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
const cache = __importStar(require("../src/core/cache"));
const mock_test_helper_1 = require("./mock-test-helper");
let TestController = class TestController {
    firestoreInstance;
    constructor(firestoreInstance) {
        this.firestoreInstance = firestoreInstance;
    }
    async cacheDocument() {
        const docRef = this.firestoreInstance.collection('users').doc('user1');
        await docRef.get(); // First call
        await docRef.get(); // Second call (should be cached)
        return 'OK';
    }
    async noCacheAcrossRequests() {
        const docRef = this.firestoreInstance.collection('users').doc('user1');
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
describe('NestJS Middleware', () => {
    let app;
    let firestore;
    beforeEach(async () => {
        const userDoc = { path: 'users/user1', data: { name: 'Alice' } };
        firestore = (0, mock_test_helper_1.mockFirestore)({ users: [userDoc] });
        mock_test_helper_1.getCallCountRef.current = 0;
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
    it('should cache document gets within a single request', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/cache-document')
            .expect(200);
        expect(mock_test_helper_1.getCallCountRef.current).toBe(1);
    });
    it('should not cache across different requests', async () => {
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/no-cache-across-requests')
            .expect(200);
        await (0, supertest_1.default)(app.getHttpServer())
            .get('/test/no-cache-across-requests')
            .expect(200);
        expect(mock_test_helper_1.getCallCountRef.current).toBe(2);
    });
});
