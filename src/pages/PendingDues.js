import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';

const LIMIT = 15;

export default function PendingDues() {
  const [dues,    setDues]    = useState([]);
  const [total,   setTotal]   = useState(0);
  const [loading, setLoading] = useState(true);
  const [page,    setPage]    = useState(1);

  useEffect(() => {
    setLoading(true);
    api.get(`/invoices/pending-dues?page=${page}&limit=${LIMIT}`)
      .then((r) => {
        setDues(r.data.data);
        setTotal(r.data.total || r.data.data.length);
      })
      .finally(() => setLoading(false));
  }, [page]);

  const totalDue   = dues.reduce((s, d) => s + d.dueAmount, 0);
  const totalBilled= dues.reduce((s, d) => s + d.grandTotal, 0);
  const pages      = Math.ceil(total / LIMIT);

  return (
    <Layout title="Pending Dues">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card danger">
          <div className="stat-label">Total Due</div>
          <div className="stat-value">{formatCurrency(totalDue)}</div>
          <div className="stat-sub">Outstanding amount</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Pending Invoices</div>
          <div className="stat-value">{total}</div>
          <div className="stat-sub">Showing page {page}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Billed</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totalBilled)}</div>
          <div className="stat-sub">This page</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Avg Due / Invoice</div>
          <div className="stat-value" style={{ fontSize: 18 }}>
            {dues.length ? formatCurrency(totalDue / dues.length) : 'Rs.0.00'}
          </div>
          <div className="stat-sub">This page</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Pending Dues ({total})</span>
          {total > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Sorted by oldest first
            </span>
          )}
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Invoice No</th>
                  <th>Date</th>
                  <th>Customer</th>
                  <th>Mobile</th>
                  <th className="text-right">Invoice Total</th>
                  <th className="text-right">Paid</th>
                  <th className="text-right">Due</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {dues.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                      No pending dues
                    </td>
                  </tr>
                )}
                {dues.map((d, i) => (
                  <tr key={d._id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td>
                      <Link to={`/billing/${d._id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                        {d.invoiceNumber}
                      </Link>
                    </td>
                    <td style={{ fontSize: 12 }}>{formatDate(d.invoiceDate)}</td>
                    <td style={{ fontWeight: 500 }}>{d.customerName}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{d.customerMobile}</td>
                    <td className="text-right font-mono">{formatCurrency(d.grandTotal)}</td>
                    <td className="text-right font-mono" style={{ color: 'var(--success)' }}>
                      {formatCurrency(d.paidAmount)}
                    </td>
                    <td className="text-right font-mono" style={{ fontWeight: 700, color: 'var(--danger)' }}>
                      {formatCurrency(d.dueAmount)}
                    </td>
                    <td>
                      <span className={`badge badge-${d.paymentStatus === 'partial' ? 'warning' : d.paymentStatus === 'credit' ? 'info' : 'danger'}`}>
                        {d.paymentStatus}
                      </span>
                    </td>
                    <td>
                      <Link to={`/billing/${d._id}`} className="btn btn-success btn-sm">
                        Collect
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>
    </Layout>
  );
}
