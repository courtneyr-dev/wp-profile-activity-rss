#!/usr/bin/env node

import { Command } from 'commander';
import { z } from 'zod';
import { run } from './index.js';

const OptionsSchema = z.object({
  user: z.string().min(1, 'Username is required'),
  baseUrl: z.string().url(),
  limit: z.coerce.number().int().min(1).max(200),
  cacheDir: z.string().min(1),
  ttlMinutes: z.coerce.number().int().min(0),
  out: z.string().optional(),
  verbose: z.boolean(),
});

const program = new Command()
  .name('wp-profile-activity-rss')
  .description('Generate an RSS 2.0 feed from a WordPress.org profile activity stream')
  .requiredOption('--user <username>', 'WordPress.org username')
  .option('--base-url <url>', 'Base URL for profiles', 'https://profiles.wordpress.org')
  .option('--limit <n>', 'Max items in feed', '30')
  .option('--cache-dir <path>', 'Cache directory', '.cache/wp-profile-rss')
  .option('--ttl-minutes <n>', 'Cache TTL in minutes', '60')
  .option('--out <path>', 'Write RSS to file instead of stdout')
  .option('--verbose', 'Print debug info to stderr', false);

program.parse();

const raw = program.opts();

const parsed = OptionsSchema.safeParse(raw);

if (!parsed.success) {
  console.error('Invalid options:');
  for (const issue of parsed.error.issues) {
    console.error(`  ${issue.path.join('.')}: ${issue.message}`);
  }
  process.exit(1);
}

run(parsed.data).catch((err: Error) => {
  console.error(`Error: ${err.message}`);
  if (parsed.data.verbose && err.stack) {
    console.error(err.stack);
  }
  process.exit(1);
});
