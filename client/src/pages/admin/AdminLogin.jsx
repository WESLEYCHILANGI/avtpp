import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import PasswordField from '../../components/PasswordField';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { adminLogin } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await adminLogin(email, password);
      navigate('/admin');
    } catch (err) {
      setError(err.message || 'Invalid admin credentials.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>NRFA Admin</h1>
          <p>Administrative Dashboard Access</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="admin-email">Admin Email</label>
            <p className="field-hint">Your NRFA administrator email.</p>
            <input id="admin-email" type="email" className="form-input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" required />
          </div>
          <PasswordField
            id="admin-password"
            label="Password"
            hint="Your admin account password."
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="admin-login-submit">
            {loading ? 'Authenticating...' : 'Admin Sign In'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <Link to="/login" style={{ color: 'var(--gray-400)', fontSize: '0.85rem' }}>Back to User Login</Link>
        </div>
      </div>
    </div>
  );
}
