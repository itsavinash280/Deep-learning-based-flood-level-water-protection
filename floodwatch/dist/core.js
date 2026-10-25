(function (root) {
  'use strict';
  const ranges = [[0.5, 7], [0, 100], [10, 100], [0.5, 8], [-0.3, 0.5]];
  const features = ['level_m', 'rainfall_mm_h', 'soil_saturation_pct', 'upstream_m', 'trend_m_h'];
  function validate(input) {
    if (!Array.isArray(input) || input.length !== 5) throw new Error('Provide all five input values.');
    input.forEach((value, i) => {
      if (!Number.isFinite(value) || value < ranges[i][0] || value > ranges[i][1]) {
        throw new Error(`${features[i]} must be between ${ranges[i][0]} and ${ranges[i][1]}.`);
      }
    });
    return input;
  }
  function predict(model, input) {
    validate(input);
    let values = input.map((v, i) => (v - model.mean[i]) / model.scale[i]);
    model.weights.forEach((matrix, layer) => {
      values = model.biases[layer].map((bias, j) => {
        const sum = values.reduce((total, v, i) => total + v * matrix[i][j], bias);
        return layer < model.weights.length - 1 ? Math.tanh(sum) : sum;
      });
    });
    return values.map(v => Math.max(0, Math.min(12, v + input[0])));
  }
  function risk(level) {
    if (!Number.isFinite(level) || level < 0) throw new Error('Invalid water level.');
    if (level >= 5) return { label: 'Critical', tone: 'critical', action: 'Simulate full barrier closure and pump activation.' };
    if (level >= 4) return { label: 'Warning', tone: 'warning', action: 'Simulate barrier preparation and pump standby.' };
    return { label: 'Normal', tone: 'normal', action: 'Continue simulated monitoring.' };
  }
  function parseCSV(text) {
    const lines = text.trim().replace(/^\uFEFF/, '').split(/\r?\n/).filter(line => line.trim());
    if (lines.length < 2 || lines.length > 501) throw new Error('Upload a CSV with 1–500 data rows.');
    const header = lines[0].split(',').map(s => s.trim());
    if (header.join(',') !== features.join(',')) throw new Error(`CSV headers must be: ${features.join(',')}`);
    return lines.slice(1).map((line, i) => {
      const cells = line.split(',').map(s => s.trim());
      if (cells.some(s => s === '') || cells.length !== 5) throw new Error(`Row ${i + 2}: provide five numeric values.`);
      try { return validate(cells.map(Number)); }
      catch (error) { throw new Error(`Row ${i + 2}: ${error.message}`); }
    });
  }
  const api = { predict, risk, validate, parseCSV, features, ranges };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.FloodCore = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
