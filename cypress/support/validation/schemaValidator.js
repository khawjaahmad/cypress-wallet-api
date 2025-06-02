import Ajv from 'ajv';
import addFormats from 'ajv-formats';

class SchemaValidator {
  constructor() {
    this.ajv = new Ajv({ allErrors: true, verbose: true });
    addFormats(this.ajv);
    this.initializeSchemas();
  }

  initializeSchemas() {
    this.schemas = {
      userTokenResponse: {
        type: 'object',
        properties: {
          token: { type: 'string', minLength: 10 },
          refreshToken: { type: 'string', minLength: 10 },
          expiry: { type: 'string', format: 'date-time' },
          userId: { type: 'string', format: 'uuid' }
        },
        required: ['token', 'refreshToken', 'expiry', 'userId'],
        additionalProperties: false
      },

      userInfo: {
        type: 'object',
        properties: {
          walletId: { type: 'string', format: 'uuid' },
          name: { type: ['string', 'null'] },
          locale: { type: ['string', 'null'] },
          region: { type: ['string', 'null'] },
          timezone: { type: ['string', 'null'] },
          email: { type: 'string', format: 'email' }
        },
        required: ['walletId', 'email'],
        additionalProperties: false
      },

      currencyClip: {
        type: 'object',
        properties: {
          currency: { type: 'string', pattern: '^[A-Z]{3}$' },
          balance: { type: 'number', minimum: 0 },
          lastTransaction: { type: 'string', format: 'date-time' },
          transactionCount: { type: 'integer', minimum: 0 }
        },
        required: ['currency', 'balance', 'lastTransaction', 'transactionCount'],
        additionalProperties: false
      },

      wallet: {
        type: 'object',
        properties: {
          walletId: { type: 'string', format: 'uuid' },
          currencyClips: {
            type: 'array',
            items: { $ref: '#/definitions/currencyClip' }
          },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['walletId', 'currencyClips', 'createdAt', 'updatedAt'],
        additionalProperties: false,
        definitions: {
          currencyClip: this.schemas?.currencyClip || {
            type: 'object',
            properties: {
              currency: {
                type: 'string', pattern: '^[A-Z]{3}'
              },
              balance: { type: 'number', minimum: 0 },
              lastTransaction: { type: 'string', format: 'date-time' },
              transactionCount: { type: 'integer', minimum: 0 }
            },
            required: ['currency', 'balance', 'lastTransaction', 'transactionCount']
          }
        }
      },

      transactionRequest: {
        type: 'object',
        properties: {
          currency: {
            type: 'string', pattern: '^[A-Z]{3}'
          },
          amount: { type: 'number', minimum: 0.01, maximum: 1000000 },
          type: { type: 'string', enum: ['credit', 'debit'] }
        },
        required: ['currency', 'amount', 'type'],
        additionalProperties: false
      },

      transactionResponse: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', format: 'uuid' },
          status: { type: 'string', enum: ['pending', 'finished'] },
          outcome: { type: ['string', 'null'], enum: ['approved', 'denied', null] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['transactionId', 'status', 'createdAt', 'updatedAt'],
        additionalProperties: false
      },

      transaction: {
        type: 'object',
        properties: {
          transactionId: { type: 'string', format: 'uuid' },
          currency: {
            type: 'string', pattern: '^[A-Z]{3}'
          },
          amount: { type: 'number', minimum: 0.01 },
          type: { type: 'string', enum: ['credit', 'debit'] },
          status: { type: 'string', enum: ['pending', 'finished'] },
          outcome: { type: ['string', 'null'], enum: ['approved', 'denied', null] },
          createdAt: { type: 'string', format: 'date-time' },
          updatedAt: { type: 'string', format: 'date-time' }
        },
        required: ['transactionId', 'currency', 'amount', 'type', 'status', 'createdAt', 'updatedAt'],
        additionalProperties: false
      },

      transactionListResponse: {
        type: 'object',
        properties: {
          transactions: {
            type: 'array',
            items: { $ref: '#/definitions/transaction' }
          },
          totalCount: { type: 'integer', minimum: 0 },
          currentPage: { type: 'integer', minimum: 1 },
          totalPages: { type: 'integer', minimum: 0 }
        },
        required: ['transactions', 'totalCount', 'currentPage', 'totalPages'],
        additionalProperties: false,
        definitions: {
          transaction: this.schemas?.transaction || {
            type: 'object',
            properties: {
              transactionId: { type: 'string', format: 'uuid' },
              currency: {
                type: 'string', pattern: '^[A-Z]{3}'
              },
              amount: { type: 'number', minimum: 0.01 },
              type: { type: 'string', enum: ['credit', 'debit'] },
              status: { type: 'string', enum: ['pending', 'finished'] },
              outcome: { type: ['string', 'null'], enum: ['approved', 'denied', null] },
              createdAt: { type: 'string', format: 'date-time' },
              updatedAt: { type: 'string', format: 'date-time' }
            },
            required: ['transactionId', 'currency', 'amount', 'type', 'status', 'createdAt', 'updatedAt']
          }
        }
      },

      healthResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['healthy', 'unhealthy'] },
          timestamp: { type: 'string', format: 'date-time' },
          database: { type: 'string', enum: ['connected', 'disconnected'] }
        },
        required: ['status', 'timestamp', 'database'],
        additionalProperties: false
      },

      wakeupResponse: {
        type: 'object',
        properties: {
          status: { type: 'string', enum: ['awake'] },
          message: { type: 'string' },
          timestamp: { type: 'string', format: 'date-time' },
          error: { type: 'string' }
        },
        required: ['status', 'message', 'timestamp'],
        additionalProperties: true
      },

      errorResponse: {
        type: 'object',
        properties: {
          detail: { type: 'string' },
          message: { type: 'string' },
          error: { type: 'string' },
          status_code: { type: 'integer' }
        },
        additionalProperties: true
      }
    };

    Object.keys(this.schemas).forEach(schemaName => {
      this.ajv.addSchema(this.schemas[schemaName], schemaName);
    });
  }

  validate(data, schemaName) {
    const validate = this.ajv.getSchema(schemaName);

    if (!validate) {
      return {
        valid: false,
        errors: [`Schema '${schemaName}' not found`]
      };
    }

    const valid = validate(data);

    return {
      valid,
      errors: valid ? [] : validate.errors,
      schema: schemaName,
      data: data
    };
  }

  addCypressCommand() {
    Cypress.Commands.add('validateSchema', (data, schemaName, options = {}) => {
      const result = this.validate(data, schemaName);

      if (options.logResult !== false) {
        cy.task('log', `Schema validation for '${schemaName}': ${result.valid ? 'PASSED' : 'FAILED'}`);

        if (!result.valid) {
          cy.task('log', `Schema validation errors: ${JSON.stringify(result.errors, null, 2)}`);
        }
      }

      if (options.shouldFail === true) {
        expect(result.valid).to.be.false;
      } else {
        expect(result.valid, `Schema validation failed for '${schemaName}': ${JSON.stringify(result.errors)}`).to.be.true;
      }

      return cy.wrap(result);
    });
  }

  getAvailableSchemas() {
    return Object.keys(this.schemas);
  }

  validateTransactionBusinessRules(transaction, wallet = null) {
    const errors = [];

    if (!/^[A-Z]{3}$/.test(transaction.currency)) {
      errors.push('Currency must be 3 uppercase letters');
    }

    if (transaction.amount <= 0) {
      errors.push('Amount must be positive');
    }

    if (transaction.amount > 1000000) {
      errors.push('Amount exceeds maximum limit');
    }

    const decimalPlaces = (transaction.amount.toString().split('.')[1] || '').length;
    if (decimalPlaces > 4) {
      errors.push('Amount can have maximum 4 decimal places');
    }

    if (transaction.type === 'debit' && wallet) {
      const currencyClip = wallet.currencyClips.find(clip => clip.currency === transaction.currency);
      if (!currencyClip || currencyClip.balance < transaction.amount) {
        errors.push(`Insufficient balance for ${transaction.currency}. Required: ${transaction.amount}, Available: ${currencyClip?.balance || 0}`);
      }
    }

    return {
      valid: errors.length === 0,
      errors
    };
  }

  validateTransactionWithContext(transactionRequest, transactionResponse, wallet) {
    const validationResults = [];

    validationResults.push({
      type: 'request_schema',
      ...this.validate(transactionRequest, 'transactionRequest')
    });

    validationResults.push({
      type: 'response_schema',
      ...this.validate(transactionResponse, 'transactionResponse')
    });

    validationResults.push({
      type: 'business_rules',
      ...this.validateTransactionBusinessRules(transactionRequest, wallet)
    });

    const consistencyErrors = [];

    if (transactionResponse.status === 'finished' && transactionResponse.outcome === 'approved') {
      // For successful transactions, the wallet should be updated
      // This would require a follow-up wallet fetch to validate
    }

    if (transactionRequest.type === 'debit' && !wallet.currencyClips.find(c => c.currency === transactionRequest.currency)) {
      consistencyErrors.push('Cannot debit from non-existent currency');
    }

    validationResults.push({
      type: 'response_consistency',
      valid: consistencyErrors.length === 0,
      errors: consistencyErrors
    });

    const overallValid = validationResults.every(result => result.valid);

    return {
      valid: overallValid,
      results: validationResults,
      summary: {
        totalChecks: validationResults.length,
        passed: validationResults.filter(r => r.valid).length,
        failed: validationResults.filter(r => !r.valid).length
      }
    };
  }
}

export default SchemaValidator;