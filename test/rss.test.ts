import { describe, expect, it } from 'vitest';
import { buildRssFeed } from '../src/rss.js';
import type { ActivityItem } from '../src/parse.js';

const sampleItems: ActivityItem[] = [
  {
    title: 'Wrote a new post, Test Post, on the site Example:',
    link: 'https://example.com/post-1/',
    pubDate: 'Tue, 18 Feb 2026 03:21:22 GMT',
    guid: 'https://example.com/post-1/',
    description: 'Wrote a new post, <i><a href="https://example.com/post-1/">Test Post</a></i>',
  },
  {
    title: 'Wrote a comment on the post Another Post',
    link: 'https://example.com/post-2/#comment-1',
    pubDate: 'Mon, 10 Feb 2026 08:30:00 GMT',
    guid: 'https://example.com/post-2/#comment-1',
    description: 'Wrote a <a href="https://example.com/post-2/#comment-1">comment</a>',
  },
];

describe('buildRssFeed', () => {
  const rss = buildRssFeed(sampleItems, {
    user: 'testuser',
    profileUrl: 'https://profiles.wordpress.org/testuser/',
  });

  it('produces valid XML declaration', () => {
    expect(rss).toMatch(/^<\?xml version="1\.0" encoding="UTF-8"\?>/);
  });

  it('produces RSS 2.0 root element', () => {
    expect(rss).toContain('<rss version="2.0"');
  });

  it('includes channel title with username', () => {
    expect(rss).toContain('testuser on WordPress.org Profiles');
  });

  it('includes channel link', () => {
    expect(rss).toContain(
      '<link>https://profiles.wordpress.org/testuser/</link>',
    );
  });

  it('includes lastBuildDate', () => {
    expect(rss).toMatch(/<lastBuildDate>.+<\/lastBuildDate>/);
  });

  it('contains all items', () => {
    const itemMatches = rss.match(/<item>/g);
    expect(itemMatches).toHaveLength(2);
  });

  it('sets isPermaLink correctly for URL guids', () => {
    expect(rss).toContain('isPermaLink="true"');
  });

  it('wraps description in CDATA', () => {
    expect(rss).toContain('<description><![CDATA[');
  });

  it('escapes XML special chars in title', () => {
    const itemsWithSpecial: ActivityItem[] = [
      {
        title: 'Test & "quotes" <tags>',
        link: 'https://example.com/',
        pubDate: 'Tue, 18 Feb 2026 00:00:00 GMT',
        guid: 'https://example.com/',
        description: 'test',
      },
    ];
    const xml = buildRssFeed(itemsWithSpecial, {
      user: 'test',
      profileUrl: 'https://profiles.wordpress.org/test/',
    });
    expect(xml).toContain('&amp;');
    expect(xml).toContain('&quot;');
    expect(xml).toContain('&lt;tags&gt;');
  });
});
