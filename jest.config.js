/** @type {import('jest').Config} */
module.exports = {
  testEnvironment: 'node',
  // lib/calculator is deliberately CommonJS JS and needs no transform; only
  // TypeScript is compiled, which keeps the existing zero-config tests intact.
  transform: {
    '^.+\\.tsx?$': ['ts-jest', { tsconfig: '<rootDir>/tsconfig.jest.json' }],
  },
  moduleFileExtensions: ['ts', 'tsx', 'js', 'jsx', 'json'],
  testMatch: ['**/*.test.ts', '**/*.test.js'],
  testPathIgnorePatterns: ['/node_modules/', '/.next/', '/apollo-lead-engine/'],
  collectCoverageFrom: ['signal-engine/**/*.ts', 'src/**/*.ts'],
};
