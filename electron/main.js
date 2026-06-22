const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const net = require('net');

let mainWindow;
const DATA_FILE = path.join(app.getPath('userData'), 'pos-database.json');

// Helper to load data
function loadDatabase() {
  if (!fs.existsSync(DATA_FILE)) {
    // Initial default database structure
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
        { id: "1", name: "Fresh Bananas (1kg)", nameEn: "Fresh Bananas (1kg)", nameAr: "موز طازج (1 كجم)", sku: "4011", category: "Produce", price: 1.99, cost: 0.80, stock: 250, lowStockLimit: 20 },
        { id: "2", name: "Whole Milk 1 Gallon", nameEn: "Whole Milk 1 Gallon", nameAr: "حليب كامل الدسم 1 جالون", sku: "078742351866", category: "Dairy", price: 3.49, cost: 2.10, stock: 150, lowStockLimit: 10 },
        { id: "3", name: "White Bread", nameEn: "White Bread", nameAr: "خبز أبيض", sku: "078742004243", category: "Bakery", price: 2.29, cost: 1.10, stock: 120, lowStockLimit: 8 },
        { id: "4", name: "Brown Eggs (Dozen)", nameEn: "Brown Eggs (Dozen)", nameAr: "بيض بني (طبق)", sku: "078742111422", category: "Dairy", price: 4.19, cost: 2.50, stock: 100, lowStockLimit: 12 },
        { id: "5", name: "Cereal Honey Oats", nameEn: "Cereal Honey Oats", nameAr: "رقائق الشوفان بالعسل", sku: "038000200484", category: "Pantry", price: 3.99, cost: 2.00, stock: 150, lowStockLimit: 15 },
        { id: "6", name: "Coca-Cola 2L", nameEn: "Coca-Cola 2L", nameAr: "كوكاكولا 2 لتر", sku: "049000028904", category: "Beverages", price: 2.49, cost: 1.20, stock: 200, lowStockLimit: 20 },
        { id: "7", name: "Organic Apples (1kg)", nameEn: "Organic Apples (1kg)", nameAr: "تفاح عضوي (1 كجم)", sku: "94012", category: "Produce", price: 4.99, cost: 2.50, stock: 120, lowStockLimit: 15 },
        { id: "8", name: "Frozen Pizza", nameEn: "Frozen Pizza", nameAr: "بيتزا مجمدة", sku: "072179000184", category: "Frozen", price: 6.99, cost: 3.80, stock: 100, lowStockLimit: 5 },
        { id: "9", name: "Chocolate Bar", nameEn: "Chocolate Bar", nameAr: "شوكولاتة", sku: "034000402062", category: "Pantry", price: 1.49, cost: 0.60, stock: 150, lowStockLimit: 20 },
        { id: "10", name: "Potato Chips", nameEn: "Potato Chips", nameAr: "رقائق البطاطس", sku: "028400070566", category: "Pantry", price: 1.99, cost: 0.90, stock: 200, lowStockLimit: 20 },
        { id: "11", name: "Bottled Water 6-Pack", nameEn: "Bottled Water 6-Pack", nameAr: "مياه معبأة 6 حبات", sku: "075720000814", category: "Beverages", price: 2.99, cost: 1.00, stock: 180, lowStockLimit: 20 }
      ],
      transactions: [],
      users: [
        { username: "cashier1", role: "Cashier", name: "Jane Doe" },
        { username: "admin", role: "Manager", name: "Alex Smith" }
      ]
    };
    fs.writeFileSync(DATA_FILE, JSON.stringify(defaultDb, null, 2), 'utf-8');
    return defaultDb;
  }
  try {
    const data = fs.readFileSync(DATA_FILE, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    console.error("Error reading database", err);
    return {};
  }
}

// Helper to save data
function saveDatabase(data) {
  try {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return { success: true };
  } catch (err) {
    console.error("Error saving database", err);
    return { success: false, error: err.message };
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1024,
    minHeight: 768,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
    titleBarStyle: 'default',
    icon: path.join(__dirname, '../dist/favicon.ico')
  });

  // Check if we are running in dev mode
  const isDev = !app.isPackaged;
  if (isDev) {
    mainWindow.loadURL('http://localhost:5173');
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  // Register IPC Handlers
  ipcMain.handle('db:load', () => {
    return loadDatabase();
  });

  ipcMain.handle('db:save', (event, data) => {
    return saveDatabase(data);
  });

  ipcMain.handle('payment:process', async (event, { amount, settings }) => {
    if (settings.type === 'simulated') {
      await new Promise(resolve => setTimeout(resolve, 1500));
      return { success: true, message: "Approved (Simulated)" };
    }

    if (settings.type === 'tcp') {
      return new Promise((resolve) => {
        const client = new net.Socket();
        client.setTimeout(5000);

        client.connect(parseInt(settings.port) || 8090, settings.ip, () => {
          const amountInHalalas = Math.round(amount * 100);
          const paddedAmount = amountInHalalas.toString().padStart(12, '0');
          const request = `\x0201,${paddedAmount},682\x03`;
          client.write(request);
        });

        client.on('data', (data) => {
          const resp = data.toString();
          if (resp.includes("00") || resp.includes("APPROVED") || resp.includes("approved")) {
            resolve({ success: true, message: `Approved: ${resp}` });
          } else {
            resolve({ success: false, error: `Transaction Declined: ${resp}` });
          }
          client.destroy();
        });

        client.on('timeout', () => {
          resolve({ success: false, error: "Connection to Mada terminal timed out." });
          client.destroy();
        });

        client.on('error', (err) => {
          resolve({ success: false, error: `Terminal connection failed: ${err.message}` });
        });
      });
    }

  });

  // ZATCA Integration Handlers
  const zatca = require('./zatca');
  
  ipcMain.handle('zatca:generateKeys', () => {
    return zatca.generateRsaKeyPair();
  });

  ipcMain.handle('zatca:generateCsr', (event, params, keys) => {
    return zatca.generateZatcaCsr(params, keys);
  });

  ipcMain.handle('zatca:onboard', async (event, otp, csrPem) => {
    return await zatca.onboardDevice(otp, csrPem);
  });

  ipcMain.handle('zatca:signInvoice', (event, transaction, store, certPem, privateKeyPem) => {
    return zatca.generatePhase2Qr(transaction, store, certPem, privateKeyPem);
  });

  createWindow();

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', function () {
  if (process.platform !== 'darwin') app.quit();
});
