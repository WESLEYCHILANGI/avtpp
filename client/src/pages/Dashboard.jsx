import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { formatDateTime } from '../utils/format';

export default function Dashboard() {
  const [wallet, setWallet] = useState(null);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async () => {
    try {
      const [walletRes, summaryRes] = await Promise.all([
        api.get('/wallet/balance'),
        api.get('/transactions/summary'),
      ]);
      setWallet(walletRes.data);
      setSummary(summaryRes.data);
    } catch (err) {
      console.error('Dashboard load error:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  if (loading) return <div className="loading-spinner"><div className="spinner"></div></div>;

  return (
    <div>
      {/* Low Balance Alert */}
      {wallet?.isLowBalance && (
        <div className="alert alert-warning" style={{ justifyContent: 'space-between' }}>
          <span>Low balance alert: your wallet balance is below the ZMW {wallet.lowBalanceThreshold?.toFixed(2)} threshold</span>
          <Link to="/topup" className="btn btn-outline btn-sm">Top Up Now</Link>
        </div>
      )}

      {/* Hero: Wallet balance + quick actions */}
      <div className="dashboard-hero">
        <div className="balance-card">
          <div className="balance-label">Wallet Balance</div>
          <div className="balance-amount">
            <span className="currency">ZMW</span>
            K{wallet?.balance?.toFixed(2) || '0.00'}
          </div>
          <div style={{ fontSize: '0.8rem', opacity: 0.75, marginTop: '10px', position: 'relative', zIndex: 1 }}>
            {summary?.totalTransactions || 0} toll payments · K{summary?.totalSpent?.toFixed(2) || '0.00'} spent to date
          </div>
        </div>

        <div className="hero-actions">
          <Link to="/topup" className="quick-action-btn" id="qa-topup">Top Up Wallet</Link>
          <Link to="/history" className="quick-action-btn" id="qa-history">View History</Link>
          <Link to="/vehicles" className="quick-action-btn" id="qa-vehicles">Manage Vehicles</Link>
          <Link to="/simulate" className="quick-action-btn" id="qa-simulate">Simulate Toll</Link>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="card">
        <div className="card-header">
          <h3>Recent Transactions</h3>
          <Link to="/history" className="btn btn-ghost btn-sm">View All</Link>
        </div>
        <div className="card-body" style={{ padding: 0 }}>
          {summary?.recentTransactions?.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Toll Gate</th>
                    <th>Vehicle</th>
                    <th>Amount</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {summary.recentTransactions.map((tx) => (
                    <tr key={tx.TransactionID}>
                      <td>{formatDateTime(tx.TransactionDateTime)}</td>
                      <td>{tx.GateName}</td>
                      <td><span className="vehicle-plate" style={{ fontSize: '0.75rem', padding: '2px 8px' }}>{tx.LicencePlate}</span></td>
                      <td style={{ fontWeight: 600 }}>K{parseFloat(tx.Amount).toFixed(2)}</td>
                      <td><span className={`badge ${tx.Status === 'Completed' ? 'badge-success' : 'badge-danger'}`}>{tx.Status}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No transactions yet</h3>
              <p>Your toll payment history will appear here.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
