import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import usePermission from '../hooks/usePermission';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/helpers';

const LIMIT = 20;

export default function Invoices() {
  const [invoices,  setInvoices]  = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [status,    setStatus]    = useState('');
  const [payStatus, setPayStatus] = useState('');
  const [billing,   setBilling]   = useState('');
  const [from,      setFrom]      = useState('');
  const [to,        setTo]        = useState('');
  const [page,      setPage]      = useState(1);

  const { canEdit } = usePermission();
  const canEditBilling = canEdit('billing');

  const fetchInvoices = useCallback(async () => {
    setLoading(true);
    try {
      const p = new URLSearchParams({ page, limit: LIMIT });
      if (search)    p.append('search',      search);
      if (status)    p.append('status',      status);
      if (payStatus) p.append('payStatus',   payStatus);
      if (billing)   p.append('billingType', billing);
      if (from)      p.append('from',        from);
      if (to)        p.append('to',          to);
      const res = await api.get(`/invoices?${p}`);
      setInvoices(res.data.data);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  }, [search, status, payStatus, billing, from, to, page]);

  useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

  const pages = Math.ceil(total / LIMIT);

  const FilterBtn = ({ label, val, current, onChange }) => (
    <button
      className={`btn btn-sm ${current === val ? 'btn-primary' : 'btn-secondary'}`}
      style={{ whiteSpace: 'nowrap' }}
      onClick={() => { onChange(val === current ? '' : val); setPage(1); }}
    >
      {label}
    </button>
  );

  const payBadge = { paid: 'success', partial: 'warning', pending: 'danger', credit: 'info' };

  return (
    <Layout title="Invoices">

      {/* ── Filters ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>

        {/* Row 1: search + dates + new button */}
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <div style={{ position: 'relative', flex: '1 1 220px', minWidth: 0 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none', fontSize: 14 }}>
              &#128269;
            </span>
            <input
              className="form-control"
              style={{ paddingLeft: 34 }}
              placeholder="Invoice no, customer, mobile..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <input
            type="date" className="form-control"
            style={{ width: 145, flex: '0 0 145px' }}
            value={from}
            onChange={(e) => { setFrom(e.target.value); setPage(1); }}
          />
          <input
            type="date" className="form-control"
            style={{ width: 145, flex: '0 0 145px' }}
            value={to}
            onChange={(e) => { setTo(e.target.value); setPage(1); }}
          />
          {canEditBilling && (
            <Link to="/billing/new" className="btn btn-primary" style={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
              + New Invoice
            </Link>
          )}
        </div>

        {/* Row 2: filter chips — scroll horizontally on mobile */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center', overflowX: 'auto', paddingBottom: 2 }}>
          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap' }}>Status:</span>
          <FilterBtn label="Draft"   val="draft"   current={status}    onChange={setStatus} />
          <FilterBtn label="Final"   val="final"   current={status}    onChange={setStatus} />

          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', marginLeft: 6 }}>Payment:</span>
          <FilterBtn label="Paid"    val="paid"    current={payStatus} onChange={setPayStatus} />
          <FilterBtn label="Partial" val="partial" current={payStatus} onChange={setPayStatus} />
          <FilterBtn label="Pending" val="pending" current={payStatus} onChange={setPayStatus} />
          <FilterBtn label="Credit"  val="credit"  current={payStatus} onChange={setPayStatus} />

          <span style={{ fontSize: 11, color: 'var(--text-muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, whiteSpace: 'nowrap', marginLeft: 6 }}>Type:</span>
          <FilterBtn label="GST"     val="gst"     current={billing}   onChange={setBilling} />
          <FilterBtn label="Non-GST" val="non-gst" current={billing}   onChange={setBilling} />

          {/* Clear all */}
          {(status || payStatus || billing || from || to || search) && (
            <button
              className="btn btn-sm btn-secondary"
              style={{ color: 'var(--danger)', borderColor: 'var(--danger)', marginLeft: 4, whiteSpace: 'nowrap' }}
              onClick={() => { setSearch(''); setStatus(''); setPayStatus(''); setBilling(''); setFrom(''); setTo(''); setPage(1); }}
            >
              Clear All
            </button>
          )}
        </div>
      </div>

      {/* ── Table — desktop ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Invoices ({total})</span>
        </div>

        {/* Desktop table */}
        <div className="table-container" style={{ display: 'none' }} id="invoice-table-desktop">
          {/* shown via CSS below */}
        </div>

        {loading ? (
          <div className="loading"><div className="spinner" /></div>
        ) : invoices.length === 0 ? (
          <div className="empty-state" style={{ padding: 50 }}>
            <h3>No invoices found</h3>
            <p>Try adjusting your filters.</p>
          </div>
        ) : (
          <>
            {/* ── Desktop Table ── */}
            <div className="invoice-desktop-view table-container">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Invoice No</th>
                    <th>Date</th>
                    <th>Customer</th>
                    <th>Type</th>
                    <th>Status</th>
                    <th className="text-right">Total</th>
                    <th className="text-right">Paid</th>
                    <th className="text-right">Due</th>
                    <th>Payment</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.map((inv, i) => (
                    <tr key={inv._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                      <td>
                        <Link to={`/billing/${inv._id}`} style={{ color: 'var(--primary)', fontWeight: 700 }}>
                          {inv.invoiceNumber}
                        </Link>
                      </td>
                      <td style={{ fontSize: 12, whiteSpace: 'nowrap' }}>{formatDate(inv.invoiceDate)}</td>
                      <td style={{ fontWeight: 500, maxWidth: 160, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {inv.customerName}
                      </td>
                      <td>
                        <span className={`badge badge-${inv.billingType === 'gst' ? 'info' : 'default'}`}>
                          {inv.billingType?.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <span className={`badge badge-${inv.status === 'draft' ? 'warning' : 'success'}`}>
                          {inv.status === 'draft' ? 'Draft' : 'Final'}
                        </span>
                      </td>
                      <td className="text-right font-mono" style={{ whiteSpace: 'nowrap' }}>{formatCurrency(inv.grandTotal)}</td>
                      <td className="text-right font-mono" style={{ color: 'var(--success)', whiteSpace: 'nowrap' }}>{formatCurrency(inv.paidAmount)}</td>
                      <td className="text-right font-mono" style={{ whiteSpace: 'nowrap', color: inv.dueAmount > 0 ? 'var(--danger)' : 'var(--text-muted)', fontWeight: inv.dueAmount > 0 ? 700 : 400 }}>
                        {formatCurrency(inv.dueAmount)}
                      </td>
                      <td>
                        <span className={`badge badge-${payBadge[inv.paymentStatus] || 'default'}`}>
                          {inv.paymentStatus}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          <Link to={`/billing/${inv._id}`} className="btn btn-secondary btn-sm">View</Link>
                          {canEditBilling && (
                            <Link to={`/billing/edit/${inv._id}`} className="btn btn-secondary btn-sm">Edit</Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* ── Mobile Cards ── */}
            <div className="invoice-mobile-view" style={{ padding: '8px 0' }}>
              {invoices.map((inv, i) => (
                <div key={inv._id} style={{
                  padding: '14px 16px',
                  borderBottom: '1px solid var(--border-light)',
                }}>
                  {/* Top row: invoice number + badges */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
                    <Link to={`/billing/${inv._id}`} style={{ color: 'var(--primary)', fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-mono)' }}>
                      {inv.invoiceNumber}
                    </Link>
                    <span className={`badge badge-${inv.status === 'draft' ? 'warning' : 'success'}`} style={{ fontSize: 10 }}>
                      {inv.status === 'draft' ? 'Draft' : 'Final'}
                    </span>
                    <span className={`badge badge-${inv.billingType === 'gst' ? 'info' : 'default'}`} style={{ fontSize: 10 }}>
                      {inv.billingType?.toUpperCase()}
                    </span>
                    <span className={`badge badge-${payBadge[inv.paymentStatus] || 'default'}`} style={{ fontSize: 10, marginLeft: 'auto' }}>
                      {inv.paymentStatus}
                    </span>
                  </div>

                  {/* Customer + date */}
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text-primary)', marginBottom: 3 }}>
                    {inv.customerName}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 10 }}>
                    {formatDate(inv.invoiceDate)}
                    {inv.customerMobile ? ` · ${inv.customerMobile}` : ''}
                  </div>

                  {/* Amounts */}
                  <div style={{ display: 'flex', gap: 16, marginBottom: 12 }}>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Total</div>
                      <div style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>{formatCurrency(inv.grandTotal)}</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Paid</div>
                      <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--success)', fontWeight: 600, fontSize: 14 }}>{formatCurrency(inv.paidAmount)}</div>
                    </div>
                    {inv.dueAmount > 0 && (
                      <div>
                        <div style={{ fontSize: 10, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.5, fontWeight: 600 }}>Due</div>
                        <div style={{ fontFamily: 'var(--font-mono)', color: 'var(--danger)', fontWeight: 700, fontSize: 14 }}>{formatCurrency(inv.dueAmount)}</div>
                      </div>
                    )}
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: 8 }}>
                    <Link to={`/billing/${inv._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                      View Invoice
                    </Link>
                    {canEditBilling && (
                      <Link to={`/billing/edit/${inv._id}`} className="btn btn-secondary btn-sm" style={{ flex: 1, justifyContent: 'center' }}>
                        Edit
                      </Link>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </>
        )}

        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {/* Responsive CSS */}
      <style>{`
        .invoice-mobile-view  { display: none;  }
        .invoice-desktop-view { display: block; }

        @media (max-width: 768px) {
          .invoice-mobile-view  { display: block; }
          .invoice-desktop-view { display: none;  }
        }
      `}</style>
    </Layout>
  );
}