import { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import { formatDateTime } from '../utils/format';

export default function PaymentHistory() {
  const [transactions, setTransactions] = useState([]);
  const [pagination, setPagination] = useState({});
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', vehicleId: '', gateId: '', status: '' });
  const [vehicles, setVehicles] = useState([]);
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadFilters = useCallback(async () => {
    try {
      const [vRes, gRes] = await Promise.all([
        api.get('/vehicles'),
        api.get('/toll/gates'),
      ]);
      setVehicles(vRes.data.vehicles);
      setGates(gRes.data.gates);
    } catch (err) { console.error(err); }
  }, []);

  const loadTransactions = useCallback(async (page = 1) => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await api.get(`/transactions?${params}`);
      setTransactions(res.data.transactions);
      setPagination(res.data.pagination);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [filters]);

  // Load filter options and the initial (unfiltered) page once on mount.
  // Subsequent loads are triggered explicitly via the Filter button / pagination.
  useEffect(() => {
    loadFilters();
    loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadTransactions(1);
  };

  const handleExport = async () => {
    try {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await api.get(`/transactions/export?${params}`);
      const url = URL.createObjectURL(res.data);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'avtpp_transactions.csv';
      a.click();
      URL.revokeObjectURL(url);
    } catch { alert('Export failed'); }
  };

  const updateFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  return (
    <div>
      <div className="page-toolbar">
        <div className="page-title">Payment History</div>
        <button className="btn btn-outline btn-sm" onClick={handleExport} id="export-csv-btn">Export CSV</button>
      </div>

      {/* Filters */}
      <form onSubmit={handleFilter} className="filters-bar">
        <div className="form-group">
          <label>From Date</label>
          <input type="date" className="form-input" value={filters.dateFrom} onChange={updateFilter('dateFrom')} />
        </div>
        <div className="form-group">
          <label>To Date</label>
          <input type="date" className="form-input" value={filters.dateTo} onChange={updateFilter('dateTo')} />
        </div>
        <div className="form-group">
          <label>Vehicle</label>
          <select className="form-select" value={filters.vehicleId} onChange={updateFilter('vehicleId')}>
            <option value="">All Vehicles</option>
            {vehicles.map(v => <option key={v.VehicleID} value={v.VehicleID}>{v.LicencePlate}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Toll Gate</label>
          <select className="form-select" value={filters.gateId} onChange={updateFilter('gateId')}>
            <option value="">All Gates</option>
            {gates.map(g => <option key={g.GateID} value={g.GateID}>{g.GateName}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Status</label>
          <select className="form-select" value={filters.status} onChange={updateFilter('status')}>
            <option value="">All</option>
            <option value="Completed">Completed</option>
            <option value="Failed">Failed</option>
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }}>Filter</button>
      </form>

      {/* Table */}
      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : transactions.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date & Time</th>
                    <th>Toll Gate</th>
                    <th>Province</th>
                    <th>Vehicle</th>
                    <th>Class</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {transactions.map((tx) => (
                    <tr key={tx.TransactionID}>
                      <td>{formatDateTime(tx.TransactionDateTime)}</td>
                      <td style={{ fontWeight: 600 }}>{tx.GateName}</td>
                      <td>{tx.Province}</td>
                      <td><span className="vehicle-plate" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{tx.LicencePlate}</span></td>
                      <td style={{ fontSize: '0.8rem' }}>{tx.VehicleClass?.replace('Class', 'C').replace('_', ' ')}</td>
                      <td style={{ fontWeight: 700 }}>K{parseFloat(tx.Amount).toFixed(2)}</td>
                      <td><span className={`badge ${tx.Status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>{tx.Status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No transactions found</h3>
              <p>Adjust your filters or make a toll payment to see records here.</p>
            </div>
          )}
        </div>
      </div>

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <div className="pagination">
          <button disabled={pagination.page <= 1} onClick={() => loadTransactions(pagination.page - 1)}>Prev</button>
          {Array.from({ length: Math.min(pagination.totalPages, 7) }, (_, i) => {
            const p = pagination.totalPages <= 7 ? i + 1 : Math.max(1, Math.min(pagination.page - 3, pagination.totalPages - 6)) + i;
            return (
              <button key={p} className={p === pagination.page ? 'active' : ''} onClick={() => loadTransactions(p)}>{p}</button>
            );
          })}
          <button disabled={pagination.page >= pagination.totalPages} onClick={() => loadTransactions(pagination.page + 1)}>Next</button>
        </div>
      )}
    </div>
  );
}
