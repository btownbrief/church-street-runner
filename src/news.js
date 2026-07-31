// "Live Local News" banners fed by the shared Btown Brief games ticker feed
// (guide.btownbrief.com/data/ticker.json, rebuilt hourly by the guide repo):
// two months of Local News headlines plus this week's picks and upcoming
// events, which get their own EVENT-chip banners in the rotation. Falls back
// to the local news.json (scripts/update-news.mjs, GitHub Actions Mon & Fri)
// and then to mock headlines when both feeds are unreachable.
import * as THREE from 'three';

const TICKER = 'https://guide.btownbrief.com/data/ticker.json';

const MOCK = [
  'BTV: Farmers Market returns to City Hall Park Saturday',
  'Church St buskers festival draws record crowds',
  'Lake Champlain water temps hit summer highs',
  'New creemee stand opens on the waterfront',
  'Bike path repaving finishes ahead of schedule',
  'Leaf peepers arrive early this fall, says UVM',
  'City council debates more benches for Church St',
  'Local dog wins Vermont\'s goodest boy award',
];

const asNews = (t) => ({ chip: 'BTV', text: String(t) });
const clip = (t, max = 110) => (t.length <= max ? t : t.slice(0, max - 1).trimEnd() + '…');

let items = MOCK.map(asNews);
let latestEdition = { title: 'the latest Btown Brief', url: 'https://www.btownbrief.com/' };
let idx = 0;
const banners = []; // every banner in the scene, so we can refresh them all

// Mix the ticker feed into one banner rotation: headlines with an event every
// third slot, starting at a random spot in the two-month headline pile so
// every run reads different.
function mixTicker(data) {
  const news = (data.headlines || []).map(String);
  const events = (data.week || [])
    .map((w) => ({ chip: 'EVENT', text: clip(`${w.label}: ${w.text}`) }))
    .concat((data.upcoming || [])
      .map((u) => ({ chip: 'EVENT', text: clip(`${u.label}: ${u.text}${u.note ? ' — ' + u.note : ''}`) })));
  if (!news.length) return null;
  const mixed = [];
  let n = Math.floor(Math.random() * news.length);
  let e = 0;
  const count = Math.min(news.length + events.length, 60);
  for (let i = 0; i < count; i++) {
    if (events.length && i % 3 === 2) mixed.push(events[e++ % events.length]);
    else mixed.push(asNews(news[n++ % news.length]));
  }
  return mixed;
}

export async function loadHeadlines() {
  let next = null;
  try {
    const res = await fetch(TICKER, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      next = mixTicker(data);
      if (next && data.latest?.url) latestEdition = data.latest;
    }
  } catch { /* guide feed unreachable — try the local one */ }

  if (!next) {
    try {
      const res = await fetch(`${import.meta.env.BASE_URL}news.json`, { cache: 'no-store' });
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
          next = data.map(asNews);
        } else if (data && Array.isArray(data.headlines) && data.headlines.length) {
          next = data.headlines.map(asNews);
          if (data.latest?.url) latestEdition = data.latest;
        }
      }
    } catch { /* offline / no feed — keep mock headlines */ }
  }

  if (next) {
    items = next;
    // repaint any banners that were built before the feed arrived
    let i = 0;
    for (const b of banners) b.userData.setHeadline(items[i++ % items.length]);
    idx = i % items.length;
  }
}

export function getLatestEdition() {
  return latestEdition;
}

export function isNewsEnabled() {
  return localStorage.getItem('csr-news') !== 'off'; // default on
}
export function setNewsEnabled(on) {
  localStorage.setItem('csr-news', on ? 'on' : 'off');
}

function drawBanner(item) {
  const { chip, text } = typeof item === 'string' ? { chip: 'BTV', text: item } : item;
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e2b38';
  ctx.fillRect(0, 0, 1024, 96);
  ctx.fillStyle = '#e8b23a';
  ctx.font = 'bold 34px system-ui, sans-serif';
  const chipW = Math.max(148, ctx.measureText(chip).width + 76);
  ctx.fillRect(0, 0, chipW, 96);
  ctx.fillStyle = '#1e2b38';
  ctx.fillText(chip, 38, 60);
  ctx.fillStyle = '#f3ede0';
  // shrink font until the headline fits the banner
  const room = 1024 - chipW - 56;
  let size = 40;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (size > 22 && ctx.measureText(text).width > room - 10) {
    size -= 2;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, chipW + 28, 48 + size * 0.35, room);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A street-spanning news banner. Its chunk calls userData.nextHeadline() on
// recycle so the feed rotates as you run.
export function makeNewsBanner(y = 7.4) {
  // Plane's textured front is +z — the side the player sees. No rotation,
  // or the text reads mirrored.
  const mat = new THREE.MeshBasicMaterial({ map: drawBanner(items[idx % items.length]), side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.2), mat);
  banner.position.y = y;
  banner.userData.setHeadline = (item) => {
    const old = mat.map;
    mat.map = drawBanner(item);
    old.dispose();
  };
  banner.userData.nextHeadline = () => {
    idx = (idx + 1) % items.length;
    banner.userData.setHeadline(items[idx]);
  };
  banners.push(banner);
  idx = (idx + 1) % items.length; // stagger initial headlines across banners
  return banner;
}
