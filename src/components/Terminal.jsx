import React, { useState, useEffect, useRef } from 'react';
import { Search, ShoppingCart, Trash2, Plus, Minus, CreditCard, DollarSign, Smartphone, Check, Percent } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

function Terminal({ db, updateDb, currentUser, t, lang }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [cart, setCart] = useState([]);
  const [discountPercent, setDiscountPercent] = useState(0);
  const [paymentMode, setPaymentMode] = useState('cash'); // cash, card, mobile
  const [cashReceived, setCashReceived] = useState('');
  const [showReceipt, setShowReceipt] = useState(false);
  const [lastTransaction, setLastTransaction] = useState(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  const barcodeInputRef = useRef(null);

  // Focus barcode input on mount
  useEffect(() => {
    if (barcodeInputRef.current) {
      barcodeInputRef.current.focus();
    }
  }, []);

  const categories = ['All', ...new Set(db.products.map(p => p.category))];

  // Filtered Products
  const filteredProducts = db.products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          product.sku.includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  // Handle SKU Auto-add (Simulate Barcode Scanner)
  const handleBarcodeSubmit = (e) => {
    e.preventDefault();
    const cleanSku = searchQuery.trim();
    if (!cleanSku) return;

    const product = db.products.find(p => p.sku === cleanSku || p.sku.toLowerCase() === cleanSku.toLowerCase());
    if (product) {
      addToCart(product);
      setSearchQuery('');
    }
  };

  // Add Item to Cart
  const addToCart = (product) => {
    if (Number(product.stock) <= 0) {
      alert(lang === 'ar' ? `المنتج ${product.name} غير متوفر في المخزون!` : `Cannot add ${product.name}. Out of stock!`);
      return;
    }

    setCart(prevCart => {
      const existing = prevCart.find(item => item.id === product.id);
      if (existing) {
        if (existing.quantity >= Number(product.stock)) {
          alert(lang === 'ar' ? `المتبقي في المخزون ${product.stock} حبة فقط.` : `Only ${product.stock} units of ${product.name} are available.`);
          return prevCart;
        }
        return prevCart.map(item => 
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prevCart, { ...product, quantity: 1 }];
    });
  };

  // Update Cart Quantity
  const updateQuantity = (productId, amount) => {
    const product = db.products.find(p => p.id === productId);
    setCart(prevCart => {
      return prevCart.map(item => {
        if (item.id === productId) {
          const nextQty = item.quantity + amount;
          if (nextQty <= 0) return null;
          if (product && nextQty > Number(product.stock)) {
            alert(lang === 'ar' ? `المتبقي في المخزون ${product.stock} حبة فقط.` : `Only ${product.stock} units available.`);
            return item;
          }
          return { ...item, quantity: nextQty };
        }
        return item;
      }).filter(Boolean);
    });
  };

  // Remove Item from Cart
  const removeItem = (productId) => {
    setCart(prevCart => prevCart.filter(item => item.id !== productId));
  };

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercent / 100);
  const taxableAmount = subtotal - discountAmount;
  const taxAmount = taxableAmount * (db.store.taxRate / 100);
  const total = taxableAmount + taxAmount;

  const changeDue = cashReceived ? Math.max(0, parseFloat(cashReceived) - total) : 0;

  // Checkout process
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    if (paymentMode === 'cash' && (!cashReceived || parseFloat(cashReceived) < total)) {
      alert(lang === 'ar' ? "المبلغ المستلم غير كافي." : "Insufficient cash received.");
      return;
    }

    // Trigger physical terminal for Card/Mobile payments
    if (paymentMode === 'card' || paymentMode === 'mobile') {
      setIsProcessingPayment(true);
      const settings = db.store.paymentSettings || { type: 'simulated' };
      
      let response = { success: true };
      if (window.api && window.api.processPayment) {
        try {
          response = await window.api.processPayment({ amount: total, settings });
        } catch (err) {
          response = { success: false, error: err.message };
        }
      } else {
        await new Promise(resolve => setTimeout(resolve, 1500));
      }

      setIsProcessingPayment(false);

      if (!response.success) {
        alert(lang === 'ar' ? `خطأ في جهاز مدى: ${response.error}` : `Mada Terminal Error: ${response.error}`);
        return;
      }
    }

    // Generate Transaction Record
    const transactionId = "TXN-" + Date.now().toString().slice(-8);
    const newTransaction = {
      id: transactionId,
      date: new Date().toISOString(),
      cashier: currentUser.name,
      items: cart.map(item => ({
        id: item.id,
        name: item.name,
        nameEn: item.nameEn,
        nameAr: item.nameAr,
        price: item.price,
        quantity: item.quantity
      })),
      subtotal: parseFloat(subtotal.toFixed(2)),
      discount: parseFloat(discountAmount.toFixed(2)),
      tax: parseFloat(taxAmount.toFixed(2)),
      total: parseFloat(total.toFixed(2)),
      paymentMode,
      cashReceived: paymentMode === 'cash' ? parseFloat(cashReceived) : total,
      changeDue: paymentMode === 'cash' ? parseFloat(changeDue.toFixed(2)) : 0
    };

    // Update Product Stock in database
    const updatedProducts = db.products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        return {
          ...product,
          stock: Math.max(0, Number(product.stock) - Number(cartItem.quantity))
        };
      }
      return product;
    });

    const updatedDb = {
      ...db,
      products: updatedProducts,
      transactions: [newTransaction, ...db.transactions]
    };

    updateDb(updatedDb);
    setLastTransaction(newTransaction);
    setShowReceipt(true);

    // Reset Terminal State
    setCart([]);
    setCashReceived('');
    setDiscountPercent(0);
  };

  const isRtl = lang === 'ar';

  return (
    <div style={{ display: 'flex', flex: 1, height: '100%' }} className="animate-fade-in">
      {/* Left side: Products Grid */}
      <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', overflowY: 'auto' }}>
        
        {/* Search & Barcode Scanner Simulator */}
        <div style={{ display: 'flex', gap: '12px' }}>
          <form onSubmit={handleBarcodeSubmit} style={{ flex: 1, display: 'flex', position: 'relative' }}>
            <Search size={18} style={{ 
              position: 'absolute', 
              left: isRtl ? 'auto' : '14px', 
              right: isRtl ? '14px' : 'auto',
              top: '14px', 
              color: 'var(--text-secondary)' 
            }} />
            <input
              ref={barcodeInputRef}
              type="text"
              placeholder={t.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={{
                width: '100%',
                paddingLeft: isRtl ? '14px' : '44px',
                paddingRight: isRtl ? '44px' : '14px',
                fontSize: '1rem',
                height: '46px',
                backgroundColor: 'var(--bg-card)'
              }}
            />
            {searchQuery && (
              <button
                type="submit"
                className="btn-primary"
                style={{
                  position: 'absolute',
                  right: isRtl ? 'auto' : '6px',
                  left: isRtl ? '6px' : 'auto',
                  top: '6px',
                  height: '34px',
                  padding: '0 12px',
                  fontSize: '0.8rem'
                }}
              >
                {t.scanSku}
              </button>
            )}
          </form>
        </div>

        {/* Categories Horizontal Slider */}
        <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          {categories.map(cat => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={selectedCategory === cat ? "btn-primary" : "btn-secondary"}
              style={{
                padding: '8px 16px',
                borderRadius: '20px',
                fontSize: '0.85rem',
                fontWeight: '600',
                whiteSpace: 'nowrap'
              }}
            >
              {cat === 'All' ? t.all : cat}
            </button>
          ))}
        </div>

        {/* Products Grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))',
          gap: '16px',
          overflowY: 'auto',
          flex: 1
        }}>
          {filteredProducts.map(product => {
            const isLowStock = Number(product.stock) <= Number(product.lowStockLimit);
            const isOutOfStock = Number(product.stock) === 0;

            return (
              <div
                key={product.id}
                onClick={() => !isOutOfStock && addToCart(product)}
                style={{
                  backgroundColor: 'var(--bg-card)',
                  borderRadius: '12px',
                  padding: '16px',
                  border: isOutOfStock 
                    ? '1px dashed var(--accent-rose)' 
                    : isLowStock 
                      ? '1px solid var(--accent-amber)' 
                      : '1px solid var(--border-color)',
                  display: 'flex',
                  flexDirection: 'column',
                  justifyContent: 'space-between',
                  cursor: isOutOfStock ? 'not-allowed' : 'pointer',
                  position: 'relative',
                  opacity: isOutOfStock ? 0.5 : 1,
                  transition: 'transform 0.15s ease, border-color 0.15s ease',
                  overflow: 'hidden'
                }}
                className={!isOutOfStock ? "btn-secondary" : ""}
              >
                {/* Stock Level Badge */}
                <div style={{ 
                  position: 'absolute', 
                  top: '8px', 
                  right: isRtl ? 'auto' : '8px',
                  left: isRtl ? '8px' : 'auto'
                }}>
                  {isOutOfStock ? (
                    <span className="badge badge-rose">{t.outOfStock}</span>
                  ) : isLowStock ? (
                    <span className="badge badge-amber">{product.stock} {t.unitsLeft}</span>
                  ) : (
                    <span className="badge badge-emerald">{product.stock} {t.units}</span>
                  )}
                </div>

                <div style={{ marginTop: '16px', textAlign: isRtl ? 'right' : 'left' }}>
                  <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontWeight: '600' }}>{product.category}</p>
                  <h4 style={{ fontSize: '0.95rem', fontWeight: '600', marginTop: '4px', lineHeight: '1.2', color: 'var(--text-primary)' }}>
                    {isRtl ? (product.nameAr || product.name) : (product.nameEn || product.name)}
                  </h4>
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                    {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{product.price.toFixed(2)}
                  </span>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                    {product.sku}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Right side: Cart & Checkout Summary */}
      <div style={{
        width: '380px',
        backgroundColor: 'var(--bg-card)',
        borderLeft: isRtl ? 'none' : '1px solid var(--border-color)',
        borderRight: isRtl ? '1px solid var(--border-color)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        height: '100%'
      }}>
        {/* Cart Header */}
        <div style={{
          padding: '20px',
          borderBottom: '1px solid var(--border-color)',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShoppingCart size={18} style={{ color: 'var(--accent-emerald)' }} />
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.activeTransaction}</h3>
          </div>
          <span className="badge badge-emerald">{cart.reduce((sum, item) => sum + item.quantity, 0)} {t.units}</span>
        </div>

        {/* Cart Item List */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>
          {cart.length === 0 ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '100%',
              color: 'var(--text-muted)',
              gap: '12px'
            }}>
              <ShoppingCart size={36} />
              <p style={{ fontSize: '0.9rem' }}>{t.cartEmpty}</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {cart.map(item => (
                <div
                  key={item.id}
                  style={{
                    backgroundColor: 'var(--bg-app)',
                    borderRadius: '10px',
                    padding: '12px',
                    border: '1px solid var(--border-color)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <h5 style={{ fontSize: '0.9rem', fontWeight: '600', maxWidth: '80%', color: 'var(--text-primary)', textAlign: isRtl ? 'right' : 'left' }}>
                      {isRtl ? (item.nameAr || item.name) : (item.nameEn || item.name)}
                    </h5>
                    <button
                      onClick={() => removeItem(item.id)}
                      style={{ background: 'none', color: 'var(--accent-rose)', padding: '2px' }}
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    {/* Quantity controls */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', backgroundColor: 'var(--bg-card)', borderRadius: '6px', border: '1px solid var(--border-color)', padding: '2px' }}>
                      <button onClick={() => updateQuantity(item.id, -1)} style={{ background: 'none', padding: '4px', color: 'var(--text-primary)' }}><Minus size={12} /></button>
                      <span style={{ minWidth: '24px', textAlign: 'center', fontSize: '0.85rem', fontWeight: '700' }}>{item.quantity}</span>
                      <button onClick={() => updateQuantity(item.id, 1)} style={{ background: 'none', padding: '4px', color: 'var(--text-primary)' }}><Plus size={12} /></button>
                    </div>

                    {/* Price total */}
                    <span style={{ fontWeight: '600', fontSize: '0.95rem' }}>
                      {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{(item.price * item.quantity).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Calculations / Summary Panel */}
        <div style={{
          padding: '20px',
          backgroundColor: 'var(--bg-card-hover)',
          borderTop: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '12px'
        }}>
          {/* Subtotal */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t.subtotal}</span>
            <span>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{subtotal.toFixed(2)}</span>
          </div>

          {/* Discount input row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{t.discount}</span>
            <div style={{ display: 'flex', alignItems: 'center', width: '90px', position: 'relative' }}>
              <input
                type="number"
                min="0"
                max="100"
                value={discountPercent}
                onChange={(e) => setDiscountPercent(Math.min(100, Math.max(0, parseInt(e.target.value) || 0)))}
                style={{
                  width: '100%',
                  padding: isRtl ? '4px 8px 4px 24px' : '4px 24px 4px 8px',
                  fontSize: '0.85rem',
                  textAlign: 'right',
                  height: '28px'
                }}
              />
              <Percent size={12} style={{ 
                position: 'absolute', 
                right: isRtl ? 'auto' : '8px', 
                left: isRtl ? '8px' : 'auto',
                color: 'var(--text-muted)' 
              }} />
            </div>
          </div>

          {/* Tax row */}
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
            <span style={{ color: 'var(--text-secondary)' }}>{t.tax} ({db.store.taxRate}%)</span>
            <span>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{taxAmount.toFixed(2)}</span>
          </div>

          {/* Grand Total */}
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            fontSize: '1.2rem',
            fontWeight: '800',
            borderTop: '1px solid var(--border-color)',
            paddingTop: '10px',
            color: 'var(--accent-emerald)'
          }}>
            <span>{t.total}</span>
            <span>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{total.toFixed(2)}</span>
          </div>

          {/* Payment Method Selector */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '8px' }}>
            <button
              onClick={() => setPaymentMode('cash')}
              style={{
                flexDirection: 'column',
                height: '52px',
                padding: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: paymentMode === 'cash' ? 'var(--accent-emerald-light)' : 'transparent',
                borderColor: paymentMode === 'cash' ? 'var(--accent-emerald)' : 'var(--border-color)',
                color: paymentMode === 'cash' ? 'var(--accent-emerald)' : 'var(--text-secondary)'
              }}
            >
              <DollarSign size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t.cash}</span>
            </button>

            <button
              onClick={() => setPaymentMode('card')}
              style={{
                flexDirection: 'column',
                height: '52px',
                padding: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: paymentMode === 'card' ? 'var(--accent-blue-light)' : 'transparent',
                borderColor: paymentMode === 'card' ? 'var(--accent-blue)' : 'var(--border-color)',
                color: paymentMode === 'card' ? 'var(--accent-blue)' : 'var(--text-secondary)'
              }}
            >
              <CreditCard size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t.card}</span>
            </button>

            <button
              onClick={() => setPaymentMode('mobile')}
              style={{
                flexDirection: 'column',
                height: '52px',
                padding: '6px',
                border: '1px solid var(--border-color)',
                backgroundColor: paymentMode === 'mobile' ? 'var(--accent-amber-light)' : 'transparent',
                borderColor: paymentMode === 'mobile' ? 'var(--accent-amber)' : 'var(--border-color)',
                color: paymentMode === 'mobile' ? 'var(--accent-amber)' : 'var(--text-secondary)'
              }}
            >
              <Smartphone size={16} />
              <span style={{ fontSize: '0.75rem', fontWeight: '600' }}>{t.mobile}</span>
            </button>
          </div>

          {/* Cash Received panel */}
          {paymentMode === 'cash' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '6px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.cashReceived}</span>
                <input
                  type="number"
                  placeholder="0.00"
                  value={cashReceived}
                  onChange={(e) => setCashReceived(e.target.value)}
                  style={{ width: '120px', padding: '4px 8px', fontSize: '0.85rem', textAlign: 'right', height: '28px' }}
                />
              </div>
              {parseFloat(cashReceived) >= total && (
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', color: 'var(--accent-emerald)' }}>
                  <span>{t.changeDue}</span>
                  <span style={{ fontWeight: '700' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{changeDue.toFixed(2)}</span>
                </div>
              )}
            </div>
          )}

          {/* Complete Transaction Button */}
          <button
            onClick={handleCheckout}
            disabled={cart.length === 0}
            className="btn-primary"
            style={{
              width: '100%',
              padding: '14px',
              fontSize: '1rem',
              fontWeight: '700',
              marginTop: '10px',
              opacity: cart.length === 0 ? 0.5 : 1,
              cursor: cart.length === 0 ? 'not-allowed' : 'pointer'
            }}
          >
            <Check size={18} />
            <span>{t.completeCheckout}</span>
          </button>
        </div>
      </div>

      {/* Thermal Receipt Print Simulator */}
      {showReceipt && lastTransaction && (
        <ReceiptModal
          isOpen={showReceipt}
          onClose={() => setShowReceipt(false)}
          transaction={lastTransaction}
          store={db.store}
        />
      )}

      {isProcessingPayment && (
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
          zIndex: 99999,
          backdropFilter: 'blur(5px)',
          color: '#fff',
          flexDirection: 'column',
          gap: '16px'
        }}>
          <div style={{
            width: '48px',
            height: '48px',
            border: '4px solid rgba(255, 255, 255, 0.1)',
            borderTopColor: 'var(--accent-emerald)',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <div style={{ textAlign: 'center' }}>
            <h3 style={{ fontWeight: '700', fontSize: '1.2rem', marginBottom: '4px' }}>{t.awaitingTerminal}</h3>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{t.swipeOrPlace}</p>
          </div>
        </div>
      )}
    </div>
  );
}

export default Terminal;
