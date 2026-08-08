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
  const idx = await res.json();
  return idx.dates || [];
}

async function loadDate(dateStr) {
  const res = await fetch(`data/summary/${dateStr}.json`);
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

/* ---------- Zone map ---------- */

const ZONE_COORDS = {
  Dhaka: [90.4125, 23.8103],
  Chattogram: [91.7832, 22.3569],
  Cumilla: [91.1809, 23.4607],
  Mymensingh: [90.4203, 24.7471],
  Sylhet: [91.8687, 24.8949],
  Khulna: [89.5403, 22.8456],
  Barishal: [90.3535, 22.7010],
  Rajshahi: [88.6042, 24.3745],
  Rangpur: [89.2752, 25.7439],
};
// [lon, lat] - approximate coordinates for each zone's namesake city, used
// only to lay zones out in roughly correct relative positions - not a
// claim about exact plant or substation locations, which this report
// doesn't provide.

// Bangladesh ADM0 boundary, geoBoundaries (CC BY 4.0 / CC0), official download
// URL from the geoBoundaries API (geoboundaries.org/api/current/gbOpen/BGD/ADM0/).
const BD_BOUNDARY_URL = 'https://github.com/wmgeolab/geoBoundaries/raw/9469f09/releaseData/gbOpen/BGD/ADM0/geoBoundaries-BGD-ADM0_simplified.geojson';

const MAP_W = 420, MAP_H = 520;
let mapProjection = null;
let mapPathGen = null;
let selectedZone = null;
let boundaryGeo = null;

function fallbackProjection() {
  // Used only if the boundary fetch fails - simple linear lat/lon fit so
  // the map still works, just without the real coastline.
  const LAT_MIN = 20.5, LAT_MAX = 26.8, LON_MIN = 87.8, LON_MAX = 92.8;
  return (lonlat) => [
    ((lonlat[0] - LON_MIN) / (LON_MAX - LON_MIN)) * MAP_W,
    MAP_H - ((lonlat[1] - LAT_MIN) / (LAT_MAX - LAT_MIN)) * MAP_H,
  ];
}

async function loadBoundary() {
  try {
    const res = await fetch(BD_BOUNDARY_URL);
    if (!res.ok) throw new Error('fetch failed');
    boundaryGeo = await res.json();
    mapProjection = d3.geoMercator().fitSize([MAP_W, MAP_H], boundaryGeo);
    mapPathGen = d3.geoPath(mapProjection);
  } catch (e) {
    boundaryGeo = null;
    mapProjection = fallbackProjection();
    mapPathGen = null;
  }
}

function renderMap(d) {
  const zones = d.divisions;
  const maxLoad = Math.max(...zones.map(z => z.evening_peak_load_mw));
  const minR = 10, maxR = 38;

  const project = mapProjection || fallbackProjection();
  const countryPath = mapPathGen && boundaryGeo
    ? `<path d="${mapPathGen(boundaryGeo)}" fill="#dbe2d4" stroke="#8fa092" stroke-width="1"></path>`
    : '';

  const bubbles = zones.map(z => {
    const coords = ZONE_COORDS[z.division];
    if (!coords) return '';
    const [x, y] = project(coords);
    const scale = Math.sqrt(z.evening_peak_load_mw) / Math.sqrt(maxLoad);
    const r = minR + scale * (maxR - minR);
    const opacity = (0.45 + 0.55 * scale).toFixed(2);
    const isSelected = z.division === selectedZone;
    return `
      <g class="zone-bubble${isSelected ? ' selected' : ''}" data-zone="${z.division}" transform="translate(${x},${y})">
        <circle r="${r}" fill="#e08a1e" fill-opacity="${opacity}" stroke="#8a5410" stroke-width="${isSelected ? 2 : 0.75}"></circle>
        <text class="zone-label" text-anchor="middle" y="${r + 13}">${z.division}</text>
        <text class="zone-value" text-anchor="middle" y="${r + 25}">${fmt(z.evening_peak_load_mw)} MW</text>
      </g>`;
  }).join('');

  const svg = `
    <svg viewBox="0 0 ${MAP_W} ${MAP_H}" role="img" aria-label="Map of Bangladesh with bubbles over its nine grid zones, sized by evening peak load">
      ${countryPath}
      ${bubbles}
    </svg>`;

  const container = document.getElementById('zone-map');
  container.innerHTML = svg;

  container.querySelectorAll('.zone-bubble').forEach(el => {
    el.addEventListener('click', () => {
      selectedZone = el.dataset.zone;
      renderMap(d);
      renderMapDetail(d, selectedZone);
    });
  });
}

function renderMapDetail(d, zoneName) {
  const zone = d.divisions.find(z => z.division === zoneName);
  const fuel = d.zone_fuel_summary_mkwhr[zoneName] || {};
  const topFuels = Object.entries(fuel)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3);

  document.getElementById('map-detail').innerHTML = `
    <p class="plant-detail-name">${zoneName}</p>
    <p class="plant-detail-stats" style="margin-bottom: 12px;">Evening peak load <b>${fmt(zone.evening_peak_load_mw)} MW</b></p>
    <p style="font-family: var(--font-mono); font-size: 11px; text-transform: uppercase; letter-spacing: 0.05em; color: var(--amber); margin: 0 0 8px;">Leading fuels</p>
    ${topFuels.map(([f, v]) => `
      <div style="display:flex; justify-content:space-between; font-family:var(--font-mono); font-size:12px; padding:4px 0; border-bottom:1px solid var(--hairline); color:var(--text-dim);">
        <span>${f}</span><span>${fmt(v, 1)} M kWh</span>
      </div>`).join('')}
    <a href="areas.html" style="display:inline-block; margin-top:14px; font-family:var(--font-mono); font-size:11px; text-transform:uppercase; letter-spacing:0.05em; color:var(--amber); text-decoration:none;">Full breakdown &rarr;</a>
  `;
}

async function initMap(d) {
  selectedZone = d.divisions.length ? d.divisions[0].division : null;
  if (!mapProjection && !mapPathGen) {
    await loadBoundary();
  }
  renderMap(d);
  if (selectedZone) renderMapDetail(d, selectedZone);
}

function renderAll(d) {
  currentData = d;
  renderMeters(d);
  renderGenChart(d);
  renderShedChart(d);
  renderFuelChart(d);
  renderCo2Table(d);
  renderDivisions(d);
  initMap(d);
}

async function init() {
  const dates = await loadIndex();
  const select = document.getElementById('date-select');

  if (dates.length === 0) {
    document.getElementById('loading').textContent = 'No data yet. Add a dated JSON file to /data and rebuild the index.';
    return;
  }

  select.innerHTML = dates.slice().reverse().map(dt => `<option value="${dt}">${dt}</option>`).join('');

  select.addEventListener('change', async () => {
    const d = await loadDate(select.value);
    renderAll(d);
  });

  const latest = dates[dates.length - 1];
  select.value = latest;
  const d = await loadDate(latest);

  document.getElementById('loading').hidden = true;
  document.getElementById('content').hidden = false;
  renderAll(d);
}

init();
