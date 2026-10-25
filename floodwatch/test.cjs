const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const core = require('./dist/core.js');
const model = JSON.parse(fs.readFileSync(path.join(__dirname, 'dist/model.json'), 'utf8'));

test('browser inference matches the Python model on held-out input', () => {
  const prediction = core.predict(model, model.test_case.input);
  prediction.forEach((value, i) => assert.ok(Math.abs(value - model.test_case.prediction[i]) < 1e-9));
  assert.equal(prediction.length, 6);
});
test('risk uses inclusive boundaries', () => {
  assert.equal(core.risk(3.999).label, 'Normal');
  assert.equal(core.risk(4).label, 'Warning');
  assert.equal(core.risk(5).label, 'Critical');
  assert.throws(() => core.risk(NaN));
});
test('invalid inputs fail before inference', () => {
  for (const input of [[3, 10], [3, NaN, 60, 4, 0], [3, 101, 60, 4, 0], [3, 20, 60, 4, Infinity], [3, -1, 60, 4, 0]]) {
    assert.throws(() => core.predict(model, input));
  }
});
test('CSV handles BOM and Windows newlines; rejects malformed and out-of-range rows', () => {
  const header = core.features.join(',');
  assert.deepEqual(core.parseCSV('\uFEFF' + header + '\r\n3.2,24,68,4.1,0.08\r\n'), [[3.2, 24, 68, 4.1, 0.08]]);
  for (const csv of ['wrong\n1,2,3,4,5', header + '\n3,,60,4,0', header + '\n3,101,60,4,0', header + '\n3,1,60,4,0,extra', header + '\n=cmd,1,60,4,0']) assert.throws(() => core.parseCSV(csv));
  assert.equal(core.parseCSV(fs.readFileSync(path.join(__dirname, 'dist/sample-data.csv'), 'utf8')).length, 20);
});
test('synthetic test performance beats persistence; split and weights are complete', () => {
  assert.ok(model.metrics.mae_m < model.metrics.persistence_mae_m);
  assert.ok(model.metrics.mae_m < 0.1);
  assert.equal(model.metrics.train_samples + model.metrics.validation_samples + model.metrics.test_samples, model.metrics.samples);
  assert.equal(model.metrics.test_samples, 360);
  model.weights.forEach((matrix, i) => {
    assert.equal(matrix.length, model.architecture[i]);
    assert.ok(matrix.every(row => row.length === model.architecture[i + 1] && row.every(Number.isFinite)));
  });
});
test('calm and extreme scenarios produce distinct finite six-hour projections', () => {
  const calm = core.predict(model, [2.1, 5, 35, 2.4, -0.02]);
  const extreme = core.predict(model, [4.8, 95, 98, 7.5, 0.4]);
  assert.ok([...calm, ...extreme].every(v => Number.isFinite(v) && v >= 0 && v <= 12));
  assert.equal(core.risk(Math.max(...calm)).label, 'Normal');
  assert.equal(core.risk(Math.max(...extreme)).label, 'Critical');
});
