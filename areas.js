/* Grid Log - Areas page. */

const FUEL_COLORS = {
  Gas: '#eb6834', Coal: '#2a78d6', HFO: '#eda100', HSD: '#e87ba4',
  Hydro: '#1baf7a', Solar: '#008300', Import: '#4a3aa7',
};

let currentData = null;
let currentZone = null;

async function loadIndex() {
  const res = await fetch('data/index.json');
  return (await res.json()).dates || [];
}

async function loadDate(dateStr) {
  const res = await fetch(`data/${dateStr}.json`);
  return res.json();
}

function fmt(n, decimals = 0) {
  if (n === null || n === undefined || Number.isNaN(n)) return '—';
  return Number(n).toLocaleString('en-US', { maximumFractionDigits: decimals, minimumFractionDigits: decimals });
}

function renderTabs() {
  const zones = Object.keys(currentData.zone_fuel_summary_mkwhr);
  document.getElementById('area-tabs').innerHTML = zones.map(z => `
    <span class="area-tab${z === currentZone ? ' active' : ''}" data-zone="${z}">${z}</span>
  `).join('');

  document.querySelectorAll('.area-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      currentZone = tab.dataset.zone;
      renderTabs();
      renderZone();
    });
  });
}

function renderZone() {
  const d = currentData;
  const zoneLoad = d.divisions.find(z => z.division === currentZone);
  document.getElementById('area-title').textContent = currentZone;

  document.getElementById('area-meter').innerHTML = `
    <div class="meter">
      <div class="meter-label">Evening peak load</div>
      <div class="meter-value">${zoneLoad ? fmt(zoneLoad.evening_peak_load_mw) : '—'}<span class="unit">MW</span></div>
    </div>
  `;

  const fuel = d.zone_fuel_summary_mkwhr[currentZone] || {};
  const max = Math.max(...Object.values(fuel), 1);
  const rows = Object.entries(fuel)
    .filter(([, v]) => v > 0)
    .sort((a, b) => b[1] - a[1]);

  document.getElementById('area-fuel-bars').innerHTML = rows.map(([fuelName, v]) => `
    <div class="area-fuel-row">
      <span style="color:var(--text-dim)">${fuelName}</span>
      <div class="area-fuel-track"><div class="area-fuel-fill" style="width:${(v / max * 100).toFixed(1)}%; background:${FUEL_COLORS[fuelName] || '#8fa092'}"></div></div>
      <span class="area-fuel-val">${fmt(v, 1)} M kWh</span>
    </div>
  `).join('') || '<p style="color:var(--text-faint); font-size:13px;">No generation recorded for this zone.</p>';
}

function renderAllDivisions() {
  const d = currentData;
  const max = Math.max(...d.divisions.map(z => z.evening_peak_load_mw));
  document.getElementById('all-division-bars').innerHTML = d.divisions.map(z => `
    <div class="division-row">
      <span class="division-name">${z.division}</span>
      <div class="division-track"><div class="division-fill" style="width:${(z.evening_peak_load_mw / max * 100).toFixed(1)}%"></div></div>
      <span class="division-val">${fmt(z.evening_peak_load_mw)}</span>
    </div>
  `).join('');
}

async function init() {
  const dates = await loadIndex();
  const select = document.getElementById('date-select');

  if (dates.length === 0) {
    document.getElementById('loading').textContent = 'No data yet.';
    return;
  }

  select.innerHTML = dates.slice().reverse().map(dt => `<option value="${dt}">${dt}</option>`).join('');
  select.value = dates[dates.length - 1];

  select.addEventListener('change', async () => {
    currentData = await loadDate(select.value);
    renderTabs();
    renderZone();
    renderAllDivisions();
  });

  currentData = await loadDate(select.value);
  currentZone = d3Zone(currentData);

  document.getElementById('loading').hidden = true;
  document.getElementById('content').hidden = false;

  renderTabs();
  renderZone();
  renderAllDivisions();
}

function d3Zone(d) {
  // Default to the zone with the highest peak load (Dhaka, normally)
  const zones = Object.keys(d.zone_fuel_summary_mkwhr);
  const withLoad = d.divisions.length ? d.divisions[0].division : zones[0];
  return zones.includes(withLoad) ? withLoad : zones[0];
}

init();
