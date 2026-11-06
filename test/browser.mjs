// Shared browser launcher for the journey tests. Uses playwright-core from test/node_modules
// (run `npm install` in test/ once) and an installed Chrome; set CHROME to override the path.
import fs from 'node:fs';
import { createRequire } from 'node:module';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright-core');
const candidates = [process.env.CHROME, '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'].filter(Boolean);
const executablePath = candidates.find(p => fs.existsSync(p));
export function launch() { return chromium.launch({ executablePath, args: ['--no-sandbox'] }); }
export { chromium };
