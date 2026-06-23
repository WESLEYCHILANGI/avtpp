import { Routes, Route, Navigate } from 'react-router-dom';

// Layout
import Layout from './components/Layout';
import { ProtectedRoute, AdminProtectedRoute, GuestRoute } from './components/ProtectedRoute';

// User Pages
import Login from './pages/Login';
import Register from './pages/Register';
import ForgotPassword from './pages/ForgotPassword';
import Dashboard from './pages/Dashboard';
import TopUp from './pages/TopUp';
import PaymentHistory from './pages/PaymentHistory';
import Vehicles from './pages/Vehicles';
import SimulateToll from './pages/SimulateToll';
import Settings from './pages/Settings';

// Admin Pages
import AdminLogin from './pages/admin/AdminLogin';
import AdminDashboard from './pages/admin/AdminDashboard';
import AdminUsers from './pages/admin/AdminUsers';
import AdminGates from './pages/admin/AdminGates';
import AdminTariffs from './pages/admin/AdminTariffs';
import AdminReports from './pages/admin/AdminReports';

// Styles
import './App.css';

function App() {
  return (
    <Routes>
      {/* ── Public / Guest Routes ── */}
      <Route
        path="/login"
        element={
          <GuestRoute>
            <Login />
          </GuestRoute>
        }
      />
      <Route
        path="/register"
        element={
          <GuestRoute>
            <Register />
          </GuestRoute>
        }
      />
      <Route
        path="/forgot-password"
        element={
          <GuestRoute>
            <ForgotPassword />
          </GuestRoute>
        }
      />

      {/* ── Protected User Routes ── */}
      <Route
        path="/dashboard"
        element={
          <ProtectedRoute>
            <Layout>
              <Dashboard />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/topup"
        element={
          <ProtectedRoute>
            <Layout>
              <TopUp />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/history"
        element={
          <ProtectedRoute>
            <Layout>
              <PaymentHistory />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/vehicles"
        element={
          <ProtectedRoute>
            <Layout>
              <Vehicles />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/simulate"
        element={
          <ProtectedRoute>
            <Layout>
              <SimulateToll />
            </Layout>
          </ProtectedRoute>
        }
      />
      <Route
        path="/settings"
        element={
          <ProtectedRoute>
            <Layout>
              <Settings />
            </Layout>
          </ProtectedRoute>
        }
      />

      {/* ── Admin Routes ── */}
      <Route path="/admin/login" element={<AdminLogin />} />
      <Route
        path="/admin"
        element={
          <AdminProtectedRoute>
            <Layout isAdmin>
              <AdminDashboard />
            </Layout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/users"
        element={
          <AdminProtectedRoute>
            <Layout isAdmin>
              <AdminUsers />
            </Layout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/gates"
        element={
          <AdminProtectedRoute>
            <Layout isAdmin>
              <AdminGates />
            </Layout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/tariffs"
        element={
          <AdminProtectedRoute>
            <Layout isAdmin>
              <AdminTariffs />
            </Layout>
          </AdminProtectedRoute>
        }
      />
      <Route
        path="/admin/reports"
        element={
          <AdminProtectedRoute>
            <Layout isAdmin>
              <AdminReports />
            </Layout>
          </AdminProtectedRoute>
        }
      />

      {/* ── Fallback ── */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default App;
