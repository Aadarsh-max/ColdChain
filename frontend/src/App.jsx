import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { LiveDataProvider } from './context/LiveDataContext.jsx';
import Layout from './components/layout/Layout.jsx';
import DashboardPage from './pages/DashboardPage.jsx';
import DevicesPage from './pages/DevicesPage.jsx';
import PlaceholderPage from './pages/PlaceholderPage.jsx';

export default function App() {
  return (
    <LiveDataProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<Layout />}>
            <Route index element={<DashboardPage />} />
            <Route path="devices" element={<DevicesPage />} />
            <Route
              path="tracking"
              element={<PlaceholderPage title="Live Tracking" note="The Google Maps view is built in Phase 6." />}
            />
            <Route
              path="shipments"
              element={<PlaceholderPage title="Shipments" note="Create, edit, and assign shipments in Phase 6." />}
            />
            <Route
              path="analytics"
              element={<PlaceholderPage title="Analytics" note="Full temperature analytics are built in Phase 6." />}
            />
            <Route
              path="alerts"
              element={<PlaceholderPage title="Alerts" note="Filtering and acknowledging alerts is built in Phase 6." />}
            />
            <Route
              path="reports"
              element={<PlaceholderPage title="Reports" note="History, sync records, and CSV export are built in Phase 6." />}
            />
            <Route
              path="settings"
              element={<PlaceholderPage title="Settings" note="Thresholds and alert preferences are built in Phase 6." />}
            />
            <Route path="*" element={<PlaceholderPage title="Page not found" note="This page does not exist." />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </LiveDataProvider>
  );
}