const { app, BrowserWindow, protocol } = require('electron');
const path = require('path');
const fs = require('fs');
const { Readable } = require('stream');
const { spawn } = require('child_process');

// ── Bootstrap: leer parámetros del launcher desde fichero temp ───────────────
// GestorIA.app los escribe en /tmp/.gestoria_launcher porque 'open' no pasa env
;(function bootstrapLauncherEnv() {
  const envFile = '/tmp/.gestoria_launcher';
  try {
    const lines = fs.readFileSync(envFile, 'utf8').trim().split('\n');
    for (const line of lines) {
      const eqIdx = line.indexOf('=');
      if (eqIdx > 0) process.env[line.slice(0, eqIdx)] = line.slice(eqIdx + 1);
    }
    fs.unlinkSync(envFile);
  } catch { /* no lanzado desde GestorIA.app */ }
})();

// ── Launcher directories ─────────────────────────────────────
const APP_DIR = path.join(__dirname, '..');
const PROJECT_ROOT = process.env.GESTORIA_PROJECT_ROOT || path.join(__dirname, '..', '..');

const isDev = process.env.NODE_ENV === 'development';
const DIST = path.join(__dirname, '..', 'dist', 'login-desktop', 'browser');

const MIME = {
  '.html': 'text/html', '.js': 'application/javascript', '.mjs': 'application/javascript',
  '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.ico': 'image/x-icon',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.woff2': 'font/woff2', '.woff': 'font/woff',
};

protocol.registerSchemesAsPrivileged([
  { scheme: 'app', privileges: { standard: true, secure: true, supportFetchAPI: true, stream: true } },
]);

function serveFile(filePath, rangeHeader) {
  const stat = fs.statSync(filePath);
  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';

  // Range request (videos) — Response body must be a Web ReadableStream
  if (rangeHeader) {
    const [startStr, endStr] = rangeHeader.replace('bytes=', '').split('-');
    const start = parseInt(startStr, 10);
    const end = endStr ? parseInt(endStr, 10) : stat.size - 1;
    const chunkSize = end - start + 1;
    const webStream = Readable.toWeb(fs.createReadStream(filePath, { start, end }));
    return new Response(webStream, {
      status: 206,
      headers: {
        'Content-Type': contentType,
        'Content-Range': `bytes ${start}-${end}/${stat.size}`,
        'Accept-Ranges': 'bytes',
        'Content-Length': String(chunkSize),
      },
    });
  }

  // Full file
  const webStream = Readable.toWeb(fs.createReadStream(filePath));
  return new Response(webStream, {
    status: 200,
    headers: {
      'Content-Type': contentType,
      'Content-Length': String(stat.size),
      'Accept-Ranges': 'bytes',
    },
  });
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.cjs'),
    },
  });

  if (isDev) {
    win.loadURL('http://localhost:4200');
  } else {
    win.loadURL('app://localhost/');
  }
}

// ════════════════════════════════════════════════════════════
//  LAUNCHER — splash window + build steps
// ════════════════════════════════════════════════════════════

/** Open the splash window and resolve when its DOM is ready */
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 480,
    height: 300,
    frame: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
    },
  });

  return new Promise((resolve) => {
    splash.loadFile(path.join(__dirname, 'splash.html'));
    splash.webContents.on('did-finish-load', () => resolve(splash));
  });
}

/** Push a progress update to the splash window */
function splashUpdate(splash, pct, text, stepId) {
  if (splash.isDestroyed()) return;
  const call = `updateProgress(${pct}, ${JSON.stringify(text)}, ${JSON.stringify(stepId || null)})`;
  splash.webContents.executeJavaScript(call).catch(() => {});
}

/** Spawn a child process and resolve/reject on exit */
function spawnAsync(cmd, args, cwd) {
  return new Promise((resolve, reject) => {
    const proc = spawn(cmd, args, { cwd, env: process.env, stdio: ['ignore', 'pipe', 'pipe'] });
    let errOut = '';
    proc.stderr.on('data', (d) => { errOut += d.toString(); });
    proc.on('close', (code) => {
      if (code === 0) resolve();
      else {
        const hint = errOut.trim().split('\n').filter(Boolean).slice(-3).join(' ');
        reject(new Error(hint || `${path.basename(cmd)} falló (código ${code})`));
      }
    });
    proc.on('error', (err) => reject(new Error(`No se encontró '${path.basename(cmd)}': ${err.message}`)));
  });
}

async function runLauncher() {
  // Ampliar PATH: Docker Desktop, Homebrew, nvm
  // GESTORIA_EXTRA_PATH es seteado por GestorIA.app via launchctl setenv
  const extraPaths = [
    ...(process.env.GESTORIA_EXTRA_PATH || '').split(':').filter(Boolean),
    '/Applications/Docker.app/Contents/Resources/bin',
    '/usr/local/bin',
    '/opt/homebrew/bin',
    '/opt/homebrew/sbin',
  ];
  const nodeBin = process.execPath ? path.dirname(process.execPath) : '';
  const pathParts = (process.env.PATH || '').split(':');
  for (const p of [...extraPaths, nodeBin]) {
    if (p && !pathParts.includes(p)) pathParts.unshift(p);
  }
  // Buscar la versión de nvm activa
  try {
    const nvmBase = `${process.env.HOME}/.nvm/versions/node`;
    const versions = fs.readdirSync(nvmBase).sort().reverse();
    if (versions.length) {
      const nvmBin = `${nvmBase}/${versions[0]}/bin`;
      if (!pathParts.includes(nvmBin)) pathParts.unshift(nvmBin);
    }
  } catch { /* nvm no instalado */ }
  process.env.PATH = pathParts.join(':');

  const splash = await createSplashWindow();

  try {
    // Step 1 — db
    splashUpdate(splash, 5, 'Construyendo base de datos…', 'step-db');
    await spawnAsync('docker-compose', ['build', 'db'], PROJECT_ROOT);
    splashUpdate(splash, 18, 'Iniciando base de datos…', 'step-db');
    await spawnAsync('docker-compose', ['up', '-d', 'db'], PROJECT_ROOT);
    splashUpdate(splash, 30, 'Base de datos lista', 'step-db');

    // Step 2 — backend
    splashUpdate(splash, 33, 'Construyendo backend API…', 'step-api');
    await spawnAsync('docker-compose', ['build', 'backend'], PROJECT_ROOT);
    splashUpdate(splash, 48, 'Iniciando backend API…', 'step-api');
    await spawnAsync('docker-compose', ['up', '-d', 'backend'], PROJECT_ROOT);
    splashUpdate(splash, 55, 'Backend API listo', 'step-api');

    // Step 3 — Angular build (ng es un script JS, necesita node)
    splashUpdate(splash, 58, 'Compilando interfaz…', 'step-ui');
    const ng = path.join(APP_DIR, 'node_modules', '.bin', 'ng');
    // Buscar node en PATH
    const nodeExec = (() => {
      for (const dir of process.env.PATH.split(':')) {
        const candidate = path.join(dir, 'node');
        try { fs.accessSync(candidate, fs.constants.X_OK); return candidate; } catch { /* sigue */ }
      }
      return 'node'; // fallback
    })();
    await spawnAsync(nodeExec, [ng, 'build'], APP_DIR);
    splashUpdate(splash, 85, 'Interfaz compilada', 'step-ui');

    // Step 4 — launch
    splashUpdate(splash, 90, 'Iniciando aplicación…', 'step-launch');
    await new Promise((r) => setTimeout(r, 600));

    if (!splash.isDestroyed()) {
      splash.webContents.executeJavaScript('showDone()').catch(() => {});
    }
    await new Promise((r) => setTimeout(r, 900));

    createWindow();
    if (!splash.isDestroyed()) splash.close();
  } catch (err) {
    if (!splash.isDestroyed()) {
      splash.webContents
        .executeJavaScript(`showError(${JSON.stringify('✗ ' + err.message)})`)
        .catch(() => {});
    }
    // Keep splash visible so user can read the error; quit after 15 s
    setTimeout(() => app.quit(), 15000);
  }
}

// ════════════════════════════════════════════════════════════
app.whenReady().then(async () => {
  protocol.handle('app', (request) => {
    const url = new URL(request.url);
    const pathname = url.pathname === '/' ? '/index.html' : url.pathname;
    const filePath = path.join(DIST, pathname);

    if (fs.existsSync(filePath) && fs.statSync(filePath).isFile()) {
      return serveFile(filePath, request.headers.get('range'));
    }
    // SPA fallback → index.html
    return serveFile(path.join(DIST, 'index.html'), null);
  });

  if (process.env.GESTORIA_LAUNCHER === '1') {
    await runLauncher();
  } else {
    createWindow();
  }

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
