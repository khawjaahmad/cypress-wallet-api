import { apiActions } from '../utils/actions.js';

class WalletApiClient {
  constructor() {
    this.baseUrl = Cypress.env('apiUrl');
    this.serviceId = Cypress.env('serviceId');
    this.defaultTimeout = Cypress.env('defaultTimeout');
  }

  wakeUpService() {
    return apiActions.wakeUpService(this.baseUrl, this.serviceId);
  }

  healthCheck() {
    const startTime = Date.now();

    return cy.request({
      method: 'GET',
      url: `${this.baseUrl}/health`,
      timeout: this.defaultTimeout
    }).then((response) => {
      const duration = Date.now() - startTime;

      return cy.task('recordPerformanceMetric', {
        endpoint: '/health',
        duration,
        status: response.status
      }).then(() => {
        expect(response.status).to.eq(200);
        expect(response.body).to.have.property('status');
        expect(response.body).to.have.property('database');
        return response;
      });
    });
  }

  login(username, password) {
    return apiActions.login(this.baseUrl, this.serviceId, username, password);
  }

  getUserInfo(userId, token) {
    return apiActions.getUserInfo(this.baseUrl, userId, token);
  }

  getWallet(walletId, token) {
    return apiActions.getWallet(this.baseUrl, walletId, token);
  }

  createTransaction(walletId, transactionData, token) {
    return apiActions.createTransaction(this.baseUrl, walletId, transactionData, token);
  }

  getTransaction(walletId, transactionId, token) {
    return apiActions.getTransaction(this.baseUrl, walletId, transactionId, token);
  }

  getWalletTransactions(walletId, token, options = {}) {
    return apiActions.getWalletTransactions(this.baseUrl, walletId, token, options);
  }

  waitForTransactionCompletion(walletId, transactionId, token, maxWaitTime = 60000) {
    return apiActions.waitForTransactionCompletion(this.baseUrl, walletId, transactionId, token, maxWaitTime);
  }

  processTransactionWithValidation(walletId, transactionData, token, shouldWaitForCompletion = true) {
    return apiActions.processTransactionWithValidation(this.baseUrl, walletId, transactionData, token, shouldWaitForCompletion);
  }
}

export default WalletApiClient;