// ============================================================
// Src/Services/WebEnricher.js — Website deep-dive using Cheerio
// ============================================================

import * as cheerio  from 'cheerio';
import Config        from '../Config/Config.js';
import { sleep, randomDelay } from '../Utils/Delay.js';
import { normalizeUrl } from '../Utils/Formatter.js';

const EMPTY = {
  Emailaddress:  '',
  Instagramlink: '',
  Facebooklink:  '',
  Linkedinlink:  '',
};

/**
 * Scrapes a website for email and social media links.
 *
 * @param {import('playwright').BrowserContext} context
 * @param {string} websiteUrl
 * @returns {Promise<{ Emailaddress, Instagramlink, Facebooklink, Linkedinlink }>}
 */
export async function enrichWebsite(context, websiteUrl) {
  if (!websiteUrl) return EMPTY;

  const url = normalizeUrl(websiteUrl);
  let page;

  try {
    page = await context.newPage();

    // Block heavy assets — speeds up enrichment and reduces fingerprint
    await page.route('**/*', (route) => {
      const type = route.request().resourceType();
      if (['image', 'media', 'font', 'stylesheet'].includes(type)) route.abort();
      else route.continue();
    });

    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await sleep(randomDelay(Config.delays.pageLoad));

    const html = await page.content();
    return parseContacts(html);

  } catch (err) {
    console.warn(`  ⚠️  Enrichment failed for ${url}: ${err.message}`);
    return EMPTY;
  } finally {
    if (page && !page.isClosed()) await page.close();
  }
}

// ── HTML parsing ──────────────────────────────────────────────────────────────

function parseContacts(html) {
  const $ = cheerio.load(html);

  let Emailaddress  = '';
  let Instagramlink = '';
  let Facebooklink  = '';
  let Linkedinlink  = '';

  // Email: prefer mailto: links, fallback to regex scan in body text
  // Regex requires a real TLD (2-6 alpha chars) and explicitly rejects
  // image/file extensions that can accidentally match (e.g. logo@2x.jpg)
  const EMAIL_REGEX = /[\w.+-]+@[\w-]+\.[a-zA-Z]{2,6}(?!\.(jpg|jpeg|png|gif|svg|webp|pdf|ico))/i;
  const INVALID_EXT = /\.(jpg|jpeg|png|gif|svg|webp|pdf|ico|bmp|tiff)$/i;

  $('a[href^="mailto:"]').each((_, el) => {
    if (Emailaddress) return;
    const raw = $(el).attr('href').replace('mailto:', '').split('?')[0].trim();
    if (raw.includes('@') && !INVALID_EXT.test(raw)) Emailaddress = raw;
  });

  if (!Emailaddress) {
    const match = $('body').text().match(EMAIL_REGEX);
    if (match && !INVALID_EXT.test(match[0])) Emailaddress = match[0];
  }

  // Social links: scan all anchors
  $('a[href]').each((_, el) => {
    const href = ($(el).attr('href') || '').toLowerCase();
    if (!Instagramlink && href.includes('instagram.com')) Instagramlink = normalizeUrl($(el).attr('href'));
    if (!Facebooklink  && href.includes('facebook.com'))  Facebooklink  = normalizeUrl($(el).attr('href'));
    if (!Linkedinlink  && href.includes('linkedin.com'))  Linkedinlink  = normalizeUrl($(el).attr('href'));
  });

  return { Emailaddress, Instagramlink, Facebooklink, Linkedinlink };
}
