import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';

const LIMIT = 15;

export default function StockReport() {
  const [allData,  setAllData]  = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [search,   setSearch]   = useState('');
  const [category, setCategory] = useState('');
  const [filter,   setFilter]   = useState('all'); // all | low | out
  const [page,     setPage]     = useState(1);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    api.get('/reports/stock').then((r) => setAllData(r.data.data)).finally(() => setLoading(false));
    api.get('/products/categories').then((r) => setCategories(r.data.data)).catch(() => {});
  }, []);

  // Flatten: one row per brand variant
  const flat = [];
  for (const p of allData) {
    for (const b of p.brands) {
      flat.push({ product: p, brand: b });
    }
  }

  const filtered = flat.filter(({ product: p, brand: b }) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !p.name.toLowerCase().includes(q) &&
        !(p.partNumber || '').toLowerCase().includes(q) &&
        !b.brandName.toLowerCase().includes(q) &&
        !p.category.toLowerCase().includes(q)
      ) return false;
    }
    if (category && p.category !== category) return false;
    if (filter === 'low') return b.stock > 0 && b.stock <= p.lowStockAlert;
    if (filter === 'out') return b.stock === 0;
    return true;
  });

  const pages     = Math.ceil(filtered.length / LIMIT);
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);

  const totalValue   = filtered.reduce((s, { brand: b }) => s + b.stockValue, 0);
  const outOfStock   = filtered.filter(({ brand: b }) => b.stock === 0).length;
  const lowStock     = filtered.filter(({ brand: b, product: p }) => b.stock > 0 && b.stock <= p.lowStockAlert).length;

  return (
    <Layout title="Stock Report">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card">
          <div className="stat-label">Total Variants</div>
          <div className="stat-value">{flat.length}</div>
          <div className="stat-sub">Brand variants</div>
        </div>
        <div className="stat-card primary">
          <div className="stat-label">Stock Value</div>
          <div className="stat-value" style={{ fontSize: 18 }}>{formatCurrency(totalValue)}</div>
          <div className="stat-sub">MRP × Qty</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Low Stock</div>
          <div className="stat-value">{lowStock}</div>
          <div className="stat-sub">Need restocking</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value">{outOfStock}</div>
          <div className="stat-sub">Zero qty</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Stock Valuation ({filtered.length} variants)</span>
        </div>

        {/* Filters */}
        <div style={{ padding: '12px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 10, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <input
            className="form-control"
            style={{ width: 240 }}
            placeholder="Search product, brand, part no..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
          <select className="form-control" style={{ width: 170 }} value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          {['all', 'low', 'out'].map((f) => (
            <button
              key={f}
              className={`btn btn-sm ${filter === f ? 'btn-primary' : 'btn-secondary'}`}
              onClick={() => { setFilter(f); setPage(1); }}
            >
              {f === 'all' ? 'All' : f === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Shelf</th>
                  <th>Brand</th>
                  <th>Part Number</th>
                  <th className="text-right">Stock Qty</th>
                  <th className="text-right">MRP</th>
                  <th className="text-right">Stock Value</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.length === 0 && (
                  <tr>
                    <td colSpan={10} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>
                      No data found
                    </td>
                  </tr>
                )}
                {paginated.map(({ product: p, brand: b }, i) => (
                  <tr key={`${p._id}-${b._id || i}`}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.partNumber && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{p.partNumber}</div>
                      )}
                    </td>
                    <td><span className="badge badge-default">{p.category}</span></td>
                    <td>
                      {p.shelfRow || p.shelfNumber ? (
                        <span style={{ background: 'var(--primary)', color: '#fff', padding: '2px 9px', borderRadius: 12, fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700 }}>
                          {p.shelfRow && `R${p.shelfRow}`}{p.shelfRow && p.shelfNumber && '-'}{p.shelfNumber && `S${p.shelfNumber}`}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.brandName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>{b.partNumber || '—'}</td>
                    <td className="text-right">
                      <span style={{
                        fontWeight: 700, fontSize: 16,
                        color: b.stock === 0 ? 'var(--danger)' : b.isLow ? 'var(--warning)' : 'var(--success)',
                      }}>
                        {b.stock}
                      </span>
                    </td>
                    <td className="text-right font-mono">{formatCurrency(b.mrp)}</td>
                    <td className="text-right font-mono" style={{ fontWeight: 600 }}>{formatCurrency(b.stockValue)}</td>
                    <td>
                      <span className={`badge badge-${b.stock === 0 ? 'danger' : b.isLow ? 'warning' : 'success'}`}>
                        {b.stock === 0 ? 'Out of Stock' : b.isLow ? 'Low Stock' : 'OK'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
              {paginated.length > 0 && (
                <tfoot>
                  <tr style={{ background: 'var(--surface-2)', fontWeight: 700 }}>
                    <td colSpan={8} style={{ padding: '11px 14px' }}>PAGE TOTAL</td>
                    <td className="text-right font-mono">
                      {formatCurrency(paginated.reduce((s, { brand: b }) => s + b.stockValue, 0))}
                    </td>
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
