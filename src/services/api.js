/**
 * API client for Python backend with auto-discovery and retry capabilities
 */
import { getElectronBridge } from './electronBridge';

class PythonApi {
  constructor() {
    this.port = null;
    this.baseUrl = null;
    this.initialized = false;
    this.initPromise = null;
    this.retryTimeout = null;
    this.requestQueue = [];
    this.maxRetries = 3;
    this.currentRetry = 0;
    
    // Initialize the API client
    this.init();
    
    // Listen for backend status updates from Electron
    if (window.electron) {
      window.electron.receive('backend-status', (status) => {
        console.log('Backend status update:', status);
        if (status.status === 'running' && status.port) {
          this.updateBackendInfo(status.port);
        } else if (['crashed', 'failed', 'stopped', 'unresponsive'].includes(status.status)) {
          this.initialized = false;
          this.scheduleReconnect();
        }
      });
    }
    
    // Set up periodic backend status checks
    this.setupPeriodicChecks();
  }
  
  setupPeriodicChecks() {
    // Check backend status every 10 seconds
    setInterval(async () => {
      if (window.electron && !this.initialized) {
        try {
          const status = await window.electron.checkPythonBackend();
          if (status.status === 'running' && status.available && status.port) {
            this.updateBackendInfo(status.port);
          }
        } catch (error) {
          console.warn('Failed to check backend status:', error);
        }
      }
    }, 10000);
  }
  
  updateBackendInfo(port) {
    if (port !== this.port || !this.initialized) {
      console.log(`Updating API baseUrl to use port ${port}`);
      this.port = port;
      this.baseUrl = `http://65.0.11.70:${port}`;
      this.initialized = true;
      this.currentRetry = 0;
      this.processQueue();
    }
  }

  /**
   * Initialize the API client and discover the backend port
   */
  init() {
    if (this.initPromise) return this.initPromise;
    
    this.initPromise = new Promise(async (resolve) => {
      try {
        const electron = getElectronBridge();
        try {
          this.port = await electron.getPythonPort();
          if (this.port) {
            this.baseUrl = `http://65.0.11.70:${this.port}`;
            console.log('API initialized with port from Electron:', this.port);
            this.initialized = true;
            resolve({ port: this.port });
            this.processQueue();
            return;
          }
        } catch (error) {
          console.warn('Failed to get Python port from Electron:', error);
        }
        
        // If still not initialized, use default port
        this.port = 5000;
        this.baseUrl = `http://65.0.11.70:${this.port}`;
        this.initialized = true;
        resolve({ port: this.port });
        this.processQueue();
      } catch (error) {
        console.error('API initialization failed:', error);
        this.initialized = false;
        this.scheduleReconnect();
        resolve({ error });
      }
    });
    
    return this.initPromise;
  }

  /**
   * Detect backend port by probing common ports
   */
  async detectPortByProbing() {
    console.log('Detecting backend port by probing...');
    
    // Try common ports in our range, starting with port 5000 where the backend is running
    const ports = [5000, 8099, 8100, 8098, 8097, 8000, 8080];
    
    for (const port of ports) {
      try {
        const response = await fetch(`http://65.0.11.70:${port}/`, { 
          method: 'GET',
          headers: { 'Accept': 'application/json' },
          signal: AbortSignal.timeout(500) // Abort after 500ms
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data && (data.service === 'Clara Backend' || data.status === 'ok' || data.status === 'healthy')) {
            this.port = port;
            this.baseUrl = `http://65.0.11.70:${port}`;
            this.initialized = true;
            console.log(`Detected API on port ${port}`);
            return;
          }
        }
      } catch (e) {
        // Ignore errors, just try next port
      }
    }
    
    console.warn('Failed to detect backend port by probing');
    
    // If we couldn't detect the port, use port 5000 as default
    this.port = 5000;
    this.baseUrl = `http://65.0.11.70:${this.port}`;
    this.initialized = false;
    
    throw new Error('Failed to connect to the Python backend');
  }

  /**
   * Schedule a reconnection attempt
   */
  scheduleReconnect(delay = 5000) {
    if (this.retryTimeout) clearTimeout(this.retryTimeout);
    
    this.retryTimeout = setTimeout(() => {
      console.log('Attempting to reconnect to backend...');
      this.initPromise = null;
      this.init();
    }, delay);
  }

  /**
   * Process any queued requests
   */
  processQueue() {
    if (!this.initialized || this.requestQueue.length === 0) return;
    
    console.log(`Processing ${this.requestQueue.length} queued requests`);
    
    while (this.requestQueue.length > 0) {
      const { request, resolve, reject } = this.requestQueue.shift();
      this.makeRequest(request).then(resolve).catch(reject);
    }
  }

  /**
   * Ensure the client is initialized before making requests
   */
  async ensureInitialized() {
    if (!this.initialized) {
      await this.init();
      if (!this.initialized) {
        throw new Error('API client is not initialized');
      }
    }
  }

  /**
   * Get test data from the backend with retries
   */
  async getTest() {
    return this.makeRequest({ url: '/test' });
  }

  /**
   * Check health of the backend
   */
  async checkHealth() {
    return this.makeRequest({ url: '/health' });
  }

  /**
   * Make an HTTP request to the Python backend
   */
  async makeRequest(request) {
    if (!this.initialized) {
      return new Promise((resolve, reject) => {
        this.requestQueue.push({ request, resolve, reject });
      });
    }

    try {
      const response = await fetch(`${this.baseUrl}${request.url}`, {
        method: request.method || 'GET',
        headers: {
          'Content-Type': 'application/json',
          ...request.headers
        },
        body: request.body ? JSON.stringify(request.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('API request failed:', error);
      this.initialized = false;
      this.scheduleReconnect();
      throw error;
    }
  }

  /**
   * Get the current backend port
   */
  getPort() {
    return this.port;
  }

  /**
   * Check if the client is ready
   */
  isReady() {
    return this.initialized;
  }
}

// Create singleton instance
const api = new PythonApi();
export default api;

