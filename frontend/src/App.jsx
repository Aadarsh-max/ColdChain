import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext.jsx';
import ProtectedRoute from './components/auth/ProtectedRoute.jsx';
import RequireAdmin from './components/auth/RequireAdmin.jsx';
import Layout from './components/layout/Layout.jsx';
import LoginPage from './pages/LoginPage.jsx';
import SignupPage from './pages/SignupPage.jsx';
import AccountPage from './pages/AccountPage.jsx';
import UsersPage from './pages/UsersPage.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ShipmentsPage from './pages/ShipmentsPage.jsx';
import ShipmentDetailPage from './pages/ShipmentDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import LiveTrackingPage from './pages/LiveTrackingPage.jsx';
import AnalyticsPage from './pages/AnalyticsPage.jsx';
import ReportsPage from './pages/ReportsPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="login" element={<LoginPage />} />
          <Route path="signup" element={<SignupPage />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="tracking" element={<LiveTrackingPage />} />
              <Route path="shipments" element={<ShipmentsPage />} />
              <Route path="shipments/:shipmentId" element={<ShipmentDetailPage />} />
              <Route path="analytics" element={<AnalyticsPage />} />
              <Route path="alerts" element={<AlertsPage />} />
              <Route path="devices" element={<DevicesPage />} />
              <Route path="reports" element={<ReportsPage />} />
              <Route path="settings" element={<SettingsPage />} />
              <Route path="account" element={<AccountPage />} />
              <Route element={<RequireAdmin />}>
                <Route path="users" element={<UsersPage />} />
              </Route>
              <Route path="*" element={<PlaceholderPage title="Page not found" note="This page does not exist." />} />
            </Route>
          </Route>
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}