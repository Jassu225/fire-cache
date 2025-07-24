"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.nestjs = exports.koa = exports.express = void 0;
var express_js_1 = require("./middleware/express.js");
Object.defineProperty(exports, "express", { enumerable: true, get: function () { return express_js_1.fireCacheMiddleware; } });
var koa_js_1 = require("./middleware/koa.js");
Object.defineProperty(exports, "koa", { enumerable: true, get: function () { return koa_js_1.fireCacheMiddleware; } });
var nestjs_js_1 = require("./middleware/nestjs.js");
Object.defineProperty(exports, "nestjs", { enumerable: true, get: function () { return nestjs_js_1.FireCacheModule; } });
