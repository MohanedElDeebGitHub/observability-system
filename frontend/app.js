/* ── State ──────────────────────────────────────────────────── */
const state = {
  metrics: null,
  alerts: [],
  history: [],
  source: null,
  demo: false,
  lastErrorCount: 0,
  reconnectTimer: null,
  hoverIdx: null,   // chart hover index
  chartMode: 'both' // 'both' | 'total' | 'errors'
};

const $  = (id) => document.getElementById(id);
const fmt = (v)  => Number(v || 0).toLocaleString();
const timeAgo = (date) => {
  const s = Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 1000));
  return s < 5 ? 'just now' : s < 60 ? `${s}s ago` : `${Math.floor(s / 60)}m ago`;
};

/* ── Connection status ──────────────────────────────────────── */
function setConnection(status, label) {
  $('connectionDot').className  = `state-light ${status}`;
  $('sidebarLight').className   = `state-light ${status}`;
  $('connectionLabel').textContent = label;
  $('sidebarStatus').textContent   = label;
}

/* ── Metrics update ─────────────────────────────────────────── */
function updateMetrics(snapshot) {
  state.metrics = snapshot;
  const services   = snapshot.logsByService || {};
  const errorCount = Number(snapshot.errorLogs || 0);

  $('totalLogs').textContent      = fmt(snapshot.totalLogs);
  $('totalSmall').textContent     = fmt(snapshot.totalLogs);
  $('eventsPerSecond').textContent = Number(snapshot.eventsPerSecond || 0).toFixed(1);
  $('errorRate').textContent      = `${Number(snapshot.errorRate || 0).toFixed(1)}%`;
  $('errorCount').textContent     = fmt(errorCount);
  $('serviceCount').textContent   = fmt(Object.keys(services).length);
  $('infoLogs').textContent       = fmt(snapshot.infoLogs);
  $('warnLogs').textContent       = fmt(snapshot.warnLogs);
  $('errorLogs').textContent      = fmt(snapshot.errorLogs);

  // BUG FIX: was using --blue / --rose which don't exist in CSS; use correct vars
  const total = Math.max(1, snapshot.totalLogs || 0);
  const info  = (snapshot.infoLogs  || 0) / total * 100;
  const warn  = info + (snapshot.warnLogs || 0) / total * 100;
  $('donut').style.background =
    `conic-gradient(var(--cyan) 0 ${info}%, var(--amber) ${info}% ${warn}%, var(--red) ${warn}% 100%)`;

  // BUG FIX: removed !state.demo guard — alerts should fire in demo mode too
  if (errorCount > state.lastErrorCount) {
    const delta = errorCount - state.lastErrorCount;
    renderAlert({
      serviceName: Object.keys(services)[Math.floor(Math.random() * Object.keys(services).length)] || 'pipeline',
      message: `${delta} new error ${delta === 1 ? 'event' : 'events'} detected`,
      timestamp: snapshot.lastEventTimestamp || new Date().toISOString()
    });
  }
  state.lastErrorCount = errorCount;

  renderServices(services);
  pushHistory(snapshot);
  drawChart();
  $('chartEmpty').style.display = state.history.length ? 'none' : 'grid';
  $('lastUpdated').textContent  = snapshot.lastEventTimestamp
    ? `Last event ${timeAgo(snapshot.lastEventTimestamp)}`
    : 'Live stream active';
}

/* ── Services ───────────────────────────────────────────────── */
function renderServices(services) {
  const entries = Object.entries(services).sort((a, b) => b[1] - a[1]);
  const max     = Math.max(1, ...entries.map(([, v]) => v));
  $('serviceList').innerHTML = entries.length
    ? entries.map(([name, count]) => `
        <div class="service-row">
          <span class="service-name">${escapeHtml(name)}</span>
          <span class="service-value">${fmt(count)} events</span>
          <div class="bar"><span style="width:${count / max * 100}%"></span></div>
        </div>`).join('')
    : '<div class="empty-state"><span>◌</span><p>Listening for services</p></div>';
}

/* ── History + Chart ────────────────────────────────────────── */
function pushHistory(snapshot) {
  const point = { total: Number(snapshot.totalLogs || 0), errors: Number(snapshot.errorLogs || 0) };
  const last  = state.history.at(-1);
  if (!last || last.total !== point.total) state.history.push(point);
  if (state.history.length > 30) state.history.shift();
}

function drawChart(hoverX) {
  const canvas = $('volumeChart');
  const rect   = canvas.getBoundingClientRect();
  const ratio  = window.devicePixelRatio || 1;
  canvas.width  = rect.width  * ratio;
  canvas.height = rect.height * ratio;
  const ctx = canvas.getContext('2d');
  ctx.scale(ratio, ratio);

  const w   = rect.width, h = rect.height;
  const pad = { t: 14, r: 12, b: 28, l: 38 };
  ctx.clearRect(0, 0, w, h);

  // Grid lines + Y labels
  const maxVal = Math.max(...state.history.map(p => p.total), 1);
  ctx.font      = '9px JetBrains Mono, monospace';
  ctx.fillStyle = '#4a5568';
  for (let i = 0; i < 4; i++) {
    const y = pad.t + (h - pad.t - pad.b) * i / 3;
    ctx.strokeStyle = 'rgba(255,255,255,0.04)';
    ctx.lineWidth   = 1;
    ctx.beginPath(); ctx.moveTo(pad.l, y); ctx.lineTo(w - pad.r, y); ctx.stroke();
    if (i > 0) ctx.fillText(`${Math.round(maxVal * (3 - i) / 3)}`, 2, y + 3);
  }

  if (state.history.length < 2) return;

  const xStep = (w - pad.l - pad.r) / (state.history.length - 1);

  const drawLine = (key, color, alpha = 1) => {
    ctx.beginPath();
    state.history.forEach((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (h - pad.t - pad.b) * (1 - p[key] / maxVal);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    // Fill under line
    ctx.lineTo(pad.l + (state.history.length - 1) * xStep, h - pad.b);
    ctx.lineTo(pad.l, h - pad.b);
    ctx.globalAlpha = 0.1 * alpha;
    ctx.fillStyle   = color;
    ctx.fill();
    ctx.globalAlpha = alpha;
    // Stroke
    ctx.beginPath();
    state.history.forEach((p, i) => {
      const x = pad.l + i * xStep;
      const y = pad.t + (h - pad.t - pad.b) * (1 - p[key] / maxVal);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    });
    ctx.strokeStyle = color;
    ctx.lineWidth   = 2;
    ctx.lineJoin    = 'round';
    ctx.stroke();
    ctx.globalAlpha = 1;
  };

  if (state.chartMode !== 'errors') drawLine('total',  '#38d9f5');
  if (state.chartMode !== 'total')  drawLine('errors', '#f05a6e');

  // ── Hover crosshair + tooltip ────────────────────────────────
  if (hoverX !== undefined && state.history.length > 1) {
    const idx = Math.round((hoverX - pad.l) / xStep);
    if (idx >= 0 && idx < state.history.length) {
      state.hoverIdx = idx;
      const x   = pad.l + idx * xStep;
      const pt  = state.history[idx];

      // Crosshair vertical line
      ctx.strokeStyle = 'rgba(255,255,255,0.15)';
      ctx.lineWidth   = 1;
      ctx.setLineDash([4, 4]);
      ctx.beginPath(); ctx.moveTo(x, pad.t); ctx.lineTo(x, h - pad.b); ctx.stroke();
      ctx.setLineDash([]);

      // Dots on lines
      const drawDot = (key, color) => {
        const y = pad.t + (h - pad.t - pad.b) * (1 - pt[key] / maxVal);
        ctx.beginPath();
        ctx.arc(x, y, 4, 0, Math.PI * 2);
        ctx.fillStyle   = color;
        ctx.fill();
        ctx.strokeStyle = '#060810';
        ctx.lineWidth   = 2;
        ctx.stroke();
      };
      if (state.chartMode !== 'errors') drawDot('total',  '#38d9f5');
      if (state.chartMode !== 'total')  drawDot('errors', '#f05a6e');

      // Tooltip box
      const tipW = 130, tipH = 58, tipPad = 10;
      let tipX = x + 14;
      if (tipX + tipW > w - pad.r) tipX = x - tipW - 14;
      const tipY = pad.t + 4;

      ctx.fillStyle   = 'rgba(11,14,26,0.92)';
      ctx.strokeStyle = 'rgba(255,255,255,0.1)';
      ctx.lineWidth   = 1;
      const r = 6;
      ctx.beginPath();
      ctx.roundRect(tipX, tipY, tipW, tipH, r);
      ctx.fill(); ctx.stroke();

      ctx.font      = '9px JetBrains Mono, monospace';
      ctx.fillStyle = '#5a6680';
      ctx.fillText(`SNAPSHOT ${idx + 1} / ${state.history.length}`, tipX + tipPad, tipY + 16);

      ctx.font      = '11px JetBrains Mono, monospace';
      if (state.chartMode !== 'errors') {
        ctx.fillStyle = '#38d9f5';
        ctx.fillText(`▸ ${fmt(pt.total)} total`, tipX + tipPad, tipY + 33);
      }
      if (state.chartMode !== 'total') {
        ctx.fillStyle = '#f05a6e';
        ctx.fillText(`▸ ${fmt(pt.errors)} errors`, tipX + tipPad, tipY + (state.chartMode === 'both' ? 50 : 33));
      }
    }
  } else {
    state.hoverIdx = null;
  }
}

/* ── Alert enrichment helpers ───────────────────────────────── */
function genEventId() {
  return 'evt-' + Math.random().toString(36).slice(2, 10).toUpperCase();
}
function kafkaTopic(serviceName) {
  return `${(serviceName || 'system').replace(/-service$/, '')}.errors`;
}

/* ── Alerts ─────────────────────────────────────────────────── */
function renderAlert(alert) {
  // Enrich with metadata if not already present
  if (!alert.eventId)   alert.eventId   = genEventId();
  if (!alert.topic)     alert.topic     = kafkaTopic(alert.serviceName);
  if (!alert.partition) alert.partition = Math.floor(Math.random() * 6);
  if (!alert.offset)    alert.offset    = 10000 + Math.floor(Math.random() * 90000);

  state.alerts.unshift(alert);
  state.alerts = state.alerts.slice(0, 8);
  $('navAlertCount').textContent = state.alerts.length;
  $('activityList').innerHTML = state.alerts.map((item, idx) => `
    <div class="activity-item" data-idx="${idx}" role="button" tabindex="0" aria-label="View details for ${escapeHtml(item.serviceName || 'System')} alert">
      <div class="activity-icon">!</div>
      <div class="activity-main">
        <div class="activity-title">${escapeHtml(item.serviceName || 'System')} · error detected</div>
        <div class="activity-message">${escapeHtml(item.message || 'An error event was received')}</div>
      </div>
      <span class="activity-time">${timeAgo(item.timestamp || Date.now())}</span>
    </div>`).join('');

  // Re-bind click handlers after innerHTML replace
  document.querySelectorAll('.activity-item').forEach(el => {
    el.addEventListener('click', () => openDrawer(Number(el.dataset.idx)));
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') openDrawer(Number(el.dataset.idx)); });
  });
}

/* ── Drawer ─────────────────────────────────────────────────── */
function openDrawer(idx) {
  const alert = state.alerts[idx];
  if (!alert) return;

  const ts = new Date(alert.timestamp || Date.now());
  const payload = JSON.stringify({
    eventId:     alert.eventId,
    serviceName: alert.serviceName,
    logLevel:    'ERROR',
    message:     alert.message,
    timestamp:   ts.toISOString(),
    topic:       alert.topic,
    partition:   alert.partition,
    offset:      alert.offset
  }, null, 2);

  $('drawerTitle').textContent     = alert.serviceName || 'System';
  $('drawerMessage').textContent   = alert.message || 'An error event was received';
  $('drawerEventId').textContent   = alert.eventId;
  $('drawerTimestamp').textContent = ts.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'medium' });
  $('drawerTopic').textContent     = alert.topic;
  $('drawerPartition').textContent = `${alert.partition}`;
  $('drawerOffset').textContent    = fmt(alert.offset);
  $('drawerPayload').textContent   = payload;

  const drawer   = $('alertDrawer');
  const backdrop = $('drawerBackdrop');
  drawer.hidden  = false;
  requestAnimationFrame(() => {
    drawer.classList.add('open');
    backdrop.classList.add('open');
  });
  drawer.focus();
}

function closeDrawer() {
  const drawer   = $('alertDrawer');
  const backdrop = $('drawerBackdrop');
  drawer.classList.remove('open');
  backdrop.classList.remove('open');
  drawer.addEventListener('transitionend', () => { drawer.hidden = true; }, { once: true });
}

// Drawer controls
$('drawerClose').addEventListener('click', closeDrawer);
$('drawerBackdrop').addEventListener('click', closeDrawer);
$('drawerDismiss').addEventListener('click', () => {
  // Find and remove the alert whose drawer is open
  const title = $('drawerTitle').textContent;
  const eventId = $('drawerEventId').textContent;
  state.alerts = state.alerts.filter(a => a.eventId !== eventId);
  $('navAlertCount').textContent = state.alerts.length;
  if (state.alerts.length === 0) {
    $('activityList').innerHTML = `
      <div class="empty-state">
        <span>✓</span><p>All quiet for now</p>
        <small>Error signals will appear here.</small>
      </div>`;
  } else {
    renderAlert(state.alerts.shift()); // re-render remaining (unshift re-adds it)
    state.alerts.unshift(state.alerts.shift());
    // simpler: just rebuild the list
    $('navAlertCount').textContent = state.alerts.length;
    $('activityList').innerHTML = state.alerts.map((item, idx) => `
      <div class="activity-item" data-idx="${idx}" role="button" tabindex="0">
        <div class="activity-icon">!</div>
        <div class="activity-main">
          <div class="activity-title">${escapeHtml(item.serviceName || 'System')} · error detected</div>
          <div class="activity-message">${escapeHtml(item.message || 'An error event was received')}</div>
        </div>
        <span class="activity-time">${timeAgo(item.timestamp || Date.now())}</span>
      </div>`).join('');
    document.querySelectorAll('.activity-item').forEach(el => {
      el.addEventListener('click', () => openDrawer(Number(el.dataset.idx)));
    });
  }
  closeDrawer();
});
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeDrawer(); });

function escapeHtml(text) {
  return String(text).replace(/[&<>'"]/g, c =>
    ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[c]));
}

/* ── Event handling ─────────────────────────────────────────── */
function handleEvent(payload) {
  if (typeof payload === 'string') { try { payload = JSON.parse(payload); } catch { return; } }
  if (!payload || typeof payload !== 'object') return;
  const level = String(payload.logLevel || '').toUpperCase();
  if ('totalLogs' in payload || 'logsByService' in payload) updateMetrics(payload);
  else if ('serviceName' in payload && ('message' in payload || level === 'ERROR')) renderAlert(payload);
}

/* ── Connection ─────────────────────────────────────────────── */
function connect() {
  if (state.source) state.source.close();
  if (state.reconnectTimer) clearTimeout(state.reconnectTimer);
  setConnection('connecting', 'Connecting');
  try {
    state.source = new EventSource('/api/events');
    state.source.onopen    = ()      => { state.demo = false; setConnection('', 'Live'); };
    state.source.onmessage = (e)     => handleEvent(e.data);
    state.source.addEventListener('alert', (e) => handleEvent(e.data));
    state.source.onerror   = ()      => {
      // Don't reconnect if demo mode has taken over — avoids infinite
      // "Reconnecting" loop when no backend is reachable.
      if (state.demo) return;
      setConnection('offline', 'Reconnecting');
      state.source.close();
      state.reconnectTimer = setTimeout(() => { if (!state.demo) connect(); }, 4000);
    };
  } catch { setConnection('offline', 'Unavailable'); }
}

/* ── Demo mode ──────────────────────────────────────────────── */
function startDemo() {
  if (state.metrics || state.demo) return;
  // Cancel any pending reconnect so it doesn't later overwrite demo status
  if (state.reconnectTimer) { clearTimeout(state.reconnectTimer); state.reconnectTimer = null; }
  state.demo = true;
  setConnection('connecting', 'Demo');
  let tick = 0;
  const services = { 'order-service': 42, 'payment-service': 29, 'user-service': 18 };
  const demoTick = () => {
    tick++;
    const total  = 89 + tick * 4;
    const errors = Math.floor(total * 0.06) + (tick % 3 === 0 ? 1 : 0);
    Object.keys(services).forEach(k => { services[k] += Math.floor(Math.random() * 3); });
    updateMetrics({
      totalLogs: total, infoLogs: total - errors - 9, warnLogs: 9, errorLogs: errors,
      logsByService: { ...services }, eventsPerSecond: (2.8 + Math.random()).toFixed(1),
      errorRate: errors / total * 100, lastEventTimestamp: new Date().toISOString()
    });
  };
  demoTick();
  setInterval(() => { if (state.demo) demoTick(); }, 3000);
}

/* ── Chart interactivity ────────────────────────────────────── */
(function initChartInteraction() {
  const canvas = $('volumeChart');

  canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    drawChart(e.clientX - rect.left);
  });

  canvas.addEventListener('mouseleave', () => drawChart());

  canvas.addEventListener('click', () => {
    const modes = ['both', 'total', 'errors'];
    state.chartMode = modes[(modes.indexOf(state.chartMode) + 1) % modes.length];
    // Update legend highlight
    document.querySelectorAll('.legend-btn').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === state.chartMode || state.chartMode === 'both');
    });
    drawChart();
  });

  canvas.style.cursor = 'crosshair';
})();

/* ── Nav: view switching + scroll-spy ──────────────────────── */
(function initNav() {
  const sections = [
    { id: 'top',       navId: 'nav-overview' },
    { id: 'services',  navId: 'nav-services'  },
    { id: 'activity',  navId: 'nav-activity'  },
  ];

  // Scroll-spy: highlight nav item matching the section most in view
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;
      const match = sections.find(s => s.id === entry.target.id);
      if (!match) return;
      document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
      const navEl = $(match.navId);
      if (navEl) navEl.classList.add('active');
    });
  }, { threshold: 0.35 });

  sections.forEach(s => {
    const el = $(s.id) || document.querySelector(`[id="${s.id}"]`);
    if (el) observer.observe(el);
  });

  // Click: smooth scroll + immediate active state
  document.querySelectorAll('.nav-link').forEach(link => {
    link.addEventListener('click', (e) => {
      const href   = link.getAttribute('href');
      const target = href === '#top' ? document.getElementById('top') : document.querySelector(href);
      if (target) {
        e.preventDefault();
        document.querySelectorAll('.nav-link').forEach(l => l.classList.remove('active'));
        link.classList.add('active');
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    });
  });
})();

/* ── Legend toggle buttons ──────────────────────────────────── */
(function initLegend() {
  document.querySelectorAll('.legend-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.mode;
      state.chartMode = (state.chartMode === mode) ? 'both' : mode;
      document.querySelectorAll('.legend-btn').forEach(b => {
        b.classList.toggle('active', b.dataset.mode === state.chartMode || state.chartMode === 'both');
      });
      drawChart();
    });
  });
})();

/* ── Bootstrap ──────────────────────────────────────────────── */
$('refreshButton').addEventListener('click', () => {
  // Exit demo mode so the real connection attempt isn't suppressed
  state.demo = false;
  connect();
});
$('clearButton').addEventListener('click', () => {
  state.alerts = [];
  $('navAlertCount').textContent = '0';
  $('activityList').innerHTML = `
    <div class="empty-state">
      <span>✓</span>
      <p>All quiet for now</p>
      <small>Error signals will appear here.</small>
    </div>`;
});
window.addEventListener('resize', () => drawChart());
connect();
setTimeout(startDemo, 1200);
