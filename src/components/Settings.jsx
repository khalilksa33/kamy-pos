import React, { useState } from 'react';
import { Save, Download, Upload, RefreshCw, HelpCircle, Trash2, UserPlus } from 'lucide-react';

function Settings({ db, updateDb, currentUser, t }) {
  const [name, setName] = useState(db.store.name);
  const [address, setAddress] = useState(db.store.address);
  const [phone, setPhone] = useState(db.store.phone);
  const [taxRate, setTaxRate] = useState(db.store.taxRate.toString());
  const [currency, setCurrency] = useState(db.store.currency);
  const [receiptFooter, setReceiptFooter] = useState(db.store.receiptFooter);
  const [vatNumber, setVatNumber] = useState(db.store.vatNumber || '');
  const [logo, setLogo] = useState(db.store.logo || '');

  // ZATCA Phase 2 States
  const [zatcaOnboarded, setZatcaOnboarded] = useState(db.store.zatca?.onboarded || false);
  const [zatcaCN, setZatcaCN] = useState(db.store.zatca?.commonName || 'Device-01');
  const [zatcaSN, setZatcaSN] = useState(db.store.zatca?.serialNumber || '1-Device|2-2343|3-alassai');
  const [zatcaOU, setZatcaOU] = useState(db.store.zatca?.organizationUnit || 'Alali');
  const [zatcaO, setZatcaO] = useState(db.store.zatca?.organizationName || db.store.name);
  const [zatcaInvoiceType, setZatcaInvoiceType] = useState(db.store.zatca?.invoiceType || '1100');
  const [zatcaBuilding, setZatcaBuilding] = useState(db.store.zatca?.buildingNumber || '00001');
  const [zatcaStreet, setZatcaStreet] = useState(db.store.zatca?.streetName || 'King Fahd Road');
  const [zatcaPostal, setZatcaPostal] = useState(db.store.zatca?.postalCode || '12211');
  const [zatcaCity, setZatcaCity] = useState(db.store.zatca?.city || 'Riyadh');
  const [zatcaRegion, setZatcaRegion] = useState(db.store.zatca?.region || 'Riyadh Province');
  const [zatcaOtp, setZatcaOtp] = useState('');

  // Cryptographic fields
  const [csrPem, setCsrPem] = useState(db.store.zatca?.csrPem || '');
  const [privateKeyPem, setPrivateKeyPem] = useState(db.store.zatca?.privateKeyPem || '');
  const [certPem, setCertPem] = useState(db.store.zatca?.binarySecurityToken || '');
  const [secretKey, setSecretKey] = useState(db.store.zatca?.secret || '');
  const [isOnboarding, setIsOnboarding] = useState(false);

  const handleGenerateCsr = async () => {
    try {
      const keys = await window.api.zatcaGenerateKeys();
      setPrivateKeyPem(keys.privateKeyPem);

      const params = {
        commonName: zatcaCN,
        serialNumber: zatcaSN,
        organizationUnit: zatcaOU,
        organizationName: zatcaO,
        vatNumber: vatNumber || db.store.vatNumber,
        buildingNumber: zatcaBuilding,
        streetName: zatcaStreet,
        postalCode: zatcaPostal,
        city: zatcaCity,
        region: zatcaRegion,
        invoiceType: zatcaInvoiceType
      };

      const csr = await window.api.zatcaGenerateCsr(params, keys);
      setCsrPem(csr);
      alert("CSR and Private Key generated successfully!");
    } catch (err) {
      alert("CSR Generation Failed: " + err.message);
    }
  };

  const handleOnboard = async () => {
    if (!zatcaOtp) {
      alert("Please enter the ZATCA OTP generated from Fatoora Portal.");
      return;
    }
    if (!csrPem) {
      alert("Please generate CSR first.");
      return;
    }

    setIsOnboarding(true);
    try {
      const res = await window.api.zatcaOnboard(zatcaOtp, csrPem);
      setIsOnboarding(false);

      if (res.success) {
        setCertPem(res.binarySecurityToken);
        setSecretKey(res.secret);
        setZatcaOnboarded(true);

        const updatedDb = {
          ...db,
          store: {
            ...db.store,
            zatca: {
              onboarded: true,
              commonName: zatcaCN,
              serialNumber: zatcaSN,
              organizationUnit: zatcaOU,
              organizationName: zatcaO,
              invoiceType: zatcaInvoiceType,
              buildingNumber: zatcaBuilding,
              streetName: zatcaStreet,
              postalCode: zatcaPostal,
              city: zatcaCity,
              region: zatcaRegion,
              csrPem: csrPem,
              privateKeyPem: privateKeyPem,
              binarySecurityToken: res.binarySecurityToken,
              secret: res.secret
            }
          }
        };
        updateDb(updatedDb);
        alert("Device onboarded successfully with ZATCA Sandbox!");
      } else {
        alert("Onboarding Failed: " + res.error);
      }
    } catch (err) {
      setIsOnboarding(false);
      alert("Onboarding Error: " + err.message);
    }
  };

  const handleLogoChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      setLogo(event.target.result);
    };
    reader.readAsDataURL(file);
  };

  // Payment settings states
  const [payType, setPayType] = useState(db.store.paymentSettings?.type || 'simulated');
  const [payIp, setPayIp] = useState(db.store.paymentSettings?.ip || '192.168.1.150');
  const [payPort, setPayPort] = useState(db.store.paymentSettings?.port || '8090');

  // Operator states
  const [newUsername, setNewUsername] = useState('');
  const [newName, setNewName] = useState('');
  const [newRole, setNewRole] = useState('Cashier');

  const handleAddOperator = (e) => {
    e.preventDefault();
    if (!newUsername.trim() || !newName.trim()) {
      alert("Please fill in all operator fields.");
      return;
    }
    if (db.users.some(u => u.username.toLowerCase() === newUsername.trim().toLowerCase())) {
      alert("Username already exists.");
      return;
    }
    const updatedUsers = [
      ...db.users,
      { username: newUsername.trim().toLowerCase(), name: newName.trim(), role: newRole }
    ];
    updateDb({ ...db, users: updatedUsers });
    setNewUsername('');
    setNewName('');
    setNewRole('Cashier');
  };

  const handleDeleteOperator = (username) => {
    if (username === currentUser.username) {
      alert("Cannot delete the currently logged in operator.");
      return;
    }
    if (db.users.length <= 1) {
      alert("At least one operator must remain in the system.");
      return;
    }
    if (confirm(`Are you sure you want to delete operator ${username}?`)) {
      const updatedUsers = db.users.filter(u => u.username !== username);
      updateDb({ ...db, users: updatedUsers });
    }
  };

  const handleSaveStore = (e) => {
    e.preventDefault();
    const taxNum = parseFloat(taxRate);
    if (isNaN(taxNum)) {
      alert("Invalid tax rate value.");
      return;
    }

    const updatedDb = {
      ...db,
      store: {
        name,
        address,
        phone,
        taxRate: taxNum,
        currency,
        receiptFooter,
        vatNumber,
        logo,
        paymentSettings: {
          type: payType,
          ip: payIp,
          port: payPort
        }
      }
    };

    updateDb(updatedDb);
    alert("Store settings saved successfully!");
  };

  // Export JSON Database
  const handleExport = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `pos-backup-${Date.now()}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Import JSON Database
  const handleImport = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const importedData = JSON.parse(event.target.result);
        if (importedData.store && importedData.products && importedData.transactions) {
          updateDb(importedData);
          
          setName(importedData.store.name);
          setAddress(importedData.store.address);
          setPhone(importedData.store.phone);
          setTaxRate(importedData.store.taxRate.toString());
          setCurrency(importedData.store.currency);
          setReceiptFooter(importedData.store.receiptFooter);
          setVatNumber(importedData.store.vatNumber || '');
          setLogo(importedData.store.logo || '');
          setPayType(importedData.store.paymentSettings?.type || 'simulated');
          setPayIp(importedData.store.paymentSettings?.ip || '192.168.1.150');
          setPayPort(importedData.store.paymentSettings?.port || '8090');

          alert("Database imported successfully!");
        } else {
          alert("Invalid backup file. Required keys (store, products, transactions) are missing.");
        }
      } catch (err) {
        alert("Failed to parse JSON file: " + err.message);
      }
    };
    reader.readAsText(file);
  };

  // Reset to Factory defaults
  const handleReset = () => {
    if (confirm("WARNING: This will delete all products, sales history, and store details. Are you sure you want to proceed?")) {
      localStorage.removeItem('pos_db');
      window.location.reload();
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }} className="animate-fade-in">
      
      {/* Header Info */}
      <div>
        <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>{t.settings}</h2>
        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inventorySub}</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: '20px', alignItems: 'flex-start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          {/* Left Card: Store Profile Form */}
          <form
          onSubmit={handleSaveStore}
          style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}
        >
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700', borderBottom: '1px solid var(--border-color)', paddingBottom: '10px' }}>{t.storeProfile}</h3>
          
          {/* Store Name */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.storeName}</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>

          {/* Store Logo */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>Store Logo (Receipt Logo)</label>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
              {logo ? (
                <div style={{ position: 'relative' }}>
                  <img src={logo} alt="Store Logo" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'contain', border: '1px solid var(--border-color)', backgroundColor: '#fff' }} />
                  <button
                    type="button"
                    onClick={() => setLogo('')}
                    style={{ position: 'absolute', top: '-6px', right: '-6px', backgroundColor: 'var(--accent-rose)', color: '#fff', borderRadius: '50%', width: '18px', height: '18px', fontSize: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                  >
                    ×
                  </button>
                </div>
              ) : (
                <div style={{ width: '60px', height: '60px', borderRadius: '8px', border: '1px dashed var(--border-color)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                  No Logo
                </div>
              )}
              <label className="btn-secondary" style={{ padding: '8px 14px', fontSize: '0.8rem', cursor: 'pointer' }}>
                <span>Upload Logo</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Store Address */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.storeAddress}</label>
            <input
              type="text"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              required
            />
          </div>

          {/* Phone & Tax Rate */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.storePhone}</label>
              <input
                type="text"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                required
              />
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.taxRate}</label>
              <input
                type="number"
                step="0.01"
                value={taxRate}
                onChange={(e) => setTaxRate(e.target.value)}
                required
              />
            </div>
          </div>

          {/* ZATCA VAT Registration number (TRN) */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.vatTRN}</label>
            <input
              type="text"
              placeholder="312345678900003"
              value={vatNumber}
              onChange={(e) => setVatNumber(e.target.value)}
              required
            />
          </div>

          {/* Currency Symbol */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.currencySymbol}</label>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="SAR">SAR (ر.س)</option>
              <option value="$">USD ($)</option>
              <option value="€">EUR (€)</option>
              <option value="£">GBP (£)</option>
              <option value="¥">JPY (¥)</option>
              <option value="₹">INR (₹)</option>
              <option value="₪">ILS (₪)</option>
            </select>
          </div>

          {/* Card Terminal Integration Type */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', borderTop: '1px solid var(--border-color)', paddingTop: '14px', marginTop: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{t.awaitingTerminal}</label>
            <select
              value={payType}
              onChange={(e) => setPayType(e.target.value)}
              style={{ width: '100%' }}
            >
              <option value="simulated">Simulated (Immediate Approval)</option>
              <option value="tcp">Mada Card Terminal (SAMA TCP/IP standard)</option>
            </select>
          </div>

          {/* Conditional TCP IP/Port settings */}
          {payType === 'tcp' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Mada Terminal IP</label>
                <input
                  type="text"
                  placeholder="e.g. 192.168.1.150"
                  value={payIp}
                  onChange={(e) => setPayIp(e.target.value)}
                  required
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Port</label>
                <input
                  type="number"
                  placeholder="8090"
                  value={payPort}
                  onChange={(e) => setPayPort(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          {/* Receipt Footer */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
            <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.receiptFooter}</label>
            <textarea
              rows="3"
              value={receiptFooter}
              onChange={(e) => setReceiptFooter(e.target.value)}
              required
              style={{ fontFamily: 'var(--font-sans)', resize: 'vertical' }}
            />
          </div>

          <button type="submit" className="btn-primary" style={{ padding: '12px', marginTop: '8px' }}>
            <Save size={16} />
            <span>{t.saveConfiguration}</span>
          </button>
        </form>

        {/* ZATCA Phase 2 Integration Card */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '24px',
          display: 'flex',
          flexDirection: 'column',
          gap: '20px'
        }}>
          <div>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>ZATCA Phase 2 Integration (الربط مع الهيئة)</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Onboard your POS device to ZATCA Core/Compliance system to start cryptographic invoice reporting.</p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Input Data Section (إدخال البيانات) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-emerald)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>1. Device & Registration Data</h4>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Common Name (الاسم الشائع)</label>
                <input type="text" value={zatcaCN} onChange={(e) => setZatcaCN(e.target.value)} placeholder="e.g. Device-01" />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Serial Number (الرقم التسلسلي للوحدة)</label>
                <input type="text" value={zatcaSN} onChange={(e) => setZatcaSN(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Registered Name (اسم المؤسسة)</label>
                <input type="text" value={zatcaO} onChange={(e) => setZatcaO(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Unit Name / Department (اسم الوحدة)</label>
                <input type="text" value={zatcaOU} onChange={(e) => setZatcaOU(e.target.value)} />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Common Invoice Type (نوع الفاتورة)</label>
                <select value={zatcaInvoiceType} onChange={(e) => setZatcaInvoiceType(e.target.value)}>
                  <option value="1100">Simplified & Standard Invoices (B2C & B2B)</option>
                  <option value="1000">Standard Invoices Only (B2B)</option>
                  <option value="0100">Simplified Invoices Only (B2C)</option>
                </select>
              </div>
            </div>

            {/* Address Details (تفاصيل العنوان) */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-emerald)', borderBottom: '1px solid var(--border-color)', paddingBottom: '6px' }}>Address Details</h4>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Building No. (رقم المبنى)</label>
                  <input type="text" value={zatcaBuilding} onChange={(e) => setZatcaBuilding(e.target.value)} placeholder="0000" />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Postal Code (الرمز البريدي)</label>
                  <input type="text" value={zatcaPostal} onChange={(e) => setZatcaPostal(e.target.value)} placeholder="12345" />
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Street Name (اسم الشارع)</label>
                <input type="text" value={zatcaStreet} onChange={(e) => setZatcaStreet(e.target.value)} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>City (المدينة)</label>
                  <input type="text" value={zatcaCity} onChange={(e) => setZatcaCity(e.target.value)} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Region (المنطقة)</label>
                  <input type="text" value={zatcaRegion} onChange={(e) => setZatcaRegion(e.target.value)} />
                </div>
              </div>

              <button type="button" onClick={handleGenerateCsr} className="btn-secondary" style={{ padding: '10px', marginTop: 'auto' }}>
                Generate Keys & CSR
              </button>
            </div>
          </div>

          {/* CSR / Keys Output (Visual feedback) */}
          {csrPem && (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', borderTop: '1px solid var(--border-color)', paddingTop: '16px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Certificate Signing Request (CSR)</label>
                <textarea readOnly value={csrPem} rows={4} style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--bg-app)' }} />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Generated Private Key (Secp256r1/RSA)</label>
                <textarea readOnly value={privateKeyPem} rows={4} style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--bg-app)' }} />
              </div>
            </div>
          )}

          {/* Onboarding section (الربط مع الهيئة) */}
          <div style={{
            borderTop: '1px solid var(--border-color)',
            paddingTop: '16px',
            display: 'flex',
            flexDirection: 'column',
            gap: '12px'
          }}>
            <h4 style={{ fontSize: '0.9rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>2. ZATCA Compliance Onboarding</h4>
            
            <div style={{ display: 'flex', gap: '12px', alignItems: 'flex-end' }}>
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '4px' }}>
                <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Onboarding OTP (رمز التحقق من البوابة)</label>
                <input 
                  type="text" 
                  value={zatcaOtp} 
                  onChange={(e) => setZatcaOtp(e.target.value)} 
                  placeholder="e.g. 123456" 
                  disabled={zatcaOnboarded}
                />
              </div>
              <button 
                type="button" 
                onClick={handleOnboard} 
                className="btn-primary" 
                style={{ padding: '10px 24px', height: '38px' }}
                disabled={zatcaOnboarded || isOnboarding}
              >
                {isOnboarding ? 'Onboarding...' : zatcaOnboarded ? 'Device Onboarded ✓' : 'Register with ZATCA'}
              </button>
            </div>

            {zatcaOnboarded && (
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '8px' }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Signed Cryptographic Certificate (CSID)</label>
                  <textarea readOnly value={certPem} rows={3} style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', color: 'var(--accent-emerald)' }} />
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <label style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>API Authentication Secret Key</label>
                  <textarea readOnly value={secretKey} rows={3} style={{ fontSize: '0.75rem', fontFamily: 'monospace', backgroundColor: 'var(--bg-app)', color: 'var(--accent-emerald)' }} />
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

        {/* Right Pane: System Utilities */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Cashier & Operator Management Card */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.manageOperators}</h3>
            
            {/* Operator List */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', maxHeight: '160px', overflowY: 'auto' }}>
              {db.users.map(user => (
                <div key={user.username} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '8px 12px',
                  backgroundColor: 'var(--bg-app)',
                  borderRadius: '8px',
                  border: '1px solid var(--border-color)',
                  fontSize: '0.85rem'
                }}>
                  <div>
                    <span style={{ fontWeight: '700' }}>{user.name}</span>
                    <span style={{ color: 'var(--text-secondary)', marginLeft: '6px' }}>({user.role === 'Cashier' ? t.cash : user.role})</span>
                    <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>@{user.username}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteOperator(user.username)}
                    style={{ background: 'none', color: 'var(--accent-rose)', padding: '4px' }}
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>

            {/* Add Operator Inline Form */}
            <form onSubmit={handleAddOperator} style={{
              borderTop: '1px solid var(--border-color)',
              paddingTop: '12px',
              display: 'flex',
              flexDirection: 'column',
              gap: '10px'
            }}>
              <div style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>{t.addOperator}</div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                <input
                  type="text"
                  placeholder={t.username}
                  value={newUsername}
                  onChange={(e) => setNewUsername(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                  required
                />
                <input
                  type="text"
                  placeholder={t.fullName}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  style={{ padding: '6px 10px', fontSize: '0.8rem', height: '32px' }}
                  required
                />
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  style={{ flex: 1, padding: '4px 8px', fontSize: '0.8rem', height: '32px' }}
                >
                  <option value="Cashier">{t.cash}</option>
                  <option value="Manager">Manager</option>
                </select>
                <button type="submit" className="btn-primary" style={{ padding: '0 12px', height: '32px', fontSize: '0.8rem' }}>
                  <UserPlus size={14} />
                  <span>{t.add}</span>
                </button>
              </div>
            </form>
          </div>

          {/* Database Backup Section */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.dbBackupUtility}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.dbBackupSub}</p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {/* Export */}
              <button type="button" onClick={handleExport} className="btn-secondary" style={{ width: '100%', padding: '10px' }}>
                <Download size={14} />
                <span>{t.exportDB}</span>
              </button>

              {/* Import Input */}
              <label className="btn-secondary" style={{
                padding: '10px',
                cursor: 'pointer',
                textAlign: 'center',
                display: 'inline-flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%'
              }}>
                <Upload size={14} />
                <span>{t.importDB}</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImport}
                  style={{ display: 'none' }}
                />
              </label>
            </div>
          </div>

          {/* Reset Card */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700', color: 'var(--accent-rose)' }}>{t.systemDiagnostics}</h3>
            <p style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{t.systemDiagnosticsSub}</p>
            
            <button type="button" onClick={handleReset} className="btn-danger" style={{ width: '100%', padding: '10px' }}>
              <RefreshCw size={14} />
              <span>{t.factoryReset}</span>
            </button>
          </div>

        </div>

      </div>

    </div>
  );
}

export default Settings;
