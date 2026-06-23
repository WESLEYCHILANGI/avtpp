import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const PROVINCES = [
  'Lusaka', 'Copperbelt', 'Central', 'Southern', 'Northern',
  'Muchinga', 'Eastern', 'Western', 'Northwestern', 'Luapula'
];

export default function AdminGates() {
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({ gateName: '', location: '', route: '', province: 'Lusaka' });
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [filterProvince, setFilterProvince] = useState('');

  const loadGates = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/admin/gates', true);
      setGates(res.data.gates);
    } catch (err) {
      console.error('Failed to load gates:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadGates(); }, [loadGates]);

  const openAdd = () => {
    setEditing(null);
    setForm({ gateName: '', location: '', route: '', province: 'Lusaka' });
    setError('');
    setShowModal(true);
  };

  const openEdit = (g) => {
    setEditing(g);
    setForm({ gateName: g.GateName, location: g.Location, route: g.Route, province: g.Province });
    setError('');
    setShowModal(true);
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      if (editing) {
        await api.put(`/admin/gates/${editing.GateID}`, form, true);
      } else {
        await api.post('/admin/gates', form, true);
      }
      setShowModal(false);
      loadGates();
    } catch (err) {
      setError(err.message || 'Failed to save gate.');
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (gate) => {
    if (!confirm(`${gate.IsActive ? 'Deactivate' : 'Activate'} ${gate.GateName}?`)) return;
    try {
      await api.put(`/admin/gates/${gate.GateID}`, { isActive: !gate.IsActive }, true);
      loadGates();
    } catch {
      alert('Failed to update gate status.');
    }
  };

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const filteredGates = filterProvince
    ? gates.filter(g => g.Province === filterProvince)
    : gates;

  const activeCount = gates.filter(g => g.IsActive).length;

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Toll Gate Management</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
            {gates.length} gate{gates.length !== 1 ? 's' : ''} · {activeCount} active
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select className="form-select" value={filterProvince} onChange={(e) => setFilterProvince(e.target.value)}
            style={{ minWidth: '160px', padding: '8px 12px', fontSize: '0.85rem' }}>
            <option value="">All Provinces</option>
            {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
          <button className="btn btn-primary" onClick={openAdd} id="add-gate-btn">Add Gate</button>
        </div>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {filteredGates.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Gate Name</th>
                    <th>Location</th>
                    <th>Route</th>
                    <th>Province</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredGates.map(g => (
                    <tr key={g.GateID}>
                      <td style={{ fontWeight: 600 }}>{g.GateName}</td>
                      <td>{g.Location}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{g.Route}</td>
                      <td>
                        <span className="badge badge-primary" style={{ fontSize: '0.7rem' }}>{g.Province}</span>
                      </td>
                      <td>
                        <span className={`badge ${g.IsActive ? 'badge-success' : 'badge-danger'}`}>
                          {g.IsActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px' }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(g)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}>Edit</button>
                          <button
                            className={`btn btn-sm ${g.IsActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleActive(g)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            {g.IsActive ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No toll gates found</h3>
              <p>{filterProvince ? `No gates in ${filterProvince}.` : 'Add your first toll gate.'}</p>
            </div>
          )}
        </div>
      </div>

      {/* Add/Edit Modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{editing ? 'Edit Toll Gate' : 'Add New Toll Gate'}</h3>
              <button className="modal-close" onClick={() => setShowModal(false)}>×</button>
            </div>
            <form onSubmit={handleSave}>
              <div className="modal-body">
                {error && <div className="alert alert-danger">{error}</div>}

                <div className="form-group">
                  <label>Gate Name</label>
                  <input className="form-input" placeholder="e.g. Shimabala Toll Plaza" value={form.gateName} onChange={update('gateName')} required />
                </div>

                <div className="form-group">
                  <label>Location</label>
                  <input className="form-input" placeholder="e.g. Shimabala, Kafue Road" value={form.location} onChange={update('location')} required />
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>Route</label>
                    <input className="form-input" placeholder="e.g. T3 - Kafue Road" value={form.route} onChange={update('route')} required />
                  </div>
                  <div className="form-group">
                    <label>Province</label>
                    <select className="form-select" value={form.province} onChange={update('province')}>
                      {PROVINCES.map(p => <option key={p} value={p}>{p}</option>)}
                    </select>
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={saving}>
                  {saving ? 'Saving...' : editing ? 'Update Gate' : 'Add Gate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
