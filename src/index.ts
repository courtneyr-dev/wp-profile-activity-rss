import { writeFileSync } from 'node:fs';
import { fetchProfileHTML } from './fetch.js';
import { parseActivityItems } from './parse.js';
import { buildRssFeed } from './rss.js';

export interface RunOptions {
  user: string;
  baseUrl: string;
  limit: number;
  cacheDir: string;
  ttlMinutes: number;
  out?: string;
  verbose: boolean;
}

/**
 * Orchestrates the full pipeline: fetch -> parse -> generate RSS -> output.
 */
export async function run(opts: RunOptions): Promise<void> {
  const profileUrl = `${opts.baseUrl.replace(/\/+$/, '')}/${opts.user}/`;

  if (opts.verbose) {
    console.error(`[run] profile URL: ${profileUrl}`);
    console.error(`[run] limit: ${opts.limit}, cache TTL: ${opts.ttlMinutes}m`);
  }

  const html = await fetchProfileHTML(profileUrl, {
    cacheDir: opts.cacheDir,
    ttlMinutes: opts.ttlMinutes,
    verbose: opts.verbose,
  });

  const { items, selectorUsed } = parseActivityItems(html, {
    profileUrl,
    limit: opts.limit,
    verbose: opts.verbose,
  });

  if (opts.verbose) {
    console.error(`[run] parsed ${items.length} items using "${selectorUsed}"`);
  }

  if (items.length === 0) {
    console.error(
      'Warning: no activity items found. The user may have no public activity, ' +
        'or the page markup may have changed.',
    );
  }

  const rss = buildRssFeed(items, { user: opts.user, profileUrl });

  if (opts.out) {
    writeFileSync(opts.out, rss, 'utf-8');
    if (opts.verbose) console.error(`[run] wrote ${opts.out}`);
    else console.error(`Wrote RSS feed to ${opts.out}`);
  } else {
    process.stdout.write(rss);
  }
}
