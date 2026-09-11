/**
 * ALCO License Generator - Electron Main Process Entry Point
 * 
 * Cryptographic Licensing Authority Host Process
 * Owns file persistence under app.getPath('userData')
 * Owns volatile Ed25519 signing authority
 * Enforces strict webPreferences and navigation denial
 */

import { app, BrowserWindow } from 'electron';
import fs from 'node:fs';
import path from 'node:path';
import { ElectronFileStorageService } from './services/storage-service';
import { MainVaultService } from './services/vault-service';
import { MainSigningService } from './services/signing-service';
import { MainBackupService } from './services/backup-service';
import { MainMigrationService } from './services/migration-service';
import { registerIpcHandlers } from './ipc/handlers';
import { isAllowedAppNavigation } from './navigation-security';

let mainWindow: BrowserWindow | null = null;
let vaultService: MainVaultService | null = null;

function createWindow(): void {
  // Preload location: In development (.electron-dev/preload.cjs) or production build
  const preloadCjs = path.join(__dirname, 'preload.cjs');
  const preloadJs = path.join(__dirname, 'preload.js');
  const preloadPath = fs.existsSync(preloadCjs) ? preloadCjs : preloadJs;

  mainWindow = new BrowserWindow({
    width: 1280,
    height: 860,
    minWidth: 980,
    minHeight: 700,
    title: 'ALCO License Generator — Owner Licensing Authority',
    backgroundColor: '#020617', // slate-950
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
      webSecurity: true,
      preload: preloadPath
    }
  });

  // Security: Block all attempts to open new browser windows
  mainWindow.webContents.setWindowOpenHandler(() => {
    return { action: 'deny' };
  });

  // Security: Block arbitrary external navigation
  mainWindow.webContents.on('will-navigate', (event, navigationUrl) => {
    if (!isAllowedAppNavigation(navigationUrl, !!process.env.VITE_DEV_SERVER_URL)) {
      event.preventDefault();
    }
  });

  // Load UI
  if (process.env.VITE_DEV_SERVER_URL) {
    if (!isAllowedAppNavigation(process.env.VITE_DEV_SERVER_URL, true)) {
      throw new Error('Refusing to load unapproved development origin.');
    }
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
  } else {
    // Production dist loading
    const indexPath = path.join(__dirname, '../dist/index.html');
    mainWindow.loadFile(indexPath);
  }

  mainWindow.on('closed', () => {
    mainWindow = null;
    if (process.env.VITE_DEV_SERVER_URL) {
      app.quit();
    }
  });
}

// Application Lifecycle
app.whenReady().then(() => {
  const userDataDir = app.getPath('userData');
  const storageService = new ElectronFileStorageService(userDataDir);
  vaultService = new MainVaultService(storageService);
  const signingService = new MainSigningService(vaultService, storageService);
  const backupService = new MainBackupService(storageService, vaultService);
  const migrationService = new MainMigrationService(storageService, vaultService);

  // Register strictly typed IPC handlers
  registerIpcHandlers(vaultService, signingService, storageService, backupService, migrationService);

  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (vaultService) {
    vaultService.lockVault();
  }
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

app.on('before-quit', () => {
  // Clear any residual memory
  if (vaultService) {
    vaultService.lockVault();
  }
});
