import type { ActivityItem } from './parse.js';

/**
 * Escapes special characters for safe XML content.
 */
function escapeXml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

export interface RssOptions {
  user: string;
  profileUrl: string;
}

/**
 * Generates a valid RSS 2.0 XML string from parsed activity items.
 *
 * We use string templating instead of a library because RSS 2.0 is
 * a simple, stable format and this avoids an extra dependency.
 */
export function buildRssFeed(items: ActivityItem[], opts: RssOptions): string {
  const now = new Date().toUTCString();

  const itemsXml = items
    .map(
      (item) => `    <item>
      <title>${escapeXml(item.title)}</title>
      <link>${escapeXml(item.link)}</link>
      <guid isPermaLink="${item.guid.startsWith('http') ? 'true' : 'false'}">${escapeXml(item.guid)}</guid>
      <pubDate>${item.pubDate}</pubDate>
      <description><![CDATA[${item.description}]]></description>
    </item>`,
    )
    .join('\n');

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${escapeXml(opts.user)} on WordPress.org Profiles — Activity</title>
    <link>${escapeXml(opts.profileUrl)}</link>
    <description>Unofficial RSS feed generated from public activity on profiles.wordpress.org</description>
    <lastBuildDate>${now}</lastBuildDate>
    <atom:link href="${escapeXml(opts.profileUrl)}" rel="self" type="application/rss+xml"/>
    <generator>wp-profile-activity-rss/1.0</generator>
${itemsXml}
  </channel>
</rss>
`;
}
