import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatDateTime } from '../../utils/format';

export default function AdminDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadDashboard = useCallback(async () => {
    try {
      const res = await api.get('/admin/dashboard', true);
      setData(res.data);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, []);

  useEffect(() => {
    loadDashboard();
  }, [loadDashboard]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;
  if (!data) return <div className="alert alert-danger">Failed to load dashboard data.</div>;

  return (
    <div>
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-value">K{data.revenue?.today?.toFixed(2)}</div>
          <div className="stat-label">Today's Revenue</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value">K{data.revenue?.monthly?.toFixed(2)}</div>
          <div className="stat-label">Monthly Revenue</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">K{data.revenue?.total?.toFixed(2)}</div>
          <div className="stat-label">Total Revenue</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-value">{data.transactions?.total || 0}</div>
          <div className="stat-label">Total Transactions</div>
        </div>
      </div>

      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="stat-card primary">
          <div className="stat-value">{data.users?.total || 0}</div>
          <div className="stat-label">Registered Users</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">{data.users?.active || 0}</div>
          <div className="stat-label">Active Users</div>
        </div>
        <div className="stat-card accent">
          <div className="stat-value">{data.vehicles?.total || 0}</div>
          <div className="stat-label">Registered Vehicles</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">{data.gates?.active || 0}</div>
          <div className="stat-label">Active Toll Gates</div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3>Recent System Transactions</h3>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {data.recentTransactions?.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>User</th>
                    <th>Vehicle</th>
                    <th>Gate</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {data.recentTransactions.map(tx => (
                    <tr key={tx.TransactionID}>
                      <td>{formatDateTime(tx.TransactionDateTime)}</td>
                      <td>{tx.FirstName} {tx.LastName}</td>
                      <td><span className="vehicle-plate" style={{ fontSize: '0.72rem', padding: '2px 6px' }}>{tx.LicencePlate}</span></td>
                      <td>{tx.GateName}</td>
                      <td style={{ fontWeight: 700 }}>K{parseFloat(tx.Amount).toFixed(2)}</td>
                      <td><span className={`badge ${tx.Status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>{tx.Status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No transactions yet</h3>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
