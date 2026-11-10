const { createInterface } = require('node:readline/promises');
const { Writable } = require('node:stream');
const { runNativeComparison } = require('./native-session.cjs');
async function main() {
  if (!process.stdin.isTTY || !process.stdout.isTTY) throw new Error('Run npm run native:compare in an interactive terminal. Keys are never accepted as command arguments or environment variables.');
  let muted = false;
  const output = new Writable({ write(chunk, _encoding, callback) { if (!muted) process.stdout.write(chunk); callback(); } });
  const rl = createInterface({ input: process.stdin, output, terminal: true });
  const controller = new AbortController();
  const interrupt = () => { controller.abort(); rl.close(); };
  rl.on('SIGINT', interrupt);
  const ask = async (prompt, secret = false) => {
    process.stdout.write(prompt); muted = secret;
    try { return await rl.question('', { signal: controller.signal }); }
    finally { muted = false; if (secret) process.stdout.write('\n'); }
  };
  let vendor, key, selected;
  try {
    console.log('Lantern Keeper — native SDK comparison\nClose The Lantern Keeper and other camera apps first.\nThis uses your real webcam for up to 60 seconds, with no village or browser capture.\nIt reports frame/quality counts, not breathing values, and saves no recording.');
    if ((await ask('Type YES to consent to this webcam session (anything else cancels): ')).trim() !== 'YES') { console.log('Canceled. Camera not opened.'); return; }
    vendor = require('@smartspectra/node-sdk');
    const cameras = vendor.SmartSpectraSDK.availableCameras();
    if (!cameras.length) throw new Error('No cameras found.');
    cameras.forEach((camera, index) => console.log(`${index + 1}. ${camera.name || 'Unnamed camera'}`));
    const choice = Number((await ask('Choose the same regular RGB webcam used in the app (number; avoid IR/Windows Hello): ')).trim());
    if (!Number.isInteger(choice) || choice < 1 || choice > cameras.length) throw new Error('Invalid camera choice. Camera not opened.');
    selected = cameras[choice - 1];
    key = (await ask('Paste your Presage API key, then press Enter (input hidden): ', true)).trim();
    if (!key) throw new Error('No API key supplied. Camera not opened.');
  } finally { rl.close(); }
  process.on('SIGINT', interrupt);
  try {
    const result = await runNativeComparison({ vendor, consented: true, apiKey: key, cameraId: selected.id, signal: controller.signal });
    if (result.reason.startsWith('SDK error') || result.reason.includes('failed')) process.exitCode = 1;
  }
  finally { key = ''; process.removeListener('SIGINT', interrupt); }
}
main().catch(error => { console.error(error.name === 'AbortError' ? 'Canceled.' : 'Comparison could not start. Run npm run native:compare in an interactive terminal; check SDK installation, camera selection and permissions. Camera capture is not automatically retried.'); process.exitCode = 1; });
