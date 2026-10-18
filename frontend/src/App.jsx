import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LiveDataProvider } from './context/LiveDataContext.jsx';
import Layout from './components/layout/Layout.jsx';
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
    <LiveDataProvider>
      <BrowserRouter>
        <Routes>
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
            <Route path="*" element={<PlaceholderPage title="Page not found" note="This page does not exist." />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LiveDataProvider>
  );
}