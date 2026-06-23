import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';

const CLASS_LABELS = {
  Class1_Motorcycle: 'Motorcycle',
  Class2_LightVehicle: 'Light Vehicle',
  Class3_Minibus: 'Minibus',
  Class4_HeavyBus: 'Heavy Bus',
  Class5_LightTruck: 'Light Truck',
  Class6_HeavyTruck: 'Heavy Truck',
};

export default function AdminReports() {
  const [report, setReport] = useState(null);
  const [gates, setGates] = useState([]);
  const [loading, setLoading] = useState(false);
  const [filters, setFilters] = useState({ dateFrom: '', dateTo: '', gateId: '' });

  const loadGates = useCallback(async () => {
    try {
      const res = await api.get('/admin/gates', true);
      setGates(res.data.gates);
    } catch (err) {
      console.error(err);
    }
  }, []);

  const loadReportWithFilters = async (filterOverrides) => {
    setLoading(true);
    try {
      const activeFilters = filterOverrides || filters;
      const params = new URLSearchParams();
      Object.entries(activeFilters).forEach(([k, v]) => { if (v) params.append(k, v); });
      const res = await api.get(`/admin/reports?${params}`, true);
      setReport(res.data);
    } catch (err) {
      console.error('Failed to load report:', err);
    } finally {
      setLoading(false);
    }
  };

  const loadReport = () => loadReportWithFilters(null);

  // Load gate list and the initial (unfiltered) report once on mount.
  // Filtered reports are generated explicitly via the Generate/Clear buttons.
  useEffect(() => {
    loadGates();
    loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleFilter = (e) => {
    e.preventDefault();
    loadReport();
  };

  const updateFilter = (field) => (e) => setFilters({ ...filters, [field]: e.target.value });

  const clearFilters = () => {
    const cleared = { dateFrom: '', dateTo: '', gateId: '' };
    setFilters(cleared);
    // Load report with cleared filters directly to avoid stale closure
    loadReportWithFilters(cleared);
  };

  // Find max revenue for proportional bar widths
  const maxGateRevenue = report?.revenueByGate?.length > 0
    ? Math.max(...report.revenueByGate.map(g => parseFloat(g.revenue) || 0))
    : 1;

  const maxClassRevenue = report?.revenueByClass?.length > 0
    ? Math.max(...report.revenueByClass.map(c => parseFloat(c.revenue) || 0))
    : 1;

  return (
    <div>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>Revenue Reports</h2>
        <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>
          Generate and analyze toll revenue data across gates and vehicle classes
        </p>
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
          <label>Toll Gate</label>
          <select className="form-select" value={filters.gateId} onChange={updateFilter('gateId')}>
            <option value="">All Gates</option>
            {gates.map(g => <option key={g.GateID} value={g.GateID}>{g.GateName}</option>)}
          </select>
        </div>
        <button type="submit" className="btn btn-primary btn-sm" style={{ alignSelf: 'flex-end' }} id="generate-report-btn">
          Generate Report
        </button>
        {(filters.dateFrom || filters.dateTo || filters.gateId) && (
          <button type="button" className="btn btn-outline btn-sm" style={{ alignSelf: 'flex-end' }} onClick={clearFilters}>
            Clear
          </button>
        )}
      </form>

      {loading ? (
        <div className="loading-spinner"><div className="spinner"></div></div>
      ) : report ? (
        <>
          {/* Summary Stats */}
          <div className="stats-grid" style={{ marginBottom: '28px' }}>
            <div className="stat-card primary">
              <div className="stat-value">K{report.summary?.totalRevenue?.toFixed(2) || '0.00'}</div>
              <div className="stat-label">Total Revenue (ZMW)</div>
            </div>
            <div className="stat-card accent">
              <div className="stat-value">{report.summary?.totalTransactions || 0}</div>
              <div className="stat-label">Total Transactions</div>
            </div>
            <div className="stat-card success">
              <div className="stat-value">
                K{report.summary?.totalTransactions > 0
                  ? (report.summary.totalRevenue / report.summary.totalTransactions).toFixed(2)
                  : '0.00'}
              </div>
              <div className="stat-label">Avg. per Transaction</div>
            </div>
          </div>

          {/* Revenue by Gate */}
          <div className="card" style={{ marginBottom: '24px' }}>
            <div className="card-header">
              <h3>Revenue by Toll Gate</h3>
            </div>
            <div className="card-body" style={{ padding: 0 }}>
              {report.revenueByGate?.length > 0 ? (
                <div className="table-container">
                  <table className="data-table">
                    <thead>
                      <tr>
                        <th>Toll Gate</th>
                        <th>Province</th>
                        <th>Transactions</th>
                        <th>Completed</th>
                        <th>Failed</th>
                        <th>Revenue (ZMW)</th>
                        <th style={{ width: '20%' }}>Share</th>
                      </tr>
                    </thead>
                    <tbody>
                      {report.revenueByGate.map((g, i) => {
                        const rev = parseFloat(g.revenue) || 0;
                        const pct = maxGateRevenue > 0 ? (rev / maxGateRevenue) * 100 : 0;
                        return (
                          <tr key={i}>
                            <td style={{ fontWeight: 600 }}>{g.GateName}</td>
                            <td><span className="badge badge-primary" style={{ fontSize: '0.68rem' }}>{g.Province}</span></td>
                            <td>{g.transactionCount}</td>
                            <td style={{ color: 'var(--success-600)' }}>{g.successCount}</td>
                            <td style={{ color: g.failedCount > 0 ? 'var(--danger-600)' : 'var(--gray-400)' }}>{g.failedCount}</td>
                            <td style={{ fontWeight: 700 }}>K{rev.toFixed(2)}</td>
                            <td>
                              <div style={{
                                background: 'var(--gray-100)',
                                borderRadius: 'var(--radius-sm)',
                                overflow: 'hidden',
                                height: '8px',
                              }}>
                                <div style={{
                                  width: `${pct}%`,
                                  height: '100%',
                                  background: 'linear-gradient(90deg, var(--primary-400), var(--accent-500))',
                                  borderRadius: 'var(--radius-sm)',
                                  transition: 'width 0.5s ease',
                                }} />
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="empty-state">
                  <h3>No gate revenue data</h3>
                  <p>No transactions match the selected filters.</p>
                </div>
              )}
            </div>
          </div>

          {/* Revenue by Vehicle Class */}
          <div className="card">
            <div className="card-header">
              <h3>Revenue by Vehicle Class</h3>
            </div>
            <div className="card-body">
              {report.revenueByClass?.length > 0 ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                  {report.revenueByClass.map((c, i) => {
                    const rev = parseFloat(c.revenue) || 0;
                    const pct = maxClassRevenue > 0 ? (rev / maxClassRevenue) * 100 : 0;
                    const label = CLASS_LABELS[c.VehicleClass] || c.VehicleClass;
                    return (
                      <div key={i}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', alignItems: 'center' }}>
                          <span style={{ fontWeight: 600, fontSize: '0.88rem' }}>{label}</span>
                          <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                            <span style={{ fontSize: '0.8rem', color: 'var(--gray-500)' }}>{c.count} txn{c.count !== 1 ? 's' : ''}</span>
                            <span style={{ fontWeight: 700 }}>K{rev.toFixed(2)}</span>
                          </div>
                        </div>
                        <div style={{
                          background: 'var(--gray-100)',
                          borderRadius: 'var(--radius-sm)',
                          overflow: 'hidden',
                          height: '12px',
                        }}>
                          <div style={{
                            width: `${pct}%`,
                            height: '100%',
                            background: `linear-gradient(90deg, var(--primary-500), var(--primary-300))`,
                            borderRadius: 'var(--radius-sm)',
                            transition: 'width 0.6s ease',
                            minWidth: pct > 0 ? '4px' : '0',
                          }} />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="empty-state" style={{ padding: '24px' }}>
                  <h3>No class data</h3>
                  <p>No transactions match the selected filters.</p>
                </div>
              )}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
