import React, { useState } from 'react';
import { Plus, Search, Edit2, Trash2, AlertTriangle, X } from 'lucide-react';

function Inventory({ db, updateDb, t, lang }) {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Form states
  const [nameEn, setNameEn] = useState('');
  const [nameAr, setNameAr] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('Produce');
  const [price, setPrice] = useState('');
  const [cost, setCost] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockLimit, setLowStockLimit] = useState('');

  const categories = ['All', ...new Set(db.products.map(p => p.category))];
  const formCategories = categories.filter(c => c !== 'All');

  // Filtered products list
  const filteredProducts = db.products.filter(product => {
    const matchesCategory = selectedCategory === 'All' || product.category === selectedCategory;
    const matchesSearch = 
      (product.nameEn || product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      (product.nameAr || product.name || '').toLowerCase().includes(searchQuery.toLowerCase()) || 
      product.sku.includes(searchQuery);
    const matchesLowStock = !showLowStockOnly || Number(product.stock) <= Number(product.lowStockLimit);
    return matchesCategory && matchesSearch && matchesLowStock;
  });

  const openAddModal = () => {
    setEditingProduct(null);
    setNameEn('');
    setNameAr('');
    setSku('');
    setCategory('Produce');
    setPrice('');
    setCost('');
    setStock('');
    setLowStockLimit('10');
    setShowModal(true);
  };

  const openEditModal = (product) => {
    setEditingProduct(product);
    setNameEn(product.nameEn || product.name || '');
    setNameAr(product.nameAr || product.name || '');
    setSku(product.sku);
    setCategory(product.category);
    setPrice(product.price.toString());
    setCost(product.cost.toString());
    setStock(product.stock.toString());
    setLowStockLimit(product.lowStockLimit.toString());
    setShowModal(true);
  };

  const handleSave = (e) => {
    e.preventDefault();
    if (!nameEn || !nameAr || !sku || !price || !cost || !stock || !lowStockLimit) {
      alert("All fields are required.");
      return;
    }

    const priceNum = parseFloat(price);
    const costNum = parseFloat(cost);
    const stockNum = parseInt(stock);
    const lowStockNum = parseInt(lowStockLimit);

    if (isNaN(priceNum) || isNaN(costNum) || isNaN(stockNum) || isNaN(lowStockNum)) {
      alert("Invalid numeric entries.");
      return;
    }

    let updatedProducts;

    if (editingProduct) {
      updatedProducts = db.products.map(p => 
        p.id === editingProduct.id 
          ? { ...p, name: nameEn, nameEn, nameAr, sku, category, price: priceNum, cost: costNum, stock: stockNum, lowStockLimit: lowStockNum }
          : p
      );
    } else {
      const newProduct = {
        id: (db.products.length > 0 ? Math.max(...db.products.map(p => parseInt(p.id) || 0)) + 1 : 1).toString(),
        name: nameEn,
        nameEn,
        nameAr,
        sku,
        category,
        price: priceNum,
        cost: costNum,
        stock: stockNum,
        lowStockLimit: lowStockNum
      };
      
      if (db.products.some(p => p.sku === sku)) {
        alert("A product with this SKU/Barcode already exists.");
        return;
      }

      updatedProducts = [...db.products, newProduct];
    }

    updateDb({
      ...db,
      products: updatedProducts
    });

    setShowModal(false);
  };

  const handleDelete = (productId, productName) => {
    if (confirm(`Are you sure you want to delete ${productName}?`)) {
      const updatedProducts = db.products.filter(p => p.id !== productId);
      updateDb({
        ...db,
        products: updatedProducts
      });
    }
  };

  return (
    <div style={{ padding: '24px', display: 'flex', flexDirection: 'column', gap: '20px', height: '100%' }} className="animate-fade-in">
      
      {/* Header Info */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h2 style={{ fontSize: '1.5rem', fontWeight: '800', letterSpacing: '-0.025em' }}>{t.inventoryTitle}</h2>
          <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.inventorySub}</p>
        </div>
        <button onClick={openAddModal} className="btn-primary" style={{ padding: '10px 16px', fontSize: '0.9rem' }}>
          <Plus size={16} />
          <span>{t.addNewProduct}</span>
        </button>
      </div>

      {/* Control panel */}
      <div style={{
        display: 'flex',
        flexWrap: 'wrap',
        gap: '12px',
        alignItems: 'center',
        padding: '16px',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        {/* Search */}
        <div style={{ display: 'flex', position: 'relative', flex: '1', minWidth: '240px' }}>
          <Search size={16} style={{ position: 'absolute', left: '12px', top: '12px', color: 'var(--text-secondary)' }} />
          <input
            type="text"
            placeholder={t.searchInventory}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{ width: '100%', paddingLeft: '38px', height: '38px', backgroundColor: 'var(--bg-app)' }}
          />
        </div>

        {/* Category filter */}
        <select
          value={selectedCategory}
          onChange={(e) => setSelectedCategory(e.target.value)}
          style={{ height: '38px', backgroundColor: 'var(--bg-app)', minWidth: '150px' }}
        >
          {categories.map(c => <option key={c} value={c}>{c === 'All' ? t.all : c}</option>)}
        </select>

        {/* Low stock check */}
        <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '0.9rem' }}>
          <input
            type="checkbox"
            checked={showLowStockOnly}
            onChange={(e) => setShowLowStockOnly(e.target.checked)}
            style={{ width: '16px', height: '16px', cursor: 'pointer' }}
          />
          <span style={{ display: 'flex', alignItems: 'center', gap: '4px', color: showLowStockOnly ? 'var(--accent-rose)' : 'var(--text-secondary)' }}>
            <AlertTriangle size={14} />
            {t.showLowStock}
          </span>
        </label>
      </div>

      {/* Product List Table */}
      <div style={{
        flex: 1,
        overflowY: 'auto',
        overflowX: 'auto',
        backgroundColor: 'var(--bg-card)',
        borderRadius: '12px',
        border: '1px solid var(--border-color)'
      }}>
        <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', fontSize: '0.9rem' }}>
          <thead>
            <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-secondary)', fontWeight: '600' }}>
              <th style={{ padding: '16px' }}>{t.sku}</th>
              <th style={{ padding: '16px' }}>{t.productName}</th>
              <th style={{ padding: '16px' }}>{t.category}</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>{t.costPrice}</th>
              <th style={{ padding: '16px', textAlign: 'right' }}>{t.sellingPrice}</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>{t.stockLevel}</th>
              <th style={{ padding: '16px', textAlign: 'center' }}>{t.actions}</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="7" style={{ textAlign: 'center', padding: '40px', color: 'var(--text-muted)' }}>
                  No products matched the search filters.
                </td>
              </tr>
            ) : (
              filteredProducts.map(product => {
                const isLowStock = Number(product.stock) <= Number(product.lowStockLimit);
                return (
                  <tr
                    key={product.id}
                    style={{
                      borderBottom: '1px solid var(--border-color)',
                      transition: 'background-color 0.15s ease'
                    }}
                  >
                    <td style={{ padding: '16px', fontWeight: '500', color: 'var(--text-primary)' }}>{product.sku}</td>
                     <td style={{ padding: '16px', fontWeight: '600' }}>
                      {lang === 'ar' ? (product.nameAr || product.name) : (product.nameEn || product.name)}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span className="badge badge-blue">{product.category}</span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right' }}>{db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{product.cost.toFixed(2)}</td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: '700', color: 'var(--accent-emerald)' }}>
                      {db.store.currency === 'SAR' ? 'ر.س' : db.store.currency}{product.price.toFixed(2)}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span className={`badge ${isLowStock ? 'badge-rose' : 'badge-emerald'}`}>
                        {product.stock} {t.units} {isLowStock && `(${t.low})`}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <div style={{ display: 'flex', justifyContent: 'center', gap: '10px' }}>
                        <button
                          onClick={() => openEditModal(product)}
                          className="btn-secondary"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <Edit2 size={12} />
                          <span>{t.edit}</span>
                        </button>
                        <button
                          onClick={() => handleDelete(product.id, lang === 'ar' ? (product.nameAr || product.name) : (product.nameEn || product.name))}
                          className="btn-danger"
                          style={{ padding: '6px 10px', fontSize: '0.8rem' }}
                        >
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal for Add / Edit */}
      {showModal && (
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
          zIndex: 999,
          backdropFilter: 'blur(4px)'
        }}>
          <form
            onSubmit={handleSave}
            style={{
              backgroundColor: 'var(--bg-card)',
              borderRadius: '16px',
              border: '1px solid var(--border-color)',
              width: '450px',
              padding: '24px',
              display: 'flex',
              flexDirection: 'column',
              gap: '16px'
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ fontSize: '1.2rem', fontWeight: '700' }}>
                {editingProduct ? t.edit : t.addNewProduct}
              </h3>
              <button type="button" onClick={() => setShowModal(false)} style={{ background: 'none', color: 'var(--text-secondary)' }}>
                <X size={18} />
              </button>
            </div>

            {/* SKU Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.sku}</label>
              <input
                type="text"
                placeholder="4011, 078742..."
                value={sku}
                onChange={(e) => setSku(e.target.value)}
                required
              />
            </div>

            {/* Name English Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lang === 'ar' ? "اسم المنتج (إنجليزي)" : "Product Name (English)"}</label>
              <input
                type="text"
                placeholder="e.g. Fuji Apples"
                value={nameEn}
                onChange={(e) => setNameEn(e.target.value)}
                required
              />
            </div>

            {/* Name Arabic Input */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{lang === 'ar' ? "اسم المنتج (العربية)" : "Product Name (Arabic)"}</label>
              <input
                type="text"
                placeholder="مثال: تفاح فوجي"
                value={nameAr}
                onChange={(e) => setNameAr(e.target.value)}
                required
              />
            </div>

            {/* Category Select */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
              <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.category}</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                style={{ width: '100%' }}
              >
                {formCategories.length > 0 ? (
                  formCategories.map(c => <option key={c} value={c}>{c}</option>)
                ) : (
                  <>
                    <option value="Produce">Produce</option>
                    <option value="Dairy">Dairy</option>
                    <option value="Bakery">Bakery</option>
                    <option value="Beverages">Beverages</option>
                    <option value="Pantry">Pantry</option>
                  </>
                )}
              </select>
            </div>

            {/* Price & Cost row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.costPrice} ({db.store.currency === 'SAR' ? 'ر.س' : db.store.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={cost}
                  onChange={(e) => setCost(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.sellingPrice} ({db.store.currency === 'SAR' ? 'ر.س' : db.store.currency})</label>
                <input
                  type="number"
                  step="0.01"
                  placeholder="0.00"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Stock Level & Low stock limit */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.stockLevel}</label>
                <input
                  type="number"
                  placeholder="0"
                  value={stock}
                  onChange={(e) => setStock(e.target.value)}
                  required
                />
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{t.showLowStock}</label>
                <input
                  type="number"
                  placeholder="10"
                  value={lowStockLimit}
                  onChange={(e) => setLowStockLimit(e.target.value)}
                  required
                />
              </div>
            </div>

            {/* Actions */}
            <div style={{ display: 'flex', gap: '12px', marginTop: '8px' }}>
              <button
                type="submit"
                className="btn-primary"
                style={{ flex: 1, padding: '12px' }}
              >
                {t.saveProduct}
              </button>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="btn-secondary"
                style={{ padding: '12px 20px' }}
              >
                {t.cancel}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}

export default Inventory;
