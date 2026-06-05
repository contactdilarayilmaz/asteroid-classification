/* ═══════════════════════════════════════════════════════════════
   PHA Asteroid Simülatörü — Frontend Logic
   ═══════════════════════════════════════════════════════════════ */

'use strict';

// ──────────────────────────────────────────────────────────────
// STATE
// ──────────────────────────────────────────────────────────────
const appState = {
  asteroids: [],
  summary: null,
  selectedIdx: null,
  distChart: null,
};

// ──────────────────────────────────────────────────────────────
// ORBITAL CANVAS SIMULATOR
// ──────────────────────────────────────────────────────────────
class OrbitalSimulator {
  constructor(canvas) {
    this.canvas  = canvas;
    this.ctx     = canvas.getContext('2d');
    this.time    = 0;
    this.raf     = null;
    this.orbital = null;
    this.stars   = this._generateStars(180);
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  resize() {
    const rect = this.canvas.parentElement.getBoundingClientRect();
    this.canvas.width  = rect.width  * (window.devicePixelRatio || 1);
    this.canvas.height = rect.height * (window.devicePixelRatio || 1);
    this.canvas.style.width  = rect.width  + 'px';
    this.canvas.style.height = rect.height + 'px';
  }

  _generateStars(n) {
    const stars = [];
    for (let i = 0; i < n; i++) {
      stars.push({
        x: Math.random(),
        y: Math.random(),
        r: 0.3 + Math.random() * 1.2,
        a: 0.2 + Math.random() * 0.8,
      });
    }
    return stars;
  }

  setOrbital(orbital) {
    this.orbital = orbital;
    this.time    = 0;
  }

  start() {
    if (this.raf) cancelAnimationFrame(this.raf);
    this._loop();
  }

  stop() {
    if (this.raf) { cancelAnimationFrame(this.raf); this.raf = null; }
  }

  _loop() {
    this._draw();
    this.time += 0.004;
    this.raf = requestAnimationFrame(() => this._loop());
  }

  // ── Core drawing ──────────────────────────────────────────
  _draw() {
    const { canvas, ctx } = this;
    const W  = canvas.width;
    const H  = canvas.height;
    const cx = W / 2;
    const cy = H / 2;
    const sc = Math.min(W, H) / 4.6;   // 1 AU = sc px

    // Background
    ctx.clearRect(0, 0, W, H);
    const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(W, H));
    bg.addColorStop(0, '#0a0a25');
    bg.addColorStop(1, '#06060f');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, W, H);

    // Stars
    this.stars.forEach(s => {
      ctx.beginPath();
      ctx.fillStyle = `rgba(255,255,255,${s.a})`;
      ctx.arc(s.x * W, s.y * H, s.r, 0, Math.PI * 2);
      ctx.fill();
    });

    // Mars orbit ring
    this._drawRing(ctx, cx, cy, 1.52 * sc, 'rgba(248,113,113,0.18)');

    // Earth orbit ring
    this._drawRing(ctx, cx, cy, 1.0 * sc, 'rgba(34,211,238,0.18)');

    // Asteroid orbit (dashed ellipse)
    if (this.orbital) {
      this._drawAsteroidOrbit(ctx, cx, cy, sc, this.orbital);
    }

    // Sun
    this._drawSun(ctx, cx, cy);

    // Earth
    const eA  = 2 * Math.PI * this.time;
    const eX  = cx + Math.cos(eA) * sc;
    const eY  = cy + Math.sin(eA) * sc;
    this._drawBody(ctx, eX, eY, 7, '#22d3ee', 'rgba(34,211,238,0.3)', 'Dünya', true);

    // Mars
    const mA  = 2 * Math.PI * this.time / 1.881;
    const mX  = cx + Math.cos(mA) * 1.52 * sc;
    const mY  = cy + Math.sin(mA) * 1.52 * sc;
    this._drawBody(ctx, mX, mY, 5, '#f87171', 'rgba(248,113,113,0.25)', null, false);

    // Asteroid
    if (this.orbital) {
      const pos = this._asteroidPos(this.time, this.orbital, sc);
      this._drawBody(ctx, cx + pos.x, cy + pos.y, 6, '#a78bfa', 'rgba(167,139,250,0.35)', null, false);
    }
  }

  _drawRing(ctx, cx, cy, r, color) {
    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth   = 1;
    ctx.setLineDash([]);
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.stroke();
  }

  _drawAsteroidOrbit(ctx, cx, cy, sc, orb) {
    const a = orb.semi_major_axis * sc;
    const e = orb.eccentricity;
    const b = a * Math.sqrt(1 - e * e);
    const c = a * e;                              // focus → ellipse center
    const om = (orb.omega || 0) * Math.PI / 180;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.rotate(om);
    ctx.translate(-c, 0);

    ctx.beginPath();
    ctx.strokeStyle = 'rgba(249,115,22,0.55)';
    ctx.lineWidth   = 1.5;
    ctx.setLineDash([7, 5]);
    ctx.ellipse(0, 0, a, b, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    ctx.restore();
  }

  _drawSun(ctx, cx, cy) {
    // Glow
    const g1 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 40);
    g1.addColorStop(0, 'rgba(253,224,71,0.35)');
    g1.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = g1;
    ctx.arc(cx, cy, 40, 0, Math.PI * 2);
    ctx.fill();

    // Body
    const g2 = ctx.createRadialGradient(cx, cy, 0, cx, cy, 14);
    g2.addColorStop(0,   '#fff9c4');
    g2.addColorStop(0.5, '#fbbf24');
    g2.addColorStop(1,   '#d97706');
    ctx.beginPath();
    ctx.fillStyle = g2;
    ctx.arc(cx, cy, 14, 0, Math.PI * 2);
    ctx.fill();
  }

  _drawBody(ctx, x, y, r, color, glowColor, label, showLabel) {
    // Glow
    const grd = ctx.createRadialGradient(x, y, 0, x, y, r * 3.5);
    grd.addColorStop(0, glowColor);
    grd.addColorStop(1, 'transparent');
    ctx.beginPath();
    ctx.fillStyle = grd;
    ctx.arc(x, y, r * 3.5, 0, Math.PI * 2);
    ctx.fill();

    // Body
    ctx.beginPath();
    ctx.fillStyle = color;
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();

    // Label
    if (showLabel && label) {
      ctx.fillStyle = color;
      ctx.font      = `bold ${Math.max(10, r * 1.7)}px Inter, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(label, x, y + r + 14);
    }
  }

  _asteroidPos(t, orb, sc) {
    const T  = orb.period / 365.25;
    const n  = (2 * Math.PI) / T;
    const M  = (n * t) % (2 * Math.PI);
    const e  = orb.eccentricity;

    // Kepler iteration (Eccentric anomaly E)
    let E = M;
    for (let i = 0; i < 20; i++) E = M + e * Math.sin(E);

    // True anomaly
    const nu = 2 * Math.atan2(
      Math.sqrt(1 + e) * Math.sin(E / 2),
      Math.sqrt(1 - e) * Math.cos(E / 2)
    );

    // Heliocentric distance
    const r  = orb.semi_major_axis * (1 - e * Math.cos(E)) * sc;
    const om = (orb.omega || 0) * Math.PI / 180;

    // Heliocentric Cartesian position (Sun at origin)
    // x = r·cos(ν+ω),  y = r·sin(ν+ω)
    return {
      x: r * Math.cos(nu + om),
      y: r * Math.sin(nu + om),
    };
  }

}

// ──────────────────────────────────────────────────────────────
// UPLOAD SCREEN
// ──────────────────────────────────────────────────────────────
function initUpload() {
  const dropZone   = document.getElementById('drop-zone');
  const fileInput  = document.getElementById('file-input');
  const progress   = document.getElementById('upload-progress');
  const errMsg     = document.getElementById('upload-error');

  // Click to open file dialog
  dropZone.addEventListener('click', () => fileInput.click());

  // File selected via dialog
  fileInput.addEventListener('change', () => {
    if (fileInput.files[0]) handleFile(fileInput.files[0]);
  });

  // Drag & drop
  dropZone.addEventListener('dragover', e => {
    e.preventDefault();
    dropZone.classList.add('drag-over');
  });
  dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
  dropZone.addEventListener('drop', e => {
    e.preventDefault();
    dropZone.classList.remove('drag-over');
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  });

  function handleFile(file) {
    if (!file.name.endsWith('.csv')) {
      showError('Lütfen bir .csv dosyası seçin.');
      return;
    }
    errMsg.style.display = 'none';
    progress.style.display = 'block';
    uploadAndClassify(file);
  }

  function showError(msg) {
    errMsg.textContent  = '⚠ ' + msg;
    errMsg.style.display = 'block';
    progress.style.display = 'none';
  }

  // Reset button
  document.getElementById('reset-btn').addEventListener('click', () => {
    document.getElementById('upload-screen').classList.remove('hidden');
    document.getElementById('app').classList.remove('visible');
    fileInput.value = '';
    progress.style.display  = 'none';
    errMsg.style.display    = 'none';
    appState.asteroids = [];
    appState.selectedIdx = null;
    if (window._orbSim) window._orbSim.stop();
    if (appState.distChart) { appState.distChart.destroy(); appState.distChart = null; }
  });
}

// ──────────────────────────────────────────────────────────────
// API CALL
// ──────────────────────────────────────────────────────────────
async function uploadAndClassify(file) {
  const formData = new FormData();
  formData.append('file', file);

  try {
    const res  = await fetch('/api/classify', { method: 'POST', body: formData });
    const data = await res.json();

    if (!res.ok || data.error) {
      document.getElementById('upload-progress').style.display = 'none';
      document.getElementById('upload-error').textContent = '⚠ ' + (data.error || 'Bilinmeyen hata');
      document.getElementById('upload-error').style.display = 'block';
      return;
    }

    appState.asteroids = data.asteroids;
    appState.summary   = data.summary;
    renderApp();

  } catch (err) {
    document.getElementById('upload-progress').style.display = 'none';
    document.getElementById('upload-error').textContent = '⚠ Sunucuya bağlanılamadı: ' + err.message;
    document.getElementById('upload-error').style.display = 'block';
  }
}

// ──────────────────────────────────────────────────────────────
// RENDER MAIN APP
// ──────────────────────────────────────────────────────────────
function renderApp() {
  const s = appState.summary;

  // Show/hide screens
  document.getElementById('upload-screen').classList.add('hidden');
  const appEl = document.getElementById('app');
  appEl.classList.add('visible');

  // Stats
  document.getElementById('stat-total').textContent   = s.total.toLocaleString();
  document.getElementById('stat-pha').textContent     = s.pha_count.toLocaleString();
  document.getElementById('stat-moid').textContent    = s.avg_moid.toFixed(4);
  document.getElementById('stat-critical').textContent = s.critical;

  // File name in header
  document.getElementById('ds-info').textContent =
    `NASA NEO veri seti — ML model tahminleri (Random Forest) · ${s.total.toLocaleString()} asteroid`;

  // Asteroid list
  renderAsteroidList(appState.asteroids);

  // Select first PHA by default
  const firstPha = appState.asteroids.findIndex(a => a.is_pha);
  if (firstPha !== -1) selectAsteroid(firstPha);
}

// ──────────────────────────────────────────────────────────────
// ASTEROID LIST
// ──────────────────────────────────────────────────────────────
function renderAsteroidList(asteroids) {
  const listEl   = document.getElementById('asteroid-list');
  const countEl  = document.getElementById('pha-count-badge');
  const phaCount = asteroids.filter(a => a.is_pha).length;
  countEl.textContent = `${phaCount} PHA`;

  listEl.innerHTML = '';

  asteroids.forEach((ast, i) => {
    const item = document.createElement('div');
    item.className  = 'asteroid-item';
    item.id         = `ast-item-${i}`;
    item.dataset.idx = i;

    const moidStr = ast.miss_dist_au >= 0.001
      ? ast.miss_dist_au.toFixed(4) + ' AU'
      : (ast.miss_dist_au * 1000).toFixed(2) + ' mAU';

    item.innerHTML = `
      <div class="asteroid-dot" style="background:${ast.dot_color}; box-shadow:0 0 8px ${ast.dot_color}88;"></div>
      <div class="asteroid-info">
        <div class="asteroid-name">${escHtml(ast.name)}</div>
        <div class="asteroid-meta">H=${ast.h_mag} &nbsp;|&nbsp; MOID=${moidStr} &nbsp;|&nbsp; Güven: ${ast.confidence}%</div>
      </div>
      <span class="pha-badge ${ast.is_pha ? 'pha' : 'safe'}">${ast.is_pha ? 'PHA' : 'GÜVENLİ'}</span>
    `;

    item.addEventListener('click', () => selectAsteroid(i));
    listEl.appendChild(item);
  });
}

// ──────────────────────────────────────────────────────────────
// SELECT ASTEROID  (async — NASA SBDB entegrasyonu)
// ──────────────────────────────────────────────────────────────

function showSimPanels() {
  document.getElementById('sim-empty').style.display              = 'none';
  document.getElementById('canvas-wrap').style.display            = 'block';
  document.getElementById('orbit-legend').style.display           = 'flex';
  document.getElementById('orbital-params-section').style.display = 'block';
  document.getElementById('chart-section').style.display          = 'block';
  document.getElementById('threat-badge').style.display           = 'inline-block';
}

/** NASA SBDB'den gerçek orbital eleman çeker. Bulunamazsa null döner. */
async function fetchSBDBOrbital(name) {
  try {
    const res  = await fetch(`/api/sbdb?name=${encodeURIComponent(name)}`);
    const data = await res.json();
    return data.found ? data.orbital : null;
  } catch {
    return null;
  }
}

/** Veri kaynağı rozeti günceller */
function setSourceBadge(isReal, sbdbPha, modelPha) {
  let badge = document.getElementById('source-badge');
  if (!badge) {
    badge = document.createElement('span');
    badge.id = 'source-badge';
    badge.style.cssText = 'margin-left:8px; font-size:0.7rem; padding:2px 8px; border-radius:99px; font-weight:600; letter-spacing:.04em;';
    const simTitle = document.getElementById('sim-header').querySelector('.sim-title');
    if (simTitle) simTitle.appendChild(badge);
  }

  if (isReal) {
    badge.textContent = '📡 NASA SBDB';
    badge.style.background = '#14532d';
    badge.style.color = '#4ade80';
    badge.style.border = '1px solid #16a34a';

    // NASA vs model karşılaştırma
    let cmp = document.getElementById('nasa-compare');
    if (!cmp) {
      cmp = document.createElement('div');
      cmp.id = 'nasa-compare';
      cmp.style.cssText = 'margin-top:6px; font-size:0.75rem; padding:4px 10px; border-radius:6px; display:inline-block;';
      document.getElementById('sim-header').appendChild(cmp);
    }
    if (sbdbPha === null || sbdbPha === undefined) {
      cmp.style.display = 'none';
    } else {
      cmp.style.display = 'inline-block';
      const agree = sbdbPha === modelPha;
      cmp.style.background = agree ? 'rgba(20,83,45,0.5)' : 'rgba(127,29,29,0.5)';
      cmp.style.border = agree ? '1px solid #16a34a' : '1px solid #dc2626';
      cmp.style.color  = agree ? '#4ade80' : '#fca5a5';
      cmp.textContent  = agree
        ? `✓ Model ve NASA hemfikir (${sbdbPha ? 'PHA' : 'Güvenli'})`
        : `⚠ Model: ${modelPha ? 'PHA' : 'Güvenli'} · NASA: ${sbdbPha ? 'PHA' : 'Güvenli'}`;
    }
  } else {
    badge.textContent = '〜 Yaklaşık';
    badge.style.background = 'rgba(71,85,105,0.4)';
    badge.style.color = '#94a3b8';
    badge.style.border = '1px solid #475569';
    const cmp = document.getElementById('nasa-compare');
    if (cmp) cmp.style.display = 'none';
  }
}

async function selectAsteroid(idx) {
  // Önceki seçimi temizle
  const prev = appState.selectedIdx;
  if (prev !== null) {
    const prevEl = document.getElementById(`ast-item-${prev}`);
    if (prevEl) prevEl.classList.remove('selected');
  }
  appState.selectedIdx = idx;
  const el = document.getElementById(`ast-item-${idx}`);
  if (el) {
    el.classList.add('selected');
    el.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

  const ast = appState.asteroids[idx];

  // Başlık
  const titleEl  = document.getElementById('sim-title-text');
  const threatEl = document.getElementById('threat-badge');
  if (titleEl)  titleEl.textContent = ast.name;
  if (threatEl) {
    threatEl.textContent = ast.is_pha
      ? `TEHLİKELİ (güven: ${ast.confidence}%)`
      : `GÜVENLİ (güven: ${(100 - ast.confidence).toFixed(1)}%)`;
    threatEl.className = `threat-badge ${ast.is_pha ? 'danger' : 'safe'}`;
  }

  // Panelleri göster
  showSimPanels();

  // Canvas boyutla
  const cw = document.getElementById('canvas-wrap');
  const ca = document.getElementById('orbit-canvas');
  const dpr = window.devicePixelRatio || 1;
  ca.width  = cw.offsetWidth  * dpr;
  ca.height = cw.offsetHeight * dpr;
  ca.style.width  = cw.offsetWidth  + 'px';
  ca.style.height = cw.offsetHeight + 'px';

  // ── AŞAMA 1: Anında başlat (üretilmiş yaklaşık veri) ──────────
  if (!window._orbSim) {
    window._orbSim = new OrbitalSimulator(ca);
  } else {
    window._orbSim.canvas = ca;
    window._orbSim.ctx    = ca.getContext('2d');
  }
  window._orbSim.setOrbital(ast.orbital);
  window._orbSim.start();
  renderOrbitalParams(ast, ast.orbital, false);
  fetchDistancesWithOrbital(ast, ast.orbital);
  setSourceBadge(false, null, ast.is_pha);

  // ── AŞAMA 2: Arka planda NASA SBDB'den gerçek veri ────────────
  const sbdb = await fetchSBDBOrbital(ast.name);
  if (sbdb && appState.selectedIdx === idx) {   // hâlâ aynı asteroid seçili mi?
    window._orbSim.setOrbital(sbdb);
    renderOrbitalParams(ast, sbdb, true);
    fetchDistancesWithOrbital(ast, sbdb);
    setSourceBadge(true, sbdb.sbdb_pha, ast.is_pha);
  }
}

// ──────────────────────────────────────────────────────────────
// ORBITAL PARAMETERS TABLE
// ──────────────────────────────────────────────────────────────
function renderOrbitalParams(ast, orb, isReal) {
  const grid = document.getElementById('params-grid');
  const diamStr = ast.diam_min_m > 0 ? `${ast.diam_min_m.toFixed(0)} m` : '— m';
  const moidVal = orb.moid != null ? `${Number(orb.moid).toFixed(4)} AU` : `${ast.miss_dist_au.toFixed(4)} AU`;
  const moidColor = ast.is_pha ? '#fca5a5' : '#6ee7b7';
  const srcLabel = isReal
    ? '<span style="color:#4ade80;font-size:0.7rem;margin-left:4px">📡 NASA JPL</span>'
    : '<span style="color:#64748b;font-size:0.7rem;margin-left:4px">〜 Yaklaşık</span>';

  grid.innerHTML = `
    <div class="param-item">
      <div class="param-label">Yarı büyük eksen (a) ${srcLabel}</div>
      <div class="param-value">${orb.semi_major_axis.toFixed(4)} AU</div>
    </div>
    <div class="param-item">
      <div class="param-label">Eksantriklik (e)</div>
      <div class="param-value">${orb.eccentricity.toFixed(4)}</div>
    </div>
    <div class="param-item">
      <div class="param-label">Eğim (i)</div>
      <div class="param-value">${orb.inclination.toFixed(2)}°</div>
    </div>
    <div class="param-item">
      <div class="param-label">MOID</div>
      <div class="param-value" style="color:${moidColor}">${moidVal}</div>
    </div>
    <div class="param-item">
      <div class="param-label">Tahmini çap</div>
      <div class="param-value">${diamStr}</div>
    </div>
    <div class="param-item">
      <div class="param-label">Orbital periyot</div>
      <div class="param-value">${orb.period.toFixed(1)} gün</div>
    </div>
    <div class="param-item">
      <div class="param-label">Perihel</div>
      <div class="param-value">${orb.perihelion.toFixed(4)} AU</div>
    </div>
    <div class="param-item">
      <div class="param-label">Afel</div>
      <div class="param-value">${orb.aphelion.toFixed(4)} AU</div>
    </div>
    <div class="param-item">
      <div class="param-label">Mutlak büyüklük</div>
      <div class="param-value">${ast.h_mag}</div>
    </div>
  `;
}

// ──────────────────────────────────────────────────────────────
// DISTANCE CHART
// ──────────────────────────────────────────────────────────────
async function fetchDistancesWithOrbital(ast, orbital) {
  try {
    const res  = await fetch('/api/distances', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ orbital }),
    });
    const data = await res.json();
    renderDistanceChart(data, ast);
  } catch (e) {
    console.warn('Distance fetch failed:', e);
  }
}

// Geriye dönük uyumluluk
async function fetchDistances(ast) {
  return fetchDistancesWithOrbital(ast, ast.orbital);
}

function renderDistanceChart(data, ast) {
  const ctx = document.getElementById('dist-chart').getContext('2d');

  if (appState.distChart) {
    appState.distChart.destroy();
    appState.distChart = null;
  }

  const color = ast.is_pha ? '#f97316' : '#10b981';
  const colorRgb = ast.is_pha ? '249,115,22' : '16,185,129';

  appState.distChart = new Chart(ctx, {
    type: 'line',
    data: {
      labels:   data.years.map(y => y.toFixed(1)),
      datasets: [
        {
          label:           'Dünya\'ya mesafe (AU)',
          data:            data.distances,
          borderColor:     color,
          borderWidth:     2,
          pointRadius:     0,
          fill:            true,
          backgroundColor: `rgba(${colorRgb},0.15)`,
          tension:         0.3,
        },
        {
          label:           'PHA eşiği (0.05 AU)',
          data:            new Array(data.years.length).fill(0.05),
          borderColor:     'rgba(239,68,68,0.6)',
          borderWidth:     1.5,
          borderDash:      [6, 4],
          pointRadius:     0,
          fill:            false,
          tension:         0,
        },
      ],
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#111128',
          borderColor:      '#2e2e64',
          borderWidth:      1,
          titleColor:       '#94a3b8',
          bodyColor:        '#e2e8f0',
          callbacks: {
            title: items => `${items[0].label}`,
            label: item  => ` ${item.dataset.label}: ${Number(item.raw).toFixed(4)} AU`,
          },
        },
      },
      scales: {
        x: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#475569', maxTicksLimit: 6, font: { size: 10 } },
        },
        y: {
          grid:  { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#475569', font: { size: 10 },
            callback: v => v.toFixed(2) + ' AU',
          },
          min: 0,
        },
      },
    },
  });
}

// ──────────────────────────────────────────────────────────────
// HELPERS
// ──────────────────────────────────────────────────────────────
function escHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ──────────────────────────────────────────────────────────────
// INIT
// ──────────────────────────────────────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  initUpload();
  initUploadStars();
});

// Animated star background on upload screen
function initUploadStars() {
  const container = document.querySelector('.upload-stars');
  if (!container) return;
  for (let i = 0; i < 120; i++) {
    const s = document.createElement('div');
    s.style.cssText = `
      position:absolute;
      left:${Math.random()*100}%;
      top:${Math.random()*100}%;
      width:${0.5 + Math.random()*1.5}px;
      height:${0.5 + Math.random()*1.5}px;
      background:#fff;
      border-radius:50%;
      opacity:${0.1 + Math.random()*0.6};
      animation: star-twinkle ${2 + Math.random()*4}s ease-in-out ${Math.random()*4}s infinite alternate;
    `;
    container.appendChild(s);
  }

  const style = document.createElement('style');
  style.textContent = `
    @keyframes star-twinkle {
      0%   { opacity: 0.1; transform: scale(0.8); }
      100% { opacity: 0.8; transform: scale(1.2); }
    }
  `;
  document.head.appendChild(style);
}
