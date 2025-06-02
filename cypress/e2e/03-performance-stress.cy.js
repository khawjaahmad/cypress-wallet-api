describe('Performance & Stress Testing', () => {

  beforeEach(() => {
    cy.wakeUpService();

    cy.addTestMetadata({
      testSuite: 'Performance & Stress Testing',
      focus: 'Performance validation'
    });
  });

  it('Should establish performance baseline', () => {
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.logTestStep(1, 'Measuring baseline performance');

    const baselineTransactions = [
      { currency: 'USD', amount: 100.00, type: 'credit' },
      { currency: 'USD', amount: 50.00, type: 'credit' },
      { currency: 'EUR', amount: 75.00, type: 'credit' }
    ];

    cy.startPerformanceMonitoring('baseline_performance');

    cy.createMultipleTransactions(baselineTransactions, {
      delayBetween: 50,
      validateEach: false
    }).then((results) => {
      cy.endPerformanceMonitoring('baseline_performance', 8000);

      const successCount = results.filter(r => r?.createResponse?.status === 200).length;
      expect(successCount).to.be.greaterThan(1);

      const performanceResults = results.map((result, index) => {
        const transaction = baselineTransactions[index];
        return {
          operation: `${transaction.type}_${transaction.currency}`,
          responseTime: result?.createResponse?.duration || 'N/A',
          status: result?.createResponse?.status || 'ERROR'
        };
      });

      cy.logTestResult('PASS', `Baseline: ${successCount}/3 transactions successful`);
      cy.task('log', `Baseline results: ${JSON.stringify(performanceResults, null, 2)}`);
    });
  });

  it('Should handle rapid transaction processing', () => {
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.logTestStep(1, 'Setting up for rapid transactions');

    const setupTransaction = {
      currency: 'USD',
      amount: 5000.00,
      type: 'credit'
    };

    cy.createAndValidateTransaction(setupTransaction, { shouldWaitForCompletion: false })
      .then(() => {
        cy.logTestStep(2, 'Executing rapid transaction sequence');

        const rapidTransactions = [];
        for (let i = 0; i < 8; i++) {
          rapidTransactions.push({
            currency: 'USD',
            amount: Math.round((Math.random() * 50 + 10) * 100) / 100,
            type: i % 3 === 0 ? 'debit' : 'credit'
          });
        }

        cy.startPerformanceMonitoring('rapid_processing');

        cy.createMultipleTransactions(rapidTransactions, {
          delayBetween: 25,
          validateEach: false,
          validateFinalState: false
        }).then((results) => {
          cy.endPerformanceMonitoring('rapid_processing', 15000);

          const successCount = results.filter(r => r?.createResponse?.status === 200).length;
          const failedCount = results.length - successCount;

          expect(successCount).to.be.greaterThan(rapidTransactions.length * 0.6);

          cy.logTestResult('PASS', `Rapid test: ${successCount}/${rapidTransactions.length} successful`);

          if (failedCount > 0) {
            cy.task('log', `${failedCount} transactions failed during rapid test`);
          }
        });
      });
  });

  it('Should handle multiple users efficiently', () => {
    cy.logTestStep(1, 'Setting up multi-user test');

    const testUsers = Cypress.env('testUsers').slice(0, 2);

    if (!testUsers || testUsers.length === 0) {
      cy.logTestResult('SKIP', 'No test users available, skipping multi-user test');
      return;
    }

    cy.startPerformanceMonitoring('multi_user_test');

    const processUser = (userIndex) => {
      if (userIndex >= testUsers.length) {
        cy.endPerformanceMonitoring('multi_user_test', 30000);
        cy.logTestResult('PASS', `Multi-user test completed for ${testUsers.length} users`);
        return;
      }

      const user = testUsers[userIndex];
      cy.logTestStep(userIndex + 2, `Testing user ${userIndex + 1}: ${user.username}`);

      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/user/login`,
        headers: {
          'Content-Type': 'application/json',
          'X-Service-Id': Cypress.env('serviceId')
        },
        body: {
          username: user.username,
          password: user.password
        },
        failOnStatusCode: false
      }).then((loginResponse) => {
        if (loginResponse.status !== 200) {
          cy.task('log', `Login failed for ${user.username}, skipping...`);
          processUser(userIndex + 1);
          return;
        }

        cy.request({
          method: 'GET',
          url: `${Cypress.config('baseUrl')}/user/info/${loginResponse.body.userId}`,
          headers: {
            'Authorization': `Bearer ${loginResponse.body.token}`,
            'Content-Type': 'application/json'
          }
        }).then((userInfoResponse) => {
          const userTransactions = [
            { currency: 'USD', amount: 100.00, type: 'credit' },
            { currency: 'USD', amount: 50.00, type: 'credit' }
          ];

          const executeTransactions = (txIndex) => {
            if (txIndex >= userTransactions.length) {
              cy.task('log', `User ${user.username} completed ${userTransactions.length} transactions`);
              processUser(userIndex + 1);
              return;
            }

            const transaction = userTransactions[txIndex];

            cy.request({
              method: 'POST',
              url: `${Cypress.config('baseUrl')}/wallet/${userInfoResponse.body.walletId}/transaction`,
              headers: {
                'Authorization': `Bearer ${loginResponse.body.token}`,
                'Content-Type': 'application/json'
              },
              body: transaction,
              timeout: 10000,
              failOnStatusCode: false
            }).then((txResponse) => {
              const status = txResponse.status === 200 ? 'SUCCESS' : 'FAILED';
              cy.task('log', `${status} User ${user.username} - TX ${txIndex + 1}: ${transaction.type} ${transaction.amount} - Status: ${txResponse.status}`);

              cy.wait(100).then(() => {
                executeTransactions(txIndex + 1);
              });
            });
          };

          executeTransactions(0);
        });
      });
    };

    processUser(0);
  });

  it('Should handle stress load efficiently', () => {
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.logTestStep(1, 'Initiating stress test');

    const setupTransaction = {
      currency: 'USD',
      amount: 10000.00,
      type: 'credit'
    };

    cy.createAndValidateTransaction(setupTransaction, { shouldWaitForCompletion: false })
      .then(() => {
        cy.logTestStep(2, 'Executing stress transaction patterns');

        const stressTransactions = [];
        for (let i = 0; i < 6; i++) {
          stressTransactions.push({
            currency: 'USD',
            amount: parseFloat((Math.random() * 500 + 50).toFixed(2)),
            type: i % 3 === 0 ? 'debit' : 'credit'
          });
        }

        cy.startPerformanceMonitoring('stress_test');

        cy.createMultipleTransactions(stressTransactions, {
          delayBetween: 20,
          validateEach: false
        }).then((results) => {
          cy.endPerformanceMonitoring('stress_test', 15000);

          cy.logTestStep(3, 'Validating system stability');

          cy.getUserWallet().then((finalWallet) => {
            expect(finalWallet.currencyClips).to.exist;
            expect(finalWallet.walletId).to.be.uuid;

            const successCount = results.filter(r => r?.createResponse?.status === 200).length;

            expect(successCount).to.be.greaterThan(stressTransactions.length * 0.5);

            cy.logTestResult('PASS', `Stress test: ${successCount}/${stressTransactions.length} successful, system stable`);
          });
        });
      });
  });

  it('Should maintain performance consistency', () => {
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.logTestStep(1, 'Starting duration test');

    const setupTransaction = {
      currency: 'USD',
      amount: 3000.00,
      type: 'credit'
    };

    cy.createAndValidateTransaction(setupTransaction, { shouldWaitForCompletion: false })
      .then(() => {
        const testIterations = 3;
        const durationResults = [];

        cy.logTestStep(2, `Executing ${testIterations} iterations`);

        const runIterations = (iteration = 0) => {
          if (iteration >= testIterations) {
            cy.logTestStep(3, 'Analyzing duration results');

            if (durationResults.length > 0) {
              const avgResponseTime = durationResults.reduce((sum, r) => sum + r.responseTime, 0) / durationResults.length;
              const maxResponseTime = Math.max(...durationResults.map(r => r.responseTime));
              const minResponseTime = Math.min(...durationResults.map(r => r.responseTime));

              const responseTimeVariance = maxResponseTime - minResponseTime;
              expect(responseTimeVariance).to.be.lessThan(avgResponseTime * 3);

              cy.logTestResult('PASS', `Duration test: Avg=${Math.round(avgResponseTime)}ms, Min=${minResponseTime}ms, Max=${maxResponseTime}ms`);
            } else {
              cy.logTestResult('PASS', 'Duration test completed');
            }
            return;
          }

          const iterationTransaction = {
            currency: 'USD',
            amount: Math.round((Math.random() * 100 + 10) * 100) / 100,
            type: iteration % 2 === 0 ? 'debit' : 'credit'
          };

          const startTime = Date.now();

          cy.createAndValidateTransaction(iterationTransaction, {
            shouldWaitForCompletion: false,
            validateSchema: false
          }).then((result) => {
            const responseTime = Date.now() - startTime;

            durationResults.push({
              iteration: iteration + 1,
              responseTime,
              status: result?.createResponse?.status || 'ERROR',
              timestamp: new Date().toISOString()
            });

            cy.task('log', `Iteration ${iteration + 1}/${testIterations}: ${responseTime}ms`);

            cy.wait(200).then(() => {
              runIterations(iteration + 1);
            });
          });
        };

        runIterations();
      });
  });

  afterEach(() => {
    cy.logTestInfo('Performance test completed');
  });
});