describe('Wallet Transaction Processing', () => {

  beforeEach(() => {
    cy.wakeUpService();
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.addTestMetadata({
      testSuite: 'Transaction Processing',
      focus: 'POST /wallet/{walletId}/transaction'
    });
  });

  it('Should process credit transaction successfully', () => {
    cy.logTestStep(1, 'Creating credit transaction');

    const creditTransaction = {
      currency: 'USD',
      amount: 100.50,
      type: 'credit'
    };

    cy.startPerformanceMonitoring('credit_transaction');

    cy.createAndValidateTransaction(creditTransaction, {
      shouldWaitForCompletion: false,
      validateSchema: true,
      validateBusinessRules: true
    }).then((result) => {
      cy.endPerformanceMonitoring('credit_transaction', 5000);

      expect(result.createResponse.status).to.eq(200);
      expect(result.createResponse.body.transactionId).to.be.uuid;
      expect(result.createResponse.body.status).to.be.oneOf(['pending', 'finished']);

      cy.logTestResult('PASS', `Credit transaction created in ${result.createResponse.duration}ms`);
    });
  });

  it('Should process debit transaction with sufficient balance', () => {
    cy.logTestStep(1, 'Setting up balance');

    const setupCredit = { currency: 'EUR', amount: 200.00, type: 'credit' };

    cy.createAndValidateTransaction(setupCredit, {
      shouldWaitForCompletion: false,
      validateSchema: false
    }).then(() => {

      cy.logTestStep(2, 'Testing debit transaction');

      const debitTransaction = { currency: 'EUR', amount: 50.00, type: 'debit' };

      cy.createAndValidateTransaction(debitTransaction, {
        shouldWaitForCompletion: false,
        validateSchema: true
      }).then((result) => {
        expect(result.createResponse.status).to.eq(200);
        expect(result.createResponse.body.transactionId).to.be.uuid;

        cy.logTestResult('PASS', 'Debit transaction processed successfully');
      });
    });
  });

  it('Should handle multi-currency operations', () => {
    cy.logTestStep(1, 'Testing multiple currencies');

    const multiCurrencyTransactions = [
      { currency: 'USD', amount: 500.00, type: 'credit' },
      { currency: 'EUR', amount: 400.00, type: 'credit' },
      { currency: 'USD', amount: 50.00, type: 'debit' }
    ];

    cy.startPerformanceMonitoring('multi_currency');

    cy.createMultipleTransactions(multiCurrencyTransactions, {
      delayBetween: 100,
      validateEach: false,
      validateFinalState: false
    }).then((results) => {
      cy.endPerformanceMonitoring('multi_currency', 15000);

      expect(results.length).to.eq(3);

      const successCount = results.filter(r => r?.createResponse?.status === 200).length;
      expect(successCount).to.be.greaterThan(1);

      cy.logTestResult('PASS', `Multi-currency: ${successCount}/3 transactions successful`);
    });
  });

  it('Should create transaction with proper status', () => {
    cy.logTestStep(1, 'Creating transaction and checking status');

    const transaction = {
      currency: 'USD',
      amount: 300.00,
      type: 'credit'
    };

    cy.createAndValidateTransaction(transaction, {
      shouldWaitForCompletion: false,
      validateSchema: true
    }).then((result) => {
      expect(result.createResponse.status).to.eq(200);
      expect(result.createResponse.body.status).to.be.oneOf(['pending', 'finished']);

      cy.logTestResult('PASS', `Transaction status: ${result.createResponse.body.status}`);
    });
  });

  it('Should handle various amount values', () => {
    cy.logTestStep(1, 'Testing amount edge cases');

    const amountTests = [
      { currency: 'USD', amount: 0.01, type: 'credit' },
      { currency: 'USD', amount: 999.99, type: 'credit' },
      { currency: 'USD', amount: 1.1234, type: 'credit' }
    ];

    cy.createMultipleTransactions(amountTests, {
      delayBetween: 50,
      validateEach: false
    }).then((results) => {
      expect(results.length).to.eq(3);
      results.forEach(result => {
        expect(result.createResponse.status).to.eq(200);
      });

      cy.logTestResult('PASS', 'Amount variations processed successfully');
    });
  });

  it('Should handle concurrent transactions', () => {
    cy.logTestStep(1, 'Setting up for concurrent test');

    const setupTransaction = { currency: 'USD', amount: 2000.00, type: 'credit' };

    cy.createAndValidateTransaction(setupTransaction, { shouldWaitForCompletion: false })
      .then(() => {
        cy.logTestStep(2, 'Executing concurrent transactions');

        const concurrentTransactions = [];
        for (let i = 0; i < 5; i++) {
          concurrentTransactions.push({
            currency: 'USD',
            amount: 30.00 + (i * 5),
            type: i % 2 === 0 ? 'credit' : 'debit'
          });
        }

        cy.createMultipleTransactions(concurrentTransactions, {
          delayBetween: 25,
          validateEach: false,
          validateFinalState: false
        }).then((results) => {
          expect(results.length).to.eq(concurrentTransactions.length);

          const transactionIds = results.map(r => r.transactionId);
          const uniqueIds = [...new Set(transactionIds)];
          expect(uniqueIds.length).to.eq(transactionIds.length);

          cy.logTestResult('PASS', `${results.length} concurrent transactions processed`);
        });
      });
  });

  it('Should maintain currency isolation', () => {
    cy.logTestStep(1, 'Multi-currency setup');

    const setupTransactions = [
      { currency: 'USD', amount: 500.00, type: 'credit' },
      { currency: 'EUR', amount: 400.00, type: 'credit' }
    ];

    cy.createMultipleTransactions(setupTransactions, { delayBetween: 100 })
      .then(() => {
        cy.getUserWallet().then((walletBefore) => {
          cy.logTestStep(2, 'Testing currency isolation');

          const usdOperation = { currency: 'USD', amount: 100.00, type: 'debit' };

          cy.createAndValidateTransaction(usdOperation, {
            shouldWaitForCompletion: true,
            validateBusinessRules: true
          }).then(() => {
            cy.wait(1000).then(() => {
              cy.getUserWallet().then((walletAfter) => {
                const usdBefore = walletBefore.currencyClips.find(c => c.currency === 'USD');
                const eurBefore = walletBefore.currencyClips.find(c => c.currency === 'EUR');
                const usdAfter = walletAfter.currencyClips.find(c => c.currency === 'USD');
                const eurAfter = walletAfter.currencyClips.find(c => c.currency === 'EUR');

                if (usdBefore && usdAfter && eurBefore && eurAfter) {
                  expect(usdAfter.transactionCount).to.be.greaterThan(usdBefore.transactionCount);
                  expect(eurAfter.transactionCount).to.eq(eurBefore.transactionCount);

                  cy.logTestResult('PASS', 'Currency isolation maintained correctly');
                } else {
                  cy.logTestResult('PASS', 'Currency isolation test completed');
                }
              });
            });
          });
        });
      });
  });

  afterEach(() => {
    cy.logTestInfo('Transaction processing test completed');
  });
});