import { HTTP_STATUS, DEFAULT_TIMEOUTS } from '../config/constants.js';
import { commonAssertions } from '../validation/assertions.js';
import { utilities, waitStrategies } from './helpers.js';

export const apiActions = {
  wakeUpService: (baseUrl, serviceId) => {
    const startTime = Date.now();

    return cy.request({
      method: 'GET',
      url: `${baseUrl}/wakeup`,
      timeout: 120000,
      failOnStatusCode: false
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/wakeup',
        duration,
        status: response.status
      }).then(() => {
        expect(response.status).to.eq(HTTP_STATUS.OK);
        expect(response.body).to.have.property('status', 'awake');
        return response;
      });
    });
  },

  login: (baseUrl, serviceId, username, password) => {
    const startTime = Date.now();

    return cy.request({
      method: 'POST',
      url: `${baseUrl}/user/login`,
      headers: {
        'Content-Type': 'application/json',
        'X-Service-Id': serviceId
      },
      body: { username, password },
      timeout: DEFAULT_TIMEOUTS.REQUEST
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/user/login',
        duration,
        status: response.status
      }).then(() => {
        commonAssertions.expectSuccessfulLogin(response);
        return response;
      });
    });
  },

  getUserInfo: (baseUrl, userId, token) => {
    const startTime = Date.now();

    expect(userId, 'User ID should be provided').to.exist;
    expect(token, 'Token should be provided').to.exist;

    return cy.request({
      method: 'GET',
      url: `${baseUrl}/user/info/${userId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: DEFAULT_TIMEOUTS.REQUEST
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/user/info',
        duration,
        status: response.status
      }).then(() => {
        commonAssertions.expectHttpStatus(response, HTTP_STATUS.OK);
        commonAssertions.expectValidUserInfo(response.body);
        expect(response.body.walletId, 'WalletId should not be undefined').to.not.equal('undefined');
        return response;
      });
    });
  },

  getWallet: (baseUrl, walletId, token) => {
    const startTime = Date.now();

    expect(walletId, 'Wallet ID should be provided and not undefined').to.exist;
    expect(walletId, 'Wallet ID should not be string "undefined"').to.not.equal('undefined');
    expect(token, 'Token should be provided').to.exist;

    return cy.request({
      method: 'GET',
      url: `${baseUrl}/wallet/${walletId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: DEFAULT_TIMEOUTS.REQUEST
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/wallet',
        duration,
        status: response.status
      }).then(() => {
        commonAssertions.expectHttpStatus(response, HTTP_STATUS.OK);
        commonAssertions.expectValidWallet(response.body);
        return response;
      });
    });
  },

  createTransaction: (baseUrl, walletId, transactionData, token) => {
    const startTime = Date.now();

    expect(walletId, 'Wallet ID should be provided').to.exist;
    expect(walletId, 'Wallet ID should not be string "undefined"').to.not.equal('undefined');
    expect(transactionData, 'Transaction data should be provided').to.exist;
    expect(token, 'Token should be provided').to.exist;

    return cy.request({
      method: 'POST',
      url: `${baseUrl}/wallet/${walletId}/transaction`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      body: transactionData,
      timeout: DEFAULT_TIMEOUTS.REQUEST,
      failOnStatusCode: false
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/wallet/transaction',
        duration,
        status: response.status
      }).then(() => {
        response.duration = duration;

        if (response.status === HTTP_STATUS.OK) {
          commonAssertions.expectValidTransaction(response.body);
        }

        return response;
      });
    });
  },

  getTransaction: (baseUrl, walletId, transactionId, token) => {
    const startTime = Date.now();

    expect(walletId, 'Wallet ID should be provided').to.exist;
    expect(transactionId, 'Transaction ID should be provided').to.exist;
    expect(token, 'Token should be provided').to.exist;

    return cy.request({
      method: 'GET',
      url: `${baseUrl}/wallet/${walletId}/transaction/${transactionId}`,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: DEFAULT_TIMEOUTS.REQUEST
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/wallet/transaction/details',
        duration,
        status: response.status
      }).then(() => {
        commonAssertions.expectHttpStatus(response, HTTP_STATUS.OK);
        expect(response.body).to.have.property('transactionId');
        expect(response.body).to.have.property('currency');
        expect(response.body).to.have.property('amount');
        expect(response.body).to.have.property('type');
        expect(response.body).to.have.property('status');
        return response;
      });
    });
  },

  getWalletTransactions: (baseUrl, walletId, token, options = {}) => {
    const startTime = Date.now();

    expect(walletId, 'Wallet ID should be provided').to.exist;
    expect(token, 'Token should be provided').to.exist;

    const url = utilities.buildUrl(`${baseUrl}/wallet/${walletId}/transactions`, '', options);

    return cy.request({
      method: 'GET',
      url,
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      },
      timeout: DEFAULT_TIMEOUTS.REQUEST
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/wallet/transactions',
        duration,
        status: response.status
      }).then(() => {
        commonAssertions.expectHttpStatus(response, HTTP_STATUS.OK);
        commonAssertions.expectValidTransactionList(response.body);
        return response;
      });
    });
  },

  waitForTransactionCompletion: (baseUrl, walletId, transactionId, token, maxWaitTime = DEFAULT_TIMEOUTS.TRANSACTION_COMPLETION) => {
    const getTransactionFn = () => apiActions.getTransaction(baseUrl, walletId, transactionId, token);
    return waitStrategies.forTransactionCompletion(getTransactionFn, maxWaitTime);
  },

  processTransactionWithValidation: (baseUrl, walletId, transactionData, token, shouldWaitForCompletion = true) => {
    return apiActions.createTransaction(baseUrl, walletId, transactionData, token)
      .then((createResponse) => {
        const result = {
          transactionId: createResponse.body.transactionId,
          createResponse: createResponse,
          finalResponse: createResponse
        };

        if (shouldWaitForCompletion && createResponse.body.status === 'pending') {
          return apiActions.waitForTransactionCompletion(
            baseUrl,
            walletId,
            createResponse.body.transactionId,
            token
          ).then((finalResponse) => {
            result.finalResponse = finalResponse;
            return result;
          });
        }

        return result;
      });
  }
};

export const dataActions = {
  cacheAuthData: (authData, username) => {
    cy.wrap(authData).as('authData');
    return authData;
  },

  cacheWalletData: (walletData) => {
    cy.wrap(walletData).as('walletData');
    return walletData;
  },

  performanceStart: (label) => {
    const startTime = performance.now();
    cy.wrap({ label, startTime }).as(`perfStart_${label}`);
  },

  performanceEnd: (label, expectedMaxDuration = null) => {
    cy.get(`@perfStart_${label}`).then((perfData) => {
      const endTime = performance.now();
      const duration = endTime - perfData.startTime;

      const metric = {
        label,
        duration: Math.round(duration),
        timestamp: new Date().toISOString()
      };

      if (expectedMaxDuration && duration > expectedMaxDuration) {
        cy.log(`Performance warning: ${label} exceeded expected duration of ${expectedMaxDuration}ms`);
      }

      cy.wrap(metric).as(`perfResult_${label}`);
    });
  },

  logTestMetadata: (metadata) => {
    const testMetadata = {
      timestamp: new Date().toISOString(),
      environment: Cypress.config('baseUrl'),
      browser: Cypress.browser.name,
      version: Cypress.browser.version,
      ...metadata
    };

    cy.wrap(testMetadata).as('testMetadata');
  }
};

export const validationActions = {
  validateBusinessRules: (transactionData, wallet) => {
    const errors = [];

    if (!/^[A-Z]{3}$/.test(transactionData.currency)) {
      errors.push('Currency must be 3 uppercase letters');
    }

    if (transactionData.amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (transactionData.amount > 1000000) {
      errors.push('Amount exceeds maximum limit');
    }

    const decimalPlaces = (transactionData.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 4) {
      errors.push('Amount can have maximum 4 decimal places');
    }

    if (transactionData.type === 'debit' && wallet) {
      const currencyClip = wallet.currencyClips.find(clip => clip.currency === transactionData.currency);
      if (!currencyClip || currencyClip.balance < transactionData.amount) {
        errors.push(`Insufficient balance for ${transactionData.currency}. Required: ${transactionData.amount}, Available: ${currencyClip?.balance || 0}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }
};