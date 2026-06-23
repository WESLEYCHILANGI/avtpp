import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import api from '../services/api';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (newPassword !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.post('/auth/forgot-password', { email, phone, newPassword });
      setSuccess(res.data.message || 'Password reset successfully.');
      setTimeout(() => navigate('/login'), 1800);
    } catch (err) {
      setError(err.message || 'Could not reset password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Reset Password</h1>
          <p>Verify your identity to set a new password</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}
        {success && <div className="alert alert-success">{success}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="fp-email">Email Address</label>
            <input
              id="fp-email"
              type="email"
              className="form-input"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fp-phone">Registered Phone Number</label>
            <input
              id="fp-phone"
              type="tel"
              className="form-input"
              placeholder="+260 9XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="fp-password">New Password</label>
            <div className="password-wrapper">
              <input
                id="fp-password"
                type={showPassword ? 'text' : 'password'}
                className="form-input"
                placeholder="At least 8 characters"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                required
              />
              <button
                type="button"
                className="password-toggle"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? 'Hide' : 'Show'}
              </button>
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="fp-confirm">Confirm New Password</label>
            <input
              id="fp-confirm"
              type={showPassword ? 'text' : 'password'}
              className="form-input"
              placeholder="Re-enter new password"
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="fp-submit">
            {loading ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: '20px' }}>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.88rem' }}>
            Remembered it?{' '}
            <Link to="/login" style={{ fontWeight: 600 }}>Back to Login</Link>
          </p>
        </div>
      </div>
    </div>
  );
}
