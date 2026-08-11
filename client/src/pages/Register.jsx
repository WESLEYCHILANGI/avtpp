import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import PasswordField from '../components/PasswordField';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const update = (field) => (e) => setForm({ ...form, [field]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (form.password !== form.confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    if (form.password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    try {
      await register({
        firstName: form.firstName,
        lastName: form.lastName,
        email: form.email,
        phone: form.phone,
        password: form.password,
      });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Registration failed.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-split">
      {/* Left: brand / welcome panel */}
      <div className="auth-brand-panel">
        <div className="auth-brand-content">
          <div className="brand-name">AVTPP</div>
          <div className="brand-tag">Automated Vehicle Toll Payment Platform</div>
          <p className="brand-lead">
            Skip the queue at Zambia&#39;s toll gates. Load a wallet, link your vehicle, and let tolls pay themselves — no stopping, no cash.
          </p>
          <ul className="auth-benefits">
            <li><span className="tick">✓</span> Automatic, cashless toll payments</li>
            <li><span className="tick">✓</span> Top up instantly with mobile money</li>
            <li><span className="tick">✓</span> Track every payment in real time</li>
          </ul>
        </div>
      </div>

      {/* Right: form */}
      <div className="auth-form-panel">
        <div className="auth-form-inner">
          <div className="auth-form-head">
            <h2>Create your account</h2>
            <p>It takes less than a minute to get started.</p>
          </div>

          {error && <div className="alert alert-danger">{error}</div>}

          <form onSubmit={handleSubmit}>
            <div className="form-row">
              <div className="form-group">
                <label htmlFor="reg-first">First Name</label>
                <p className="field-hint">Your first name, as on your ID.</p>
                <input id="reg-first" type="text" className="form-input" value={form.firstName} onChange={update('firstName')} autoComplete="given-name" required />
              </div>
              <div className="form-group">
                <label htmlFor="reg-last">Last Name</label>
                <p className="field-hint">Your surname / family name.</p>
                <input id="reg-last" type="text" className="form-input" value={form.lastName} onChange={update('lastName')} autoComplete="family-name" required />
              </div>
            </div>

            <div className="form-group">
              <label htmlFor="reg-email">Email Address</label>
              <p className="field-hint">You&#39;ll use this to sign in and receive receipts.</p>
              <input id="reg-email" type="email" className="form-input" value={form.email} onChange={update('email')} autoComplete="email" required />
            </div>

            <div className="form-group">
              <label htmlFor="reg-phone">Phone Number</label>
              <p className="field-hint">A Zambian mobile number for alerts and mobile-money top-ups (e.g. +260 97X XXX XXX).</p>
              <input id="reg-phone" type="tel" className="form-input" value={form.phone} onChange={update('phone')} autoComplete="tel" required />
            </div>

            <div className="form-row">
              <PasswordField
                id="reg-pass"
                label="Password"
                hint="At least 8 characters."
                value={form.password}
                onChange={update('password')}
                autoComplete="new-password"
              />
              <PasswordField
                id="reg-confirm"
                label="Confirm Password"
                hint="Re-enter the same password."
                value={form.confirmPassword}
                onChange={update('confirmPassword')}
                autoComplete="new-password"
              />
            </div>

            <button type="submit" className="btn btn-primary btn-full btn-lg" disabled={loading} id="register-submit">
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: '20px' }}>
            <p style={{ color: 'var(--gray-500)', fontSize: '0.88rem' }}>
              Already have an account?{' '}
              <Link to="/login" style={{ fontWeight: 600 }}>Sign In</Link>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
