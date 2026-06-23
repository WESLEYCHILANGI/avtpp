import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';

const PROVIDERS = [
  { value: 'MTN_Money', label: 'MTN Mobile Money', color: '#ffcc00' },
  { value: 'Airtel_Money', label: 'Airtel Money', color: '#e40000' },
  { value: 'Zamtel_Kwacha', label: 'Zamtel Kwacha', color: '#00a651' },
];

export default function TopUp() {
  const [amount, setAmount] = useState('');
  const [provider, setProvider] = useState('MTN_Money');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  const quickAmounts = [50, 100, 200, 500, 1000, 2000];

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setResult(null);
    setLoading(true);

    try {
      const res = await api.post('/wallet/topup', {
        amount: parseFloat(amount),
        provider,
        phoneNumber,
      });
      setResult(res.data);
    } catch (err) {
      setError(err.message || 'Top-up failed.');
    } finally {
      setLoading(false);
    }
  };

  if (result) {
    return (
      <div style={{ maxWidth: '500px', margin: '0 auto' }}>
        <div className="card">
          <div className="card-body" style={{ textAlign: 'center', padding: '40px' }}>
            <h2 style={{ color: 'var(--success-600)', marginBottom: '8px' }}>Top-Up Successful!</h2>
            <p style={{ color: 'var(--gray-500)', marginBottom: '24px' }}>
              K{parseFloat(result.amount).toFixed(2)} has been added to your wallet
            </p>
            <div style={{ background: 'var(--gray-50)', borderRadius: 'var(--radius-md)', padding: '20px', marginBottom: '24px', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Amount</span>
                <span style={{ fontWeight: 700 }}>K{parseFloat(result.amount).toFixed(2)} ZMW</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Provider</span>
                <span style={{ fontWeight: 600 }}>{result.provider?.replace('_', ' ')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '10px' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>Reference</span>
                <span style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{result.transactionRef}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>New Balance</span>
                <span style={{ fontWeight: 800, color: 'var(--success-600)' }}>K{parseFloat(result.newBalance).toFixed(2)}</span>
              </div>
            </div>
            {result.mode === 'simulation' && (
              <div className="alert alert-info" style={{ marginBottom: '20px' }}>
                This is a simulated transaction (demo mode)
              </div>
            )}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
              <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>Dashboard</button>
              <button className="btn btn-outline" onClick={() => { setResult(null); setAmount(''); }}>Top Up Again</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: '500px', margin: '0 auto' }}>
      <div className="card">
        <div className="card-header">
          <h3>Top Up Wallet</h3>
        </div>
        <div className="card-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div className="alert alert-info" style={{ marginBottom: '20px' }}>
            Simulation mode — no real charges will be made
          </div>

          <form onSubmit={handleSubmit}>
            {/* Quick Amount Selection */}
            <div className="form-group">
              <label>Select Amount (ZMW)</label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', marginBottom: '10px' }}>
                {quickAmounts.map((qa) => (
                  <button key={qa} type="button" className={`btn ${amount === String(qa) ? 'btn-primary' : 'btn-outline'} btn-sm`}
                    onClick={() => setAmount(String(qa))}>
                    K{qa}
                  </button>
                ))}
              </div>
              <input type="number" className="form-input" placeholder="Or enter custom amount" value={amount}
                onChange={(e) => setAmount(e.target.value)} min="10" max="50000" required />
            </div>

            {/* Provider Selection */}
            <div className="form-group">
              <label>Mobile Money Provider</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {PROVIDERS.map((p) => (
                  <label key={p.value} style={{
                    display: 'flex', alignItems: 'center', gap: '12px', padding: '14px 16px',
                    border: `2px solid ${provider === p.value ? 'var(--primary-400)' : 'var(--gray-200)'}`,
                    borderRadius: 'var(--radius-md)', cursor: 'pointer',
                    background: provider === p.value ? 'var(--primary-50)' : 'var(--white)',
                    transition: 'all 0.15s ease',
                  }}>
                    <input type="radio" name="provider" value={p.value} checked={provider === p.value}
                      onChange={(e) => setProvider(e.target.value)} style={{ accentColor: 'var(--primary-500)' }} />
                    <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: p.color, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: '0.7rem', fontWeight: 800 }}>
                      {p.label.charAt(0)}
                    </div>
                    <span style={{ fontWeight: 600, fontSize: '0.9rem' }}>{p.label}</span>
                  </label>
                ))}
              </div>
            </div>

            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" className="form-input" placeholder="+260 97X XXX XXX" value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)} required />
            </div>

            <button type="submit" className="btn btn-accent btn-full btn-lg" disabled={loading || !amount} id="topup-submit">
              {loading ? 'Processing Payment...' : `Top Up K${amount || '0'}.00`}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
