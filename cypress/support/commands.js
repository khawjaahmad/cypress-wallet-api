import WalletApiClient from './api/apiClient.js';
import SchemaValidator from './validation/schemaValidator.js';
import TestDataManager from './data/testDataManager.js';
import { Decimal } from 'decimal.js';
import { dataActions, validationActions } from './utils/actions.js';

const apiClient = new WalletApiClient();
const schemaValidator = new SchemaValidator();
const testDataManager = new TestDataManager();

schemaValidator.addCypressCommand();

Cypress.Commands.add('wakeUpService', () => {
  return apiClient.wakeUpService();
});

Cypress.Commands.add('loginAndCacheAuth', (username = null, password = null) => {
  const user = username ? { username, password } : testDataManager.getRandomUser();

  return cy.then(() => {
    return apiClient.login(user.username, user.password);
  }).then((response) => {
    const authData = {
      token: response.body.token,
      userId: response.body.userId,
      refreshToken: response.body.refreshToken,
      expiry: response.body.expiry,
      username: user.username
    };

    dataActions.cacheAuthData(authData, user.username);
    testDataManager.cacheData(user.username, authData, 'users');

    return cy.wrap(authData);
  });
});

Cypress.Commands.add('getUserWallet', (authData = null) => {
  if (!authData) {
    return cy.get('@authData').then((auth) => {
      return cy.getUserWallet(auth);
    });
  }

  return cy.then(() => {
    return apiClient.getUserInfo(authData.userId, authData.token);
  }).then((userResponse) => {
    expect(userResponse.body, 'User info response should exist').to.exist;
    expect(userResponse.body.walletId, 'WalletId should be defined').to.exist;

    const walletId = userResponse.body.walletId;

    return cy.then(() => {
      return apiClient.getWallet(walletId, authData.token);
    }).then((walletResponse) => {
      const walletData = {
        ...walletResponse.body,
        userInfo: userResponse.body
      };

      dataActions.cacheWalletData(walletData);
      testDataManager.cacheData(authData.username, walletData, 'wallets');

      return cy.wrap(walletData);
    });
  });
});

Cypress.Commands.add('createAndValidateTransaction', (transactionData, options = {}) => {
  const {
    shouldWaitForCompletion = true,
    validateSchema = true,
    validateBusinessRules = true,
    authData = null,
    walletData = null
  } = options;

  const getRequiredData = () => {
    if (authData && walletData) {
      return cy.wrap({ auth: authData, wallet: walletData });
    }

    return cy.get('@authData').then((auth) => {
      return cy.get('@walletData').then((wallet) => {
        expect(wallet, 'Wallet data should exist').to.exist;
        expect(wallet.walletId, 'Wallet ID should exist').to.exist;

        return { auth, wallet };
      });
    });
  };

  return getRequiredData().then(({ auth, wallet }) => {
    if (validateBusinessRules) {
      const businessValidation = validationActions.validateBusinessRules(transactionData, wallet);
      if (!businessValidation.valid) {
        if (businessValidation.errors.some(error => error.includes('Insufficient balance'))) {
          cy.log('Insufficient balance detected - this may be expected for negative testing');
        }

        expect(businessValidation.valid, `Business rule validation failed: ${businessValidation.errors.join(', ')}`).to.be.true;
      }
    }

    return cy.then(() => {
      return apiClient.processTransactionWithValidation(
        wallet.walletId,
        transactionData,
        auth.token,
        shouldWaitForCompletion
      );
    }).then((result) => {
      if (validateSchema) {
        cy.validateSchema(transactionData, 'transactionRequest');
        cy.validateSchema(result.createResponse.body, 'transactionResponse');

        if (result.finalResponse.body !== result.createResponse.body) {
          cy.validateSchema(result.finalResponse.body, 'transaction');
        }
      }

      testDataManager.cacheData(result.transactionId, result, 'transactions');

      return cy.wrap(result);
    });
  });
});

Cypress.Commands.add('validateWalletBalanceUpdate', (originalWallet, transactionData, transactionResult) => {
  // Skip validation if transaction was not approved
  if (transactionResult.finalResponse.body.status !== 'finished' ||
    transactionResult.finalResponse.body.outcome !== 'approved') {
    return cy.wrap(null);
  }

  return cy.get('@authData').then((auth) => {
    return cy.then(() => {
      return apiClient.getWallet(originalWallet.walletId, auth.token);
    }).then((updatedWalletResponse) => {
      const updatedWallet = updatedWalletResponse.body;

      const originalClip = originalWallet.currencyClips.find(c => c.currency === transactionData.currency);
      const updatedClip = updatedWallet.currencyClips.find(c => c.currency === transactionData.currency);

      const originalBalance = originalClip ? originalClip.balance : 0;

      const originalBalanceDecimal = new Decimal(originalBalance.toString());
      const transactionAmountDecimal = new Decimal(transactionData.amount.toString());

      const expectedBalanceDecimal = transactionData.type === 'credit' ?
        originalBalanceDecimal.plus(transactionAmountDecimal) :
        originalBalanceDecimal.minus(transactionAmountDecimal);

      expect(updatedClip, `Currency clip for ${transactionData.currency} should exist`).to.exist;

      const actualBalanceDecimal = new Decimal(updatedClip.balance.toString());
      const differenceDecimal = expectedBalanceDecimal.minus(actualBalanceDecimal).abs();
      const toleranceDecimal = new Decimal('0.01');

      expect(differenceDecimal.lessThan(toleranceDecimal),
        `Balance should be updated correctly. Expected: ${expectedBalanceDecimal.toString()}, Actual: ${actualBalanceDecimal.toString()}, Difference: ${differenceDecimal.toString()}`
      ).to.be.true;

      expect(updatedClip.transactionCount, `Transaction count should be incremented`).to.be.greaterThan(originalClip ? originalClip.transactionCount : 0);

      return cy.wrap(updatedWallet);
    });
  });
});

Cypress.Commands.add('createMultipleTransactions', (transactions, options = {}) => {
  const {
    delayBetween = 500,
    validateEach = true,
    validateFinalState = true
  } = options;

  const results = [];

  return cy.getUserWallet().then((initialWallet) => {
    const processTransactions = (txList, index = 0) => {
      if (index >= txList.length) {
        return cy.wrap(results);
      }

      const transaction = txList[index];

      return cy.getUserWallet().then((currentWallet) => {
        return cy.createAndValidateTransaction(transaction, {
          validateSchema: validateEach,
          validateBusinessRules: validateEach,
          walletData: currentWallet
        }).then((result) => {
          results.push(result);

          if (validateEach && result.finalResponse.body.outcome === 'approved') {
            return cy.validateWalletBalanceUpdate(currentWallet, transaction, result).then(() => {
              if (index < txList.length - 1) {
                return cy.wait(delayBetween).then(() => processTransactions(txList, index + 1));
              } else {
                return processTransactions(txList, index + 1);
              }
            });
          } else {
            if (index < txList.length - 1) {
              return cy.wait(delayBetween).then(() => processTransactions(txList, index + 1));
            } else {
              return processTransactions(txList, index + 1);
            }
          }
        });
      });
    };

    return processTransactions(transactions);
  });
});

Cypress.Commands.add('performanceTest', (transactionData, iterations = 10) => {
  const performanceResults = [];

  const runIteration = (i) => {
    if (i >= iterations) {
      const durations = performanceResults.map(r => r.duration);
      const stats = {
        total: iterations,
        avgDuration: durations.reduce((a, b) => a + b, 0) / durations.length,
        minDuration: Math.min(...durations),
        maxDuration: Math.max(...durations),
        medianDuration: durations.sort((a, b) => a - b)[Math.floor(durations.length / 2)]
      };

      cy.wrap(stats).as('performanceStats');
      return cy.wrap(stats);
    }

    const startTime = Date.now();

    return cy.createAndValidateTransaction(transactionData, {
      shouldWaitForCompletion: false,
      validateSchema: false
    }).then((result) => {
      const duration = Date.now() - startTime;
      performanceResults.push({
        iteration: i + 1,
        duration,
        status: result.createResponse.body.status,
        transactionId: result.transactionId
      });

      if (i < iterations - 1) {
        return cy.wait(100).then(() => runIteration(i + 1));
      } else {
        return runIteration(i + 1);
      }
    });
  };

  return runIteration(0);
});

Cypress.Commands.add('negativeTest', (invalidationType, expectedStatusCode = 400) => {
  const invalidTransaction = testDataManager.generateInvalidTransaction(invalidationType);

  return cy.get('@authData').then((auth) => {
    return cy.get('@walletData').then((wallet) => {
      return cy.then(() => {
        return apiClient.createTransaction(wallet.walletId, invalidTransaction, auth.token);
      }).then((response) => {
        expect(response.status, `Should return ${expectedStatusCode} for ${invalidationType}`).to.eq(expectedStatusCode);

        if (response.status >= 400) {
          cy.validateSchema(response.body, 'errorResponse', { shouldFail: false });
        }

        return cy.wrap(response);
      });
    });
  });
});

Cypress.Commands.add('e2eWorkflowTest', (scenario = 'standard') => {
  return cy.wakeUpService().then(() => {
    return cy.loginAndCacheAuth();
  }).then(() => {
    return cy.getUserWallet();
  }).then(() => {
    const transactions = testDataManager.generateTransactionScenario(scenario);

    if (transactions.length > 0) {
      return cy.createMultipleTransactions(transactions, { validateFinalState: true });
    } else {
      return cy.wrap([]);
    }
  }).then(() => {
    return cy.get('@authData').then((auth) => {
      return cy.get('@walletData').then((originalWallet) => {
        return cy.then(() => {
          return apiClient.getWallet(originalWallet.walletId, auth.token);
        }).then((finalWalletResponse) => {
          cy.validateSchema(finalWalletResponse.body, 'wallet');

          return cy.then(() => {
            return apiClient.getWalletTransactions(originalWallet.walletId, auth.token);
          }).then((transactionsResponse) => {
            cy.validateSchema(transactionsResponse.body, 'transactionListResponse');

            expect(transactionsResponse.body.totalCount, 'Should have transaction history').to.be.greaterThan(0);

            return cy.wrap(transactionsResponse.body);
          });
        });
      });
    });
  });
});

Cypress.Commands.add('logTestInfo', (message) => {
  cy.task('log', `INFO: ${message}`);
});

Cypress.Commands.add('logTestStep', (stepNumber, description) => {
  cy.task('log', `Step ${stepNumber}: ${description}`);
});

Cypress.Commands.add('logTestResult', (result, details = '') => {
  const prefix = result === 'PASS' ? 'PASS' : 'FAIL';
  cy.task('log', `${prefix}: ${details}`);
});

Cypress.Commands.add('addTestMetadata', (metadata) => {
  dataActions.logTestMetadata(metadata);
});

Cypress.Commands.add('startPerformanceMonitoring', (label) => {
  dataActions.performanceStart(label);
});

Cypress.Commands.add('endPerformanceMonitoring', (label, expectedMaxDuration = null) => {
  dataActions.performanceEnd(label, expectedMaxDuration);
});