/**
 * FacilityOps CRM — Screenshot Capture Script
 * Exports full-page PNGs of all key screens for proposal/documentation use.
 * Usage: node scripts/capture-screenshots.cjs
 * Output: screenshots/ directory (1440×900, full-page)
 */

const puppeteer = require('puppeteer');
const path = require('path');
const fs = require('fs');

const BASE_URL = 'http://localhost:5173';
const OUT_DIR = path.join(__dirname, '..', 'screenshots');

// Role button index on the login page (0-based, matches DOM order)
const ROLE_INDEX = {
  facility_manager: 0,
  procurement: 1,
  supervisor: 2,
  finance: 3,
  admin: 4,
};

const SCREENS = [
  { name: '00_Login',                  url: '/login',                role: null },
  { name: '01_FM_Dashboard',           url: '/fm',                   role: 'facility_manager' },
  { name: '02_FM_Requests',            url: '/fm/requests',          role: 'facility_manager' },
  { name: '03_FM_Checklists',          url: '/fm/checklists',        role: 'facility_manager' },
  { name: '04_FM_Assets',              url: '/fm/assets',            role: 'facility_manager' },
  { name: '05_Procurement_Dashboard',  url: '/procurement',          role: 'procurement' },
  { name: '06_Procurement_Queue',      url: '/procurement/queue',    role: 'procurement' },
  { name: '07_Vendor_Database',        url: '/procurement/vendors',  role: 'procurement' },
  { name: '08_Supervisor_Dashboard',   url: '/supervisor',           role: 'supervisor' },
  { name: '09_Supervisor_Approvals',   url: '/supervisor/approvals', role: 'supervisor' },
  { name: '10_Finance_Dashboard',      url: '/finance',              role: 'finance' },
  { name: '11_Finance_Payments',       url: '/finance/payments',     role: 'finance' },
  { name: '12_Treasury_Ledger',        url: '/finance/treasury',     role: 'finance' },
  { name: '13_Admin_Analytics',        url: '/admin',                role: 'admin' },
  { name: '14_Admin_Requests',         url: '/admin/requests',       role: 'admin' },
  { name: '15_Admin_Sites',            url: '/admin/sites',          role: 'admin' },
  { name: '16_Admin_Audit',            url: '/admin/audit',          role: 'admin' },
  { name: '17_Admin_Reports',          url: '/admin/reports',        role: 'admin' },
];

const sleep = ms => new Promise(r => setTimeout(r, ms));

// Navigate within the SPA using history.pushState (no page reload = keeps Zustand state)
async function spaNavigate(page, path) {
  await page.evaluate((p) => {
    window.history.pushState({}, '', p);
    window.dispatchEvent(new PopStateEvent('popstate', { state: {} }));
  }, path);
  await sleep(800);
}

async function loginAs(page, role) {
  // Full page load to login — initialises the React app fresh
  await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
  await sleep(800);

  const idx = ROLE_INDEX[role];

  // Use JS click inside page context to avoid headless pointer issues
  await page.evaluate((i) => {
    const btns = document.querySelectorAll('button');
    if (btns[i]) btns[i].click();
  }, idx);

  // Wait for React Router to push to the role's dashboard URL
  let attempts = 0;
  while (attempts < 25) {
    await sleep(300);
    const url = page.url();
    if (!url.includes('/login')) break;
    attempts++;
  }

  if (page.url().includes('/login')) {
    throw new Error(`Login failed for role=${role} after ${attempts * 300}ms`);
  }
  await sleep(500);
}

(async () => {
  if (!fs.existsSync(OUT_DIR)) fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await puppeteer.launch({
    headless: 'new',
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
    defaultViewport: { width: 1440, height: 900 },
  });

  const page = await browser.newPage();
  let currentRole = null;

  for (const screen of SCREENS) {
    try {
      if (screen.role === null) {
        // Login page — unauthenticated capture
        await page.goto(BASE_URL + '/login', { waitUntil: 'networkidle0' });
        await sleep(500);
      } else {
        if (currentRole !== screen.role) {
          // Login triggers a full page load; only do it on role switch
          await loginAs(page, screen.role);
          currentRole = screen.role;
        }
        // For subsequent pages in the same role: use SPA navigation (no reload)
        const currentPath = new URL(page.url()).pathname;
        if (currentPath !== screen.url) {
          await spaNavigate(page, screen.url);
        }
        await sleep(500);
      }

      const outPath = path.join(OUT_DIR, screen.name + '.png');
      await page.screenshot({ path: outPath, fullPage: true });
      console.log(`✓  ${screen.name}  (${page.url()})`);
    } catch (err) {
      console.error(`✗  ${screen.name}: ${err.message}`);
    }
  }

  await browser.close();
  console.log(`\nDone — ${SCREENS.length} screenshots saved to:\n  ${OUT_DIR}`);
})();
