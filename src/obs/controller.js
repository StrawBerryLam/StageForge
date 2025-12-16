const OBSWebSocket = require('obs-websocket-js').default;
const EventEmitter = require('events');
const config = require('../../config.json');
const CONSTANTS = require('../utils/constants');
const OBSSceneFactory = require('../utils/obs-scene-factory');

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

  _setupEventListeners() {
    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      this.emit('disconnected');
    });
    
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.emit('scene-changed', data.sceneName);
    });
  }

  async connect(connectionConfig = {}) {
    const { 
      address = CONSTANTS.OBS.DEFAULT_ADDRESS, 
      password = CONSTANTS.OBS.DEFAULT_PASSWORD 
    } = connectionConfig;
    
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

  async disconnect() {
    if (this.connected) {
      await this.obs.disconnect();
      this.connected = false;
    }
  }

  getStatus() {
    return {
      connected: this.connected,
      currentScene: this.currentSceneIndex,
      totalScenes: this.scenes.length,
      programLoaded: this.currentProgram !== null
    };
  }

  async ensureBlackoutScene() {
    const blackoutSceneName = config?.scene?.blackoutSceneName || CONSTANTS.BLACKOUT_SCENE;
    
    if (!await this.sceneFactory.sceneExists(blackoutSceneName)) {
      await this.sceneFactory.createScene(blackoutSceneName);
      await this.sceneFactory.addColorSource(blackoutSceneName, CONSTANTS.OBS.BLACK_COLOR, 'Black_Background');
    }
  }

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

  async nextScene() {
    this._validateProgramLoaded();
    const nextIndex = Math.min(this.currentSceneIndex + 1, this.scenes.length - 1);
    await this.jumpToScene(nextIndex);
  }

  async prevScene() {
    this._validateProgramLoaded();
    const prevIndex = Math.max(this.currentSceneIndex - 1, 0);
    await this.jumpToScene(prevIndex);
  }

  async jumpToScene(sceneIndex) {
    this._validateProgramLoaded();
    this._validateSceneIndex(sceneIndex);

    const scene = this.scenes[sceneIndex];
    await this.sceneFactory.switchToScene(scene.name);
    this.currentSceneIndex = sceneIndex;
    
    return scene;
  }

  async activateBlackout() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    const blackoutSceneName = config?.scene?.blackoutSceneName || CONSTANTS.BLACKOUT_SCENE;
    await this.sceneFactory.switchToScene(blackoutSceneName);
    this.currentSceneIndex = -1;
  }

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

  _validateProgramLoaded() {
    if (!this.connected || this.scenes.length === 0) {
      throw new Error('No program loaded or not connected');
    }
  }

  _validateSceneIndex(sceneIndex) {
    if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
      throw new Error('Invalid scene index');
    }
  }
}

module.exports = OBSController;
