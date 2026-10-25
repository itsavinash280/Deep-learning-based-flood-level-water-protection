'use strict';
const $ = id => document.getElementById(id);
const icon = name => `<svg aria-hidden="true"><use href="#i-${name}"/></svg>`;
const stations = [
  { name: 'North Bridge', input: [3.62, 38, 76, 4.8, 0.12] },
  { name: 'East Spillway', input: [4.24, 46, 84, 5.4, 0.18] },
  { name: 'Meadow Bend', input: [2.46, 12, 48, 2.9, 0.02] },
  { name: 'Lower Basin', input: [5.12, 65, 91, 6.4, 0.26] },
];
const viewInfo = {
  overview: ['Overview', 'Flood monitoring overview', 'Understand the river. Anticipate the rise. Stay a step ahead.'],
  forecast: ['Flood forecast', 'A forecast you can explore', 'Change the conditions. See how the river could respond.'],
  protection: ['Protection center', 'Prepare for what comes next', 'Explore a protective response in a safe, simulated environment.'],
  model: ['Model & data', 'The intelligence behind the outlook', 'Transparent training. Reproducible results. Clear limitations.'],
};
let model, selectedStation = 0, input = [...stations[0].input], predictions = [], horizon = 6;
let currentView = 'overview', barrierClosed = false, pumpActive = false, batch = null;
let activities = [], toastTimer;

const mobileNavigation = window.matchMedia('(max-width: 760px)');
function setNavigation(open, returnFocus = false) {
  const expanded = mobileNavigation.matches && open;
  $('sidebar').classList.toggle('open', expanded);
  $('sidebar').inert = mobileNavigation.matches && !expanded;
  $('nav-backdrop').hidden = !expanded;
  $('menu-toggle').setAttribute('aria-expanded', String(expanded));
  if (expanded) $('close-nav').focus();
  else if (returnFocus) $('menu-toggle').focus();
}
mobileNavigation.addEventListener('change', () => setNavigation(false));
setNavigation(false);

function showView(name) {
  if (!viewInfo[name]) name = 'overview';
  currentView = name;
  document.querySelectorAll('.view').forEach(element => { element.hidden = element.id !== `${name}-view`; });
  document.querySelectorAll('.nav-item[data-view]').forEach(element => {
    element.classList.toggle('active', element.dataset.view === name);
    if (element.dataset.view === name) element.setAttribute('aria-current', 'page');
    else element.removeAttribute('aria-current');
  });
  const [label, title, description] = viewInfo[name];
  $('breadcrumb-current').textContent = label;
  $('page-title').textContent = title;
  $('page-description').textContent = description;
  setNavigation(false);
  if (model && name === 'overview') requestAnimationFrame(renderChart);
}
document.querySelectorAll('[data-view]').forEach(element => element.addEventListener('click', event => {
  event.preventDefault();
  location.hash = element.dataset.view;
  showView(element.dataset.view);
  window.scrollTo({ top: 0, behavior: 'smooth' });
}));
window.addEventListener('hashchange', () => showView(location.hash.slice(1)));
$('menu-toggle').addEventListener('click', () => {
  setNavigation(!$('sidebar').classList.contains('open'));
});
['close-nav', 'nav-backdrop'].forEach(id => $(id).addEventListener('click', () => setNavigation(false, true)));
document.addEventListener('keydown', event => {
  if (event.key === 'Escape' && $('sidebar').classList.contains('open')) setNavigation(false, true);
});
$('open-simulator').addEventListener('click', () => { location.hash = 'forecast'; showView('forecast'); $('input-level').focus(); });

function notify(message) {
  $('toast').textContent = message;
  $('toast').hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000);
}
function activity(title, detail, name = 'check') {
  activities.unshift({ title, detail, name, time: new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', timeZone: 'Asia/Kolkata' }) });
  activities = activities.slice(0, 3);
  // Text is generated internally; user CSV cells are never inserted as markup.
  $('activity-list').innerHTML = activities.map(item => `<div class="activity-item"><span class="activity-icon">${icon(item.name)}</span><div class="activity-text"><strong>${item.title}</strong><p>${item.detail}</p><small>${item.time} IST · session event</small></div></div>`).join('');
}
function spark(values, color) {
  const min = Math.min(...values), max = Math.max(...values);
  const points = values.map((value, i) => `${i * 80 / (values.length - 1)},${20 - (value - min) / (max - min || 1) * 15}`).join(' ');
  return `<svg viewBox="0 0 82 24" aria-hidden="true"><polyline points="${points}" fill="none" stroke="${color}"/></svg>`;
}
function setStatus(id, state, prefix = '') { $(id).textContent = prefix + state.label; $(id).className = `status ${state.tone}`; }
function renderChart() {
  const history = Array.from({ length: 7 }, (_, i) => Math.max(0, input[0] - (6 - i) * input[4]));
  const future = predictions.slice(0, horizon);
  const all = [...history, ...future];
  const width = Math.max(300, Math.round($('forecast-chart').getBoundingClientRect().width));
  const height = 245, left = 43, right = 24, top = 28, bottom = 36;
  const max = Math.max(6, Math.ceil(Math.max(...all) + 0.5)), min = Math.max(0, Math.floor(Math.min(...all) - 1));
  const x = index => left + index / (6 + horizon) * (width - left - right);
  const y = value => top + (max - value) / (max - min) * (height - top - bottom);
  const points = (values, offset) => values.map((v, i) => `${x(i + offset).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
  const ticks = Array.from({ length: 5 }, (_, i) => min + (max - min) / 4 * i);
  const grid = ticks.map(v => `<line x1="${left}" x2="${width - right}" y1="${y(v)}" y2="${y(v)}" stroke="#e9ede3" stroke-dasharray="3 4"/><text x="${left - 11}" y="${y(v) + 3}" text-anchor="end" fill="#52665d" font-size="12">${v.toFixed(1)}</text>`).join('');
  const labelInterval = width < 420 ? (horizon === 6 ? 4 : 3) : (horizon === 6 ? 2 : 1);
  const labels = Array.from({ length: 6 + horizon + 1 }, (_, i) => i).filter(i => i % labelInterval === 0).map(i => `<text x="${x(i)}" y="${height - 13}" text-anchor="middle" fill="#52665d" font-size="12">${String(3 + i).padStart(2, '0')}:00</text>`).join('');
  const observed = points(history, 0), predicted = points([input[0], ...future], 6);
  const forecastArea = `M ${predicted.replaceAll(' ', ' L ')} L ${x(6 + horizon)} ${height - bottom} L ${x(6)} ${height - bottom} Z`;
  const observedArea = `M ${observed.replaceAll(' ', ' L ')} L ${x(6)} ${height - bottom} L ${left} ${height - bottom} Z`;
  const lastLevel = future[future.length - 1];
  $('forecast-chart').innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-label="${horizon}-hour water level forecast, from ${input[0].toFixed(2)} to ${lastLevel.toFixed(2)} metres. Warning threshold 4 metres. History is reconstructed from the scenario trend." preserveAspectRatio="none"><defs><linearGradient id="observed-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#80b89a" stop-opacity=".22"/><stop offset="100%" stop-color="#80b89a" stop-opacity=".015"/></linearGradient><linearGradient id="future-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#a1becb" stop-opacity=".22"/><stop offset="100%" stop-color="#a1becb" stop-opacity=".02"/></linearGradient></defs><g font-family="DM Sans,Segoe UI,sans-serif">${grid}<path d="${observedArea}" fill="url(#observed-fill)"/><path d="${forecastArea}" fill="url(#future-fill)"/><line x1="${left}" x2="${width - right}" y1="${y(4)}" y2="${y(4)}" stroke="#d7bb83" stroke-dasharray="5 5"/><text x="${width - 19}" y="${y(4) - 7}" text-anchor="end" fill="#805b17" font-size="11">Warning · 4.0 m</text><line x1="${x(6)}" x2="${x(6)}" y1="${top}" y2="${height - bottom}" stroke="#b7c8ad" stroke-dasharray="3 4"/><rect x="${x(6) - 18}" y="8" width="36" height="15" rx="3" fill="#eef4e8"/><text x="${x(6)}" y="18" fill="#415d38" text-anchor="middle" font-size="11">NOW</text><polyline points="${observed}" fill="none" stroke="#5b9977" stroke-width="2.4"/><polyline points="${predicted}" fill="none" stroke="#86a5b5" stroke-width="2.2" stroke-dasharray="5 4"/><circle cx="${x(6)}" cy="${y(input[0])}" r="4.5" fill="#4e906b" stroke="white" stroke-width="2"/>${future.map((v, i) => `<circle cx="${x(i + 7)}" cy="${y(v)}" r="3" fill="white" stroke="#86a5b5" stroke-width="1.5"><title>+${i + 1} h: ${v.toFixed(2)} m</title></circle>`).join('')}${labels}<text x="${left}" y="10" fill="#52665d" font-size="11">WATER LEVEL (m)</text></g></svg>`;
}
function updateDashboard() {
  predictions = FloodCore.predict(model, input);
  const peak = Math.max(...predictions), peakHour = predictions.indexOf(peak) + 1;
  const state = FloodCore.risk(Math.max(peak, input[0]));
  $('level-value').textContent = input[0].toFixed(2);
  $('peak-value').textContent = peak.toFixed(2);
  $('rain-value').textContent = input[1].toFixed(1);
  $('trend-value').textContent = `${input[4] >= 0 ? '↗ +' : '↘ '}${input[4].toFixed(2)} m`;
  $('peak-time').textContent = `At ${String(9 + peakHour).padStart(2, '0')}:00 IST ·`;
  $('rain-description').textContent = input[1] >= 50 ? 'High input ·' : input[1] >= 20 ? 'Moderate input ·' : 'Low input ·';
  $('risk-value').textContent = state.label;
  $('risk-value').style.color = state.tone === 'critical' ? 'var(--red)' : state.tone === 'warning' ? 'var(--amber)' : 'var(--teal)';
  $('risk-note').textContent = state.tone === 'normal' ? 'Below demo warning threshold' : 'Demo threshold exceeded';
  $('risk-pointer').style.left = `${state.tone === 'critical' ? 91 : state.tone === 'warning' ? 67 : 17}%`;
  $('level-spark').innerHTML = spark([0, 1, 0.5, 2, 2.4, 2.1, 4, 3.7, 4.6].map(v => v * (input[4] >= 0 ? 1 : -1)), '#5b9977');
  $('peak-spark').innerHTML = spark([input[0], ...predictions], '#7c9fae');
  setStatus('insight-badge', state, 'Forecast: ');
  $('insight-title').textContent = state.tone === 'normal' ? 'A steadier outlook ahead.' : state.tone === 'warning' ? 'Water levels need attention.' : 'A sharp rise is projected.';
  const crossing = predictions.findIndex(v => v >= 4);
  $('insight-copy').textContent = `The model projects a peak of ${peak.toFixed(2)} m in ${peakHour} ${peakHour === 1 ? 'hour' : 'hours'}. ` + (input[0] >= 4 ? 'The current scenario already exceeds the demo warning threshold.' : crossing >= 0 ? `The demo warning threshold is crossed in ${crossing + 1} ${crossing === 0 ? 'hour' : 'hours'}.` : 'Levels stay below the demo warning threshold throughout the forecast.');
  setStatus('forecast-risk', state);
  $('forecast-table').innerHTML = `<table class="forecast-table"><caption class="sr-only">Hourly neural network water level predictions</caption><thead><tr><th>Forecast time</th><th>Water level</th><th>Risk</th></tr></thead><tbody>${predictions.map((v, i) => { const r = FloodCore.risk(v); return `<tr><td>${String(10 + i).padStart(2, '0')}:00 <span class="muted">(+${i + 1}h)</span></td><td><strong>${v.toFixed(2)} m</strong></td><td><span class="status ${r.tone}">${r.label}</span></td></tr>`; }).join('')}</tbody></table>`;
  setStatus('protection-risk', state);
  $('protection-advice').textContent = state.action;
  renderChart();
}
function fillForm(values) { ['level', 'rain', 'soil', 'upstream', 'trend'].forEach((key, i) => { $(`input-${key}`).value = values[i]; }); }
function updateStationTabs() {
  $('station-tabs').innerHTML = stations.map((station, i) => {
    const r = FloodCore.risk(station.input[0]);
    const color = r.tone === 'critical' ? '#c9806c' : r.tone === 'warning' ? '#c5a058' : '#74a282';
    return `<button class="station-button ${selectedStation === i ? 'selected' : ''}" data-select-station="${i}" aria-pressed="${selectedStation === i}" aria-label="Select ${station.name}, ${station.input[0].toFixed(2)} metres"><span class="dot" style="background:${color}"></span><span><strong>${station.name}</strong><small><b>${station.input[0].toFixed(2)} m</b> · ${r.label}</small></span></button>`;
  }).join('');
  document.querySelectorAll('[data-select-station]').forEach(button => button.addEventListener('click', () => selectStation(Number(button.dataset.selectStation))));
  document.querySelectorAll('.map-station').forEach(marker => marker.classList.toggle('selected', Number(marker.dataset.station) === selectedStation));
}
function selectStation(index) {
  selectedStation = index;
  input = [...stations[index].input];
  $('station-select').value = String(index);
  $('form-message').textContent = '';
  fillForm(input); updateStationTabs(); updateDashboard();
  activity('Station selected', `${stations[index].name} scenario loaded.`, 'pin');
}
$('station-select').addEventListener('change', event => { if (model) selectStation(Number(event.target.value)); });
document.querySelectorAll('[data-horizon]').forEach(button => button.addEventListener('click', () => {
  horizon = Number(button.dataset.horizon);
  document.querySelectorAll('[data-horizon]').forEach(b => { b.classList.toggle('selected', b === button); b.setAttribute('aria-pressed', String(b === button)); });
  if (model) renderChart();
}));
document.querySelectorAll('[data-preset]').forEach(button => button.addEventListener('click', () => {
  const presets = { calm: [2.1, 5, 35, 2.4, -0.02], rain: [3.6, 65, 88, 5.2, 0.16], extreme: [4.8, 95, 98, 7.5, 0.4] };
  fillForm(presets[button.dataset.preset]);
  $('form-message').textContent = 'Preset ready. Select Generate forecast to apply.';
}));
$('scenario-form').addEventListener('submit', event => {
  event.preventDefault();
  if (!model) { $('form-message').textContent = 'Model is unavailable. Reload the page to retry.'; return; }
  try {
    const values = ['level', 'rain', 'soil', 'upstream', 'trend'].map(key => Number($(`input-${key}`).value));
    FloodCore.validate(values); input = values;
    stations[selectedStation].input = [...input];
    updateStationTabs(); updateDashboard();
    $('form-message').textContent = `Forecast generated for ${stations[selectedStation].name}. See hourly results beside this form.`;
    activity('Forecast regenerated', 'Custom inputs applied to selected demo station.', 'trend');
    notify('Six-hour forecast updated.');
  } catch (error) { $('form-message').textContent = error.message; }
});
function download(content, name, type) {
  const url = URL.createObjectURL(new Blob([content], { type }));
  const link = document.createElement('a'); link.href = url; link.download = name;
  document.body.append(link); link.click(); link.remove(); setTimeout(() => URL.revokeObjectURL(url), 1000);
}
$('export-data').addEventListener('click', () => {
  if (!model) { notify('Model unavailable. Reload the page to retry.'); return; }
  const header = `station,source,${FloodCore.features.join(',')},forecast_hour,predicted_level_m,risk`;
  const rows = predictions.map((v, i) => `${stations[selectedStation].name},synthetic,${input.join(',')},${i + 1},${v.toFixed(4)},${FloodCore.risk(v).label}`);
  download([header, ...rows].join('\n'), 'floodwatch-forecast.csv', 'text/csv;charset=utf-8');
  notify('Forecast CSV exported.');
});
$('csv-input').addEventListener('change', async event => {
  batch = null; $('download-batch').hidden = true; $('upload-message').textContent = '';
  const file = event.target.files[0];
  if (!file) return;
  try {
    if (!model) throw new Error('Model is unavailable. Reload the page to retry.');
    if (file.size > 100000) throw new Error('CSV must be smaller than 100 KB.');
    const rows = FloodCore.parseCSV(await file.text());
    batch = rows.map(row => ({ input: row, output: FloodCore.predict(model, row) }));
    $('upload-message').textContent = `${rows.length} scenarios validated and forecast. Ready to download.`;
    $('download-batch').hidden = false;
    activity('Batch forecast completed', `${rows.length} uploaded scenarios processed locally.`, 'file');
  } catch (error) { $('upload-message').textContent = error.message; }
});
$('download-batch').addEventListener('click', () => {
  if (!batch) return;
  const header = `${FloodCore.features.join(',')},${Array.from({ length: 6 }, (_, i) => `level_plus_${i + 1}h_m`).join(',')},peak_forecast_risk`;
  const rows = batch.map(row => [...row.input, ...row.output.map(v => v.toFixed(4)), FloodCore.risk(Math.max(...row.output)).label].join(','));
  download([header, ...rows].join('\n'), 'floodwatch-batch-predictions.csv', 'text/csv;charset=utf-8');
});
function renderDevices() {
  $('barrier-state').textContent = `${barrierClosed ? 'Closed' : 'Open'} · simulation`;
  $('barrier-toggle').textContent = barrierClosed ? 'Open barrier' : 'Close barrier';
  $('barrier-toggle').setAttribute('aria-pressed', String(barrierClosed));
  $('pump-state').textContent = `${pumpActive ? 'On' : 'Off'} · simulation`;
  $('pump-toggle').textContent = pumpActive ? 'Stop pump' : 'Activate pump';
  $('pump-toggle').setAttribute('aria-pressed', String(pumpActive));
}
$('barrier-toggle').addEventListener('click', () => {
  barrierClosed = !barrierClosed; renderDevices();
  $('protection-message').textContent = `Demo barrier ${barrierClosed ? 'closed' : 'opened'}. No hardware command sent.`;
  activity('Barrier simulation updated', barrierClosed ? 'Demo barrier closed.' : 'Demo barrier opened.', 'shield');
});
$('pump-toggle').addEventListener('click', () => {
  pumpActive = !pumpActive; renderDevices();
  $('protection-message').textContent = `Demo pump ${pumpActive ? 'activated' : 'stopped'}. No hardware command sent.`;
  activity('Pump simulation updated', pumpActive ? 'Demo pump activated.' : 'Demo pump stopped.', 'wave');
});
$('apply-protection').addEventListener('click', () => {
  if (!model) { $('protection-message').textContent = 'Model unavailable. Reload to retry.'; return; }
  const state = FloodCore.risk(Math.max(input[0], ...predictions));
  barrierClosed = state.tone !== 'normal'; pumpActive = state.tone === 'critical'; renderDevices();
  $('protection-message').textContent = `${state.label} response applied in simulation. No hardware command sent.`;
  activity('Protective response simulated', `${state.label} response applied to browser controls.`, 'shield');
  notify('Suggested response applied to simulation.');
});

async function init() {
  showView(location.hash.slice(1)); renderDevices();
  document.querySelectorAll('#scenario-form button,#export-data,#csv-input,#apply-protection').forEach(el => { el.disabled = true; });
  try {
    const response = await fetch('model.json');
    if (!response.ok) throw new Error('Model file could not be loaded.');
    model = await response.json();
    $('model-mae').textContent = model.metrics.mae_m.toFixed(3);
    $('model-rmse').textContent = model.metrics.rmse_m.toFixed(3);
    $('model-baseline').textContent = model.metrics.persistence_mae_m.toFixed(3);
    fillForm(input); updateStationTabs(); updateDashboard();
    activity('Model loaded', 'Trained network ready for local inference.', 'chip');
    activity('Demo stations initialized', 'Four synthetic station scenarios available.', 'pin');
    activity('Forecast generated', 'Six-hour water level projection is ready.', 'trend');
    document.querySelectorAll('#scenario-form button,#export-data,#csv-input,#apply-protection').forEach(el => { el.disabled = false; });
  } catch (error) {
    $('load-error').hidden = false;
    $('load-error').textContent = 'The model could not be loaded. Start the site with “node server.cjs”, then open http://127.0.0.1:4173. Direct file:// access does not support loading the model.';
    $('insight-title').textContent = 'Model unavailable';
    $('insight-copy').textContent = 'Reload the site after checking the local server.';
  }
}
window.addEventListener('floodwatch:authenticated', init, { once: true });
let chartResizeFrame;
window.addEventListener('resize', () => {
  if (!model || currentView !== 'overview') return;
  cancelAnimationFrame(chartResizeFrame);
  chartResizeFrame = requestAnimationFrame(renderChart);
});
