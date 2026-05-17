import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { logout } from '../../store/slices/authSlice';
import usePermission from '../../hooks/usePermission';

const Icon = ({ d, size = 15 }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    {Array.isArray(d) ? d.map((p, i) => <path key={i} d={p} />) : <path d={d} />}
  </svg>
);

// Each nav item has a `module` that maps to a permission module
// `editOnly` means the item is hidden unless user has edit permission
const navConfig = [
  {
    section: 'MAIN',
    items: [
      { label: 'Dashboard', path: '/dashboard', module: 'dashboard', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
    ],
  },
  {
    section: 'BILLING',
    items: [
      { label: 'New Invoice',  path: '/billing/new',  module: 'billing', editOnly: true,  icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M12 18v-6 M9 15h6' },
      { label: 'All Invoices', path: '/billing',      module: 'billing', editOnly: false, icon: 'M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2 M9 5a2 2 0 0 0 2 2h2a2 2 0 0 0 2-2 M9 5a2 2 0 0 1 2-2h2a2 2 0 0 1 2 2' },
      { label: 'Pending Dues', path: '/billing/dues', module: 'billing', editOnly: false, icon: 'M12 22C6.477 22 2 17.523 2 12S6.477 2 12 2s10 4.477 10 10-4.477 10-10 10z M12 6v6l4 2' },
    ],
  },
  {
    section: 'INVENTORY',
    items: [
      { label: 'Products',         path: '/inventory',           module: 'inventory', editOnly: false, icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z' },
      { label: 'Stock Adjustment', path: '/inventory/stock',     module: 'inventory', editOnly: true,  icon: 'M3 3h18v18H3z M3 9h18 M3 15h18 M9 3v18 M15 3v18' },
      { label: 'Low Stock',        path: '/inventory/low-stock', module: 'inventory', editOnly: false, icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z M12 9v4 M12 17h.01' },
    ],
  },
  {
    section: 'CUSTOMERS',
    items: [
      { label: 'Customers', path: '/customers', module: 'customers', editOnly: false, icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2 M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8z M23 21v-2a4 4 0 0 0-3-3.87 M16 3.13a4 4 0 0 1 0 7.75' },
    ],
  },
  {
    section: 'REPORTS',
    items: [
      { label: 'Sales Report', path: '/reports/sales', module: 'reports', editOnly: false, icon: 'M18 20V10 M12 20V4 M6 20v-6' },
      { label: 'Stock Report', path: '/reports/stock', module: 'reports', editOnly: false, icon: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z M14 2v6h6 M16 13H8 M16 17H8 M10 9H8' },
    ],
  },
  {
    section: 'SYSTEM',
    items: [
      { label: 'Settings', path: '/settings', module: 'settings', editOnly: false, icon: 'M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z' },
    ],
  },
];

export default function Sidebar({ isOpen, onClose }) {
  const dispatch     = useDispatch();
  const navigate     = useNavigate();
  const { user }     = useSelector((s) => s.auth);
  const { canView, canEdit, isAdmin } = usePermission();

  const roleColor = { superadmin: '#e53935', admin: 'var(--accent)', staff: 'rgba(255,255,255,0.4)' };

  return (
    <aside className={`sidebar${isOpen ? ' open' : ''}`}>
      <div className="sidebar-logo" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
        <div>
          <div className="sidebar-logo-title">Spare Parts MS</div>
          <div className="sidebar-logo-sub">Billing &amp; Inventory</div>
          <div className="sidebar-logo-badge">Pro</div>
        </div>
        <button onClick={onClose} className="mobile-menu-btn" aria-label="Close menu" style={{ color: 'rgba(255,255,255,0.4)', marginTop: 2 }}>
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M18 6L6 18M6 6l12 12" /></svg>
        </button>
      </div>

      <nav className="sidebar-nav">
        {navConfig.map(({ section, items }) => {
          // Filter items by permission
          const visible = items.filter((item) => {
            if (!canView(item.module)) return false;         // no view → hide
            if (item.editOnly && !canEdit(item.module)) return false; // edit-only item → need edit
            return true;
          });
          if (visible.length === 0) return null;

          return (
            <div key={section}>
              <div className="nav-section-label">{section}</div>
              {visible.map((item) => (
                <NavLink
                  key={item.path}
                  to={item.path}
                  end={item.path === '/billing' || item.path === '/inventory'}
                  className={({ isActive }) => `nav-item${isActive ? ' active' : ''}`}
                  onClick={onClose}
                >
                  <span className="nav-icon"><Icon d={item.icon} /></span>
                  {item.label}
                </NavLink>
              ))}
            </div>
          );
        })}
      </nav>

      <div className="sidebar-footer">
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 10 }}>
          <div style={{
            width: 34, height: 34, borderRadius: '50%', flexShrink: 0,
            background: 'rgba(255,255,255,0.12)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, fontSize: 14, color: '#fff',
          }}>
            {user?.name?.charAt(0).toUpperCase()}
          </div>
          <div>
            <div className="sidebar-user-name">{user?.name}</div>
            <div style={{ fontSize: 10, fontWeight: 600, color: roleColor[user?.role] || 'rgba(255,255,255,0.4)', textTransform: 'uppercase', letterSpacing: 0.5 }}>
              {user?.role}
            </div>
          </div>
        </div>
        <button className="sidebar-logout" onClick={() => { dispatch(logout()); navigate('/login'); }}>
          <Icon d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4 M16 17l5-5-5-5 M21 12H9" size={14} />
          Sign out
        </button>
      </div>
    </aside>
  );
}
