const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  loadDB: () => ipcRenderer.invoke('db:load'),
  saveDB: (data) => ipcRenderer.invoke('db:save', data),
  processPayment: (payload) => ipcRenderer.invoke('payment:process', payload),
  zatcaGenerateKeys: () => ipcRenderer.invoke('zatca:generateKeys'),
  zatcaGenerateCsr: (params, keys) => ipcRenderer.invoke('zatca:generateCsr', params, keys),
  zatcaOnboard: (otp, csrPem) => ipcRenderer.invoke('zatca:onboard', otp, csrPem),
  zatcaSignInvoice: (transaction, store, certPem, privateKeyPem) => ipcRenderer.invoke('zatca:signInvoice', transaction, store, certPem, privateKeyPem)
});
