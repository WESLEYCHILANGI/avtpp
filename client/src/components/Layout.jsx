import { useState, useEffect, useCallback, useRef } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api from '../services/api';
import { formatDateTime } from '../utils/format';
import OnboardingTour from './OnboardingTour';

const USER_NAV = [
  { to: '/dashboard', label: 'Dashboard', end: true, section: 'Overview' },
  { to: '/topup', label: 'Top Up Wallet', section: 'Payments' },
  { to: '/history', label: 'Payment History', section: 'Payments' },
  { to: '/vehicles', label: 'My Vehicles', section: 'Vehicles' },
  { to: '/simulate', label: 'Simulate Toll', section: 'Tools' },
  { to: '/settings', label: 'Settings', section: 'Account' },
];
const USER_SECTIONS = ['Overview', 'Payments', 'Vehicles', 'Tools', 'Account'];

const ADMIN_NAV = [
  { to: '/admin', label: 'Dashboard', end: true, section: 'Overview' },
  { to: '/admin/users', label: 'Users', section: 'Management' },
  { to: '/admin/gates', label: 'Toll Gates', section: 'Management' },
  { to: '/admin/tariffs', label: 'Tariff Rates', section: 'Management' },
  { to: '/admin/reports', label: 'Revenue Reports', section: 'Analytics' },
];
const ADMIN_SECTIONS = ['Overview', 'Management', 'Analytics'];

const PAGE_TITLES = {
  '/dashboard': 'Dashboard',
  '/topup': 'Top Up Wallet',
  '/history': 'Payment History',
  '/vehicles': 'My Vehicles',
  '/simulate': 'Simulate Toll',
  '/settings': 'Settings',
  '/admin': 'Admin Dashboard',
  '/admin/users': 'User Management',
  '/admin/gates': 'Toll Gate Management',
  '/admin/tariffs': 'Tariff Rates',
  '/admin/reports': 'Revenue Reports',
};

const IconBell = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
    <path d="M13.73 21a2 2 0 0 1-3.46 0" />
  </svg>
);

const IconMenu = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
    <line x1="3" y1="6" x2="21" y2="6" /><line x1="3" y1="12" x2="21" y2="12" /><line x1="3" y1="18" x2="21" y2="18" />
  </svg>
);

export default function Layout({ children, isAdmin = false }) {
  const { user, admin, logout, adminLogout } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [showNotifs, setShowNotifs] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const location = useLocation();
  const navigate = useNavigate();
  const notifRef = useRef(null);
  const [showTour, setShowTour] = useState(false);

  // Auto-show the welcome tour for newly registered users; allow manual replay.
  useEffect(() => {
    if (isAdmin) return;
    if (localStorage.getItem('avtpp_tour_pending') === '1') {
      localStorage.removeItem('avtpp_tour_pending');
      setShowTour(true);
    }
    const onStart = () => setShowTour(true);
    window.addEventListener('avtpp:start-tour', onStart);
    return () => window.removeEventListener('avtpp:start-tour', onStart);
  }, [isAdmin]);

  const closeTour = () => {
    setShowTour(false);
    localStorage.setItem('avtpp_tour_seen', '1');
  };

  const loadNotifications = useCallback(async () => {
    try {
      const res = await api.get('/notifications');
      setNotifications(res.data.notifications || []);
      setUnreadCount(res.data.unreadCount || 0);
    } catch (err) {
      console.error('Failed to load notifications:', err);
    }
  }, []);

  // Close sidebar / notifications on route change
  useEffect(() => {
    setSidebarOpen(false);
    setShowNotifs(false);
  }, [location.pathname]);

  // Close the notifications panel when clicking/tapping outside it or pressing Escape
  useEffect(() => {
    if (!showNotifs) return;
    const onPointerDown = (e) => {
      if (notifRef.current && !notifRef.current.contains(e.target)) setShowNotifs(false);
    };
    const onKey = (e) => { if (e.key === 'Escape') setShowNotifs(false); };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('touchstart', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('touchstart', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [showNotifs]);

  // Load notifications for road users (not admin), then poll every 30s
  useEffect(() => {
    if (!isAdmin && user) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 30000);
      return () => clearInterval(interval);
    }
  }, [isAdmin, user, loadNotifications]);

  const markAsRead = async (id) => {
    try {
      await api.put(`/notifications/${id}/read`);
      loadNotifications();
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogout = () => {
    if (isAdmin) {
      adminLogout();
      navigate('/admin/login');
    } else {
      logout();
      navigate('/login');
    }
  };

  const displayName = isAdmin
    ? (admin?.name || 'Admin')
    : `${user?.firstName || ''} ${user?.lastName || ''}`.trim() || 'User';
  const displayEmail = (isAdmin ? admin?.email : user?.email) || '';
  const initials = displayName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  const avatarPic = !isAdmin ? (user?.profilePicture || null) : null;

  const nav = isAdmin ? ADMIN_NAV : USER_NAV;
  const sections = isAdmin ? ADMIN_SECTIONS : USER_SECTIONS;
  const pageTitle = PAGE_TITLES[location.pathname] || (isAdmin ? 'Admin Panel' : 'AVTPP');

  return (
    <div className="app-layout">
      {sidebarOpen && (
        <div
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', zIndex: 99 }}
        />
      )}

      <aside className={`sidebar ${sidebarOpen ? 'open' : ''}`}>
        <div className="sidebar-brand">
          <h2>{isAdmin ? 'NRFA Admin' : 'AVTPP'}</h2>
          <p>{isAdmin ? 'Administrative Panel' : 'Toll Payment Platform'}</p>
        </div>

        <nav className="sidebar-nav">
          {sections.map(section => (
            <div className="sidebar-section" key={section}>
              <div className="sidebar-section-title">{section}</div>
              {nav.filter(n => n.section === section).map(n => (
                <NavLink
                  key={n.to}
                  to={n.to}
                  end={n.end}
                  className={({ isActive }) => `sidebar-link ${isActive ? 'active' : ''}`}
                >
                  {n.label}
                </NavLink>
              ))}
            </div>
          ))}
        </nav>

        <div className="sidebar-footer">
          <div className="sidebar-user">
            {avatarPic
              ? <img src={avatarPic} alt="" className="sidebar-avatar avatar-img" />
              : <div className="sidebar-avatar">{initials}</div>}
            <div className="sidebar-user-info">
              <div className="sidebar-user-name">{displayName}</div>
              <div className="sidebar-user-email">{displayEmail}</div>
            </div>
          </div>
          <button
            className="btn btn-ghost btn-sm"
            onClick={handleLogout}
            style={{ width: '100%', marginTop: '12px', color: 'rgba(255,255,255,0.65)', justifyContent: 'flex-start' }}
            id="logout-btn"
          >
            Sign Out
          </button>
        </div>
      </aside>

      <div className="main-content">
        <header className="main-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', minWidth: 0 }}>
            <button
              className="menu-toggle"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              aria-label="Toggle menu"
              id="menu-toggle-btn"
            >
              <IconMenu />
            </button>
            <h1>{pageTitle}</h1>
          </div>

          <div className="header-actions">
            {!isAdmin && (
              <div className="notif-wrap" ref={notifRef} style={{ position: 'relative' }}>
                <button
                  className="notification-bell"
                  onClick={() => setShowNotifs(!showNotifs)}
                  aria-label="Notifications"
                  id="notification-bell"
                >
                  <IconBell />
                  {unreadCount > 0 && (
                    <span className="notification-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
                  )}
                </button>

                {showNotifs && (
                  <div className="notification-panel">
                    <div style={{ padding: '14px 18px', borderBottom: '1px solid var(--gray-100)', fontWeight: 700, fontSize: '0.9rem' }}>
                      Notifications
                    </div>
                    {notifications.length > 0 ? (
                      notifications.slice(0, 10).map(n => (
                        <div
                          key={n.NotificationID}
                          className={`notif-item ${!n.IsRead ? 'unread' : ''}`}
                          onClick={() => markAsRead(n.NotificationID)}
                        >
                          <div className="notif-title">{n.Title}</div>
                          <div className="notif-message">{n.Message}</div>
                          <div className="notif-time">{formatDateTime(n.CreatedAt)}</div>
                        </div>
                      ))
                    ) : (
                      <div style={{ padding: '24px', textAlign: 'center', color: 'var(--gray-400)', fontSize: '0.85rem' }}>
                        No notifications
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {avatarPic
                ? <img src={avatarPic} alt="" className="sidebar-avatar avatar-img" style={{ width: '32px', height: '32px' }} />
                : <div className="sidebar-avatar" style={{
                    width: '32px', height: '32px', fontSize: '0.75rem',
                    background: 'linear-gradient(135deg, var(--primary-700), var(--primary-500))',
                    color: 'white',
                  }}>
                    {initials}
                  </div>}
              <span className="header-username">{displayName}</span>
            </div>
          </div>
        </header>

        <div className="page-content">
          {children}
        </div>
      </div>

      {showTour && <OnboardingTour onClose={closeTour} />}
    </div>
  );
}
