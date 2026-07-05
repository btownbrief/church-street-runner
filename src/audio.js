// Synthesized sound effects via WebAudio — no audio assets needed.
// Call unlock() from a user gesture before anything will play.
let ctx = null;
let master = null;
let muted = localStorage.getItem('csr-mute') === 'on';

function ac() {
  if (!ctx) {
    ctx = new (window.AudioContext || window.webkitAudioContext)();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.5;
    master.connect(ctx.destination);
  }
  return ctx;
}

export function unlock() {
  const c = ac();
  if (c.state === 'suspended') c.resume();
}

export function isMuted() { return muted; }
export function setMuted(on) {
  muted = on;
  localStorage.setItem('csr-mute', on ? 'on' : 'off');
  if (master) master.gain.value = on ? 0 : 0.5;
}

function tone(freq, dur, type = 'sine', gain = 0.2, slideTo = null, delay = 0) {
  const c = ac();
  if (c.state === 'suspended') return;
  const t0 = c.currentTime + delay;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

function noiseBurst(dur, filterFreq, gain = 0.25, delay = 0) {
  const c = ac();
  if (c.state === 'suspended') return;
  const t0 = c.currentTime + delay;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = 'lowpass';
  f.frequency.value = filterFreq;
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f).connect(g).connect(master);
  src.start(t0);
}

// looping jetpack rumble
let jet = null;
function jetStart() {
  const c = ac();
  if (jet || c.state === 'suspended') return;
  const len = c.sampleRate;
  const buf = c.createBuffer(1, len, c.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  src.loop = true;
  const f = c.createBiquadFilter();
  f.type = 'bandpass';
  f.frequency.value = 420;
  f.Q.value = 0.7;
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.22, c.currentTime + 0.15);
  const lfo = c.createOscillator();
  lfo.frequency.value = 26;
  const lfoG = c.createGain();
  lfoG.gain.value = 120;
  lfo.connect(lfoG).connect(f.frequency);
  src.connect(f).connect(g).connect(master);
  src.start();
  lfo.start();
  jet = { src, g, lfo };
}
function jetStop() {
  if (!jet) return;
  const c = ac();
  jet.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.25);
  const j = jet;
  setTimeout(() => { try { j.src.stop(); j.lfo.stop(); } catch {} }, 350);
  jet = null;
}

// soft hum while the magnet is active
let hum = null;
function magnetStart() {
  const c = ac();
  if (hum || c.state === 'suspended') return;
  const osc = c.createOscillator();
  osc.type = 'sine';
  osc.frequency.value = 190;
  const lfo = c.createOscillator();
  lfo.frequency.value = 7;
  const lfoG = c.createGain();
  lfoG.gain.value = 24;
  lfo.connect(lfoG).connect(osc.frequency);
  const g = c.createGain();
  g.gain.setValueAtTime(0.0001, c.currentTime);
  g.gain.exponentialRampToValueAtTime(0.06, c.currentTime + 0.2);
  osc.connect(g).connect(master);
  osc.start();
  lfo.start();
  hum = { osc, lfo, g };
}
function magnetStop() {
  if (!hum) return;
  const c = ac();
  hum.g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + 0.2);
  const h = hum;
  setTimeout(() => { try { h.osc.stop(); h.lfo.stop(); } catch {} }, 300);
  hum = null;
}

export const sfx = {
  click: () => tone(620, 0.06, 'square', 0.1),
  jump: () => tone(280, 0.2, 'sine', 0.22, 560),
  slide: () => noiseBurst(0.22, 900, 0.2),
  coin: () => { tone(1320, 0.07, 'square', 0.1); tone(1660, 0.1, 'square', 0.1, null, 0.06); },
  bonus: () => { tone(880, 0.09, 'triangle', 0.16); tone(1100, 0.09, 'triangle', 0.16, null, 0.08); tone(1470, 0.16, 'triangle', 0.16, null, 0.16); },
  magnetPickup: () => { tone(220, 0.3, 'sawtooth', 0.14, 880); magnetStart(); },
  magnetEnd: () => magnetStop(),
  jetpackPickup: () => { tone(300, 0.35, 'sawtooth', 0.16, 900); jetStart(); },
  jetpackEnd: () => { jetStop(); tone(700, 0.3, 'sine', 0.12, 220); },
  hit: () => { noiseBurst(0.3, 320, 0.4); tone(150, 0.3, 'sawtooth', 0.28, 55); },
  bark: () => { tone(240, 0.07, 'square', 0.26, 150); tone(210, 0.09, 'square', 0.26, 130, 0.12); },
  gameover: () => { tone(440, 0.18, 'triangle', 0.2, null, 0); tone(349, 0.18, 'triangle', 0.2, null, 0.18); tone(262, 0.4, 'triangle', 0.2, null, 0.36); },
  stopLoops: () => { jetStop(); magnetStop(); },
};
