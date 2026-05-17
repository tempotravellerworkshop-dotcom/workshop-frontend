import React, { useEffect, useState } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import { formatCurrency } from '../utils/helpers';

const LIMIT = 15;

export default function LowStock() {
  const [allItems, setAllItems] = useState([]); // flat list of low-stock brand rows
  const [loading,  setLoading]  = useState(true);
  const [page,     setPage]     = useState(1);
  const [search,   setSearch]   = useState('');

  useEffect(() => {
    api.get('/stock/low-stock')
      .then((r) => {
        // Flatten: one row per brand that is low
        const flat = [];
        for (const p of r.data.data) {
          for (const b of p.brands) {
            if (b.isActive && b.stock <= p.lowStockAlert) {
              flat.push({ product: p, brand: b });
            }
          }
        }
        setAllItems(flat);
      })
      .finally(() => setLoading(false));
  }, []);

  // Client-side search + paginate
  const filtered = allItems.filter((row) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      row.product.name.toLowerCase().includes(q) ||
      (row.product.partNumber || '').toLowerCase().includes(q) ||
      row.brand.brandName.toLowerCase().includes(q) ||
      row.product.category.toLowerCase().includes(q)
    );
  });

  const pages   = Math.ceil(filtered.length / LIMIT);
  const paginated = filtered.slice((page - 1) * LIMIT, page * LIMIT);
  const outOfStock = filtered.filter((r) => r.brand.stock === 0).length;

  return (
    <Layout title="Low Stock Alert">
      <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(4, 1fr)', marginBottom: 20 }}>
        <div className="stat-card danger">
          <div className="stat-label">Low Stock Items</div>
          <div className="stat-value">{filtered.length}</div>
          <div className="stat-sub">Need restocking</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-label">Out of Stock</div>
          <div className="stat-value">{outOfStock}</div>
          <div className="stat-sub">Zero qty</div>
        </div>
        <div className="stat-card warning">
          <div className="stat-label">Critical (1–2 left)</div>
          <div className="stat-value">{filtered.filter((r) => r.brand.stock > 0 && r.brand.stock <= 2).length}</div>
          <div className="stat-sub">Urgent</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Total Items</div>
          <div className="stat-value">{allItems.length}</div>
          <div className="stat-sub">All low stock</div>
        </div>
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Low Stock Products ({filtered.length})</span>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              className="form-control"
              style={{ width: 220 }}
              placeholder="Filter by name, brand..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : paginated.length === 0 ? (
            <div className="empty-state" style={{ padding: 50 }}>
              <h3>{search ? 'No results for your search' : 'All stock levels are normal'}</h3>
              <p>{search ? 'Try a different keyword.' : 'No products are below the low stock threshold.'}</p>
            </div>
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
                  <th className="text-right">Current Stock</th>
                  <th className="text-right">Alert Threshold</th>
                  <th className="text-right">MRP</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {paginated.map(({ product: p, brand: b }, i) => (
                  <tr key={`${p._id}-${b._id}`}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>
                      {(page - 1) * LIMIT + i + 1}
                    </td>
                    <td>
                      <div style={{ fontWeight: 600 }}>{p.name}</div>
                      {p.partNumber && (
                        <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>
                          {p.partNumber}
                        </div>
                      )}
                    </td>
                    <td><span className="badge badge-default">{p.category}</span></td>
                    <td>
                      {p.shelfRow || p.shelfNumber ? (
                        <span style={{
                          background: 'var(--primary)', color: '#fff',
                          padding: '2px 10px', borderRadius: 12,
                          fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
                        }}>
                          {p.shelfRow && `R${p.shelfRow}`}{p.shelfRow && p.shelfNumber && '-'}{p.shelfNumber && `S${p.shelfNumber}`}
                        </span>
                      ) : <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>}
                    </td>
                    <td style={{ fontWeight: 500 }}>{b.brandName}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{b.partNumber || '—'}</td>
                    <td className="text-right">
                      <span style={{
                        fontWeight: 700, fontSize: 18,
                        color: b.stock === 0 ? 'var(--danger)' : 'var(--warning)',
                      }}>
                        {b.stock}
                      </span>
                    </td>
                    <td className="text-right" style={{ color: 'var(--text-muted)' }}>{p.lowStockAlert}</td>
                    <td className="text-right font-mono">{formatCurrency(b.mrp)}</td>
                    <td>
                      <span className={`badge badge-${b.stock === 0 ? 'danger' : 'warning'}`}>
                        {b.stock === 0 ? 'Out of Stock' : 'Low Stock'}
                      </span>
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
