# Wallet API Test Automation Framework

A comprehensive Cypress-based testing framework for wallet transaction processing APIs, featuring modular architecture, schema validation, performance monitoring, and detailed reporting.

## Features

- **Modular Architecture**: Separation of concerns with dedicated classes for API interactions, data management, and validations
- **Schema Validation**: AJV-based JSON schema validation for all API responses
- **Performance Monitoring**: Built-in performance metrics collection and analysis
- **Dynamic Test Data**: Faker.js integration for realistic test data generation
- **Comprehensive Reporting**: Custom mochawesome reports with embedded screenshots and performance metrics
- **Transaction Flow Testing**: End-to-end wallet transaction processing validation
- **Error Handling**: Robust negative scenario testing with proper error validation

## Prerequisites

- Node.js (version 16 or higher)
- npm or yarn package manager
- Git

## Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd wallet-api-cypress-automation
```

2. Install dependencies:
```bash
npm install
```

3. Verify Cypress installation:
```bash
npm run verify
```

## Configuration

Update the `cypress.config.js` file with your environment settings:

```javascript
module.exports = defineConfig({
  e2e: {
    baseUrl: 'https://your-api-domain.com',
    env: {
      apiUrl: 'https://your-api-domain.com',
      serviceId: 'your-service-id',
      testUsers: [
        { username: 'user1', password: 'password', name: 'Test User 1' },
        // Add more test users as needed
      ]
    }
  }
});
```

## Project Structure

```
.
├── cypress/
│   ├── e2e/                          # Test specifications
│   │   ├── 01-transaction-processing.cy.js
│   │   ├── 02-negative-scenarios.cy.js
│   │   ├── 03-performance-stress.cy.js
│   │   └── 04-advanced-scenarios.cy.js
│   ├── reports/                      # Auto-generated test reports
│   │   └── performance-metrics.json  # Performance data (auto-generated)
│   └── support/
│       ├── api/
│       │   └── apiClient.js         # API interaction layer
│       ├── commands.js              # Custom Cypress commands
│       ├── config/
│       │   └── constants.js         # Application constants
│       ├── data/
│       │   └── testDataManager.js   # Test data generation and management
│       ├── e2e.js                   # Global test setup
│       ├── utils/
│       │   ├── actions.js           # Reusable action functions
│       │   └── helpers.js           # Utility functions
│       └── validation/
│           ├── assertions.js        # Custom assertions
│           └── schemaValidator.js   # JSON schema validation
├── cypress.config.js                # Cypress configuration
├── package.json                     # Dependencies and scripts
├── README.md                        # This file
├── TESTPLAN.md                      # Test strategy and cases
└── reports/                         # Additional report outputs
```

## Test Execution

### Run All Tests
```bash
npm test
```

### Run Tests in Different Modes
```bash
# Interactive mode
npm run cy:open

# Headless mode
npm run cy:run

# Chrome browser
npm run test:chrome

# Smoke tests only
npm run test:smoke

# Performance tests only
npm run test:performance
```

### Clean Previous Results
```bash
npm run clean
```

## Test Reports

After test execution, reports are automatically generated:

- **HTML Report**: `cypress/reports/index.html` (Mochawesome report)
- **Performance Metrics**: `cypress/reports/performance-metrics.json` (Auto-generated performance data)
- **Screenshots**: `cypress/screenshots/` (Captured on test failures)
- **Videos**: `cypress/videos/` (Complete test execution recordings)
- **Additional Reports**: `reports/` (Additional output directory)

## Key Components

### API Client (`apiClient.js`)
Centralized API interaction layer with:
- Authentication management
- Request/response handling
- Performance metric collection
- Error handling and retry logic

### Schema Validator (`schemaValidator.js`)
Comprehensive validation system featuring:
- AJV-based JSON schema validation
- Business rule validation
- Custom assertion methods
- Transaction consistency checks

### Test Data Manager (`testDataManager.js`)
Dynamic test data generation with:
- Faker.js integration
- Currency-aware amount generation
- Scenario-based transaction sets
- Edge case data generation
- Data caching and reuse

### Performance Monitoring
Built-in performance tracking automatically generates:
- Response time measurements for each API call
- Endpoint-specific metrics in `performance-metrics.json`
- Performance baseline establishment across test runs
- Threshold-based validation and alerts
- Comprehensive timing data for analysis

## Environment Variables

The framework supports the following environment variables:

- `CYPRESS_RECORD_KEY`: For Cypress Dashboard recording
- `CI_BUILD_ID`: For parallel execution identification
- `NODE_ENV`: Environment designation

## Assumptions

1. **Authentication Reliability**: The framework assumes authentication endpoints (`/user/login`, `/user/info`) are stable and provide trusted outputs
2. **Transaction Processing**: Transactions may be processed asynchronously, with status transitions from 'pending' to 'finished'
3. **Currency Support**: The API supports standard 3-letter currency codes (USD, EUR, GBP, etc.)
4. **Balance Management**: Debit transactions require sufficient balance in the specified currency
5. **Decimal Precision**: Transaction amounts support up to 4 decimal places
6. **Rate Limiting**: The API may implement rate limiting for high-frequency requests

## Troubleshooting

### Common Issues

1. **Service Unavailable**: Ensure the API service is running and accessible
2. **Authentication Failures**: Verify test user credentials in the configuration
3. **Network Timeouts**: Adjust timeout values in `cypress.config.js` if needed
4. **Schema Validation Errors**: Check API response format against expected schemas

### Debug Mode
Enable verbose logging by setting:
```bash
DEBUG=cypress:* npm test
```

## Dependencies

- **cypress**: Test framework
- **@faker-js/faker**: Test data generation
- **ajv**: JSON schema validation
- **lodash**: Utility functions
- **decimal.js**: Precise decimal calculations
- **cypress-mochawesome-reporter**: Enhanced reporting
