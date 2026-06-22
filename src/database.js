const defaultDb = {
  store: {
    name: "Antigravity Grocers",
    address: "King Fahd Road, Riyadh, Saudi Arabia",
    phone: "+966 11 401 2222",
    taxRate: 15.00,
    currency: "SAR",
    vatNumber: "312345678900003",
    receiptFooter: "Thank you for shopping with us! / شكراً لزيارتكم!",
    paymentSettings: {
      type: "simulated",
      ip: "192.168.1.150",
      port: "8090",
      comPort: "COM3",
      baudRate: "9600"
    }
  },
  products: [
    { id: "1", name: "Fresh Bananas (1kg)", nameEn: "Fresh Bananas (1kg)", nameAr: "موز طازج (1 كجم)", sku: "4011", category: "Produce", price: 1.99, cost: 0.80, stock: 120, lowStockLimit: 20 },
    { id: "2", name: "Whole Milk 1 Gallon", nameEn: "Whole Milk 1 Gallon", nameAr: "حليب كامل الدسم 1 جالون", sku: "078742351866", category: "Dairy", price: 3.49, cost: 2.10, stock: 45, lowStockLimit: 10 },
    { id: "3", name: "White Bread", nameEn: "White Bread", nameAr: "خبز أبيض", sku: "078742004243", category: "Bakery", price: 2.29, cost: 1.10, stock: 30, lowStockLimit: 8 },
    { id: "4", name: "Brown Eggs (Dozen)", nameEn: "Brown Eggs (Dozen)", nameAr: "بيض بني (طبق)", sku: "078742111422", category: "Dairy", price: 4.19, cost: 2.50, stock: 15, lowStockLimit: 12 },
    { id: "5", name: "Cereal Honey Oats", nameEn: "Cereal Honey Oats", nameAr: "رقائق الشوفان بالعسل", sku: "038000200484", category: "Pantry", price: 3.99, cost: 2.00, stock: 50, lowStockLimit: 15 },
    { id: "6", name: "Coca-Cola 2L", nameEn: "Coca-Cola 2L", nameAr: "كوكاكولا 2 لتر", sku: "049000028904", category: "Beverages", price: 2.49, cost: 1.20, stock: 80, lowStockLimit: 20 },
    { id: "7", name: "Organic Apples (1kg)", nameEn: "Organic Apples (1kg)", nameAr: "تفاح عضوي (1 كجم)", sku: "94012", category: "Produce", price: 4.99, cost: 2.50, stock: 8, lowStockLimit: 15 },
    { id: "8", name: "Frozen Pizza", nameEn: "Frozen Pizza", nameAr: "بيتزا مجمدة", sku: "072179000184", category: "Frozen", price: 6.99, cost: 3.80, stock: 25, lowStockLimit: 5 }
  ],
  transactions: [],
  users: [
    { username: "cashier1", role: "Cashier", name: "Jane Doe" },
    { username: "admin", role: "Manager", name: "Alex Smith" }
  ]
};

function sanitizeDb(db) {
  if (db && db.products) {
    db.products = db.products.map(p => {
      const defaultProd = defaultDb.products.find(dp => dp.sku === p.sku);
      return {
        ...p,
        nameEn: p.nameEn || (defaultProd ? defaultProd.nameEn : p.name || ''),
        nameAr: p.nameAr || (defaultProd ? defaultProd.nameAr : p.name || '')
      };
    });
  }
  return db;
}

export async function fetchDatabase() {
  if (window.api && window.api.loadDB) {
    try {
      const db = await window.api.loadDB();
      return sanitizeDb(db && db.products ? db : defaultDb);
    } catch (e) {
      console.warn("Electron API failed, falling back to LocalStorage", e);
    }
  }

  // Fallback to LocalStorage
  const localData = localStorage.getItem('pos_db');
  if (localData) {
    try {
      return sanitizeDb(JSON.parse(localData));
    } catch (e) {
      console.error("Failed to parse LocalStorage database", e);
    }
  }

  // Set default if empty
  localStorage.setItem('pos_db', JSON.stringify(defaultDb));
  return sanitizeDb(defaultDb);
}

export async function saveDatabase(data) {
  if (window.api && window.api.saveDB) {
    try {
      const res = await window.api.saveDB(data);
      if (res.success) return true;
    } catch (e) {
      console.warn("Electron API failed saving, falling back to LocalStorage", e);
    }
  }

  // Fallback to LocalStorage
  try {
    localStorage.setItem('pos_db', JSON.stringify(data));
    return true;
  } catch (e) {
    console.error("Failed to save to LocalStorage", e);
    return false;
  }
}
