// ============================================================
// Src/Database/CsvWriter.js — Structured CSV export
// ============================================================

import { createObjectCsvWriter } from 'csv-writer';
import path                      from 'path';
import fs                        from 'fs';
import Config                    from '../Config/Config.js';

/**
 * Writes an array of lead objects to Leadlist.csv inside the Output folder.
 * Column headers follow Mouloudia casing (first letter up, rest lower).
 *
 * @param {Array<Object>} leads
 */
export async function writeCsv(leads) {
  // Ensure Output directory exists
  const outputDir = path.resolve(Config.outputDir);
  if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

  const outputPath = path.join(outputDir, Config.outputFile);

  const writer = createObjectCsvWriter({
    path: outputPath,
    header: [
      { id: 'Businessname',    title: 'Businessname'    },
      { id: 'Phonenumber',     title: 'Phonenumber'     },
      { id: 'Website',         title: 'Website'         },
      { id: 'Googlemapsscore', title: 'Googlemapsscore' },
      { id: 'Emailaddress',    title: 'Emailaddress'    },
      { id: 'Instagramlink',   title: 'Instagramlink'   },
      { id: 'Facebooklink',    title: 'Facebooklink'    },
      { id: 'Linkedinlink',    title: 'Linkedinlink'    },
    ],
  });

  await writer.writeRecords(leads);

  console.log(`\n💾  Saved ${leads.length} leads → ${outputPath}\n`);
}
