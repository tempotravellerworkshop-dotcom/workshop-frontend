import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { formatDate } from '../utils/helpers';

const LIMIT = 15;

export default function StockAdjustment() {
  const [products,         setProducts]         = useState([]);
  const [logs,             setLogs]             = useState([]);
  const [logsTotal,        setLogsTotal]        = useState(0);
  const [logsPage,         setLogsPage]         = useState(1);
  const [logsLoading,      setLogsLoading]      = useState(false);
  const [typeFilter,       setTypeFilter]       = useState('');
  const [formLoading,      setFormLoading]      = useState(false);
  const [success,          setSuccess]          = useState('');
  const [error,            setError]            = useState('');
  const [search,           setSearch]           = useState('');
  const [selectedProduct,  setSelectedProduct]  = useState(null);
  const [form, setForm] = useState({ productId: '', brandVariantId: '', type: 'stock-in', quantity: '', note: '' });

  const fetchLogs = useCallback(async () => {
    setLogsLoading(true);
    try {
      const params = new URLSearchParams({ page: logsPage, limit: LIMIT });
      if (typeFilter) params.append('type', typeFilter);
      const res = await api.get(`/stock/logs?${params}`);
      setLogs(res.data.data);
      setLogsTotal(res.data.total || 0);
    } finally { setLogsLoading(false); }
  }, [logsPage, typeFilter]);

  useEffect(() => { fetchLogs(); }, [fetchLogs]);

  // Product search
  useEffect(() => {
    if (search.length < 2) { setProducts([]); return; }
    const t = setTimeout(async () => {
      const res = await api.get(`/products/search?q=${search}`);
      setProducts(res.data.data);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const selectProduct = (p) => {
    setSelectedProduct(p);
    setForm((f) => ({ ...f, productId: p._id, brandVariantId: p.brands[0]?._id || '' }));
    setSearch(p.name);
    setProducts([]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setSuccess('');
    setFormLoading(true);
    try {
      await api.post('/stock/adjust', { ...form, quantity: Number(form.quantity) });
      setSuccess(`Stock updated successfully for ${selectedProduct?.name}`);
      setForm({ productId: '', brandVariantId: '', type: 'stock-in', quantity: '', note: '' });
      setSelectedProduct(null);
      setSearch('');
      fetchLogs();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update stock');
    } finally { setFormLoading(false); }
  };

  const logsPages = Math.ceil(logsTotal / LIMIT);

  const typeColors = {
    'stock-in':   { bg: 'var(--success-bg)', color: 'var(--success)' },
    'stock-out':  { bg: 'var(--danger-bg)',  color: 'var(--danger)'  },
    'sale':       { bg: 'var(--info-bg)',    color: 'var(--info)'    },
    'adjustment': { bg: 'var(--warning-bg)', color: 'var(--warning)' },
    'return':     { bg: 'var(--success-bg)', color: 'var(--success)' },
  };

  return (
    <Layout title="Stock Adjustment">
      <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: 20, alignItems: 'start' }}>

        {/* ── FORM ── */}
        <div className="card">
          <div className="card-header"><span className="card-title">Adjust Stock</span></div>
          <div className="card-body">
            {success && <div className="alert alert-success">{success}</div>}
            {error   && <div className="alert alert-danger">{error}</div>}

            <form onSubmit={handleSubmit}>
              {/* Product search */}
              <div className="form-group" style={{ position: 'relative' }}>
                <label className="form-label">Search Product</label>
                <input
                  className="form-control"
                  value={search}
                  onChange={(e) => { setSearch(e.target.value); setSelectedProduct(null); }}
                  placeholder="Type product name or part no..."
                  autoComplete="off"
                />
                {products.length > 0 && (
                  <div style={{
                    position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                    background: 'var(--surface)', border: '1.5px solid var(--border)',
                    borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                    maxHeight: 240, overflowY: 'auto',
                  }}>
                    {products.map((p) => (
                      <div
                        key={p._id}
                        className="search-dropdown-item"
                        onClick={() => selectProduct(p)}
                      >
                        <div className="item-name">{p.name}</div>
                        <div className="item-meta">
                          {p.category}
                          {p.partNumber ? ` · ${p.partNumber}` : ''}
                          {(p.shelfRow || p.shelfNumber) ? ` · R${p.shelfRow || '?'}-S${p.shelfNumber || '?'}` : ''}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Brand selector */}
              {selectedProduct && (
                <div className="form-group">
                  <label className="form-label">Brand Variant</label>
                  <select
                    className="form-control"
                    value={form.brandVariantId}
                    onChange={(e) => setForm((f) => ({ ...f, brandVariantId: e.target.value }))}
                  >
                    {selectedProduct.brands.map((b) => (
                      <option key={b._id} value={b._id}>
                        {b.brandName} — Current Stock: {b.stock}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="form-group">
                <label className="form-label">Adjustment Type</label>
                <select
                  className="form-control"
                  value={form.type}
                  onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
                >
                  <option value="stock-in">Stock In (Add quantity)</option>
                  <option value="stock-out">Stock Out (Remove quantity)</option>
                  <option value="adjustment">Set Exact Quantity</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">
                  {form.type === 'adjustment' ? 'New Exact Quantity' : 'Quantity'}
                </label>
                <input
                  className="form-control"
                  type="number"
                  min={0}
                  value={form.quantity}
                  onChange={(e) => setForm((f) => ({ ...f, quantity: e.target.value }))}
                  required
                  placeholder={form.type === 'adjustment' ? 'Enter new total stock' : 'Enter qty to add/remove'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Note / Reason</label>
                <input
                  className="form-control"
                  value={form.note}
                  onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
                  placeholder="Purchase from supplier, damage, audit..."
                />
              </div>

              <button
                type="submit"
                className="btn btn-primary"
                disabled={formLoading || !form.productId || !form.quantity}
                style={{ width: '100%', justifyContent: 'center' }}
              >
                {formLoading ? 'Updating...' : 'Update Stock'}
              </button>
            </form>
          </div>
        </div>

        {/* ── LOGS TABLE ── */}
        <div className="card">
          <div className="card-header">
            <span className="card-title">Stock Movement History ({logsTotal})</span>
            <select
              className="form-control"
              style={{ width: 160 }}
              value={typeFilter}
              onChange={(e) => { setTypeFilter(e.target.value); setLogsPage(1); }}
            >
              <option value="">All Types</option>
              <option value="stock-in">Stock In</option>
              <option value="stock-out">Stock Out</option>
              <option value="sale">Sale</option>
              <option value="adjustment">Adjustment</option>
              <option value="return">Return</option>
            </select>
          </div>
          <div className="table-container">
            {logsLoading ? (
              <div className="loading"><div className="spinner" /></div>
            ) : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Date</th>
                    <th>Product</th>
                    <th>Brand</th>
                    <th>Type</th>
                    <th className="text-right">Change</th>
                    <th className="text-right">Before</th>
                    <th className="text-right">After</th>
                    <th>Reference / Note</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 && (
                    <tr>
                      <td colSpan={9} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                        No stock movements yet
                      </td>
                    </tr>
                  )}
                  {logs.map((log, i) => {
                    const tc = typeColors[log.type] || { bg: 'var(--bg)', color: 'var(--text-muted)' };
                    return (
                      <tr key={log._id}>
                        <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                          {(logsPage - 1) * LIMIT + i + 1}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', whiteSpace: 'nowrap' }}>
                          {formatDate(log.createdAt)}
                        </td>
                        <td style={{ fontWeight: 500 }}>{log.product?.name}</td>
                        <td style={{ fontSize: 12 }}>{log.brandName}</td>
                        <td>
                          <span style={{
                            display: 'inline-block',
                            padding: '2px 10px', borderRadius: 12,
                            fontSize: 11, fontWeight: 600,
                            background: tc.bg, color: tc.color,
                          }}>
                            {log.type}
                          </span>
                        </td>
                        <td className="text-right">
                          <span style={{
                            fontWeight: 700, fontSize: 14,
                            color: log.quantity > 0 ? 'var(--success)' : 'var(--danger)',
                            fontFamily: 'var(--font-mono)',
                          }}>
                            {log.quantity > 0 ? '+' : ''}{log.quantity}
                          </span>
                        </td>
                        <td className="text-right font-mono" style={{ color: 'var(--text-muted)' }}>
                          {log.previousStock}
                        </td>
                        <td className="text-right font-mono" style={{ fontWeight: 600 }}>
                          {log.newStock}
                        </td>
                        <td style={{ fontSize: 12, color: 'var(--text-muted)', maxWidth: 180 }}>
                          {log.reference && (
                            <span style={{ fontFamily: 'var(--font-mono)', marginRight: 6 }}>{log.reference}</span>
                          )}
                          {log.note}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
          <Pagination page={logsPage} pages={logsPages} onPage={setLogsPage} />
        </div>
      </div>
    </Layout>
  );
}
