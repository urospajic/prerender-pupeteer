const puppeteer = require('puppeteer');
const express = require('express');
const app = express();
const waitTime = 5000;
const cacheTime = 300000;
const redis = require('redis');
const client = redis.createClient();
let redisEnabled = false;

client.on('connect', function () {
    console.log('Redis client connected');
    redisEnabled = true;
});

client.on('error', function (err) {
    console.log('Redis client - Something went wrong ' + err);
});

// client.set('my test key', 'my test value', redis.print);
// client.get('my test key', function (error, result) {
//     if (error) {
//         console.log(error);
//         throw error;
//     }
//     console.log('GET result ->' + result);
// });

app.get('/prerender', async (req, res, next) => {
    try {
        const html = await ssr(req.query.path);
        res.set('Server-Timing', `Prerender;dur=${waitTime};desc="Headless render time (ms)"`);
        return res.status(200).send(html);
    } catch (err) {
        return res.status(500);
    }
});

app.listen(8888, () => console.log('Server started. Press Ctrl+C to quit'));

async function ssr(url) {
    console.log(`Accessing page ${url}`);
    if (redisEnabled) {
        const cachedPage = await loadFromRedis(url);
        if (cachedPage) {
            console.log(`Page ${url} found in cache`);
            return cachedPage;
        }
    }
    console.log(`Page ${url} not found in cache, rendering`);
    const browser = await puppeteer.launch({ headless: true });
    const page = await browser.newPage();
    await page.goto(url);
    await page.waitFor(waitTime);
    const html = await page.content();
    await browser.close();
    if (redisEnabled) {
        console.log(`Page ${url} storing in cache`);
        await saveToRedis(url, html);
    }
    return html;
}

async function loadFromRedis(url) {
    return new Promise((resolve, reject) => {
        client.get(url, function (error, result) {
            if (error) {
                return resolve(null);
            }
            const data = JSON.parse(result);
            if (!data || !data.timestamp || !data.content) {
                return resolve(null);
            }
            const timestampNow = Date.now();
            const cacheAge = timestampNow - data.timestamp;
            if (cacheAge > cacheTime) {
                return resolve(null);
            }
            return resolve(data.content);
        });
    });
}

async function saveToRedis(url, content) {
    return new Promise((resolve, reject) => {
        const data = {
            timestamp: Date.now(),
            content: content
        };
        const sd = JSON.stringify(data);
        client.set(url, sd, () => {
            resolve(true);
        });
    });
}