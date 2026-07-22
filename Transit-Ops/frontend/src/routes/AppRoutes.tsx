import { Routes, Route, Navigate } from "react-router-dom";
import ProtectedRoute from "./ProtectedRoute";
import AppShell from "../components/layout/AppShell";

// Pages
import AuthScreen from "../pages/Auth/AuthScreen";
import Dashboard from "../pages/Dashboard/Dashboard";
import VehicleRegistry from "../pages/VehicleRegistry/VehicleRegistry";
import DriverManagement from "../pages/DriverManagement/DriverManagement";
import TripManagement from "../pages/TripManagement/TripManagement";
import MaintenanceLog from "../pages/MaintenanceLog/MaintenanceLog";
import FuelExpense from "../pages/FuelExpense/FuelExpense";
import Reports from "../pages/Reports/Reports";
import AdminUsers from "../pages/AdminUserManagement/AdminUsers";
import DriverOnboarding from "../pages/Auth/DriverOnboarding";

export default function AppRoutes() {
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/login" element={<AuthScreen initialMode="login" />} />
      <Route path="/signup" element={<AuthScreen initialMode="signup" />} />
      <Route path="/driver-onboarding" element={<ProtectedRoute roles={["DRIVER"]}><DriverOnboarding /></ProtectedRoute>} />

      {/* Protected routes inside the AppShell layout */}
      <Route
        path="/"
        element={
          <ProtectedRoute>
            <AppShell />
          </ProtectedRoute>
        }
      >
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="vehicles" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]}>
            <VehicleRegistry />
          </ProtectedRoute>
        } />
        <Route path="drivers" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER"]}>
            <DriverManagement />
          </ProtectedRoute>
        } />
        <Route path="trips" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "DRIVER", "SAFETY_OFFICER"]}>
            <TripManagement />
          </ProtectedRoute>
        } />
        <Route path="maintenance" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "DRIVER", "FINANCIAL_ANALYST"]}>
            <MaintenanceLog />
          </ProtectedRoute>
        } />
        <Route path="fuel-expenses" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "DRIVER", "FINANCIAL_ANALYST"]}>
            <FuelExpense />
          </ProtectedRoute>
        } />
        <Route path="reports" element={
          <ProtectedRoute roles={["ADMIN", "MANAGER", "SAFETY_OFFICER", "FINANCIAL_ANALYST"]}>
            <Reports />
          </ProtectedRoute>
        } />
        <Route path="users" element={
          <ProtectedRoute roles={["ADMIN"]}>
            <AdminUsers />
          </ProtectedRoute>
        } />
      </Route>

      {/* Catch all */}
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}
