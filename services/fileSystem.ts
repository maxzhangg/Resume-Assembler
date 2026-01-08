import { FileSystemAPI, SAMPLE_MASTER_TEX } from '../types';

/**
 * BROWSER MOCK IMPLEMENTATION
 * 
 * In a real Electron app, this file would import 'fs' and 'child_process' 
 * using window.require (contextBridge) or IPC channels.
 */
class BrowserFileSystem implements FileSystemAPI {
  private mockStorage: Record<string, string> = {};

  constructor() {
    // Pre-populate mock workspace if empty
    this.mockStorage['C:/Work/Resume/master.tex'] = SAMPLE_MASTER_TEX;
    this.mockStorage['C:/Work/Resume/state.json'] = JSON.stringify({ sections: [] });
  }

  async selectDirectory(): Promise<string | null> {
    // Mocking the native dialog
    return new Promise((resolve) => {
      setTimeout(() => {
        const confirm = window.confirm("Simulate selecting 'C:/Work/Resume'?");
        resolve(confirm ? 'C:/Work/Resume' : null);
      }, 500);
    });
  }

  async readFile(path: string): Promise<string> {
    return this.mockStorage[path] || '';
  }

  async writeFile(path: string, content: string): Promise<void> {
    console.log(`[FS Write] ${path}`, content.slice(0, 50) + '...');
    this.mockStorage[path] = content;
  }

  async createDirectory(path: string): Promise<void> {
    console.log(`[FS Mkdir] ${path}`);
    // No-op in mock object storage
  }

  async exists(path: string): Promise<boolean> {
    return path in this.mockStorage;
  }

  async runCompileCommand(cwd: string): Promise<{ stdout: string; stderr: string; success: boolean }> {
    console.log(`[FS Run] Running 'latexmk -pdf' in ${cwd}`);
    
    // Simulate compilation delay
    await new Promise(resolve => setTimeout(resolve, 2000));

    // Simple probability of success for demo
    const success = true; 

    if (success) {
      // Create a fake PDF file
      this.mockStorage[`${cwd}/build/output.pdf`] = "MOCK_PDF_BINARY_DATA";
      return {
        stdout: "Latexmk: This is Latexmk, John Collins, 17 Nov 2021.\nLatexmk: applying rule 'pdflatex'...\nOutput written on output.pdf (1 page, 14502 bytes).",
        stderr: "",
        success: true
      };
    } else {
      return {
        stdout: "",
        stderr: "! LaTeX Error: File 'unknown.sty' not found.",
        success: false
      };
    }
  }

  async openExternal(path: string): Promise<void> {
    alert(`Request to open external file: ${path}\n(In Electron, this would launch the system PDF viewer)`);
  }
}

// In a real Electron app, we would expose this via preload.js
// For now, we export the mock.
export const fileSystem: FileSystemAPI = new BrowserFileSystem();
