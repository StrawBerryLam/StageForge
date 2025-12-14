# StageForge Architecture

## Overview

StageForge is an Electron + Node.js application designed for reliable live event control using PowerPoint presentations and OBS (Open Broadcaster Software). The application implements a dual-mode architecture to balance flexibility, reliability, and operational simplicity for school events.

## Design Philosophy

1. **Zero Learning Cost**: Program owners can use familiar PowerPoint without learning new tools
2. **Operational Stability**: Designed for high-turnover environments with zero tolerance for fragile workflows
3. **Graceful Degradation**: Each mode works independently; failures in one don't affect the other
4. **School-Event Oriented**: Simple operator UI, reliable performance, quick recovery

## Dual-Mode Architecture

StageForge supports two parallel workflows that share the same control interface but serve different use cases:

### Mode A: PPT-as-Renderer (🎭)

**Purpose**: Complex programs with animations, transitions, embedded audio/video

**Use Cases**:
- Drama performances with timed animations
- Dance shows with synchronized video backgrounds
- Events requiring embedded audio/video playback
- Programs with complex PowerPoint transitions

**How It Works**:
1. LibreOffice Impress runs as a managed external process
2. PowerPoint file opens in presentation mode
3. StageForge sends keyboard commands for navigation
4. OBS captures the presentation window
5. Operator uses StageForge UI for control

**Dependencies**:
- LibreOffice (bundled portable or system installation)
- OBS (optional, for window capture and final output)

**Key Components**:
- `src/libreoffice/controller.js`: Manages LibreOffice process
- `src/modes/renderer.js`: Renderer mode control logic
- Platform-specific keyboard automation (TODO: implement)

### Mode B: PPT-to-Scenes (🎬)

**Purpose**: Simple backgrounds, static acts, fully OBS-driven shows

**Use Cases**:
- Static background slides for performances
- Simple text/image slides
- Programs that benefit from OBS scene transitions
- Events where animations are not needed

**How It Works**:
1. PowerPoint slides are exported as images
2. Each slide becomes an OBS scene
3. Scenes use predefined templates
4. Pure OBS workflow - no LibreOffice runtime
5. Operator navigates through scenes

**Dependencies**:
- OBS (required for scene creation and control)
- LibreOffice (optional, for slide extraction; falls back to placeholders)

**Key Components**:
- `src/ppt/processor.js`: Slide extraction and program metadata
- `src/modes/scene.js`: Scene mode control logic
- `src/obs/controller.js`: OBS scene management

## Component Architecture

### Main Process (`src/main.js`)

- Electron main process
- Initializes all controllers
- Manages IPC communication
- Coordinates between modes

**Key Responsibilities**:
- Application lifecycle
- IPC handler registration
- Controller initialization
- Event forwarding to renderer

### Controllers

#### OBSController (`src/obs/controller.js`)

Manages OBS WebSocket connection and operations.

**Features**:
- Connect/disconnect from OBS
- Create blackout scene
- Monitor connection status
- Emit events for UI updates

**Used By**: Both modes (Renderer for window capture, Scene for scene management)

#### LibreOfficeController (`src/libreoffice/controller.js`)

Manages LibreOffice as an external process.

**Features**:
- Launch LibreOffice in presentation mode
- Send keyboard commands for navigation
- Display selection for multi-monitor
- Process lifecycle management
- Availability checking

**Architecture Notes**:
- LibreOffice is NOT embedded as a UI component
- Runs as a completely separate process
- Controlled via keyboard automation (platform-specific)
- UNO API integration (future enhancement)

**Used By**: Renderer mode only

#### PPTProcessor (`src/ppt/processor.js`)

Handles PowerPoint file import and processing.

**Features**:
- Import and catalog PPT files
- Extract slides (via LibreOffice if available)
- Generate program metadata
- Per-program mode configuration
- Program list management

**Mode Handling**:
- Accepts mode parameter during import
- Renderer mode: stores file path only
- Scene mode: extracts slides as images

### Mode Controllers

#### RendererMode (`src/modes/renderer.js`)

Controls Renderer mode workflow.

**Interface**:
```javascript
async loadProgram(program)
async start(options)
async stop()
async next()
async prev()
async first()
async last()
getStatus()
```

**Workflow**:
1. Load program → Setup OBS capture scene
2. Start → Launch LibreOffice in presentation
3. Next/Prev → Send keyboard commands
4. Stop → Terminate LibreOffice process

#### SceneMode (`src/modes/scene.js`)

Controls Scene mode workflow.

**Interface**:
```javascript
async loadProgram(program)
async start()
async stop()
async next()
async prev()
async jumpToScene(index)
async first()
async last()
getStatus()
```

**Workflow**:
1. Load program → Create OBS scenes from slides
2. Start → Switch to first scene
3. Next/Prev → Switch OBS scenes
4. Stop → No-op (scenes persist)

### Renderer Process (`src/renderer/`)

The operator UI built with HTML/CSS/JavaScript.

**Components**:
- `index.html`: UI structure
- `styles.css`: Modern dark theme
- `renderer.js`: UI logic and IPC communication

**Panels**:
1. **Left Sidebar**: Program list, mode indicators, display settings
2. **Center Panel**: Scene control, start/stop, navigation
3. **Right Panel**: Slide preview, act details

**Dialogs**:
- Connection dialog (OBS settings)
- Mode selection dialog (import workflow)

## Data Flow

### Import Workflow

```
User selects files
    ↓
Mode selection dialog
    ↓
IPC: ppt:import with mode
    ↓
PPTProcessor.processFile()
    ↓
If Scene mode: Extract slides
If Renderer mode: Store file path
    ↓
Save program metadata
    ↓
Return to UI
```

### Load Program Workflow

```
User clicks program
    ↓
IPC: program:load
    ↓
PPTProcessor.loadProgram()
    ↓
Check program.mode
    ↓
If Renderer: RendererMode.loadProgram()
  - Setup OBS capture scene
If Scene: SceneMode.loadProgram()
  - Create OBS scenes
    ↓
UI updates
```

### Presentation Control (Renderer Mode)

```
User clicks Start
    ↓
IPC: scene:start
    ↓
RendererMode.start()
    ↓
LibreOfficeController.launch()
    ↓
OBS switches to capture scene
    ↓
User clicks Next
    ↓
IPC: scene:next
    ↓
RendererMode.next()
    ↓
LibreOfficeController.nextSlide()
    ↓
Keyboard command sent to LibreOffice
```

### Presentation Control (Scene Mode)

```
User clicks Start
    ↓
IPC: scene:start
    ↓
SceneMode.start()
    ↓
OBS switches to first scene
    ↓
User clicks Next
    ↓
IPC: scene:next
    ↓
SceneMode.next()
    ↓
OBS switches to next scene
```

## Configuration

`config.json` contains application-wide settings:

```json
{
  "obs": {
    "defaultAddress": "ws://127.0.0.1:4455",
    "reconnectAttempts": 3,
    "reconnectDelay": 2000
  },
  "scene": {
    "blackoutSceneName": "StageForge_Blackout",
    "scenePrefix": "SF_",
    "defaultImageSettings": {
      "boundsType": "OBS_BOUNDS_SCALE_INNER",
      "boundsWidth": 1920,
      "boundsHeight": 1080,
      "alignment": 5
    }
  }
}
```

## Display Management

### Extended Desktop Support

StageForge supports dual-screen setups:

1. **Presentation Display**: Where LibreOffice shows fullscreen (Renderer mode)
2. **Control Display**: Where operator controls StageForge

**Implementation**:
- Electron `screen` API lists available displays
- UI dropdown for display selection
- LibreOfficeController applies display setting on launch
- Platform-specific implementation (X11 DISPLAY, Windows, macOS)

### OBS Window Capture

**Renderer Mode**:
- OBS captures LibreOffice presentation window
- Window capture preferred over display capture
- Cleaner output, no operator UI in stream

**Scene Mode**:
- OBS scenes contain image sources
- No window capture needed

## Error Handling

### Connection Failures

**OBS Connection**:
- UI shows disconnected status
- Renderer mode: can still start presentation
- Scene mode: cannot operate without OBS
- Reconnection available via UI

**LibreOffice Unavailable**:
- UI shows LibreOffice status
- Renderer mode: cannot start
- Scene mode: works without LibreOffice (uses placeholders)

### Process Failures

**LibreOffice Crashes**:
- Event emitted to UI
- Operator notified
- Can restart from StageForge

**OBS Disconnects Mid-Event**:
- UI updated immediately
- Renderer mode: presentation continues
- Scene mode: navigation disabled
- Reconnection available

## Security Considerations

- No external network access required
- Local WebSocket to OBS (localhost only recommended)
- No sensitive data stored
- File system access limited to data directory
- External processes (LibreOffice) properly managed

**CodeQL Analysis**: ✅ No vulnerabilities found

## Future Enhancements

### Planned Features

1. **UNO API Integration**:
   - Replace keyboard automation with LibreOffice UNO API
   - More reliable slide navigation
   - Get slide count programmatically
   - Extract speaker notes

2. **Platform-Specific Keyboard Automation**:
   - Windows: SendKeys or AutoHotkey integration
   - macOS: AppleScript or CGEvents
   - Linux: xdotool integration

3. **Portable LibreOffice Bundle**:
   - Include LibreOffice in application package
   - No system installation required
   - Consistent behavior across systems

4. **Enhanced Scene Templates**:
   - Customizable OBS scene templates
   - Transition effects
   - Overlay support

5. **Slide Timing**:
   - Auto-advance with configurable timing
   - Rehearsal mode
   - Timeline view

6. **Presenter Notes**:
   - Extract and display speaker notes
   - Operator cues
   - Act descriptions

## Testing

### Manual Testing Checklist

- [ ] Import PPT in Renderer mode
- [ ] Import PPT in Scene mode
- [ ] Load Renderer mode program
- [ ] Load Scene mode program
- [ ] Start Renderer presentation
- [ ] Navigate slides (Next/Prev)
- [ ] Stop Renderer presentation
- [ ] Start Scene presentation
- [ ] Navigate scenes (Next/Prev/Jump)
- [ ] Activate blackout
- [ ] Display selection
- [ ] OBS connection/disconnection
- [ ] Multiple programs
- [ ] Mode switching

### Automated Tests

`test.js` validates:
- Controller initialization
- Mode controller creation
- Directory structure
- Dependencies
- Status reporting

## Deployment

### Building for Production

```bash
# Install dependencies
npm install

# Run application
npm start
```

### Distribution

Future: Package with electron-builder
- Include portable LibreOffice
- Platform-specific installers
- Auto-updater integration

## Maintenance

### Code Style

- Event-driven architecture
- Async/await for async operations
- Clear error handling
- Configuration over hard-coding
- Comments for complex logic

### Debugging

- Development mode: `npm run dev` (opens DevTools)
- Console logging in controllers
- IPC communication logging
- Process output monitoring

## Support

For issues, questions, or contributions:
- GitHub Issues: Report bugs and request features
- README.md: User documentation
- USER_GUIDE.md: Operator instructions
- TEMPLATE_GUIDE.md: PPT creation guide

---

**Last Updated**: 2025-12-14  
**Version**: 1.0.0
