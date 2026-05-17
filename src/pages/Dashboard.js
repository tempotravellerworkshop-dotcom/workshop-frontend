import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';
import { Link } from 'react-router-dom';

export default function Dashboard() {
  const [stats, setStats] = useState(null);
  const [recentInvoices, setRecentInvoices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [statsRes, invoicesRes] = await Promise.all([
          api.get('/reports/dashboard'),
          api.get('/invoices?limit=8'),
        ]);
        setStats(statsRes.data.data);
        setRecentInvoices(invoicesRes.data.data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, []);

  if (loading) return <Layout title="Dashboard"><div className="loading"><div className="spinner" /></div></Layout>;

  return (
    <Layout title="Dashboard">
      <div className="stats-grid">
        <div className="stat-card primary">
          <div className="stat-label">Today's Sales</div>
          <div className="stat-value">{formatCurrency(stats?.todaySales)}</div>
          <div className="stat-sub">{stats?.todayInvoices} invoice(s) today</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">This Month</div>
          <div className="stat-value">{formatCurrency(stats?.monthSales)}</div>
          <div className="stat-sub">{stats?.monthInvoices} invoice(s)</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Total Due</div>
          <div className="stat-value">{formatCurrency(stats?.totalDue)}</div>
          <div className="stat-sub">Pending collections</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{stats?.lowStockCount || 0}</div>
          <div className="stat-sub"><Link to="/inventory/low-stock" style={{ color: 'inherit' }}>View items</Link></div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Invoices</div>
          <div className="stat-value">{stats?.totalInvoices}</div>
          <div className="stat-sub">All time</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Customers</div>
          <div className="stat-value">{stats?.totalCustomers}</div>
          <div className="stat-sub">Registered</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
        <div className="card">
          <div className="card-header">
            <span className="card-title">Recent Invoices</span>
            <Link to="/billing" className="btn btn-secondary btn-sm">View All</Link>
          </div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>Invoice</th>
                  <th>Customer</th>
                  <th className="text-right">Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentInvoices.length === 0 && (
                  <tr><td colSpan={4} className="text-center" style={{ color: '#9ea3b5', padding: 24 }}>No invoices yet</td></tr>
                )}
                {recentInvoices.map((inv) => (
                  <tr key={inv._id}>
                    <td>
                      <Link to={`/billing/${inv._id}`} style={{ color: 'var(--primary)', fontWeight: 600 }}>
                        {inv.invoiceNumber}
                      </Link>
                      <div style={{ fontSize: 11, color: '#9ea3b5' }}>{formatDate(inv.invoiceDate)}</div>
                    </td>
                    <td>{inv.customerName}</td>
                    <td className="text-right font-mono">{formatCurrency(inv.grandTotal)}</td>
                    <td>
                      <span className={`badge badge-${inv.paymentStatus === 'paid' ? 'success' : inv.paymentStatus === 'partial' ? 'warning' : 'danger'}`}>
                        {inv.paymentStatus}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        <div className="card">
          <div className="card-header">
            <span className="card-title">Quick Actions</span>
          </div>
          <div className="card-body" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            <Link to="/billing/new" className="btn btn-primary btn-lg" style={{ justifyContent: 'center' }}>
              Create New Invoice
            </Link>
            <Link to="/inventory" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>
              Manage Products
            </Link>
            <Link to="/customers" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>
              View Customers
            </Link>
            <Link to="/billing/dues" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>
              Pending Dues
            </Link>
            <Link to="/reports/sales" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>
              Sales Report
            </Link>
            <Link to="/inventory/stock" className="btn btn-secondary btn-lg" style={{ justifyContent: 'center' }}>
              Stock Adjustment
            </Link>
          </div>
        </div>
      </div>
    </Layout>
  );
}
