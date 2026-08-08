/* Grid Log - static front end. No build step, no framework.
   Reads data/index.json for the list of available dates, then
   data/{date}.json for that day's figures. */

const COLORS = {
  gen: '#4fd1a5',
  demand: '#f2a93b',
  shed: '#e8604c',
  fuel: {
    Coal: '#2a78d6',
    Gas: '#eb6834',
    Imports: '#1baf7a',
    Oil: '#eda100',
    Renewables: '#639922',
  },
  grid: '#22302a',
  tick: '#8fa092',
};

let charts = {};
let currentData = null;

async function loadIndex() {
  const res = await fetch('data/index.json');
  if (!res.ok) throw new Error(`data/index.json failed to load (HTTP ${res.status})`);
  const idx = await res.json();
  return idx.dates || [];
}

async function loadDate(dateStr) {
  const res = await fetch(`data/summary/${dateStr}.json`);
  if (!res.ok) throw new Error(`data/summary/${dateStr}.json failed to load (HTTP ${res.status})`);
  return res.json();
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function renderMeters(d) {
  const s = d.summary;
  const shedTotal = d.hourly
    .filter(h => h.hour.endsWith(':00'))
    .reduce((sum, h) => sum + (h.load_shed_mw || 0), 0);

  const meters = [
    { label: 'Evening peak demand', value: fmt(s.evening_peak_demand_mw), unit: 'MW' },
    { label: 'Evening peak generation', value: fmt(s.evening_peak_generation_mw), unit: 'MW' },
    { label: 'Load-shed today', value: fmt(shedTotal), unit: 'MWh', deficit: true },
    { label: 'Max temperature', value: fmt(s.max_temperature_c, 1), unit: '&deg;C' },
    { label: 'Est. CO&#8322; today', value: fmt(d.fuel_mix.co2_total_tonnes_estimated), unit: 't' },
  ];

  document.getElementById('meter-strip').innerHTML = meters.map(m => `
    <div class="meter">
      <div class="meter-label">${m.label}</div>
      <div class="meter-value${m.deficit ? ' deficit' : ''}">${m.value}<span class="unit">${m.unit}</span></div>
    </div>
  `).join('');
}

function destroyChart(key) {
  if (charts[key]) { charts[key].destroy(); delete charts[key]; }
}

function renderGenChart(d) {
  destroyChart('gen');
  const labels = d.hourly.map(h => h.hour);
  const ctx = document.getElementById('genChart');
  charts.gen = new Chart(ctx, {
    type: 'line',
    data: {
      labels,
      datasets: [
        { label: 'Generation', data: d.hourly.map(h => h.generation_mw), borderColor: COLORS.gen, backgroundColor: 'transparent', borderWidth: 2, pointRadius: 0, tension: 0.25 },
        { label: 'Demand', data: d.hourly.map(h => h.demand_mw), borderColor: COLORS.demand, backgroundColor: 'transparent', borderWidth: 2, borderDash: [4, 3], pointRadius: 0, tension: 0.25 },
      ],
    },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: COLORS.tick, maxTicksLimit: 8, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { display: false } },
        y: { ticks: { color: COLORS.tick, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: COLORS.grid } },
      },
    },
  });
}

function renderShedChart(d) {
  destroyChart('shed');
  const labels = d.hourly.map(h => h.hour);
  const ctx = document.getElementById('shedChart');
  charts.shed = new Chart(ctx, {
    type: 'bar',
    data: { labels, datasets: [{ data: d.hourly.map(h => h.load_shed_mw), backgroundColor: COLORS.shed, borderRadius: 2, maxBarThickness: 14 }] },
    options: {
      responsive: true, maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { ticks: { color: COLORS.tick, maxTicksLimit: 8, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { display: false } },
        y: { ticks: { color: COLORS.tick, font: { family: 'IBM Plex Mono', size: 10 } }, grid: { color: COLORS.grid } },
      },
    },
  });
}

function groupFuelMix(fuelMix) {
  const pct = fuelMix.fuel_mix_pct;
  const groups = {
    Coal: (pct.Coal || 0),
    Gas: (pct['Gas-Public'] || 0) + (pct['Gas-Pvt'] || 0),
    Imports: (pct.HVDC || 0) + (pct.Nepal || 0) + (pct.Tripura || 0) + (pct.Adani || 0),
    Oil: (pct['HFO-Public'] || 0) + (pct['HFO-Pvt'] || 0),
    Renewables: (pct.Solar || 0) + (pct.Hydro || 0),
  };
  return groups;
}

function renderFuelChart(d) {
  destroyChart('fuel');
  const groups = groupFuelMix(d.fuel_mix);
  const labels = Object.keys(groups);
  const values = Object.values(groups);
  const ctx = document.getElementById('fuelChart');
  charts.fuel = new Chart(ctx, {
    type: 'doughnut',
    data: { labels, datasets: [{ data: values, backgroundColor: labels.map(l => COLORS.fuel[l]), borderColor: '#161f1a', borderWidth: 2 }] },
    options: { responsive: true, maintainAspectRatio: false, cutout: '65%', plugins: { legend: { display: false }, tooltip: { enabled: false } } },
  });

  document.getElementById('fuel-legend').innerHTML = labels.map((l, i) => `
    <li>
      <span class="fuel-name"><span class="swatch" style="background:${COLORS.fuel[l]}"></span>${l}</span>
      <span class="fuel-pct">${fmt(values[i], 1)}%</span>
    </li>
  `).join('');
}

function renderCo2Table(d) {
  const fm = d.fuel_mix;
  const labelMap = fm.fuel_labels;
  const rows = Object.entries(fm.co2_tonnes_by_fuel)
    .filter(([, tonnes]) => tonnes > 0)
    .sort((a, b) => b[1] - a[1]);

  let html = rows.map(([fuel, tonnes]) => `
    <tr>
      <td class="co2-fuel">${labelMap[fuel] || fuel}</td>
      <td class="co2-val">${fmt(tonnes)} t</td>
    </tr>
  `).join('');

  html += `
    <tr class="co2-total">
      <td>Estimated total</td>
      <td class="co2-val">${fmt(fm.co2_total_tonnes_estimated)} t</td>
    </tr>
  `;

  document.getElementById('co2-table').innerHTML = html;
  document.getElementById('co2-caveat').textContent =
    `Based on typical fuel emission factors for coal, gas, and oil-fired generation. ` +
    `${fmt(fm.co2_unestimated_mwh)} MWh of cross-border imports (HVDC, Nepal, Tripura) are excluded, since their generating source isn't published in this report.`;
}

function renderDivisions(d) {
  const max = Math.max(...d.divisions.map(z => z.evening_peak_load_mw));
  document.getElementById('division-bars').innerHTML = d.divisions.map(z => `
    <div class="division-row">
      <span class="division-name">${z.division}</span>
      <div class="division-track"><div class="division-fill" style="width:${(z.evening_peak_load_mw / max * 100).toFixed(1)}%"></div></div>
      <span class="division-val">${fmt(z.evening_peak_load_mw)}</span>
    </div>
  `).join('');
}
function renderAll(d) {
  currentData = d;
  renderMeters(d);
  renderGenChart(d);
  renderShedChart(d);
  renderFuelChart(d);
  renderCo2Table(d);
  renderDivisions(d);
}

async function init() {
  try {
    const dates = await loadIndex();
    const select = document.getElementById('date-select');

    if (dates.length === 0) {
      document.getElementById('loading').textContent = 'No data yet. Add a dated JSON file to /data and rebuild the index.';
      return;
    }

    select.innerHTML = dates.slice().reverse().map(dt => `<option value="${dt}">${dt}</option>`).join('');

    select.addEventListener('change', async () => {
      try {
        const d = await loadDate(select.value);
        renderAll(d);
      } catch (e) {
        alert(`Couldn't load ${select.value}: ${e.message}`);
      }
    });

    const latest = dates[dates.length - 1];
    select.value = latest;
    const d = await loadDate(latest);

    document.getElementById('loading').hidden = true;
    document.getElementById('content').hidden = false;
    renderAll(d);
  } catch (e) {
    const loading = document.getElementById('loading');
    loading.textContent = `Couldn't load the grid data: ${e.message}. Check that data/index.json and the dated files it lists actually exist at those paths in your repo.`;
    console.error(e);
  }
}

init();
