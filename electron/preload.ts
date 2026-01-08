import { contextBridge, ipcRenderer } from 'electron';

// Expose protected methods that allow the renderer process to use
// the ipcRenderer without exposing the entire object
contextBridge.exposeInMainWorld('electron', {
  readFile: (path: string) => ipcRenderer.invoke('fs:read-file', path),
  readBuffer: (path: string) => ipcRenderer.invoke('fs:read-buffer', path),
  writeFile: (path: string, content: string) => ipcRenderer.invoke('fs:write-file', path, content),
  createDirectory: (path: string) => ipcRenderer.invoke('fs:mkdir', path),
  exists: (path: string) => ipcRenderer.invoke('fs:exists', path),
  runCompileCommand: (cwd: string) => ipcRenderer.invoke('compiler:run', cwd),
  selectDirectory: () => ipcRenderer.invoke('dialog:select-directory'),
  openExternal: (path: string) => ipcRenderer.invoke('shell:open-external', path),
  getCompilerEngine: () => ipcRenderer.invoke('compiler:get-engine'),
});