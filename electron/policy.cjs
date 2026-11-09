const { pathToFileURL } = require('node:url');
function trustedPage(url, packaged, indexPath) {
  try {
    const target = new URL(url);
    return packaged
      ? target.protocol === 'file:' && target.pathname === new URL(pathToFileURL(indexPath).href).pathname && !target.host
      : target.origin === 'http://127.0.0.1:5173' && target.pathname === '/';
  } catch { return false; }
}
function allowCamera(permission, details) {
  return permission === 'media' && details.mediaTypes?.length === 1 && details.mediaTypes[0] === 'video';
}
module.exports = { trustedPage, allowCamera };
