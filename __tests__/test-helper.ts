import { config as dotenvConfig } from 'dotenv';

dotenvConfig({ path: '.env.test' });

export const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT
  ? JSON.parse(atob(process.env.FIREBASE_SERVICE_ACCOUNT))
  : undefined;

export const testCollection = `fire-cache-test-collection`; // Changed to a non-reserved name