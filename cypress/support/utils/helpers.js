import { REGEX_PATTERNS, CURRENCY_MULTIPLIERS, DEFAULT_TIMEOUTS } from '../config/constants.js';
import { faker } from '@faker-js/faker';

export const formatters = {
  currency: (amount, currency = 'USD') => {
    if (['JPY', 'KRW'].includes(currency)) {
      return Math.round(amount);
    }
    return Math.round(amount * 100) / 100;
  },

  amount: (value) => {
    return parseFloat(value.toFixed(4));
  },

  timestamp: () => new Date().toISOString(),

  duration: (startTime) => Date.now() - startTime
};

export const validators = {
  isUuid: (value) => REGEX_PATTERNS.UUID.test(value),

  isCurrencyCode: (value) => REGEX_PATTERNS.CURRENCY_CODE.test(value),

  isPositiveAmount: (value) => typeof value === 'number' && value > 0,

  isValidDecimalPrecision: (value, maxDecimals = 4) => {
    const decimalPlaces = (value.toString().split('.')[1] || '').length;
    return decimalPlaces <= maxDecimals;
  },

  isValidTransactionType: (type) => ['credit', 'debit'].includes(type),

  hasSufficientBalance: (wallet, currency, amount) => {
    const clip = wallet.currencyClips.find(c => c.currency === currency);
    return clip && clip.balance >= amount;
  }
};

export const generators = {
  randomAmount: (range = {}, currency = 'USD', type = 'credit') => {
    const min = range.min || 0.01;
    const max = range.max || 10000.00;
    const multiplier = CURRENCY_MULTIPLIERS[currency] || 1;

    let adjustedMin = min * multiplier;
    let adjustedMax = max * multiplier;

    if (type === 'credit') {
      adjustedMin = Math.max(adjustedMin, 10 * multiplier);
      adjustedMax = Math.min(adjustedMax, 5000 * multiplier);
    } else {
      adjustedMin = Math.max(adjustedMin, 1 * multiplier);
      adjustedMax = Math.min(adjustedMax, 500 * multiplier);
    }

    const amount = faker.datatype.float({ min: adjustedMin, max: adjustedMax, precision: 0.01 });
    return formatters.currency(amount, currency);
  },

  transactionId: () => faker.datatype.uuid(),

  randomCurrency: (currencies = ['USD', 'EUR', 'GBP', 'JPY']) => {
    return faker.helpers.arrayElement(currencies);
  },

  randomTransactionType: () => faker.helpers.arrayElement(['credit', 'debit'])
};

export const calculations = {
  calculateExpectedBalance: (currentBalance, amount, type) => {
    const current = parseFloat(currentBalance.toString());
    const transactionAmount = parseFloat(amount.toString());

    if (type === 'credit') {
      return current + transactionAmount;
    } else {
      return current - transactionAmount;
    }
  },

  calculateStats: (values) => {
    if (!values.length) return {};

    const sorted = [...values].sort((a, b) => a - b);
    return {
      total: values.length,
      avg: values.reduce((sum, val) => sum + val, 0) / values.length,
      min: sorted[0],
      max: sorted[sorted.length - 1],
      median: sorted[Math.floor(sorted.length / 2)]
    };
  }
};

export const utilities = {
  sleep: (ms) => new Promise(resolve => setTimeout(resolve, ms)),

  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        if (attempt === maxAttempts) throw error;
        await utilities.sleep(delay);
      }
    }
  },

  buildUrl: (baseUrl, path, params = {}) => {
    const url = new URL(path, baseUrl);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        url.searchParams.append(key, value);
      }
    });
    return url.toString();
  },

  deepClone: (obj) => JSON.parse(JSON.stringify(obj)),

  filterSuccessfulResponses: (responses) => {
    return responses.filter(r => r?.createResponse?.status === 200);
  },

  extractTransactionIds: (responses) => {
    return responses.map(r => r.transactionId).filter(Boolean);
  },

  validateUniqueIds: (ids) => {
    const uniqueIds = [...new Set(ids)];
    return uniqueIds.length === ids.length;
  }
};

export const waitStrategies = {
  forTransactionCompletion: (getTransactionFn, maxWaitTime = DEFAULT_TIMEOUTS.TRANSACTION_COMPLETION) => {
    const startTime = Date.now();

    const checkTransaction = () => {
      return getTransactionFn().then((response) => {
        const elapsed = Date.now() - startTime;

        if (response.body.status === 'finished') {
          return response;
        } else if (elapsed > maxWaitTime) {
          return response;
        } else {
          return cy.wait(DEFAULT_TIMEOUTS.POLL_INTERVAL).then(() => checkTransaction());
        }
      });
    };

    return checkTransaction();
  },

  withTimeout: (promise, timeout = DEFAULT_TIMEOUTS.REQUEST) => {
    return Promise.race([
      promise,
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Operation timed out')), timeout)
      )
    ]);
  }
};