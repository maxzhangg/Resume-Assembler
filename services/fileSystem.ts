import { FileSystemAPI, SAMPLE_MASTER_TEX } from '../types';

/**
 * BROWSER MOCK IMPLEMENTATION
 * Used when running in pure browser environment (no window.electron).
 */
class BrowserFileSystemMock implements FileSystemAPI {
  private mockStorage: Record<string, string> = {};

  constructor() {
    this.mockStorage['C:/Work/Resume/master.tex'] = SAMPLE_MASTER_TEX;
    this.mockStorage['C:/Work/Resume/state.json'] = JSON.stringify({ sections: [] });
  }

  async selectDirectory(): Promise<string | null> {
    return new Promise((resolve) => {
      setTimeout(() => {
        const confirm = window.confirm("Running in Browser Mode.\nSimulate selecting 'C:/Work/Resume'?");
        resolve(confirm ? 'C:/Work/Resume' : null);
      }, 500);
    });
  }

  async readFile(path: string): Promise<string> {
    return this.mockStorage[path] || '';
  }

  async readBuffer(path: string): Promise<string> {
    console.log(`[Browser Mock] Read Buffer ${path}`);
    return ""; // Return empty base64 for mock
  }

  async writeFile(path: string, content: string): Promise<void> {
    console.log(`[Browser Mock Write] ${path}`);
    this.mockStorage[path] = content;
  }

  async createDirectory(path: string): Promise<void> {
    console.log(`[Browser Mock Mkdir] ${path}`);
  }

  async exists(path: string): Promise<boolean> {
    return path in this.mockStorage;
  }

  async runCompileCommand(cwd: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
    console.log(`[Browser Mock Run] latexmk in ${cwd}`);
    await new Promise(resolve => setTimeout(resolve, 2000));
    // Simulate success
    this.mockStorage[`${cwd}/build/output.pdf`] = "MOCK_PDF_DATA";
    return {
      stdout: "Latexmk: Success (Mock)",
      stderr: "",
      success: true
    };
  }

  async openExternal(path: string): Promise<void> {
    alert(`[Browser Mock] Opening external: ${path}`);
  }

  async getCompilerEngine(): Promise<'tectonic' | 'pdflatex' | 'none'> {
    return 'none'; // Mock doesn't have a real compiler
  }
}

// Determines if we are running in Electron or Browser
const getFileSystemImplementation = (): FileSystemAPI => {
  if (window.electron) {
    // Safe wrapper: contextBridge objects are sometimes frozen or stale during dev.
    // We wrap it to ensure all methods expected by Typescript actually exist at runtime.
    const electronApi = window.electron;
    
    // Check if the new method exists (it might be missing if preload hasn't reloaded)
    if (typeof electronApi.getCompilerEngine !== 'function') {
        console.warn("⚠️ window.electron.getCompilerEngine is missing. This usually means the Preload script hasn't updated. Please Restart the Terminal.");
        
        // Return a proxy object that falls back to safe defaults
        return {
            ...electronApi,
            getCompilerEngine: async () => 'none'
        };
    }

    return electronApi;
  } else {
    console.log("No Electron detected. Using browser mock.");
    return new BrowserFileSystemMock();
  }
};

export const fileSystem: FileSystemAPI = getFileSystemImplementation();