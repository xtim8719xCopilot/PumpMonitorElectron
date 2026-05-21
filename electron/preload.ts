// Preload runs in a privileged context — keep it minimal.
// Add contextBridge exposes here if main-process IPC is ever needed.
import { contextBridge } from 'electron';

contextBridge.exposeInMainWorld('electronAPI', {
  platform: process.platform,
});
