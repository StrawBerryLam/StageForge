/**
 * Application constants
 * Centralized location for magic strings and numbers
 */

module.exports = {
  // Scene naming
  SCENE_PREFIX: 'SF_',
  BLACKOUT_SCENE: 'StageForge_Blackout',
  RENDERER_SUFFIX: '_Renderer',
  ACT_PREFIX: '_Act',
  
  // OBS defaults
  OBS: {
    DEFAULT_ADDRESS: 'ws://127.0.0.1:4455',
    DEFAULT_PASSWORD: '',
    BOUNDS_TYPE: 'OBS_BOUNDS_SCALE_INNER',
    DEFAULT_WIDTH: 1920,
    DEFAULT_HEIGHT: 1080,
    ALIGNMENT_CENTER: 5,
    BLACK_COLOR: 0xFF000000,
  },
  
  // Timing
  TIMING: {
    LO_STARTUP_MS: 2000,
    LO_GRACEFUL_SHUTDOWN_MS: 1000,
    LO_FORCE_KILL_MS: 3000,
    LO_CONVERSION_TIMEOUT_MS: 60000,
  },
  
  // Keyboard keys
  KEYS: {
    NEXT: 'Right',
    PREV: 'Left',
    FIRST: 'Home',
    LAST: 'End',
    EXIT: 'Escape',
    FULLSCREEN: 'F5',
  },
  
  // File extensions
  EXTENSIONS: {
    IMAGE: /\.(png|jpg|jpeg)$/i,
    PRESENTATION: /\.(ppt|pptx|odp)$/i,
  },
  
  // Modes
  MODES: {
    RENDERER: 'renderer',
    SCENE: 'scene',
  },
  
  // Paths
  PATHS: {
    DATA: 'data',
    PROGRAMS: 'programs',
    SLIDES: 'slides',
  },
};
