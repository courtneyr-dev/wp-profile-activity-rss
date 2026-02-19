import { createHash } from 'node:crypto';
import * as cheerio from 'cheerio';
import type { AnyNode } from 'domhandler';

export interface ActivityItem {
  title: string;
  link: string;
  pubDate: string;
  guid: string;
  description: string;
}

/**
 * Selector strategies ordered from most specific to most permissive.
 * If the site changes markup, we try each in order and use the first
 * that finds items.
 */
const SELECTOR_STRATEGIES = [
  { name: 'primary: #activity-list > li', selector: '#activity-list > li' },
  { name: 'fallback-1: ul.wp-activity > li', selector: 'ul.wp-activity > li' },
  {
    name: 'fallback-2: #content-activity li.wporgactivity',
    selector: '#content-activity li.wporgactivity',
  },
  { name: 'fallback-3: li[class*="wporgactivity"]', selector: 'li[class*="wporgactivity"]' },
] as const;

/**
 * Generates a stable GUID from title + date when no link is available.
 */
function hashGuid(title: string, date: string): string {
  return 'urn:sha256:' + createHash('sha256').update(title + date).digest('hex').slice(0, 16);
}

/**
 * Extracts the title text from an activity <p>.
 *
 * Structure is typically:
 *   "Wrote a new post, <i><a>Title</a></i>, on the site Foo:<br><span>excerpt</span>"
 *
 * We want everything before the <br>/<span> as the title, with HTML tags stripped.
 */
function extractTitle($p: cheerio.Cheerio<AnyNode>, $: cheerio.CheerioAPI): string {
  // Clone so we can mutate
  const clone = $p.clone();

  // Remove the excerpt span and <br> — we only want the action line
  clone.find('br').remove();
  clone.find('span').remove();

  return clone.text().replace(/\s+/g, ' ').trim();
}

/**
 * Extracts the first meaningful link from an activity <p>.
 * For blog posts, this is the post URL. For comments, the comment permalink.
 * For trac items, the changeset/ticket URL.
 */
function extractLink($p: cheerio.Cheerio<AnyNode>, profileUrl: string): string {
  const firstAnchor = $p.find('a').first();
  const href = firstAnchor.attr('href');
  return href || profileUrl;
}

/**
 * Extracts the ISO 8601 timestamp from the <time> element.
 * Falls back to current time if not found, marking it as estimated.
 */
function extractDate(
  $li: cheerio.Cheerio<AnyNode>,
  verbose: boolean,
): { date: string; estimated: boolean } {
  const $time = $li.find('time[datetime]');
  const datetime = $time.attr('datetime');

  if (datetime) {
    return { date: new Date(datetime).toUTCString(), estimated: false };
  }

  if (verbose) {
    console.error('[parse] no <time datetime> found; using current time');
  }
  return { date: new Date().toUTCString(), estimated: true };
}

/**
 * Builds a safe HTML description from the <p> content.
 */
function extractDescription($p: cheerio.Cheerio<AnyNode>): string {
  return $p.html()?.trim() || '';
}

export interface ParseOptions {
  profileUrl: string;
  limit: number;
  verbose: boolean;
}

export interface ParseResult {
  items: ActivityItem[];
  selectorUsed: string;
}

/**
 * Parses the WordPress.org profile page HTML and returns activity items.
 * Tries multiple selector strategies for resilience against markup changes.
 */
export function parseActivityItems(html: string, opts: ParseOptions): ParseResult {
  const $ = cheerio.load(html);

  // Try each selector strategy
  for (const strategy of SELECTOR_STRATEGIES) {
    const $items = $(strategy.selector);

    if ($items.length === 0) {
      if (opts.verbose) {
        console.error(`[parse] strategy "${strategy.name}" — 0 matches, trying next`);
      }
      continue;
    }

    if (opts.verbose) {
      console.error(`[parse] strategy "${strategy.name}" — ${$items.length} matches`);
    }

    const items: ActivityItem[] = [];

    $items.each((_i, el) => {
      if (items.length >= opts.limit) return false; // cheerio .each supports early exit

      const $li = $(el);
      const $p = $li.find('p').first();

      if ($p.length === 0) return; // skip malformed entries

      const title = extractTitle($p, $);
      const link = extractLink($p, opts.profileUrl);
      const { date, estimated } = extractDate($li, opts.verbose);
      const description = extractDescription($p);
      const guid = link !== opts.profileUrl ? link : hashGuid(title, date);

      if (opts.verbose && estimated) {
        console.error(`[parse] estimated date for: ${title.slice(0, 60)}...`);
      }

      items.push({ title, link, pubDate: date, guid, description });
    });

    return { items, selectorUsed: strategy.name };
  }

  // No strategy matched — provide actionable error
  throw new Error(
    'Could not find activity entries in the page HTML. ' +
      'The WordPress.org Profiles markup may have changed. ' +
      'Run with --verbose to see which selectors were attempted. ' +
      'Check https://profiles.wordpress.org/ for structural changes.',
  );
}
