const { app, BrowserWindow, session } = require('electron');
const path = require('node:path');
const { trustedPage, allowCamera } = require('./policy.cjs');
// Platform closure is outside ASAR; koffi must load a real filesystem DLL.
if (app.isPackaged) process.env.SMARTSPECTRA_CAPI_PATH = path.join(process.resourcesPath, 'smartspectra', 'smartspectra_capi.dll');
const indexPath = path.join(__dirname, '../dist/index.html');
function createWindow() {
  let bindSmartSpectraIpc;
  try { ({ bindSmartSpectraIpc } = require('@smartspectra/node-sdk/main')); }
  catch (error) { console.error('SmartSpectra native runtime unavailable:', error.message); }
  const built = app.isPackaged || process.env.LANTERN_BUILT === '1';
  const win = new BrowserWindow({ width: 1440, height: 960, minWidth: 900, minHeight: 720, backgroundColor: '#081b25', title: 'The Lantern Keeper', webPreferences: { preload: require.resolve('@smartspectra/node-sdk/preload'), contextIsolation: true, sandbox: true, nodeIntegration: false } });
  win.webContents.setWindowOpenHandler(() => ({ action: 'deny' }));
  win.webContents.on('will-navigate', (event, url) => { if (!trustedPage(url, built, indexPath)) event.preventDefault(); });
  session.defaultSession.setPermissionRequestHandler((wc, permission, callback, details) => {
    callback(!!bindSmartSpectraIpc && wc === win.webContents && details.isMainFrame && trustedPage(details.requestingUrl, built, indexPath) && allowCamera(permission, details));
  });
  session.defaultSession.setPermissionCheckHandler((wc, permission, _origin, details) => !!bindSmartSpectraIpc && wc === win.webContents && trustedPage(wc.getURL(), built, indexPath) && permission === 'media' && details.mediaType === 'video');
  if (bindSmartSpectraIpc) bindSmartSpectraIpc(win);
  if (built) win.loadFile(indexPath, { query: bindSmartSpectraIpc ? {} : { sdk: 'unavailable' } });
  else win.loadURL(`http://127.0.0.1:5173/${bindSmartSpectraIpc ? '' : '?sdk=unavailable'}`);
}
app.whenReady().then(createWindow);
app.on('window-all-closed', () => app.quit());
