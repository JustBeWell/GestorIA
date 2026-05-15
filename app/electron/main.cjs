const { app, BrowserWindow, Notification, ipcMain, protocol } = require('electron');
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

// ── Nombre e icono de la app (antes de whenReady) ──────────────
app.name = 'GestorIA';

const isDev = process.env.NODE_ENV === 'development';
const DIST = path.join(__dirname, '..', 'dist', 'login-desktop', 'browser');
let mainWindow = null;

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

function createWindow(options = {}) {
  const { show = true } = options;
  const win = new BrowserWindow({
    width: 1920,
    height: 1080,
    show,
    opacity: show ? 1 : 0,
    backgroundColor: '#0c1a16',
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

  mainWindow = win;
  return win;
}

ipcMain.on('notify', (_, payload = {}) => {
  const notification = new Notification({
    title: payload.title || 'GestorIA',
    body: payload.body || '',
  });
  notification.on('click', () => {
    if (mainWindow && payload.url) {
      mainWindow.webContents.send('navigate', payload.url);
    }
  });
  notification.show();
});

// ════════════════════════════════════════════════════════════
//  LAUNCHER — splash window + build steps
// ════════════════════════════════════════════════════════════

/** Open the splash window and resolve when its DOM is ready */
function createSplashWindow() {
  const splash = new BrowserWindow({
    width: 700,
    height: 440,
    frame: false,
    resizable: false,
    center: true,
    skipTaskbar: true,
    alwaysOnTop: true,
    backgroundColor: '#2d5a45',
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
function splashUpdate(splash, pct, text) {
  if (splash.isDestroyed()) return;
  splash.webContents.executeJavaScript(`updateProgress(${pct}, ${JSON.stringify(text)})`).catch(() => {});
}

/** Inicia el avance lento de la barra hasta maxPct mientras se espera una operación */
function splashCreep(splash, maxPct, step = 0.35, intervalMs = 180) {
  if (splash.isDestroyed()) return;
  splash.webContents.executeJavaScript(`startCreep(${maxPct}, ${step}, ${intervalMs})`).catch(() => {});
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function waitForWindowReady(win, maxWaitMs = 8000) {
  if (win.isDestroyed()) return Promise.resolve();

  return new Promise((resolve) => {
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      clearTimeout(timeout);
      win.webContents.off('did-finish-load', finish);
      win.webContents.off('did-fail-load', finish);
      win.off('ready-to-show', finish);
      resolve();
    };
    const timeout = setTimeout(finish, maxWaitMs);

    win.once('ready-to-show', finish);
    win.webContents.once('did-finish-load', finish);
    win.webContents.once('did-fail-load', finish);
  });
}

async function showMainWindowSmoothly(win, splash) {
  if (win.isDestroyed()) return;

  await waitForWindowReady(win);
  if (win.isDestroyed()) return;

  win.setOpacity(0);
  win.show();
  win.focus();

  if (splash && !splash.isDestroyed()) {
    splash.webContents.executeJavaScript('fadeOutSplash()').catch(() => {});
  }

  const fadeMs = 700;
  const steps = 24;
  const frameMs = Math.round(fadeMs / steps);
  for (let i = 1; i <= steps; i += 1) {
    if (win.isDestroyed()) return;
    const progress = i / steps;
    const eased = 1 - Math.pow(1 - progress, 3);
    win.setOpacity(eased);
    if (splash && !splash.isDestroyed()) splash.setOpacity(1 - eased);
    await sleep(frameMs);
  }

  if (!win.isDestroyed()) win.setOpacity(1);
  if (splash && !splash.isDestroyed()) splash.close();
  if (!win.isDestroyed()) win.focus();
}

/** Espera a que el gateway nginx responda en /gateway/health */
function waitForGateway(maxWaitMs = 60000) {
  const http = require('http');
  const pollInterval = 1500;
  let elapsed = 0;
  return new Promise((resolve) => {
    const check = () => {
      const req = http.get('http://localhost:8008/gateway/health', (res) => {
        if (res.statusCode === 200) return resolve();
        retry();
      });
      req.on('error', retry);
      req.setTimeout(1000, () => { req.destroy(); retry(); });
    };
    const retry = () => {
      elapsed += pollInterval;
      if (elapsed >= maxWaitMs) return resolve(); // no bloquear indefinidamente
      setTimeout(check, pollInterval);
    };
    check();
  });
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
    // ── Paso 1: base de datos ────────────────────────────────────────────────
    splashUpdate(splash, 4, 'Arrancando el motor de base de datos…');
    splashCreep(splash, 20);
    await spawnAsync('docker-compose', ['up', '-d', 'db'], PROJECT_ROOT);
    splashUpdate(splash, 22, 'Base de datos conectada');
    await sleep(350);

    // ── Paso 2: construir imagen compartida ──────────────────────────────────
    splashUpdate(splash, 24, 'Preparando los módulos de la aplicación…');
    splashCreep(splash, 56);
    await spawnAsync('docker-compose', ['build'], PROJECT_ROOT);
    splashUpdate(splash, 57, 'Módulos compilados correctamente');
    await sleep(300);

    // ── Paso 3: levantar microservicios ──────────────────────────────────────
    splashUpdate(splash, 59, 'Iniciando los servicios en segundo plano…');
    splashCreep(splash, 70);
    await spawnAsync('docker-compose', ['up', '-d'], PROJECT_ROOT);
    splashUpdate(splash, 71, 'Servicios iniciados, verificando disponibilidad…');

    // ── Paso 4: esperar gateway ──────────────────────────────────────────────
    splashCreep(splash, 83);
    await waitForGateway();
    splashUpdate(splash, 84, 'Todos los servicios responden correctamente');
    await sleep(350);

    // ── Paso 5: compilar Angular ─────────────────────────────────────────────
    splashUpdate(splash, 86, 'Compilando la interfaz de usuario…');
    splashCreep(splash, 96);
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
    splashUpdate(splash, 97, 'Interfaz lista, abriendo GestorIA…');
    await sleep(500);

    if (!splash.isDestroyed()) {
      splash.webContents.executeJavaScript('showDone()').catch(() => {});
    }
    await sleep(1000);

    const win = createWindow({ show: false });
    await showMainWindowSmoothly(win, splash);
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
  // Icono cuadrado 1024×1024 — macOS aplica squircle mask sobre PNG sólido sin alpha
  if (process.platform === 'darwin') {
    const { nativeImage } = require('electron');
    const iconPath = path.join(APP_DIR, 'public', 'dock-icon.png');
    if (fs.existsSync(iconPath)) {
      app.dock.setIcon(nativeImage.createFromPath(iconPath));
    }
  }
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
