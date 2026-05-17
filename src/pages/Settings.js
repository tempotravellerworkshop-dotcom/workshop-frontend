import React, { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import Layout from '../components/layout/Layout';
import api from '../services/api';

const MODULES = ['dashboard', 'billing', 'inventory', 'customers', 'reports', 'settings'];

const defaultPermissions = () =>
  MODULES.map((m) => ({ module: m, view: true, edit: false }));

const EMPTY_USER = { name: '', email: '', password: '', role: 'staff', phone: '', permissions: defaultPermissions() };

function UserModal({ user, onClose, onSave }) {
  const isEdit = !!user;
  const [form, setForm] = useState(
    user
      ? { ...user, password: '', permissions: user.permissions?.length ? user.permissions : defaultPermissions() }
      : { ...EMPTY_USER, permissions: defaultPermissions() }
  );
  const [saving, setSaving] = useState(false);
  const [error,  setError]  = useState('');

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const setPerm = (module, action, val) => {
    setForm((f) => ({
      ...f,
      permissions: f.permissions.map((p) =>
        p.module === module ? { ...p, [action]: val } : p
      ),
    }));
  };

  const handleSave = async () => {
    setError('');
    if (!form.name || !form.email) { setError('Name and email are required'); return; }
    if (!isEdit && !form.password)  { setError('Password is required'); return; }
    setSaving(true);
    try {
      const payload = { ...form };
      if (!payload.password) delete payload.password;
      if (isEdit) await api.put(`/settings/users/${user._id}`, payload);
      else        await api.post('/settings/users', payload);
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to save user');
    } finally { setSaving(false); }
  };

  const getRoleBadgeColor = (r) => ({ superadmin: 'var(--danger)', admin: 'var(--primary)', staff: 'var(--text-muted)' }[r] || 'var(--text-muted)');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal-lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <span className="modal-title">{isEdit ? `Edit User — ${user.name}` : 'Create New User'}</span>
          <button className="btn btn-secondary btn-sm" onClick={onClose}>Close</button>
        </div>
        <div className="modal-body">
          {error && <div className="alert alert-danger">{error}</div>}

          <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>
            Basic Info
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input className="form-control" value={form.name} onChange={(e) => setField('name', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Email *</label>
              <input className="form-control" type="email" value={form.email} onChange={(e) => setField('email', e.target.value)} />
            </div>
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">{isEdit ? 'New Password (leave blank to keep)' : 'Password *'}</label>
              <input className="form-control" type="password" value={form.password} onChange={(e) => setField('password', e.target.value)} placeholder={isEdit ? 'Leave blank to keep current' : 'Min 6 characters'} />
            </div>
            <div className="form-group">
              <label className="form-label">Phone</label>
              <input className="form-control" value={form.phone} onChange={(e) => setField('phone', e.target.value)} />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-control" value={form.role} onChange={(e) => setField('role', e.target.value)}>
                <option value="staff">Staff</option>
                <option value="admin">Admin</option>
                <option value="superadmin">Super Admin</option>
              </select>
            </div>
          </div>

          {/* Permissions — only for staff */}
          {form.role === 'staff' && (
            <>
              <div className="divider" />
              <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>
                Module Permissions
              </div>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                <thead>
                  <tr style={{ background: 'var(--surface-2)' }}>
                    <th style={{ padding: '10px 14px', textAlign: 'left', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)' }}>Module</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', width: 100 }}>View</th>
                    <th style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, fontSize: 11, color: 'var(--text-muted)', textTransform: 'uppercase', borderBottom: '1px solid var(--border)', width: 100 }}>Edit</th>
                  </tr>
                </thead>
                <tbody>
                  {MODULES.map((mod) => {
                    const perm = form.permissions.find((p) => p.module === mod) || { view: false, edit: false };
                    return (
                      <tr key={mod} style={{ borderBottom: '1px solid var(--border-light)' }}>
                        <td style={{ padding: '11px 14px', fontWeight: 600, textTransform: 'capitalize' }}>{mod}</td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                            <input type="checkbox" checked={!!perm.view} onChange={(e) => setPerm(mod, 'view', e.target.checked)}
                              style={{ width: 16, height: 16, cursor: 'pointer', accentColor: 'var(--primary)' }} />
                          </label>
                        </td>
                        <td style={{ padding: '11px 14px', textAlign: 'center' }}>
                          <label style={{ display: 'inline-flex', alignItems: 'center', cursor: 'pointer', gap: 6 }}>
                            <input type="checkbox" checked={!!perm.edit} disabled={!perm.view}
                              onChange={(e) => setPerm(mod, 'edit', e.target.checked)}
                              style={{ width: 16, height: 16, cursor: perm.view ? 'pointer' : 'not-allowed', accentColor: 'var(--primary)', opacity: perm.view ? 1 : 0.4 }} />
                          </label>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              <div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 8 }}>
                Edit permission requires View permission. Admin and Superadmin have full access to all modules.
              </div>
            </>
          )}
        </div>
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn btn-primary" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : isEdit ? 'Update User' : 'Create User'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Settings() {
  const { user: currentUser } = useSelector((s) => s.auth);
  const isSuperAdmin = currentUser?.role === 'superadmin' || currentUser?.role === 'admin';

  const [activeTab, setActiveTab] = useState('shop');
  const [form, setForm] = useState({
    shopName: '', shopAddress: '', shopCity: '', shopState: '', shopPincode: '',
    shopPhone: '', shopEmail: '', shopGstin: '', shopStateCode: '',
    bankName: '', bankAccount: '', bankIfsc: '', bankBranch: '',
    invoicePrefix: 'INV', termsAndConditions: '', gstType: 'intra', lowStockThreshold: 5,
  });
  const [users,     setUsers]     = useState([]);
  const [loadingS,  setLoadingS]  = useState(true);
  const [loadingU,  setLoadingU]  = useState(false);
  const [saving,    setSaving]    = useState(false);
  const [profileForm, setProfileForm] = useState({ name: currentUser?.name || '', email: currentUser?.email || '', currentPassword: '', newPassword: '', confirmPassword: '' });
  const [profileMsg,  setProfileMsg]  = useState({ text: '', type: '' });
  const [savingProfile, setSavingProfile] = useState(false);
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew,     setShowNew]     = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [success,   setSuccess]   = useState('');
  const [error,     setError]     = useState('');
  const [showUserModal, setShowUserModal] = useState(false);
  const [editUser,  setEditUser]  = useState(null);

  useEffect(() => {
    api.get('/settings').then((r) => { setForm((f) => ({ ...f, ...r.data.data })); }).finally(() => setLoadingS(false));
  }, []);

  useEffect(() => {
    if (activeTab === 'users' && isSuperAdmin) {
      setLoadingU(true);
      api.get('/settings/users').then((r) => setUsers(r.data.data)).finally(() => setLoadingU(false));
    }
  }, [activeTab, isSuperAdmin]);

  const setField = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleSave = async () => {
    setSaving(true); setSuccess(''); setError('');
    try {
      await api.put('/settings', form);
      setSuccess('Settings saved successfully');
    } catch { setError('Failed to save settings'); }
    finally { setSaving(false); }
  };

  const handleDeleteUser = async (id) => {
    if (!window.confirm('Deactivate this user?')) return;
    await api.delete(`/settings/users/${id}`);
    setUsers((u) => u.filter((x) => x._id !== id));
  };

  const handleUserSaved = () => {
    setShowUserModal(false); setEditUser(null);
    api.get('/settings/users').then((r) => setUsers(r.data.data));
  };

  const tabs = ['shop', 'invoice', 'bank', 'account', ...(isSuperAdmin ? ['users'] : [])];

  const roleColor = { superadmin: 'danger', admin: 'primary', staff: 'default' };

  return (
    <Layout title="Settings">
      {success && <div className="alert alert-success">{success}</div>}
      {error   && <div className="alert alert-danger">{error}</div>}

      {/* Tabs */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 20, borderBottom: '2px solid var(--border)', paddingBottom: 0 }}>
        {tabs.map((t) => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '10px 20px', border: 'none', background: 'none', cursor: 'pointer',
            fontWeight: 600, fontSize: 13, fontFamily: 'var(--font-body)',
            color: activeTab === t ? 'var(--primary)' : 'var(--text-muted)',
            borderBottom: activeTab === t ? '2px solid var(--primary)' : '2px solid transparent',
            marginBottom: -2, textTransform: 'capitalize',
            transition: 'all 0.15s',
          }}>
            {t === 'users' ? 'User Management' : t === 'shop' ? 'Shop Info' : t === 'invoice' ? 'Invoice & GST' : t === 'account' ? 'My Account' : 'Bank Details'}
          </button>
        ))}
      </div>

      {/* Shop Info */}
      {activeTab === 'shop' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
          <div className="card">
            <div className="card-header"><span className="card-title">Shop Information</span></div>
            <div className="card-body">
              <div className="form-group"><label className="form-label">Shop Name *</label><input className="form-control" value={form.shopName} onChange={(e) => setField('shopName', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Address</label><input className="form-control" value={form.shopAddress} onChange={(e) => setField('shopAddress', e.target.value)} /></div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">City</label><input className="form-control" value={form.shopCity} onChange={(e) => setField('shopCity', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">State</label><input className="form-control" value={form.shopState} onChange={(e) => setField('shopState', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Pincode</label><input className="form-control" value={form.shopPincode} onChange={(e) => setField('shopPincode', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">Phone</label><input className="form-control" value={form.shopPhone} onChange={(e) => setField('shopPhone', e.target.value)} /></div>
                <div className="form-group"><label className="form-label">Email</label><input className="form-control" value={form.shopEmail} onChange={(e) => setField('shopEmail', e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group"><label className="form-label">GSTIN</label><input className="form-control" value={form.shopGstin} onChange={(e) => setField('shopGstin', e.target.value.toUpperCase())} /></div>
                <div className="form-group"><label className="form-label">State Code</label><input className="form-control" value={form.shopStateCode} maxLength={2} onChange={(e) => setField('shopStateCode', e.target.value)} /></div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Invoice & GST */}
      {activeTab === 'invoice' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Invoice &amp; GST Settings</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Invoice Prefix</label><input className="form-control" value={form.invoicePrefix} onChange={(e) => setField('invoicePrefix', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Default GST Type</label>
                <select className="form-control" value={form.gstType} onChange={(e) => setField('gstType', e.target.value)}>
                  <option value="intra">Intra-State (CGST + SGST)</option>
                  <option value="inter">Inter-State (IGST)</option>
                </select>
              </div>
              <div className="form-group"><label className="form-label">Low Stock Threshold</label><input className="form-control" type="number" min={0} value={form.lowStockThreshold} onChange={(e) => setField('lowStockThreshold', Number(e.target.value))} /></div>
            </div>
            <div className="form-group"><label className="form-label">Terms &amp; Conditions</label><textarea className="form-control" rows={5} value={form.termsAndConditions} onChange={(e) => setField('termsAndConditions', e.target.value)} /></div>
          </div>
        </div>
      )}

      {/* Bank */}
      {activeTab === 'bank' && (
        <div className="card">
          <div className="card-header"><span className="card-title">Bank Details</span></div>
          <div className="card-body">
            <div className="form-row">
              <div className="form-group"><label className="form-label">Bank Name</label><input className="form-control" value={form.bankName} onChange={(e) => setField('bankName', e.target.value)} /></div>
              <div className="form-group"><label className="form-label">Account Number</label><input className="form-control" value={form.bankAccount} onChange={(e) => setField('bankAccount', e.target.value)} /></div>
            </div>
            <div className="form-row">
              <div className="form-group"><label className="form-label">IFSC Code</label><input className="form-control" value={form.bankIfsc} onChange={(e) => setField('bankIfsc', e.target.value.toUpperCase())} /></div>
              <div className="form-group"><label className="form-label">Branch</label><input className="form-control" value={form.bankBranch} onChange={(e) => setField('bankBranch', e.target.value)} /></div>
            </div>
          </div>
        </div>
      )}


      {/* My Account */}
      {activeTab === 'account' && (
        <div className="card" style={{ maxWidth: 560 }}>
          <div className="card-header"><span className="card-title">My Account</span></div>
          <div className="card-body">
            {profileMsg.text && (
              <div className={`alert alert-${profileMsg.type}`}>{profileMsg.text}</div>
            )}

            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>
              Basic Info
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input className="form-control" value={profileForm.name}
                  onChange={(e) => setProfileForm((f) => ({ ...f, name: e.target.value }))} />
              </div>
              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input className="form-control" type="email" value={profileForm.email}
                  onChange={(e) => setProfileForm((f) => ({ ...f, email: e.target.value }))} />
              </div>
            </div>

            <div className="divider" />
            <div style={{ fontWeight: 700, fontSize: 11, color: 'var(--primary)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 14, paddingBottom: 6, borderBottom: '2px solid var(--border)' }}>
              Change Password
            </div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 12 }}>
              Leave blank if you do not want to change your password.
            </div>
            <div className="form-group">
              <label className="form-label">Current Password</label>
              <input className="form-control" type="password" value={profileForm.currentPassword}
                onChange={(e) => setProfileForm((f) => ({ ...f, currentPassword: e.target.value }))}
                placeholder="Enter current password to verify" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label className="form-label">New Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control" type={showNew ? 'text' : 'password'} value={profileForm.newPassword}
                    onChange={(e) => setProfileForm((f) => ({ ...f, newPassword: e.target.value }))}
                    placeholder="Min 6 characters" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowNew(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{showNew ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}</svg>
                  </button>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input className="form-control" type={showConfirm ? 'text' : 'password'} value={profileForm.confirmPassword}
                    onChange={(e) => setProfileForm((f) => ({ ...f, confirmPassword: e.target.value }))}
                    placeholder="Repeat new password" style={{ paddingRight: 44 }} />
                  <button type="button" onClick={() => setShowConfirm(v => !v)} tabIndex={-1}
                    style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex' }}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">{showConfirm ? <><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></> : <><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94"/><path d="M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19"/><line x1="1" y1="1" x2="23" y2="23"/></>}</svg>
                  </button>
                </div>
              </div>
            </div>

            <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
              <button
                className="btn btn-primary"
                disabled={savingProfile}
                onClick={async () => {
                  setProfileMsg({ text: '', type: '' });
                  if (profileForm.newPassword && profileForm.newPassword !== profileForm.confirmPassword) {
                    setProfileMsg({ text: 'New passwords do not match', type: 'danger' });
                    return;
                  }
                  setSavingProfile(true);
                  try {
                    const payload = { name: profileForm.name, email: profileForm.email };
                    if (profileForm.newPassword) {
                      payload.currentPassword = profileForm.currentPassword;
                      payload.newPassword     = profileForm.newPassword;
                    }
                    await api.put('/auth/profile', payload);
                    setProfileMsg({ text: 'Profile updated successfully', type: 'success' });
                    setProfileForm((f) => ({ ...f, currentPassword: '', newPassword: '', confirmPassword: '' }));
                  } catch (err) {
                    setProfileMsg({ text: err.response?.data?.message || 'Failed to update profile', type: 'danger' });
                  } finally { setSavingProfile(false); }
                }}
              >
                {savingProfile ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Users */}
      {activeTab === 'users' && isSuperAdmin && (
        <div className="card">
          <div className="card-header">
            <span className="card-title">Users ({users.length})</span>
            <button className="btn btn-primary btn-sm" onClick={() => { setEditUser(null); setShowUserModal(true); }}>+ Create User</button>
          </div>
          <div className="table-container">
            {loadingU ? <div className="loading"><div className="spinner" /></div> : (
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Phone</th>
                    <th>Role</th>
                    <th>Permissions</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u, i) => (
                    <tr key={u._id}>
                      <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{i + 1}</td>
                      <td style={{ fontWeight: 600 }}>{u.name}</td>
                      <td style={{ fontSize: 12, color: 'var(--text-muted)' }}>{u.email}</td>
                      <td style={{ fontSize: 12 }}>{u.phone || '—'}</td>
                      <td><span className={`badge badge-${roleColor[u.role] || 'default'}`}>{u.role}</span></td>
                      <td>
                        {u.role === 'staff' ? (
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            {u.permissions?.filter((p) => p.view).map((p) => (
                              <span key={p.module} style={{
                                fontSize: 10, padding: '1px 7px', borderRadius: 10, fontWeight: 600,
                                background: p.edit ? 'var(--primary)' : 'var(--bg)',
                                color: p.edit ? '#fff' : 'var(--text-secondary)',
                                border: '1px solid var(--border)',
                              }}>
                                {p.module}{p.edit ? ' ✎' : ''}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>Full Access</span>
                        )}
                      </td>
                      <td><span className={`badge badge-${u.isActive ? 'success' : 'danger'}`}>{u.isActive ? 'Active' : 'Inactive'}</span></td>
                      <td>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <button className="btn btn-secondary btn-sm" onClick={() => { setEditUser(u); setShowUserModal(true); }}>Edit</button>
                          {u._id !== currentUser?.id && (
                            <button className="btn btn-danger btn-sm" onClick={() => handleDeleteUser(u._id)}>Del</button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      )}

      {/* Save button */}
      {activeTab !== 'users' && activeTab !== 'account' && (
        <div style={{ marginTop: 20, display: 'flex', justifyContent: 'flex-end' }}>
          <button className="btn btn-primary btn-lg" onClick={handleSave} disabled={saving}>
            {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {showUserModal && (
        <UserModal
          user={editUser}
          onClose={() => { setShowUserModal(false); setEditUser(null); }}
          onSave={handleUserSaved}
        />
      )}
    </Layout>
  );
}