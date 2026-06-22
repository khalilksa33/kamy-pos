import React, { useEffect, useState } from 'react';
import { X, Printer, CheckCircle } from 'lucide-react';
import QRCode from 'qrcode';

// Helper to encode TLV (Tag-Length-Value) for Saudi ZATCA e-invoicing Phase 1 compliance
function generateZatcaTlvBase64(sellerName, trn, timestamp, total, vatAmount) {
  try {
    const encoder = new TextEncoder();
    
    const getTlv = (tag, value) => {
      const valBytes = encoder.encode(value.toString());
      const tagByte = tag;
      const lenByte = valBytes.length;
      
      const buf = new Uint8Array(2 + lenByte);
      buf[0] = tagByte;
      buf[1] = lenByte;
      buf.set(valBytes, 2);
      return buf;
    };

    // Tag 1: Seller Name
    const tlv1 = getTlv(1, sellerName);
    // Tag 2: VAT Registration Number (15 digits)
    const tlv2 = getTlv(2, trn || '312345678900003');
    // Tag 3: Timestamp (ISO 8601 string)
    const tlv3 = getTlv(3, timestamp);
    // Tag 4: Invoice Total (with VAT)
    const tlv4 = getTlv(4, total.toString());
    // Tag 5: VAT Total
    const tlv5 = getTlv(5, vatAmount.toString());

    // Join all TLV buffers
    const totalLen = tlv1.length + tlv2.length + tlv3.length + tlv4.length + tlv5.length;
    const combined = new Uint8Array(totalLen);
    let offset = 0;
    [tlv1, tlv2, tlv3, tlv4, tlv5].forEach(arr => {
      combined.set(arr, offset);
      offset += arr.length;
    });

    // Base64 encoding
    let binary = '';
    const len = combined.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(combined[i]);
    }
    return window.btoa(binary);
  } catch (err) {
    console.error("ZATCA TLV encoding failed", err);
    return '';
  }
}

function ReceiptModal({ isOpen, onClose, transaction, store }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    if (!isOpen) return;

    if (store.zatca?.onboarded && store.zatca?.privateKeyPem) {
      window.api.zatcaSignInvoice(transaction, store, store.zatca.binarySecurityToken, store.zatca.privateKeyPem)
        .then(res => {
          QRCode.toDataURL(res.qrBase64, { width: 140, margin: 1 })
            .then(url => setQrUrl(url))
            .catch(err => console.error("Error creating Phase 2 QR Code", err));
        })
        .catch(err => {
          console.error("ZATCA Phase 2 signing failed, falling back to Phase 1", err);
          fallbackToPhase1();
        });
    } else {
      fallbackToPhase1();
    }

    function fallbackToPhase1() {
      const zatcaBase64 = generateZatcaTlvBase64(
        store.name,
        store.vatNumber,
        transaction.date,
        transaction.total,
        transaction.tax
      );
      QRCode.toDataURL(zatcaBase64, { width: 140, margin: 1 })
        .then(url => setQrUrl(url))
        .catch(err => console.error("Error creating QR Code", err));
    }
  }, [isOpen, transaction, store]);

  if (!isOpen) return null;

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>Receipt ${transaction.id}</title>
          <style>
            body { font-family: monospace; padding: 20px; color: #000; width: 280px; margin: 0 auto; font-size: 11px; }
            .text-center { text-align: center; }
            .bold { font-weight: bold; }
            .divider { border-top: 1px dashed #000; margin: 10px 0; }
            .item-row { display: flex; justify-content: space-between; margin-bottom: 4px; }
            .receipt-header { margin-bottom: 12px; }
            .qr-container { display: flex; justify-content: center; margin: 15px 0; }
            .qr-image { width: 120px; height: 120px; }
          </style>
        </head>
        <body onload="window.print(); window.close();">
          <div class="text-center receipt-header">
            ${store.logo ? `<img src="${store.logo}" style="max-width: 80px; max-height: 80px; margin-bottom: 6px; object-fit: contain;" /><br/>` : ''}
            <h3 style="margin: 0; font-size: 14px;">${store.name}</h3>
            <div>${store.address}</div>
            <div>VAT Registration No: ${store.vatNumber || '312345678900003'}</div>
            <div>Tel: ${store.phone}</div>
          </div>
          <div class="divider"></div>
          <div>Date/الوقت: ${new Date(transaction.date).toLocaleString()}</div>
          <div>Receipt/رقم الفاتورة: ${transaction.id}</div>
          <div>Cashier/الكاشير: ${transaction.cashier}</div>
          <div class="divider"></div>
          ${transaction.items.map(item => {
            const displayName = item.nameAr ? `${item.nameAr} / ${item.nameEn}` : item.name;
            return `
              <div class="item-row">
                <span>${displayName} (x${item.quantity})</span>
                <span>${store.currency} ${(item.price * item.quantity).toFixed(2)}</span>
              </div>
            `;
          }).join('')}
          <div class="divider"></div>
          <div class="item-row">
            <span>Subtotal (Excl. VAT):</span>
            <span>${store.currency} ${transaction.subtotal.toFixed(2)}</span>
          </div>
          ${transaction.discount > 0 ? `
            <div class="item-row">
              <span>Discount:</span>
              <span>-${store.currency} ${transaction.discount.toFixed(2)}</span>
            </div>
          ` : ''}
          <div class="item-row">
            <span>VAT / ضريبة القيمة المضافة (${store.taxRate}%):</span>
            <span>${store.currency} ${transaction.tax.toFixed(2)}</span>
          </div>
          <div class="item-row bold" style="font-size: 13px;">
            <span>Total (Incl. VAT):</span>
            <span>${store.currency} ${transaction.total.toFixed(2)}</span>
          </div>
          <div class="divider"></div>
          <div class="item-row">
            <span>Payment Mode:</span>
            <span style="text-transform: capitalize;">${transaction.paymentMode}</span>
          </div>
          <div class="item-row">
            <span>Amount Paid:</span>
            <span>${store.currency} ${transaction.cashReceived.toFixed(2)}</span>
          </div>
          <div class="item-row">
            <span>Change Due:</span>
            <span>${store.currency} ${transaction.changeDue.toFixed(2)}</span>
          </div>
          
          <div class="divider"></div>
          
          <!-- ZATCA QR Code -->
          <div class="qr-container">
            ${qrUrl ? `<img class="qr-image" src="${qrUrl}" />` : ''}
          </div>
          
          <div class="text-center" style="font-size: 9px; color: #555;">
            ${store.receiptFooter}
          </div>
        </body>
      </html>
    `);
    printWindow.document.close();
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      width: '100vw',
      height: '100vh',
      backgroundColor: 'rgba(5, 7, 12, 0.85)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
      backdropFilter: 'blur(4px)'
    }}>
      <div style={{
        backgroundColor: 'var(--bg-card)',
        borderRadius: '16px',
        border: '1px solid var(--border-color)',
        width: '400px',
        maxHeight: '90vh',
        display: 'flex',
        flexDirection: 'column',
        boxShadow: 'var(--shadow-xl)',
        animation: 'fadeIn 0.2s cubic-bezier(0.16, 1, 0.3, 1) forwards'
      }}>
        {/* Modal Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--accent-emerald)' }}>
            <CheckCircle size={18} />
            <span style={{ fontWeight: '700', fontSize: '1rem' }}>E-Invoice Compliance (ZATCA)</span>
          </div>
          <button onClick={onClose} style={{ background: 'none', color: 'var(--text-secondary)' }}>
            <X size={18} />
          </button>
        </div>

        {/* Modal Body: Thermal Receipt View */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '24px', display: 'flex', justifyContent: 'center', alignItems: 'flex-start', backgroundColor: 'var(--bg-app)' }}>
          
          {/* Thermal Slip Card */}
          <div style={{
            width: '100%',
            backgroundColor: '#ffffff',
            color: '#1f2937',
            padding: '24px',
            borderRadius: '4px',
            boxShadow: '0 4px 10px rgba(0, 0, 0, 0.05)',
            fontFamily: 'var(--font-mono)',
            fontSize: '0.8rem'
          }}>
            <div style={{ textAlign: 'center', marginBottom: '16px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '6px' }}>
              {store.logo && (
                <img src={store.logo} alt="Store Logo" style={{ maxWidth: '80px', maxHeight: '80px', objectFit: 'contain' }} />
              )}
              <h3 style={{ fontSize: '1rem', fontWeight: '800', margin: 0, letterSpacing: '-0.025em', color: '#111827' }}>{store.name}</h3>
              <p style={{ margin: '4px 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>{store.address}</p>
              <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '0.75rem', fontWeight: 'bold' }}>VAT No: {store.vatNumber || '312345678900003'}</p>
              <p style={{ margin: '2px 0 0 0', color: '#6b7280', fontSize: '0.75rem' }}>Tel: {store.phone}</p>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#4b5563' }}>
              <div>Date: {new Date(transaction.date).toLocaleString()}</div>
              <div>Receipt ID: {transaction.id}</div>
              <div>Cashier: {transaction.cashier}</div>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            {/* Receipt items list */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              {transaction.items.map(item => {
                const displayName = item.nameAr ? `${item.nameAr} / ${item.nameEn}` : item.name;
                return (
                  <div key={item.id} style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{displayName} x{item.quantity}</span>
                    <span>{store.currency} {(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Subtotal (Excl. VAT)</span>
                <span>{store.currency} {transaction.subtotal.toFixed(2)}</span>
              </div>
              {transaction.discount > 0 && (
                <div style={{ display: 'flex', justifyContent: 'space-between', color: '#dc2626' }}>
                  <span>Discount</span>
                  <span>-{store.currency} {transaction.discount.toFixed(2)}</span>
                </div>
              )}
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>VAT ({store.taxRate}%)</span>
                <span>{store.currency} {transaction.tax.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '800', fontSize: '0.95rem', color: '#111827', marginTop: '4px' }}>
                <span>Grand Total</span>
                <span>{store.currency} {transaction.total.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px', color: '#4b5563' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Payment Mode</span>
                <span style={{ textTransform: 'capitalize' }}>{transaction.paymentMode}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span>Amount Paid</span>
                <span>{store.currency} {transaction.cashReceived.toFixed(2)}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: '600' }}>
                <span>Change Due</span>
                <span>{store.currency} {transaction.changeDue.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            {/* ZATCA QR Code Display */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', margin: '12px 0' }}>
              {qrUrl ? (
                <img src={qrUrl} alt="ZATCA E-Invoice QR Code" style={{ width: '120px', height: '120px' }} />
              ) : (
                <div style={{ width: '120px', height: '120px', backgroundColor: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#9ca3af', fontSize: '0.75rem' }}>Generating QR...</div>
              )}
              <span style={{ fontSize: '0.65rem', color: '#6b7280', fontWeight: '600' }}>FATOORAH COMPLIANT / فاتورة إلكترونية</span>
            </div>

            <div style={{ borderTop: '1px dashed #d1d5db', margin: '12px 0' }} />

            <div style={{ textAlign: 'center', color: '#6b7280', fontSize: '0.75rem', marginTop: '10px' }}>
              {store.receiptFooter}
            </div>
          </div>

        </div>

        {/* Modal Footer Controls */}
        <div style={{
          padding: '16px 20px',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          gap: '12px'
        }}>
          <button
            onClick={handlePrint}
            className="btn-primary"
            style={{ flex: 1, padding: '12px' }}
          >
            <Printer size={16} />
            <span>Print Receipt</span>
          </button>
          <button
            onClick={onClose}
            className="btn-secondary"
            style={{ padding: '12px 20px' }}
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}

export default ReceiptModal;
