import React from 'react';
import { ShoppingCart, Package, BarChart3, Settings as SettingsIcon, Sun, Moon, User } from 'lucide-react';

function Sidebar({ activeTab, setActiveTab, theme, toggleTheme, currentUser, setCurrentUser, users, lang, setLang, t, storeName }) {
  const menuItems = [
    { id: 'terminal', label: t.posTerminal, icon: ShoppingCart },
    { id: 'inventory', label: t.inventoryCatalog, icon: Package },
    { id: 'analytics', label: t.analyticsDashboard, icon: BarChart3 },
    { id: 'settings', label: t.settings, icon: SettingsIcon },
  ];

  return (
    <aside 
      dir={lang === 'ar' ? 'rtl' : 'ltr'}
      style={{
        width: 'var(--sidebar-width)',
        backgroundColor: 'var(--bg-card)',
        borderRight: 'none',
        borderLeft: '1px solid var(--border-color)',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        padding: '24px 16px',
        height: '100vh',
        flexShrink: 0
      }}
    >
      <div style={{ width: '100%' }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '32px',
          padding: '0 8px'
        }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            backgroundColor: 'var(--accent-emerald)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: '800',
            fontSize: '1.4rem'
          }}>
            {storeName ? storeName.trim().charAt(0).toUpperCase() : 'K'}
          </div>
          <div>
            <h2 style={{ fontSize: '1.1rem', fontWeight: '700', letterSpacing: '-0.025em' }}>{storeName || 'KAMY POS'}</h2>
            <p style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{storeName || 'KAMY POS'} v1.0</p>
          </div>
        </div>

        {/* Navigation Menu */}
        <nav style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setActiveTab(item.id)}
                style={{
                  width: '100%',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  borderRadius: '10px',
                  fontSize: '0.95rem',
                  fontWeight: isActive ? '600' : '400',
                  color: isActive ? '#fff' : 'var(--text-secondary)',
                  backgroundColor: isActive ? 'var(--accent-emerald)' : 'transparent',
                  textAlign: lang === 'ar' ? 'right' : 'left',
                  justifyContent: 'flex-start',
                  transition: 'all 0.08s ease'
                }}
              >
                <Icon size={18} />
                <span>{item.label}</span>
              </button>
            );
          })}
        </nav>
      </div>

      {/* Footer / Cashier & Settings Info */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: '16px', width: '100%' }}>
        
        {/* Active Cashier Selector */}
        <div style={{
          padding: '12px',
          borderRadius: '12px',
          backgroundColor: 'var(--bg-card-hover)',
          border: '1px solid var(--border-color)',
          display: 'flex',
          flexDirection: 'column',
          gap: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <User size={16} style={{ color: 'var(--accent-emerald)' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{t.activeOperator}</span>
          </div>
          <select
            value={currentUser.username}
            onChange={(e) => {
              const selected = users.find(u => u.username === e.target.value);
              if (selected) setCurrentUser(selected);
            }}
            style={{
              width: '100%',
              fontSize: '0.85rem',
              padding: '6px 8px',
              backgroundColor: 'var(--bg-app)',
              border: '1px solid var(--border-color)'
            }}
          >
            {users.map(u => (
              <option key={u.username} value={u.username}>{u.name} ({u.role === 'Cashier' ? t.cash : t.role})</option>
            ))}
          </select>
        </div>

        {/* Language Selection Buttons Segment */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: '4px',
          padding: '2px',
          backgroundColor: 'var(--bg-app)',
          borderRadius: '10px',
          border: '1px solid var(--border-color)'
        }}>
          <button
            onClick={() => setLang('en')}
            style={{
              padding: '6px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              fontWeight: lang === 'en' ? '700' : '400',
              backgroundColor: lang === 'en' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'en' ? '#fff' : 'var(--text-secondary)',
              height: '28px'
            }}
          >
            {t.english}
          </button>
          <button
            onClick={() => setLang('ar')}
            style={{
              padding: '6px',
              fontSize: '0.8rem',
              borderRadius: '8px',
              fontWeight: lang === 'ar' ? '700' : '400',
              backgroundColor: lang === 'ar' ? 'var(--bg-card)' : 'transparent',
              color: lang === 'ar' ? '#fff' : 'var(--text-secondary)',
              height: '28px'
            }}
          >
            {t.arabic}
          </button>
        </div>

        {/* Theme Toggle Button */}
        <button
          onClick={toggleTheme}
          className="btn-secondary"
          style={{
            width: '100%',
            padding: '10px 14px',
            fontSize: '0.85rem',
            justifyContent: 'center'
          }}
        >
          {theme === 'dark' ? (
            <>
              <Sun size={16} />
              <span>{t.lightMode}</span>
            </>
          ) : (
            <>
              <Moon size={16} />
              <span>{t.darkMode}</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}

export default Sidebar;
