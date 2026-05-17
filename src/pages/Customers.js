import React, { useEffect, useState, useCallback } from 'react';
import Layout from '../components/layout/Layout';
import Pagination from '../components/common/Pagination';
import api from '../services/api';
import usePermission from '../hooks/usePermission';
import { formatCurrency } from '../utils/helpers';

const EMPTY = { name: '', mobile: '', address: '', city: '', state: '', gstin: '', stateCode: '', email: '' };
const LIMIT  = 20;

export default function Customers() {
  const [customers, setCustomers] = useState([]);
  const [total,     setTotal]     = useState(0);
  const [loading,   setLoading]   = useState(true);
  const [search,    setSearch]    = useState('');
  const [dueFilter, setDueFilter] = useState(''); // '' | 'due'
  const [page,      setPage]      = useState(1);
  const [showModal, setShowModal] = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editId,    setEditId]    = useState(null);
  const [saving,    setSaving]    = useState(false);
  const { canEdit } = usePermission();
  const canEditCustomers = canEdit('customers');
  const [error,     setError]     = useState('');

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT });
      if (search) params.append('search', search);
      const res = await api.get(`/customers?${params}`);
      let data = res.data.data;
      if (dueFilter === 'due') data = data.filter((c) => c.totalDue > 0);
      setCustomers(data);
      setTotal(res.data.total);
    } finally { setLoading(false); }
  }, [search, dueFilter, page]);

  useEffect(() => { fetchCustomers(); }, [fetchCustomers]);

  const openAdd  = () => { setForm(EMPTY); setEditId(null); setError(''); setShowModal(true); };
  const openEdit = (c) => { setForm(c); setEditId(c._id); setError(''); setShowModal(true); };

  const handleSave = async () => {
    if (!form.name.trim()) { setError('Customer name is required'); return; }
    setSaving(true);
    try {
      if (editId) await api.put(`/customers/${editId}`, form);
      else        await api.post('/customers', form);
      setShowModal(false);
      fetchCustomers();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this customer?')) return;
    await api.delete(`/customers/${id}`);
    fetchCustomers();
  };

  const pages = Math.ceil(total / LIMIT);
  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  return (
    <Layout title="Customers">
      {/* Filters bar */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 18, flexWrap: 'wrap', alignItems: 'center' }}>
        <div style={{ position: 'relative', flex: 1, maxWidth: 320 }}>
          <span style={{ position: 'absolute', left: 11, top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)', pointerEvents: 'none' }}>&#128269;</span>
          <input className="form-control" style={{ paddingLeft: 34 }}
            placeholder="Search by name, mobile, GSTIN..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
        {/* Due filter */}
        {['', 'due'].map((f) => (
          <button key={f}
            className={`btn btn-sm ${dueFilter === f ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => { setDueFilter(f); setPage(1); }}
          >
            {f === '' ? 'All Customers' : 'With Dues Only'}
          </button>
        ))}
        {canEditCustomers && (
          <button className="btn btn-primary" style={{ marginLeft: 'auto' }} onClick={openAdd}>
            + Add Customer
          </button>
        )}
      </div>

      <div className="card">
        <div className="card-header">
          <span className="card-title">Customers ({total})</span>
        </div>
        <div className="table-container">
          {loading ? (
            <div className="loading"><div className="spinner" /></div>
          ) : (
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Mobile</th>
                  <th>City</th>
                  <th>GSTIN</th>
                  <th className="text-right">Total Purchase</th>
                  <th className="text-right">Due</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {customers.length === 0 && (
                  <tr><td colSpan={8} className="text-center" style={{ padding: 40, color: 'var(--text-muted)' }}>No customers found</td></tr>
                )}
                {customers.map((c, i) => (
                  <tr key={c._id}>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{(page - 1) * LIMIT + i + 1}</td>
                    <td style={{ fontWeight: 600 }}>{c.name}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.mobile || '—'}</td>
                    <td>{c.city || '—'}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12 }}>{c.gstin || '—'}</td>
                    <td className="text-right font-mono">{formatCurrency(c.totalPurchase)}</td>
                    <td className="text-right font-mono" style={{
                      color: c.totalDue > 0 ? 'var(--danger)' : 'var(--text-muted)',
                      fontWeight: c.totalDue > 0 ? 700 : 400,
                    }}>
                      {formatCurrency(c.totalDue)}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: 6 }}>
                        {canEditCustomers && <button className="btn btn-secondary btn-sm" onClick={() => openEdit(c)}>Edit</button>}
                        {canEditCustomers && <button className="btn btn-danger btn-sm"    onClick={() => handleDelete(c._id)}>Del</button>}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination page={page} pages={pages} onPage={setPage} />
      </div>

      {/* Add / Edit modal */}
      {showModal && (
        <div className="modal-overlay" onClick={() => setShowModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">{editId ? 'Edit Customer' : 'Add Customer'}</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowModal(false)}>Close</button>
            </div>
            <div className="modal-body">
              {error && <div className="alert alert-danger">{error}</div>}
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Full Name *</label>
                  <input className="form-control" value={form.name} onChange={(e) => setField('name', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Mobile</label>
                  <input className="form-control" value={form.mobile} onChange={(e) => setField('mobile', e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Address</label>
                <input className="form-control" value={form.address} onChange={(e) => setField('address', e.target.value)} />
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">City</label>
                  <input className="form-control" value={form.city} onChange={(e) => setField('city', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State</label>
                  <input className="form-control" value={form.state} onChange={(e) => setField('state', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">State Code</label>
                  <input className="form-control" value={form.stateCode} onChange={(e) => setField('stateCode', e.target.value)} maxLength={2} />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">GSTIN</label>
                  <input className="form-control" value={form.gstin} onChange={(e) => setField('gstin', e.target.value.toUpperCase())} />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input className="form-control" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowModal(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : editId ? 'Update' : 'Add Customer'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
