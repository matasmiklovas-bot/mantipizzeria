// Which backing service each part uses. In production every part must use
// its real service: a paid order written to a temporary local file would be
// lost on the next deploy, so that combination is refused outright.

import path from 'node:path';

const REAL = { data: 'supabase', storage: 'supabase', email: 'resend', payment: 'stripe' };
const LOCAL = { data: 'local', storage: 'local', email: 'outbox', payment: 'fake' };
const ENV_NAME = { data: 'DATA_DRIVER', storage: 'STORAGE_DRIVER', email: 'EMAIL_DRIVER', payment: 'PAYMENT_DRIVER' };
const REQUIRED = {
  data: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  storage: ['SUPABASE_URL', 'SUPABASE_SERVICE_ROLE_KEY'],
  email: ['RESEND_API_KEY', 'EMAIL_FROM'],
  payment: ['STRIPE_SECRET_KEY', 'STRIPE_WEBHOOK_SECRET'],
};

export function testHooksAllowed() {
  return process.env.ALLOW_TEST_HOOKS === '1';
}

/**
 * @param {'data'|'storage'|'email'|'payment'} part
 * @returns {string} driver name
 */
export function driverFor(part) {
  const explicit = process.env[ENV_NAME[part]];
  const configured = REQUIRED[part].every((name) => process.env[name]);
  const choice = explicit || (configured ? REAL[part] : LOCAL[part]);

  if (choice !== REAL[part] && choice !== LOCAL[part]) {
    throw new Error(`${ENV_NAME[part]}="${choice}" is not valid. Use "${REAL[part]}" or "${LOCAL[part]}".`);
  }
  if (choice === LOCAL[part] && process.env.NODE_ENV === 'production' && !testHooksAllowed()) {
    throw new Error(
      `The site is running in production without ${REQUIRED[part].join(' / ')}. ` +
        `Set them in the hosting settings. (The "${LOCAL[part]}" stand-in is for development and tests only.)`,
    );
  }
  return choice;
}

export function dataDir() {
  return path.resolve(/* turbopackIgnore: true */ process.env.DATA_DIR || '.data');
}
