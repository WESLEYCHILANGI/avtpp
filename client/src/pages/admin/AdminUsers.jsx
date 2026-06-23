import { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { formatDate } from '../../utils/format';

export default function AdminUsers() {
  const [users, setUsers] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [toggling, setToggling] = useState(null);

  // Password reset modal state
  const [resetUser, setResetUser] = useState(null);
  const [newPassword, setNewPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetSuccess, setResetSuccess] = useState('');

  const loadUsers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: 15 });
      if (search) params.append('search', search);
      const res = await api.get(`/admin/users?${params}`, true);
      setUsers(res.data.users);
      setTotal(res.data.total);
    } catch (err) {
      console.error('Failed to load users:', err);
    } finally {
      setLoading(false);
    }
  }, [page, search]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  const handleSearch = (e) => {
    e.preventDefault();
    setPage(1);
    setSearch(searchInput);
  };

  const toggleStatus = async (userId, currentStatus) => {
    if (!confirm(`${currentStatus ? 'Suspend' : 'Activate'} this user account?`)) return;
    setToggling(userId);
    try {
      await api.put(`/admin/users/${userId}`, { isActive: !currentStatus }, true);
      loadUsers();
    } catch {
      alert('Failed to update user status.');
    } finally {
      setToggling(null);
    }
  };

  const openResetModal = (user) => {
    setResetUser(user);
    setNewPassword('');
    setShowPassword(false);
    setResetError('');
    setResetSuccess('');
  };

  const closeResetModal = () => {
    setResetUser(null);
    setNewPassword('');
    setResetError('');
    setResetSuccess('');
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setResetError('');
    setResetSuccess('');

    if (newPassword.length < 8) {
      setResetError('Password must be at least 8 characters.');
      return;
    }

    setResetLoading(true);
    try {
      const res = await api.put(`/admin/users/${resetUser.UserID}/reset-password`, { newPassword }, true);
      setResetSuccess(res.data.message || 'Password reset successfully.');
      setNewPassword('');
    } catch (err) {
      setResetError(err.message || 'Failed to reset password.');
    } finally {
      setResetLoading(false);
    }
  };

  const totalPages = Math.ceil(total / 15);

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ fontSize: '1.1rem', fontWeight: 700, color: 'var(--gray-900)' }}>User Management</h2>
          <p style={{ color: 'var(--gray-500)', fontSize: '0.85rem' }}>{total} registered user{total !== 1 ? 's' : ''}</p>
        </div>
        <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
          <input
            type="text"
            className="form-input"
            placeholder="Search by name or email..."
            value={searchInput}
            onChange={(e) => setSearchInput(e.target.value)}
            style={{ minWidth: '240px' }}
            id="user-search-input"
          />
          <button type="submit" className="btn btn-primary btn-sm" id="user-search-btn">Search</button>
          {search && (
            <button type="button" className="btn btn-outline btn-sm" onClick={() => { setSearch(''); setSearchInput(''); setPage(1); }}>Clear</button>
          )}
        </form>
      </div>

      <div className="card">
        <div className="card-body" style={{ padding: 0 }}>
          {loading ? (
            <div className="loading-spinner"><div className="spinner"></div></div>
          ) : users.length > 0 ? (
            <div className="table-container">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Registered</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, idx) => (
                    <tr key={u.UserID}>
                      <td style={{ fontSize: '0.85rem', color: 'var(--gray-500)' }}>{(page - 1) * 15 + idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{u.FirstName} {u.LastName}</td>
                      <td>{u.Email}</td>
                      <td style={{ fontSize: '0.85rem' }}>{u.PhoneNumber}</td>
                      <td style={{ fontSize: '0.82rem', color: 'var(--gray-500)' }}>
                        {formatDate(u.DateRegistered)}
                      </td>
                      <td>
                        <span className={`badge ${u.IsActive ? 'badge-success' : 'badge-danger'}`}>
                          {u.IsActive ? 'Active' : 'Suspended'}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                          <button
                            className={`btn btn-sm ${u.IsActive ? 'btn-danger' : 'btn-success'}`}
                            onClick={() => toggleStatus(u.UserID, u.IsActive)}
                            disabled={toggling === u.UserID}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            {toggling === u.UserID ? '...' : u.IsActive ? 'Suspend' : 'Activate'}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openResetModal(u)}
                            style={{ fontSize: '0.72rem', padding: '4px 10px' }}
                          >
                            Reset Password
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="empty-state">
              <h3>No users found</h3>
              <p>{search ? 'Try a different search term.' : 'No users have registered yet.'}</p>
            </div>
          )}
        </div>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button disabled={page <= 1} onClick={() => setPage(page - 1)}>Prev</button>
          {Array.from({ length: Math.min(totalPages, 7) }, (_, i) => {
            const p = totalPages <= 7 ? i + 1 : Math.max(1, Math.min(page - 3, totalPages - 6)) + i;
            return (
              <button key={p} className={p === page ? 'active' : ''} onClick={() => setPage(p)}>{p}</button>
            );
          })}
          <button disabled={page >= totalPages} onClick={() => setPage(page + 1)}>Next</button>
        </div>
      )}

      {/* Password Reset Modal */}
      {resetUser && (
        <div className="modal-overlay" onClick={closeResetModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Reset User Password</h3>
              <button className="modal-close" onClick={closeResetModal}>×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <div className="alert alert-info" style={{ marginBottom: '16px' }}>
                  Resetting password for <strong>{resetUser.FirstName} {resetUser.LastName}</strong> ({resetUser.Email}).
                  This will also unlock their account if locked.
                </div>

                {resetError && <div className="alert alert-danger" style={{ marginBottom: '12px' }}>{resetError}</div>}
                {resetSuccess && <div className="alert alert-success" style={{ marginBottom: '12px' }}>{resetSuccess}</div>}

                <div className="form-group">
                  <label>New Password</label>
                  <div className="password-wrapper">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      className="form-input"
                      placeholder="Minimum 8 characters"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                      minLength={8}
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
                  <p style={{ fontSize: '0.78rem', color: 'var(--gray-400)', marginTop: '6px' }}>
                    Please share the new password with the user securely.
                  </p>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeResetModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={resetLoading || !newPassword}>
                  {resetLoading ? 'Resetting...' : 'Reset Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
