// ============================================================
// Src/Config/Config.js — Central settings loaded from .env
// ============================================================

import 'dotenv/config';

// ── Env helpers ──────────────────────────────────────────────────────────────
const bool = (key, fallback) =>
  process.env[key] !== undefined
    ? process.env[key].trim().toLowerCase() === 'true'
    : fallback;

const int = (key, fallback) =>
  process.env[key] ? parseInt(process.env[key], 10) : fallback;

const str = (key, fallback) =>
  process.env[key]?.trim() || fallback;

// ── Resolve flags ─────────────────────────────────────────────────────────────
const testMode    = bool('TEST_MODE',    false);
const openBrowser = bool('OPEN_BROWSER', true);
const fullCount   = int('RESULT_COUNT',  30);

// ── Config object ─────────────────────────────────────────────────────────────
const Config = {

  // Search
  searchQuery: str('SEARCH_QUERY', 'Restaurant'),
  searchArea:  str('SEARCH_AREA',  'Paris'),

  // When TEST_MODE=true only 3 results are scraped
  targetCount: testMode ? 3 : fullCount,

  // Flags
  testMode,
  openBrowser,

  // Output
  outputDir:  'Output',
  outputFile: 'Leadlist.csv',

  // Browser
  browser: {
    headless: !openBrowser,
    viewport:   { width: 1366, height: 768 },
    userAgent:
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
      '(KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36',
    locale:     'en-US',
    timezoneId: 'Europe/Paris',
  },

  // Human-like delay ranges (ms)
  delays: {
    betweenKeystrokes: { min: 80,   max: 200  },
    afterSearch:       { min: 2000, max: 4000 },
    betweenScrolls:    { min: 800,  max: 2500 },
    afterResultClick:  { min: 1500, max: 3500 },
    betweenLeads:      { min: 500,  max: 1500 },
    pageLoad:          { min: 2000, max: 5000 },
  },
};

export default Config;
