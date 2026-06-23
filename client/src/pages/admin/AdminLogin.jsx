import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';

export default function AdminLogin() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
            <label>Admin Email</label>
            <input type="email" className="form-input" placeholder="admin@nrfa.gov.zm" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="form-group">
            <label>Password</label>
            <div className="password-wrapper">
              <input type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Enter admin password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>
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
