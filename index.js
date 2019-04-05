const puppeteer = require('puppeteer');
const express = require('express');

const app = express();

app.get('/prerender', async (req, res, next) => {
  const html = await ssr(req.query.path);
  // Add Server-Timing! See https://w3c.github.io/server-timing/.
  res.set('Server-Timing', `Prerender;dur=888;desc="Headless render time (ms)"`);
  return res.status(200).send(html); // Serve prerendered page as response.
});

app.listen(8080, () => console.log('Server started. Press Ctrl+C to quit'));

async function ssr(url) {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  // await page.goto(url, {waitUntil: 'networkidle0'});
  await page.goto(url);
  await page.waitFor(5000);
  const html = await page.content(); // serialized HTML of page DOM.
  await browser.close();
  return html;
}