// ============================================================
// Src/Main.js — Orchestrator
// ============================================================

import { launchBrowser }  from './Core/Browser.js';
import { scrapeMaps }     from './Services/MapsScraper.js';
import { enrichWebsite }  from './Services/WebEnricher.js';
import { writeCsv }       from './Database/CsvWriter.js';
import Config             from './Config/Config.js';

async function main() {
  console.log('╔══════════════════════════════════════════════╗');
  console.log('║   Google Maps Lead Generation Bot            ║');
  console.log('╚══════════════════════════════════════════════╝\n');
  console.log(`🔍  Query  : ${Config.searchQuery}`);
  console.log(`📍  Area   : ${Config.searchArea}`);
  console.log(`🎯  Target : ${Config.targetCount} leads`);
  console.log(`👁️  Browser: ${Config.openBrowser ? 'Visible' : 'Headless'}`);
  console.log(`🧪  Test   : ${Config.testMode ? 'ON (3 results)' : 'OFF'}\n`);

  let browser;

  try {
    // ── 1. Launch browser ──────────────────────────────────────────────────
    const { browser: b, context, page } = await launchBrowser();
    browser = b;

    // ── 2. Scrape Google Maps ──────────────────────────────────────────────
    const rawLeads = await scrapeMaps(page);

    // ── 3. Enrich each lead with website data ──────────────────────────────
    console.log('🌐  Starting website enrichment…\n');
    const enrichedLeads = [];

    for (let i = 0; i < rawLeads.length; i++) {
      const lead = rawLeads[i];
      console.log(`🔗  [${i + 1}/${rawLeads.length}] ${lead.Website || '(no website)'}`);

      const extra = await enrichWebsite(context, lead.Website);
      enrichedLeads.push({ ...lead, ...extra });

      if (extra.Emailaddress)  console.log(`   📧 ${extra.Emailaddress}`);
      if (extra.Instagramlink) console.log(`   📸 ${extra.Instagramlink}`);
      if (extra.Facebooklink)  console.log(`   👤 ${extra.Facebooklink}`);
      if (extra.Linkedinlink)  console.log(`   💼 ${extra.Linkedinlink}`);
    }

    // ── 4. Deduplicate by Businessname + Phonenumber ──────────────────────
    // Some cards get clicked twice during scroll, producing duplicate rows.
    // We keep only the first occurrence of each unique business.
    const seen = new Set();
    const uniqueLeads = enrichedLeads.filter((lead) => {
      const key = `${lead.Businessname}|${lead.Phonenumber}`.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });

    const removed = enrichedLeads.length - uniqueLeads.length;
    if (removed > 0) console.log(`🧹  Removed ${removed} duplicate(s) — ${uniqueLeads.length} unique leads.\n`);

    // ── 5. Save to CSV (written ONCE — only after everything is done) ───────
    await writeCsv(uniqueLeads);

    console.log(`✅  Done! Results → Output/${Config.outputFile}`);
    console.log('═══════════════════════════════════════════════\n');

  } catch (err) {
    console.error('❌  Fatal error:', err.message);
    console.error(err.stack);
  } finally {
    if (browser) await browser.close();
  }
}

main();
