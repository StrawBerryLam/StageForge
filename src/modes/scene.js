const EventEmitter = require('events');
const config = require('../../config.json');

/**
 * SceneMode - Mode B: PPT-to-Scenes
 * Converts PPT slides to images and creates OBS scenes
 */
class SceneMode extends EventEmitter {
  constructor(obsController) {
    super();
    this.obs = obsController;
    this.currentProgram = null;
    this.currentSceneIndex = -1;
    this.scenes = [];
  }

  /**
   * Load and setup a program in scene mode
   */
  async loadProgram(program) {
    if (!program) {
      throw new Error('No program provided');
    }

    this.currentProgram = program;
    this.currentSceneIndex = -1;
    this.scenes = [];

    // Create OBS scenes from program acts
    if (this.obs && this.obs.connected) {
      await this.createScenes(program);
    }

    this.emit('program-loaded', program);
    return program;
  }

  /**
   * Create OBS scenes from program slides/acts
   */
  async createScenes(program) {
    if (!this.obs || !this.obs.connected) {
      throw new Error('Not connected to OBS');
    }

    this.scenes = [];

    // Create a scene for each act/slide
    for (let i = 0; i < program.acts.length; i++) {
      const act = program.acts[i];
      const sceneName = `SF_${program.id}_Act${i + 1}`;
      
      try {
        // Try to remove existing scene if it exists
        try {
          await this.obs.obs.call('RemoveScene', { sceneName });
        } catch (err) {
          // Scene doesn't exist, that's fine
        }
        
        // Create new scene
        await this.obs.obs.call('CreateScene', { sceneName });
        
        // Add image source if available
        if (act.imagePath) {
          const inputName = `${sceneName}_Image`;
          
          await this.obs.obs.call('CreateInput', {
            sceneName,
            inputName,
            inputKind: 'image_source',
            inputSettings: {
              file: act.imagePath
            }
          });
          
          // Get scene item to set transform
          const sceneItems = await this.obs.obs.call('GetSceneItemList', { sceneName });
          if (sceneItems.sceneItems && sceneItems.sceneItems.length > 0) {
            const itemId = sceneItems.sceneItems[0].sceneItemId;
            
            // Set transform to fit/fill
            await this.obs.obs.call('SetSceneItemTransform', {
              sceneName,
              sceneItemId: itemId,
              sceneItemTransform: {
                boundsType: config.scene.defaultImageSettings.boundsType,
                boundsWidth: config.scene.defaultImageSettings.boundsWidth,
                boundsHeight: config.scene.defaultImageSettings.boundsHeight,
                alignment: config.scene.defaultImageSettings.alignment
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

    this.emit('scenes-created', this.scenes);
  }

  /**
   * Start presentation (jump to first scene)
   */
  async start() {
    if (this.scenes.length > 0) {
      await this.jumpToScene(0);
      this.emit('started', this.currentProgram);
    }
  }

  /**
   * Stop presentation (no-op for scene mode, but included for API consistency)
   */
  async stop() {
    this.currentSceneIndex = -1;
    this.emit('stopped');
  }

  /**
   * Next scene
   */
  async next() {
    if (this.scenes.length === 0) {
      throw new Error('No scenes loaded');
    }

    const nextIndex = Math.min(this.currentSceneIndex + 1, this.scenes.length - 1);
    await this.jumpToScene(nextIndex);
  }

  /**
   * Previous scene
   */
  async prev() {
    if (this.scenes.length === 0) {
      throw new Error('No scenes loaded');
    }

    const prevIndex = Math.max(this.currentSceneIndex - 1, 0);
    await this.jumpToScene(prevIndex);
  }

  /**
   * Jump to specific scene
   */
  async jumpToScene(sceneIndex) {
    if (!this.obs || !this.obs.connected) {
      throw new Error('Not connected to OBS');
    }

    if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
      throw new Error('Invalid scene index');
    }

    const scene = this.scenes[sceneIndex];
    await this.obs.obs.call('SetCurrentProgramScene', { sceneName: scene.name });
    this.currentSceneIndex = sceneIndex;
    
    this.emit('scene-changed', sceneIndex);
    return scene;
  }

  /**
   * Jump to first scene
   */
  async first() {
    await this.jumpToScene(0);
  }

  /**
   * Jump to last scene
   */
  async last() {
    if (this.scenes.length > 0) {
      await this.jumpToScene(this.scenes.length - 1);
    }
  }

  /**
   * Get current status
   */
  getStatus() {
    return {
      mode: 'scene',
      programLoaded: this.currentProgram !== null,
      currentScene: this.currentSceneIndex,
      totalScenes: this.scenes.length,
      scenes: this.scenes
    };
  }
}

module.exports = SceneMode;
