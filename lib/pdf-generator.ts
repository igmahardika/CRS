import puppeteer from 'puppeteer-core';
import fs from 'fs';
import { ReportData, generateReportHtml } from './pdf-template';

function findChromiumExecutable(): string {
  // 1. Explicit env var override
  if (process.env.PUPPETEER_EXECUTABLE_PATH && fs.existsSync(process.env.PUPPETEER_EXECUTABLE_PATH)) {
    return process.env.PUPPETEER_EXECUTABLE_PATH;
  }
  if (process.env.CHROME_PATH && fs.existsSync(process.env.CHROME_PATH)) {
    return process.env.CHROME_PATH;
  }

  // 2. Windows candidate paths
  const windowsCandidates = [
    'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
    'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
    'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
    process.env.LOCALAPPDATA ? `${process.env.LOCALAPPDATA}\\Google\\Chrome\\Application\\chrome.exe` : '',
  ].filter(Boolean);

  // 3. Linux / Unix candidate paths
  const linuxCandidates = [
    '/usr/bin/google-chrome-stable',
    '/usr/bin/google-chrome',
    '/usr/bin/chromium-browser',
    '/usr/bin/chromium',
    '/snap/bin/chromium',
  ];

  const allCandidates = [...windowsCandidates, ...linuxCandidates];
  for (const candidate of allCandidates) {
    if (candidate && fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error(
    'No Chromium/Chrome/Edge executable found on this system. Please install Google Chrome or set PUPPETEER_EXECUTABLE_PATH.'
  );
}

export async function generatePdfBuffer(data: ReportData): Promise<Buffer> {
  const executablePath = findChromiumExecutable();

  const browser = await puppeteer.launch({
    executablePath,
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-setuid-sandbox',
      '--disable-gpu',
      '--disable-dev-shm-usage',
      '--font-render-hinting=medium',
    ],
  });

  try {
    const page = await browser.newPage();
    
    // Set viewport to exact A4 pixel aspect ratio at 96 DPI (794 x 1123)
    await page.setViewport({
      width: 794,
      height: 1123,
      deviceScaleFactor: 2, // High DPI rendering
    });

    const htmlContent = generateReportHtml(data);
    await page.setContent(htmlContent, {
      waitUntil: 'domcontentloaded',
      timeout: 30000,
    });

    const pdfUint8Array = await page.pdf({
      format: 'A4',
      printBackground: true,
      preferCSSPageSize: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0,
      },
    });

    return Buffer.from(pdfUint8Array);
  } finally {
    await browser.close();
  }
}
