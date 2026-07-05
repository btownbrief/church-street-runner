// Pulls the latest Btown Brief edition from the beehiiv RSS feed and writes
// just the Local News headlines to docs/news.json (served by GitHub Pages)
// and public/news.json (picked up by future local builds).
// Run by .github/workflows/update-news.yml every Mon & Fri afternoon.
import { writeFileSync } from 'node:fs';

const FEED = 'https://rss.beehiiv.com/feeds/1BT4mvZXMo.xml';
const MAX_HEADLINES = 16;

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

// latest edition = first <item>
const item = xml.match(/<item>.*?<content:encoded><!\[CDATA\[(.*?)\]\]><\/content:encoded>/s);
if (!item) throw new Error('no item content found in feed');
const content = item[1];

// the "Local News" section, up to the next major heading
const section = content.match(/<h2[^>]*>[^<]*Local News.*?<\/h2>(.*?)<h[12][^>]*>/s);
if (!section) throw new Error('no Local News section found in latest edition');

const anchors = [...section[1].matchAll(/<a[^>]*>(.*?)<\/a>/gs)]
  .map((m) => decode(m[1].replace(/<[^>]+>/g, '')));

const junk = /instagram|facebook|reddit|twitter|tiktok|subscribe|click here|read more|sign up|^post /i;
const headlines = [];
for (const t of anchors) {
  if (t.length < 18 || t.length > 110) continue;
  if (junk.test(t)) continue;
  if (headlines.includes(t)) continue;
  headlines.push(t);
  if (headlines.length >= MAX_HEADLINES) break;
}
if (headlines.length < 3) throw new Error(`only ${headlines.length} headlines extracted — refusing to overwrite`);

const json = JSON.stringify(headlines, null, 2) + '\n';
writeFileSync('docs/news.json', json);
writeFileSync('public/news.json', json);
console.log(`wrote ${headlines.length} headlines:`);
for (const h of headlines) console.log('  -', h);
