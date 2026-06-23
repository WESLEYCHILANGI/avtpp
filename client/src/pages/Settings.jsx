import { useState, useEffect, useCallback, useRef } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext';

// Downscale a chosen image to a square data URL so it stays small in the DB.
function fileToDataURL(file, size = 256) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Could not read file.'));
    reader.onload = () => {
      const img = new Image();
      img.onerror = () => reject(new Error('Invalid image file.'));
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext('2d');
        const min = Math.min(img.width, img.height);
        const sx = (img.width - min) / 2;
        const sy = (img.height - min) / 2;
        ctx.drawImage(img, sx, sy, min, min, 0, 0, size, size);
        resolve(canvas.toDataURL('image/jpeg', 0.85));
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  });
}

function Section({ title, description, children }) {
  return (
    <div className="card" style={{ marginBottom: '20px' }}>
      <div className="card-header">
        <div>
          <h3>{title}</h3>
          {description && <p style={{ color: 'var(--gray-500)', fontSize: '0.8rem', marginTop: '2px' }}>{description}</p>}
        </div>
      </div>
      <div className="card-body">{children}</div>
    </div>
  );
}

function Notice({ msg }) {
  if (!msg) return null;
  return <div className={`alert alert-${msg.type}`} style={{ marginBottom: '14px' }}>{msg.text}</div>;
}

export default function Settings() {
  const { user, updateUser, theme, setTheme } = useAuth();
  const fileRef = useRef(null);

  const initials = `${user?.firstName?.[0] || ''}${user?.lastName?.[0] || ''}`.toUpperCase();

  // Profile
  const [profile, setProfile] = useState({ firstName: user?.firstName || '', lastName: user?.lastName || '', phone: user?.phone || '' });
  const [profileMsg, setProfileMsg] = useState(null);
  const [savingProfile, setSavingProfile] = useState(false);

  // Picture
  const [picMsg, setPicMsg] = useState(null);
  const [picBusy, setPicBusy] = useState(false);

  // Password
  const [pw, setPw] = useState({ currentPassword: '', newPassword: '', confirm: '' });
  const [pwMsg, setPwMsg] = useState(null);
  const [savingPw, setSavingPw] = useState(false);

  // Wallet threshold
  const [threshold, setThreshold] = useState('');
  const [thrMsg, setThrMsg] = useState(null);
  const [savingThr, setSavingThr] = useState(false);

  const loadThreshold = useCallback(async () => {
    try {
      const res = await api.get('/wallet/balance');
      setThreshold(String(res.data.lowBalanceThreshold ?? ''));
    } catch (err) { console.error(err); }
  }, []);

  useEffect(() => { loadThreshold(); }, [loadThreshold]);

  const saveProfile = async (e) => {
    e.preventDefault();
    setProfileMsg(null);
    setSavingProfile(true);
    try {
      await api.put('/auth/profile', profile);
      updateUser({ firstName: profile.firstName, lastName: profile.lastName, phone: profile.phone });
      setProfileMsg({ type: 'success', text: 'Profile updated.' });
    } catch (err) {
      setProfileMsg({ type: 'danger', text: err.message || 'Failed to update profile.' });
    } finally {
      setSavingProfile(false);
    }
  };

  const onPickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setPicMsg(null);
    setPicBusy(true);
    try {
      if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.');
      const dataUrl = await fileToDataURL(file);
      const res = await api.put('/auth/profile-picture', { image: dataUrl });
      updateUser({ profilePicture: res.data.profilePicture });
      setPicMsg({ type: 'success', text: 'Profile picture updated.' });
    } catch (err) {
      setPicMsg({ type: 'danger', text: err.message || 'Failed to update picture.' });
    } finally {
      setPicBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const removePicture = async () => {
    setPicMsg(null);
    setPicBusy(true);
    try {
      await api.delete('/auth/profile-picture');
      updateUser({ profilePicture: null });
      setPicMsg({ type: 'success', text: 'Profile picture removed.' });
    } catch (err) {
      setPicMsg({ type: 'danger', text: err.message || 'Failed to remove picture.' });
    } finally {
      setPicBusy(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    setPwMsg(null);
    if (pw.newPassword !== pw.confirm) {
      setPwMsg({ type: 'danger', text: 'New passwords do not match.' });
      return;
    }
    setSavingPw(true);
    try {
      await api.put('/auth/change-password', { currentPassword: pw.currentPassword, newPassword: pw.newPassword });
      setPw({ currentPassword: '', newPassword: '', confirm: '' });
      setPwMsg({ type: 'success', text: 'Password changed successfully.' });
    } catch (err) {
      setPwMsg({ type: 'danger', text: err.message || 'Failed to change password.' });
    } finally {
      setSavingPw(false);
    }
  };

  const saveThreshold = async (e) => {
    e.preventDefault();
    setThrMsg(null);
    setSavingThr(true);
    try {
      await api.put('/wallet/threshold', { threshold: parseFloat(threshold) });
      setThrMsg({ type: 'success', text: 'Low-balance threshold updated.' });
    } catch (err) {
      setThrMsg({ type: 'danger', text: err.message || 'Failed to update threshold.' });
    } finally {
      setSavingThr(false);
    }
  };

  return (
    <div style={{ maxWidth: '720px' }}>
      {/* Profile picture */}
      <Section title="Profile Picture" description="Shown beside your name across the platform.">
        <Notice msg={picMsg} />
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px', flexWrap: 'wrap' }}>
          {user?.profilePicture
            ? <img src={user.profilePicture} alt="Profile" className="avatar-lg" />
            : <div className="avatar-lg avatar-initials">{initials || 'U'}</div>}
          <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
            <input ref={fileRef} type="file" accept="image/*" onChange={onPickFile} style={{ display: 'none' }} id="pic-input" />
            <button className="btn btn-primary btn-sm" disabled={picBusy} onClick={() => fileRef.current?.click()}>
              {picBusy ? 'Working...' : (user?.profilePicture ? 'Change Picture' : 'Upload Picture')}
            </button>
            {user?.profilePicture && (
              <button className="btn btn-danger btn-sm" disabled={picBusy} onClick={removePicture}>Remove</button>
            )}
          </div>
        </div>
      </Section>

      {/* Appearance */}
      <Section title="Appearance" description="Choose how AVTPP looks on this device.">
        <div className="theme-options">
          <button
            className={`theme-option ${theme === 'light' ? 'active' : ''}`}
            onClick={() => setTheme('light')}
            type="button"
          >
            <span className="theme-swatch swatch-light" />
            Light
          </button>
          <button
            className={`theme-option ${theme === 'dark' ? 'active' : ''}`}
            onClick={() => setTheme('dark')}
            type="button"
          >
            <span className="theme-swatch swatch-dark" />
            Dark
          </button>
        </div>
      </Section>

      {/* Profile details */}
      <Section title="Profile Details" description="Update your name and contact number.">
        <Notice msg={profileMsg} />
        <form onSubmit={saveProfile}>
          <div className="form-row">
            <div className="form-group">
              <label>First Name</label>
              <input className="form-input" value={profile.firstName} onChange={(e) => setProfile({ ...profile, firstName: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Last Name</label>
              <input className="form-input" value={profile.lastName} onChange={(e) => setProfile({ ...profile, lastName: e.target.value })} required />
            </div>
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input className="form-input" value={profile.phone} onChange={(e) => setProfile({ ...profile, phone: e.target.value })} required />
          </div>
          <div className="form-group">
            <label>Email (cannot be changed)</label>
            <input className="form-input" value={user?.email || ''} disabled />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingProfile}>
            {savingProfile ? 'Saving...' : 'Save Profile'}
          </button>
        </form>
      </Section>

      {/* Security */}
      <Section title="Security" description="Change your account password.">
        <Notice msg={pwMsg} />
        <form onSubmit={changePassword}>
          <div className="form-group">
            <label>Current Password</label>
            <input type="password" className="form-input" value={pw.currentPassword} onChange={(e) => setPw({ ...pw, currentPassword: e.target.value })} required />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label>New Password</label>
              <input type="password" className="form-input" value={pw.newPassword} onChange={(e) => setPw({ ...pw, newPassword: e.target.value })} required />
            </div>
            <div className="form-group">
              <label>Confirm New Password</label>
              <input type="password" className="form-input" value={pw.confirm} onChange={(e) => setPw({ ...pw, confirm: e.target.value })} required />
            </div>
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingPw}>
            {savingPw ? 'Updating...' : 'Change Password'}
          </button>
        </form>
      </Section>

      {/* Wallet preferences */}
      <Section title="Wallet" description="Get a low-balance alert when your wallet falls below this amount.">
        <Notice msg={thrMsg} />
        <form onSubmit={saveThreshold} style={{ display: 'flex', gap: '12px', alignItems: 'flex-end', flexWrap: 'wrap' }}>
          <div className="form-group" style={{ marginBottom: 0, minWidth: '200px' }}>
            <label>Low-Balance Threshold (ZMW)</label>
            <input type="number" min="0" step="1" className="form-input" value={threshold} onChange={(e) => setThreshold(e.target.value)} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={savingThr}>
            {savingThr ? 'Saving...' : 'Save'}
          </button>
        </form>
      </Section>
    </div>
  );
}
