import { app, BrowserWindow, ipcMain, dialog, shell, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import os from 'os';

// Fix for missing __dirname definition in some TypeScript configurations
declare var __dirname: string;

// --- Configuration & Constants ---
const IS_DEV = process.env.NODE_ENV === 'development' || !app.isPackaged;
const PRELOAD_PATH = path.join(__dirname, 'preload.js');
const RENDERER_DEV_URL = 'http://localhost:3000';
const RENDERER_PROD_PATH = path.join(__dirname, '../build/index.html');

// --- Extensible IPC Router ---
class IpcRouter {
  constructor() {
    this.registerHandlers();
  }

  // Wrapper to handle errors consistently
  private handle(channel: string, handler: (event: IpcMainInvokeEvent, ...args: any[]) => Promise<any> | any) {
    ipcMain.handle(channel, async (event, ...args) => {
      try {
        return await handler(event, ...args);
      } catch (error: any) {
        console.error(`[IPC Error] Channel: ${channel}`, error);
        return { error: error.message || 'Unknown backend error' };
      }
    });
  }

  private registerHandlers() {
    // --- File System Handlers ---
    this.handle('fs:read-file', async (_, filePath: string) => {
      return await fs.readFile(filePath, 'utf-8');
    });

    // Read file as base64 buffer (for PDF preview)
    this.handle('fs:read-buffer', async (_, filePath: string) => {
      try {
        const buffer = await fs.readFile(filePath);
        if (buffer.length === 0) throw new Error("File is empty");
        return buffer.toString('base64');
      } catch (e) {
        console.error("Failed to read PDF buffer:", e);
        throw e;
      }
    });

    this.handle('fs:write-file', async (_, filePath: string, content: string) => {
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, content, 'utf-8');
    });

    this.handle('fs:exists', async (_, filePath: string) => {
      try {
        await fs.access(filePath);
        return true;
      } catch {
        return false;
      }
    });

    this.handle('fs:mkdir', async (_, dirPath: string) => {
      await fs.mkdir(dirPath, { recursive: true });
    });

    // --- Dialog Handlers ---
    this.handle('dialog:select-directory', async (event) => {
      const window = BrowserWindow.fromWebContents(event.sender);
      const result = await dialog.showOpenDialog(window!, {
        properties: ['openDirectory', 'createDirectory']
      });
      if (result.canceled) return null;
      return result.filePaths[0];
    });

    // --- System/Shell Handlers ---
    this.handle('shell:open-external', async (_, filePath: string) => {
      await shell.openPath(filePath);
    });

    // --- Compiler Handlers ---
    this.handle('compiler:run', async (_, cwd: string) => {
      
      const runCommand = (cmd: string): Promise<{success: boolean, stdout: string, stderr: string}> => {
        return new Promise((resolve) => {
          exec(cmd, { cwd }, (error, stdout, stderr) => {
            resolve({
              success: !error,
              stdout: stdout || '',
              stderr: stderr || (error ? error.message : '')
            });
          });
        });
      };

      // Strategy: Try latexmk first (best for dependencies), fallback to pdflatex (standard, no perl needed)
      // Note: We use -interaction=nonstopmode to prevent hanging on errors
      
      // 1. Try latexmk
      let result = await runCommand('latexmk -pdf -interaction=nonstopmode -output-directory=build compiled.tex');
      
      if (!result.success) {
        console.log("Latexmk failed or not found, falling back to pdflatex...");
        // 2. Fallback to pdflatex (Note: output-directory flag syntax varies, strictly typically -output-directory works for MiKTeX/TeXLive)
        // We run it twice to resolve basic references if possible, though mostly once is enough for preview
        result = await runCommand('pdflatex -interaction=nonstopmode -output-directory=build compiled.tex');
      }

      return result;
    });
  }
}

// --- Main Application Window ---
let mainWindow: BrowserWindow | null = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    webPreferences: {
      preload: PRELOAD_PATH,
      contextIsolation: true,
      nodeIntegration: false,
      webSecurity: true // Keep security on
    },
    title: "Resume Assembler",
    backgroundColor: '#f3f4f6'
  });

  if (IS_DEV) {
    mainWindow.loadURL(RENDERER_DEV_URL);
    mainWindow.webContents.openDevTools();
  } else {
    mainWindow.loadFile(RENDERER_PROD_PATH);
  }

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });
}

app.whenReady().then(() => {
  new IpcRouter();
  createWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (os.platform() !== 'darwin') app.quit();
});