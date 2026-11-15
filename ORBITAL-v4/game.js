/* ORBITAL v3 — indie pixel space-mission game. Plain script, works from file://. */
(function () {
  const OD = window.OD, SIM = window.SIM, PX = window.PX, L = OD.L;
  const $ = (s, r = document) => r.querySelector(s);
  const clamp = (x, a = 0, b = 1) => Math.max(a, Math.min(b, x));
  const rnd = (a, b) => a + Math.random() * (b - a);
  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const lsGet = (k) => { try { return JSON.parse(localStorage.getItem(k)); } catch (e) { return null; } };
  const lsSet = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} };

  const prefs = Object.assign({ lang: 'ru', mute: false }, lsGet('orbital4-prefs') || {});
  PX.setMuted(prefs.mute);
  const T = (o) => (o == null ? '' : typeof o === 'object' ? (o[prefs.lang] ?? o.ru) : o);
  const ru = () => prefs.lang === 'ru';
  const M = (n) => '$' + Math.round(n * 10) / 10 + 'M';
  const kg = () => (ru() ? 'кг' : 'kg');

  const U = {
    press: L('НАЖМИ СТАРТ', 'PRESS START'), play: L('Играть', 'Play'), sub: L('Собери спутник, успей к окну запуска и проведи миссию. Всё разрешено — но у каждого решения есть цена.', 'Build a satellite, make the launch window, fly the mission. Everything is allowed — but every choice has a price.'),
    choose: L('ВЫБЕРИ МИССИЮ', 'CHOOSE A MISSION'), season: L('Сезон начнётся', 'Season starts'), day: L('день', 'day'), budget: L('Бюджет', 'Budget'), best: L('Рекорд', 'Best'),
    hangar: L('АНГАР', 'HANGAR'), orbit: L('Орбита', 'Orbit'), instr: L('Приборы (до 2)', 'Instruments (max 2)'), power: L('Энергия', 'Power'), radio: L('Радио', 'Radio'),
    ground: L('Наземные станции', 'Ground stations'), rocket: L('Ракета', 'Rocket'), tests: L('Испытания', 'Tests'),
    mass: L('Масса', 'Mass'), ready: L('Готов', 'Ready'), launchDay: L('Старт', 'Launch'), late: L('опоздание', 'late'),
    startBuild: L('НАЧАТЬ СБОРКУ', 'START BUILD'), back: L('Назад', 'Back'),
    facts: L('Реальная физика вашей орбиты', 'Real physics of your orbit'),
    period: L('Виток', 'Orbit'), perDay: L('витков/сутки', 'orbits/day'), shadow: L('В тени Земли до', 'In Earth shadow up to'), reach: L('Обзор', 'Reach'), pass: L('Сеанс связи до', 'Contact up to'), perPass: L('за сеанс', 'per pass'),
    energy: L('Энергия за виток', 'Energy per orbit'), min: L('мин', 'min'), km: L('км', 'km'),
    build: L('СБОРКА', 'ASSEMBLY'), plus1: L('+1 день', '+1 day'), toEvent: L('До события', 'To next event'), toEnd: L('До конца', 'To the end'),
    waitWindow: L('ЖДАТЬ ОКНА ЗАПУСКА', 'WAIT FOR LAUNCH WINDOW'), integ: L('Интеграция', 'Integration'), delay: L('Задержки', 'Delays'),
    window: L('окно', 'window'), seasonFlag: L('сезон', 'season'), bus: L('Платформа', 'Platform'),
    toMCC: L('В ЦЕНТР УПРАВЛЕНИЯ', 'TO MISSION CONTROL'), orbitOk: L('ОРБИТА ДОСТИГНУТА', 'ORBIT REACHED'), lost: L('РАКЕТА ПОТЕРЯНА', 'ROCKET LOST'),
    capture: L('СНИМОК', 'CAPTURE'), sci: L('Приборы', 'Instruments'), batt: L('Батарея', 'Battery'), mem: L('Память', 'Memory'), link: L('Связь', 'Link'),
    noLink: L('нет связи', 'no contact'), score: L('Очки', 'Score'), combo: L('Комбо', 'Combo'), fuel: L('Топливо', 'Fuel'),
    targets: L('Цели', 'Targets'), safe: L('БЕЗОПАСНЫЙ РЕЖИМ', 'SAFE MODE'), sun: L('Солнце', 'Sun'), eclipse: L('Тень', 'Shadow'),
    help: L('ПРОБЕЛ — снимок · ⏭ или 4 — перемотка · P — пауза', 'SPACE — capture · ⏭ or 4 — skip time · P — pause'),
    debrief: L('ИТОГИ МИССИИ', 'MISSION DEBRIEF'), again: L('ЕЩЁ РАЗ', 'PLAY AGAIN'), other: L('Другая миссия', 'Other mission'),
    delivered: L('доставлено вовремя', 'delivered on time'), lateD: L('доставлено поздно', 'delivered late'), missed: L('упущено', 'missed'),
    why: L('Что улучшить в следующий раз', 'What to improve next time'), real: L('Как это сделали в NASA', 'How NASA did it'), newBest: L('НОВЫЙ РЕКОРД!', 'NEW BEST!')
  };

  /* ================= state ================= */
  let screen = 'title', mission = null, design = null, build = null, run = null, raf = 0;
  const freshDesign = () => ({ orbit: 'sso', instr: [], power: 'm', radio: 'x', ground: 'base', kz: false, rocket: 'light', vib: true, tvac: true });

  function calc(d = design) {
    const m = OD.MISSIONS[mission], o = OD.ORBITS[d.orbit], p = OD.POWER[d.power], r = OD.RADIO[d.radio], k = OD.ROCKETS[d.rocket], g = OD.GROUND[d.ground];
    const ins = d.instr.map((id) => OD.INSTR[id]);
    const sum = (f) => ins.reduce((a, x) => a + x[f], 0);
    const mass = OD.BUS.mass + (d.orbit === 'geo' ? OD.BUS.geoMass : 0) + sum('mass') + p.mass + r.mass;
    const cost = OD.BUS.cost + sum('cost') + p.cost + r.cost + k.cost + g.cost + (d.kz ? OD.KZ_STATION.cost : 0) + (d.vib ? OD.TESTS.vib.cost : 0) + (d.tvac ? OD.TESTS.tvac.cost : 0);
    const cap = k.cap[d.orbit];
    const need = OD.BUS.power + sum('power');
    const O = SIM.orbit(o);
    const ecl = O.geo ? 0 : O.eclFrac;
    const whOrbit = (p.gen * (1 - ecl) - need) * (O.geo ? 24 : O.period / 3600);
    const laneA = sum('days'), laneB = p.days + r.days + OD.BUS.days;
    const buildDays = Math.max(laneA, laneB) + 6 + (d.vib ? OD.TESTS.vib.days : 0) + (d.tvac ? OD.TESTS.tvac.days : 0);
    const win = nextWindow(k, buildDays);
    return { m, o, p, r, k, g, O, ins, mass, cost, cap, need, whOrbit, laneA, laneB, buildDays, win, late: Math.max(0, win - m.season) };
  }
  function nextWindow(k, day) { let w = k.win.find((x) => x >= day); if (w == null) { w = k.win[k.win.length - 1]; while (w < day) w += 30; } return w; }

  /* ================= generic UI ================= */
  const app = () => $('#app');
  const launchT = [];
  function setScreen(s) { launchT.splice(0).forEach(clearTimeout); screen = s; cancelAnimationFrame(raf); window.scrollTo(0, 0); render(); }
  function render() {
    document.documentElement.lang = prefs.lang;
    $('#lang').textContent = ru() ? 'EN' : 'RU';
    $('#mute').textContent = prefs.mute ? '♪×' : '♪';
    ({ title: vTitle, missions: vMissions, hangar: vHangar, build: vBuild, launch: vLaunch, ops: vOps, debrief: vDebrief })[screen]();
  }
  function modal(html) { const m = $('#modal'); m.innerHTML = `<div class="box">${html}</div>`; m.classList.add('on'); }
  function closeModal() { $('#modal').classList.remove('on'); $('#modal').innerHTML = ''; }

  /* ---------- background earth texture (low-res pixel map) ---------- */
  const MW = 960, MH = 480, NW = 480, NH = 240;
  const mapCanvas = document.createElement('canvas'); mapCanvas.width = MW; mapCanvas.height = MH;
  let mapReady = false;
  (function loadMap() {
    const c = mapCanvas.getContext('2d');
    c.fillStyle = '#1b3a6b'; c.fillRect(0, 0, MW, MH);
    const img = new Image();
    img.onload = () => { c.imageSmoothingEnabled = true; c.imageSmoothingQuality = 'high'; c.drawImage(img, 0, 0, MW, MH); mapReady = true; };
    img.src = 'assets/earth-day-map.png';
  })();

  /* ================= SAVE / SCORE ================= */
  const getSave = () => lsGet('orbital4-save');
  const ICON = { fire: '🔥', wheat: '🌾', wave: '🌊', ice: '❄️' };
  const PTS = () => (ru() ? 'очков' : 'pts');
  const sgn = (n) => (n > 0 ? '+' : n < 0 ? '−' : '') + Math.abs(n);
  // effective rocket reliability: overweight makes failure more likely, an unreachable orbit makes it certain
  function relEff(c) { if (!c.cap) return 0; return clamp(c.k.rel - (c.mass > c.cap ? 2 * (c.mass - c.cap) / c.cap : 0)); }
  // Score table. sci == null → pre-flight preview (design-only rows).
  function tally(c, extra, sci, f = {}) {
    const R = ru(), left = c.m.budget - c.cost - extra, rows = [];
    if (sci != null) rows.push([R ? 'Наука: данные, доставленные вовремя' : 'Science: data delivered on time', sci]);
    if (left > 0 && !f.launchFail && (sci == null || f.done > 0)) rows.push([R ? `Эффективность: сэкономлено ${M(left)}` : `Efficiency: ${M(left)} saved`, Math.round(20 * left)]);
    if (!c.late && !f.launchFail && c.cap) rows.push([R ? 'Успели к началу сезона' : 'Launched before the season', 300]);
    if (left < 0) rows.push([R ? `Перерасход бюджета на ${M(-left)}` : `Over budget by ${M(-left)}`, -Math.round(60 * -left)]);
    if (c.cap && c.mass > c.cap) rows.push([R ? `Перевес ${c.mass - c.cap} ${kg()}` : `Overweight by ${c.mass - c.cap} kg`, -15 * (c.mass - c.cap)]);
    if (f.latePen) rows.push([R ? `Опоздание к сезону на ${c.late} дн.` : `${c.late} days late for the season`, -f.latePen]);
    if (f.launchFail) rows.push([R ? 'Неудачный полёт: ракета потеряна' : 'Failed flight: rocket lost', -1000]);
    if (f.destroyed) rows.push([R ? 'Неудачный полёт: спутник потерян на орбите' : 'Failed flight: satellite lost in orbit', -1000]);
    return { rows, total: rows.reduce((a, x) => a + x[1], 0) };
  }
  function finish(sci, f, stats, tips) {
    const c = calc(), t = tally(c, build ? build.extra : 0, sci, f), final = t.total;
    const sv = getSave() || { name: ru() ? 'Агентство' : 'Agency', total: 0, flights: [] };
    const prevBest = Math.max(-Infinity, ...sv.flights.filter((x) => x.m === mission).map((x) => x.score));
    const grade = f.launchFail || f.destroyed ? 'D' : final >= 4200 ? 'S' : final >= 3000 ? 'A' : final >= 1800 ? 'B' : final >= 800 ? 'C' : 'D';
    sv.flights.push({ m: mission, score: final, grade }); sv.total += final; lsSet('orbital4-save', sv);
    run.result = Object.assign({ final, grade, rows: t.rows, isBest: sv.flights.length > 1 && final > prevBest && isFinite(prevBest), tips, total: sv.total, done: 0, late: 0, stuck: 0, missed: 0, gb: 0 }, stats);
    if (grade === 'S' || grade === 'A') PX.sfx.win();
    setScreen('debrief');
  }
  function drawSatIcon(x, px, py, k = 1) {
    x.save(); x.translate(px, py); x.scale(k, k); x.shadowColor = '#5bd7ff'; x.shadowBlur = 8;
    x.fillStyle = '#5bd7ff'; x.fillRect(-15, -2.5, 9, 5); x.fillRect(6, -2.5, 9, 5);
    x.fillStyle = '#fff'; x.fillRect(-5, -4, 10, 8); x.restore();
  }

  /* ================= TITLE ================= */
  function vTitle() {
    const sv = getSave(), R = ru();
    app().innerHTML = `<section class="title"><canvas id="tglobe" width="300" height="300"></canvas>
      <div class="tcol"><p class="eyebrow">NASA SPACE APPS 2026 · SPACE MISSION DESIGN GAME</p><h1>ORBITAL</h1><p class="sub">${T(U.sub)}</p>
        <div class="tbtns">${sv ? `<button class="btn big" data-act="continue">▶ ${R ? 'Продолжить' : 'Continue'}<small>${esc(sv.name)} · ${sv.total} ${PTS()} · ${sv.flights.length} ${R ? 'полётов' : 'flights'}</small></button>` : ''}<button class="btn ${sv ? '' : 'big'}" data-act="newGame">+ ${R ? 'Новая игра' : 'New game'}</button></div>
        <div class="rules"><h4>${R ? 'Как считаются очки' : 'How scoring works'}</h4>
          <p><b class="grn">+</b> ${R ? 'наука: каждый снимок, доставленный на Землю вовремя' : 'science: every image delivered to Earth on time'}</p>
          <p><b class="grn">+</b> ${R ? 'эффективность: +20 за каждый сэкономленный $1M, +300 за старт до начала сезона' : 'efficiency: +20 per $1M saved, +300 for launching before the season'}</p>
          <p><b class="red">−</b> ${R ? 'перевес: −15 за каждый лишний кг (и ракета может не справиться)' : 'overweight: −15 per extra kg (and the rocket may fail)'}</p>
          <p><b class="red">−</b> ${R ? 'перерасход: −60 за каждый $1M сверх бюджета' : 'overspending: −60 per $1M over budget'}</p>
          <p><b class="red">−</b> ${R ? 'неудачный полёт: −1000' : 'failed flight: −1000'}</p></div></div></section>`;
    const cv = $('#tglobe'), cx = cv.getContext('2d'); let off = 0;
    (function loop() {
      cx.clearRect(0, 0, 300, 300);
      cx.save(); cx.beginPath(); cx.arc(150, 150, 125, 0, Math.PI * 2); cx.clip();
      off = (off + 0.6) % MW;
      const sw = MW / 2, first = Math.min(sw, MW - off);
      cx.drawImage(mapCanvas, off, 0, first, MH, 25, 25, 250 * first / sw, 250);
      if (first < sw) cx.drawImage(mapCanvas, 0, 0, sw - first, MH, 25 + 250 * first / sw, 25, 250 * (sw - first) / sw, 250);
      const g = cx.createRadialGradient(100, 100, 20, 150, 150, 130); g.addColorStop(0, 'rgba(255,255,255,0.10)'); g.addColorStop(0.7, 'rgba(0,0,0,0)'); g.addColorStop(1, 'rgba(0,4,20,0.8)');
      cx.fillStyle = g; cx.fillRect(0, 0, 300, 300); cx.restore();
      const a = performance.now() / 1600; drawSatIcon(cx, 150 + Math.cos(a) * 142, 150 + Math.sin(a) * 44, 1.2);
      if (screen === 'title') raf = requestAnimationFrame(loop);
    })();
  }
  function newGameModal() {
    const sv = getSave(), R = ru();
    modal(`<h3>${R ? 'Новая игра' : 'New game'}</h3><p>${R ? 'Как называется твоё космическое агентство?' : 'What is your space agency called?'}</p>
      <input id="agname" maxlength="20" placeholder="${R ? 'Например: Qazaq Orbital' : 'e.g. Qazaq Orbital'}">
      ${sv ? `<p class="muted">${R ? `Прогресс «${esc(sv.name)}» (${sv.total} ${PTS()}) и пройденные уроки будут стёрты.` : `Progress of “${esc(sv.name)}” (${sv.total} pts) and lessons will be erased.`}</p>` : ''}
      <div class="row"><button class="btn" data-act="closeModal">${T(U.back)}</button><button class="btn big" data-act="createGame">▶ ${R ? 'Начать' : 'Start'}</button></div>`);
    setTimeout(() => $('#agname') && $('#agname').focus(), 50);
  }
  function createGame() {
    const name = (($('#agname') || {}).value || '').trim() || (ru() ? 'Агентство' : 'Agency');
    lsSet('orbital4-save', { name, total: 0, flights: [] }); lsSet('orbital4-lessons', {});
    closeModal(); setScreen('missions');
  }

  /* ================= MISSIONS ================= */
  function vMissions() {
    const sv = getSave() || { name: '—', total: 0, flights: [] }, R = ru();
    const best = {}; sv.flights.forEach((f) => { best[f.m] = Math.max(best[f.m] ?? -Infinity, f.score); });
    app().innerHTML = `<section class="wrap"><div class="agency"><div><p class="eyebrow">${R ? 'Агентство' : 'Agency'}</p><h2>${esc(sv.name)}</h2></div><div class="scorebox"><span>${R ? 'Общий счёт' : 'Total score'}</span><b>${sv.total}</b></div></div>
      <h2 class="h">${T(U.choose)}</h2><div class="carts">
      ${Object.entries(OD.MISSIONS).map(([id, m]) => `<button class="cart" data-mission="${id}">
        <span class="ico">${ICON[m.icon]}</span>
        <h3>${T(m.name)}</h3><p>${T(m.goal)}</p>
        <div class="tags"><span>${T(U.budget)} ${M(m.budget)}</span><span>${T(U.season)}: ${T(U.day)} ${m.season}</span>${id === 'crops' ? `<span class="gold">★ ${R ? 'для первого раза' : 'start here'}</span>` : ''}${best[id] != null ? `<span class="gold">${T(U.best)} ${best[id]}</span>` : ''}</div></button>`).join('')}
      </div>
      ${sv.flights.length ? `<div class="panel"><h4>${R ? 'Журнал полётов' : 'Flight log'}</h4><div class="journal">${sv.flights.slice(-8).reverse().map((f, i) => `<div><span>#${sv.flights.length - i} ${ICON[OD.MISSIONS[f.m].icon]} ${T(OD.MISSIONS[f.m].name)}</span><b class="g-${f.grade}">${f.grade}</b><b class="${f.score < 0 ? 'red' : ''}">${sgn(f.score)}</b></div>`).join('')}</div></div>` : ''}
      <div class="row"><button class="btn" data-go="title">← ${T(U.back)}</button></div></section>`;
  }

  /* ================= HANGAR (guided: one decision at a time) ================= */
  let hstep = 0;
  const HS = [
    { n: L('Орбита', 'Orbit'), q: L('Где будет летать спутник?', 'Where will the satellite fly?') },
    { n: L('Прибор', 'Instrument'), q: L('Чем он будет смотреть на Землю?', 'What will it look at Earth with?') },
    { n: L('Энергия', 'Power'), q: L('Сколько солнечных панелей поставить?', 'How many solar panels?') },
    { n: L('Связь', 'Link'), q: L('Как данные попадут на Землю?', 'How will the data get to Earth?') },
    { n: L('Ракета', 'Rocket'), q: L('На чём летим и проверяем ли спутник перед стартом?', 'Which rocket, and do we test before launch?') }
  ];
  function problems(c) {   // warnings only — nothing blocks the launch, but everything has a price
    const d = design, bad = [], R = ru();
    if (!d.instr.length) bad.push([1, R ? 'Нет ни одного прибора — спутник ничего не снимет, науки не будет.' : 'No instrument — the satellite captures nothing, no science.']);
    if (c.whOrbit < 0) bad.push([2, R ? 'Энергии не хватает — батарея будет садиться, приборы будут отключаться.' : 'Not enough power — the battery will drain and instruments will shut off.']);
    if (c.cap === 0) bad.push([4, R ? 'Эта ракета не рассчитана на выбранную орбиту — полёт провалится (−1000).' : 'This rocket cannot reach your orbit — the flight will fail (−1000).']);
    else if (c.mass > c.cap) bad.push([4, R ? `Перевес ${c.mass - c.cap} ${kg()}: штраф ${-15 * (c.mass - c.cap)} и шанс успешного старта всего ${Math.round(relEff(c) * 100)}%.` : `Overweight by ${c.mass - c.cap} kg: ${-15 * (c.mass - c.cap)} pts and only a ${Math.round(relEff(c) * 100)}% chance of a good launch.`]);
    if (c.cost > c.m.budget) bad.push([-1, R ? `Перерасход ${M(c.cost - c.m.budget)}: штраф −${Math.round(60 * (c.cost - c.m.budget))} очков.` : `Over budget by ${M(c.cost - c.m.budget)}: −${Math.round(60 * (c.cost - c.m.budget))} pts.`]);
    return bad;
  }
  function scoreLine(c) {
    const t = tally(c, 0, null);
    return `<div class="scoreline"><span>${ru() ? 'Счёт ещё до старта' : 'Score before launch'}:</span>${t.rows.map(([n, v]) => `<i class="${v < 0 ? 'neg' : 'pos'}">${sgn(v)} · ${n}</i>`).join('') || `<i>0</i>`}<b class="${t.total < 0 ? 'red' : 'grn'}">${sgn(t.total)}</b></div>`;
  }
  function linkInfo(c, radio = c.r) {
    const O = c.O, gbMax = Math.max(0.5, ...c.ins.map((x) => x.gb));
    const st = OD.GROUND[design.ground].st.map((k) => OD.STATIONS[k]).concat(design.kz ? [OD.STATIONS.astana] : []);
    const geoSeen = !O.geo || st.some((x) => SIM.gc(0, O.lon, x.lat, x.lon) < O.vis);
    return { shots: Math.floor(radio.rate * (O.geo ? 60 : O.passMin) / gbMax), n: st.length, geoSeen, passMin: Math.round(O.passMin) };
  }
  function advise(c) {
    const d = design, r = ru();
    if (hstep === 0) { const h = c.m.orbitHint[d.orbit]; return [h[0], T(h[1])]; }
    if (hstep === 1) {
      if (!d.instr.length) return ['ok', r ? 'Выбери прибор. Каждый прибор стоит денег, добавляет вес и дни сборки — бери только нужное.' : 'Pick an instrument. Each one costs money, weight and build days — take only what you need.'];
      const best = d.instr.map((id) => [c.m.rel[id] || 0, id]).sort((a, b) => b[0] - a[0])[0], nm = T(OD.INSTR[best[1]].name);
      const night = d.instr.every((id) => OD.INSTR[id].optical) ? (r ? ' Но помни: ему нужен дневной свет — ночью он слеп.' : ' But remember: it needs daylight — it is blind at night.') : '';
      const two = d.instr.length > 1 ? (r ? ' Два прибора — это больше науки, но дольше сборка и тяжелее спутник.' : ' Two instruments mean more science, but a longer build and a heavier satellite.') : '';
      if (best[0] >= 1) return ['good', (r ? `«${nm}» — главный прибор для этой цели.` : `The ${nm} is the key instrument for this goal.`) + night + two];
      if (best[0] > 0) return ['ok', (r ? `«${nm}» помогает, но это не главный прибор для этой цели. Перечитай задание миссии.` : `The ${nm} helps, but it is not the key instrument here. Re-read the mission goal.`) + night];
      return ['bad', r ? 'Эти приборы не отвечают на вопрос миссии — очков не будет.' : 'These instruments do not answer the mission question — no points.'];
    }
    if (hstep === 2) {
      const ecl = c.O.geo ? 0 : Math.round(c.O.eclFrac * c.O.period / 60), per = Math.round(c.O.period / 60);
      const why = c.O.geo ? '' : (r ? ` Каждый виток (${per} мин) спутник около ${ecl} мин летит в тени Земли — там панели не работают, и он живёт на батарее.` : ` Every orbit (${per} min) the satellite spends about ${ecl} min in Earth's shadow — panels are dead there and it runs on battery.`);
      if (c.whOrbit < 0) return ['bad', (r ? `Не хватит! Спутнику нужно ${c.need} Вт.` : `Not enough! The satellite needs ${c.need} W.`) + why];
      if (c.whOrbit < 80) return ['ok', (r ? 'Хватает впритык.' : 'Barely enough.') + why];
      return ['good', (r ? 'Энергии хватает с запасом.' : 'Plenty of power.') + why];
    }
    if (hstep === 3) {
      const li = linkInfo(c);
      if (!li.geoSeen) return ['bad', r ? 'Геостационарный спутник висит над одной точкой, и ни одна из выбранных станций его не видит. Данные не попадут на Землю! Добавь сеть NASA или станцию в Астане.' : 'A GEO satellite hovers over one spot and none of your stations can see it. Data will never reach Earth! Add the NASA network or the Astana station.'];
      const pass = c.O.geo ? '' : (r ? `Спутник видит станцию всего около ${li.passMin} минут за пролёт. ` : `The satellite sees a station for only about ${li.passMin} minutes per pass. `);
      if (li.shots < 1) return ['bad', pass + (r ? 'С этим радио за пролёт не успеет скачаться даже один снимок.' : 'With this radio not even one image downloads per pass.')];
      if (li.n <= 2) return ['ok', pass + (r ? `За это время скачается до ${li.shots} снимков. Но станций всего ${li.n} — снимки будут долго ждать в памяти, а у целей есть дедлайн.` : `Up to ${li.shots} images download in that time. But with only ${li.n} stations, images wait long in memory — and targets have deadlines.`)];
      return ['good', pass + (r ? `За это время скачается до ${li.shots} снимков, а станций ${li.n} — данные быстро попадут на Землю.` : `Up to ${li.shots} images download in that time, and with ${li.n} stations data gets down fast.`)];
    }
    if (c.cap === 0) return ['bad', r ? 'Эта ракета не рассчитана на выбранную орбиту. Запустить можно, но она не долетит: полёт провалится и ты потеряешь 1000 очков.' : 'This rocket is not built for your orbit. You may launch, but it will fall short: the flight fails and you lose 1000 points.'];
    if (c.mass > c.cap) return ['bad', r ? `Спутник весит ${c.mass} ${kg()}, а ракета рассчитана на ${c.cap}. Лететь можно, но за каждый лишний кг −15 очков, а шанс успешного старта падает до ${Math.round(relEff(c) * 100)}%.` : `The satellite weighs ${c.mass} kg but the rocket is rated for ${c.cap}. You can fly, but each extra kg costs 15 points and the chance of a good launch drops to ${Math.round(relEff(c) * 100)}%.`];
    const when = r ? `Спутник будет готов на ${c.buildDays}-й день, ближайший старт этой ракеты — день ${c.win}, сезон начинается на ${c.m.season}-й.` : `Ready on day ${c.buildDays}; this rocket's next launch is day ${c.win}; the season starts on day ${c.m.season}.`;
    if (c.late) return ['bad', when + (r ? ` Опоздание на ${c.late} дн. — будет штраф. Меньше приборов, без испытаний или другая ракета.` : ` ${c.late} days late — a penalty. Fewer instruments, skip tests, or another rocket.`)];
    if (!design.vib || !design.tvac) return ['ok', when + (r ? ' Успеваем, но без испытаний дефекты всплывут уже на орбите.' : ' On time, but without tests defects show up in orbit.')];
    return ['good', when + (r ? ' Успеваем!' : ' On time!')];
  }
  function vHangar() {
    const c = calc(), d = design, r = ru(), W = r ? 'Вт' : 'W', dn = r ? 'дн.' : 'd';
    const opt = (group, id, label, sub, sel) => `<button class="opt ${sel ? 'sel' : ''}" data-set="${group}" data-v="${id}"><b>${label}</b>${sub ? `<small>${sub}</small>` : ''}</button>`;
    const bad = problems(c), adv = advise(c), last = hstep === HS.length - 1;
    let cards = '';
    if (hstep === 0) cards = `<div class="opts">${Object.entries(OD.ORBITS).map(([id, o]) => opt('orbit', id, T(o.name), T(o.desc), d.orbit === id)).join('')}</div>`;
    if (hstep === 1) cards = `<div class="opts">${Object.entries(OD.INSTR).map(([id, x]) => opt('instr', id, T(x.name), `${T(x.desc)}<br><i class="nums">${M(x.cost)} · ${x.days} ${dn} ${r ? 'сборки' : 'to build'}</i>`, d.instr.includes(id))).join('')}</div>`;
    if (hstep === 2) cards = `<div class="opts three">${Object.entries(OD.POWER).map(([id, x]) => opt('power', id, T(x.name), `${x.gen} ${W} ${r ? 'на солнце' : 'in sunlight'}<br><i class="nums">${M(x.cost)}</i>`, d.power === id)).join('')}</div>`;
    if (hstep === 3) cards = `<h4>${r ? 'Радио на спутнике' : 'Radio on board'}</h4><div class="opts three">${Object.entries(OD.RADIO).map(([id, x]) => opt('radio', id, T(x.name), `${linkInfo(c, x).shots < 1 ? (r ? 'меньше 1 снимка за пролёт' : 'less than 1 image per pass') : (r ? 'до ' : 'up to ') + linkInfo(c, x).shots + (r ? ' снимков за пролёт' : ' images per pass')}<br><i class="nums">${M(x.cost)}</i>`, d.radio === id)).join('')}</div>
      <h4>${r ? 'Станции на Земле' : 'Stations on the ground'}</h4><div class="opts three">${Object.entries(OD.GROUND).map(([id, x]) => opt('ground', id, T(x.name), `${T(x.desc)}<br><i class="nums">${x.cost ? M(x.cost) : (r ? 'бесплатно' : 'free')}</i>`, d.ground === id)).join('')}${opt('kz', 'kz', T(OD.KZ_STATION.name), `<i class="nums">${M(OD.KZ_STATION.cost)}</i>`, d.kz)}</div>`;
    if (hstep === 4) cards = `<div class="opts">${Object.entries(OD.ROCKETS).map(([id, x]) => opt('rocket', id, `${T(x.name)} · ${M(x.cost)}`, `${x.cap[d.orbit] ? (r ? `поднимет ${x.cap[d.orbit]} ${kg()}` : `lifts ${x.cap[d.orbit]} kg`) : (r ? '✕ не летает на эту орбиту' : '✕ cannot reach this orbit')} · ${r ? 'надёжность' : 'reliability'} ${Math.round(x.rel * 100)}%<br><i class="nums">${r ? 'старты в дни' : 'launch days'}: ${x.win.join(', ')}</i>`, d.rocket === id)).join('')}</div>
      <h4>${r ? 'Испытания (можно пропустить, но это риск)' : 'Tests (optional, but skipping is risky)'}</h4><div class="opts">${Object.entries(OD.TESTS).map(([id, x]) => opt(id, id, `${d[id] ? '☑' : '☐'} ${T(x.name)} · ${x.days} ${dn} · ${M(x.cost)}`, T(x.desc), d[id])).join('')}</div>`;
    const O = c.O;
    app().innerHTML = `<section class="hangar">
      <div class="hbar">
        ${meter(r ? '💰 Деньги' : '💰 Money', `${M(c.cost)} ${r ? 'из' : 'of'} ${M(c.m.budget)}`, c.cost / c.m.budget, c.cost > c.m.budget ? 'bad' : c.cost > 0.9 * c.m.budget ? 'warn' : '')}
        ${meter(r ? '⚖ Вес' : '⚖ Weight', c.cap ? `${c.mass} ${r ? 'из' : 'of'} ${c.cap} ${kg()}` : `${c.mass} ${kg()}`, c.cap ? c.mass / c.cap : 1, !c.cap || c.mass > c.cap ? 'bad' : c.mass > 0.9 * c.cap ? 'warn' : '')}
        ${meter(r ? '⚡ Энергия' : '⚡ Power', c.whOrbit < 0 ? (r ? 'не хватает ✕' : 'not enough ✕') : c.whOrbit < 80 ? (r ? 'впритык' : 'tight') : (r ? 'хватает ✓' : 'enough ✓'), clamp(0.5 + c.whOrbit / 400), c.whOrbit < 0 ? 'bad' : c.whOrbit < 80 ? 'warn' : '')}
        ${meter(r ? '🕒 Срок' : '🕒 Schedule', `${r ? 'старт' : 'launch'} ${c.win} · ${r ? 'сезон' : 'season'} ${c.m.season}`, c.win / Math.max(c.m.season, c.win), c.late ? 'bad' : '', c.late ? (r ? `опоздание ${c.late} дн.` : `${c.late} days late`) : (r ? 'успеваем ✓' : 'on time ✓'))}
      </div>
      ${scoreLine(c)}
      <div class="hgrid">
        <div class="bay"><h2 class="h">${T(c.m.name)}</h2><p class="goal">🎯 ${T(c.m.goal)}</p><canvas id="satcv" width="160" height="100"></canvas>
          <div class="advisor ${adv[0]}"><b>${r ? 'ИНЖЕНЕР МИССИИ' : 'MISSION ENGINEER'} ${adv[0] === 'good' ? '👍' : adv[0] === 'bad' ? '⛔' : '🤔'}</b><p>${adv[1]}</p></div>
          <details class="facts"><summary>${r ? 'Цифры для любопытных' : 'Numbers for the curious'}</summary>
            <div><span>${T(U.period)}</span><b>${(O.period / 60).toFixed(1)} ${T(U.min)}</b></div>
            <div><span>${T(U.perDay)}</span><b>${(86400 / O.period).toFixed(1)}</b></div>
            <div><span>${T(U.shadow)}</span><b>${O.geo ? '—' : Math.round(O.eclFrac * O.period / 60) + ' ' + T(U.min)}</b></div>
            <div><span>${T(U.reach)}</span><b>±${Math.round(O.ftpPassive * SIM.RE)} ${T(U.km)}</b></div>
            <div><span>${r ? 'Потребление' : 'Consumption'}</span><b>${c.need} ${W}</b></div>
          </details></div>
        <div class="parts">
          <div class="hsteps">${HS.map((x, i) => `<button class="hs ${i === hstep ? 'on' : ''} ${bad.some((b) => b[0] === i) ? 'err' : ''}" data-hstep="${i}">${i + 1}. ${T(x.n)}</button>`).join('')}</div>
          <h3 class="q">${T(HS[hstep].q)}</h3>
          ${cards}
          ${bad.filter((b) => last || b[0] === hstep || b[0] === -1).length ? `<div class="errs">${bad.filter((b) => last || b[0] === hstep || b[0] === -1).map((b) => `<p>⚠ ${b[1]}</p>`).join('')}</div>` : ''}
          <div class="row">${hstep ? `<button class="btn" data-hstep="${hstep - 1}">← ${T(U.back)}</button>` : `<button class="btn" data-go="missions">← ${T(U.back)}</button>`}
            ${last ? `<button class="btn big" data-act="startBuild">${T(U.startBuild)} ▶</button>` : `<button class="btn big" data-hstep="${hstep + 1}">${r ? 'ДАЛЬШЕ' : 'NEXT'} ▶</button>`}</div>
        </div></div></section>`;
    drawSat($('#satcv'), d);
  }
  function meter(label, val, ratio, cls = '', sub = '') {
    return `<div class="meter ${cls}"><div class="mt"><span>${label}</span><b>${val}</b></div><div class="bar"><i style="width:${clamp(ratio) * 100}%"></i></div>${sub ? `<small>${sub}</small>` : ''}</div>`;
  }
  function drawSat(cv, d) {
    const x = cv.getContext('2d'); x.imageSmoothingEnabled = false; x.clearRect(0, 0, 160, 100);
    for (let i = 0; i < 40; i++) { x.fillStyle = i % 5 ? '#3a4466' : '#8b9bb4'; x.fillRect((i * 37) % 160, (i * 53) % 100, 1, 1); }
    const P = PX.PAL, R = (c, a, b, w, h) => { x.fillStyle = c; x.fillRect(a, b, w, h); };
    const pw = { s: 1, m: 2, l: 3 }[d.power] || 0;
    for (const side of [-1, 1]) {
      R(P.s, side < 0 ? 52 : 104, 48, 4, 2);
      for (let i = 0; i < pw + 1; i++) { const px = side < 0 ? 52 - (i + 1) * 13 : 108 + i * 13; R(P.b, px, 38 - pw * 2, 12, 22 + pw * 4); R(P.B, px + 1, 39 - pw * 2, 10, 1); for (let j = 0; j < 4 + pw; j++) R(P.D, px, 42 - pw * 2 + j * 5, 12, 1); }
    }
    R(P.G, 56, 34, 48, 32); R(P.g, 57, 35, 46, 30); R(P.Y, 57, 35, 46, 2); R(P.G, 57, 49, 46, 1);
    // antenna
    const ant = { s: 0, x: 1, ka: 2 }[d.radio];
    R(P.s, 79, 24 - ant * 2, 2, 10 + ant * 2);
    if (ant === 0) R(P.w, 78, 20, 4, 4); else { const w = 8 + ant * 6; R(P.w, 80 - w / 2, 22 - ant * 3, w, 2); R(P.s, 80 - w / 2 + 2, 24 - ant * 3, w - 4, 2); }
    // instruments under the bus
    const slots = { imager: [62, 'c'], thermal: [72, 'r'], spectro: [82, 'p'], radar: [92, 'w'], lidar: [66, 'e'] };
    d.instr.forEach((id, i) => { const sx = 80 - d.instr.length * 9 + i * 18; R(P.d, sx, 66, 14, 8); R(P.k, sx + 1, 67, 12, 6); R(P[slots[id][1]], sx + 4, 73, 6, 3); });
    if (d.instr.length) { x.fillStyle = 'rgba(95,224,255,0.12)'; x.beginPath(); x.moveTo(64, 76); x.lineTo(30, 100); x.lineTo(130, 100); x.lineTo(96, 76); x.fill(); }
  }

  /* ================= BUILD (assembly timeline) ================= */
  function startBuild() {
    const c = calc();
    const evs = [];
    const pool = ['supplier', 'overtime', 'lucky', 'budget'];
    const first = pool.splice(Math.floor(Math.random() * pool.length), 1)[0], second = pick(pool);
    evs.push({ day: Math.round(rnd(4, c.buildDays * 0.4)), id: first }, { day: Math.round(rnd(c.buildDays * 0.45, c.buildDays * 0.75)), id: second });
    const testStart = Math.max(c.laneA, c.laneB) + 6;
    if (design.vib) evs.push({ day: testStart + 2, id: 'vibFind' });
    if (design.tvac) evs.push({ day: testStart + (design.vib ? OD.TESTS.vib.days : 0) + 3, id: 'tvacFind' });
    evs.sort((a, b) => a.day - b.day);
    build = { day: 0, plan: c.buildDays, delay: 0, extra: 0, events: evs, log: [], defects: { panel: !design.vib, glitch: !design.tvac } };
    setScreen('build');
  }
  const BEV = {
    supplier: () => { const part = pick(design.instr.map((i) => T(OD.INSTR[i].name)).concat([T(OD.POWER[design.power].name)])); return { t: ru() ? `Поставщик задерживает: ${part}` : `Supplier delay: ${part}`, d: ru() ? 'Деталь придёт на 5 дней позже.' : 'The part will arrive 5 days late.', ch: [[ru() ? 'Ускорить за $2M' : 'Expedite for $2M', () => { build.extra += 2; return ru() ? 'Заплатили — сроки сохранены.' : 'Paid — schedule kept.'; }, 2], [ru() ? 'Ждать +5 дней' : 'Wait +5 days', () => { build.delay += 5; return ru() ? 'Сборка сдвинулась на 5 дней.' : 'Assembly slips 5 days.'; }]] }; },
    overtime: () => ({ t: ru() ? 'Команда готова работать в выходные' : 'The team offers weekend shifts', d: ru() ? 'Минус 3 дня сборки, но нужно оплатить переработки.' : '3 days faster, but overtime must be paid.', ch: [[ru() ? 'Да, за $1M' : 'Yes, for $1M', () => { build.extra += 1; build.delay -= 3; return ru() ? 'Сборка ускорилась на 3 дня.' : 'Assembly 3 days faster.'; }, 1], [ru() ? 'Нет, отдыхайте' : 'No, rest', () => (ru() ? 'Команда отдохнула.' : 'The team rested.')]] }),
    lucky: () => ({ t: ru() ? 'Хорошие новости!' : 'Good news!', d: ru() ? 'Партия солнечных элементов пришла раньше срока.' : 'Solar cells arrived early.', ch: [[ru() ? 'Отлично (−2 дня)' : 'Great (−2 days)', () => { build.delay -= 2; return ru() ? 'Сборка на 2 дня быстрее.' : '2 days faster.'; }]] }),
    budget: () => ({ t: ru() ? 'Подорожал алюминий' : 'Aluminium price spike', d: ru() ? 'Корпус обойдётся дороже.' : 'The structure costs more.', ch: [[ru() ? 'Заплатить $2M' : 'Pay $2M', () => { build.extra += 2; return ru() ? 'Бюджет уменьшился.' : 'Budget reduced.'; }, 0], [ru() ? 'Облегчённый корпус (+4 дня)' : 'Lighter redesign (+4 days)', () => { build.delay += 4; return ru() ? 'Перепроектировали — 4 дня.' : 'Redesigned — 4 days.'; }]] }),
    vibFind: () => ({ t: ru() ? 'Вибротест нашёл трещину!' : 'Vibration test found a crack!', d: ru() ? 'Крепление солнечной панели треснуло на тряске. Хорошо, что на Земле.' : 'A panel hinge cracked on the shaker. Good thing it was on Earth.', ch: [[ru() ? 'Починить (+2 дня)' : 'Fix it (+2 days)', () => { build.delay += 2; return ru() ? 'Панель починена. Раскроется на орбите.' : 'Fixed. It will deploy in orbit.'; }], [ru() ? 'Не чинить' : 'Leave it', () => { build.defects.panel = true; return ru() ? 'Риск: панель может не раскрыться.' : 'Risk: the panel may not deploy.'; }]] }),
    tvacFind: () => ({ t: ru() ? 'Термовакуум: прибор сбоит на холоде' : 'TVAC: instrument glitches when cold', d: ru() ? 'В камере −150 °C электроника прибора перезагружается.' : 'At −150 °C the instrument electronics reboot.', ch: [[ru() ? 'Добавить подогрев (+3 дня)' : 'Add a heater (+3 days)', () => { build.delay += 3; return ru() ? 'Подогреватель установлен.' : 'Heater installed.'; }], [ru() ? 'Оставить как есть' : 'Leave it', () => { build.defects.glitch = true; return ru() ? 'Риск: прибор будет сбоить на орбите.' : 'Risk: the instrument will glitch in orbit.'; }]] })
  };
  function buildEnd() { return build.plan + build.delay; }
  function vBuild() {
    const c = calc(), end = buildEnd(), win = nextWindow(c.k, end), axis = Math.max(win, c.m.season) + 8;
    const pct = (x) => (x / axis) * 100;
    const lanes = [];
    let a = 0; design.instr.forEach((id) => { const x = OD.INSTR[id]; lanes.push([T(x.name), a, x.days, 'c', 0]); a += x.days; });
    let b = 0; [[T(OD.POWER[design.power].name), OD.POWER[design.power].days], [T(OD.RADIO[design.radio].name), OD.RADIO[design.radio].days], [T(U.bus), OD.BUS.days]].forEach(([n, dd]) => { lanes.push([n, b, dd, 'y', 1]); b += dd; });
    let s = Math.max(c.laneA, c.laneB);
    lanes.push([T(U.integ), s, 6, 'p', 2]); s += 6;
    if (design.vib) { lanes.push([T(OD.TESTS.vib.name), s, OD.TESTS.vib.days, 'e', 3]); s += OD.TESTS.vib.days; }
    if (design.tvac) { lanes.push([T(OD.TESTS.tvac.name), s, OD.TESTS.tvac.days, 'e', 4]); s += OD.TESTS.tvac.days; }
    if (build.delay > 0) lanes.push([T(U.delay), s, build.delay, 'r', 5]);
    if (build.delay < 0) lanes.push([ru() ? 'Ускорение' : 'Speed-up', s + build.delay, -build.delay, 'e', 5]);
    const done = build.day >= end;
    const ticks = c.k.win.filter((w) => w <= axis).map((w) => `<i class="win" style="left:${pct(w)}%"><span>🚀${w}</span></i>`).join('');
    app().innerHTML = `<section class="wrap build">
      <div class="bhead"><h2 class="h">${T(U.build)} · ${T(c.m.name)}</h2>
        <div class="clock"><span>${T(U.day)}</span><b>${String(build.day).padStart(3, '0')}</b></div></div>
      <div class="gantt">
        <div class="axis">${ticks}<i class="seasonf" style="left:${pct(c.m.season)}%"><span>⚑ ${T(U.seasonFlag)} ${c.m.season}</span></i><i class="now" style="left:${pct(build.day)}%"></i></div>
        ${lanes.map(([n, st, du, col]) => { const w = Math.abs(du), p = clamp((build.day - st) / Math.max(1, w)); return `<div class="lane"><span>${n}</span><div class="track"><i class="plan c-${col}" style="left:${pct(st)}%;width:${pct(w)}%"><b style="width:${p * 100}%"></b></i></div></div>`; }).join('')}
      </div>
      <div class="bstat"><span>${T(U.ready)}: ${T(U.day)} <b>${end}</b></span><span>${T(U.launchDay)}: ${T(U.day)} <b>${win}</b> (${T(c.k.name)})</span><span class="${win > c.m.season ? 'red' : 'grn'}">${T(U.season)}: ${T(U.day)} ${c.m.season}${win > c.m.season ? ` · ${T(U.late)} ${win - c.m.season}` : ' ✓'}</span><span>${T(U.budget)}: ${M(c.cost + build.extra)} / ${M(c.m.budget)}</span></div>
      <p class="muted">${ru() ? 'Детали собираются в два потока, затем интеграция и испытания. Листай дни и успей к окну запуска 🚀 до начала сезона ⚑.' : 'Parts are built in two lanes, then integrated and tested. Skip days and make a launch window 🚀 before the season starts ⚑.'}</p>
      <div class="log">${build.log.slice(-4).map((l) => `<p>${l}</p>`).join('')}</div>
      <div class="row">${done ? `<span></span><button class="btn big blink" data-act="toLaunch">⏭ ${T(U.waitWindow)} (${T(U.day)} ${win})</button>` : `<button class="btn" data-act="bday">+1 ${ru() ? 'день' : 'day'}</button><button class="btn" data-act="bevent">⏭ ${T(U.toEvent)}</button><button class="btn" data-act="bend">⏩ ${T(U.toEnd)}</button>`}</div>
    </section>`;
  }
  function advanceBuild(mode) {
    const step = () => {
      if (build.day >= buildEnd()) return false;
      build.day++;
      const ev = build.events.find((e) => e.day === build.day && !e.done);
      if (ev) { ev.done = true; render(); showBuildEvent(ev); return false; }
      return true;
    };
    if (mode === 'day') { step(); if (!$('#modal.on')) render(); return; }
    const tick = () => { const go = step(); render(); if (go) setTimeout(tick, mode === 'end' ? 25 : 60); else if (build.day >= buildEnd()) PX.sfx.coin(); };
    tick();
  }
  function showBuildEvent(ev) {
    PX.sfx.alert();
    const e = BEV[ev.id](), left = calc().m.budget - calc().cost - build.extra;
    modal(`<h3>⚠ ${e.t}</h3><p>${e.d}</p><div class="row">${e.ch.map((c, i) => `<button class="btn" data-bev="${i}" >${c[0]}</button>`).join('')}</div>`);
    document.querySelectorAll('[data-bev]').forEach((b) => (b.onclick = () => { const res = e.ch[+b.dataset.bev][1](); build.log.push(`${T(U.day)} ${build.day}: ${e.t} → ${res}`); closeModal(); PX.sfx.click(); render(); }));
  }

  /* ================= LAUNCH (video) ================= */
  function launchFailText(c) {
    const R = ru();
    if (!c.cap) return R ? 'Ракета не рассчитана на эту орбиту — топлива не хватило.' : 'The rocket was not built for this orbit — it ran out of fuel.';
    if (c.mass > c.cap) return R ? `Перевес ${c.mass - c.cap} ${kg()}: двигателям не хватило тяги.` : `Overweight by ${c.mass - c.cap} kg: the engines could not cope.`;
    return R ? `Надёжность ракеты ${Math.round(c.k.rel * 100)}% — в этот раз не повезло. Так бывает и в реальности.` : `Rocket reliability is ${Math.round(c.k.rel * 100)}% — unlucky this time. It happens for real too.`;
  }
  function launchEnd(fail) {
    launchT.splice(0).forEach(clearTimeout);
    const c = calc(), v = $('#lvid'), sec = $('.launch'); if (!sec) return;
    if (fail) { if (v) v.pause(); sec.classList.add('failed'); PX.sfx.boom(); $('#lcount').textContent = T(U.lost); $('#lmsg').textContent = launchFailText(c); $('#lbtn').innerHTML = `<button class="btn big" data-act="failDebrief">▶ ${ru() ? 'К итогам' : 'To debrief'}</button>`; }
    else { PX.sfx.win(); $('#lcount').textContent = T(U.orbitOk); $('#lbtn').innerHTML = `<button class="btn big blink" data-act="toOps">▶ ${T(U.toMCC)}</button>`; }
  }
  function vLaunch() {
    const c = calc(), rel = relEff(c), fail = Math.random() > rel;
    run = { launchFail: fail };
    app().innerHTML = `<section class="launch"><video id="lvid" src="assets/videos/launch.mp4" muted playsinline preload="auto"></video><div class="lshade"></div>
      <div class="lhud"><p id="lmsg">${T(c.k.name)} → ${T(c.o.name)} · ${ru() ? 'шанс успеха' : 'success chance'} ${Math.round(rel * 100)}%</p><h2 id="lcount">T−3</h2></div>
      <div class="row center" id="lbtn"><button class="btn small" data-act="skipLaunch">${ru() ? 'Пропустить' : 'Skip'} ⏭</button></div></section>`;
    let n = 3;
    const tick = () => {
      n--;
      if (n > 0) { $('#lcount').textContent = 'T−' + n; launchT.push(setTimeout(tick, 900)); return; }
      $('#lcount').textContent = ru() ? 'ПУСК' : 'LIFTOFF'; PX.sfx.launch();
      const v = $('#lvid'); $('.launch').classList.add('playing');
      try { v.currentTime = 0; const p = v.play(); if (p && p.catch) p.catch(() => {}); } catch (e) {}
      launchT.push(setTimeout(() => launchEnd(fail), fail ? 4500 : 9000));
    };
    launchT.push(setTimeout(tick, 900));
  }

  /* ================= OPS (arcade flight) ================= */
  const SPEEDS = [0, 60, 600, 3600];
  const OPS_DAYS = 5;
  function startOps() {
    const c = calc(), m = c.m, O = c.O;
    const epoch = Date.parse(m.date + 'T00:00:00Z') + c.late * 864e5;
    const gmst0 = 0, raan0 = SIM.raanFor(epoch, gmst0) + (design.orbit === 'sso' ? 0 : rnd(0, 6.28));
    const stations = OD.GROUND[design.ground].st.map((k) => ({ id: k, ...OD.STATIONS[k] }));
    if (design.kz) stations.push({ id: 'astana', ...OD.STATIONS.astana });
    // pre-generate targets
    const targets = []; let t = rnd(0.3, 1.5) * 3600, id = 0;
    while (t < OPS_DAYS * 86400 - 3 * 3600) { const pl = pick(m.places); targets.push({ id: id++, lat: pl[0] + rnd(-2, 2), lon: pl[1] + rnd(-3, 3), name: pl[2], t0: t, ttl: m.ttl * 3600, st: 'wait', reach: false, dark: false }); t += -Math.log(1 - Math.random()) * m.every * 3600; }
    const events = [{ id: 'storm', at: rnd(0.8, 2.5) * 86400, warn: 3 * 3600 }, { id: 'debris', at: rnd(2.2, 4.2) * 86400, warn: 1.5 * 3600 }];
    if (build.defects.glitch) events.push({ id: 'glitch', at: rnd(0.5, 4) * 86400, warn: 0 });
    const panelFail = build.defects.panel && Math.random() < 0.5;
    run = { c, O, epoch, gmst0, raan0, stations, targets, events, t: 0, speed: 2, sci: true, safeUntil: 0, lowBatt: false,
      batt: c.p.batt * 0.9, battMax: c.p.batt, gen: c.p.gen * (panelFail ? 0.55 : 1), panelFail, mem: [], memMax: OD.MEMORY_GB,
      score: 0, combo: 0, maxCombo: 0, fuel: 2, glitchUntil: 0, track: [], gbDown: 0, lastLink: null, slowFor: new Set(), memFullHits: 0, safeHours: 0, battMin: 1,
      floaters: [], log: [], over: false, paused: false, lastNight: -1, prevReach: false };
    run.p = pos(0); run.s = SIM.sun(epoch, 0); run.shadow = false;
    setScreen('ops');
  }

  function vOps() {
    const r = run, m = r.c.m;
    app().innerHTML = `<section class="ops">
      <div class="otop">
        <div class="clock"><span id="oday"></span><b id="otime"></b><small id="odate"></small></div>
        <div class="speeds">${['⏸', '▶', '▶▶', '▶▶▶'].map((s, i) => `<button class="sp" data-speed="${i}">${s}<small>${i ? ['', '×60', '×600', '×3600'][i] : ''}</small></button>`).join('')}<button class="sp" data-act="skipNext">⏭<small>${ru() ? 'к цели' : 'to target'}</small></button></div>
        <div class="scorebox"><span>${T(U.score)}</span><b id="oscore">0</b><small id="ocombo"></small></div>
      </div>
      <div id="coach" class="coach"></div>
      <div class="ogrid">
        <div class="mapwrap"><canvas id="map" width="${MW}" height="${MH}"></canvas><div id="floaters"></div><div id="banner"></div></div>
        <aside class="side">
          <h4>${T(U.targets)} · ${T(m.name)}</h4><div id="tlist" class="tlist"></div>
        </aside>
      </div>
      <div class="obottom">
        <div class="gauges">
          <div class="meter" id="gbatt"><div class="mt"><span>${T(U.batt)} <i id="sunico"></i></span><b id="vbatt"></b></div><div class="bar"><i></i></div></div>
          <div class="meter" id="gmem"><div class="mt"><span>${T(U.mem)}</span><b id="vmem"></b></div><div class="bar"><i></i></div></div>
          <div class="meter" id="glink"><div class="mt"><span>${T(U.link)}</span><b id="vlink"></b></div><div class="bar"><i></i></div></div>
        </div>
        <div class="controls">
          <button class="btn capture" id="bcap" data-act="capture" disabled>📸 ${T(U.capture)} <small>[SPACE]</small></button>
        </div>
      </div>
      <p class="help">${T(U.help)} · ${T(U.fuel)}: <b id="vfuel"></b></p>
    </section>`;
    lastFrame = performance.now(); nightT = -1e9;
    if (!r.tutorialShown) {
      r.tutorialShown = true; r.paused = true;
      modal(`<h3>🛰 ${ru() ? 'КАК ИГРАТЬ' : 'HOW TO PLAY'}</h3>
        <p><b>1.</b> ${ru() ? 'Спутник летит сам. Жди, пока цель попадёт в <b>белое кольцо</b> под ним.' : 'The satellite flies by itself. Wait until a target enters the <b>white ring</b> below it.'}</p>
        <p><b>2.</b> ${ru() ? 'Жми <b>ПРОБЕЛ</b> — снимок сделан.' : 'Press <b>SPACE</b> — image captured.'}</p>
        <p><b>3.</b> ${ru() ? 'Очки придут, когда спутник пролетит над <b>станцией</b> (голубое кольцо) и передаст снимок.' : 'You score when the satellite passes a <b>station</b> (blue ring) and sends the image down.'}</p>
        <p class="muted">${ru() ? 'Ждать скучно? Кнопка ⏭ перематывает время. Строка над картой всегда подскажет, что делать.' : 'Bored of waiting? ⏭ skips time. The line above the map always tells you what to do.'}</p>
        <div class="row center"><button class="btn big" data-oev="tut">▶ ${ru() ? 'ПОЕХАЛИ' : 'GO'}</button></div>`);
      $('[data-oev="tut"]').onclick = () => { closeModal(); r.paused = false; PX.sfx.click(); if (r.panelFail) opsEvent({ id: 'panel' }); };
    }
    raf = requestAnimationFrame(opsLoop);
  }

  /* ----- lessons: each concept is explained once, at the moment the player meets it ----- */
  const LESSONS = {
    shadow: [L('Тень Земли', "Earth's shadow"), () => { const O = run.O; return ru() ? `Спутник залетел за Землю: Солнца не видно, панели не работают, батарея садится. Так будет каждый виток — около ${Math.round(O.eclFrac * O.period / 60)} минут из ${Math.round(O.period / 60)}. Вот зачем спутнику батарея и запас энергии.` : `The satellite went behind Earth: no Sun, dead panels, the battery drains. This happens every orbit — about ${Math.round(O.eclFrac * O.period / 60)} of ${Math.round(O.period / 60)} minutes. That is why satellites need batteries and power margin.`; }],
    capture: [L('Снимок в памяти', 'Image in memory'), () => (ru() ? 'Снимок сделан, но он пока лежит в памяти спутника. Очки ты получишь, когда спутник пролетит над наземной станцией (голубое кольцо) и передаст снимок на Землю — до дедлайна цели.' : 'The image is taken but still sits in the satellite memory. You score when the satellite flies over a ground station (blue ring) and sends it down — before the target deadline.')],
    downlink: [L('Данные на Земле!', 'Data on the ground!'), () => (ru() ? 'Станция скачала снимок. Низкий спутник видит станцию лишь несколько минут за пролёт — поэтому важны и скорость радио, и количество станций по миру.' : 'The station downloaded the image. A low satellite sees a station for only minutes per pass — so both radio speed and the number of stations matter.')],
    dark: [L('Камере нужен свет', 'Cameras need light'), () => (ru() ? 'Цель прямо под спутником, но там ночь — камера и спектрометр ничего не видят. Тепловой сканер, радар и лидар работают и в темноте.' : 'The target is right below, but it is night there — cameras and spectrometers see nothing. Thermal scanners, radar and lidar work in the dark.')],
    memfull: [L('Память заполнена', 'Memory full'), () => (ru() ? 'На борту больше нет места. Пока спутник не пролетит над станцией и не сбросит данные, снимать нельзя. Быстрое радио и больше станций решают эту проблему.' : 'No room left on board. Until the satellite passes a station and dumps data, it cannot capture. Faster radio and more stations fix this.')],
    lowbatt: [L('Батарея пуста', 'Battery empty'), () => (ru() ? 'Энергии не хватило, и спутник сам выключил приборы, чтобы выжить. Он включит их, когда зарядится на Солнце. В следующий раз поставь панели побольше.' : 'Power ran out and the satellite switched its instruments off to survive. They come back once it recharges in sunlight. Next time fit bigger panels.')]
  };
  function lesson(id) {
    const seen = lsGet('orbital4-lessons') || {};
    if (seen[id] || !run || run.over || $('#modal.on')) return;
    seen[id] = 1; lsSet('orbital4-lessons', seen);
    run.paused = true; PX.sfx.coin();
    modal(`<p class="ltag">${ru() ? 'УРОК' : 'LESSON'} ${Object.keys(seen).length}/${Object.keys(LESSONS).length}</p><h3>${T(LESSONS[id][0])}</h3><p>${LESSONS[id][1]()}</p><div class="row center"><button class="btn big" data-oev="0">${ru() ? 'ПОНЯТНО' : 'GOT IT'}</button></div>`);
    $('[data-oev="0"]').onclick = () => { closeModal(); run.paused = false; PX.sfx.click(); };
  }
  /* ----- coach: always says what to do right now ----- */
  function canSee(tg, p, s) {
    const m = run.c.m;
    for (const id of design.instr) {
      const ins = OD.INSTR[id]; if (!(m.rel[id] > 0)) continue;
      if (SIM.gc(p.lat, p.lon, tg.lat, tg.lon) > (ins.active ? run.O.ftpActive : run.O.ftpPassive) + m.r / SIM.RE) continue;
      if (ins.optical && SIM.sunElev(tg.lat, tg.lon, s) < 5) continue;
      return true;
    }
    return false;
  }
  function forecast() {
    const r = run, open = r.targets.filter((t) => t.st === 'open');
    if (!open.length) return null;
    for (let dt = 60; dt <= 48 * 3600; dt += 60) {
      const t = r.t + dt, p = pos(t), s = SIM.sun(r.epoch, t);
      for (const tg of open) if (t < tg.t0 + tg.ttl && canSee(tg, p, s)) return { tg, dt };
    }
    return { none: true };
  }
  let fcCache = null, fcAt = 0;
  function coach() {
    const el = $('#coach'), r = run; if (!el) return;
    const R = ru(), skipHint = r.skip ? '' : (R ? ' Жми ⏭ — время перемотается и само остановится.' : ' Press ⏭ — time skips ahead and stops by itself.');
    let k = '', t;
    if (r.canCap) { k = 'hot'; t = R ? `🎯 «${r.canCap.tg.name}» в кольце — жми ПРОБЕЛ!` : `🎯 ${r.canCap.tg.name} is in the ring — press SPACE!`; }
    else if (r.lowBatt) { k = 'bad'; t = R ? '🔋 Батарея пуста — приборы выключены, пока спутник не зарядится на Солнце.' : '🔋 Battery empty — instruments are off until it recharges in sunlight.'; }
    else if (r.safeUntil > r.t) { k = 'bad'; t = R ? '🛡 Безопасный режим: приборы выключены, пережидаем.' : '🛡 Safe mode: instruments off, waiting it out.'; }
    else if (r.glitchUntil > r.t) { k = 'bad'; t = R ? '⚡ Приборы перезагружаются после сбоя.' : '⚡ Instruments are rebooting after a glitch.'; }
    else if (r.mem.length && r.station) t = R ? `📡 Передаём снимки на станцию ${r.station.name}…` : `📡 Sending images to ${r.station.name}…`;
    else if (r.mem.length) t = (R ? `📸 В памяти снимков: ${r.mem.length}. Очки будут, когда спутник пролетит над станцией (голубое кольцо).` : `📸 Images in memory: ${r.mem.length}. You score when the satellite passes a station (blue ring).`) + skipHint;
    else {
      if (performance.now() - fcAt > 1000) { fcAt = performance.now(); fcCache = forecast(); }
      const f = fcCache;
      if (!f) t = (R ? '⌛ Целей пока нет.' : '⌛ No targets yet.') + skipHint;
      else if (f.none) t = (R ? '🚫 Ни одна из нынешних целей не попадёт в кольцо до своего дедлайна: орбита туда не достаёт или там ночь. Ждём новые.' : '🚫 None of the current targets enters the ring before its deadline: the orbit does not reach or it is night there. Wait for new ones.') + skipHint;
      else { const h = Math.floor(f.dt / 3600), mi = Math.round(f.dt % 3600 / 60); t = (R ? `🛰 Следующая цель — «${f.tg.name}», будет в кольце через ${h ? h + ' ч ' : ''}${mi} мин.` : `🛰 Next target — ${f.tg.name}, in the ring in ${h ? h + ' h ' : ''}${mi} min.`) + skipHint; }
    }
    if (el.textContent !== t) el.textContent = t;
    el.className = 'coach ' + k;
  }

  let lastFrame = 0, nightT = -1e9;
  const nightCanvas = document.createElement('canvas'); nightCanvas.width = NW; nightCanvas.height = NH;
  function opsLoop(now) {
    if (screen !== 'ops') return;
    const r = run, dtReal = Math.min(0.1, (now - lastFrame) / 1000); lastFrame = now;
    if (!r.paused && !r.over) {
      let dt = SPEEDS[r.speed] * dtReal; if (r.skip) dt = 7200 * dtReal;
      while (dt > 0 && !r.paused && !r.over) { const h = Math.min(dt, 15); simStep(h); dt -= h; }
    }
    drawMap(); updateHud();
    raf = requestAnimationFrame(opsLoop);
  }

  function pos(t) { return SIM.subPoint(run.O, t, run.raan0, run.gmst0); }
  function capturable(tg, p, s) {
    // best usable instrument for this target right now
    const r = run, m = r.c.m; let best = null;
    if (r.glitchUntil > r.t) return null;
    for (const id of design.instr) {
      const ins = OD.INSTR[id], rel = m.rel[id] || 0; if (!rel) continue;
      const reachAng = (ins.active ? r.O.ftpActive : r.O.ftpPassive) + m.r / SIM.RE;
      if (SIM.gc(p.lat, p.lon, tg.lat, tg.lon) > reachAng) continue;
      if (ins.optical && SIM.sunElev(tg.lat, tg.lon, s) < 5) { tg.dark = true; continue; }
      const q = rel * (r.O.geo ? 0.6 : 1);
      if (!best || q > best.q) best = { id, q, gb: ins.gb };
    }
    return best;
  }

  function simStep(h) {
    const r = run, c = r.c; r.t += h;
    const p = pos(r.t), s = SIM.sun(r.epoch, r.t), shadow = SIM.inShadow(r.O, p, s);
    if (shadow && !r.shadow && r.t > 600) lesson('shadow');
    r.p = p; r.s = s; r.shadow = shadow;
    // stations / downlink
    const st = r.stations.find((x) => SIM.gc(p.lat, p.lon, x.lat, x.lon) < r.O.vis);
    const linking = !!st && r.mem.length > 0;
    if (st && r.lastLink !== st.id && r.mem.length) { flash(`📡 ${st.name}`, 'cyan'); PX.sfx.click(); }
    r.lastLink = st ? st.id : null; r.station = st;
    // power
    const sciOn = r.sci && r.safeUntil <= r.t && !r.lowBatt;
    const load = OD.BUS.power + (sciOn ? c.need - OD.BUS.power : 0) + (linking ? c.r.power : 0);
    r.batt = clamp(r.batt + ((shadow ? 0 : r.gen) - load) * h / 3600, 0, r.battMax);
    r.battMin = Math.min(r.battMin, r.batt / r.battMax);
    if (r.batt <= 0.5 && !r.lowBatt) { r.lowBatt = true; flash(T(U.safe) + ' · ' + (ru() ? 'батарея пуста' : 'battery empty'), 'red'); PX.sfx.bad(); lesson('lowbatt'); }
    if (r.lowBatt && r.batt > 0.4 * r.battMax) { r.lowBatt = false; flash(ru() ? 'Батарея заряжена — приборы снова в работе' : 'Battery recharged — instruments back on', 'grn'); }
    if (!sciOn) r.safeHours += h / 3600;
    // downlink FIFO
    if (linking) {
      let bw = c.r.rate * h / 60;
      while (bw > 0 && r.mem.length) {
        const it = r.mem[0], take = Math.min(bw, it.left); it.left -= take; bw -= take; r.gbDown += take;
        if (it.left <= 1e-6) { r.mem.shift(); deliver(it); }
      }
    }
    // targets
    r.canCap = null; let bestScore = -1;
    for (const tg of r.targets) {
      if (tg.st === 'wait' && r.t >= tg.t0) { tg.st = 'open'; }
      if (tg.st === 'open') {
        if (r.t > tg.t0 + tg.ttl) { tg.st = 'missed'; if (tg.reach) r.combo = 0; continue; }
        const wasDark = tg.dark; const b = capturable(tg, p, s);
        if (!b && tg.dark && !wasDark) lesson('dark');
        if (b) { tg.reach = true; const sc = b.q * 100 + (tg.t0 + tg.ttl - r.t < 6 * 3600 ? 50 : 0); if (sc > bestScore) { bestScore = sc; r.canCap = { tg, ...b }; } }
      }
    }
    if (r.canCap && !r.prevReach) {
      PX.sfx.alert();
      if (r.skip || r.speed > 1) { r.resume = { speed: r.speed, skip: r.skip }; r.skip = false; r.speed = 1; flash(ru() ? '🎯 ЦЕЛЬ В ЗОНЕ!' : '🎯 TARGET IN RANGE!', 'gold'); }
    }
    if (!r.canCap && r.prevReach && r.resume) { if (r.speed === 1) { r.speed = r.resume.speed; r.skip = r.resume.skip; } r.resume = null; }
    r.prevReach = !!r.canCap;
    // events
    for (const e of r.events) {
      if (!e.warned && r.t >= e.at - e.warn) { e.warned = true; r.skip = false; opsEvent(e); return; }
      if (e.id === 'storm' && e.choice === 'risk' && !e.hit && r.t >= e.at) { e.hit = true; if (Math.random() < 0.45) { const lostGb = r.mem.reduce((a, x) => a + x.left, 0); r.mem.forEach((it) => { it.tg.st = 'missed'; }); r.mem = []; r.glitchUntil = r.t + 4 * 3600; flash(ru() ? `☢ Буря стёрла память (${lostGb.toFixed(1)} GB)` : `☢ Storm wiped memory (${lostGb.toFixed(1)} GB)`, 'red'); PX.sfx.bad(); } else flash(ru() ? 'Буря прошла мимо — повезло!' : 'Storm passed — lucky!', 'grn'); }
      if (e.id === 'debris' && e.choice === 'risk' && !e.hit && r.t >= e.at) { e.hit = true; if (Math.random() < 0.08) { r.over = true; r.destroyed = true; PX.sfx.boom(); setTimeout(endOps, 900); return; } flash(ru() ? 'Обломок пролетел в 140 м. Фух.' : 'Debris missed by 140 m. Phew.', 'grn'); }
    }
    // track
    if (!r.track.length || r.t - r.track[r.track.length - 1].t > 60) { r.track.push({ t: r.t, lat: p.lat, lon: p.lon }); if (r.track.length > 200) r.track.shift(); }
    if (r.t >= OPS_DAYS * 86400) { r.over = true; setTimeout(endOps, 300); }
  }

  const comboMul = (c) => 1 + 0.1 * Math.min(Math.max(c - 1, 0), 10);
  function deliver(it) {
    const r = run, tg = it.tg, onTime = r.t <= tg.t0 + tg.ttl;
    if (onTime) { r.combo++; r.maxCombo = Math.max(r.maxCombo, r.combo); const pts = Math.round(100 * it.q * comboMul(r.combo)); r.score += pts; tg.st = 'done'; tg.pts = pts; floater(tg, '+' + pts); PX.sfx.coin(); lesson('downlink'); }
    else { r.score += 30; tg.st = 'late'; tg.pts = 30; r.combo = 0; floater(tg, '+30'); }
  }
  function capture() {
    const r = run; if (!r || !r.canCap || r.over) return;
    const sciOn = r.sci && r.safeUntil <= r.t && !r.lowBatt;
    if (!sciOn) { flash(ru() ? 'Приборы выключены' : 'Instruments are off', 'red'); PX.sfx.bad(); return; }
    const used = r.mem.reduce((a, x) => a + x.left, 0);
    if (used + r.canCap.gb > r.memMax) { r.memFullHits++; flash(ru() ? 'Память заполнена — нужен сеанс связи!' : 'Memory full — need a ground pass!', 'red'); PX.sfx.bad(); lesson('memfull'); return; }
    if (r.batt < 5) { flash(ru() ? 'Мало энергии' : 'Low power', 'red'); return; }
    const { tg, q, gb } = r.canCap; r.batt -= 5;
    tg.st = 'captured'; tg.capT = r.t; r.mem.push({ tg, q, left: gb });
    floater(tg, '📸'); PX.sfx.shot(); r.canCap = null; r.prevReach = false; lesson('capture');
  }

  function opsEvent(e) {
    const r = run; r.paused = true; PX.sfx.alert();
    const hrs = Math.round(e.warn / 3600 * 10) / 10;
    let h = '', ch = [];
    if (e.id === 'storm') { h = `<h3>☀ ${ru() ? 'Солнечная буря' : 'Solar storm'}</h3><p>${ru() ? `Космическая погода (NOAA SWPC): сильная вспышка, частицы будут у Земли через ${hrs} ч. Можно перевести спутник в безопасный режим на 6 часов.` : `Space weather (NOAA SWPC): a strong flare, particles arrive in ${hrs} h. You can put the satellite in safe mode for 6 hours.`}</p>`;
      ch = [[ru() ? 'Безопасный режим 6 ч' : 'Safe mode for 6 h', () => { r.safeUntil = e.at + 6 * 3600; e.choice = 'safe'; }], [ru() ? 'Рискнуть (45% сбой)' : 'Risk it (45% failure)', () => { e.choice = 'risk'; }]]; }
    if (e.id === 'debris') { h = `<h3>⚠ ${ru() ? 'Сближение с мусором' : 'Debris conjunction'}</h3><p>${ru() ? `Обломок старой ракеты пройдёт рядом через ${hrs} ч. Манёвр уклонения тратит топливо (осталось ${r.fuel}).` : `A rocket fragment passes close in ${hrs} h. An avoidance burn costs fuel (${r.fuel} left).`}</p>`;
      ch = [[ru() ? 'Манёвр (−1 топливо)' : 'Burn (−1 fuel)', () => { r.fuel--; e.choice = 'burn'; r.safeUntil = Math.max(r.safeUntil, r.t + 1800); }, r.fuel <= 0], [ru() ? 'Не уклоняться (8% риск)' : 'Do nothing (8% risk)', () => { e.choice = 'risk'; }]]; }
    if (e.id === 'glitch') { h = `<h3>⚡ ${ru() ? 'Сбой прибора' : 'Instrument glitch'}</h3><p>${ru() ? 'Приборы перезагружаются на холоде — это дефект, который не нашли без термовакуумных испытаний. 8 часов без съёмки.' : 'Instruments reboot in the cold — a defect thermal-vacuum testing would have caught. 8 hours without imaging.'}</p>`;
      ch = [['OK', () => { r.glitchUntil = r.t + 8 * 3600; }]]; }
    if (e.id === 'panel') { h = `<h3>⚡ ${ru() ? 'Панель не раскрылась' : 'Panel failed to deploy'}</h3><p>${ru() ? 'Без вибротеста крепление треснуло на старте. Энергии на 45% меньше — следи за батареей!' : 'Without a vibration test a hinge cracked at launch. 45% less power — watch the battery!'}</p>`;
      ch = [['OK', () => {}]]; }
    modal(`${h}<div class="row">${ch.map((c, i) => `<button class="btn" data-oev="${i}" ${c[2] ? 'disabled' : ''}>${c[0]}</button>`).join('')}</div>`);
    document.querySelectorAll('[data-oev]').forEach((b) => (b.onclick = () => { ch[+b.dataset.oev][1](); r.log.push(h.replace(/<[^>]+>/g, ' ').trim().slice(0, 60) + ' → ' + ch[+b.dataset.oev][0]); closeModal(); r.paused = false; PX.sfx.click(); }));
  }

  /* ----- drawing ----- */
  const X = (lon) => ((lon + 180) / 360) * MW, Y = (lat) => ((90 - lat) / 180) * MH;
  function drawMap() {
    const r = run, cv = $('#map'); if (!cv || !r.p) { return; }
    const x = cv.getContext('2d');
    x.drawImage(mapCanvas, 0, 0);
    if (Math.abs(r.t - nightT) > 120 && performance.now() - (paintNight.last || 0) > 120) { nightT = r.t; paintNight.last = performance.now(); paintNight(r.s); }
    x.drawImage(nightCanvas, 0, 0, MW, MH);
    // stations
    x.font = '11px "DM Mono", monospace'; x.textAlign = 'center'; x.textBaseline = 'middle';
    for (const st of r.stations) {
      const on = r.station && r.station.id === st.id, sx = X(st.lon), sy = Y(st.lat);
      ring(x, st.lat, st.lon, r.O.vis, on ? '#5bd7ff' : 'rgba(91,215,255,0.38)', on ? [] : [5, 7], on ? 2.5 : 1.3);
      x.fillStyle = '#5bd7ff'; x.beginPath(); x.moveTo(sx, sy - 7); x.lineTo(sx + 6, sy + 5); x.lineTo(sx - 6, sy + 5); x.closePath(); x.fill();
      x.fillStyle = 'rgba(200,235,255,0.85)'; x.fillText(st.name, sx, sy + 15);
    }
    // past + future ground track
    x.fillStyle = 'rgba(255,255,255,0.4)'; r.track.forEach((q) => x.fillRect(X(q.lon) - 1, Y(q.lat) - 1, 2, 2));
    if (!r.O.geo) { x.fillStyle = 'rgba(255,200,87,0.85)'; for (let k = 2; k < 200; k += 2) { const q = pos(r.t + k * r.O.period / 200); x.fillRect(X(q.lon) - 1, Y(q.lat) - 1, 2, 2); } }
    // instrument footprint
    const sciOn = r.safeUntil <= r.t && !r.lowBatt && r.glitchUntil <= r.t;
    ring(x, r.p.lat, r.p.lon, r.O.ftpPassive, r.canCap ? '#ffc857' : sciOn ? 'rgba(255,255,255,0.9)' : 'rgba(255,107,107,0.9)', [], 2.2);
    // targets
    const blink = Math.floor(performance.now() / 300) % 2, em = ICON[r.c.m.icon];
    for (const tg of r.targets) {
      if (tg.st === 'wait' || tg.st === 'missed') continue;
      if ((tg.st === 'done' || tg.st === 'late') && r.t - tg.t0 > tg.ttl + 3600) continue;
      const tx = X(tg.lon), ty = Y(tg.lat);
      if (tg.st === 'open') {
        const left = clamp((tg.t0 + tg.ttl - r.t) / tg.ttl), hot = r.canCap && r.canCap.tg === tg;
        x.fillStyle = 'rgba(5,13,28,0.8)'; x.beginPath(); x.arc(tx, ty, 13, 0, 7); x.fill();
        x.strokeStyle = left < 0.25 ? '#ff6b6b' : left < 0.5 ? '#ffc857' : '#68e6bb'; x.lineWidth = 3;
        x.beginPath(); x.arc(tx, ty, 13, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * left); x.stroke();
        if (!(left < 0.25 && blink)) { x.font = '14px serif'; x.fillStyle = '#fff'; x.fillText(em, tx, ty + 1); }
        if (hot) { x.strokeStyle = '#ffc857'; x.lineWidth = 2.5; x.beginPath(); x.arc(tx, ty, 19 + blink * 3, 0, 7); x.stroke(); }
      } else if (tg.st === 'captured') { x.fillStyle = '#ffc857'; x.strokeStyle = '#fff'; x.lineWidth = 1.5; x.beginPath(); x.arc(tx, ty, 6, 0, 7); x.fill(); x.stroke(); }
      else { x.fillStyle = tg.st === 'done' ? '#68e6bb' : '#8ea4c0'; x.beginPath(); x.arc(tx, ty, 3.5, 0, 7); x.fill(); }
    }
    drawSatIcon(x, X(r.p.lon), Y(r.p.lat), 1.5);
  }
  function paintNight(s) {
    const c = nightCanvas.getContext('2d'), img = c.createImageData(NW, NH), d = img.data, sv = s.v;
    for (let j = 0; j < NH; j++) {
      const lat = (90 - (j + 0.5) * 180 / NH) * SIM.D2R, cl = Math.cos(lat), sl = Math.sin(lat);
      for (let i = 0; i < NW; i++) {
        const lon = ((i + 0.5) * 360 / NW - 180) * SIM.D2R;
        const k = cl * Math.cos(lon) * sv[0] + cl * Math.sin(lon) * sv[1] + sl * sv[2];
        const a = k > 0.05 ? 0 : k < -0.1 ? 190 : Math.round((0.05 - k) / 0.15 * 190);
        const o = (j * NW + i) * 4; d[o] = 3; d[o + 1] = 8; d[o + 2] = 24; d[o + 3] = a;
      }
    }
    c.putImageData(img, 0, 0);
  }
  function ring(x, lat, lon, ang, color, dash, w) {
    const pts = SIM.ring(lat, lon, ang, 120); pts.push(pts[0]);
    x.strokeStyle = color; x.lineWidth = w; x.setLineDash(dash); x.beginPath(); let px = null;
    for (const [a, b] of pts) { const qx = X(b), qy = Y(a); if (px == null || Math.abs(qx - px) > MW / 2) x.moveTo(qx, qy); else x.lineTo(qx, qy); px = qx; }
    x.stroke(); x.setLineDash([]);
  }
  function floater(tg, text) {
    const box = $('#floaters'); if (!box) return;
    const el = document.createElement('div'); el.className = 'fl'; el.textContent = text;
    el.style.left = (X(tg.lon) / MW * 100) + '%'; el.style.top = (Y(tg.lat) / MH * 100) + '%';
    box.appendChild(el); setTimeout(() => el.remove(), 1400);
  }
  function flash(text, cls) { const b = $('#banner'); if (!b) return; b.className = 'on ' + (cls || ''); b.textContent = text; clearTimeout(flash.t); flash.t = setTimeout(() => (b.className = ''), 2200); }

  function hms(t) { const h = Math.floor(t / 3600) % 24, mi = Math.floor(t / 60) % 60; return String(h).padStart(2, '0') + ':' + String(mi).padStart(2, '0'); }
  function updateHud() {
    const r = run; if (!$('#oday')) return;
    const d = new Date(r.epoch + r.t * 1000);
    $('#oday').textContent = `${ru() ? 'ДЕНЬ' : 'DAY'} ${Math.min(OPS_DAYS, Math.floor(r.t / 86400) + 1)}/${OPS_DAYS}`;
    $('#otime').textContent = hms(r.t + 0) + ' UTC';
    $('#odate').textContent = d.toISOString().slice(0, 10);
    $('#oscore').textContent = r.score;
    $('#ocombo').textContent = r.combo > 1 ? `${T(U.combo)} ×${comboMul(r.combo).toFixed(1)}` : '';
    document.querySelectorAll('.sp').forEach((b) => b.classList.toggle('on', b.dataset.speed != null ? +b.dataset.speed === r.speed && !r.skip : !!r.skip));
    const bf = r.batt / r.battMax;
    setMeter('#gbatt', bf, `${Math.round(r.batt)} / ${r.battMax} Wh`, bf < 0.2 ? 'bad' : bf < 0.4 ? 'warn' : '');
    $('#sunico').textContent = r.shadow ? '🌑 ' + T(U.eclipse) : '☀ ' + T(U.sun);
    const used = r.mem.reduce((a, x) => a + x.left, 0);
    setMeter('#gmem', used / r.memMax, `${used.toFixed(1)} / ${r.memMax} GB`, used / r.memMax > 0.85 ? 'bad' : used / r.memMax > 0.6 ? 'warn' : '');
    const lk = r.station ? (r.mem.length ? `⇣ ${r.station.name}` : r.station.name) : T(U.noLink);
    setMeter('#glink', r.station ? 1 : 0, lk, r.station ? '' : 'idle');
    const sciOn = r.sci && r.safeUntil <= r.t && !r.lowBatt;
    const bc = $('#bcap'); bc.disabled = !r.canCap; bc.classList.toggle('ready', !!r.canCap);
    $('#vfuel').textContent = '▮'.repeat(r.fuel) + '▯'.repeat(2 - r.fuel);
    // target list (throttled)
    if (!updateHud.t || performance.now() - updateHud.t > 250) {
      updateHud.t = performance.now(); coach();
      const list = r.targets.filter((t) => t.st === 'open' || t.st === 'captured').sort((a, b) => (a.t0 + a.ttl) - (b.t0 + b.ttl)).slice(0, 8);
      const done = r.targets.filter((t) => t.st === 'done').length, late = r.targets.filter((t) => t.st === 'late').length, miss = r.targets.filter((t) => t.st === 'missed').length;
      $('#tlist').innerHTML = list.map((t) => { const left = t.t0 + t.ttl - r.t; return `<div class="ti ${t.st} ${r.canCap && r.canCap.tg === t ? 'hot' : ''}"><span>${t.st === 'captured' ? '📸' : '◎'} ${esc(t.name)}</span><b class="${left < 4 * 3600 ? 'red' : ''}">${Math.floor(left / 3600)}h${String(Math.floor(left / 60) % 60).padStart(2, '0')}</b></div>`; }).join('') || `<p class="muted">${ru() ? 'Ждём новые цели…' : 'Waiting for targets…'}</p>`;
      $('#tlist').insertAdjacentHTML('beforeend', `<div class="tsum"><span class="grn">✓ ${done}</span><span>◐ ${late}</span><span class="red">✕ ${miss}</span></div>`);
    }
  }
  function setMeter(sel, ratio, text, cls) { const el = $(sel); el.className = 'meter ' + (cls || ''); el.querySelector('b').textContent = text; el.querySelector('.bar i').style.width = clamp(ratio) * 100 + '%'; }

  function endOps() {
    if (screen !== 'ops') return;
    const r = run;
    const tg = r.targets.filter((t) => t.st !== 'wait');
    const done = tg.filter((t) => t.st === 'done').length, late = tg.filter((t) => t.st === 'late').length;
    const stuck = tg.filter((t) => t.st === 'captured').length, missed = tg.filter((t) => t.st === 'missed' || t.st === 'open').length;
    const latePen = Math.round(r.score * Math.min(0.6, 0.03 * r.c.late));
    const tips = [];
    const neverReach = tg.filter((t) => (t.st === 'missed' || t.st === 'open') && !t.reach && !t.dark).length;
    const darkOnly = tg.filter((t) => (t.st === 'missed' || t.st === 'open') && !t.reach && t.dark).length;
    const skipped = tg.filter((t) => (t.st === 'missed' || t.st === 'open') && t.reach).length;
    if (r.destroyed) tips.push(['bad', ru() ? 'Спутник уничтожен обломком. Манёвр уклонения стоил бы одну единицу топлива.' : 'Destroyed by debris. An avoidance burn would have cost one unit of fuel.']);
    if (r.c.late) tips.push(['bad', ru() ? `Запуск опоздал к сезону на ${r.c.late} дн. Меньше деталей или ракета с более ранним окном.` : `Launched ${r.c.late} days into the season. Fewer parts or a rocket with an earlier window.`]);
    if (darkOnly) tips.push(['bad', ru() ? `${darkOnly} целей пролетели в темноте: оптике нужен свет. Тепловой сканер, радар и лидар видят ночью.` : `${darkOnly} targets were passed in darkness: optics need light. Thermal, radar and lidar see at night.`]);
    if (neverReach) tips.push(['info', ru() ? `${neverReach} целей спутник ни разу не увидел — орбита или ширина обзора не дотянулись.` : `${neverReach} targets were never in view — the orbit or field of view didn't reach.`]);
    if (skipped) tips.push(['info', ru() ? `${skipped} целей были в зоне, но снимок не сделан. Следи за жёлтой рамкой!` : `${skipped} targets were in range but not captured. Watch for the yellow frame!`]);
    if (late || stuck) tips.push(['bad', ru() ? `${late + stuck} снимков не успели долететь до Земли вовремя. Больше станций или быстрее радио.` : `${late + stuck} images didn't reach Earth in time. More stations or a faster radio.`]);
    if (r.gbDown < 0.01 && (stuck + late) > 0) tips.push(['bad', ru() ? 'Ни одна станция не увидела спутник — данные так и остались на борту. Для GEO нужна станция под ним (например, в Астане).' : 'No ground station ever saw the satellite — the data never left. GEO needs a station below it (e.g. Astana).']);
    if (r.memFullHits) tips.push(['bad', ru() ? `Память переполнялась ${r.memFullHits} раз(а).` : `Memory was full ${r.memFullHits} time(s).`]);
    if (r.safeHours > 6) tips.push(['bad', ru() ? `${Math.round(r.safeHours)} ч приборы были выключены (батарея/безопасный режим).` : `Instruments were off for ${Math.round(r.safeHours)} h (battery / safe mode).`]);
    if (r.maxCombo >= 4) tips.push(['good', ru() ? `Серия из ${r.maxCombo} доставок подряд вовремя!` : `A streak of ${r.maxCombo} on-time deliveries!`]);
    if (done && !tips.some((t) => t[0] === 'bad')) tips.push(['good', ru() ? 'Чистая миссия: дизайн и управление сработали вместе.' : 'A clean mission: design and operations worked together.']);
    tips.sort((a, b) => (a[0] === 'bad' ? 0 : 1) - (b[0] === 'bad' ? 0 : 1)); tips.splice(3);
    finish(r.score, { latePen, destroyed: r.destroyed, done }, { done, late, stuck, missed, gb: r.gbDown }, tips);
  }
  function failDebrief() {
    const c = calc();
    finish(0, { launchFail: true }, {}, [['bad', launchFailText(c)], ['info', ru() ? 'Даже провал — это опыт: посмотри, за что сняли очки, и попробуй ещё раз.' : 'Even a failure teaches: see where the points went and try again.']]);
  }

  /* ================= DEBRIEF ================= */
  function vDebrief() {
    const r = run.result, m = OD.MISSIONS[mission], R = ru();
    app().innerHTML = `<section class="wrap debrief"><h2 class="h">${T(U.debrief)} · ${T(m.name)}</h2>
      <div class="dtop"><div class="grade g-${r.grade}">${r.grade}</div>
        <div><p class="big ${r.final < 0 ? 'red' : ''}">${sgn(r.final).replace('+', '')}</p>${r.isBest ? `<p class="gold blink">${T(U.newBest)}</p>` : ''}
          <div class="dstats"><span class="grn">✓ ${r.done} ${T(U.delivered)}</span><span>◐ ${r.late + r.stuck} ${T(U.lateD)}</span><span class="red">✕ ${r.missed} ${T(U.missed)}</span><span>⇣ ${r.gb.toFixed(1)} GB</span></div>
          <p class="muted">${R ? 'Общий счёт агентства' : 'Agency total'}: <b>${r.total}</b></p></div>
        <div class="panel rows"><h4>${R ? 'Из чего сложился счёт' : 'Score breakdown'}</h4>${r.rows.map(([n, v]) => `<div class="${v < 0 ? 'neg' : 'pos'}"><span>${n}</span><b>${sgn(v)}</b></div>`).join('')}<div class="sum"><span>${R ? 'Итого' : 'Total'}</span><b>${sgn(r.final)}</b></div></div></div>
      <div class="dgrid"><div class="panel"><h4>${T(U.why)}</h4>${r.tips.map(([k, t]) => `<p class="tipl ${k}">${k === 'good' ? '✓' : k === 'bad' ? '✕' : 'i'} ${t}</p>`).join('')}<h4>${R ? 'Что ты уже узнал' : 'What you have learned'}</h4><div class="learned">${Object.entries(LESSONS).map(([id, l]) => (lsGet('orbital4-lessons') || {})[id] ? `<span class="on">✓ ${T(l[0])}</span>` : '<span>???</span>').join('')}</div></div>
        <div class="panel"><h4>${T(U.real)}</h4><h3>${m.analog.name}</h3><p>${T(m.analog.text)}</p></div></div>
      <div class="row"><button class="btn" data-go="missions">${T(U.other)}</button><button class="btn big blink" data-act="retryHangar">↻ ${T(U.again)}</button></div></section>`;
  }

  /* ================= input ================= */
  document.addEventListener('click', (e) => {
    const b = e.target.closest('button'); if (!b || b.disabled) return;
    if (b.dataset.go) { PX.sfx.click(); return setScreen(b.dataset.go); }
    if (b.dataset.mission) { PX.sfx.click(); mission = b.dataset.mission; design = freshDesign(); hstep = 0; return setScreen('hangar'); }
    if (b.dataset.hstep != null) { PX.sfx.click(); hstep = +b.dataset.hstep; return render(); }
    if (b.dataset.set) {
      PX.sfx.click(); const g = b.dataset.set, v = b.dataset.v;
      if (g === 'instr') { design.instr = design.instr.includes(v) ? design.instr.filter((x) => x !== v) : [...design.instr, v]; }
      else if (g === 'kz') design.kz = !design.kz;
      else if (g === 'vib' || g === 'tvac') design[g] = !design[g];
      else design[g] = v;
      return render();
    }
    if (b.dataset.speed != null && run) { run.resume = null; run.skip = false; run.speed = +b.dataset.speed; PX.sfx.click(); return; }
    const a = b.dataset.act;
    if (a === 'startBuild') { PX.sfx.click(); return startBuild(); }
    if (a === 'bday') return advanceBuild('day');
    if (a === 'bevent') return advanceBuild('event');
    if (a === 'bend') return advanceBuild('end');
    if (a === 'toLaunch') { PX.sfx.click(); return setScreen('launch'); }
    if (a === 'skipLaunch') { if (run.launchFail) return launchEnd(true); launchT.splice(0).forEach(clearTimeout); return startOps(); }
    if (a === 'failDebrief') return failDebrief();
    if (a === 'newGame') { PX.sfx.click(); return newGameModal(); }
    if (a === 'createGame') { PX.sfx.click(); return createGame(); }
    if (a === 'closeModal') return closeModal();
    if (a === 'continue') { PX.sfx.click(); return setScreen('missions'); }
    if (a === 'toOps') return startOps();
    if (a === 'retryHangar') { PX.sfx.click(); return setScreen('hangar'); }
    if (a === 'capture') return capture();
    if (a === 'sci' && run) { run.sci = !run.sci; PX.sfx.click(); return; }
    if (a === 'skipNext' && run) { run.skip = true; PX.sfx.click(); return; }
  });
  document.addEventListener('keydown', (e) => {
    if (screen === 'title') { if (e.key === 'Enter') { e.preventDefault(); if ($('#agname')) createGame(); else if (getSave()) setScreen('missions'); else newGameModal(); } return; }
    if (screen !== 'ops' || !run || $('#modal.on')) return;
    if (e.key === ' ') { e.preventDefault(); capture(); }
    else if (e.key === '1' || e.key === '2' || e.key === '3') { run.skip = false; run.speed = +e.key; }
    else if (e.key === '4' || e.key === 'n' || e.key === 'N' || e.key === 'т' || e.key === 'Т') { run.skip = true; }
    else if (e.key === 'p' || e.key === 'P' || e.key === 'з' || e.key === 'З') { run.speed = run.speed ? 0 : 2; run.skip = false; }
  });
  $('#lang').onclick = () => { prefs.lang = ru() ? 'en' : 'ru'; lsSet('orbital4-prefs', prefs); if (screen === 'ops') { const keep = raf; render(); cancelAnimationFrame(keep); } else render(); };
  $('#mute').onclick = () => { prefs.mute = !prefs.mute; PX.setMuted(prefs.mute); lsSet('orbital4-prefs', prefs); $('#mute').textContent = prefs.mute ? '♪×' : '♪'; };

  function autoplay(skill = 1) {
    const r = run; r.paused = false; let guard = 0;
    while (!r.over && guard++ < 200000) {
      simStep(15);
      if (r.paused) { const tut = document.querySelector('[data-oev="tut"]'); if (tut) tut.click(); const btn = document.querySelector('[data-oev="0"]:not([disabled])') || document.querySelector('[data-oev]:not([disabled])'); btn && btn.click(); }
      if (r.canCap && Math.random() < skill) capture();
    }
  }
  render();
  window.ORB = { autoplay, startBuild, failDebrief, get run() { return run; }, get build() { return build; }, get design() { return design; }, set design(d) { design = d; }, calc, startOps, setScreen, capture, endOps, get screen() { return screen; }, setMission: (m) => { mission = m; design = freshDesign(); } };
})();
