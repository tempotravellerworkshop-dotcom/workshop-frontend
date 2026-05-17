import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { getMe } from './store/slices/authSlice';
import usePermission from './hooks/usePermission';
import './assets/styles/global.css';

import Login           from './pages/Login';
import Dashboard       from './pages/Dashboard';
import Products        from './pages/Products';
import StockAdjustment from './pages/StockAdjustment';
import LowStock        from './pages/LowStock';
import NewInvoice      from './pages/NewInvoice';
import Invoices        from './pages/Invoices';
import InvoiceDetail   from './pages/InvoiceDetail';
import PendingDues     from './pages/PendingDues';
import Customers       from './pages/Customers';
import SalesReport     from './pages/SalesReport';
import StockReport     from './pages/StockReport';
import Settings        from './pages/Settings';

// Shows 403 when user lacks permission
function Forbidden() {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center',
      justifyContent: 'center', minHeight: '100vh', gap: 16,
      fontFamily: 'var(--font-body)', background: 'var(--bg)',
    }}>
      <div style={{ fontSize: 64, fontWeight: 900, color: 'var(--border)' }}>403</div>
      <div style={{ fontSize: 20, fontWeight: 600, color: 'var(--text-primary)' }}>Access Denied</div>
      <div style={{ fontSize: 14, color: 'var(--text-muted)' }}>You do not have permission to view this page.</div>
      <a href="/dashboard" style={{ color: 'var(--primary)', fontSize: 14, fontWeight: 600, textDecoration: 'none' }}>
        Go to Dashboard
      </a>
    </div>
  );
}

// Route that checks both auth and permission
function ProtectedRoute({ children, module, requireEdit = false }) {
  const { token } = useSelector((s) => s.auth);
  const { canView, canEdit } = usePermission();

  if (!token) return <Navigate to="/login" replace />;

  // module = null means no permission check (e.g. dashboard)
  if (module) {
    if (!canView(module))              return <Forbidden />;
    if (requireEdit && !canEdit(module)) return <Forbidden />;
  }

  return children;
}

export default function App() {
  const dispatch  = useDispatch();
  const { token } = useSelector((s) => s.auth);

  useEffect(() => { if (token) dispatch(getMe()); }, [token, dispatch]);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<Navigate to="/dashboard" replace />} />

        {/* Dashboard — everyone with login can see */}
        <Route path="/dashboard" element={
          <ProtectedRoute module="dashboard"><Dashboard /></ProtectedRoute>
        } />

        {/* Billing — view: see invoices; edit: create/edit */}
        <Route path="/billing/new" element={
          <ProtectedRoute module="billing" requireEdit><NewInvoice /></ProtectedRoute>
        } />
        <Route path="/billing/edit/:id" element={
          <ProtectedRoute module="billing" requireEdit><NewInvoice /></ProtectedRoute>
        } />
        <Route path="/billing" element={
          <ProtectedRoute module="billing"><Invoices /></ProtectedRoute>
        } />
        <Route path="/billing/:id" element={
          <ProtectedRoute module="billing"><InvoiceDetail /></ProtectedRoute>
        } />
        <Route path="/billing/dues" element={
          <ProtectedRoute module="billing"><PendingDues /></ProtectedRoute>
        } />

        {/* Inventory — view: see products; edit: adjust stock */}
        <Route path="/inventory" element={
          <ProtectedRoute module="inventory"><Products /></ProtectedRoute>
        } />
        <Route path="/inventory/stock" element={
          <ProtectedRoute module="inventory" requireEdit><StockAdjustment /></ProtectedRoute>
        } />
        <Route path="/inventory/low-stock" element={
          <ProtectedRoute module="inventory"><LowStock /></ProtectedRoute>
        } />

        {/* Customers */}
        <Route path="/customers" element={
          <ProtectedRoute module="customers"><Customers /></ProtectedRoute>
        } />

        {/* Reports */}
        <Route path="/reports/sales" element={
          <ProtectedRoute module="reports"><SalesReport /></ProtectedRoute>
        } />
        <Route path="/reports/stock" element={
          <ProtectedRoute module="reports"><StockReport /></ProtectedRoute>
        } />

        {/* Settings */}
        <Route path="/settings" element={
          <ProtectedRoute module="settings"><Settings /></ProtectedRoute>
        } />

        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
