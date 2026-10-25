"""Train a small, reproducible flood forecasting network on synthetic scenarios.

Run: python train.py (requires numpy). The website needs no Python runtime.
"""
from pathlib import Path
import csv
import json
import numpy as np

ROOT = Path(__file__).resolve().parent
RANGES = np.array([[0.5, 7.0], [0, 100], [10, 100], [0.5, 8.0], [-0.3, 0.5]])


def generate(count=2400, seed=42):
    rng = np.random.default_rng(seed)
    inputs = rng.uniform(RANGES[:, 0], RANGES[:, 1], size=(count, 5))
    level, rain, soil, upstream, trend = inputs.T
    current = level.copy()
    targets = []
    # ponytail: illustrative water balance, replace with measured basin data for real use.
    for hour in range(1, 7):
        runoff = 0.0045 * rain * (0.35 + soil / 100) * np.exp(-0.12 * (hour - 1))
        inflow = 0.09 * (upstream - current)
        current = np.clip(current + runoff + inflow + trend * np.exp(-0.5 * hour) - 0.055, 0, 12)
        targets.append(current + rng.normal(0, 0.035, count))
    return inputs, np.stack(targets, axis=1)


def train():
    inputs, targets = generate()
    order = np.random.default_rng(91).permutation(len(inputs))
    train_ids, val_ids, test_ids = np.split(order, [1680, 2040])
    mean, scale = inputs[train_ids].mean(0), inputs[train_ids].std(0)
    x = (inputs - mean) / scale
    # Predict change from current level, improving the persistence comparison.
    y = targets - inputs[:, :1]
    rng = np.random.default_rng(7)
    sizes = [5, 24, 16, 6]
    weights = [rng.normal(0, np.sqrt(1 / a), (a, b)) for a, b in zip(sizes, sizes[1:])]
    biases = [np.zeros(b) for b in sizes[1:]]
    parameters = weights + biases
    moments = [np.zeros_like(p) for p in parameters]
    variances = [np.zeros_like(p) for p in parameters]

    def forward(features):
        a = np.tanh(features @ weights[0] + biases[0])
        b = np.tanh(a @ weights[1] + biases[1])
        return a, b, b @ weights[2] + biases[2]

    best_loss, best, best_epoch = float('inf'), None, 0
    history = []
    xt, yt = x[train_ids], y[train_ids]
    for epoch in range(1, 1801):
        a, b, predicted = forward(xt)
        error = 2 * (predicted - yt) / yt.size
        db = (error @ weights[2].T) * (1 - b * b)
        da = (db @ weights[1].T) * (1 - a * a)
        gradients = [xt.T @ da, a.T @ db, b.T @ error, da.sum(0), db.sum(0), error.sum(0)]
        for i, (parameter, gradient) in enumerate(zip(parameters, gradients)):
            moments[i] = 0.9 * moments[i] + 0.1 * gradient
            variances[i] = 0.999 * variances[i] + 0.001 * gradient ** 2
            parameter -= 0.008 * (moments[i] / (1 - 0.9 ** epoch)) / (np.sqrt(variances[i] / (1 - 0.999 ** epoch)) + 1e-8)
        validation = float(np.mean((forward(x[val_ids])[2] - y[val_ids]) ** 2))
        if validation < best_loss:
            best_loss, best_epoch = validation, epoch
            best = [p.copy() for p in parameters]
        if epoch % 100 == 0:
            history.append({'epoch': epoch, 'train_mse': float(np.mean((predicted - yt) ** 2)), 'validation_mse': validation})
    for parameter, saved in zip(parameters, best):
        parameter[:] = saved
    predicted = np.clip(forward(x[test_ids])[2] + inputs[test_ids, :1], 0, 12)
    actual = targets[test_ids]
    persistence = np.repeat(inputs[test_ids, :1], 6, axis=1)
    metrics = {
        'mae_m': float(np.mean(np.abs(actual - predicted))),
        'rmse_m': float(np.sqrt(np.mean((actual - predicted) ** 2))),
        'persistence_mae_m': float(np.mean(np.abs(actual - persistence))),
        'samples': len(inputs), 'train_samples': len(train_ids),
        'validation_samples': len(val_ids), 'test_samples': len(test_ids),
        'best_epoch': best_epoch,
        'per_hour_mae_m': np.mean(np.abs(actual - predicted), axis=0).tolist(),
    }
    payload = {
        'name': 'FloodWatch Dense Network', 'version': 1, 'seed': 42,
        'architecture': sizes, 'activation': 'tanh', 'horizon_hours': 6,
        'features': ['level_m', 'rainfall_mm_h', 'soil_saturation_pct', 'upstream_m', 'trend_m_h'],
        'ranges': RANGES.tolist(), 'mean': mean.tolist(), 'scale': scale.tolist(),
        'weights': [w.tolist() for w in weights], 'biases': [b.tolist() for b in biases],
        'metrics': metrics, 'training_history': history,
        'provenance': 'Synthetic independent scenarios. Not calibrated to a real river. No operational validity.',
        'test_case': {'input': inputs[test_ids[0]].tolist(), 'prediction': predicted[0].tolist()},
    }
    (ROOT / 'dist' / 'model.json').write_text(json.dumps(payload, separators=(',', ':')), encoding='utf-8')
    with (ROOT / 'dist' / 'sample-data.csv').open('w', newline='', encoding='utf-8') as handle:
        writer = csv.writer(handle)
        writer.writerow(payload['features'])
        writer.writerows(np.round(inputs[test_ids[:20]], 4).tolist())
    print(json.dumps(metrics, indent=2))


if __name__ == '__main__':
    train()
