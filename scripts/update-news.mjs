// Pulls the latest Btown Brief editions from the beehiiv RSS feed and writes
// the Local News headlines from the newest THREE editions to docs/news.json
// (served by GitHub Pages) and public/news.json (picked up by local builds).
// Run by .github/workflows/update-news.yml every Mon & Fri afternoon.
import { writeFileSync } from 'node:fs';

const FEED = 'https://rss.beehiiv.com/feeds/1BT4mvZXMo.xml';
const EDITIONS = 3;
const MAX_HEADLINES = 30;

function decode(s) {
  return s
    .replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;|&apos;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

const res = await fetch(FEED);
if (!res.ok) throw new Error(`feed fetch failed: ${res.status}`);
const xml = await res.text();

const items = [...xml.matchAll(/<item>(.*?)<\/item>/gs)].slice(0, EDITIONS);
if (!items.length) throw new Error('no items found in feed');

const junk = /instagram|facebook|reddit|twitter|tiktok|subscribe|click here|read more|sign up|^post /i;
const headlines = [];
let latest = null;

for (const [, item] of items) {
  // edition title + link (the first/newest edition feeds the game-over button)
  const title = decode((item.match(/<title>(?:<!\[CDATA\[)?(.*?)(?:\]\]>)?<\/title>/s) || [, 'the latest Btown Brief'])[1]);
  const url = decode((item.match(/<link>(.*?)<\/link>/s) || [, 'https://www.btownbrief.com/'])[1]);
  if (!latest) latest = { title, url };

  const body = item.match(/<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/s);
  if (!body) continue;

  // the "Local News" section, up to the next major heading
  const section = body[1].match(/<h2[^>]*>[^<]*Local News.*?<\/h2>(.*?)<h[12][^>]*>/s);
  if (!section) continue;

  const anchors = [...section[1].matchAll(/<a[^>]*>(.*?)<\/a>/gs)]
    .map((m) => decode(m[1].replace(/<[^>]+>/g, '')));
  for (const t of anchors) {
    if (t.length < 18 || t.length > 110) continue;
    if (junk.test(t)) continue;
    if (headlines.includes(t)) continue;
    headlines.push(t);
  }
}

if (headlines.length < 3) throw new Error(`only ${headlines.length} headlines extracted — refusing to overwrite`);
headlines.length = Math.min(headlines.length, MAX_HEADLINES);

const json = JSON.stringify({
  headlines,
  latest,
  updated: new Date().toISOString(),
}, null, 2) + '\n';
writeFileSync('docs/news.json', json);
writeFileSync('public/news.json', json);
console.log(`latest edition: ${latest.title} — ${latest.url}`);
console.log(`wrote ${headlines.length} headlines from ${items.length} editions:`);
for (const h of headlines) console.log('  -', h);
