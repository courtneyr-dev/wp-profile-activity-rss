#!/usr/bin/env node

/**
 * Generates RSS feeds for all users listed in feeds.config.json.
 * Used by the GitHub Actions workflow to produce feeds for GitHub Pages.
 *
 * Usage: node dist/generate-all.js [--out-dir feeds] [--verbose]
 */

import { readFileSync, mkdirSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { z } from 'zod';
import { run } from './index.js';

const ConfigSchema = z.object({
  users: z.array(z.string().min(1)).min(1),
  limit: z.number().int().min(1).max(200).default(30),
});

const args = process.argv.slice(2);
const verbose = args.includes('--verbose');
const outDirIdx = args.indexOf('--out-dir');
const outDir = outDirIdx !== -1 && args[outDirIdx + 1] ? args[outDirIdx + 1] : 'feeds';

const configPath = resolve('feeds.config.json');
let rawConfig: unknown;
try {
  rawConfig = JSON.parse(readFileSync(configPath, 'utf-8'));
} catch {
  console.error(`Could not read ${configPath}`);
  process.exit(1);
}

const config = ConfigSchema.safeParse(rawConfig);
if (!config.success) {
  console.error('Invalid feeds.config.json:');
  for (const issue of config.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

mkdirSync(outDir, { recursive: true });

async function generateAll() {
  const { users, limit } = config.data!;
  let failed = 0;

  for (const user of users) {
    const outPath = join(outDir, `${user}.xml`);
    console.error(`Generating feed for ${user} -> ${outPath}`);

    try {
      await run({
        user,
        baseUrl: 'https://profiles.wordpress.org',
        limit,
        cacheDir: '.cache/wp-profile-rss',
        ttlMinutes: 60,
        out: outPath,
        verbose,
      });
    } catch (err) {
      console.error(`  FAILED: ${(err as Error).message}`);
      failed++;
    }
  }

  if (failed > 0) {
    console.error(`\n${failed}/${users.length} feeds failed.`);
    process.exit(1);
  }

  console.error(`\nAll ${users.length} feeds generated in ${outDir}/`);
}

generateAll();
