# wp-profile-activity-rss

Generate RSS 2.0 feeds from public WordPress.org profile activity streams. Runs on a schedule via GitHub Actions and publishes feeds to GitHub Pages.

## Feed URLs

Once deployed, feeds are available at:

```
https://<your-username>.github.io/wp-profile-activity-rss/<user>.xml
```

Current users: `matt`, `4thhubbard`, `otto42`, `coffee2code`, `barry`

## Setup

### 1. Clone and install

```bash
git clone https://github.com/youruser/wp-profile-activity-rss.git
cd wp-profile-activity-rss
npm install
npm run build
```

### 2. Enable GitHub Pages

In your repo settings:
1. Go to **Settings > Pages**
2. Under **Source**, select **GitHub Actions**

The workflow deploys feeds automatically after that.

### 3. Configure users

Edit `feeds.config.json`:

```json
{
  "users": ["matt", "4thhubbard", "otto42", "coffee2code", "barry"],
  "limit": 30
}
```

Push the change. The next scheduled run (or a manual trigger) picks it up.

### 4. Trigger manually

Go to **Actions > Generate RSS Feeds > Run workflow** to trigger immediately.

## Local usage

```bash
# Generate a single feed to stdout
node dist/cli.js --user matt

# Generate a single feed to a file
node dist/cli.js --user matt --out matt.xml --verbose

# Generate all feeds from config
npm run generate
```

### CLI options

| Flag | Default | Description |
|------|---------|-------------|
| `--user <username>` | *required* | WordPress.org username |
| `--base-url <url>` | `https://profiles.wordpress.org` | Base URL for profiles |
| `--limit <n>` | `30` | Max items in the feed |
| `--cache-dir <path>` | `.cache/wp-profile-rss` | Where to store cached HTML |
| `--ttl-minutes <n>` | `60` | Cache lifetime in minutes |
| `--out <path>` | *(stdout)* | Write RSS to a file |
| `--verbose` | `false` | Print debug info to stderr |

## Schedule

The GitHub Actions workflow runs every 2 hours. Edit `.github/workflows/generate-feeds.yml` to change the cron schedule.

WordPress.org profiles are public pages that change infrequently. Every 2 hours is a reasonable default. The tool caches fetched HTML (TTL 60 min) to avoid redundant requests within a single run.

## Troubleshooting

**"Could not find activity entries in the page HTML"**

WordPress.org may have changed their markup. Run with `--verbose` to see which selectors were tried. The parser uses four fallback strategies:

1. `#activity-list > li` (primary)
2. `ul.wp-activity > li` (class-based fallback)
3. `#content-activity li.wporgactivity` (container + item class)
4. `li[class*="wporgactivity"]` (broadest match)

If all four fail, the site structure has changed and the parser needs updating.

**Empty feed / 0 items**

The user may have no public activity, or the username is wrong. Check the profile URL in a browser.

**HTTP errors**

`403` may mean rate limiting -- increase polling interval. `404` means the username doesn't exist.

**GitHub Pages not updating**

Check the Actions tab for failed runs. Make sure Pages source is set to "GitHub Actions" in repo settings.

## Development

```bash
npm run dev      # watch mode
npm test         # run tests
npm run lint     # eslint
npm run format   # prettier
```

## License

MIT
