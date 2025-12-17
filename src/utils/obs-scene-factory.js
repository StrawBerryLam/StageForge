const CONSTANTS = require('./constants');

/**
 * OBS Scene Factory - Utility for creating OBS scenes
 * Eliminates code duplication between OBSController and SceneMode
 * Provides a consistent API for scene and source management
 */
class OBSSceneFactory {
  /**
   * Create an OBS Scene Factory
   * @param {OBSWebSocket} obsClient - OBS WebSocket client instance
   * @param {Object} config - Configuration object for scene settings
   */
  constructor(obsClient, config = {}) {
    this.obs = obsClient;
    this.config = config;
  }

  /**
   * Create or recreate a scene (removes existing if present)
   * @param {string} sceneName - Name of the scene to create
   * @returns {Promise<string>} Created scene name
   */
  async createScene(sceneName) {
    // Remove existing scene if it exists
    try {
      await this.obs.call('RemoveScene', { sceneName });
    } catch (err) {
      // Scene doesn't exist, that's fine
    }
    
    // Create new scene
    await this.obs.call('CreateScene', { sceneName });
    return sceneName;
  }

  /**
   * Add image source to scene with proper transform
   * @param {string} sceneName - Scene to add image to
   * @param {string} imagePath - Path to image file
   * @param {string} [inputName] - Optional custom input name
   * @returns {Promise<string>} Created input name
   */
  async addImageSource(sceneName, imagePath, inputName = null) {
    const inputNameFinal = inputName || `${sceneName}_Image`;
    
    // Create image input
    await this.obs.call('CreateInput', {
      sceneName,
      inputName: inputNameFinal,
      inputKind: 'image_source',
      inputSettings: { file: imagePath }
    });
    
    // Get scene items
    const sceneItems = await this.obs.call('GetSceneItemList', { sceneName });
    if (sceneItems.sceneItems && sceneItems.sceneItems.length > 0) {
      const itemId = sceneItems.sceneItems[0].sceneItemId;
      
      // Apply transform
      await this.setImageTransform(sceneName, itemId);
    }
    
    return inputNameFinal;
  }

  /**
   * Set image transform to fit/fill canvas with proper scaling
   * @param {string} sceneName - Scene containing the item
   * @param {number} sceneItemId - ID of the scene item to transform
   * @returns {Promise<void>}
   */
  async setImageTransform(sceneName, sceneItemId) {
    const settings = this.config?.scene?.defaultImageSettings || {};
    
    await this.obs.call('SetSceneItemTransform', {
      sceneName,
      sceneItemId,
      sceneItemTransform: {
        boundsType: settings.boundsType || CONSTANTS.OBS.BOUNDS_TYPE,
        boundsWidth: settings.boundsWidth || CONSTANTS.OBS.DEFAULT_WIDTH,
        boundsHeight: settings.boundsHeight || CONSTANTS.OBS.DEFAULT_HEIGHT,
        alignment: settings.alignment || CONSTANTS.OBS.ALIGNMENT_CENTER
      }
    });
  }

  /**
   * Add window capture source for LibreOffice presentations
   * @param {string} sceneName - Scene to add capture to
   * @param {string} [inputName] - Optional custom input name
   * @returns {Promise<string>} Created input name
   */
  async addWindowCapture(sceneName, inputName = null) {
    const inputNameFinal = inputName || `${sceneName}_WindowCapture`;
    
    await this.obs.call('CreateInput', {
      sceneName,
      inputName: inputNameFinal,
      inputKind: 'window_capture',
      inputSettings: {
        capture_cursor: false
      }
    });
    
    return inputNameFinal;
  }

  /**
   * Add color source (typically for blackout scenes)
   * @param {string} sceneName - Scene to add color to
   * @param {number} [color] - Color value (default: black)
   * @param {string} [inputName] - Optional custom input name
   * @returns {Promise<string>} Created input name
   */
  async addColorSource(sceneName, color = CONSTANTS.OBS.BLACK_COLOR, inputName = null) {
    const inputNameFinal = inputName || `${sceneName}_Color`;
    
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: inputNameFinal,
        inputKind: 'color_source_v3',
        inputSettings: {
          color,
          width: CONSTANTS.OBS.DEFAULT_WIDTH,
          height: CONSTANTS.OBS.DEFAULT_HEIGHT
        }
      });
    } catch (err) {
      console.error('Error creating color source:', err);
    }
    
    return inputNameFinal;
  }

  /**
   * Add video source (media source) to scene
   * @param {string} sceneName - Scene to add video to
   * @param {string} videoPath - Path to video file
   * @param {string} [inputName] - Optional custom input name
   * @returns {Promise<string>} Created input name
   */
  async addVideoSource(sceneName, videoPath, inputName = null) {
    const inputNameFinal = inputName || `${sceneName}_Video`;
    
    try {
      await this.obs.call('CreateInput', {
        sceneName,
        inputName: inputNameFinal,
        inputKind: 'ffmpeg_source',
        inputSettings: {
          local_file: videoPath,
          looping: false,
          restart_on_activate: true,
          clear_on_media_end: false
        }
      });
      
      // Get scene items and find the video source by name
      const sceneItems = await this.obs.call('GetSceneItemList', { sceneName });
      if (sceneItems.sceneItems && sceneItems.sceneItems.length > 0) {
        // Find the specific video source we just created
        const videoItem = sceneItems.sceneItems.find(item => 
          item.sourceName === inputNameFinal
        );
        
        if (videoItem) {
          await this.setImageTransform(sceneName, videoItem.sceneItemId);
        }
      }
    } catch (err) {
      console.error('Error creating video source:', err);
    }
    
    return inputNameFinal;
  }

  /**
   * Create a subscene for video playback
   * @param {string} parentSceneName - Parent scene name
   * @param {string} videoPath - Path to video file
   * @param {number} [subsceneIndex] - Subscene index (default: 0)
   * @returns {Promise<string>} Created subscene name
   */
  async createVideoSubscene(parentSceneName, videoPath, subsceneIndex = 0) {
    const subsceneName = `${parentSceneName}_Video${subsceneIndex + 1}`;
    
    // Create subscene
    await this.createScene(subsceneName);
    
    // Add video to subscene
    await this.addVideoSource(subsceneName, videoPath);
    
    return subsceneName;
  }

  /**
   * Switch to a scene (make it the current program scene)
   * @param {string} sceneName - Scene to switch to
   * @returns {Promise<void>}
   */
  async switchToScene(sceneName) {
    await this.obs.call('SetCurrentProgramScene', { sceneName });
  }

  /**
   * Check if a scene exists
   * @param {string} sceneName - Scene name to check
   * @returns {Promise<boolean>} True if scene exists
   */
  async sceneExists(sceneName) {
    try {
      await this.obs.call('GetSceneItemList', { sceneName });
      return true;
    } catch (error) {
      return false;
    }
  }
}

module.exports = OBSSceneFactory;
