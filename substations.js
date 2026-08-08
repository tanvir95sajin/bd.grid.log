/* Grid Log - Substations page. */

let currentData = null;
let currentLevel = 'all';
let currentSearch = '';

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

function dash(v) { return v === undefined || v === null ? '—' : v; }

function renderList() {
  const subs = Object.values(currentData.substations)
    .filter(s => currentLevel === 'all' || s.voltage_level === currentLevel)
    .filter(s => s.name.toLowerCase().includes(currentSearch.toLowerCase()))
    .sort((a, b) => (b.load_mw || 0) - (a.load_mw || 0));

  document.getElementById('sub-count-note').textContent = `${Object.keys(currentData.substations).length} substations`;

  const list = document.getElementById('sub-list');
  list.innerHTML = subs.map(s => `
    <li data-sub="${encodeURIComponent(s.name)}">
      <span>${s.name}</span>
      <span class="peak">${s.load_mw !== undefined ? fmt(s.load_mw) + ' MW' : (s.voltage_level || '—')}</span>
    </li>
  `).join('');

  list.querySelectorAll('li').forEach(li => {
    li.addEventListener('click', () => {
      list.querySelectorAll('li').forEach(x => x.classList.remove('active'));
      li.classList.add('active');
      showDetail(decodeURIComponent(li.dataset.sub));
    });
  });
}

function showDetail(name) {
  const s = currentData.substations[name];
  const rows = [
    ['Voltage level', dash(s.voltage_level)],
    ['Peak load served', s.load_mw !== undefined ? fmt(s.load_mw) + ' MW' : '—'],
    ['Peak load at', dash(s.load_time)],
    ['Maximum voltage', s.max_voltage_kv !== undefined ? fmt(s.max_voltage_kv) + ' kV' : '—'],
    ['Maximum at', dash(s.max_voltage_time)],
    ['Minimum voltage', s.min_voltage_kv !== undefined ? fmt(s.min_voltage_kv) + ' kV' : '—'],
    ['Minimum at', dash(s.min_voltage_time)],
  ];

  document.getElementById('sub-detail').innerHTML = `
    <p class="plant-detail-name">${name}</p>
    <table class="data-table"><tbody>
      ${rows.map(([k, v]) => `<tr><td>${k}</td><td class="num" style="text-align:left;">${v}</td></tr>`).join('')}
    </tbody></table>
  `;
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
    renderList();
    document.getElementById('sub-detail').innerHTML = '<p class="plant-detail-empty">Select a substation for its load and voltage readings.</p>';
  });

  currentData = await loadDate(select.value);
  document.getElementById('loading').hidden = true;
  document.getElementById('content').hidden = false;
  renderList();

  document.getElementById('sub-search').addEventListener('input', (e) => {
    currentSearch = e.target.value;
    renderList();
  });

  document.querySelectorAll('#voltage-filter .filter-chip').forEach(chip => {
    chip.addEventListener('click', () => {
      document.querySelectorAll('#voltage-filter .filter-chip').forEach(c => c.classList.remove('active'));
      chip.classList.add('active');
      currentLevel = chip.dataset.level;
      renderList();
    });
  });
}

init();
