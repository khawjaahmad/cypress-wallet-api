import { REGEX_PATTERNS } from '../config/constants.js';

export const addCustomAssertions = () => {
  chai.use((chai, utils) => {
    chai.Assertion.addMethod('uuid', function () {
      const obj = this._obj;

      this.assert(
        REGEX_PATTERNS.UUID.test(obj),
        'expected #{this} to be a valid UUID',
        'expected #{this} not to be a valid UUID'
      );
    });

    chai.Assertion.addMethod('currencyCode', function () {
      const obj = this._obj;

      this.assert(
        REGEX_PATTERNS.CURRENCY_CODE.test(obj),
        'expected #{this} to be a valid currency code (3 uppercase letters)',
        'expected #{this} not to be a valid currency code'
      );
    });

    chai.Assertion.addMethod('positiveAmount', function () {
      const obj = this._obj;

      this.assert(
        typeof obj === 'number' && obj > 0,
        'expected #{this} to be a positive number',
        'expected #{this} not to be a positive number'
      );
    });

    chai.Assertion.addMethod('decimalPrecision', function (maxDecimals) {
      const obj = this._obj;
      const decimalPlaces = (obj.toString().split('.')[1] || '').length;

      this.assert(
        decimalPlaces <= maxDecimals,
        `expected #{this} to have at most ${maxDecimals} decimal places, but got ${decimalPlaces}`,
        `expected #{this} to have more than ${maxDecimals} decimal places`
      );
    });

    chai.Assertion.addMethod('validTransactionStatus', function () {
      const obj = this._obj;
      const validStatuses = ['pending', 'finished'];

      this.assert(
        validStatuses.includes(obj),
        `expected #{this} to be a valid transaction status (${validStatuses.join(', ')})`,
        `expected #{this} not to be a valid transaction status`
      );
    });

    chai.Assertion.addMethod('validTransactionOutcome', function () {
      const obj = this._obj;
      const validOutcomes = ['approved', 'denied', null];

      this.assert(
        validOutcomes.includes(obj),
        `expected #{this} to be a valid transaction outcome (approved, denied, or null)`,
        `expected #{this} not to be a valid transaction outcome`
      );
    });

    chai.Assertion.addMethod('validTransactionType', function () {
      const obj = this._obj;
      const validTypes = ['credit', 'debit'];

      this.assert(
        validTypes.includes(obj),
        `expected #{this} to be a valid transaction type (${validTypes.join(', ')})`,
        `expected #{this} not to be a valid transaction type`
      );
    });

    chai.Assertion.addMethod('withinRange', function (min, max) {
      const obj = this._obj;

      this.assert(
        typeof obj === 'number' && obj >= min && obj <= max,
        `expected #{this} to be within range ${min} to ${max}`,
        `expected #{this} not to be within range ${min} to ${max}`
      );
    });

    chai.Assertion.addMethod('iso8601DateTime', function () {
      const obj = this._obj;
      const iso8601Regex = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z?$/;

      this.assert(
        typeof obj === 'string' && iso8601Regex.test(obj),
        'expected #{this} to be a valid ISO 8601 datetime string',
        'expected #{this} not to be a valid ISO 8601 datetime string'
      );
    });

    chai.Assertion.addMethod('nonEmptyArray', function () {
      const obj = this._obj;

      this.assert(
        Array.isArray(obj) && obj.length > 0,
        'expected #{this} to be a non-empty array',
        'expected #{this} not to be a non-empty array'
      );
    });

    chai.Assertion.addMethod('balanceChange', function (expectedChange, tolerance = 0.01) {
      const obj = this._obj;
      const actualChange = Math.abs(obj);
      const expectedAbs = Math.abs(expectedChange);
      const difference = Math.abs(actualChange - expectedAbs);

      this.assert(
        difference <= tolerance,
        `expected balance change to be ${expectedAbs} ± ${tolerance}, but got ${actualChange}`,
        `expected balance change not to be ${expectedAbs} ± ${tolerance}`
      );
    });
  });
};

export const commonAssertions = {
  expectSuccessfulLogin: (response) => {
    expect(response.status).to.eq(200);
    expect(response.body).to.have.property('token');
    expect(response.body).to.have.property('userId');
    expect(response.body.userId).to.be.uuid;
    expect(response.body).to.have.property('expiry');
    expect(response.body.expiry).to.be.iso8601DateTime;
  },

  expectValidWallet: (wallet) => {
    expect(wallet).to.have.property('walletId');
    expect(wallet.walletId).to.be.uuid;
    expect(wallet).to.have.property('currencyClips');
    expect(wallet.currencyClips).to.be.an('array');
    expect(wallet).to.have.property('createdAt');
    expect(wallet.createdAt).to.be.iso8601DateTime;
    expect(wallet).to.have.property('updatedAt');
    expect(wallet.updatedAt).to.be.iso8601DateTime;
  },

  expectValidTransaction: (transaction) => {
    expect(transaction).to.have.property('transactionId');
    expect(transaction.transactionId).to.be.uuid;
    expect(transaction).to.have.property('status');
    expect(transaction.status).to.be.validTransactionStatus;
    expect(transaction).to.have.property('createdAt');
    expect(transaction.createdAt).to.be.iso8601DateTime;
    expect(transaction).to.have.property('updatedAt');
    expect(transaction.updatedAt).to.be.iso8601DateTime;

    if (transaction.status === 'finished') {
      expect(transaction).to.have.property('outcome');
      expect(transaction.outcome).to.be.validTransactionOutcome;
    }
  },

  expectValidCurrencyClip: (clip) => {
    expect(clip).to.have.property('currency');
    expect(clip.currency).to.be.currencyCode;
    expect(clip).to.have.property('balance');
    expect(clip.balance).to.be.positiveAmount;
    expect(clip).to.have.property('transactionCount');
    expect(clip.transactionCount).to.be.a('number');
    expect(clip.transactionCount).to.be.at.least(0);
    expect(clip).to.have.property('lastTransaction');
    expect(clip.lastTransaction).to.be.iso8601DateTime;
  },

  expectValidUserInfo: (userInfo) => {
    expect(userInfo).to.have.property('walletId');
    expect(userInfo.walletId).to.be.uuid;
    expect(userInfo).to.have.property('email');
    expect(userInfo.email).to.match(REGEX_PATTERNS.EMAIL);
  },

  expectValidTransactionList: (transactionList) => {
    expect(transactionList).to.have.property('transactions');
    expect(transactionList.transactions).to.be.an('array');
    expect(transactionList).to.have.property('totalCount');
    expect(transactionList.totalCount).to.be.a('number');
    expect(transactionList).to.have.property('currentPage');
    expect(transactionList.currentPage).to.be.a('number');
    expect(transactionList).to.have.property('totalPages');
    expect(transactionList.totalPages).to.be.a('number');
  },

  expectHttpStatus: (response, expectedStatus) => {
    expect(response.status).to.eq(expectedStatus);
  },

  expectErrorResponse: (response, expectedStatus = 400) => {
    expect(response.status).to.eq(expectedStatus);
    expect(response.body).to.have.property('detail');
  }
};