/* Pixel sprites drawn from text maps, plus tiny chiptune sound effects. */
window.PX = (function () {
  const PAL = {
    k: '#0b0f1a', w: '#f4f4f4', g: '#e2b13c', G: '#a8771f', b: '#3b6fd8', B: '#8fc1ff', c: '#5fe0ff', d: '#3a4466', D: '#262b44',
    r: '#e43b44', o: '#f77622', y: '#feae34', Y: '#fee761', e: '#63c74d', E: '#3e8948', s: '#c0cbdc', S: '#8b9bb4', p: '#b55088', m: '#ff0044'
  };
  const SPR = {
    sat: ['BB.....BB', 'bBdgggdBb', 'bBggwggBb', 'bBdgggdBb', 'BB..s..BB'],
    fire: ['..r..', '.rr.r', '.ror.', 'royor', 'roYyr', '.ryr.'],
    wheat: ['y.y.y', 'YyYyY', '.yyy.', '..e..', '..e..', '.E.E.'],
    wave: ['..cc..', '.cBBc.', 'cB..Bc', 'B....B'],
    ice: ['..B..', 'B.w.B', '.wcw.', 'BcwcB', '.wcw.', 'B.w.B', '..B..'],
    dish: ['.sss.', 's...s', '.sss.', '..S..', '.SSS.'],
    star: ['.Y.', 'YYY', '.Y.'],
    rocket: ['....w....', '...www...', '...www...', '..wwwww..', '..wwrww..', '..wwwww..', '..wwwww..', '..wkkkw..', '..wwwww..', '..wwwww..',
      '..wwwww..', '..wwwww..', '..wwrww..', '..wwwww..', '..wwwww..', '..wwwww..', '..wwwww..', '..wwwww..', '.dwwwwwd.', 'ddwwwwwdd', 'dd.SSS.dd', 'd..S.S..d'],
    flame: ['.yYYy.', '.oyYo.', '..oo..', '..r...'],
    boom: ['.o.r.o.', 'o.yYy.r', '.yYwYy.', 'rYwwwYo', '.yYwYy.', 'o.yYy.r', '.r.o.o.']
  };
  const cache = {};
  function sprite(name, scale = 1) {
    const key = name + scale;
    if (cache[key]) return cache[key];
    const m = SPR[name], h = m.length, w = m[0].length;
    const c = document.createElement('canvas'); c.width = w * scale; c.height = h * scale;
    const x = c.getContext('2d');
    for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) { const ch = m[j][i]; if (ch !== '.') { x.fillStyle = PAL[ch]; x.fillRect(i * scale, j * scale, scale, scale); } }
    return (cache[key] = c);
  }
  function draw(ctx, name, x, y, scale = 1) { const s = sprite(name, scale); ctx.drawImage(s, Math.round(x - s.width / 2), Math.round(y - s.height / 2)); }

  // --- chiptune sfx (WebAudio square waves) ---
  let ac = null, muted = false;
  function tone(freq, dur, type = 'square', vol = 0.05, slide = 0) {
    if (muted) return;
    try {
      ac = ac || new (window.AudioContext || window.webkitAudioContext)();
      const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime;
      o.type = type; o.frequency.setValueAtTime(freq, t); if (slide) o.frequency.linearRampToValueAtTime(freq + slide, t + dur);
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(ac.destination); o.start(t); o.stop(t + dur);
    } catch (e) {}
  }
  const sfx = {
    click: () => tone(660, 0.05),
    shot: () => { tone(880, 0.06); setTimeout(() => tone(1320, 0.08), 60); },
    coin: () => { tone(988, 0.07); setTimeout(() => tone(1319, 0.12), 70); },
    alert: () => { tone(440, 0.12, 'square', 0.06); setTimeout(() => tone(440, 0.12, 'square', 0.06), 180); },
    bad: () => tone(220, 0.25, 'sawtooth', 0.05, -120),
    launch: () => tone(80, 1.8, 'sawtooth', 0.05, 200),
    boom: () => tone(120, 0.6, 'sawtooth', 0.08, -100),
    win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => tone(f, 0.15), i * 120))
  };
  return { PAL, sprite, draw, sfx, setMuted: (m) => (muted = m), isMuted: () => muted };
})();
