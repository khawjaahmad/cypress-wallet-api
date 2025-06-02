export const API_ENDPOINTS = {
  WAKEUP: '/wakeup',
  HEALTH: '/health',
  LOGIN: '/user/login',
  USER_INFO: '/user/info',
  WALLET: '/wallet',
  TRANSACTION: '/transaction',
  TRANSACTIONS: '/transactions'
};

export const TRANSACTION_TYPES = {
  CREDIT: 'credit',
  DEBIT: 'debit'
};

export const TRANSACTION_STATUS = {
  PENDING: 'pending',
  FINISHED: 'finished'
};

export const TRANSACTION_OUTCOMES = {
  APPROVED: 'approved',
  DENIED: 'denied'
};

export const HTTP_STATUS = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  NOT_FOUND: 404,
  UNPROCESSABLE_ENTITY: 422,
  TOO_MANY_REQUESTS: 429
};

export const DEFAULT_TIMEOUTS = {
  REQUEST: 30000,
  PERFORMANCE: 5000,
  TRANSACTION_COMPLETION: 60000,
  POLL_INTERVAL: 2000
};

export const CURRENCY_MULTIPLIERS = {
  USD: 1,
  EUR: 0.85,
  GBP: 0.73,
  JPY: 110,
  AUD: 1.35,
  CAD: 1.25,
  CHF: 0.92,
  SEK: 8.5,
  NOK: 8.3,
  DKK: 6.3,
  AED: 3.67,
  MXN: 20.5
};

export const TEST_SCENARIOS = {
  ONBOARDING: 'onboarding',
  TRADING: 'trading',
  ARBITRAGE: 'arbitrage',
  MICROPAYMENTS: 'micropayments',
  STRESS: 'stress'
};

export const INVALID_TRANSACTION_TYPES = {
  NEGATIVE_AMOUNT: 'negative_amount',
  ZERO_AMOUNT: 'zero_amount',
  HUGE_AMOUNT: 'huge_amount',
  INVALID_CURRENCY: 'invalid_currency',
  LOWERCASE_CURRENCY: 'lowercase_currency',
  NUMERIC_CURRENCY: 'numeric_currency',
  INVALID_TYPE: 'invalid_type',
  MISSING_CURRENCY: 'missing_currency',
  MISSING_AMOUNT: 'missing_amount',
  MISSING_TYPE: 'missing_type',
  STRING_AMOUNT: 'string_amount',
  TOO_MANY_DECIMALS: 'too_many_decimals',
  NULL_VALUES: 'null_values'
};

export const REGEX_PATTERNS = {
  UUID: /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
  CURRENCY_CODE: /^[A-Z]{3}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
};