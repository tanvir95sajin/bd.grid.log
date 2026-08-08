/* Grid Log - Plants page. */

const COLORS = { gen: '#4fd1a5', tick: '#8fa092', grid: '#22302a' };

let charts = {};
let currentData = null;
let currentFilter = 'all';
let currentSearch = '';

async function loadIndex() {
  const res = await fetch('data/index.json');
  if (!res.ok) throw new Error(`data/index.json failed to load (HTTP ${res.status})`);
  return (await res.json()).dates || [];
}

async function loadDate(dateStr) {
  const res = await fetch(`data/plants/${dateStr}.json`);
  if (!res.ok) throw new Error(`data/plants/${dateStr}.json failed to load (HTTP ${res.status})`);
  return res.json();
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function renderPlantList() {
  const d = currentData;
  const entries = Object.entries(d.plants)
    .filter(([, p]) => currentFilter === 'all' || p.status === currentFilter)
    .filter(([name]) => name.toLowerCase().includes(currentSearch.toLowerCase()))
    .sort((a, b) => b[1].peak_mw - a[1].peak_mw);

  const total = Object.keys(d.plants).length;
  const running = Object.values(d.plants).filter(p => p.status === 'running').length;
  document.getElementById('plant-count-note').textContent =
    `${total} plants named in the report &mdash; ${running} running, ${total - running} offline today`
      .replace('&mdash;', '\u2014');

  const list = document.getElementById('plant-list');
  list.innerHTML = entries.map(([name, p]) => `
    <li data-plant="${encodeURIComponent(name)}">
      <span>${name}</span>
      <span class="peak">${p.status === 'offline' ? '<span class="status-badge offline">off</span>' : (p.utilization_pct !== null && p.utilization_pct !== undefined ? fmt(p.utilization_pct) + '%' : fmt(p.peak_mw) + ' MW')}</span>
    </li>
  `).join('');

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      list.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      showPlantDetail(decodeURIComponent(li.dataset.plant));
    });
  });
}

function showPlantDetail(name) {
  const p = currentData.plants[name];
  const detail = document.getElementById('plant-detail');

  const metaRows = [
    ['Status', `<span class="status-badge ${p.status}">${p.status}</span>`],
    ['Fuel', p.fuel || '—'],
    ['Producer', p.producer || '—'],
    ['Installed capacity', p.installed_capacity_mw ? fmt(p.installed_capacity_mw) + ' MW' : '—'],
    ['Working capacity', p.present_capacity_mw ? fmt(p.present_capacity_mw) + ' MW' : '—'],
    ['Peak output today', fmt(p.peak_mw) + ' MW'],
    ['% of working capacity', p.utilization_pct !== null && p.utilization_pct !== undefined ? fmt(p.utilization_pct, 1) + '%' : '—'],
    ['Energy today', fmt((p.energy_kwh || 0) / 1000, 1) + ' MWh'],
  ];

  let html = `<p class="plant-detail-name">${name}</p>`;
  if (p.status === 'offline' && p.cause) {
    html += `<p style="color:var(--coral); font-family:var(--font-mono); font-size:12.5px; margin: 0 0 14px;">Offline &mdash; ${p.cause}</p>`;
  }
  html += `<table class="data-table" style="margin-bottom:16px;"><tbody>` +
    metaRows.map(([k, v]) => `<tr><td>${k}</td><td class="num" style="text-align:left;">${v}</td></tr>`).join('') +
    `</tbody></table>`;

  if (p.hourly_mw && p.peak_mw > 0) {
    html += `<div class="chart-wrap chart-short"><canvas id="plantChart" role="img" aria-label="Hourly output of ${name}"></canvas></div>`;
  }
  detail.innerHTML = html;

  destroyChart('plant');
  if (p.hourly_mw && p.peak_mw > 0) {
    charts.plant = new Chart(document.getElementById('plantChart'), {
      type: 'line',
      data: {
        labels: p.hourly_mw.map(h => h.hour),
        datasets: [{ data: p.hourly_mw.map(h => h.mw), borderColor: COLORS.gen, backgroundColor: 'rgba(79,209,165,0.1)', fill: true, borderWidth: 2, pointRadius: 0, tension: 0.25 }],
      },
      options: {
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          x: { ticks: { color: COLORS.tick, maxTicksLimit: 8, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { display: false } },
          y: { ticks: { color: COLORS.tick, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: COLORS.grid }, beginAtZero: true },
        },
      },
    });
  }
}

async function init() {
  try {
    const dates = await loadIndex();
    const select = document.getElementById('date-select');

    if (dates.length === 0) {
      document.getElementById('loading').textContent = 'No data yet.';
      return;
    }

    select.innerHTML = dates.slice().reverse().map(dt => `<option value="${dt}">${dt}</option>`).join('');
    select.value = dates[dates.length - 1];

    select.addEventListener('change', async () => {
      try {
        currentData = await loadDate(select.value);
        renderPlantList();
        document.getElementById('plant-detail').innerHTML = '<p class="plant-detail-empty">Select a plant for its output, capacity, and status.</p>';
      } catch (e) {
        alert(`Couldn't load ${select.value}: ${e.message}`);
      }
    });

    currentData = await loadDate(select.value);
    document.getElementById('loading').hidden = true;
    document.getElementById('content').hidden = false;
    renderPlantList();

    document.getElementById('plant-search').addEventListener('input', (e) => {
      currentSearch = e.target.value;
      renderPlantList();
    });

    document.querySelectorAll('#status-filter .filter-chip').forEach(chip => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('#status-filter .filter-chip').forEach(c => c.classList.remove('active'));
        chip.classList.add('active');
        currentFilter = chip.dataset.status;
        renderPlantList();
      });
    });
  } catch (e) {
    const loading = document.getElementById('loading');
    loading.textContent = `Couldn't load the grid data: ${e.message}. Check that data/index.json and the dated files it lists actually exist at those paths in your repo.`;
    console.error(e);
  }
}

init();
