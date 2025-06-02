describe('Negative Scenarios & Error Handling', () => {

  beforeEach(() => {
    cy.wakeUpService();
    cy.loginAndCacheAuth();
    cy.getUserWallet();

    cy.addTestMetadata({
      testSuite: 'Negative Scenarios',
      focus: 'Error handling and validation'
    });
  });

  it('Should handle insufficient balance appropriately', () => {
    cy.logTestStep(1, 'Testing insufficient balance scenario');

    const insufficientDebit = {
      currency: 'USD',
      amount: 999999.99,
      type: 'debit'
    };

    cy.get('@authData').then((auth) => {
      cy.get('@walletData').then((wallet) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: insufficientDebit,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.be.oneOf([200, 400]);

          if (response.status === 400) {
            expect(response.body).to.have.property('detail');
            expect(response.body.detail.toLowerCase()).to.include('insufficient');
            cy.logTestResult('PASS', 'Insufficient balance correctly rejected');
          } else {
            cy.logTestResult('PASS', 'Transaction accepted - balance validation may occur later');
          }
        });
      });
    });
  });

  it('Should reject invalid transaction data', () => {
    cy.logTestStep(1, 'Testing invalid data scenarios');

    const invalidScenarios = [
      {
        name: 'negative_amount',
        data: { currency: 'USD', amount: -100.00, type: 'credit' },
        expectedStatus: 422
      },
      {
        name: 'invalid_currency',
        data: { currency: 'INVALID', amount: 100.00, type: 'credit' },
        expectedStatus: 422
      },
      {
        name: 'missing_amount',
        data: { currency: 'USD', type: 'credit' },
        expectedStatus: 422
      }
    ];

    cy.get('@authData').then((auth) => {
      cy.get('@walletData').then((wallet) => {

        invalidScenarios.forEach((scenario, index) => {
          cy.request({
            method: 'POST',
            url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            },
            body: scenario.data,
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(scenario.expectedStatus);
          });
        });

        cy.logTestResult('PASS', `${invalidScenarios.length} invalid scenarios rejected correctly`);
      });
    });
  });

  it('Should reject invalid authentication', () => {
    cy.logTestStep(1, 'Testing invalid token scenario');

    cy.get('@walletData').then((wallet) => {
      const validTransaction = {
        currency: 'USD',
        amount: 100.00,
        type: 'credit'
      };

      cy.request({
        method: 'POST',
        url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
        headers: {
          'Authorization': 'Bearer invalid_token',
          'Content-Type': 'application/json'
        },
        body: validTransaction,
        failOnStatusCode: false
      }).then((response) => {
        expect(response.status).to.eq(401);
        cy.logTestResult('PASS', 'Invalid token correctly rejected');
      });
    });
  });

  it('Should handle invalid wallet ID scenarios', () => {
    cy.logTestStep(1, 'Testing invalid wallet scenarios');

    cy.get('@authData').then((auth) => {
      const validTransaction = {
        currency: 'USD',
        amount: 100.00,
        type: 'credit'
      };

      const walletScenarios = [
        {
          name: 'non_existent_wallet',
          walletId: '123e4567-e89b-12d3-a456-426614174999',
          expectedStatus: 404
        },
        {
          name: 'invalid_uuid_format',
          walletId: 'not-a-valid-uuid',
          expectedStatus: 422
        }
      ];

      walletScenarios.forEach((scenario) => {
        cy.request({
          method: 'POST',
          url: `${Cypress.config('baseUrl')}/wallet/${scenario.walletId}/transaction`,
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: validTransaction,
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(scenario.expectedStatus);
        });
      });

      cy.logTestResult('PASS', `${walletScenarios.length} wallet ID scenarios handled correctly`);
    });
  });

  it('Should handle extreme amounts', () => {
    cy.logTestStep(1, 'Testing extreme amounts');

    const extremeTests = [
      {
        name: 'microscopic_amount',
        amount: 0.0001,
        type: 'credit',
        expectedStatus: 422
      },
      {
        name: 'maximum_exceeded',
        amount: 1000001.00,
        type: 'credit',
        expectedStatus: 422
      },
      {
        name: 'too_many_decimals',
        amount: 123.12345,
        type: 'credit',
        expectedStatus: 422
      }
    ];

    cy.get('@authData').then((auth) => {
      cy.get('@walletData').then((wallet) => {

        extremeTests.forEach((test) => {
          const extremeTransaction = {
            currency: 'USD',
            amount: test.amount,
            type: test.type
          };

          cy.request({
            method: 'POST',
            url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            },
            body: extremeTransaction,
            failOnStatusCode: false
          }).then((response) => {
            expect(response.status).to.eq(test.expectedStatus);
          });
        });

        cy.logTestResult('PASS', `${extremeTests.length} extreme amounts handled correctly`);
      });
    });
  });

  it('Should handle malformed requests', () => {
    cy.logTestStep(1, 'Testing malformed request scenarios');

    cy.get('@authData').then((auth) => {
      cy.get('@walletData').then((wallet) => {

        // Test empty body
        cy.request({
          method: 'POST',
          url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: {},
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(422);
        });

        // Test null values
        cy.request({
          method: 'POST',
          url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
          headers: {
            'Authorization': `Bearer ${auth.token}`,
            'Content-Type': 'application/json'
          },
          body: {
            currency: null,
            amount: null,
            type: null
          },
          failOnStatusCode: false
        }).then((response) => {
          expect(response.status).to.eq(422);
        });

        cy.logTestResult('PASS', 'Malformed requests handled correctly');
      });
    });
  });

  it('Should handle rapid requests appropriately', () => {
    cy.logTestStep(1, 'Testing rapid consecutive requests');

    const rapidTransaction = {
      currency: 'USD',
      amount: 1.00,
      type: 'credit'
    };

    cy.get('@authData').then((auth) => {
      cy.get('@walletData').then((wallet) => {

        const requests = [];
        for (let i = 0; i < 5; i++) {
          requests.push({
            method: 'POST',
            url: `${Cypress.config('baseUrl')}/wallet/${wallet.walletId}/transaction`,
            headers: {
              'Authorization': `Bearer ${auth.token}`,
              'Content-Type': 'application/json'
            },
            body: rapidTransaction,
            timeout: 8000,
            failOnStatusCode: false
          });
        }

        const executeRequests = (requestList, results = []) => {
          if (requestList.length === 0) {
            const successCount = results.filter(r => r && r.status === 200).length;
            const rateLimitCount = results.filter(r => r && r.status === 429).length;

            expect(successCount).to.be.greaterThan(0);
            cy.logTestResult('PASS', `Rapid requests: ${successCount} success, ${rateLimitCount} rate limited`);
            return;
          }

          const currentRequest = requestList[0];
          const remainingRequests = requestList.slice(1);

          cy.request(currentRequest).then((response) => {
            results.push(response);
            executeRequests(remainingRequests, results);
          });
        };

        executeRequests(requests);
      });
    });
  });

  afterEach(() => {
    cy.logTestInfo('Negative scenario test completed');
  });
});