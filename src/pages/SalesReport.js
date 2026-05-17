import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';

const LIMIT = 20;

export default function SalesReport() {
  const [allData,  setAllData]  = useState([]);
  const [loading,  setLoading]  = useState(false);
  const [page,     setPage]     = useState(1);

  const today = new Date();
  const [from, setFrom] = useState(new Date(today.getFullYear(), today.getMonth(), 1).toISOString().split('T')[0]);
  const [to,   setTo]   = useState(today.toISOString().split('T')[0]);
  const [groupBy, setGroupBy] = useState('day');

  const fetchReport = async () => {
    setLoading(true);
    setPage(1);
    try {
      const res = await api.get(`/reports/sales?from=${from}&to=${to}&groupBy=${groupBy}`);
      setAllData(res.data.data);
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchReport(); }, [from, to, groupBy]);

  const totals = allData.reduce((acc, row) => ({
    sales:   acc.sales   + row.totalSales,
    tax:     acc.tax     + row.totalTax,
    count:   acc.count   + row.invoiceCount,
    paid:    acc.paid    + row.paidAmount,
    due:     acc.due     + row.dueAmount,
  }), { sales: 0, tax: 0, count: 0, paid: 0, due: 0 });

  const pages    = Math.ceil(allData.length / LIMIT);
  const paginated = allData.slice((page - 1) * LIMIT, page * LIMIT);

  const formatPeriod = (row) => {
    if (groupBy === 'month') return `${row._id.year}-${String(row._id.month).padStart(2, '0')}`;
    return `${String(row._id.day).padStart(2,'0')}/${String(row._id.month).padStart(2,'0')}/${row._id.year}`;
  };

  return (
    <Layout title="Sales Report">
      {/* Filters */}
      <div className="card" style={{ marginBottom: 20 }}>
        <div className="card-body" style={{ padding: '14px 20px' }}>
          <div style={{ display: 'flex', gap: 12, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">From</label>
              <input type="date" className="form-control" value={from} onChange={(e) => setFrom(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">To</label>
              <input type="date" className="form-control" value={to} onChange={(e) => setTo(e.target.value)} />
            </div>
            <div className="form-group" style={{ margin: 0 }}>
              <label className="form-label">Group By</label>
              <select className="form-control" value={groupBy} onChange={(e) => setGroupBy(e.target.value)}>
                <option value="day">Day</option>
                <option value="month">Month</option>
              </select>
            </div>
            <button className="btn btn-primary" onClick={fetchReport}>Refresh</button>
            {/* Quick filters */}
            {[
              { label: 'Today',      d: 0  },
              { label: 'This Week',  d: 6  },
              { label: 'This Month', d: -1 },
            ].map(({ label, d }) => (
              <button key={label} className="btn btn-secondary btn-sm" onClick={() => {
                const t = new Date();
                const f = new Date();
                if (d >= 0) f.setDate(f.getDate() - d);
                else        f.setDate(1);
                setFrom(f.toISOString().split('T')[0]);
                setTo(t.toISOString().split('T')[0]);
              }}>
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Summary stats */}
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(5, 1fr)', marginBottom: 20 }}>
        <div className="stat-card primary">
          <div className="stat-label">Total Sales</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totals.sales)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">GST Collected</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totals.tax)}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Invoices</div>
          <div className="stat-value">{totals.count}</div>
        </div>
        <div className="stat-card success">
          <div className="stat-label">Collected</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totals.paid)}</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Pending</div>
          <div className="stat-value" style={{ fontSize: 20 }}>{formatCurrency(totals.due)}</div>
        </div>
      </div>

      {/* Data table */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">
            Sales Breakdown — {allData.length} {groupBy === 'day' ? 'days' : 'months'}
          </span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {from} to {to}
          </span>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Period</th>
                  <th className="text-right">Invoices</th>
                  <th className="text-right">Total Sales</th>
                  <th className="text-right">GST Amount</th>
                  <th className="text-right">Collected</th>
                  <th className="text-right">Pending</th>
                  <th>Collection %</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                      No data for selected period
                    </td>
                  </tr>
                )}
                {paginated.map((row, i) => {
                  const pct = row.totalSales > 0 ? Math.round((row.paidAmount / row.totalSales) * 100) : 0;
                  return (
                    <tr key={i}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{formatPeriod(row)}</td>
                      <td className="text-right">{row.invoiceCount}</td>
                      <td className="text-right font-mono">{formatCurrency(row.totalSales)}</td>
                      <td className="text-right font-mono">{formatCurrency(row.totalTax)}</td>
                      <td className="text-right font-mono" style={{ color: 'var(--success)' }}>{formatCurrency(row.paidAmount)}</td>
                      <td className="text-right font-mono" style={{ color: row.dueAmount > 0 ? 'var(--danger)' : 'var(--text-muted)' }}>
                        {formatCurrency(row.dueAmount)}
                      </td>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 3, overflow: 'hidden' }}>
                            <div style={{ width: `${pct}%`, height: '100%', background: pct === 100 ? 'var(--success)' : pct > 50 ? 'var(--warning)' : 'var(--danger)', borderRadius: 3 }} />
                          </div>
                          <span style={{ fontSize: 11, color: 'var(--text-muted)', minWidth: 32 }}>{pct}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {paginated.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                    <td colSpan={2} style={{ padding: '11px 14px' }}>TOTAL</td>
                    <td className="text-right">{totals.count}</td>
                    <td className="text-right font-mono">{formatCurrency(totals.sales)}</td>
                    <td className="text-right font-mono">{formatCurrency(totals.tax)}</td>
                    <td className="text-right font-mono">{formatCurrency(totals.paid)}</td>
                    <td className="text-right font-mono">{formatCurrency(totals.due)}</td>
                    <td />
                  </tr>
                </tfoot>
              )}
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </Layout>
  );
}
