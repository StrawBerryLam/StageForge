const OBSWebSocket = require('obs-websocket-js').default;
const EventEmitter = require('events');
const config = require('../../config.json');
const CONSTANTS = require('../utils/constants');
const OBSSceneFactory = require('../utils/obs-scene-factory');

/**
 * OBSController - Manages OBS WebSocket connection and scene control
 * Handles scene creation, navigation, and blackout functionality
 */
class OBSController extends EventEmitter {
  constructor() {
    super();
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.currentProgram = null;
    this.currentSceneIndex = -1;
    this.scenes = [];
    this.sceneFactory = null;
    
    this._setupEventListeners();
  }

  /**
   * Setup event listeners for OBS WebSocket
   * @private
   */
  _setupEventListeners() {
    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      this.emit('disconnected');
    });
    
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.emit('scene-changed', data.sceneName);
    });
  }

  /**
   * Connect to OBS WebSocket server
   * @param {Object} connectionConfig - Connection configuration
   * @param {string} connectionConfig.address - WebSocket address (default: ws://127.0.0.1:4455)
   * @param {string} connectionConfig.password - WebSocket password (default: empty)
   * @returns {Promise<boolean>} True if connection successful
   * @throws {Error} If connection fails or address format is invalid
   */
  async connect(connectionConfig = {}) {
    const { 
      address = CONSTANTS.OBS.DEFAULT_ADDRESS, 
      password = CONSTANTS.OBS.DEFAULT_PASSWORD 
    } = connectionConfig;
    
    // Validate connection parameters
    if (typeof address !== 'string' || (!address.startsWith('ws://') && !address.startsWith('wss://'))) {
      throw new Error('Invalid WebSocket address format');
    }
    
    try {
      await this.obs.connect(address, password);
      this.connected = true;
      this.sceneFactory = new OBSSceneFactory(this.obs, config);
      this.emit('connected');
      
      // Ensure blackout scene exists
      await this.ensureBlackoutScene();
      
      return true;
    } catch (error) {
      this.connected = false;
      throw new Error(`Failed to connect to OBS: ${error.message}`);
    }
  }

  /**
   * Disconnect from OBS WebSocket server
   * @returns {Promise<void>}
   */
  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
    }
  }

  /**
   * Get current controller status
   * @returns {Object} Status object with connection state and scene info
   */
  getStatus() {
    return {
      connected: this.connected,
      currentScene: this.currentSceneIndex,
      totalScenes: this.scenes.length,
      programLoaded: this.currentProgram !== null
    };
  }

  /**
   * Ensure blackout scene exists, create if not present
   * @returns {Promise<void>}
   * @private
   */
  async ensureBlackoutScene() {
    try {
      const blackoutSceneName = config?.scene?.blackoutSceneName || CONSTANTS.BLACKOUT_SCENE;
      
      if (!await this.sceneFactory.sceneExists(blackoutSceneName)) {
        await this.sceneFactory.createScene(blackoutSceneName);
        await this.sceneFactory.addColorSource(blackoutSceneName, CONSTANTS.OBS.BLACK_COLOR, 'Black_Background');
      }
    } catch (error) {
      console.error('Error ensuring blackout scene:', error);
      // Don't throw - blackout scene is not critical for connection
    }
  }

  /**
   * Create OBS scenes for a program's acts
   * @param {Object} program - Program object with acts array
   * @returns {Promise<Array>} Array of created scene objects
   * @throws {Error} If not connected to OBS or scene creation fails
   */
  async createScenesForProgram(program) {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    this.currentProgram = program;
    this.scenes = [];
    this.currentSceneIndex = -1;

    // Create a scene for each act/slide
    for (let i = 0; i < program.acts.length; i++) {
      const act = program.acts[i];
      const sceneName = `${CONSTANTS.SCENE_PREFIX}${program.name}${CONSTANTS.ACT_PREFIX}${i + 1}`;
      
      try {
        await this.sceneFactory.createScene(sceneName);
        
        // Add image source if available
        if (act.imagePath) {
          await this.sceneFactory.addImageSource(sceneName, act.imagePath);
        }
        
        this.scenes.push({
          name: sceneName,
          actIndex: i,
          actName: act.name
        });
        
      } catch (error) {
        console.error(`Error creating scene for act ${i}:`, error);
        throw error;
      }
    }

    // Switch to first scene
    if (this.scenes.length > 0) {
      await this.jumpToScene(0);
    }

    return this.scenes;
  }

  /**
   * Switch to next scene in sequence
   * @returns {Promise<void>}
   * @throws {Error} If no program loaded
   */
  async nextScene() {
    this._validateProgramLoaded();
    const nextIndex = Math.min(this.currentSceneIndex + 1, this.scenes.length - 1);
    await this.jumpToScene(nextIndex);
  }

  /**
   * Switch to previous scene in sequence
   * @returns {Promise<void>}
   * @throws {Error} If no program loaded
   */
  async prevScene() {
    this._validateProgramLoaded();
    const prevIndex = Math.max(this.currentSceneIndex - 1, 0);
    await this.jumpToScene(prevIndex);
  }

  /**
   * Jump to specific scene by index
   * @param {number} sceneIndex - Zero-based scene index
   * @returns {Promise<Object>} Scene object
   * @throws {Error} If no program loaded or invalid scene index
   */
  async jumpToScene(sceneIndex) {
    this._validateProgramLoaded();
    this._validateSceneIndex(sceneIndex);

    const scene = this.scenes[sceneIndex];
    await this.sceneFactory.switchToScene(scene.name);
    this.currentSceneIndex = sceneIndex;
    
    return scene;
  }

  /**
   * Activate blackout scene
   * @returns {Promise<void>}
   * @throws {Error} If not connected to OBS
   */
  async activateBlackout() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    const blackoutSceneName = config?.scene?.blackoutSceneName || CONSTANTS.BLACKOUT_SCENE;
    await this.sceneFactory.switchToScene(blackoutSceneName);
    this.currentSceneIndex = -1;
  }

  /**
   * Get currently active scene
   * @returns {Promise<Object>} Current scene info with name and index
   * @throws {Error} If not connected to OBS
   */
  async getCurrentScene() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    const response = await this.obs.call('GetCurrentProgramScene');
    return {
      name: response.sceneName,
      index: this.currentSceneIndex
    };
  }

  /**
   * Validate that a program is loaded and controller is connected
   * @private
   * @throws {Error} If no program loaded or not connected
   */
  _validateProgramLoaded() {
    if (!this.connected || this.scenes.length === 0) {
      throw new Error('No program loaded or not connected');
    }
  }

  /**
   * Validate scene index is within valid range
   * @private
   * @param {number} sceneIndex - Scene index to validate
   * @throws {Error} If scene index is out of range
   */
  _validateSceneIndex(sceneIndex) {
    if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
      throw new Error('Invalid scene index');
    }
  }
}

module.exports = OBSController;
