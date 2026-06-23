import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import ActionMenu from '../components/ActionMenu';

const CLASSES = [
  { value: 'Class1_Motorcycle', label: 'Class 1 — Motorcycle (K20)' },
  { value: 'Class2_LightVehicle', label: 'Class 2 — Light Vehicle / Car (K40)' },
  { value: 'Class3_Minibus', label: 'Class 3 — Minibus (K50)' },
  { value: 'Class4_HeavyBus', label: 'Class 4 — Heavy Bus (K200)' },
  { value: 'Class5_LightTruck', label: 'Class 5 — Light Truck (K300)' },
  { value: 'Class6_HeavyTruck', label: 'Class 6 — Heavy Truck (K3,000)' },
];

export default function Vehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ licencePlate: '', make: '', model: '', year: '', vehicleClass: 'Class2_LightVehicle' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadVehicles = useCallback(async () => {
    try {
      const res = await api.get('/vehicles');
      setVehicles(res.data.vehicles);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadVehicles(); }, [loadVehicles]);

  const openAdd = () => {
    setEditing(null);
    setForm({ licencePlate: '', make: '', model: '', year: new Date().getFullYear(), vehicleClass: 'Class2_LightVehicle' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (v) => {
    setEditing(v);
    setForm({ licencePlate: v.LicencePlate, make: v.Make, model: v.Model, year: v.Year, vehicleClass: v.VehicleClass });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/vehicles/${editing.VehicleID}`, form);
      } else {
        await api.post('/vehicles', form);
      }
      setShowModal(false);
      loadVehicles();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!confirm('Remove this vehicle?')) return;
    try {
      await api.delete(`/vehicles/${id}`);
      loadVehicles();
    } catch (err) {
      alert(err.message);
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div className="page-toolbar">
        <div>
          <div className="page-title">My Vehicles</div>
          <div className="page-subtitle">{vehicles.length} vehicle{vehicles.length !== 1 ? 's' : ''} registered</div>
        </div>
        <button className="btn btn-primary" onClick={openAdd} id="add-vehicle-btn">Add Vehicle</button>
      </div>

      {vehicles.length > 0 ? (
        <div className="card">
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Licence Plate</th>
                    <th>Make / Model</th>
                    <th>Class</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {vehicles.map((v) => (
                    <tr key={v.VehicleID}>
                      <td>
                        <span className="vehicle-plate" style={{ fontSize: '0.8rem', padding: '4px 10px', marginBottom: 0 }}>{v.LicencePlate}</span>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        {v.Make} {v.Model} <span style={{ color: 'var(--gray-400)', fontWeight: 400 }}>({v.Year})</span>
                      </td>
                      <td>{(CLASSES.find(c => c.value === v.VehicleClass)?.label || v.VehicleClass).split('(')[0].trim()}</td>
                      <td><span className="badge badge-success">Active</span></td>
                      <td>
                        <ActionMenu items={[
                          { label: 'Edit', onClick: () => openEdit(v) },
                          { label: 'Remove', danger: true, onClick: () => handleDelete(v.VehicleID) },
                        ]} />
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="empty-state">
            <h3>No vehicles registered</h3>
            <p>Add your first vehicle to start using AVTPP toll payments.</p>
            <button className="btn btn-primary" onClick={openAdd} style={{ marginTop: '16px' }}>Add Vehicle</button>
          </div>
        </div>
      )}

      {/* Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Vehicle' : 'Register New Vehicle'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}
                <div className="form-group">
                  <label>Licence Plate</label>
                  <input className="form-input" placeholder="e.g. BAA 1234 ZM" value={form.licencePlate} onChange={update('licencePlate')} required disabled={!!editing} />
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Make</label>
                    <input className="form-input" placeholder="e.g. Toyota" value={form.make} onChange={update('make')} required />
                  </div>
                  <div className="form-group">
                    <label>Model</label>
                    <input className="form-input" placeholder="e.g. Corolla" value={form.model} onChange={update('model')} required />
                  </div>
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label>Year</label>
                    <input className="form-input" type="number" min="1990" max="2030" value={form.year} onChange={update('year')} required />
                  </div>
                  <div className="form-group">
                    <label>Vehicle Class</label>
                    <select className="form-select" value={form.vehicleClass} onChange={update('vehicleClass')}>
                      {CLASSES.map((c) => <option key={c.value} value={c.value}>{c.label}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? '⏳ Saving...' : editing ? 'Update Vehicle' : 'Register Vehicle'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
