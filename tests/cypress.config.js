module.exports = {
  experimentalMemoryManagement: true,
  numTestsKeptInMemory: 0,
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:5173',
    specPattern: 'tests/**/*.cy.js',
    supportFile: 'tests/support/e2e.js',
    chromeWebSecurity: false,
    screenshotOnRunFailure: false,
    video: false
  }
};
