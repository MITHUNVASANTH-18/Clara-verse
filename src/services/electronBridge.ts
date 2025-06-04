import { ElectronAPI } from '../types/electron';

// Check if we're in an Electron environment
export const isElectronEnvironment = (): boolean => {
  return typeof window !== 'undefined' && 
         'electron' in window && 
         window.electron !== null &&
         typeof window.electron === 'object';
};

// Web fallback implementation of ElectronAPI
const webFallback: ElectronAPI = {
  getAppVersion: () => '1.0.0',
  getElectronVersion: () => 'web',
  getPlatform: () => 'web',
  getOsVersion: () => 'web',
  getWorkflowsPath: () => Promise.resolve('/workflows'),
  getServicePorts: () => Promise.resolve({ n8nPort: 5678 }),
  checkN8NHealth: () => Promise.resolve(true),
  startN8N: () => Promise.resolve(),
  stopN8N: () => Promise.resolve(),
  getPythonPort: () => Promise.resolve(5000),
  checkPythonBackend: () => Promise.resolve(true),
  checkDockerServices: () => Promise.resolve({
    dockerAvailable: true,
    n8nAvailable: true,
    pythonAvailable: true,
    ports: {
      python: 5000,
      n8n: 5678,
      ollama: 11434
    }
  }),
  restartInterpreterContainer: () => Promise.resolve({ success: true }),
  checkForUpdates: () => Promise.resolve(),
  getUpdateInfo: () => Promise.resolve({
    hasUpdate: false,
    currentVersion: '1.0.0',
    platform: 'web',
    isOTASupported: false
  }),
  sendReactReady: () => {},
  clipboard: {
    writeText: (text: string) => {
      if (navigator.clipboard) {
        navigator.clipboard.writeText(text).catch(error => {
          console.error('Failed to write to clipboard:', error);
        });
      }
    },
    readText: () => {
      let text = '';
      if (navigator.clipboard) {
        try {
          // Since we can't make this synchronous, return empty string on error
          navigator.clipboard.readText().catch(() => '');
        } catch {
          // Return empty string if clipboard access fails
        }
      }
      return text;
    }
  },
  ipcRenderer: {
    on: (_channel: string, _callback: (data: any) => void) => {},
    removeListener: (_channel: string, _callback: (...args: any[]) => void) => {},
    removeAllListeners: (_channel: string) => {}
  },
  receive: (_channel: string, _callback: (data: any) => void) => {},
  removeListener: (_channel: string) => {},
  isDev: false,
  requestMicrophonePermission: () => Promise.resolve(false)
};

// Get the appropriate implementation based on environment
export const getElectronBridge = (): ElectronAPI => {
  if (isElectronEnvironment()) {
    return window.electron;
  }
  return webFallback;
};

export default getElectronBridge; 