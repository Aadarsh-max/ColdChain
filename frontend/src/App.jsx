import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LiveDataProvider } from './context/LiveDataContext.jsx';
import Layout from './components/layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import AlertsPage from './pages/AlertsPage.jsx';
import ShipmentsPage from './pages/ShipmentsPage.jsx';
import ShipmentDetailPage from './pages/ShipmentDetailPage.jsx';
import SettingsPage from './pages/SettingsPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <LiveDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route path="alerts" element={<AlertsPage />} />
            <Route path="shipments" element={<ShipmentsPage />} />
            <Route path="shipments/:shipmentId" element={<ShipmentDetailPage />} />
            <Route path="settings" element={<SettingsPage />} />
            <Route
              path="tracking"
              element={<PlaceholderPage title="Live Tracking" note="The Google Maps view is built in Phase 6B." />}
            />
            <Route
              path="analytics"
              element={<PlaceholderPage title="Analytics" note="Full temperature analytics are built in Phase 6B." />}
            />
            <Route
              path="reports"
              element={<PlaceholderPage title="Reports" note="History, sync records, and CSV export are built in Phase 6B." />}
            />
            <Route path="*" element={<PlaceholderPage title="Page not found" note="This page does not exist." />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LiveDataProvider>
  );
}