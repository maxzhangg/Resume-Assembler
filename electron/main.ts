import { app, BrowserWindow, ipcMain, dialog, shell, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import os from 'os';

// Use strict output for compilation
const COMPILE_DIR_NAME = 'build';

// Fix for missing __dirname definition in some build contexts
const CURRENT_DIR = __dirname; 
const PRELOAD_PATH = path.join(CURRENT_DIR, 'preload.js');

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
          // Use a large buffer to prevent crash on verbose logs
          exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 10 }, (error, stdout, stderr) => {
            resolve({
              success: !error,
              stdout: stdout || '',
              stderr: stderr || (error ? error.message : '')
            });
          });
        });
      };

      // 1. Try latexmk (Standard)
      // -interaction=nonstopmode: Don't pause on errors
      // -pdf: Generate PDF
      // -outdir: Specify output directory
      let result = await runCommand(`latexmk -pdf -interaction=nonstopmode -outdir=${COMPILE_DIR_NAME} compiled.tex`);
      
      if (!result.success) {
        console.log("Latexmk failed/missing, attempting fallback to pdflatex...");
        
        // 2. Fallback: pdflatex
        // Note: -output-directory is the flag for pdflatex (latexmk uses -outdir)
        const cmd = `pdflatex -interaction=nonstopmode -output-directory=${COMPILE_DIR_NAME} compiled.tex`;
        result = await runCommand(cmd);
        
        // Run twice for cross-references if the first one succeeded (basic check)
        if (result.success) {
            await runCommand(cmd);
        }
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
      contextIsolation: true, // MUST be true for contextBridge to work
      nodeIntegration: false, // Security best practice
      webSecurity: false // Temporary allowed for loading local file:// PDFs in iframe if needed
    },
    title: "Resume Assembler",
    backgroundColor: '#f3f4f6',
    show: false // Don't show until ready to prevent white flash
  });

  // Critical: Check if VITE_DEV_SERVER_URL is set by the plugin
  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
    // Production / Build mode
    mainWindow.loadFile(path.join(__dirname, '../dist/index.html'));
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow?.show();
  });

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