const express = require('express');
const puppeteer = require('puppeteer-core');
const cors = require('cors');
const genericPool = require('generic-pool');
const crypto = require('crypto');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const limiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});

app.use(limiter);

const cache = new Map();

const launchOptions = { 
    args: ['--no-sandbox', '--disable-setuid-sandbox']
};

if (process.env.RENDER) {
    launchOptions.executablePath = '/usr/bin/google-chrome';
}

const puppeteerFactory = {
  create: () => puppeteer.launch(launchOptions),
  destroy: (browser) => browser.close(),
};

const puppeteerPool = genericPool.createPool(puppeteerFactory, {
  max: 2,
  min: 1,
});

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.static('public'));

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'generator.html'));
});

app.get('/how-to', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'how-to.html'));
});

app.get('/changelog', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'changelog.html'));
});

app.post('/api/convert', async (req, res) => {
    const { 
        html: separateHtml, 
        css: separateCss, 
        combinedCode, 
        format, 
        transparent,
        jpegQuality
    } = req.body;
    
    const requestKeyObject = { separateHtml, css: separateCss, combinedCode, format, transparent, jpegQuality };
    const keyString = JSON.stringify(requestKeyObject);
    const cacheKey = crypto.createHash('sha256').update(keyString).digest('hex');

    if (cache.has(cacheKey)) {
        const cachedResult = cache.get(cacheKey);
        return res.type(cachedResult.contentType).send(cachedResult.buffer);
    }

    let html, css;

    if (combinedCode) {
        const styleRegex = /<style[^>]*>([\s\S]*?)<\/style>/i;
        const styleMatch = combinedCode.match(styleRegex);
        css = styleMatch ? styleMatch[1] : '';
        html = combinedCode.replace(styleRegex, '').trim();
    } else {
        html = separateHtml;
        css = separateCss;
    }

    if (!html && !css) {
        return res.status(400).json({ error: 'No code provided.' });
    }

    const browser = await puppeteerPool.acquire();
    try {
        const page = await browser.newPage();
        
        await page.setViewport({
            width: 1920,
            height: 3000
        });

        const fullHtml = `
            <!DOCTYPE html>
            <html>
            <head>
                <style>
                    html {
                        ${transparent ? 'background-color: transparent;' : ''}
                    }
                    body {
                        display: inline-block;
                        ${transparent ? 'background-color: transparent;' : ''}
                    }
                    ${css || ''}
                </style>
            </head>
            <body>
                ${html || ''}
            </body>
            </html>
        `;
        
        await page.setContent(fullHtml, { waitUntil: 'networkidle0', timeout: 30000 });

        const bodyElement = await page.$('body');
        const bodyBoundingBox = await bodyElement.boundingBox();

        if (!bodyBoundingBox || bodyBoundingBox.width === 0 || bodyBoundingBox.height === 0) {
            throw new Error('Could not determine content size. Is the content invisible?');
        }

        await page.setViewport({
            width: Math.ceil(bodyBoundingBox.width),
            height: Math.ceil(bodyBoundingBox.height)
        });

        let imageBuffer;
        let contentType;

        if (format === 'pdf') {
            contentType = 'application/pdf';
            imageBuffer = await page.pdf({
                width: `${Math.ceil(bodyBoundingBox.width)}px`,
                height: `${Math.ceil(bodyBoundingBox.height)}px`,
                printBackground: true,
                timeout: 30000
            });
        } else {
            const screenshotOptions = {
                omitBackground: transparent || false,
                type: format === 'jpeg' ? 'jpeg' : 'png',
                timeout: 30000
            };

            if (format === 'jpeg') {
                screenshotOptions.quality = Number(jpegQuality) || 90;
            }
            
            contentType = format === 'jpeg' ? 'image/jpeg' : 'image/png';
            imageBuffer = await page.screenshot(screenshotOptions);
        }

        cache.set(cacheKey, { buffer: imageBuffer, contentType: contentType });

        res.type(contentType).send(imageBuffer);

    } catch (error) {
        console.error('Conversion Error:', error);
        res.status(500).json({ error: 'Failed to convert HTML. Please check for infinite loops or syntax errors.' });
    } finally {
        if (browser) {
            await puppeteerPool.release(browser);
        }
    }
});

const server = app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

process.on('SIGINT', async () => {
  console.log('SIGINT signal received: closing HTTP server and Puppeteer pool');
  server.close(async () => {
    console.log('HTTP server closed');
    await puppeteerPool.drain();
    await puppeteerPool.clear();
    console.log('Puppeteer pool closed');
    process.exit(0);
  });
});
