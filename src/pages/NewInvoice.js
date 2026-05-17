import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import { formatCurrency, calcGST } from '../utils/helpers';

const PAYMENT_METHODS = ['cash', 'upi', 'card', 'bank', 'cheque', 'credit'];

const emptyInvoice = () => ({
  customerName: '', customerMobile: '', customerAddress: '',
  customerGstin: '', customerStateCode: '', customerId: '',
  billingType: 'gst', supplyType: 'intra', placeOfSupply: 'CHANDIGARH',
  vehicleModel: '', vehicleNumber: '', notes: '',
  paymentMethod: 'cash', paidAmount: '', items: [],
});

export default function NewInvoice() {
  const navigate    = useNavigate();
  const { id }      = useParams(); // for edit mode
  const isEdit      = !!id;

  const [settings,           setSettings]           = useState(null);
  const [customerSearch,     setCustomerSearch]      = useState('');
  const [customerSuggestions,setCustomerSuggestions] = useState([]);
  const [productQuery,       setProductQuery]        = useState('');
  const [productSuggestions, setProductSuggestions]  = useState([]);
  const [showProductDrop,    setShowProductDrop]     = useState(false);
  const [loading,            setLoading]             = useState(false);
  const [loadingEdit,        setLoadingEdit]         = useState(isEdit);
  const [error,              setError]               = useState('');
  const [invoice,            setInvoice]             = useState(emptyInvoice());

  useEffect(() => {
    api.get('/settings').then((r) => setSettings(r.data.data)).catch(() => {});
    if (isEdit) {
      api.get(`/invoices/${id}`).then((r) => {
        const d = r.data.data;
        setInvoice({
          customerName:    d.customerName    || '',
          customerMobile:  d.customerMobile  || '',
          customerAddress: d.customerAddress || '',
          customerGstin:   d.customerGstin   || '',
          customerStateCode: d.customerStateCode || '',
          customerId:      d.customer?._id   || d.customer || '',
          billingType:     d.billingType     || 'gst',
          supplyType:      d.supplyType      || 'intra',
          placeOfSupply:   d.placeOfSupply   || 'CHANDIGARH',
          vehicleModel:    d.vehicleModel    || '',
          vehicleNumber:   d.vehicleNumber   || '',
          notes:           d.notes           || '',
          paymentMethod:   d.payments?.[0]?.method || 'cash',
          paidAmount:      d.paidAmount      || '',
          items:           d.items           || [],
        });
        setCustomerSearch(d.customerName || '');
      }).finally(() => setLoadingEdit(false));
    }
  }, [id, isEdit]);

  // Customer search
  useEffect(() => {
    if (customerSearch.length < 2 || invoice.customerId) { setCustomerSuggestions([]); return; }
    const t = setTimeout(async () => {
      const res = await api.get(`/customers?search=${customerSearch}&limit=8`);
      setCustomerSuggestions(res.data.data);
    }, 300);
    return () => clearTimeout(t);
  }, [customerSearch, invoice.customerId]);

  // Product search
  useEffect(() => {
    if (productQuery.length < 1) { setProductSuggestions([]); setShowProductDrop(false); return; }
    const t = setTimeout(async () => {
      const res = await api.get(`/products/search?q=${productQuery}`);
      setProductSuggestions(res.data.data);
      setShowProductDrop(true);
    }, 250);
    return () => clearTimeout(t);
  }, [productQuery]);

  const selectCustomer = (cust) => {
    setInvoice((v) => ({
      ...v, customerId: cust._id, customerName: cust.name,
      customerMobile: cust.mobile || '', customerAddress: cust.address || '',
      customerGstin: cust.gstin || '', customerStateCode: cust.stateCode || '',
    }));
    setCustomerSearch(cust.name);
    setCustomerSuggestions([]);
  };

  const makeItem = (product, brandIdx = 0) => {
    const brand = product.brands[brandIdx];
    const rate  = brand?.mrp || 0;
    const taxable = rate;
    const gst   = calcGST(taxable, product.gstPercent, invoice.supplyType);
    return {
      product: product._id, productName: product.name,
      partNumber: brand?.partNumber || product.partNumber || '',
      hsnCode: product.hsnCode || '',
      brandVariantId: brand?._id, brandName: brand?.brandName || '',
      quantity: 1, unit: product.unit || 'NOS', rate, discount: 0,
      gstPercent: product.gstPercent, taxableValue: taxable,
      cgstPercent: invoice.supplyType === 'intra' ? product.gstPercent / 2 : 0,
      cgstAmount:  invoice.supplyType === 'intra' ? gst.cgst : 0,
      sgstPercent: invoice.supplyType === 'intra' ? product.gstPercent / 2 : 0,
      sgstAmount:  invoice.supplyType === 'intra' ? gst.sgst : 0,
      igstPercent: invoice.supplyType === 'inter' ? product.gstPercent : 0,
      igstAmount:  invoice.supplyType === 'inter' ? gst.igst : 0,
      totalAmount: taxable + gst.total,
      availableBrands: product.brands,
    };
  };

  const selectProduct = (product, brandIdx = 0) => {
    setInvoice((v) => ({ ...v, items: [...v.items, makeItem(product, brandIdx)] }));
    setProductQuery(''); setShowProductDrop(false);
  };

  const updateItem = useCallback((idx, field, value) => {
    setInvoice((v) => {
      const items = [...v.items];
      const item  = { ...items[idx], [field]: value };
      if (field === 'brandVariantId') {
        const brand = item.availableBrands?.find((b) => b._id === value);
        if (brand) { item.brandName = brand.brandName; item.rate = brand.mrp; }
      }
      const qty     = Number(item.quantity) || 1;
      const rate    = Number(item.rate) || 0;
      const disc    = Number(item.discount) || 0;
      item.taxableValue = (rate - disc) * qty;
      const gst     = calcGST(item.taxableValue, item.gstPercent, v.supplyType);
      item.cgstPercent  = v.supplyType === 'intra' ? item.gstPercent / 2 : 0;
      item.cgstAmount   = gst.cgst;
      item.sgstPercent  = v.supplyType === 'intra' ? item.gstPercent / 2 : 0;
      item.sgstAmount   = gst.sgst;
      item.igstPercent  = v.supplyType === 'inter' ? item.gstPercent : 0;
      item.igstAmount   = gst.igst;
      item.totalAmount  = item.taxableValue + gst.total;
      items[idx] = item;
      return { ...v, items };
    });
  }, []);

  const removeItem = (idx) => setInvoice((v) => ({ ...v, items: v.items.filter((_, i) => i !== idx) }));

  const totals = (() => {
    const taxableAmount = invoice.items.reduce((s, i) => s + Number(i.taxableValue), 0);
    const totalCgst     = invoice.items.reduce((s, i) => s + Number(i.cgstAmount || 0), 0);
    const totalSgst     = invoice.items.reduce((s, i) => s + Number(i.sgstAmount || 0), 0);
    const totalIgst     = invoice.items.reduce((s, i) => s + Number(i.igstAmount || 0), 0);
    const totalGst      = totalCgst + totalSgst + totalIgst;
    const grandTotal    = Math.round(taxableAmount + totalGst);
    const paid          = Number(invoice.paidAmount) || 0;
    return { taxableAmount, totalCgst, totalSgst, totalIgst, totalGst, grandTotal, paid, due: grandTotal - paid };
  })();

  const handleSubmit = async (asDraft = false) => {
    if (!invoice.customerName.trim()) { setError('Customer name is required'); return; }
    if (invoice.items.length === 0)   { setError('Add at least one item');     return; }
    setError(''); setLoading(true);
    try {
      const payload = {
        ...invoice,
        customer:      invoice.customerId || undefined,
        status:        asDraft ? 'draft' : 'final',
        ...totals,
        paidAmount:    totals.paid,
        dueAmount:     totals.due,
        paymentStatus: totals.due <= 0 ? 'paid' : totals.paid > 0 ? 'partial' : invoice.paymentMethod === 'credit' ? 'credit' : 'pending',
        payments:      totals.paid > 0 ? [{ amount: totals.paid, method: invoice.paymentMethod }] : [],
        items:         invoice.items.map(({ availableBrands, ...rest }) => rest),
      };
      let res;
      if (isEdit) res = await api.put(`/invoices/${id}`, payload);
      else        res = await api.post('/invoices', payload);
      navigate(`/billing/${res.data.data._id}`);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save invoice');
    } finally { setLoading(false); }
  };

  if (loadingEdit) return <Layout title="Invoice"><div className="loading"><div className="spinner" /></div></Layout>;

  return (
    <Layout title={isEdit ? 'Edit Invoice' : 'New Invoice'}>
      {error && <div className="alert alert-danger">{error}</div>}

      {/* Responsive grid */}
      {/* Responsive layout — CSS handles mobile stacking */}
      <div className="new-invoice-grid">

        {/* LEFT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Customer */}
          <div className="card">
            <div className="card-header"><span className="card-title">Customer Details</span></div>
            <div className="card-body">
              <div className="form-row">
                <div className="form-group" style={{ position: 'relative' }}>
                  <label className="form-label">Customer Name *</label>
                  <input className="form-control"
                    value={invoice.customerId ? invoice.customerName : customerSearch}
                    onChange={(e) => { setCustomerSearch(e.target.value); setInvoice((v) => ({ ...v, customerName: e.target.value, customerId: '' })); }}
                    placeholder="Type to search or enter name"
                  />
                  {customerSuggestions.length > 0 && (
                    <div className="search-dropdown">
                      {customerSuggestions.map((c) => (
                        <div key={c._id} className="search-dropdown-item" onClick={() => selectCustomer(c)}>
                          <div className="item-name">{c.name}</div>
                          <div className="item-meta">{c.mobile}{c.gstin ? ` | ${c.gstin}` : ''}</div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-control" value={invoice.customerMobile} onChange={(e) => setInvoice((v) => ({ ...v, customerMobile: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input className="form-control" value={invoice.customerGstin} onChange={(e) => setInvoice((v) => ({ ...v, customerGstin: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Address</label>
                  <input className="form-control" value={invoice.customerAddress} onChange={(e) => setInvoice((v) => ({ ...v, customerAddress: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle Model</label>
                  <input className="form-control" value={invoice.vehicleModel} onChange={(e) => setInvoice((v) => ({ ...v, vehicleModel: e.target.value }))} />
                </div>
                <div className="form-group">
                  <label className="form-label">Vehicle No</label>
                  <input className="form-control" value={invoice.vehicleNumber} onChange={(e) => setInvoice((v) => ({ ...v, vehicleNumber: e.target.value }))} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Billing Type</label>
                  <select className="form-control" value={invoice.billingType} onChange={(e) => setInvoice((v) => ({ ...v, billingType: e.target.value }))}>
                    <option value="gst">GST Invoice</option>
                    <option value="non-gst">Non-GST Invoice</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Supply Type</label>
                  <select className="form-control" value={invoice.supplyType} onChange={(e) => setInvoice((v) => ({ ...v, supplyType: e.target.value }))}>
                    <option value="intra">Intra-State (CGST + SGST)</option>
                    <option value="inter">Inter-State (IGST)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Place of Supply</label>
                  <input className="form-control" value={invoice.placeOfSupply} onChange={(e) => setInvoice((v) => ({ ...v, placeOfSupply: e.target.value }))} />
                </div>
              </div>
            </div>
          </div>

          {/* Items */}
          <div className="card">
            <div className="card-header"><span className="card-title">Invoice Items</span></div>
            <div className="card-body" style={{ paddingBottom: 0 }}>
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <input className="form-control" placeholder="Search products by name, part number, keyword..."
                  value={productQuery} onChange={(e) => setProductQuery(e.target.value)}
                  onBlur={() => setTimeout(() => setShowProductDrop(false), 200)}
                  onFocus={() => productQuery && setShowProductDrop(true)}
                />
                {showProductDrop && productSuggestions.length > 0 && (
                  <div className="search-dropdown" style={{ zIndex: 300 }}>
                    {productSuggestions.map((p) => (
                      <div key={p._id} className="search-dropdown-item">
                        <div className="item-name">{p.name} {p.partNumber ? `(${p.partNumber})` : ''}</div>
                        <div className="item-meta">{p.category}</div>
                  {p.brands.map((b, bi) => (
  <div key={b._id} onMouseDown={(e) => { e.preventDefault(); selectProduct(p, bi); }}
    style={{ padding: '4px 8px', marginTop: 4, background: 'var(--bg)', borderRadius: 4, cursor: 'pointer', fontSize: 12 }}>
    {b.brandName} — {formatCurrency(b.mrp)} — Stock: {b.stock}
  </div>
))}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {invoice.items.length > 0 && (
              <div className="table-container" style={{ overflowX: 'auto' }}>
                <table style={{ minWidth: 700 }}>
                  <thead>
                    <tr>
                      <th>#</th><th>Product</th><th>Brand</th>
                      <th style={{ width: 70 }}>Qty</th><th style={{ width: 90 }}>Rate</th><th style={{ width: 70 }}>Disc</th>
                      <th>Taxable</th>
                      {invoice.billingType === 'gst' && invoice.supplyType === 'intra' && <><th>CGST</th><th>SGST</th></>}
                      {invoice.billingType === 'gst' && invoice.supplyType === 'inter' && <th>IGST</th>}
                      <th>Total</th><th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {invoice.items.map((item, idx) => (
                      <tr key={idx}>
                        <td style={{ color: 'var(--text-muted)' }}>{idx + 1}</td>
                        <td>
                          <div style={{ fontWeight: 600, fontSize: 12 }}>{item.productName}</div>
                          {item.partNumber && <div style={{ fontSize: 11, color: '#9ea3b5' }}>{item.partNumber}</div>}
                        </td>
                        <td>
                          {item.availableBrands?.length > 1 ? (
                            <select className="form-control" style={{ width: 110, padding: '4px 8px', fontSize: 12 }}
                              value={item.brandVariantId} onChange={(e) => updateItem(idx, 'brandVariantId', e.target.value)}>
                              {item.availableBrands.map((b) => <option key={b._id} value={b._id}>{b.brandName}</option>)}
                            </select>
                          ) : <span style={{ fontSize: 12 }}>{item.brandName}</span>}
                        </td>
                        <td><input className="form-control" type="number" min={1} value={item.quantity} onChange={(e) => updateItem(idx, 'quantity', e.target.value)} style={{ width: 65, padding: '4px', textAlign: 'right' }} /></td>
                        <td><input className="form-control" type="number" min={0} step={0.01} value={item.rate} onChange={(e) => updateItem(idx, 'rate', e.target.value)} style={{ width: 85, padding: '4px', textAlign: 'right' }} /></td>
                        <td><input className="form-control" type="number" min={0} step={0.01} value={item.discount} onChange={(e) => updateItem(idx, 'discount', e.target.value)} style={{ width: 65, padding: '4px', textAlign: 'right' }} /></td>
                        <td className="text-right font-mono" style={{ fontSize: 12 }}>{formatCurrency(item.taxableValue)}</td>
                        {invoice.billingType === 'gst' && invoice.supplyType === 'intra' && <>
                          <td className="text-right font-mono" style={{ fontSize: 12 }}>{formatCurrency(item.cgstAmount)}<div style={{ fontSize: 10, color: '#9ea3b5' }}>@{item.cgstPercent}%</div></td>
                          <td className="text-right font-mono" style={{ fontSize: 12 }}>{formatCurrency(item.sgstAmount)}<div style={{ fontSize: 10, color: '#9ea3b5' }}>@{item.sgstPercent}%</div></td>
                        </>}
                        {invoice.billingType === 'gst' && invoice.supplyType === 'inter' && (
                          <td className="text-right font-mono" style={{ fontSize: 12 }}>{formatCurrency(item.igstAmount)}<div style={{ fontSize: 10, color: '#9ea3b5' }}>@{item.igstPercent}%</div></td>
                        )}
                        <td className="text-right font-mono" style={{ fontWeight: 600, fontSize: 12 }}>{formatCurrency(item.totalAmount)}</td>
                        <td><button className="btn btn-danger btn-sm" onClick={() => removeItem(idx)}>✕</button></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {invoice.items.length === 0 && (
              <div className="empty-state" style={{ padding: '24px 20px' }}><p>Search and add products above</p></div>
            )}
          </div>
        </div>

        {/* RIGHT — summary */}
        <div className="new-invoice-sidebar">
          <div className="card">
            <div className="card-header"><span className="card-title">Invoice Summary</span></div>
            <div className="card-body">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {[
                  ['Taxable Amount', totals.taxableAmount],
                  invoice.billingType === 'gst' && invoice.supplyType === 'intra' && ['CGST', totals.totalCgst],
                  invoice.billingType === 'gst' && invoice.supplyType === 'intra' && ['SGST/UTGST', totals.totalSgst],
                  invoice.billingType === 'gst' && invoice.supplyType === 'inter' && ['IGST', totals.totalIgst],
                ].filter(Boolean).map(([label, val]) => (
                  <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13 }}>
                    <span style={{ color: 'var(--text-secondary)' }}>{label}</span>
                    <span className="font-mono">{formatCurrency(val)}</span>
                  </div>
                ))}
                <div className="divider" />
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 700, fontSize: 16 }}>
                  <span>Grand Total</span>
                  <span className="font-mono" style={{ color: 'var(--primary)' }}>{formatCurrency(totals.grandTotal)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="card">
            <div className="card-header"><span className="card-title">Payment</span></div>
            <div className="card-body">
              <div className="form-group">
                <label className="form-label">Payment Method</label>
                <select className="form-control" value={invoice.paymentMethod} onChange={(e) => setInvoice((v) => ({ ...v, paymentMethod: e.target.value }))}>
                  {PAYMENT_METHODS.map((m) => <option key={m}>{m}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Amount Received</label>
                <input className="form-control" type="number" min={0} step={0.01} value={invoice.paidAmount} onChange={(e) => setInvoice((v) => ({ ...v, paidAmount: e.target.value }))} placeholder="0.00" />
              </div>
              {totals.due > 0 && <div style={{ background: '#fff3e0', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}><strong style={{ color: 'var(--warning)' }}>Due: {formatCurrency(totals.due)}</strong></div>}
              {totals.due <= 0 && totals.paid > 0 && <div style={{ background: '#e8f5e9', padding: '8px 12px', borderRadius: 6, fontSize: 13 }}><strong style={{ color: 'var(--success)' }}>Fully Paid</strong></div>}
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Notes / Remarks</label>
            <textarea className="form-control" rows={3} value={invoice.notes} onChange={(e) => setInvoice((v) => ({ ...v, notes: e.target.value }))} />
          </div>

          <button className="btn btn-primary btn-lg" onClick={() => handleSubmit(false)} disabled={loading || invoice.items.length === 0} style={{ justifyContent: 'center' }}>
            {loading ? 'Saving...' : isEdit ? 'Update Invoice' : 'Create Invoice'}
          </button>
          <button className="btn btn-secondary" onClick={() => handleSubmit(true)} disabled={loading || invoice.items.length === 0} style={{ justifyContent: 'center' }}>
            Save as Draft
          </button>
          <button className="btn btn-secondary" onClick={() => navigate('/billing')} style={{ justifyContent: 'center' }}>Cancel</button>
        </div>
      </div>
    <style>{`
        .new-invoice-grid {
          display: grid;
          grid-template-columns: minmax(0,1fr) 340px;
          gap: 20px;
          align-items: start;
        }
        .new-invoice-sidebar {
          display: flex;
          flex-direction: column;
          gap: 16px;
          position: sticky;
          top: 80px;
        }
        @media (max-width: 768px) {
          .new-invoice-grid {
            grid-template-columns: 1fr;
          }
          .new-invoice-sidebar {
            position: static;
          }
        }
      `}</style>
    </Layout>
  );
}