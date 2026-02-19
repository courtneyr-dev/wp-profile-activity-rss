import { createHash } from 'node:crypto';
import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export interface CacheOptions {
  cacheDir: string;
  ttlMinutes: number;
  verbose: boolean;
}

/**
 * Hashes a URL into a filesystem-safe filename.
 * Uses SHA-256 truncated to 16 hex chars — collision-safe for our use case.
 */
function cacheKey(url: string): string {
  return createHash('sha256').update(url).digest('hex').slice(0, 16) + '.html';
}

/**
 * Returns cached HTML if it exists and hasn't expired, or null.
 */
export function readCache(url: string, opts: CacheOptions): string | null {
  const file = join(opts.cacheDir, cacheKey(url));

  if (!existsSync(file)) {
    if (opts.verbose) console.error(`[cache] miss — no file for ${url}`);
    return null;
  }

  const stat = statSync(file);
  const ageMs = Date.now() - stat.mtimeMs;
  const ttlMs = opts.ttlMinutes * 60 * 1000;

  if (ageMs > ttlMs) {
    if (opts.verbose) {
      const ageMins = Math.round(ageMs / 60_000);
      console.error(`[cache] expired — ${ageMins}m old, TTL is ${opts.ttlMinutes}m`);
    }
    return null;
  }

  if (opts.verbose) {
    const ageMins = Math.round(ageMs / 60_000);
    console.error(`[cache] hit — ${ageMins}m old (TTL ${opts.ttlMinutes}m)`);
  }

  return readFileSync(file, 'utf-8');
}

/**
 * Writes HTML to the cache directory, creating it if needed.
 */
export function writeCache(url: string, html: string, opts: CacheOptions): void {
  mkdirSync(opts.cacheDir, { recursive: true });
  const file = join(opts.cacheDir, cacheKey(url));
  writeFileSync(file, html, 'utf-8');

  if (opts.verbose) console.error(`[cache] wrote ${file}`);
}
