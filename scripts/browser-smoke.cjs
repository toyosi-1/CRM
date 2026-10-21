const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
    args: ['--no-sandbox'],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push(err.message));
  page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

  async function demoLoginAs(roleLabel) {
    await page.goto('http://localhost:5173/login', { waitUntil: 'domcontentloaded' });
    await page.evaluate(() => {
      const demoTab = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.trim() === 'Demo Access');
      if (demoTab) demoTab.click();
    });
    await new Promise(resolve => setTimeout(resolve, 200));
    await page.evaluate(label => {
      const btn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.toLowerCase().includes(label.toLowerCase()));
      if (btn) btn.click();
    }, roleLabel);
    await page.waitForFunction(() => !window.location.pathname.includes('/login'), { timeout: 3000 });
  }

  async function clickNav(label) {
    const pathMap = { 'Facility Info': '/fm/facility', 'Facilities': '/admin/facilities', 'Onboarding': '/procurement/vendor-onboarding', 'Checklist Builder': '/supervisor/checklist-builder', 'Job Completion': '/technician/jobs' };
    await page.evaluate(text => {
      const link = Array.from(document.querySelectorAll('a, button')).find(el => el.textContent?.toLowerCase().includes(text.toLowerCase()));
      if (link) link.click();
    }, label);
    await new Promise(resolve => setTimeout(resolve, 600));
    const current = await page.evaluate(() => window.location.pathname);
    if (current === pathMap[label]) return;
    // fallback: click by href
    const fallback = await page.$eval(`a[href="${pathMap[label]}"]`, el => { el.click(); return true; }).catch(() => false);
    if (fallback) await new Promise(resolve => setTimeout(resolve, 600));
  }

  const checks = [];

  await demoLoginAs('Facility Manager');
  await clickNav('Facility Info');
  const fmText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  checks.push({ name: 'FM facility info', ok: fmText.includes('my facility') });

  await demoLoginAs('Admin');
  await clickNav('Facilities');
  const adminText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  checks.push({ name: 'Admin facilities', ok: adminText.includes('facility settings') });

  await demoLoginAs('Procurement');
  await clickNav('Onboarding');
  const procText = (await page.evaluate(() => document.body.innerText)).toLowerCase();
  checks.push({ name: 'Vendor onboarding', ok: procText.includes('vendor onboarding') });

  await demoLoginAs('Supervisor');
  await clickNav('Checklist Builder');
  checks.push({ name: 'Checklist builder', ok: (await page.evaluate(() => document.body.innerText)).toLowerCase().includes('checklist builder') });

  await demoLoginAs('Technician');
  await clickNav('Job Completion');
  checks.push({ name: 'Technician job completion', ok: (await page.evaluate(() => document.body.innerText)).includes('Job Completion Form') });

  checks.forEach(c => console.log(`${c.ok ? '✓' : '✗'} ${c.name}`));
  console.log('Console/page errors:', errors.length ? errors : 'none');
  await browser.close();
})();
