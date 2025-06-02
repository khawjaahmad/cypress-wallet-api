import './commands.js';
import { addCustomAssertions } from './validation/assertions.js';
import 'cypress-mochawesome-reporter/register';

addCustomAssertions();

Cypress.on('uncaught:exception', (err, runnable) => {
  console.log('Uncaught exception:', err.message);
  return false;
});

beforeEach(() => {
  Cypress.config('defaultCommandTimeout', Cypress.env('defaultTimeout'));
  cy.clearCookies();
  cy.clearLocalStorage();
});

afterEach(function () {
  const testResult = this.currentTest.state;
  const testTitle = this.currentTest.title;

  cy.task('log', `Test completed: "${testTitle}" - Status: ${testResult.toUpperCase()}`);

  if (testResult === 'failed') {
    cy.task('log', `Test failure detected: ${testTitle}`);
  }
});

Cypress.Commands.add('handleApiError', (response, context = '') => {
  if (response.status >= 400) {
    cy.task('log', `API Error ${response.status} ${context}: ${JSON.stringify(response.body, null, 2)}`);
  }
});