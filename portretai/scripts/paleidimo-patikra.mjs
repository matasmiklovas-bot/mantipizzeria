// Lists everything that is still unsettled before real customers pay:
// unconfirmed settings in server/settings.js and missing environment
// variables. Exits with code 1 while anything blocking remains.
//
//   npm run paleidimo-patikra

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const envFile = path.join(root, '.env');
if (fs.existsSync(envFile)) process.loadEnvFile(envFile);

const { launchIssues } = await import('../server/settings.js');
const issues = launchIssues();
const blocking = issues.filter((i) => i.blocking);

if (issues.length === 0) {
  console.log('Viskas sutvarkyta: galima priimti užsakymus.');
} else {
  for (const i of issues) console.log(`${i.blocking ? 'BŪTINA ' : 'patarimas'}  ${i.text}`);
  console.log(`\nIš viso: ${blocking.length} būtinų, ${issues.length - blocking.length} patarimų.`);
}
process.exit(blocking.length > 0 ? 1 : 0);
