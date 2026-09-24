const { chromium } = require('playwright');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', (e) => errors.push('PAGEERROR: ' + e.message));
  page.on('console', (msg) => { if (msg.type() === 'error') errors.push('CONSOLE: ' + msg.text()); });

  await page.goto('http://localhost:8934/', { waitUntil: 'networkidle' });
  await page.waitForTimeout(500);

  // Dismiss first-run
  const skip = await page.$('text=Skip Introduction');
  if (skip) await skip.click();
  await page.waitForTimeout(200);

  // Start new analysis
  await page.click('text=Start New Analysis');
  await page.waitForTimeout(200);
  await page.fill('input[placeholder="e.g. TEST-001"]', 'TEST-001');
  await page.fill('input[placeholder="e.g. CF8M Duplex Stainless Steel"]', 'Duplex SS');
  await page.click('text=Continue to Image Upload');
  await page.waitForTimeout(300);
  await page.click('text=Continue to Image Upload');
  await page.waitForTimeout(300);

  // Generate a synthetic test image with canvas in-page and upload via file chooser is tricky;
  // instead we set the input files using a generated PNG buffer via Node.
  const sharpBuf = await page.evaluate(async () => {
    const canvas = document.createElement('canvas');
    canvas.width = 400; canvas.height = 300;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#202020';
    ctx.fillRect(0,0,400,300);
    for (let i=0;i<40;i++) {
      ctx.beginPath();
      ctx.fillStyle = '#dddddd';
      ctx.arc(Math.random()*400, Math.random()*300, 5+Math.random()*15, 0, Math.PI*2);
      ctx.fill();
    }
    return canvas.toDataURL('image/png');
  });
  const base64 = sharpBuf.split(',')[1];
  const buffer = Buffer.from(base64, 'base64');
  const fs = require('fs');
  fs.writeFileSync('/tmp/test-image.png', buffer);

  const fileInput = await page.$('input[type=file]');
  await fileInput.setInputFiles('/tmp/test-image.png');
  await page.waitForTimeout(800);

  await page.click('text=Continue to Quality Check');
  await page.waitForTimeout(1000);

  const failBtn = await page.$('text=Acknowledge & Override');
  if (failBtn) {
    await page.fill('textarea', 'synthetic test image override');
    await page.click('text=Acknowledge & Override');
    await page.waitForTimeout(200);
  }
  await page.click('text=Continue to Grid Setup');
  await page.waitForTimeout(300);
  await page.click('text=Use 100-point grid anyway');
  await page.click('text=Confirm Grid & Continue');
  await page.waitForTimeout(300);
  await page.click('text=Continue to Segmentation');
  await page.waitForTimeout(500);
  await page.click('text=Continue to Point Counting');
  await page.waitForTimeout(1500);
  await page.click('text=Continue to Field Review');
  await page.waitForTimeout(500);
  await page.click('text=Save Field & View Results');
  await page.waitForTimeout(1000);

  console.log('RESULT PAGE CONTENT SNIPPET:');
  const bodyText = await page.textContent('body');
  console.log(bodyText.includes('Ferrite Volume Fraction') ? 'FOUND RESULT HEADER: OK' : 'MISSING RESULT HEADER');

  console.log('ERRORS COLLECTED:', errors.length);
  errors.forEach(e => console.log(e));

  await page.screenshot({ path: '/tmp/result.png', fullPage: true });
  await browser.close();
})();
