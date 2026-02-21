// ============================================================
// Src/Core/Browser.js — Stealth Playwright browser factory
// ============================================================

import { chromium } from 'playwright-extra';
import StealthPlugin from 'puppeteer-extra-plugin-stealth';
import Config        from '../Config/Config.js';

chromium.use(StealthPlugin());

/**
 * Launches a stealth Chromium browser and returns { browser, context, page }.
 * All fingerprint-evasion settings are applied here in one place.
 *
 * @returns {Promise<{ browser, context, page }>}
 */
export async function launchBrowser() {
  const { headless, viewport, userAgent, locale, timezoneId } = Config.browser;

  const browser = await chromium.launch({ headless });

  const context = await browser.newContext({
    viewport,
    userAgent,
    locale,
    timezoneId,
    // Mask common automation signals
    javaScriptEnabled: true,
    permissions: [],
  });

  // Patch navigator.webdriver property for extra stealth
  await context.addInitScript(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined });
  });

  const page = await context.newPage();

  return { browser, context, page };
}
