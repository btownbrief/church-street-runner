// "Live Local News" banners fed by the Btown Brief beehiiv RSS.
// news.json is produced by scripts/update-news.mjs (GitHub Actions, Mon & Fri):
//   { headlines: [...], latest: { title, url }, updated: ISO }
// (a plain array of headlines is also accepted for backwards compatibility).
import * as THREE from 'three';

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

let headlines = [...MOCK];
let latestEdition = { title: 'the latest Btown Brief', url: 'https://www.btownbrief.com/' };
let idx = 0;
const banners = []; // every banner in the scene, so we can refresh them all

export async function loadHeadlines() {
  try {
    const res = await fetch(`${import.meta.env.BASE_URL}news.json`, { cache: 'no-store' });
    if (res.ok) {
      const data = await res.json();
      if (Array.isArray(data) && data.length) {
        headlines = data.map(String);
      } else if (data && Array.isArray(data.headlines) && data.headlines.length) {
        headlines = data.headlines.map(String);
        if (data.latest?.url) latestEdition = data.latest;
      }
      // repaint any banners that were built before the feed arrived
      let i = 0;
      for (const b of banners) b.userData.setHeadline(headlines[i++ % headlines.length]);
      idx = i % headlines.length;
    }
  } catch { /* offline / no feed — keep mock headlines */ }
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

function drawBanner(text) {
  const c = document.createElement('canvas');
  c.width = 1024; c.height = 96;
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e2b38';
  ctx.fillRect(0, 0, 1024, 96);
  ctx.fillStyle = '#e8b23a';
  ctx.fillRect(0, 0, 148, 96);
  ctx.fillStyle = '#1e2b38';
  ctx.font = 'bold 34px system-ui, sans-serif';
  ctx.fillText('BTV', 38, 60);
  ctx.fillStyle = '#f3ede0';
  // shrink font until the headline fits the banner
  let size = 40;
  ctx.font = `600 ${size}px system-ui, sans-serif`;
  while (size > 22 && ctx.measureText(text).width > 820) {
    size -= 2;
    ctx.font = `600 ${size}px system-ui, sans-serif`;
  }
  ctx.fillText(text, 176, 48 + size * 0.35, 830);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// A street-spanning news banner. Its chunk calls userData.nextHeadline() on
// recycle so the feed rotates as you run.
export function makeNewsBanner(y = 5.4) {
  // Plane's textured front is +z — the side the player sees. No rotation,
  // or the text reads mirrored.
  const mat = new THREE.MeshBasicMaterial({ map: drawBanner(headlines[idx % headlines.length]), side: THREE.DoubleSide });
  const banner = new THREE.Mesh(new THREE.PlaneGeometry(13, 1.2), mat);
  banner.position.y = y;
  banner.userData.setHeadline = (text) => {
    const old = mat.map;
    mat.map = drawBanner(text);
    old.dispose();
  };
  banner.userData.nextHeadline = () => {
    idx = (idx + 1) % headlines.length;
    banner.userData.setHeadline(headlines[idx]);
  };
  banners.push(banner);
  idx = (idx + 1) % headlines.length; // stagger initial headlines across banners
  return banner;
}
