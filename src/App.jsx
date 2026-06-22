import React, { useState, useEffect } from 'react';
import Sidebar from './components/Sidebar';
import Terminal from './components/Terminal';
import Inventory from './components/Inventory';
import Dashboard from './components/Dashboard';
import Settings from './components/Settings';
import { fetchDatabase, saveDatabase } from './database';
import { translations } from './localization';

function App() {
  const [db, setDb] = useState(null);
  const [activeTab, setActiveTab] = useState('terminal');
  const [theme, setTheme] = useState('dark');
  const [currentUser, setCurrentUser] = useState({ username: 'cashier1', role: 'Cashier', name: 'Jane Doe' });
  const [lang, setLang] = useState('en');

  const t = translations[lang];

  useEffect(() => {
    // Sync document direction based on language selection
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr';
  }, [lang]);

  useEffect(() => {
    async function loadData() {
      const data = await fetchDatabase();
      setDb(data);
    }
    loadData();
  }, []);

  const updateDb = async (newDb) => {
    setDb(newDb);
    await saveDatabase(newDb);
  };

  const toggleTheme = () => {
    const nextTheme = theme === 'dark' ? 'light' : 'dark';
    setTheme(nextTheme);
    if (nextTheme === 'light') {
      document.body.classList.add('light-theme');
    } else {
      document.body.classList.remove('light-theme');
    }
  };

  if (!db) {
    return (
      <div style={{
        display: 'flex',
        height: '100vh',
        width: '100vw',
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: '#090d16',
        color: '#f3f4f6',
        fontFamily: 'sans-serif'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '40px',
            height: '40px',
            border: '3px solid #223147',
            borderTopColor: '#10b981',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px auto'
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <h3>Loading POS System Database...</h3>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <Sidebar 
        activeTab={activeTab} 
        setActiveTab={setActiveTab} 
        theme={theme} 
        toggleTheme={toggleTheme}
        currentUser={currentUser}
        setCurrentUser={setCurrentUser}
        users={db.users}
        lang={lang}
        setLang={setLang}
        t={t}
        storeName={db.store.name}
      />
      
      <main style={{
        flex: 1,
        height: '100vh',
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        position: 'relative'
      }}>
        {activeTab === 'terminal' && (
          <Terminal db={db} updateDb={updateDb} currentUser={currentUser} t={t} lang={lang} />
        )}
        {activeTab === 'inventory' && (
          <Inventory db={db} updateDb={updateDb} t={t} lang={lang} />
        )}
        {activeTab === 'analytics' && (
          <Dashboard db={db} t={t} lang={lang} />
        )}
        {activeTab === 'settings' && (
          <Settings db={db} updateDb={updateDb} currentUser={currentUser} t={t} />
        )}
      </main>
    </div>
  );
}

export default App;
