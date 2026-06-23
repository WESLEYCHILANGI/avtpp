import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';

export default function SimulateToll() {
  const [vehicles, setVehicles] = useState([]);
  const [gates, setGates] = useState([]);
  const [mode, setMode] = useState('self'); // 'self' = my vehicle, 'gate' = plate scan
  const [vehicleId, setVehicleId] = useState('');
  const [plate, setPlate] = useState('');
  const [gateId, setGateId] = useState('');
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');

  const loadData = useCallback(async () => {
    try {
      const [vRes, gRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/toll/gates'),
      ]);
      setVehicles(vRes.data.vehicles);
      setGates(gRes.data.gates);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const switchMode = (next) => {
    setMode(next);
    setResult(null);
    setError('');
  };

  const handleProcess = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setProcessing(true);

    try {
      const res = mode === 'gate'
        ? await api.gateTrigger({ licencePlate: plate.trim(), gateId: parseInt(gateId) })
        : await api.post('/toll/process', { vehicleId: parseInt(vehicleId), gateId: parseInt(gateId) });
      setResult(res.data);
    } catch (err) {
      if (err.data) {
        setResult({ isError: true, errorMessage: err.data.error || err.message, ...err.data });
      } else {
        setError(err.message || 'Toll processing failed.');
      }
    } finally {
      setProcessing(false);
    }
  };

  const canSubmit = mode === 'gate' ? (plate.trim() && gateId) : (vehicleId && gateId);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div style={{ maxWidth: '600px', margin: '0 auto' }}>
      <div className="alert alert-info" style={{ marginBottom: '20px' }}>
        <strong>Toll Simulation Mode</strong> — Simulate an automated toll passage and deduction.
        Use <strong>My Vehicle</strong> for a self-service test, or <strong>Gate Scan</strong> to emulate a
        roadside device reading a licence plate at the barrier.
      </div>

      {/* Mode toggle */}
      <div className="card" style={{ marginBottom: '16px' }}>
        <div className="card-body" style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'self' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => switchMode('self')}
            id="mode-self-btn"
          >
            My Vehicle
          </button>
          <button
            type="button"
            className={`btn btn-sm ${mode === 'gate' ? 'btn-primary' : 'btn-outline'}`}
            onClick={() => switchMode('gate')}
            id="mode-gate-btn"
          >
            Gate Scan (licence plate)
          </button>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <h3>{mode === 'gate' ? 'Simulate Gate Scan' : 'Simulate Toll Passage'}</h3>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleProcess}>
            {mode === 'gate' ? (
              <div className="form-group">
                <label>Licence Plate Detected at Gate</label>
                <input
                  className="form-input"
                  list="known-plates"
                  placeholder="e.g. BAA 1234 ZM"
                  value={plate}
                  onChange={(e) => setPlate(e.target.value)}
                  required
                  id="plate-input"
                  style={{ textTransform: 'uppercase' }}
                />
                <datalist id="known-plates">
                  {vehicles.map(v => <option key={v.VehicleID} value={v.LicencePlate} />)}
                </datalist>
                <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '6px' }}>
                  The system resolves the plate to its registered owner and deducts automatically.
                  Try an unknown plate to see an unregistered-vehicle rejection.
                </p>
              </div>
            ) : (
              <div className="form-group">
                <label>Select Vehicle</label>
                <select className="form-select" value={vehicleId} onChange={(e) => setVehicleId(e.target.value)} required>
                  <option value="">— Choose a registered vehicle —</option>
                  {vehicles.map(v => (
                    <option key={v.VehicleID} value={v.VehicleID}>
                      {v.LicencePlate} — {v.Make} {v.Model} ({v.VehicleClass.replace('Class', 'C').replace('_', ' ')})
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="form-group">
              <label>Select Toll Gate</label>
              <select className="form-select" value={gateId} onChange={(e) => setGateId(e.target.value)} required>
                <option value="">— Choose a toll gate —</option>
                {gates.map(g => (
                  <option key={g.GateID} value={g.GateID}>
                    {g.GateName} — {g.Location} ({g.Province})
                  </option>
                ))}
              </select>
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={processing || !canSubmit} id="process-toll-btn">
              {processing
                ? 'Processing Toll...'
                : mode === 'gate' ? 'Trigger Gate Scan' : 'Process Toll Payment'}
            </button>
          </form>

          {/* Result */}
          {result && (
            <div style={{ marginTop: '24px' }}>
              {result.isError ? (
                <div className="alert alert-danger">
                  <div>
                    <strong>Payment Failed</strong>
                    <p style={{ margin: '6px 0 0', fontSize: '0.85rem' }}>{result.errorMessage}</p>
                    {result.shortfall != null && (
                      <p style={{ fontSize: '0.85rem' }}>Shortfall: K{result.shortfall.toFixed(2)} ZMW</p>
                    )}
                    <p style={{ fontSize: '0.85rem' }}>Barrier: CLOSED</p>
                  </div>
                </div>
              ) : (
                <div style={{ background: 'var(--success-100)', border: '1px solid var(--success-400)', borderRadius: 'var(--radius-md)', padding: '20px' }}>
                  <div style={{ textAlign: 'center', marginBottom: '16px' }}>
                    <h3 style={{ color: 'var(--success-600)' }}>Toll Processed</h3>
                    <p style={{ color: 'var(--gray-600)', fontSize: '0.85rem' }}>Barrier: RAISED</p>
                  </div>
                  <div style={{ background: 'white', borderRadius: 'var(--radius-sm)', padding: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Gate</span>
                      <span style={{ fontWeight: 600 }}>{result.transaction?.gate}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Vehicle</span>
                      <span style={{ fontWeight: 600 }}>{result.transaction?.vehicle}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                      <span style={{ color: 'var(--gray-500)' }}>Amount</span>
                      <span style={{ fontWeight: 700, color: 'var(--danger-600)' }}>-K{result.transaction?.amount?.toFixed(2)}</span>
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: 'var(--gray-500)' }}>New Balance</span>
                      <span style={{ fontWeight: 800, color: 'var(--success-600)' }}>K{result.transaction?.newBalance?.toFixed(2)}</span>
                    </div>
                    <div style={{ textAlign: 'center', marginTop: '8px', fontSize: '0.78rem', color: 'var(--gray-400)' }}>
                      Processed in {result.processingTimeMs}ms
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
