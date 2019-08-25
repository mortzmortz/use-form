import '@testing-library/jest-dom/extend-expect';

/**
 * Mocking calls to console.warn to test against warnings and errors logged
 * in the development environment.
 */
let consoleSpy;
const originalEnv = process.env.NODE_ENV;
beforeEach(() => {
  consoleSpy = jest.spyOn(console, 'warn').mockImplementation(() => {});
  process.env.NODE_ENV = 'development';
});
afterEach(() => {
  consoleSpy.mockRestore();
  process.env.NODE_ENV = originalEnv;
});
