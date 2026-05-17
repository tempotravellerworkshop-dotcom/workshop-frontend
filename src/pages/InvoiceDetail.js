import React, { useEffect, useState, useRef, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useReactToPrint } from 'react-to-print';
import Layout from '../components/layout/Layout';
import api from '../services/api';
import usePermission from '../hooks/usePermission';
import { formatCurrency, formatDate, numberToWords } from '../utils/helpers';

/* ─── Signature Canvas ─────────────────────────────────────────────────── */
function SignatureCanvas({ label, initial, onSave }) {
  const canvasRef = useRef();
  const [drawing, setDrawing] = useState(false);
  const [hasSig,  setHasSig]  = useState(false);
  const [saved,   setSaved]   = useState(false);

  // Load existing signature/stamp into canvas on mount
  useEffect(() => {
    if (!initial || !canvasRef.current) return;
    const img = new window.Image();
    img.onload = () => {
      const ctx = canvasRef.current.getContext('2d');
      ctx.clearRect(0, 0, 340, 130);
      ctx.drawImage(img, 0, 0, 340, 130);
      setHasSig(true);
    };
    img.src = initial;
  }, [initial]);

  const getPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const src  = e.touches ? e.touches[0] : e;
    // Scale mouse position to canvas resolution
    const scaleX = canvasRef.current.width  / rect.width;
    const scaleY = canvasRef.current.height / rect.height;
    return {
      x: (src.clientX - rect.left)  * scaleX,
      y: (src.clientY - rect.top)   * scaleY,
    };
  };

  const startDraw = (e) => {
    e.preventDefault();
    setDrawing(true); setSaved(false);
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (e) => {
    if (!drawing) return;
    e.preventDefault();
    const ctx = canvasRef.current.getContext('2d');
    const pos = getPos(e);
    ctx.lineWidth   = 2.5;
    ctx.lineCap     = 'round';
    ctx.lineJoin    = 'round';
    ctx.strokeStyle = '#1a237e';
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
    setHasSig(true);
  };

  const stopDraw = () => setDrawing(false);

  const handleClear = () => {
    const ctx = canvasRef.current.getContext('2d');
    ctx.clearRect(0, 0, 340, 130);
    setHasSig(false); setSaved(false);
  };

  const handleSave = () => {
    const data = canvasRef.current.toDataURL('image/png');
    onSave(data);
    setSaved(true);
  };

  const handleUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new window.Image();
      img.onload = () => {
        const ctx = canvasRef.current.getContext('2d');
        ctx.clearRect(0, 0, 340, 130);
        const scale = Math.min(340 / img.width, 130 / img.height, 1);
        const w = img.width * scale;
        const h = img.height * scale;
        ctx.drawImage(img, (340 - w) / 2, (130 - h) / 2, w, h);
        setHasSig(true); setSaved(false);
      };
      img.src = ev.target.result;
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text-primary)' }}>{label}</div>

      {/* Canvas */}
      <canvas
        ref={canvasRef}
        width={340}
        height={130}
        style={{
          width: '100%',
          height: 130,
          border: '2px dashed var(--border)',
          borderRadius: 'var(--radius)',
          cursor: 'crosshair',
          background: '#f8f9fc',
          touchAction: 'none',
          display: 'block',
        }}
        onMouseDown={startDraw}
        onMouseMove={draw}
        onMouseUp={stopDraw}
        onMouseLeave={stopDraw}
        onTouchStart={startDraw}
        onTouchMove={draw}
        onTouchEnd={stopDraw}
      />

      {/* Instructions */}
      <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>
        Draw with mouse / finger, or upload an image file
      </div>

      {/* Actions */}
      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <button className="btn btn-secondary btn-sm" onClick={handleClear}>
          Clear
        </button>
        <label className="btn btn-secondary btn-sm" style={{ cursor: 'pointer' }}>
          Upload Image
          <input type="file" accept="image/*" onChange={handleUpload} style={{ display: 'none' }} />
        </label>
        <button
          className="btn btn-primary btn-sm"
          onClick={handleSave}
          disabled={!hasSig}
          style={{ opacity: hasSig ? 1 : 0.4 }}
        >
          {saved ? '✓ Saved to Invoice' : 'Save to Invoice'}
        </button>
      </div>
    </div>
  );
}

/* ─── Invoice Print ────────────────────────────────────────────────────── */
const InvoicePrint = React.forwardRef(({ invoice, settings }, ref) => {
  const s     = settings || {};
  const intra = invoice.supplyType !== 'inter';
  const isGST = invoice.billingType === 'gst';

  const cell = (extra = {}) => ({
    border: '1px solid #000', padding: '3px 4px', fontSize: 9,
    fontFamily: 'Arial, Helvetica, sans-serif', verticalAlign: 'top',
    lineHeight: 1.35, overflow: 'hidden', wordBreak: 'break-word', ...extra,
  });

  const hCell = (extra = {}) => cell({
    background: '#e8e8e8', fontWeight: 'bold',
    textAlign: 'center', verticalAlign: 'middle', ...extra,
  });

  const cols = isGST
    ? (intra
        ? [22, 165, 56, 28, 30, 52, 72, 40, 52, 40, 52, 60]
        : [24, 205, 58, 30, 32, 58, 76, 42, 58, 66])
    : [28, 300, 64, 36, 36, 72, 104, 106];

  return (
    <div ref={ref} style={{
      fontFamily: 'Arial, Helvetica, sans-serif', fontSize: 9,
      color: '#000', background: '#fff', padding: '10px 14px',
      width: 760, boxSizing: 'border-box', margin: '0 auto',
    }}>
      {/* Header */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
        <colgroup><col style={{ width: '62%' }} /><col style={{ width: '38%' }} /></colgroup>
        <tbody>
          <tr>
            <td style={cell({ padding: '8px 10px', verticalAlign: 'middle', borderRight: 'none' })}>
              <div style={{ fontSize: 16, fontWeight: 900 }}>TAX INVOICE</div>
              <div style={{ fontSize: 17, fontWeight: 900, textTransform: 'uppercase', marginTop: 2 }}>{s.shopName}</div>
              <div style={{ fontSize: 9, marginTop: 2 }}>{[s.shopAddress, s.shopCity, s.shopState, s.shopPincode].filter(Boolean).join(', ')}</div>
              {s.shopPhone && <div style={{ fontSize: 9 }}>PHONE: {s.shopPhone}</div>}
              {s.shopGstin && <div style={{ fontSize: 9, marginTop: 3 }}><strong>Gstin: {s.shopGstin}</strong></div>}
              <div style={{ fontSize: 8, marginTop: 2, color: '#666', fontStyle: 'italic' }}>AUTHORISED SERVICE CENTER &amp; DISTRIBUTORS &amp; DEALERS OF SPARE PARTS</div>
            </td>
            <td style={cell({ padding: '8px 10px', verticalAlign: 'top' })}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <tbody>
                  {[
                    ['Invoice No',    invoice.invoiceNumber,                        true ],
                    ['Invoice Date',  formatDate(invoice.invoiceDate),              false],
                    ['Place of Supply', invoice.placeOfSupply || 'CHANDIGARH',     false],
                    invoice.vehicleModel  ? ['Model',    invoice.vehicleModel,      false] : null,
                    invoice.vehicleNumber ? ['Veh. No',  invoice.vehicleNumber,     false] : null,
                    ['Transport',     'BY HAND',                                    false],
                    ['Payment',       (invoice.paymentStatus || '').toUpperCase(), true ],
                  ].filter(Boolean).map(([label, val, bold], i) => (
                    <tr key={i}>
                      <td style={{ padding: '2px 0', paddingRight: 6, whiteSpace: 'nowrap', color: '#444', fontSize: 9 }}>{label}</td>
                      <td style={{ padding: '2px 0', fontWeight: bold ? 700 : 400, fontSize: 9 }}>: {val}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {s.bankName && (
                <div style={{ marginTop: 6, paddingTop: 5, borderTop: '1px solid #ccc', fontSize: 9 }}>
                  <div><strong>BANK :</strong> {s.bankName}</div>
                  {s.bankAccount && <div><strong>A/C :</strong> {s.bankAccount}</div>}
                  {s.bankIfsc    && <div><strong>IFSC :</strong> {s.bankIfsc}</div>}
                </div>
              )}
            </td>
          </tr>
        </tbody>
      </table>

      {/* Billed to / Ship to */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
        <colgroup><col style={{ width: '50%' }} /><col style={{ width: '50%' }} /></colgroup>
        <tbody>
          <tr>
            {['Details of Receiver (Billed to)', 'Details of Receiver (Ship to)'].map((label, ci) => (
              <td key={ci} style={{ ...cell({ padding: 0, borderLeft: ci === 1 ? 'none' : undefined }), verticalAlign: 'top' }}>
                <div style={{ background: '#e8e8e8', fontWeight: 700, fontSize: 9, padding: '3px 8px', borderBottom: '1px solid #ccc' }}>{label}</div>
                <div style={{ padding: '5px 8px', fontSize: 9, lineHeight: 1.6 }}>
                  <div><strong>Name :</strong> {invoice.customerName}</div>
                  {invoice.customerAddress   && <div><strong>Address :</strong> {invoice.customerAddress}</div>}
                  {invoice.customerGstin     && <div><strong>GSTIN :</strong> {invoice.customerGstin}</div>}
                  {invoice.customerStateCode && <div><strong>State Code :</strong> {invoice.customerStateCode}</div>}
                  {invoice.customerMobile    && <div><strong>Phone :</strong> {invoice.customerMobile}</div>}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>

      {/* Items Table */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
        <colgroup>{cols.map((w, i) => <col key={i} style={{ width: w, minWidth: w }} />)}</colgroup>
        <thead>
          <tr>
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}>S.No</th>
            <th style={hCell({ textAlign: 'left', padding: '4px 4px', fontSize: 7.5 })}>Description &amp; Part No</th>
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}>HSN/SAC</th>
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}>Qty</th>
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}>UOM</th>
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5, textAlign: 'right' })}>Rate</th>
            <th style={hCell({ padding: '4px 3px', fontSize: 7.5, textAlign: 'right' })}>Taxable Value</th>
            {isGST && intra && <>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}><div>CGST</div><div>Rate</div></th>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5, textAlign: 'right' })}><div>CGST</div><div>Amt</div></th>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}><div>SGST</div><div>Rate</div></th>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5, textAlign: 'right' })}><div>SGST</div><div>Amt</div></th>
            </>}
            {isGST && !intra && <>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5 })}><div>IGST</div><div>Rate</div></th>
              <th style={hCell({ padding: '4px 2px', fontSize: 7.5, textAlign: 'right' })}><div>IGST</div><div>Amt</div></th>
            </>}
            <th style={hCell({ padding: '4px 2px', fontSize: 7.5, textAlign: 'right' })}>Total</th>
          </tr>
        </thead>
        <tbody>
          {invoice.items.map((item, i) => (
            <tr key={i} style={{ background: i % 2 === 1 ? '#fafafa' : '#fff' }}>
              <td style={cell({ textAlign: 'center', borderTop: 'none' })}>{i + 1}</td>
              <td style={cell({ textAlign: 'left', borderTop: 'none', borderLeft: 'none', padding: '3px 5px' })}>
                <div style={{ fontWeight: 700, fontSize: 8.5 }}>{item.productName}</div>
                {item.brandName && item.brandName !== item.productName && <div style={{ color: '#555', fontSize: 7.5 }}>{item.brandName}</div>}
                {item.partNumber && <div style={{ color: '#666', fontSize: 7.5 }}>PN: {item.partNumber}</div>}
              </td>
              <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{item.hsnCode}</td>
              <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{item.quantity}</td>
              <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{item.unit}</td>
              <td style={cell({ textAlign: 'right', borderTop: 'none', borderLeft: 'none', fontFamily: 'Courier New, monospace' })}>{(+item.rate).toFixed(2)}</td>
              <td style={cell({ textAlign: 'right', borderTop: 'none', borderLeft: 'none', fontFamily: 'Courier New, monospace' })}>{(+item.taxableValue).toFixed(2)}</td>
              {isGST && intra && <>
                <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{(+item.cgstPercent).toFixed(2)}%</td>
                <td style={cell({ textAlign: 'right',  borderTop: 'none', borderLeft: 'none', fontFamily: 'Courier New, monospace' })}>{(+item.cgstAmount).toFixed(2)}</td>
                <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{(+item.sgstPercent).toFixed(2)}%</td>
                <td style={cell({ textAlign: 'right',  borderTop: 'none', borderLeft: 'none', fontFamily: 'Courier New, monospace' })}>{(+item.sgstAmount).toFixed(2)}</td>
              </>}
              {isGST && !intra && <>
                <td style={cell({ textAlign: 'center', borderTop: 'none', borderLeft: 'none' })}>{(+item.igstPercent).toFixed(2)}%</td>
                <td style={cell({ textAlign: 'right',  borderTop: 'none', borderLeft: 'none', fontFamily: 'Courier New, monospace' })}>{(+item.igstAmount).toFixed(2)}</td>
              </>}
              <td style={cell({ textAlign: 'right', borderTop: 'none', borderLeft: 'none', fontWeight: 700, fontFamily: 'Courier New, monospace' })}>{(+item.totalAmount).toFixed(2)}</td>
            </tr>
          ))}
          {Array.from({ length: Math.max(0, 4 - invoice.items.length) }).map((_, i) => (
            <tr key={'f' + i}><td style={cell({ borderTop: 'none', height: 18 })} colSpan={cols.length}>&nbsp;</td></tr>
          ))}
        </tbody>
      </table>

      {/* Totals */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
        <colgroup><col style={{ width: '56%' }} /><col style={{ width: '44%' }} /></colgroup>
        <tbody>
          <tr>
            <td style={cell({ padding: '7px 9px', verticalAlign: 'top' })}>
              <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 3 }}>Invoice Value (In Words)</div>
              <div style={{ fontStyle: 'italic', fontSize: 9, lineHeight: 1.5 }}>Rs. {numberToWords(Math.round(invoice.grandTotal || 0))}</div>
              {isGST && (
                <div style={{ marginTop: 8 }}>
                  <table style={{ borderCollapse: 'collapse', fontSize: 9 }}>
                    <tbody>
                      <tr><td style={{ paddingRight: 20, paddingBottom: 2 }}>Sale @{invoice.items[0]?.gstPercent || 18}%</td><td style={{ fontFamily: 'Courier New, monospace' }}>{(+(invoice.taxableAmount || 0)).toFixed(2)}</td></tr>
                      {intra ? <>
                        <tr><td style={{ paddingRight: 20, paddingBottom: 2 }}>CGST @{invoice.items[0]?.cgstPercent || 9}%</td><td style={{ fontFamily: 'Courier New, monospace' }}>{(+(invoice.totalCgst || 0)).toFixed(2)}</td></tr>
                        <tr><td style={{ paddingRight: 20 }}>UTGST @{invoice.items[0]?.sgstPercent || 9}%</td><td style={{ fontFamily: 'Courier New, monospace' }}>{(+(invoice.totalSgst || 0)).toFixed(2)}</td></tr>
                      </> : <tr><td>IGST @{invoice.items[0]?.igstPercent || 18}%</td><td style={{ fontFamily: 'Courier New, monospace' }}>{(+(invoice.totalIgst || 0)).toFixed(2)}</td></tr>}
                    </tbody>
                  </table>
                </div>
              )}
              {invoice.notes && <div style={{ marginTop: 6, fontSize: 9 }}><strong>REMARKS:</strong> {invoice.notes}</div>}
            </td>
            <td style={cell({ padding: 0, verticalAlign: 'top' })}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 9 }}>
                <tbody>
                  {[
                    { l: 'Total',          v: (+(invoice.taxableAmount || 0)).toFixed(2) },
                    isGST && intra  ? { l: 'CGST Amount',  v: (+(invoice.totalCgst  || 0)).toFixed(2) } : null,
                    isGST && intra  ? { l: 'UTGST Amount', v: (+(invoice.totalSgst  || 0)).toFixed(2) } : null,
                    isGST && !intra ? { l: 'IGST Amount',  v: (+(invoice.totalIgst  || 0)).toFixed(2) } : null,
                    isGST           ? { l: 'GST Amount',   v: (+(invoice.totalGst   || 0)).toFixed(2) } : null,
                    { l: 'FREIGHT',        v: '0.00' },
                    { l: 'FREIGHT ON GST', v: '0.00' },
                  ].filter(Boolean).map((row, i) => (
                    <tr key={i}>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #ddd', color: '#333' }}>{row.l}</td>
                      <td style={{ padding: '3px 8px', borderBottom: '1px solid #ddd', textAlign: 'right', fontFamily: 'Courier New, monospace' }}>{row.v}</td>
                    </tr>
                  ))}
                  <tr style={{ background: '#e8e8e8' }}>
                    <td style={{ padding: '5px 8px', fontWeight: 900, fontSize: 11, borderTop: '2px solid #000', borderBottom: '1px solid #ddd' }}>Invoice Total</td>
                    <td style={{ padding: '5px 8px', fontWeight: 900, fontSize: 11, textAlign: 'right', fontFamily: 'Courier New, monospace', borderTop: '2px solid #000', borderBottom: '1px solid #ddd' }}>Rs. {(+(invoice.grandTotal || 0)).toFixed(2)}</td>
                  </tr>
                  <tr>
                    <td style={{ padding: '3px 8px', color: '#1a6e3c' }}>Paid Amount</td>
                    <td style={{ padding: '3px 8px', textAlign: 'right', fontFamily: 'Courier New, monospace', color: '#1a6e3c' }}>{(+(invoice.paidAmount || 0)).toFixed(2)}</td>
                  </tr>
                  {(invoice.dueAmount || 0) > 0 && (
                    <tr>
                      <td style={{ padding: '3px 8px', color: '#c00', fontWeight: 700 }}>Balance Due</td>
                      <td style={{ padding: '3px 8px', textAlign: 'right', fontFamily: 'Courier New, monospace', color: '#c00', fontWeight: 700 }}>{(+(invoice.dueAmount || 0)).toFixed(2)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Terms + Signature with e-sig/stamp */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
        <colgroup><col style={{ width: '62%' }} /><col style={{ width: '38%' }} /></colgroup>
        <tbody>
          <tr>
            <td style={cell({ padding: '6px 9px', verticalAlign: 'top' })}>
              <div style={{ fontWeight: 700, fontSize: 9, marginBottom: 2 }}>TERM &amp; CONDITION OF SALE</div>
              <div style={{ fontSize: 8.5, color: '#444', lineHeight: 1.6 }}>
                {s.termsAndConditions || 'Interest @20% p.a. on all outstanding bills. Chandigarh courts jurisdiction.'}
              </div>
              <div style={{ marginTop: 4, fontSize: 8, color: '#666' }}>Certified that the Particulars given above are true and correct</div>
            </td>
            <td style={cell({ padding: '6px 9px', textAlign: 'center', verticalAlign: 'top', borderLeft: 'none' })}>
              <div style={{ fontSize: 9 }}>For <strong>{s.shopName}</strong></div>
              {/* Stamp — shown if exists */}
              {invoice.eStamp && (
                <img src={invoice.eStamp} alt="stamp"
                  style={{ width: 64, height: 64, objectFit: 'contain', display: 'block', margin: '4px auto', opacity: 0.9 }} />
              )}
              {/* Signature — shown if exists */}
              {invoice.eSignature && (
                <img src={invoice.eSignature} alt="signature"
                  style={{ width: 110, height: 44, objectFit: 'contain', display: 'block', margin: '4px auto 0' }} />
              )}
              {!invoice.eStamp && !invoice.eSignature && (
                <div style={{ height: 50 }} />
              )}
              <div style={{ borderTop: '1px solid #000', paddingTop: 3, fontWeight: 700, fontSize: 9, marginTop: 4 }}>
                Authorised Signatory
              </div>
            </td>
          </tr>
        </tbody>
      </table>

      {/* Footer */}
      <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed', marginTop: -1 }}>
        <colgroup><col style={{ width: '33.33%' }} /><col style={{ width: '33.33%' }} /><col style={{ width: '33.34%' }} /></colgroup>
        <tbody>
          <tr>
            {['Packed By', 'Dispatched By', 'Prepared By'].map((label, i) => (
              <td key={i} style={cell({ padding: '5px 9px', borderLeft: i > 0 ? 'none' : undefined })}>
                <div style={{ fontWeight: 700, fontSize: 9 }}>{label}</div>
                <div style={{ marginTop: 14, fontSize: 8, color: '#888' }}>
                  {label === 'Dispatched By' ? 'BY HAND' : '______________________'}
                </div>
              </td>
            ))}
          </tr>
        </tbody>
      </table>
      <div style={{ textAlign: 'center', fontSize: 7.5, color: '#aaa', marginTop: 5 }}>
        Original For Consignee &nbsp;|&nbsp; Computer Generated Invoice
      </div>
    </div>
  );
});

/* ─── Page Component ───────────────────────────────────────────────────── */
export default function InvoiceDetail() {
  const { id }    = useParams();
  const printRef  = useRef();
  const { canEdit } = usePermission();
  const canEditBilling = canEdit('billing');

  const [invoice,  setInvoice]  = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [showPayModal,  setShowPayModal]  = useState(false);
  const [showSigPanel,  setShowSigPanel]  = useState(false);
  const [payForm, setPayForm] = useState({ amount: '', method: 'cash', reference: '', note: '' });
  const [saving,  setSaving]  = useState(false);

  const loadData = useCallback(async () => {
    const [inv, set] = await Promise.all([
      api.get('/invoices/' + id),
      api.get('/settings'),
    ]);
    setInvoice(inv.data.data);
    setSettings(set.data.data);
  }, [id]);

  useEffect(() => {
    loadData().catch(() => {}).finally(() => setLoading(false));
  }, [loadData]);

  const handlePrint = useReactToPrint({
    content: () => printRef.current,
    documentTitle: invoice ? 'Invoice-' + invoice.invoiceNumber : 'Invoice',
    pageStyle: `
      @page { size: A4 portrait; margin: 6mm; }
      @media print {
        * { -webkit-print-color-adjust: exact !important; print-color-adjust: exact !important; }
        body { margin: 0; }
      }
    `,
  });

  const handlePayment = async () => {
    if (!payForm.amount) return;
    setSaving(true);
    try {
      await api.post('/invoices/' + id + '/payment', { ...payForm, amount: Number(payForm.amount) });
      await loadData();
      setShowPayModal(false);
      setPayForm({ amount: '', method: 'cash', reference: '', note: '' });
    } finally { setSaving(false); }
  };

  const handleSaveSignature = async (field, data) => {
    await api.put('/invoices/' + id + '/signature', { [field]: data });
    setInvoice((inv) => ({ ...inv, [field]: data }));
  };

  if (loading) return <Layout title="Invoice"><div className="loading"><div className="spinner" /></div></Layout>;
  if (!invoice) return <Layout title="Invoice"><div className="alert alert-danger">Invoice not found.</div></Layout>;

  const statusBadge = { paid: 'success', partial: 'warning', pending: 'danger', credit: 'info' };

  return (
    <Layout title={'Invoice — ' + invoice.invoiceNumber}>

      {/* ── Action Bar ── */}
      <div className="no-print" style={{ display: 'flex', gap: 10, marginBottom: 22, flexWrap: 'wrap', alignItems: 'center' }}>
        <Link to="/billing" className="btn btn-secondary btn-sm">&#8592; Back</Link>

        <button className="btn btn-primary" onClick={handlePrint}>
          Print / Download PDF
        </button>

        {/* Edit — only if canEdit billing */}
        {canEditBilling && (
          <Link to={'/billing/edit/' + invoice._id} className="btn btn-secondary">
            Edit Invoice
          </Link>
        )}

        {/* E-Signature toggle — only if canEdit billing */}
        {canEditBilling && (
          <button
            className={`btn ${showSigPanel ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => setShowSigPanel((v) => !v)}
          >
            {invoice.eSignature || invoice.eStamp ? 'Update Signature / Stamp' : 'Add Signature / Stamp'}
          </button>
        )}

        {/* Record Payment — only if canEdit billing */}
        {canEditBilling && invoice.dueAmount > 0 && (
          <button className="btn btn-success" onClick={() => setShowPayModal(true)}>
            Record Payment
          </button>
        )}

        {/* Status badges */}
        <span className={'badge badge-' + (invoice.status === 'draft' ? 'warning' : 'success')}
          style={{ fontSize: 12, padding: '4px 12px' }}>
          {invoice.status === 'draft' ? 'Draft' : 'Final'}
        </span>
        <span className={'badge badge-' + (statusBadge[invoice.paymentStatus] || 'default')}
          style={{ fontSize: 12, padding: '4px 14px' }}>
          {(invoice.paymentStatus || '').toUpperCase()}
        </span>
        {invoice.dueAmount > 0 && (
          <span style={{ color: 'var(--danger)', fontWeight: 700, fontSize: 13 }}>
            Due: {formatCurrency(invoice.dueAmount)}
          </span>
        )}
        {invoice.paidAmount > 0 && (
          <span style={{ color: 'var(--success)', fontWeight: 600, fontSize: 13 }}>
            Paid: {formatCurrency(invoice.paidAmount)}
          </span>
        )}
      </div>

      {/* ── E-Signature & Stamp Panel (toggleable, edit-only) ── */}
      {canEditBilling && showSigPanel && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-header">
            <span className="card-title">E-Signature &amp; E-Stamp</span>
            <button className="btn btn-secondary btn-sm" onClick={() => setShowSigPanel(false)}>Close</button>
          </div>
          <div className="card-body">
            <div style={{ marginBottom: 12, padding: '10px 14px', background: 'var(--info-bg)', borderRadius: 'var(--radius)', fontSize: 13, color: 'var(--info)' }}>
              Draw your signature and stamp below, then click <strong>Save to Invoice</strong> for each. They will appear in the printed PDF.
            </div>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 28 }}>
              <SignatureCanvas
                label="Authorised Signature"
                initial={invoice.eSignature}
                onSave={(data) => handleSaveSignature('eSignature', data)}
              />
              <SignatureCanvas
                label="Company Stamp"
                initial={invoice.eStamp}
                onSave={(data) => handleSaveSignature('eStamp', data)}
              />
            </div>

            {/* Preview of what will appear on invoice */}
            {(invoice.eSignature || invoice.eStamp) && (
              <div style={{ marginTop: 20, padding: '12px 16px', background: 'var(--surface-2)', borderRadius: 'var(--radius)', border: '1px solid var(--border)' }}>
                <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text-muted)', marginBottom: 10, textTransform: 'uppercase', letterSpacing: 0.5 }}>
                  Current saved — appears on invoice PDF:
                </div>
                <div style={{ display: 'flex', gap: 24, alignItems: 'center' }}>
                  {invoice.eSignature && (
                    <div style={{ textAlign: 'center' }}>
                      <img src={invoice.eSignature} alt="signature"
                        style={{ height: 50, maxWidth: 160, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', padding: 4 }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Signature</div>
                    </div>
                  )}
                  {invoice.eStamp && (
                    <div style={{ textAlign: 'center' }}>
                      <img src={invoice.eStamp} alt="stamp"
                        style={{ height: 60, width: 60, objectFit: 'contain', border: '1px solid var(--border)', borderRadius: 4, background: '#fff', padding: 4 }} />
                      <div style={{ fontSize: 11, color: 'var(--text-muted)', marginTop: 4 }}>Stamp</div>
                    </div>
                  )}
                  <div style={{ display: 'flex', gap: 8 }}>
                    {invoice.eSignature && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleSaveSignature('eSignature', '')}>
                        Remove Signature
                      </button>
                    )}
                    {invoice.eStamp && (
                      <button className="btn btn-danger btn-sm" onClick={() => handleSaveSignature('eStamp', '')}>
                        Remove Stamp
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Invoice Preview ── */}
      <div className="card no-print" style={{ marginBottom: 20 }}>
        <div className="card-header">
          <span className="card-title">Invoice — {invoice.invoiceNumber}</span>
          <span style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            {formatDate(invoice.invoiceDate)} &nbsp;&mdash;&nbsp; {invoice.customerName}
          </span>
        </div>
        <div style={{ padding: 24, background: '#f0f3f8', overflowX: 'auto' }}>
          <div style={{ background: '#fff', boxShadow: '0 4px 24px rgba(0,0,0,0.12)', borderRadius: 4, display: 'inline-block', minWidth: '100%' }}>
            <InvoicePrint ref={printRef} invoice={invoice} settings={settings} />
          </div>
        </div>
      </div>

      {/* ── Payment History ── */}
      {invoice.payments?.length > 0 && (
        <div className="card no-print" style={{ marginBottom: 20 }}>
          <div className="card-header"><span className="card-title">Payment History</span></div>
          <div className="table-container">
            <table>
              <thead>
                <tr>
                  <th>#</th><th>Date</th><th>Method</th><th>Reference</th>
                  <th className="text-right">Amount</th><th>Note</th>
                </tr>
              </thead>
              <tbody>
                {invoice.payments.map((p, i) => (
                  <tr key={i}>
                    <td style={{ color: 'var(--text-muted)' }}>{i + 1}</td>
                    <td>{formatDate(p.date)}</td>
                    <td style={{ textTransform: 'capitalize' }}>{p.method}</td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-muted)' }}>{p.reference || '—'}</td>
                    <td className="text-right font-mono" style={{ color: 'var(--success)', fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td style={{ color: 'var(--text-muted)', fontSize: 12 }}>{p.note || '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── Payment Modal ── */}
      {showPayModal && (
        <div className="modal-overlay" onClick={() => setShowPayModal(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <span className="modal-title">Record Payment</span>
              <button className="btn btn-secondary btn-sm" onClick={() => setShowPayModal(false)}>Close</button>
            </div>
            <div className="modal-body">
              <div style={{ background: 'var(--danger-bg)', borderRadius: 8, padding: '12px 16px', marginBottom: 16 }}>
                <strong style={{ color: 'var(--danger)', fontSize: 14 }}>Due: {formatCurrency(invoice.dueAmount)}</strong>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label className="form-label">Amount Received</label>
                  <input className="form-control" type="number" min={0} step={0.01}
                    value={payForm.amount}
                    onChange={(e) => setPayForm((f) => ({ ...f, amount: e.target.value }))}
                    placeholder={invoice.dueAmount} autoFocus />
                </div>
                <div className="form-group">
                  <label className="form-label">Method</label>
                  <select className="form-control" value={payForm.method} onChange={(e) => setPayForm((f) => ({ ...f, method: e.target.value }))}>
                    {['cash','upi','card','bank','cheque'].map((m) => <option key={m}>{m}</option>)}
                  </select>
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Reference / Transaction ID</label>
                <input className="form-control" value={payForm.reference}
                  onChange={(e) => setPayForm((f) => ({ ...f, reference: e.target.value }))}
                  placeholder="UPI ref, cheque no..." />
              </div>
              <div className="form-group">
                <label className="form-label">Note</label>
                <input className="form-control" value={payForm.note}
                  onChange={(e) => setPayForm((f) => ({ ...f, note: e.target.value }))} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPayModal(false)}>Cancel</button>
              <button className="btn btn-success" onClick={handlePayment} disabled={saving || !payForm.amount}>
                {saving ? 'Saving...' : 'Save Payment'}
              </button>
            </div>
          </div>
        </div>
      )}
    </Layout>
  );
}
