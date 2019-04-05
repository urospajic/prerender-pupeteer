const puppeteer = require('puppeteer');
const express = require('express');

const app = express();
const waitTime = 5000;

app.get('/prerender', async (req, res, next) => {
    try {
        const html = await ssr(req.query.path);
        res.set('Server-Timing', `Prerender;dur=${waitTime};desc="Headless render time (ms)"`);
        return res.status(200).send(html);
    } catch (err) {
        return res.status(500);
    }
});

app.listen(8080, () => console.log('Server started. Press Ctrl+C to quit'));

async function ssr(url) {
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitFor(waitTime);
    const html = await page.content();
    await browser.close();
    return html;
}