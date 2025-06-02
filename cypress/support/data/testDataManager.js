import { faker } from '@faker-js/faker';
import _ from 'lodash';
import { CURRENCY_MULTIPLIERS, TEST_SCENARIOS, INVALID_TRANSACTION_TYPES } from '../config/constants.js';
import { generators, formatters } from '../utils/helpers.js';

class TestDataManager {
  constructor() {
    this.currencies = Cypress.env('currencies') || ['USD', 'EUR', 'GBP', 'JPY', 'AUD'];
    this.testUsers = Cypress.env('testUsers') || [];
    this.transactionLimits = Cypress.env('transactionLimits') || {
      minAmount: 0.01,
      maxAmount: 10000.00,
      maxDailyTransactions: 100
    };

    this.cache = {
      users: {},
      transactions: {},
      wallets: {}
    };
  }

  getRandomUser(options = {}) {
    let availableUsers = [...this.testUsers];

    if (options.exclude) {
      availableUsers = availableUsers.filter(user => !options.exclude.includes(user.username));
    }

    if (options.region) {
      availableUsers = availableUsers.filter(user => user.region === options.region);
    }

    if (availableUsers.length === 0) {
      throw new Error('No users available matching criteria');
    }

    return faker.helpers.arrayElement(availableUsers);
  }

  getMultipleUsers(count, options = {}) {
    if (count > this.testUsers.length) {
      throw new Error(`Cannot get ${count} users, only ${this.testUsers.length} available`);
    }

    let availableUsers = [...this.testUsers];

    if (options.exclude) {
      availableUsers = availableUsers.filter(user => !options.exclude.includes(user.username));
    }

    return faker.helpers.arrayElements(availableUsers, count);
  }

  generateTransaction(options = {}) {
    const defaults = {
      currency: generators.randomCurrency(this.currencies),
      type: generators.randomTransactionType(),
      amount: this.generateAmount(options.amountRange),
      timestamp: formatters.timestamp()
    };

    return {
      ...defaults,
      ...options
    };
  }

  generateAmount(range = {}, currency = 'USD', type = 'credit') {
    return generators.randomAmount(range, currency, type);
  }

  generateMultipleTransactions(count, options = {}) {
    const transactions = [];

    for (let i = 0; i < count; i++) {
      const transaction = this.generateTransaction({
        ...options,
        currency: options.currencies ?
          faker.helpers.arrayElement(options.currencies) :
          generators.randomCurrency(this.currencies)
      });

      transactions.push(transaction);
    }

    return transactions;
  }

  generateTransactionScenario(scenario) {
    const scenarios = {
      [TEST_SCENARIOS.ONBOARDING]: [
        { type: 'credit', currency: 'USD', amount: 1000.00 },
        { type: 'debit', currency: 'USD', amount: 50.00 },
        { type: 'credit', currency: 'EUR', amount: 500.00 },
        { type: 'debit', currency: 'EUR', amount: 25.00 }
      ],

      [TEST_SCENARIOS.TRADING]: Array.from({ length: 20 }, () => ({
        type: generators.randomTransactionType(),
        currency: generators.randomCurrency(['USD', 'EUR', 'GBP']),
        amount: this.generateAmount({ min: 100, max: 2000 })
      })),

      [TEST_SCENARIOS.ARBITRAGE]: [
        { type: 'credit', currency: 'USD', amount: 10000.00 },
        { type: 'debit', currency: 'USD', amount: 5000.00 },
        { type: 'credit', currency: 'EUR', amount: 4200.00 },
        { type: 'debit', currency: 'EUR', amount: 2100.00 },
        { type: 'credit', currency: 'GBP', amount: 1800.00 }
      ],

      [TEST_SCENARIOS.MICROPAYMENTS]: Array.from({ length: 50 }, () => ({
        type: 'debit',
        currency: 'USD',
        amount: this.generateAmount({ min: 0.01, max: 5.00 })
      })),

      [TEST_SCENARIOS.STRESS]: Array.from({ length: 100 }, () => ({
        type: generators.randomTransactionType(),
        currency: generators.randomCurrency(this.currencies),
        amount: this.generateAmount()
      }))
    };

    return scenarios[scenario] || [];
  }

  generateInvalidTransaction(invalidationType) {
    const baseTransaction = this.generateTransaction();

    const invalidations = {
      [INVALID_TRANSACTION_TYPES.NEGATIVE_AMOUNT]: {
        ...baseTransaction,
        amount: -Math.abs(baseTransaction.amount)
      },

      [INVALID_TRANSACTION_TYPES.ZERO_AMOUNT]: {
        ...baseTransaction,
        amount: 0
      },

      [INVALID_TRANSACTION_TYPES.HUGE_AMOUNT]: {
        ...baseTransaction,
        amount: 99999999.99
      },

      [INVALID_TRANSACTION_TYPES.INVALID_CURRENCY]: {
        ...baseTransaction,
        currency: 'INVALID'
      },

      [INVALID_TRANSACTION_TYPES.LOWERCASE_CURRENCY]: {
        ...baseTransaction,
        currency: 'usd'
      },

      [INVALID_TRANSACTION_TYPES.NUMERIC_CURRENCY]: {
        ...baseTransaction,
        currency: '123'
      },

      [INVALID_TRANSACTION_TYPES.INVALID_TYPE]: {
        ...baseTransaction,
        type: 'transfer'
      },

      [INVALID_TRANSACTION_TYPES.MISSING_CURRENCY]: _.omit(baseTransaction, 'currency'),

      [INVALID_TRANSACTION_TYPES.MISSING_AMOUNT]: _.omit(baseTransaction, 'amount'),

      [INVALID_TRANSACTION_TYPES.MISSING_TYPE]: _.omit(baseTransaction, 'type'),

      [INVALID_TRANSACTION_TYPES.STRING_AMOUNT]: {
        ...baseTransaction,
        amount: 'not_a_number'
      },

      [INVALID_TRANSACTION_TYPES.TOO_MANY_DECIMALS]: {
        ...baseTransaction,
        amount: 123.123456
      },

      [INVALID_TRANSACTION_TYPES.NULL_VALUES]: {
        currency: null,
        amount: null,
        type: null
      }
    };

    return invalidations[invalidationType] || baseTransaction;
  }

  generateEdgeCaseAmounts() {
    return {
      minimum: this.transactionLimits.minAmount,
      maximum: this.transactionLimits.maxAmount,
      justOverMinimum: this.transactionLimits.minAmount + 0.01,
      justUnderMaximum: this.transactionLimits.maxAmount - 0.01,
      oneDecimal: 10.1,
      twoDecimals: 10.12,
      threeDecimals: 10.123,
      fourDecimals: 10.1234,
      largeRound: 1000.00,
      verySmall: 0.01
    };
  }

  cacheData(key, data, type = 'misc') {
    if (!this.cache[type]) {
      this.cache[type] = {};
    }
    this.cache[type][key] = data;
  }

  getCachedData(key, type = 'misc') {
    return this.cache[type]?.[key];
  }

  clearCache(type = null) {
    if (type) {
      this.cache[type] = {};
    } else {
      this.cache = { users: {}, transactions: {}, wallets: {} };
    }
  }

  generateTestDataSummary() {
    return {
      availableUsers: this.testUsers.length,
      supportedCurrencies: this.currencies.length,
      transactionLimits: this.transactionLimits,
      cacheStats: {
        users: Object.keys(this.cache.users).length,
        transactions: Object.keys(this.cache.transactions).length,
        wallets: Object.keys(this.cache.wallets).length
      },
      lastGenerated: formatters.timestamp()
    };
  }
}

export default TestDataManager;