/** @type {import('ts-jest').JestConfigWithTsJest} */
export default {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^express$': '<rootDir>/node_modules/express', // Corrected: express as a regex string
  },
  transform: {
    '^.+\\.m?ts$': 'ts-jest',
    '^.+\\.js$': 'babel-jest',
  },
  transformIgnorePatterns: [
    '/node_modules/(?!express|supertest|on-finished|nanoid)/',
  ],
};