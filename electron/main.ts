import { app, BrowserWindow, ipcMain, dialog, shell, IpcMainInvokeEvent } from 'electron';
import path from 'path';
import fs from 'fs/promises';
import { exec } from 'child_process';
import os from 'os';
import { fileURLToPath } from 'url';

// ESM replacement for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Use strict output for compilation
const COMPILE_DIR_NAME = 'build';

// Fix for missing __dirname definition in some build contexts
const CURRENT_DIR = __dirname; 
const PRELOAD_PATH = path.join(CURRENT_DIR, 'preload.js');

// --- HELPER: Fix PATH for common locations ---
// Many users install Tectonic via Cargo or place it in local bin folders but forget 
// to update system PATH. We preemptively add them to the process environment.
const fixPath = () => {
  const home = os.homedir();
  const platform = os.platform();
  const pathSeparator = platform === 'win32' ? ';' : ':';
  
  const commonPaths = [
      path.join(home, '.cargo', 'bin'), // Standard Rust install location
      path.join(home, 'AppData', 'Local', 'bin'), // Common Windows user bin
      path.join('C:', 'Program Files', 'Tectonic'), // Hypothetical installer path
      path.join('C:', 'Tools'), // Common custom tool path
  ];

  let currentPath = process.env.PATH || '';
  let count = 0;
  
  commonPaths.forEach(p => {
      // Simple check to avoid duplicates
      if (!currentPath.includes(p)) {
          currentPath = p + pathSeparator + currentPath;
          count++;
      }
  });

  process.env.PATH = currentPath;
  if (count > 0) {
      console.log(`[Main] 🔧 Auto-fixed PATH. Added ${count} common binary locations.`);
  }
};

// Run this immediately
fixPath();

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

    // --- Compiler Status Check ---
    this.handle('compiler:get-engine', async () => {
       console.log('[Main] 🔍 Checking for compiler engines...');
       
       const check = (cmd: string): Promise<boolean> => {
          return new Promise(resolve => {
              exec(`${cmd} --version`, (err, stdout) => {
                  if (err) {
                      // Don't spam logs with "not found" unless debugging, but let's print the first line of error
                      console.log(`[Main] ❌ ${cmd} check failed: ${err.message.split('\n')[0]}`);
                      resolve(false);
                  } else {
                      console.log(`[Main] ✅ Found ${cmd}: ${stdout.split('\n')[0]}`);
                      resolve(true);
                  }
              });
          });
      };
      
      if (await check('tectonic')) return 'tectonic';
      if (await check('pdflatex')) return 'pdflatex';
      
      console.log('[Main] ⚠️ No compiler found. Current PATH starts with:', process.env.PATH?.substring(0, 200) + '...');
      return 'none';
    });

    // --- Compiler Handlers ---
    this.handle('compiler:run', async (_, cwd: string) => {
      
      const checkCommand = (cmd: string): Promise<boolean> => {
          return new Promise(resolve => {
              exec(`${cmd} --version`, (err) => resolve(!err));
          });
      };

      const runCommand = (cmd: string): Promise<{success: boolean, stdout: string, stderr: string}> => {
        return new Promise((resolve) => {
          // Use a large buffer to prevent crash on verbose logs
          console.log(`[Compiler] Executing: ${cmd}`);
          exec(cmd, { cwd, maxBuffer: 1024 * 1024 * 20 }, (error, stdout, stderr) => {
            resolve({
              success: !error,
              stdout: stdout || '',
              stderr: stderr || (error ? error.message : '')
            });
          });
        });
      };

      const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
      const isWin = os.platform() === 'win32';
      const interactionFlag = '-interaction=nonstopmode';
      
      // --- STRATEGY 0: Tectonic (The Modern Alternative) ---
      const hasTectonic = await checkCommand('tectonic');
      
      if (hasTectonic) {
           console.log("[Compiler] Tectonic detected. Using it as primary engine.");
           // ensure build dir exists
           await fs.mkdir(path.join(cwd, COMPILE_DIR_NAME), { recursive: true });
           const tectonicCmd = `tectonic -X compile compiled.tex --outdir ${COMPILE_DIR_NAME} --keep-logs`;
           return await runCommand(tectonicCmd);
      }

      // --- STRATEGY 1: Standard Pdflatex/Latexmk (Legacy) ---
      const getCmd = (enableInstaller: boolean, useLatexmk: boolean) => {
          const installerFlag = (isWin && enableInstaller) ? '--enable-installer' : '';
          
          if (useLatexmk) {
              return `latexmk -pdf -pdflatex="pdflatex ${interactionFlag} ${installerFlag} %O %S" -outdir=${COMPILE_DIR_NAME} compiled.tex`;
          } else {
              return `pdflatex ${interactionFlag} ${installerFlag} -output-directory=${COMPILE_DIR_NAME} compiled.tex`;
          }
      };

      console.log(`[Compiler] Step 1: Attempting clean compile (No auto-install)...`);
      let result = await runCommand(getCmd(false, true));

      const logCombined = result.stdout + "\n" + result.stderr;
      
      const isMissingPackage = logCombined.includes("! LaTeX Error: File") && logCombined.includes("not found");
      const latexmkFailed = !result.success && !isMissingPackage; 

      if (!result.success && isMissingPackage) {
          console.log(`[Compiler] Missing packages detected. Step 2: Compile WITH auto-install...`);
          result = await runCommand(getCmd(true, true));

          if (!result.success && (result.stderr.includes("lock") || result.stdout.includes("lock"))) {
              console.log(`[Compiler] MiKTeX Lock detected. Waiting 3s for cleanup...`);
              await wait(3000);
              console.log(`[Compiler] Step 3: Retry auto-install...`);
              result = await runCommand(getCmd(true, true));
          }
      } 
      else if (latexmkFailed) {
          console.log(`[Compiler] Latexmk failed execution. Step 2: Fallback to direct pdflatex...`);
          result = await runCommand(getCmd(false, false));
          
          if (!result.success && (result.stdout.includes("! LaTeX Error: File") || result.stderr.includes("! LaTeX Error: File"))) {
             console.log(`[Compiler] Pdflatex missing packages. Step 3: Pdflatex WITH auto-install...`);
             result = await runCommand(getCmd(true, false));
          }
          if (result.success) await runCommand(getCmd(false, false));
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

  if (process.env.VITE_DEV_SERVER_URL) {
    mainWindow.loadURL(process.env.VITE_DEV_SERVER_URL);
    mainWindow.webContents.openDevTools();
  } else {
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