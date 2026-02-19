import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { parseActivityItems } from '../src/parse.js';

const PROFILE_URL = 'https://profiles.wordpress.org/matt/';

const mattHtml = readFileSync(new URL('./fixtures/matt-profile.html', import.meta.url), 'utf-8');
const fallbackHtml = readFileSync(
  new URL('./fixtures/fallback-markup.html', import.meta.url),
  'utf-8',
);

describe('parseActivityItems', () => {
  it('extracts all 7 activity items from the fixture', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 50,
      verbose: false,
    });
    expect(items).toHaveLength(7);
  });

  it('uses the primary selector strategy', () => {
    const { selectorUsed } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 50,
      verbose: false,
    });
    expect(selectorUsed).toContain('#activity-list');
  });

  it('respects the --limit option', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 3,
      verbose: false,
    });
    expect(items).toHaveLength(3);
  });

  it('extracts title without excerpt text', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 1,
      verbose: false,
    });
    expect(items[0].title).toContain("Let's Slack Better");
    expect(items[0].title).toContain('Wrote a new post');
    // Excerpt should be stripped from title
    expect(items[0].title).not.toContain('separate Slack groups');
  });

  it('extracts links from each activity type', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 50,
      verbose: false,
    });

    // blog post
    expect(items[0].link).toBe(
      'https://make.wordpress.org/meta/2026/02/18/lets-slack-better/',
    );
    // comment
    expect(items[1].link).toContain('#comment-48384');
    // trac changeset
    expect(items[2].link).toContain('changeset/61459');
    // forum topic
    expect(items[3].link).toContain('support/topic/');
    // forum reply
    expect(items[4].link).toContain('#post-18616898');
    // wordcamp
    expect(items[5].link).toContain('europe.wordcamp.org');
    // trac ticket
    expect(items[6].link).toContain('meta.trac.wordpress.org/ticket/8009');
  });

  it('parses ISO 8601 dates from <time> elements', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 1,
      verbose: false,
    });
    // Should be a valid date string derived from 2026-02-18T03:21:22Z
    const parsed = new Date(items[0].pubDate);
    expect(parsed.getUTCFullYear()).toBe(2026);
    expect(parsed.getUTCMonth()).toBe(1); // February = 1
    expect(parsed.getUTCDate()).toBe(18);
  });

  it('uses link as GUID when available', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 1,
      verbose: false,
    });
    expect(items[0].guid).toBe(items[0].link);
  });

  it('generates stable GUIDs for items without unique links', () => {
    const { items: run1 } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 50,
      verbose: false,
    });
    const { items: run2 } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 50,
      verbose: false,
    });

    // GUIDs should be identical across runs
    for (let i = 0; i < run1.length; i++) {
      expect(run1[i].guid).toBe(run2[i].guid);
    }
  });

  it('includes description HTML', () => {
    const { items } = parseActivityItems(mattHtml, {
      profileUrl: PROFILE_URL,
      limit: 1,
      verbose: false,
    });
    // Description should contain the full <p> inner HTML
    expect(items[0].description).toContain('<a href=');
    expect(items[0].description).toContain("Let's Slack Better");
  });

  it('falls back to alternative selectors when primary is missing', () => {
    const { items, selectorUsed } = parseActivityItems(fallbackHtml, {
      profileUrl: 'https://profiles.wordpress.org/test/',
      limit: 50,
      verbose: false,
    });
    expect(items).toHaveLength(2);
    // Should NOT have used primary (no id on ul)
    expect(selectorUsed).not.toContain('#activity-list');
    expect(selectorUsed).toContain('wp-activity');
  });

  it('throws with actionable error when no selectors match', () => {
    const emptyHtml = '<html><body><p>Nothing here</p></body></html>';
    expect(() =>
      parseActivityItems(emptyHtml, {
        profileUrl: PROFILE_URL,
        limit: 50,
        verbose: false,
      }),
    ).toThrow(/markup may have changed/);
  });
});
