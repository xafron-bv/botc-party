module.exports = {
  e2e: {
    baseUrl: process.env.CYPRESS_BASE_URL || 'http://127.0.0.1:5173',
    supportFile: 'support/e2e.js',
    chromeWebSecurity: false,
    specPattern: '**/*.cy.js'
  }
};