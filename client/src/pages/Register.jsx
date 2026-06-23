import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Register() {
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', phone: '', password: '', confirmPassword: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
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
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo">
          <h1>Create Account</h1>
          <p>Join AVTPP — Zambia's toll payment platform</p>
        </div>

        {error && <div className="alert alert-danger">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-first">First Name</label>
              <input id="reg-first" type="text" className="form-input" placeholder="Chanda" value={form.firstName} onChange={update('firstName')} required />
            </div>
            <div className="form-group">
              <label htmlFor="reg-last">Last Name</label>
              <input id="reg-last" type="text" className="form-input" placeholder="Mwamba" value={form.lastName} onChange={update('lastName')} required />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="reg-email">Email Address</label>
            <input id="reg-email" type="email" className="form-input" placeholder="you@example.com" value={form.email} onChange={update('email')} required />
          </div>

          <div className="form-group">
            <label htmlFor="reg-phone">Phone Number</label>
            <input id="reg-phone" type="tel" className="form-input" placeholder="+260 97X XXX XXX" value={form.phone} onChange={update('phone')} required />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="reg-pass">Password</label>
              <div className="password-wrapper">
                <input id="reg-pass" type={showPassword ? 'text' : 'password'} className="form-input" placeholder="Min 8 characters" value={form.password} onChange={update('password')} required />
                <button type="button" className="password-toggle" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
                  {showPassword ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
            <div className="form-group">
              <label htmlFor="reg-confirm">Confirm Password</label>
              <div className="password-wrapper">
                <input id="reg-confirm" type={showConfirm ? 'text' : 'password'} className="form-input" placeholder="Repeat password" value={form.confirmPassword} onChange={update('confirmPassword')} required />
                <button type="button" className="password-toggle" onClick={() => setShowConfirm(!showConfirm)} aria-label={showConfirm ? 'Hide password' : 'Show password'}>
                  {showConfirm ? 'Hide' : 'Show'}
                </button>
              </div>
            </div>
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
  );
}
