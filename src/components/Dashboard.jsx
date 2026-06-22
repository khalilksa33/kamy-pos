import React, { useState } from 'react';
import { DollarSign, FileText, ShoppingBag, TrendingUp, CreditCard, ChevronDown, ChevronUp, Trash2, Printer } from 'lucide-react';
import ReceiptModal from './ReceiptModal';

function Dashboard({ db, t, lang }) {
  const [expandedTxn, setExpandedTxn] = useState(null);
  const [printTxn, setPrintTxn] = useState(null);
  const [timeframe, setTimeframe] = useState('all'); // all, daily, monthly, annual

  // Filter transactions based on selected timeframe
  const filteredTransactions = db.transactions.filter(txn => {
    const txnDate = new Date(txn.date);
    const now = new Date();
    if (timeframe === 'daily') {
      return txnDate.getDate() === now.getDate() &&
             txnDate.getMonth() === now.getMonth() &&
             txnDate.getFullYear() === now.getFullYear();
    }
    if (timeframe === 'monthly') {
      return txnDate.getMonth() === now.getMonth() &&
             txnDate.getFullYear() === now.getFullYear();
    }
    if (timeframe === 'annual') {
      return txnDate.getFullYear() === now.getFullYear();
    }
    return true;
  });

  // Math for analytics
  const totalRevenue = filteredTransactions.reduce((sum, t) => sum + t.total, 0);
  
  const profit = filteredTransactions.reduce((sum, t) => {
    const costOfItems = t.items.reduce((itemSum, item) => {
      const prod = db.products.find(p => p.id === item.id);
      const originalCost = prod ? prod.cost : item.price * 0.5;
      return itemSum + (originalCost * item.quantity);
    }, 0);
    return sum + (t.total - t.tax - costOfItems);
  }, 0);

  const totalTransactions = filteredTransactions.length;
  const totalProducts = db.products.length;

  // Category sales breakdown
  const categorySales = {};
  filteredTransactions.forEach(t => {
    t.items.forEach(item => {
      const prod = db.products.find(p => p.id === item.id);
      const cat = prod ? prod.category : 'General';
      categorySales[cat] = (categorySales[cat] || 0) + (item.price * item.quantity);
    });
  });

  const categoryEntries = Object.entries(categorySales).sort((a, b) => b[1] - a[1]);
  const maxCategorySale = categoryEntries.length > 0 ? categoryEntries[0][1] : 1;

  // Payment mode distribution
  const paymentDistribution = { cash: 0, card: 0, mobile: 0 };
  filteredTransactions.forEach(t => {
    paymentDistribution[t.paymentMode] = (paymentDistribution[t.paymentMode] || 0) + t.total;
  });

  const toggleExpandTxn = (id) => {
    setExpandedTxn(expandedTxn === id ? null : id);
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px', height: '100%' }} className="animate-fade-in">
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>{t.analyticsDashboard}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inventorySub}</p>
        </div>

        {/* Timeframe Filter Buttons */}
        <div style={{
          display: 'flex',
          gap: '4px',
          padding: '4px',
          backgroundColor: 'var(--bg-card)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          {[
            { id: 'all', label: t.allTime },
            { id: 'daily', label: t.dailyReport },
            { id: 'monthly', label: t.monthlyReport },
            { id: 'annual', label: t.annualReport }
          ].map(tf => (
            <button
              key={tf.id}
              type="button"
              onClick={() => setTimeframe(tf.id)}
              className={timeframe === tf.id ? 'btn-primary' : 'btn-secondary'}
              style={{
                padding: '6px 12px',
                fontSize: '0.8rem',
                fontWeight: '600',
                borderRadius: '8px',
                border: 'none',
                height: '32px'
              }}
            >
              {tf.label}
            </button>
          ))}
        </div>
      </div>

      {/* Counters Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
        gap: '16px'
      }}>
        {/* Total Revenue */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-emerald-light)',
            color: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <DollarSign size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.grossRevenue}</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-emerald)' }}>
              {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{totalRevenue.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Total Profit */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-blue-light)',
            color: 'var(--accent-blue)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <TrendingUp size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.netProfit}</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800', color: 'var(--accent-blue)' }}>
              {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{profit.toFixed(2)}
            </h3>
          </div>
        </div>

        {/* Total Transactions */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-amber-light)',
            color: 'var(--accent-amber)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <FileText size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.transactionsCount}</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
              {totalTransactions}
            </h3>
          </div>
        </div>

        {/* Catalog Size */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          padding: '20px',
          border: '1px solid var(--border-color)',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            width: '46px',
            height: '46px',
            borderRadius: '10px',
            backgroundColor: 'rgba(139, 92, 246, 0.15)',
            color: '#8b5cf6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <ShoppingBag size={22} />
          </div>
          <div>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '500' }}>{t.catalogSKU}</p>
            <h3 style={{ fontSize: '1.4rem', fontWeight: '800' }}>
              {totalProducts}
            </h3>
          </div>
        </div>
      </div>

      {/* Main Content Layout */}
      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '20px', flex: 1, minHeight: '400px' }}>
        
        {/* Left pane: Transaction History */}
        <div style={{
          backgroundColor: 'var(--bg-card)',
          borderRadius: '12px',
          border: '1px solid var(--border-color)',
          padding: '20px',
          display: 'flex',
          flexDirection: 'column',
          gap: '16px',
          overflowY: 'auto'
        }}>
          <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.salesArchive}</h3>
          
          <div style={{ flex: 1, overflowY: 'auto' }}>
            {filteredTransactions.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                {t.noTransactions}
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {filteredTransactions.map(txn => {
                  const isExpanded = expandedTxn === txn.id;
                  return (
                    <div
                      key={txn.id}
                      style={{
                        backgroundColor: 'var(--bg-app)',
                        borderRadius: '10px',
                        border: '1px solid var(--border-color)',
                        overflow: 'hidden'
                      }}
                    >
                      <div
                        onClick={() => toggleExpandTxn(txn.id)}
                        style={{
                          padding: '14px 16px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <div>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <span style={{ fontWeight: '700', fontSize: '0.9rem' }}>{txn.id}</span>
                            <span className="badge badge-blue" style={{ textTransform: 'capitalize' }}>
                              {txn.paymentMode === 'cash' ? t.cash : txn.paymentMode === 'card' ? t.card : t.mobile}
                            </span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                            {new Date(txn.date).toLocaleString()} • Cashier: {txn.cashier}
                          </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <span style={{ fontWeight: '700', fontSize: '1.05rem', color: 'var(--accent-emerald)' }}>
                            {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.total.toFixed(2)}
                          </span>
                          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                        </div>
                      </div>

                      {/* Expandable transaction detail */}
                      {isExpanded && (
                        <div style={{
                          padding: '16px',
                          borderTop: '1px solid var(--border-color)',
                          backgroundColor: 'var(--bg-card-hover)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '10px'
                        }}>
                          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: '600' }}>{t.itemBreakdown}</div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            {txn.items.map((item, idx) => (
                              <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                                <span>{lang === 'ar' ? (item.nameAr || item.name) : (item.nameEn || item.name)} <span style={{ color: 'var(--text-muted)' }}>x{item.quantity}</span></span>
                                <span>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{(item.price * item.quantity).toFixed(2)}</span>
                              </div>
                            ))}
                          </div>
                          
                          <div style={{ borderTop: '1px solid var(--border-color)', margin: '8px 0' }} />

                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            <div>
                              <div>{t.subtotal}: {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.subtotal.toFixed(2)}</div>
                              {txn.discount > 0 && <div>{t.discount}: -{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.discount.toFixed(2)}</div>}
                              <div>{t.tax}: {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.tax.toFixed(2)}</div>
                            </div>
                            <div style={{ textAlign: 'right' }}>
                              <div>{t.cashReceived}: {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.cashReceived.toFixed(2)}</div>
                              <div>{t.changeDue}: {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{txn.changeDue.toFixed(2)}</div>
                            </div>
                          </div>

                          <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '8px', borderTop: '1px solid var(--border-color)', paddingTop: '10px' }}>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                setPrintTxn(txn);
                              }}
                              className="btn-secondary"
                              style={{ padding: '6px 12px', fontSize: '0.8rem', gap: '6px' }}
                            >
                              <Printer size={12} />
                              <span>{t.reprintInvoice}</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right pane: Visual summaries */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* Category Share */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.categoryDemand}</h3>
            
            {categoryEntries.length === 0 ? (
              <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>No sales data recorded.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {categoryEntries.map(([cat, val]) => {
                  const percentage = (val / maxCategorySale) * 100;
                  return (
                    <div key={cat} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem' }}>
                        <span>{cat}</span>
                        <span style={{ fontWeight: '600' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{val.toFixed(2)}</span>
                      </div>
                      <div style={{ width: '100%', height: '8px', backgroundColor: 'var(--bg-app)', borderRadius: '4px', overflow: 'hidden' }}>
                        <div style={{
                          width: `${percentage}%`,
                          height: '100%',
                          backgroundColor: 'var(--accent-emerald)',
                          borderRadius: '4px'
                        }} />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Payment Type Distribution */}
          <div style={{
            backgroundColor: 'var(--bg-card)',
            borderRadius: '12px',
            border: '1px solid var(--border-color)',
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px'
          }}>
            <h3 style={{ fontSize: '1.05rem', fontWeight: '700' }}>{t.paymentBreakdown}</h3>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', fontSize: '0.9rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-emerald)' }} />
                  {t.cashSales}
                </span>
                <span style={{ fontWeight: '600' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{paymentDistribution.cash.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-blue)' }} />
                  {t.cardSales}
                </span>
                <span style={{ fontWeight: '600' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{paymentDistribution.card.toFixed(2)}</span>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={{ width: '10px', height: '10px', borderRadius: '50%', backgroundColor: 'var(--accent-amber)' }} />
                  {t.mobileSales}
                </span>
                <span style={{ fontWeight: '600' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{paymentDistribution.mobile.toFixed(2)}</span>
              </div>
            </div>
          </div>

        </div>

      </div>

      {printTxn && (
        <ReceiptModal
          isOpen={!!printTxn}
          onClose={() => setPrintTxn(null)}
          transaction={printTxn}
          store={db.store}
        />
      )}
    </div>
  );
}

export default Dashboard;
