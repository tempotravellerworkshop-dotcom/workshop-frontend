import React, { useState, useEffect } from 'react';
import api from '../../services/api';

const EMPTY_BRAND  = { brandName: '', partNumber: '', mrp: '', purchasePrice: '', stock: 0 };
const UNITS        = ['NOS', 'PCS', 'SET', 'KG', 'LTR', 'MTR', 'BOX', 'PAIR'];
const GST_OPTIONS  = [0, 5, 12, 18, 28];

export default function ProductModal({ product, onClose, onSave }) {
  const isEdit = !!product;

  const [form, setForm] = useState({
    name: '', subName: '', partNumber: '', description: '', category: '', hsnCode: '',
    unit: 'NOS', gstPercent: 18,
    vehicleCompatibility: '', keywords: '',
    lowStockAlert: 5,
    shelfRow: '', shelfNumber: '', shelfNote: '',
    brands: [{ ...EMPTY_BRAND }],
  });

  const [existingRows,    setExistingRows]    = useState([]);
  const [showRowSuggest,  setShowRowSuggest]  = useState(false);
  const [loading,  setLoading]  = useState(false);
  const [error,    setError]    = useState('');

  useEffect(() => {
    api.get('/products/shelf-rows')
      .then((r) => setExistingRows(r.data.data || []))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (product) {
      setForm({
        ...product,
        subName: product.subName || '',
        vehicleCompatibility: (product.vehicleCompatibility || []).join(', '),
        keywords:  (product.keywords || []).join(', '),
        shelfRow:    product.shelfRow    || '',
        shelfNumber: product.shelfNumber || '',
        shelfNote:   product.shelfNote   || '',
        brands: product.brands?.length ? product.brands : [{ ...EMPTY_BRAND }],
      });
    }
  }, [product]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setBrand = (idx, k, v) => {
    const brands = [...form.brands];
    brands[idx]  = { ...brands[idx], [k]: v };
    setForm((f) => ({ ...f, brands }));
  };

  const addBrand    = () => setForm((f) => ({ ...f, brands: [...f.brands, { ...EMPTY_BRAND }] }));
  const removeBrand = (idx) => setForm((f) => ({ ...f, brands: f.brands.filter((_, i) => i !== idx) }));

  const rowSuggestions = existingRows.filter((r) =>
    r.toLowerCase().includes(form.shelfRow.toLowerCase()) && r !== form.shelfRow
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      const payload = {
        ...form,
        shelfRow: form.shelfRow.toUpperCase().trim(),
        vehicleCompatibility: form.vehicleCompatibility.split(',').map((s) => s.trim()).filter(Boolean),
        keywords: form.keywords.split(',').map((s) => s.trim().toLowerCase()).filter(Boolean),
        brands: form.brands.map((b) => ({
          ...b,
          mrp:           Number(b.mrp)           || 0,
          purchasePrice: Number(b.purchasePrice) || 0,
          stock:         Number(b.stock)         || 0,
        })),
      };
      if (isEdit) await api.put(`/products/${product._id}`, payload);
      else        await api.post('/products', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save product');
    } finally { setLoading(false); }
  };

  const SectionLabel = ({ children }) => (
    <div style={{
      fontWeight: 700, fontSize: 11, color: 'var(--primary)',
      textTransform: 'uppercase', letterSpacing: 1,
      margin: '4px 0 14px', paddingBottom: 6,
      borderBottom: '2px solid var(--border)',
    }}>
      {children}
    </div>
  );

  const locationTag = [
    form.shelfRow    ? `Row ${form.shelfRow.toUpperCase()}`   : '',
    form.shelfNumber ? `Shelf ${form.shelfNumber}` : '',
  ].filter(Boolean).join(' — ');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? 'Edit Product' : 'Add New Product'}</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            {/* ── PRODUCT DETAILS ── */}
            <SectionLabel>Product Details</SectionLabel>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Product Name *</label>
                <input className="form-control" value={form.name} onChange={(e) => setField('name', e.target.value)} required />
              </div>
              <div className="form-group">
                <label className="form-label">
                  Sub - Name
                  <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                    (used for mechanic search)
                  </span>
                </label>
                <input
                  className="form-control"
                  value={form.subName}
                  onChange={(e) => setField('subName', e.target.value)}
                  placeholder="e.g. kaali seal, pump wala filter..."
                />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Category *</label>
                <input className="form-control" value={form.category} onChange={(e) => setField('category', e.target.value)}  placeholder="Filters, Bearings..." />
              </div>
              <div className="form-group">
                <label className="form-label">Part Number</label>
                <input className="form-control" value={form.partNumber} onChange={(e) => setField('partNumber', e.target.value)} />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">HSN Code</label>
                <input className="form-control" value={form.hsnCode} onChange={(e) => setField('hsnCode', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Unit</label>
                <select className="form-control" value={form.unit} onChange={(e) => setField('unit', e.target.value)}>
                  {UNITS.map((u) => <option key={u}>{u}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">GST %</label>
                <select className="form-control" value={form.gstPercent} onChange={(e) => setField('gstPercent', Number(e.target.value))}>
                  {GST_OPTIONS.map((g) => <option key={g}>{g}</option>)}
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Vehicle Compatibility (comma separated)</label>
                <input className="form-control" value={form.vehicleCompatibility} onChange={(e) => setField('vehicleCompatibility', e.target.value)} placeholder="Force3, Tata Ace..." />
              </div>
              <div className="form-group">
                <label className="form-label">Search Keywords (comma separated)</label>
                <input className="form-control" value={form.keywords} onChange={(e) => setField('keywords', e.target.value)} placeholder="oil seal, axle seal..." />
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Description</label>
                <input className="form-control" value={form.description} onChange={(e) => setField('description', e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Low Stock Alert Qty</label>
                <input className="form-control" type="number" value={form.lowStockAlert} onChange={(e) => setField('lowStockAlert', Number(e.target.value))} min={0} />
              </div>
            </div>

            {/* ── SHELF LOCATION ── */}
            <div className="divider" />
            <SectionLabel>Shelf / Row Location</SectionLabel>

            <div style={{ background: 'var(--surface-2)', border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: 16, marginBottom: 16 }}>
              <div className="form-row" style={{ alignItems: 'flex-start' }}>

                <div className="form-group" style={{ margin: 0, position: 'relative' }}>
                  <label className="form-label">
                    Row / Rack
                    {existingRows.length > 0 && (
                      <span style={{ marginLeft: 6, fontSize: 10, color: 'var(--text-muted)', fontWeight: 400, textTransform: 'none' }}>
                        (existing: {existingRows.join(', ')})
                      </span>
                    )}
                  </label>
                  <input
                    className="form-control"
                    value={form.shelfRow}
                    onChange={(e) => { setField('shelfRow', e.target.value.toUpperCase()); setShowRowSuggest(true); }}
                    onBlur={() => setTimeout(() => setShowRowSuggest(false), 150)}
                    onFocus={() => setShowRowSuggest(true)}
                    placeholder="Type row name, e.g. A, B, C1..."
                    style={{ textTransform: 'uppercase' }}
                  />
                  {showRowSuggest && (form.shelfRow === '' ? existingRows : rowSuggestions).length > 0 && (
                    <div style={{
                      position: 'absolute', top: '100%', left: 0, right: 0, zIndex: 200,
                      background: 'var(--surface)', border: '1.5px solid var(--border)',
                      borderRadius: 'var(--radius)', boxShadow: 'var(--shadow-md)',
                      maxHeight: 180, overflowY: 'auto',
                    }}>
                      {form.shelfRow && !existingRows.includes(form.shelfRow) && (
                        <div
                          onClick={() => { setField('shelfRow', form.shelfRow); setShowRowSuggest(false); }}
                          style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}
                        >
                          <span style={{ background: 'var(--accent)', color: '#fff', fontSize: 10, padding: '2px 8px', borderRadius: 10, fontWeight: 700 }}>NEW</span>
                          <span style={{ fontWeight: 600 }}>Create Row "{form.shelfRow}"</span>
                        </div>
                      )}
                      {(form.shelfRow === '' ? existingRows : rowSuggestions).map((r) => (
                        <div
                          key={r}
                          onClick={() => { setField('shelfRow', r); setShowRowSuggest(false); }}
                          style={{ padding: '9px 14px', cursor: 'pointer', borderBottom: '1px solid var(--border-light)', display: 'flex', alignItems: 'center', gap: 8 }}
                          onMouseEnter={(e) => e.currentTarget.style.background = 'var(--surface-hover)'}
                          onMouseLeave={(e) => e.currentTarget.style.background = ''}
                        >
                          <span style={{
                            background: 'var(--primary)', color: '#fff',
                            width: 28, height: 28, borderRadius: 6,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontFamily: 'var(--font-mono)', fontWeight: 700, fontSize: 13,
                            flexShrink: 0,
                          }}>
                            {r}
                          </span>
                          <span>Row {r}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Shelf / Box Number</label>
                  <input
                    className="form-control"
                    value={form.shelfNumber}
                    onChange={(e) => setField('shelfNumber', e.target.value)}
                    placeholder="e.g. 1, 2, 12, 4B"
                  />
                </div>

                <div className="form-group" style={{ margin: 0 }}>
                  <label className="form-label">Location Note</label>
                  <input
                    className="form-control"
                    value={form.shelfNote}
                    onChange={(e) => setField('shelfNote', e.target.value)}
                    placeholder="Top shelf, left corner..."
                  />
                </div>
              </div>

              {locationTag && (
                <div style={{ marginTop: 14, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Location:</span>
                  <span style={{
                    background: 'var(--primary)', color: '#fff',
                    padding: '5px 16px', borderRadius: 20,
                    fontFamily: 'var(--font-mono)', fontSize: 13, fontWeight: 700, letterSpacing: 1,
                  }}>
                    {locationTag}
                  </span>
                  {form.shelfNote && (
                    <span style={{ fontSize: 12, color: 'var(--text-secondary)' }}>({form.shelfNote})</span>
                  )}
                  {!existingRows.includes(form.shelfRow) && form.shelfRow && (
                    <span style={{ fontSize: 11, color: 'var(--accent)', fontWeight: 600 }}>
                      New row will be created
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* ── BRAND VARIANTS ── */}
            <div className="divider" />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <SectionLabel>Brand Variants</SectionLabel>
              <button type="button" className="btn btn-secondary btn-sm" onClick={addBrand} style={{ marginTop: -14 }}>
                + Add Brand
              </button>
            </div>

            {form.brands.map((brand, idx) => (
              <div key={idx} style={{ background: 'var(--surface-2)', borderRadius: 'var(--radius)', padding: 14, marginBottom: 10, border: '1px solid var(--border)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10, alignItems: 'center' }}>
                  <span style={{ fontWeight: 600, fontSize: 12, color: 'var(--text-secondary)' }}>Brand #{idx + 1}</span>
                  {form.brands.length > 1 && (
                    <button type="button" className="btn btn-danger btn-sm" onClick={() => removeBrand(idx)}>Remove</button>
                  )}
                </div>
                <div className="form-row">
                  <div className="form-group">
                    <label className="form-label">Brand Name *</label>
                    <input className="form-control" value={brand.brandName} onChange={(e) => setBrand(idx, 'brandName', e.target.value)} required placeholder="OEM / Bosch / Local" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Brand Part No</label>
                    <input className="form-control" value={brand.partNumber} onChange={(e) => setBrand(idx, 'partNumber', e.target.value)} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">MRP / Sale Price *</label>
                    <input className="form-control" type="number" value={brand.mrp} onChange={(e) => setBrand(idx, 'mrp', e.target.value)} required min={0} step={0.01} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Purchase Price</label>
                    <input className="form-control" type="number" value={brand.purchasePrice} onChange={(e) => setBrand(idx, 'purchasePrice', e.target.value)} min={0} step={0.01} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Opening Stock</label>
                    <input className="form-control" type="number" value={brand.stock} onChange={(e) => setBrand(idx, 'stock', e.target.value)} min={0} />
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : isEdit ? 'Update Product' : 'Create Product'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}