const OBSWebSocket = require('obs-websocket-js').default;
const EventEmitter = require('events');
const path = require('path');

class OBSController extends EventEmitter {
  constructor() {
    super();
    this.obs = new OBSWebSocket();
    this.connected = false;
    this.currentProgram = null;
    this.currentSceneIndex = -1;
    this.scenes = [];
    
    // Set up event listeners
    this.obs.on('ConnectionClosed', () => {
      this.connected = false;
      this.emit('disconnected');
    });
    
    this.obs.on('CurrentProgramSceneChanged', (data) => {
      this.emit('scene-changed', data.sceneName);
    });
  }

  async connect(config = {}) {
    const { address = 'ws://127.0.0.1:4455', password = '' } = config;
    
    try {
      await this.obs.connect(address, password);
      this.connected = true;
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
    try {
      // Try to get the blackout scene
      await this.obs.call('GetSceneItemList', { sceneName: 'StageForge_Blackout' });
    } catch (error) {
      // Create blackout scene if it doesn't exist
      await this.obs.call('CreateScene', { sceneName: 'StageForge_Blackout' });
      
      // Add a black color source
      try {
        await this.obs.call('CreateInput', {
          sceneName: 'StageForge_Blackout',
          inputName: 'Black_Background',
          inputKind: 'color_source_v3',
          inputSettings: {
            color: 0xFF000000,
            width: 1920,
            height: 1080
          }
        });
      } catch (err) {
        console.error('Error creating black background:', err);
      }
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
      const sceneName = `SF_${program.name}_Act${i + 1}`;
      
      try {
        // Try to remove existing scene if it exists
        try {
          await this.obs.call('RemoveScene', { sceneName });
        } catch (err) {
          // Scene doesn't exist, that's fine
        }
        
        // Create new scene
        await this.obs.call('CreateScene', { sceneName });
        
        // Add image source if available
        if (act.imagePath) {
          const inputName = `${sceneName}_Image`;
          
          await this.obs.call('CreateInput', {
            sceneName,
            inputName,
            inputKind: 'image_source',
            inputSettings: {
              file: act.imagePath
            }
          });
          
          // Get scene item to set transform
          const sceneItems = await this.obs.call('GetSceneItemList', { sceneName });
          if (sceneItems.sceneItems && sceneItems.sceneItems.length > 0) {
            const itemId = sceneItems.sceneItems[0].sceneItemId;
            
            // Set transform to fit/fill
            await this.obs.call('SetSceneItemTransform', {
              sceneName,
              sceneItemId: itemId,
              sceneItemTransform: {
                boundsType: 'OBS_BOUNDS_SCALE_INNER',
                boundsWidth: 1920,
                boundsHeight: 1080,
                alignment: 5 // Center
              }
            });
          }
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
    if (!this.connected || this.scenes.length === 0) {
      throw new Error('No program loaded or not connected');
    }

    const nextIndex = Math.min(this.currentSceneIndex + 1, this.scenes.length - 1);
    await this.jumpToScene(nextIndex);
  }

  async prevScene() {
    if (!this.connected || this.scenes.length === 0) {
      throw new Error('No program loaded or not connected');
    }

    const prevIndex = Math.max(this.currentSceneIndex - 1, 0);
    await this.jumpToScene(prevIndex);
  }

  async jumpToScene(sceneIndex) {
    if (!this.connected || this.scenes.length === 0) {
      throw new Error('No program loaded or not connected');
    }

    if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
      throw new Error('Invalid scene index');
    }

    const scene = this.scenes[sceneIndex];
    await this.obs.call('SetCurrentProgramScene', { sceneName: scene.name });
    this.currentSceneIndex = sceneIndex;
    
    return scene;
  }

  async activateBlackout() {
    if (!this.connected) {
      throw new Error('Not connected to OBS');
    }

    await this.obs.call('SetCurrentProgramScene', { sceneName: 'StageForge_Blackout' });
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
}

module.exports = OBSController;
