const { app, BrowserWindow } = require('electron');
const path = require('path');
const isDev = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 1000,
    minHeight: 650,
    show: false, // Emplêche le scintillement blanc au chargement
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      preload: path.join(__dirname, 'preload.js')
    },
    title: 'ISW Technosys - SIRH',
    icon: path.join(__dirname, '../public/icon.png'),
    autoHideMenuBar: true,
  });

  // Afficher la fenêtre uniquement lorsque le contenu est chargé
  win.once('ready-to-show', () => {
    win.show();
  });

  if (isDev) {
    win.loadURL('http://localhost:5173');
    win.webContents.openDevTools();

    // Raccourcis pratiques en mode développement
    win.webContents.on('before-input-event', (event, input) => {
      if (input.control && input.key.toLowerCase() === 'r') {
        win.reload();
        event.preventDefault();
      }
      if (input.control && input.shift && input.key.toLowerCase() === 'i') {
        win.webContents.toggleDevTools();
        event.preventDefault();
      }
    });
  } else {
    // Crée un serveur HTTP local pour servir les fichiers de production.
    // Cela résout le problème de sécurité (Secure Origin) qui bloque les clés de sécurité (WebAuthn/Windows Hello) sous file://
    const http = require('http');
    const fs = require('fs');

    const distPath = path.resolve(__dirname, '../dist');

    const server = http.createServer((req, res) => {
      let filePath = path.join(distPath, req.url.split('?')[0]);
      if (filePath === distPath || filePath.endsWith(path.sep)) {
        filePath = path.join(distPath, 'index.html');
      }

      // Protection contre le parcours de répertoires (directory traversal)
      const resolvedPath = path.resolve(filePath);
      if (!resolvedPath.startsWith(distPath)) {
        res.writeHead(403);
        res.end('Accès interdit');
        return;
      }

      const extname = String(path.extname(resolvedPath)).toLowerCase();
      const mimeTypes = {
        '.html': 'text/html',
        '.js': 'text/javascript',
        '.css': 'text/css',
        '.json': 'application/json',
        '.png': 'image/png',
        '.jpg': 'image/jpg',
        '.gif': 'image/gif',
        '.svg': 'image/svg+xml',
        '.wav': 'audio/wav',
        '.mp4': 'video/mp4',
        '.woff': 'application/font-woff',
        '.ttf': 'application/font-ttf',
        '.eot': 'application/vnd.ms-fontobject',
        '.otf': 'application/font-otf',
        '.wasm': 'application/wasm'
      };

      const contentType = mimeTypes[extname] || 'application/octet-stream';

      fs.readFile(resolvedPath, (error, content) => {
        if (error) {
          if (error.code === 'ENOENT') {
            // Routage SPA (fallback sur index.html)
            fs.readFile(path.join(distPath, 'index.html'), (err, htmlContent) => {
              if (err) {
                res.writeHead(500);
                res.end(`Erreur : ${err.code}`);
              } else {
                res.writeHead(200, { 'Content-Type': 'text/html' });
                res.end(htmlContent, 'utf-8');
              }
            });
          } else {
            res.writeHead(500);
            res.end(`Erreur : ${error.code}`);
          }
        } else {
          res.writeHead(200, { 'Content-Type': contentType });
          res.end(content, 'utf-8');
        }
      });
    });

    // Écoute sur l'adresse de bouclage uniquement (127.0.0.1) et choisit un port libre dynamiquement (0)
    server.listen(0, '127.0.0.1', () => {
      const port = server.address().port;
      win.loadURL(`http://localhost:${port}`);
    });

    // Fermeture du serveur à la fermeture de la fenêtre
    win.on('closed', () => {
      server.close();
    });
  }
}

app.whenReady().then(() => {
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
