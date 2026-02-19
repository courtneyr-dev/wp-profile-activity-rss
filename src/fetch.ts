import { readCache, writeCache, type CacheOptions } from './cache.js';

const USER_AGENT =
  'wp-profile-activity-rss/1.0 (+https://github.com/wp-profile-activity-rss; polite bot)';

export interface FetchOptions extends CacheOptions {
  verbose: boolean;
}

/**
 * Fetches the profile page HTML, using cache when available.
 * Sends a polite User-Agent and requests compressed responses.
 */
export async function fetchProfileHTML(url: string, opts: FetchOptions): Promise<string> {
  const cached = readCache(url, opts);
  if (cached) return cached;

  if (opts.verbose) console.error(`[fetch] GET ${url}`);

  const res = await fetch(url, {
    headers: {
      'User-Agent': USER_AGENT,
      Accept: 'text/html',
      'Accept-Encoding': 'gzip, deflate, br',
    },
  });

  if (!res.ok) {
    throw new Error(`HTTP ${res.status} fetching ${url}: ${res.statusText}`);
  }

  const html = await res.text();

  if (opts.verbose) {
    console.error(`[fetch] ${res.status} — ${html.length} bytes`);
  }

  writeCache(url, html, opts);
  return html;
}
