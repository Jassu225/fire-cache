"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.testCollection = exports.serviceAccount = void 0;
const dotenv_1 = require("dotenv");
(0, dotenv_1.config)({ path: '.env.test' });
exports.serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
    ? JSON.parse(atob(process.env.FIREBASE_SERVICE_ACCOUNT))
    : undefined;
exports.testCollection = `fire-cache-test-collection`; // Changed to a non-reserved name
