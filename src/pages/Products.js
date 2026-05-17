import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import ProductModal from '../components/inventory/ProductModal';
import usePermission from '../hooks/usePermission';
import { formatCurrency } from '../utils/helpers';

/* ── Shelf Tag pill ─────────────────────────────────────────────────── */
const ShelfTag = ({ row, number }) => {
  if (!row && !number) return <span style={{ color: 'var(--text-muted)', fontSize: 11 }}>—</span>;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 2,
      background: 'var(--primary)', color: '#fff',
      padding: '3px 10px', borderRadius: 20,
      fontFamily: 'var(--font-mono)', fontSize: 11, fontWeight: 700,
      letterSpacing: 0.5,
    }}>
      {row && `R${row}`}{row && number && ' · '}{number && `S${number}`}
    </span>
  );
};

/* ── Brand stock chip ───────────────────────────────────────────────── */
const StockChip = ({ stock, lowAlert }) => {
  const isOut = stock === 0;
  const isLow = !isOut && stock <= lowAlert;
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      minWidth: 32, padding: '2px 8px', borderRadius: 8, fontWeight: 700,
      fontSize: 12, fontFamily: 'var(--font-mono)',
      background: isOut ? 'var(--danger-bg)' : isLow ? 'var(--warning-bg)' : 'var(--success-bg)',
      color:      isOut ? 'var(--danger)'    : isLow ? 'var(--warning)'    : 'var(--success)',
      border: `1px solid ${isOut ? '#fca5a5' : isLow ? '#fcd34d' : '#86efac'}`,
    }}>
      {stock}
    </span>
  );
};

/* ── Shelf Map modal ────────────────────────────────────────────────── */
function ShelfMapView({ onClose }) {
  const [map,      setMap]      = useState({});
  const [loading,  setLoading]  = useState(true);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    api.get('/products/shelf-map').then((r) => setMap(r.data.data)).finally(() => setLoading(false));
  }, []);

  const rows = Object.keys(map).sort();

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-xl" onClick={(e) => e.stopPropagation()} style={{ maxHeight: '88vh' }}>
        <div className="modal-header">
          <span className="modal-title">Shelf Map</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
        <div style={{ padding: 0, display: 'flex', height: 520 }}>
          {loading ? <div className="loading" style={{ flex: 1 }}><div className="spinner" /></div> : rows.length === 0 ? (
            <div className="empty-state" style={{ flex: 1, padding: 40 }}>
              <h3>No shelf locations assigned yet</h3>
            </div>
          ) : (
            <>
              <div style={{ width: 160, borderRight: '1px solid var(--border)', overflowY: 'auto', background: 'var(--surface-2)', flexShrink: 0 }}>
                <div style={{ padding: '10px 14px', fontSize: 10, fontWeight: 700, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 0.8, borderBottom: '1px solid var(--border)' }}>
                  Rows ({rows.length})
                </div>
                {rows.map((row) => {
                  const count  = Object.values(map[row]).reduce((s, items) => s + items.length, 0);
                  const active = selected?.row === row;
                  return (
                    <div key={row} onClick={() => setSelected({ row })} style={{
                      padding: '11px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)',
                      background: active ? 'var(--primary)' : '', color: active ? '#fff' : 'var(--text-primary)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center', transition: 'all 0.12s',
                    }}>
                      <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 15 }}>Row {row}</span>
                      <span style={{ fontSize: 11, fontWeight: 600, background: active ? 'rgba(255,255,255,0.2)' : 'var(--bg)', padding: '1px 7px', borderRadius: 10, color: active ? '#fff' : 'var(--text-muted)' }}>
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
              <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
                {!selected ? (
                  <div style={{ color: 'var(--text-muted)', textAlign: 'center', marginTop: 60 }}>Select a row to view shelves</div>
                ) : (
                  <>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 16, color: 'var(--primary)' }}>Row {selected.row}</div>
                    {Object.keys(map[selected.row]).sort().map((shelf) => (
                      <div key={shelf} style={{ marginBottom: 14, border: '1px solid var(--border)', borderRadius: 'var(--radius)', overflow: 'hidden' }}>
                        <div style={{ padding: '8px 14px', background: 'var(--surface-2)', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 10 }}>
                          <ShelfTag row={selected.row} number={shelf} />
                          <span style={{ fontWeight: 600 }}>Shelf {shelf}</span>
                          <span style={{ fontSize: 12, color: 'var(--text-muted)', marginLeft: 'auto' }}>{map[selected.row][shelf].length} products</span>
                        </div>
                        {map[selected.row][shelf].map((item) => (
                          <div key={item._id} style={{ padding: '9px 14px', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 12 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontWeight: 600, fontSize: 13 }}>{item.name}</div>
                              {/* subName in shelf map */}
                              {item.subName && (
                                <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 1 }}>
                                  {item.subName}
                                </div>
                              )}
                              {item.partNumber && <div style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)' }}>{item.partNumber}</div>}
                              <div style={{ display: 'flex', gap: 5, marginTop: 4, flexWrap: 'wrap' }}>
                                {item.brands.map((b, bi) => (
                                  <span key={bi} style={{ fontSize: 11, background: 'var(--bg)', border: '1px solid var(--border)', padding: '1px 8px', borderRadius: 8 }}>
                                    {b.brandName}: <strong>{b.stock}</strong>
                                  </span>
                                ))}
                              </div>
                            </div>
                            <StockChip stock={item.totalStock} lowAlert={item.lowStockAlert} />
                          </div>
                        ))}
                      </div>
                    ))}
                  </>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Main Products Page ──────────────────────────────────────────────── */
const LIMIT = 20;

export default function Products() {
  const [products,    setProducts]    = useState([]);
  const [total,       setTotal]       = useState(0);
  const [loading,     setLoading]     = useState(true);
  const [search,      setSearch]      = useState('');
  const [category,    setCategory]    = useState('');
  const [shelfRow,    setShelfRow]    = useState('');
  const [gstFilter,   setGstFilter]   = useState('');
  const [stockFilter, setStockFilter] = useState(''); // '' | 'low' | 'out'
  const [categories,  setCategories]  = useState([]);
  const [shelfRows,   setShelfRows]   = useState([]);
  const [page,        setPage]        = useState(1);
  const [showModal,   setShowModal]   = useState(false);
  const { canEdit } = usePermission();
  const canEditInventory = canEdit('inventory');
  const [showMap,     setShowMap]     = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search)   params.append('search',   search);
      if (category) params.append('category', category);
      if (shelfRow) params.append('shelfRow', shelfRow);
      if (stockFilter) params.append('lowStock', 'true');
      const res = await api.get(`/products?${params}`);

      let data = res.data.data;
      if (gstFilter) data = data.filter((p) => String(p.gstPercent) === gstFilter);
      if (stockFilter === 'out') data = data.filter((p) => p.brands.reduce((s, b) => s + b.stock, 0) === 0);

      setProducts(data);
      setTotal(res.data.total);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  }, [search, category, shelfRow, gstFilter, stockFilter, page]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);
  useEffect(() => {
    api.get('/products/categories').then((r) => setCategories(r.data.data)).catch(() => {});
    api.get('/products/shelf-rows').then((r) => setShelfRows(r.data.data)).catch(() => {});
  }, []);

  const handleSave = () => {
    setShowModal(false); setEditProduct(null); fetchProducts();
    api.get('/products/shelf-rows').then((r) => setShelfRows(r.data.data)).catch(() => {});
  };
  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    await api.delete(`/products/${id}`);
    fetchProducts();
  };

  const pages = Math.ceil(total / LIMIT);
  const activeFilters = [search, category, shelfRow, gstFilter, stockFilter].filter(Boolean).length;

  return (
    <Layout title="Products / Inventory">

      {/* ── FILTERS BAR ── */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 18 }}>
        <div style={{ display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', flex: 1, maxWidth: 340 }}>
            <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', fontSize: 14, pointerEvents: 'none' }}>
              &#128269;
            </span>
            <input
              className="form-control"
              placeholder="Search by name, sub-name, part no, shelf..."
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              style={{ paddingLeft: 34 }}
            />
          </div>
          <button className="btn btn-secondary" onClick={() => setShowMap(true)}>Shelf Map</button>
          {canEditInventory && (
            <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={() => { setEditProduct(null); setShowModal(true); }}>
              + Add Product
            </button>
          )}
        </div>

        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
          <select className="form-control" style={{ width: 160, height: 34, padding: '4px 10px', fontSize: 12 }}
            value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }}>
            <option value="">All Categories</option>
            {categories.map((c) => <option key={c} value={c}>{c}</option>)}
          </select>

          <select className="form-control" style={{ width: 130, height: 34, padding: '4px 10px', fontSize: 12 }}
            value={shelfRow} onChange={(e) => { setShelfRow(e.target.value); setPage(1); }}>
            <option value="">All Rows</option>
            {shelfRows.map((r) => <option key={r} value={r}>Row {r}</option>)}
          </select>

          <select className="form-control" style={{ width: 110, height: 34, padding: '4px 10px', fontSize: 12 }}
            value={gstFilter} onChange={(e) => { setGstFilter(e.target.value); setPage(1); }}>
            <option value="">All GST</option>
            {[0,5,12,18,28].map((g) => <option key={g} value={g}>GST {g}%</option>)}
          </select>

          {['', 'low', 'out'].map((s) => (
            <button key={s}
              className={`btn btn-sm ${stockFilter === s ? 'btn-primary' : 'btn-secondary'}`}
              style={{ height: 34 }}
              onClick={() => { setStockFilter(s); setPage(1); }}
            >
              {s === '' ? 'All Stock' : s === 'low' ? 'Low Stock' : 'Out of Stock'}
            </button>
          ))}

          {activeFilters > 0 && (
            <button className="btn btn-sm btn-secondary" style={{ height: 34, color: 'var(--danger)', borderColor: 'var(--danger)' }}
              onClick={() => { setSearch(''); setCategory(''); setShelfRow(''); setGstFilter(''); setStockFilter(''); setPage(1); }}>
              Clear ({activeFilters})
            </button>
          )}
        </div>
      </div>

      {/* ── TABLE CARD ── */}
      <div className="card">
        <div className="card-header">
          <span className="card-title">Products ({total})</span>
          {shelfRows.length > 0 && (
            <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
              Rows: {shelfRows.join(', ')}
            </span>
          )}
        </div>

        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : products.length === 0 ? (
            <div className="empty-state">
              <h3>No products found</h3>
              <p>Try adjusting your filters or add a new product.</p>
            </div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th style={{ width: 30 }}>#</th>
                  <th>Product Details</th>
                  <th>Category</th>
                  <th style={{ textAlign: 'center' }}>Shelf</th>
                  <th style={{ minWidth: 280 }}>Brands &amp; Stock</th>
                  <th className="text-right" style={{ width: 90 }}>Total Stock</th>
                  <th style={{ width: 60 }}>GST</th>
                  <th style={{ width: 100 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {products.map((p, idx) => {
                  const totalStock = p.brands.reduce((s, b) => s + (b.stock || 0), 0);
                  const isLow      = totalStock > 0 && totalStock <= p.lowStockAlert;
                  const isOut      = totalStock === 0;
                  return (
                    <tr key={p._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12, textAlign: 'center' }}>
                        {(page - 1) * LIMIT + idx + 1}
                      </td>

                      {/* Product details */}
                      <td>
                        <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.3 }}>
                          {p.name}
                        </div>
                        {/* subName shown below product name */}
                        {p.subName && (
                          <div style={{ fontSize: 11, color: 'var(--text-muted)', fontStyle: 'italic', marginTop: 2 }}>
                            {p.subName}
                          </div>
                        )}
                        <div style={{ display: 'flex', gap: 10, marginTop: 4, flexWrap: 'wrap' }}>
                          {p.partNumber && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                              {p.partNumber}
                            </span>
                          )}
                          {p.hsnCode && (
                            <span style={{ fontSize: 11, color: 'var(--text-muted)', fontFamily: 'var(--font-mono)', background: 'var(--bg)', padding: '1px 6px', borderRadius: 4 }}>
                              HSN: {p.hsnCode}
                            </span>
                          )}
                        </div>
                        {p.vehicleCompatibility?.length > 0 && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3 }}>
                            {p.vehicleCompatibility.join(', ')}
                          </div>
                        )}
                      </td>

                      {/* Category */}
                      <td>
                        <span className="badge badge-default" style={{ fontSize: 11 }}>{p.category}</span>
                      </td>

                      {/* Shelf */}
                      <td style={{ textAlign: 'center' }}>
                        <ShelfTag row={p.shelfRow} number={p.shelfNumber} />
                        {p.shelfNote && (
                          <div style={{ fontSize: 10, color: 'var(--text-muted)', marginTop: 3, maxWidth: 90, wordBreak: 'break-word' }}>
                            {p.shelfNote}
                          </div>
                        )}
                      </td>

                      {/* Brands & Stock */}
                      <td>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
                          {p.brands.map((b) => (
                            <div key={b._id} style={{
                              display: 'flex', alignItems: 'center',
                              background: 'var(--surface-2)', border: '1px solid var(--border)',
                              borderRadius: 8, padding: '5px 10px', gap: 0,
                            }}>
                              <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-primary)', minWidth: 80, flex: 1 }}>
                                {b.brandName}
                              </span>
                              <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px', flexShrink: 0 }} />
                              <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-secondary)', minWidth: 70, textAlign: 'right' }}>
                                {formatCurrency(b.mrp)}
                              </span>
                              <span style={{ width: 1, height: 16, background: 'var(--border)', margin: '0 8px', flexShrink: 0 }} />
                              <StockChip stock={b.stock} lowAlert={p.lowStockAlert} />
                            </div>
                          ))}
                        </div>
                      </td>

                      {/* Total Stock */}
                      <td className="text-right">
                        <div style={{
                          display: 'inline-flex', flexDirection: 'column', alignItems: 'center', gap: 3,
                          minWidth: 52, padding: '6px 10px', borderRadius: 10,
                          background: isOut ? 'var(--danger-bg)' : isLow ? 'var(--warning-bg)' : 'var(--success-bg)',
                          border: `1.5px solid ${isOut ? '#fca5a5' : isLow ? '#fcd34d' : '#86efac'}`,
                        }}>
                          <span style={{
                            fontWeight: 800, fontSize: 18, lineHeight: 1,
                            fontFamily: 'var(--font-mono)',
                            color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)',
                          }}>
                            {totalStock}
                          </span>
                          <span style={{ fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: 0.5,
                            color: isOut ? 'var(--danger)' : isLow ? 'var(--warning)' : 'var(--success)' }}>
                            {isOut ? 'OUT' : isLow ? 'LOW' : 'OK'}
                          </span>
                        </div>
                      </td>

                      {/* GST */}
                      <td>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, fontWeight: 600, color: 'var(--text-secondary)' }}>
                          {p.gstPercent}%
                        </span>
                      </td>

                      {/* Actions */}
                      <td>
                        <div style={{ display: 'flex', gap: 5 }}>
                          {canEditInventory && <button className="btn btn-secondary btn-sm" onClick={() => { setEditProduct(p); setShowModal(true); }}>Edit</button>}
                          {canEditInventory && <button className="btn btn-danger btn-sm" onClick={() => handleDelete(p._id)}>Del</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {showModal && canEditInventory && (
        <ProductModal
          product={editProduct}
          onClose={() => { setShowModal(false); setEditProduct(null); }}
          onSave={handleSave}
        />
      )}
      {showMap && <ShelfMapView onClose={() => setShowMap(false)} />}
    </Layout>
  );
}