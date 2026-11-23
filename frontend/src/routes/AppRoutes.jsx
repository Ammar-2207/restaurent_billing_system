import { Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../components/layout/MainLayout';
import LoginPage from '../pages/LoginPage';
import DashboardPage from '../pages/DashboardPage';
import ReportsPage from '../pages/ReportsPage';
import HomePage from '../pages/HomePage';
import TablesPage from '../pages/TablesPage';
import POSPage from '../pages/POSPage';
import OrdersPage from '../pages/OrdersPage';
import MenuPage from '../pages/MenuPage';
import BillingPage from '../pages/BillingPage';
import BillsPage from '../pages/BillsPage';
import AccessDeniedPage from '../pages/AccessDeniedPage';
import NotFoundPage from '../pages/NotFoundPage';

export default function AppRoutes() {
  const { isAuthenticated, loading } = useAuth();

  return (
    <Routes>
      {/* Public Login Route - Redirects to / if already logged in */}
      <Route
        path="/login"
        element={
          !loading && isAuthenticated ? <Navigate to="/" replace /> : <LoginPage />
        }
      />

      {/* Protected Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/tables" element={<TablesPage />} />
        <Route path="/pos" element={<POSPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/menu" element={<MenuPage />} />
        <Route path="/billing" element={<BillingPage />} />
        <Route path="/bills" element={<BillsPage />} />
        <Route path="/diagnostics" element={<HomePage />} />
        <Route path="/access-denied" element={<AccessDeniedPage />} />
      </Route>

      {/* 404 Not Found Route */}
      <Route path="/404" element={<NotFoundPage />} />
      <Route path="*" element={<Navigate to="/404" replace />} />
    </Routes>
  );
}
