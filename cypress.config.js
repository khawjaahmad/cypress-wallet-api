const { defineConfig } = require('cypress');

module.exports = defineConfig({
  projectId: 'x2hrv3',

  e2e: {
    baseUrl: 'https://api.ahmadwaqar.dev',
    supportFile: 'cypress/support/e2e.js',
    specPattern: 'cypress/e2e/**/*.cy.js',
    videosFolder: 'cypress/videos',
    screenshotsFolder: 'cypress/screenshots',
    downloadsFolder: 'cypress/downloads',
    fixturesFolder: 'cypress/fixtures',

    defaultCommandTimeout: 30000,
    requestTimeout: 30000,
    responseTimeout: 30000,
    pageLoadTimeout: 60000,

    video: true,
    screenshotOnRunFailure: true,

    viewportWidth: 1280,
    viewportHeight: 720,

    retries: {
      runMode: 2,
      openMode: 0
    },

    env: {
      apiUrl: 'https://api.ahmadwaqar.dev',
      serviceId: 'cypress-automation-suite',
      defaultTimeout: 30000,

      testUsers: [
        { username: 'alice.johnson', password: 'password123', name: 'Alice Johnson' },
        { username: 'bob.smith', password: 'password123', name: 'Bob Smith' },
        { username: 'carlos.rodriguez', password: 'password123', name: 'Carlos Rodriguez' },
        { username: 'diana.chen', password: 'password123', name: 'Diana Chen' },
        { username: 'erik.larsson', password: 'password123', name: 'Erik Larsson' }
      ],

      currencies: ['USD', 'EUR', 'GBP', 'JPY', 'AUD', 'CAD', 'CHF', 'SEK', 'NOK', 'DKK'],

      transactionLimits: {
        minAmount: 0.01,
        maxAmount: 10000.00,
        maxDailyTransactions: 100
      }
    },

    setupNodeEvents(on, config) {
      require('cypress-mochawesome-reporter/plugin')(on);

      on('task', {
        log(message) {
          console.log('\n🔍 CYPRESS LOG:', message, '\n');
          return null;
        },

        recordPerformanceMetric({ endpoint, duration, status }) {
          const fs = require('fs');
          const path = require('path');
          const reportsDir = path.join(__dirname, 'cypress/reports');
          const metricsFile = path.join(reportsDir, 'performance-metrics.json');

          if (!fs.existsSync(reportsDir)) {
            fs.mkdirSync(reportsDir, { recursive: true });
          }

          let metrics = [];
          try {
            if (fs.existsSync(metricsFile)) {
              metrics = JSON.parse(fs.readFileSync(metricsFile, 'utf8'));
            }
          } catch (error) {
            console.log('Creating new metrics file');
          }

          metrics.push({
            endpoint,
            duration,
            status,
            timestamp: new Date().toISOString()
          });

          fs.writeFileSync(metricsFile, JSON.stringify(metrics, null, 2));
          return null;
        }
      });

      return config;
    }
  },

  reporter: 'cypress-mochawesome-reporter',
  reporterOptions: {
    reportDir: 'cypress/reports',
    charts: true,
    reportPageTitle: 'Wallet API Test Execution Report',
    embeddedScreenshots: true,
    inlineAssets: true,
    saveAllAttempts: false
  }
});