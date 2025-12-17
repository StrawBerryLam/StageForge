const EventEmitter = require('events');
const CONSTANTS = require('../utils/constants');
const OBSSceneFactory = require('../utils/obs-scene-factory');
const config = require('../../config.json');

/**
 * RendererMode - Mode A: PPT-as-Renderer
 * Plays PPT live via LibreOffice, OBS captures the presentation window
 * This mode is ideal for presentations with animations, transitions, and embedded media
 */
class RendererMode extends EventEmitter {
  /**
   * Create a RendererMode controller
   * @param {LibreOfficeController} libreOfficeController - LibreOffice controller instance
   * @param {OBSController} obsController - OBS controller instance
   */
  constructor(libreOfficeController, obsController) {
    super();
    this.lo = libreOfficeController;
    this.obs = obsController;
    this.sceneFactory = null;
    this.currentProgram = null;
    this.currentSlideIndex = 0;
  }

  /**
   * Load and prepare a program for renderer mode
   * @param {Object} program - Program object with file path and metadata
   * @returns {Promise<Object>} Loaded program object
   * @throws {Error} If no program provided
   */
  async loadProgram(program) {
    if (!program) {
      throw new Error('No program provided');
    }

    this.currentProgram = program;
    this.currentSlideIndex = 0;

    // Ensure OBS has a capture scene for LibreOffice window
    if (this.obs && this.obs.connected) {
      this.sceneFactory = new OBSSceneFactory(this.obs.obs, config);
      await this._setupOBSCapture(program);
    }

    this.emit('program-loaded', program);
    return program;
  }

  /**
   * Setup OBS to capture LibreOffice presentation window
   * @private
   * @param {Object} program - Program object
   * @returns {Promise<void>}
   * @throws {Error} If OBS scene creation fails
   */
  async _setupOBSCapture(program) {
    const sceneName = `${CONSTANTS.SCENE_PREFIX}${program.id}${CONSTANTS.RENDERER_SUFFIX}`;
    
    try {
      await this.sceneFactory.createScene(sceneName);
      await this.sceneFactory.addWindowCapture(sceneName);
      this.emit('obs-capture-ready', sceneName);
    } catch (error) {
      console.error('Error setting up OBS capture:', error);
      throw error;
    }
  }

  /**
   * Start presentation playback
   * @param {Object} options - Start options
   * @param {number} options.display - Display index for presentation (default: 0)
   * @returns {Promise<void>}
   * @throws {Error} If no program loaded
   */
  async start(options = {}) {
    if (!this.currentProgram) {
      throw new Error('No program loaded');
    }

    // Launch LibreOffice in presentation mode
    await this.lo.launch(this.currentProgram.filePath, {
      display: options.display || 0
    });

    // Switch OBS to capture scene if connected
    if (this.obs && this.obs.connected && this.sceneFactory) {
      const sceneName = `${CONSTANTS.SCENE_PREFIX}${this.currentProgram.id}${CONSTANTS.RENDERER_SUFFIX}`;
      try {
        await this.sceneFactory.switchToScene(sceneName);
      } catch (error) {
        console.error('Error switching OBS scene:', error);
      }
    }

    this.emit('started', this.currentProgram);
  }

  /**
   * Stop presentation and close LibreOffice
   * @returns {Promise<void>}
   */
  async stop() {
    await this.lo.stop();
    this.currentSlideIndex = 0;
    this.emit('stopped');
  }

  /**
   * Advance to next slide
   * @returns {Promise<void>}
   */
  async next() {
    await this.lo.nextSlide();
    this.currentSlideIndex++;
    this.emit('slide-changed', this.currentSlideIndex);
  }

  /**
   * Go to previous slide
   * @returns {Promise<void>}
   */
  async prev() {
    if (this.currentSlideIndex > 0) {
      await this.lo.prevSlide();
      this.currentSlideIndex--;
      this.emit('slide-changed', this.currentSlideIndex);
    }
  }

  /**
   * Jump to first slide
   * @returns {Promise<void>}
   */
  async first() {
    await this.lo.firstSlide();
    this.currentSlideIndex = 0;
    this.emit('slide-changed', this.currentSlideIndex);
  }

  /**
   * Jump to last slide
   * @returns {Promise<void>}
   */
  async last() {
    await this.lo.lastSlide();
    if (this.currentProgram) {
      this.currentSlideIndex = this.currentProgram.slideCount - 1;
      this.emit('slide-changed', this.currentSlideIndex);
    }
  }

  /**
   * Get current status of renderer mode
   * @returns {Object} Status object with mode info, slide count, and playback state
   */
  getStatus() {
    return {
      mode: 'renderer',
      programLoaded: this.currentProgram !== null,
      running: this.lo.isRunning,
      currentSlide: this.currentSlideIndex,
      totalSlides: this.currentProgram ? this.currentProgram.slideCount : 0
    };
  }
}

module.exports = RendererMode;
