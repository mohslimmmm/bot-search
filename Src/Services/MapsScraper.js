// ============================================================
// Src/Services/MapsScraper.js — Google Maps search & extraction
// ============================================================

import Config            from '../Config/Config.js';
import { sleep, randomDelay, randomSleep } from '../Utils/Delay.js';
import { clean }         from '../Utils/Formatter.js';

// ── Selectors ─────────────────────────────────────────────────────────────────
const SEL = {
  // input[name="q"] is the stable selector — the id (ucc-1) is dynamic
  searchBox:   'input[name="q"]',
  searchBtn:   'button[aria-label="Rechercher"], button[aria-label="Search"]',
  feed:        'div[role="feed"]',
  card:        'div[role="feed"] .Nv2PK',
  endOfList:   '[jsaction*="pane.resultSection.endOfResults"]',

  // Detail panel
  name:        'h1.DUwDvf, h1[class*="fontHeadlineLarge"]',
  score:       'div.F7nice span[aria-hidden="true"]',
  phone:       '[data-item-id^="phone"] .Io6YTe, button[data-tooltip="Copy phone number"] .Io6YTe',
  website:     'a[data-tooltip="Open website"], a[data-item-id^="authority"]',
};


// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Types text into a selector character by character with random delays.
 * This is the core "human typing" behaviour the bot uses on the search bar.
 */
async function humanType(page, selector, text) {
  await page.click(selector);
  await sleep(300);

  for (const char of text) {
    await page.keyboard.type(char);                          // type one character
    await sleep(randomDelay(Config.delays.betweenKeystrokes)); // wait between chars
  }
}

// ── Scroll Logic ──────────────────────────────────────────────────────────────

async function scrollUntilLoaded(page, targetCount) {
  const MAX_SCROLLS = 60;
  const STUCK_LIMIT = 6;

  console.log(`🔄  Scrolling sidebar — target: ${targetCount} results…`);
  console.log('─'.repeat(50));

  let prevCount  = 0;
  let stuckCount = 0;

  for (let i = 1; i <= MAX_SCROLLS; i++) {
    // Count visible result cards
    const count = await page.$$eval(
      SEL.card,
      (els) => els.filter((el) => el.innerText?.trim().length > 0).length
    );

    console.log(`   [${String(i).padStart(2, '0')}/${MAX_SCROLLS}] Cards: ${count}/${targetCount}`);

    if (count >= targetCount) {
      console.log(`✅  Target reached.\n`);
      break;
    }

    // End-of-list sentinel
    const ended = await page.$(SEL.endOfList)
      .then((el) => el?.isVisible().catch(() => false) ?? false);
    if (ended) {
      console.warn(`⚠️  End of results at ${count} cards.\n`);
      break;
    }

    // Stuck detection
    if (count === prevCount) {
      stuckCount++;
      if (stuckCount >= STUCK_LIMIT) {
        console.warn(`⚠️  No new cards after ${STUCK_LIMIT} scrolls — proceeding with ${count}.\n`);
        break;
      }
    } else {
      stuckCount = 0;
    }

    prevCount = count;

    // Scroll the feed element directly — progressive depth
    const amount = 600 + i * 40;
    await page.evaluate(
      ({ sel, amt }) => { document.querySelector(sel)?.scrollBy(0, amt); },
      { sel: SEL.feed, amt: amount }
    );

    await randomSleep(Config.delays.betweenScrolls);
  }

  const final = await page.$$eval(SEL.card, (els) => els.length);
  console.log(`🏷️  Final card count: ${final}\n`);
}

// ── Detail panel extraction ────────────────────────────────────────────────────

async function extractFromPanel(page) {
  await randomSleep(Config.delays.afterResultClick);

  const get = async (sel) =>
    page.locator(sel).first().textContent({ timeout: 5000 })
      .then((t) => clean(t))
      .catch(() => '');

  return {
    Businessname:    await get(SEL.name),
    Googlemapsscore: await get(SEL.score),
    Phonenumber:     await get(SEL.phone),
    Website: await page.locator(SEL.website).first()
      .getAttribute('href', { timeout: 5000 }).catch(() => '') ?? '',
  };
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Navigates to Google Maps, types the search query letter by letter,
 * scrolls to load enough results, then extracts lead data from each card.
 *
 * @param {import('playwright').Page} page
 * @returns {Promise<Array>} Array of raw lead objects
 */
export async function scrapeMaps(page) {
  const { searchQuery, searchArea, targetCount } = Config;
  const searchTerm = `${searchQuery} ${searchArea}`;

  console.log(`🗺️  Opening Google Maps…`);
  await page.goto('https://www.google.com/maps', {
    waitUntil: 'domcontentloaded',
    timeout: 60000,
  });

  // ── Detect and handle Google's consent wall ──────────────────────────────
  // From some regions (Algeria, etc.) Google does a FULL-PAGE redirect to
  // consent.google.com — NOT a popup modal. We must check the URL to know
  // which page we actually landed on.
  await sleep(2000); // let any redirect settle
  const currentUrl = page.url();
  console.log(`📍  Landed on: ${currentUrl}`);

  if (currentUrl.includes('consent.google.com')) {
    console.log('🍪  Full-page consent wall detected — accepting…');

    try {
      // The "Accept all" button on consent.google.com matches these patterns
      const acceptBtn = page.locator('button').filter({ hasText: /accept|accepter|tout/i });
      await acceptBtn.first().click({ timeout: 10000 });

      // Wait for the redirect back to Maps
      await page.waitForURL('**/maps**', { timeout: 20000 });
      console.log('✅  Consent accepted — redirected back to Maps.');
    } catch (err) {
      console.error('❌  Could not click consent button:', err.message);
      throw err;
    }

  } else if (currentUrl.includes('google.com/maps')) {
    // Already on Maps — check for a modal consent overlay (rare)
    const modalBtn = await page.locator('button').filter({ hasText: /accept|accepter/i })
      .first().isVisible({ timeout: 3000 }).catch(() => false);

    if (modalBtn) {
      console.log('🍪  Modal consent overlay detected — accepting…');
      await page.locator('button').filter({ hasText: /accept|accepter/i }).first().click();
    } else {
      console.log('✅  On Maps directly — no consent needed.');
    }
  }

  // ── Wait for the search box to be ready ──────────────────────────────────
  console.log('⏳  Waiting for search box…');
  await page.waitForSelector(SEL.searchBox, { timeout: 30000 });
  console.log('✅  Search box found.');

  await randomSleep(Config.delays.afterSearch);



  // ── Type the search query letter by letter ───────────────────────────────────
  console.log(`⌨️  Typing: "${searchTerm}"`);
  await humanType(page, SEL.searchBox, searchTerm);

  // Small pause then press Enter — mimics real user behaviour
  await sleep(400);
  await page.keyboard.press('Enter');
  console.log(`🔎  Search submitted — waiting for results…`);

  // ── Wait for the results feed ─────────────────────────────────────────────
  await page.waitForSelector(SEL.feed, { timeout: 30000 });
  await randomSleep(Config.delays.afterSearch);

  // ── Scroll until we have enough cards ─────────────────────────────────────
  const fetchCount = Config.onlyWithoutWebsite ? targetCount * 5 : targetCount;
  await scrollUntilLoaded(page, fetchCount);

  // ── Collect ALL card URLs in one shot BEFORE clicking anything ───────────
  // Google Maps lazily removes off-screen card DOM nodes as you scroll.
  // Re-querying page.$$(SEL.card) inside the loop causes index drift and
  // repeated clicks on the same businesses.
  // Solution: read all hrefs in a single $$eval, then navigate to each URL.
  const cardUrls = await page.$$eval(
    `${SEL.card} a[href*="/maps/place/"]`,
    (anchors) => [...new Set(anchors.map((a) => a.href))]  // dedupe URLs too
  );

  console.log(`🗂️  Collected ${cardUrls.length} unique card URLs — starting extraction…\n`);

  // ── Navigate to each card URL directly ───────────────────────────────────
  const leads = [];

  for (let i = 0; i < cardUrls.length; i++) {
    if (leads.length >= targetCount) break;

    const url = cardUrls[i];
    console.log(`📍  [${i + 1}/${cardUrls.length}] Navigating to card…`);

    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
      const lead = await extractFromPanel(page);

      if (Config.onlyWithoutWebsite && lead.Website && lead.Website.trim() !== '') {
        console.log(`   ⏭️  Skipping ${lead.Businessname || '(no name)'} (has website)`);
        continue;
      }

      leads.push(lead);

      console.log(`   ✔ ${lead.Businessname || '(no name)'} | ☎ ${lead.Phonenumber || '—'} | ⭐ ${lead.Googlemapsscore || '—'} | 🎯 Leads: ${leads.length}/${targetCount}`);
    } catch (err) {
      console.warn(`   ⚠️  Skipping card ${i + 1}: ${err.message}`);
    }

    await randomSleep(Config.delays.betweenLeads);
  }

  console.log(`\n🏁  Maps scrape complete. ${leads.length} leads collected.\n`);
  return leads;
}
