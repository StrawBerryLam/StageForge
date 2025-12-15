const { spawn } = require('child_process');
const EventEmitter = require('events');
const path = require('path');
const fs = require('fs').promises;
const CONSTANTS = require('../utils/constants');

/**
 * LibreOfficeController - Manages LibreOffice Impress as an external process
 * Treats LibreOffice as a rendering engine for PPT playback (Mode A)
 */
class LibreOfficeController extends EventEmitter {
  constructor() {
    super();
    this.process = null;
    this.currentFile = null;
    this.isRunning = false;
    this.displayIndex = 0; // Target display for fullscreen
    
    // Path to portable LibreOffice (will be bundled with app)
    this.loPath = this._getLibreOfficePath();
  }

  /**
   * Get path to LibreOffice executable
   * In production, this should point to bundled portable LibreOffice
   */
  _getLibreOfficePath() {
    const platform = process.platform;
    
    // Portable LibreOffice paths (to be bundled)
    const portablePaths = {
      win32: path.join(__dirname, '../../libreoffice/program/soffice.exe'),
      darwin: path.join(__dirname, '../../libreoffice/MacOS/soffice'),
      linux: path.join(__dirname, '../../libreoffice/program/soffice')
    };

    // Fallback to system LibreOffice for development
    const systemPaths = {
      win32: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
      darwin: '/Applications/LibreOffice.app/Contents/MacOS/soffice',
      linux: '/usr/bin/soffice'
    };

    return portablePaths[platform] || systemPaths[platform];
  }

  /**
   * Check if LibreOffice is available
   */
  async checkAvailability() {
    try {
      await fs.access(this.loPath);
      return true;
    } catch (error) {
      // Try system path
      const systemPath = {
        win32: 'C:\\Program Files\\LibreOffice\\program\\soffice.exe',
        darwin: '/Applications/LibreOffice.app/Contents/MacOS/soffice',
        linux: '/usr/bin/soffice'
      }[process.platform];

      try {
        await fs.access(systemPath);
        this.loPath = systemPath;
        return true;
      } catch (err) {
        return false;
      }
    }
  }

  /**
   * Launch LibreOffice Impress in presentation mode
   * @param {string} filePath - Path to PPT/PPTX file
   * @param {object} options - Launch options
   */
  async launch(filePath, options = {}) {
    if (this.isRunning) {
      await this.stop();
    }

    const available = await this.checkAvailability();
    if (!available) {
      throw new Error('LibreOffice not found. Please install LibreOffice or use bundled version.');
    }

    this.currentFile = filePath;
    this.displayIndex = options.display || 0;

    // LibreOffice command-line arguments for presentation mode
    const args = [
      '--impress',           // Launch Impress
      '--show',              // Start presentation immediately
      '--norestore',         // Don't restore previous session
      '--nologo',            // No splash screen
      '--nofirststartwizard', // Skip first-run wizard
      filePath
    ];

    // Add display selection if on Linux/X11
    if (process.platform === 'linux' && this.displayIndex > 0) {
      process.env.DISPLAY = `:0.${this.displayIndex}`;
    }

    return new Promise((resolve, reject) => {
      this.process = spawn(this.loPath, args, {
        detached: false,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      this.process.stdout.on('data', (data) => {
        console.log(`LibreOffice: ${data}`);
      });

      this.process.stderr.on('data', (data) => {
        console.error(`LibreOffice error: ${data}`);
      });

      this.process.on('error', (error) => {
        this.isRunning = false;
        this.emit('error', error);
        reject(error);
      });

      this.process.on('exit', (code) => {
        this.isRunning = false;
        this.process = null;
        this.emit('stopped', code);
      });

      // Give LibreOffice time to start
      setTimeout(() => {
        this.isRunning = true;
        this.emit('started', filePath);
        resolve();
      }, CONSTANTS.TIMING.LO_STARTUP_MS);
    });
  }

  /**
   * Send keyboard command to LibreOffice
   * Fallback method when UNO API is not available
   */
  async sendKey(key) {
    if (!this.isRunning || !this.process) {
      throw new Error('LibreOffice is not running');
    }

    // This is a simplified approach
    // In production, you'd use platform-specific automation:
    // - Windows: SendKeys or AutoHotkey
    // - macOS: AppleScript/CGEvents
    // - Linux: xdotool
    
    const keyToSend = CONSTANTS.KEYS[key.toUpperCase()] || key;

    console.log(`Should send key: ${keyToSend} to LibreOffice`);
    this.emit('key-sent', key);
    
    // TODO: Implement actual keyboard automation
    // This would require platform-specific libraries like:
    // - robotjs (cross-platform)
    // - nut.js (cross-platform)
    // - platform-specific tools
  }

  /**
   * Navigate to next slide
   */
  async nextSlide() {
    await this.sendKey('next');
    this.emit('slide-changed', 'next');
  }

  /**
   * Navigate to previous slide
   */
  async prevSlide() {
    await this.sendKey('prev');
    this.emit('slide-changed', 'prev');
  }

  /**
   * Jump to first slide
   */
  async firstSlide() {
    await this.sendKey('first');
    this.emit('slide-changed', 'first');
  }

  /**
   * Jump to last slide
   */
  async lastSlide() {
    await this.sendKey('last');
    this.emit('slide-changed', 'last');
  }

  /**
   * Exit presentation and stop LibreOffice
   */
  async stop() {
    if (!this.isRunning) {
      return;
    }

    try {
      // Try graceful exit first
      await this.sendKey('exit');
      
      // Wait a bit for graceful shutdown
      await this._delay(CONSTANTS.TIMING.LO_GRACEFUL_SHUTDOWN_MS);
      
      // Force kill if still running
      if (this.process) {
        this.process.kill('SIGTERM');
        
        // Final force kill after timeout
        setTimeout(() => {
          if (this.process) {
            this.process.kill('SIGKILL');
          }
        }, CONSTANTS.TIMING.LO_FORCE_KILL_MS);
      }
    } catch (error) {
      console.error('Error stopping LibreOffice:', error);
      if (this.process) {
        this.process.kill('SIGKILL');
      }
    }

    this.isRunning = false;
    this.currentFile = null;
  }

  _delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      running: this.isRunning,
      currentFile: this.currentFile,
      display: this.displayIndex,
      available: this.loPath !== null
    };
  }

  /**
   * Set target display for presentation
   */
  setDisplay(displayIndex) {
    this.displayIndex = displayIndex;
  }
}

module.exports = LibreOfficeController;
