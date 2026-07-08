import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./routes/ProtectedRoute";
import LoginPage from "./pages/Login/LoginPage";
import ForgotPasswordPage from "./pages/Login/ForgotPasswordPage";
import ChangePasswordPage from "./pages/Login/ChangePasswordPage";
import Layout from "./components/Layout";
import { SearchProvider } from "./context/SearchContext.jsx";
import { ToastProvider } from "./lib/toast.jsx";
import DashboardPage from "./components/DashboardPage";
import TripsListPage from "./components/TripsListPage";
import TripDetailsPage from "./components/TripDetailsPage";
import NotificationsPage from "./components/NotificationsPage";
import NotificationsBellPage from "./components/NotificationsBellPage";
import UsersPage from "./components/UsersPage";
import ActivityLogPage from "./components/ActivityLogPage";
import SettingsPage from "./components/SettingsPage";
import RewardsPage from "./components/RewardsPage";
import ClientsPage from "./components/ClientsPage";
import SupportPage from "./components/SupportPage";
import DriversPage from "./components/DriversPage";
import CreateTripPage from "./components/CreateTripPage";
import NewTripFormPage from "./components/NewTripFormPage";
import ApprovalsPage from "./components/ApprovalsPage";
import PermissionsPage from "./components/PermissionsPage";
import SystemManagementPage from "./components/SystemManagementPage";
import AccountsPage from "./components/accounts/AccountsPage";
import NotFoundPage from "./components/NotFoundPage";

function AdminPage({ children }) {
  return (
    <ProtectedRoute>
      <SearchProvider>
        <Layout>{children}</Layout>
      </SearchProvider>
    </ProtectedRoute>
  );
}

export default function App() {
  return (
    <ToastProvider>
      <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, "")}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/sign-in" element={<Navigate to="/login" replace />} />
          <Route path="/forgot-password" element={<ForgotPasswordPage />} />
          <Route
            path="/change-password"
            element={
              <ProtectedRoute>
                <ChangePasswordPage />
              </ProtectedRoute>
            }
          />
          <Route path="/" element={<Navigate to="/dashboard" replace />} />

          <Route path="/dashboard" element={<AdminPage><DashboardPage /></AdminPage>} />
          <Route path="/trips" element={<AdminPage><TripsListPage /></AdminPage>} />
          <Route path="/trips/:tripId" element={<AdminPage><TripDetailsPage /></AdminPage>} />
          <Route path="/notifications" element={<AdminPage><NotificationsPage /></AdminPage>} />
          <Route path="/alerts" element={<AdminPage><NotificationsBellPage /></AdminPage>} />
          <Route path="/users" element={<AdminPage><UsersPage /></AdminPage>} />
          <Route path="/activity" element={<AdminPage><ActivityLogPage /></AdminPage>} />
          <Route path="/approvals" element={<AdminPage><ApprovalsPage /></AdminPage>} />
          <Route path="/permissions" element={<AdminPage><PermissionsPage /></AdminPage>} />
          <Route path="/system" element={<AdminPage><SystemManagementPage /></AdminPage>} />
          <Route path="/accounts" element={<Navigate to="/accounts/employees" replace />} />
          <Route path="/accounts/:tab" element={<AdminPage><AccountsPage /></AdminPage>} />
          <Route path="/settings" element={<AdminPage><SettingsPage /></AdminPage>} />
          <Route path="/rewards" element={<AdminPage><RewardsPage /></AdminPage>} />
          <Route path="/clients" element={<AdminPage><ClientsPage /></AdminPage>} />
          <Route path="/support" element={<AdminPage><SupportPage /></AdminPage>} />
          <Route path="/drivers" element={<AdminPage><DriversPage /></AdminPage>} />
          <Route path="/drivers/:driverId" element={<AdminPage><DriversPage /></AdminPage>} />
          <Route path="/create-trip" element={<AdminPage><CreateTripPage /></AdminPage>} />
          <Route path="/new-trip" element={<AdminPage><NewTripFormPage /></AdminPage>} />

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </BrowserRouter>
    </ToastProvider>
  );
}
