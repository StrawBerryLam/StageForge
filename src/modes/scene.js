const EventEmitter = require('events');
const CONSTANTS = require('../utils/constants');
const OBSSceneFactory = require('../utils/obs-scene-factory');
const config = require('../../config.json');

/**
 * SceneMode - Mode B: PPT-to-Scenes
 * Converts PPT slides to images and creates OBS scenes
 */
class SceneMode extends EventEmitter {
  constructor(obsController) {
    super();
    this.obs = obsController;
    this.sceneFactory = null;
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
      this.sceneFactory = new OBSSceneFactory(this.obs.obs, config);
      await this._createScenes(program);
    }

    this.emit('program-loaded', program);
    return program;
  }

  /**
   * Create OBS scenes from program slides/acts
   */
  async _createScenes(program) {
    if (!this.obs || !this.obs.connected) {
      throw new Error('Not connected to OBS');
    }

    this.scenes = [];

    // Create a scene for each act/slide
    for (let i = 0; i < program.acts.length; i++) {
      const act = program.acts[i];
      const sceneName = `${CONSTANTS.SCENE_PREFIX}${program.id}${CONSTANTS.ACT_PREFIX}${i + 1}`;
      
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

    this.emit('scenes-created', this.scenes);
  }

  /**
   * Start presentation (jump to first scene)
   */
  async start() {
    if (this.scenes.length > 0) {
      await this._jumpToScene(0);
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
    this._validateScenesLoaded();
    const nextIndex = Math.min(this.currentSceneIndex + 1, this.scenes.length - 1);
    await this._jumpToScene(nextIndex);
  }

  /**
   * Previous scene
   */
  async prev() {
    this._validateScenesLoaded();
    const prevIndex = Math.max(this.currentSceneIndex - 1, 0);
    await this._jumpToScene(prevIndex);
  }

  /**
   * Jump to specific scene
   */
  async _jumpToScene(sceneIndex) {
    if (!this.obs || !this.obs.connected) {
      throw new Error('Not connected to OBS');
    }

    if (sceneIndex < 0 || sceneIndex >= this.scenes.length) {
      throw new Error('Invalid scene index');
    }

    const scene = this.scenes[sceneIndex];
    await this.sceneFactory.switchToScene(scene.name);
    this.currentSceneIndex = sceneIndex;
    
    this.emit('scene-changed', sceneIndex);
    return scene;
  }

  /**
   * Jump to first scene
   */
  async first() {
    await this._jumpToScene(0);
  }

  /**
   * Jump to last scene
   */
  async last() {
    if (this.scenes.length > 0) {
      await this._jumpToScene(this.scenes.length - 1);
    }
  }

  _validateScenesLoaded() {
    if (this.scenes.length === 0) {
      throw new Error('No scenes loaded');
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
