# StageForge 🎭

A powerful, reliable live event control application built with Electron + Node.js for managing stage presentations using OBS (Open Broadcaster Software).

## Overview

StageForge enables school events and live performances to seamlessly control visual presentations through OBS WebSocket. Import PowerPoint files, convert them to structured programs, and control scenes in real-time with an intuitive operator interface.

## Features

✨ **Dual Operating Modes**
- **Renderer Mode (🎭)**: Live PPT playback via bundled LibreOffice for complex programs with animations, audio, and video
- **Scene Mode (🎬)**: PPT-to-image conversion with OBS scene generation for simple backgrounds and static content
- Per-program mode selection for maximum flexibility

🎬 **PPT Processing**
- Import multiple PowerPoint files (batch import supported)
- **Renderer Mode**: Play PPT directly through LibreOffice
- **Scene Mode**: Convert slides to images and create OBS scenes
- Each program explicitly declares its mode

🎮 **Operator Controls**
- Simple, school-event-friendly UI
- Manual Next/Prev/Jump navigation
- Start/Stop presentation control
- Dedicated Blackout scene
- Real-time status indicators

🖥️ **Display Management**
- Support for extended desktop (dual-screen)
- Select presentation display
- OBS captures presentation window (Renderer mode)
- Presenter controls on main display

🎛️ **OBS Integration**
- Connect to OBS via WebSocket (obs-websocket-js)
- **Renderer Mode**: Window capture of LibreOffice presentation
- **Scene Mode**: Automatic scene generation from slides
- Blackout and emergency fallback scenes

🔒 **Reliability Focus**
- Error handling throughout
- Connection status monitoring
- Graceful fallbacks
- Scene mode works without LibreOffice
- Renderer mode works without OBS scene generation

## Requirements

- **Node.js** 16+ and npm
- **Electron** (automatically installed)
- **OBS Studio** with obs-websocket plugin (v5.x)
- **LibreOffice** (bundled portable version or system installation)
  - Required for Renderer mode
  - Optional for Scene mode (scene mode works without it)

## Installation

```bash
# Clone the repository
git clone https://github.com/StrawBerryLam/StageForge.git
cd StageForge

# Install dependencies
npm install

# Run the application
npm start
```

## Usage

### 1. Start OBS Studio
- Install and configure OBS Studio
- Enable WebSocket server in OBS (Tools > WebSocket Server Settings)
- Note the port (default: 4455) and password if set

### 2. Launch StageForge
```bash
npm start
```

### 3. Connect to OBS
- Click "Connect to OBS" in the header
- Enter WebSocket address (default: `ws://127.0.0.1:4455`)
- Enter password if required
- Click "Connect"

### 4. Import Programs
1. Click **"+ Import PPT"** in the sidebar
2. Select one or more PowerPoint files
3. **Choose mode** for each import:
   - **🎭 Renderer Mode**: For rich media, animations, videos (requires LibreOffice)
   - **🎬 Scene Mode**: For simple backgrounds, static content (requires OBS)
4. Files will be processed and added to the program list

### 5. Load a Program
1. Click on a program name in the sidebar
2. Program loads in its designated mode:
   - **Renderer Mode**: Prepares for LibreOffice playback
   - **Scene Mode**: Creates scenes in OBS automatically
3. Acts/slides appear in the center panel

### 6. Start Presentation
1. Select presentation display (if multiple monitors)
2. Click **▶️ Start** button
3. **Renderer Mode**: LibreOffice opens in presentation mode
4. **Scene Mode**: First scene activates in OBS

### 7. Control Presentation
Use the control buttons in the center panel:
- **▶️ Start**: Begin the presentation
- **⬅️ Previous**: Go to previous slide/scene
- **➡️ Next**: Advance to next slide/scene
- **⚫ Blackout**: Switch to blank screen (OBS)
- **⏹️ Stop**: End the presentation
- **Act List**: Click any act to jump directly to it

## Project Structure

```
StageForge/
├── src/
│   ├── main.js                  # Electron main process
│   ├── obs/
│   │   └── controller.js        # OBS WebSocket controller
│   ├── libreoffice/
│   │   └── controller.js        # LibreOffice process manager
│   ├── modes/
│   │   ├── renderer.js          # Renderer mode (PPT playback)
│   │   └── scene.js             # Scene mode (PPT-to-scenes)
│   ├── ppt/
│   │   └── processor.js         # PPT import and processing
│   └── renderer/
│       ├── index.html           # Main UI
│       ├── styles.css           # Styling
│       └── renderer.js          # UI logic and IPC
├── data/                        # Program data and slides
│   ├── programs/                # Program metadata
│   └── slides/                  # Extracted slide images
├── libreoffice/                 # Bundled portable LibreOffice (not included in repo)
├── config.json                  # Application configuration
├── package.json
└── README.md
```

## Development

```bash
# Run in development mode (with DevTools)
npm run dev
```

## Architecture: Dual-Mode Operation

StageForge supports two parallel workflows to balance flexibility and reliability:

### Mode A: PPT-as-Renderer (🎭)
**Use for:** Complex programs with animations, transitions, embedded audio/video, drama, dance performances

**How it works:**
- PPT is played live via bundled LibreOffice Impress
- StageForge controls playback only (start, next/prev, exit)
- OBS captures the presentation window
- Full PPT features preserved (animations, audio, video)

**Requirements:**
- LibreOffice (bundled or system installation)
- Optional: OBS for window capture

### Mode B: PPT-to-Scenes (🎬)
**Use for:** Simple backgrounds, static acts, fully OBS-driven shows

**How it works:**
- PPT slides are converted to images
- Each slide becomes an OBS scene using predefined templates
- Pure OBS workflow - no LibreOffice runtime needed
- Best for static content without animations

**Requirements:**
- OBS connection required
- LibreOffice optional (for slide extraction)

### Design Principles
- **Per-program mode selection**: Each program declares its own mode
- **Shared control flow**: Both modes use the same UI and navigation
- **Graceful degradation**: Scene mode works without LibreOffice; Renderer mode works without OBS scene generation
- **School-event oriented**: Zero learning cost for program owners, operational stability for operators

## PPT Template Guidelines

For best results, follow these guidelines when creating PowerPoint presentations:

1. **Naming**: Use descriptive names for your PPT files (becomes the program name)
2. **Slides**: Each slide becomes one act/scene
3. **Order**: Arrange slides in the order you want them to appear
4. **Consistency**: Use consistent sizing and formatting
5. **Notes**: Add speaker notes to slides for act details (future feature)

## OBS Scene Naming Convention

StageForge creates scenes in OBS with the following pattern:
- `SF_[ProgramName]_Act[N]` - Individual act scenes
- `StageForge_Blackout` - Blackout scene

## Troubleshooting

**Cannot connect to OBS**
- Ensure OBS is running
- Check WebSocket server is enabled in OBS
- Verify the address and port are correct
- Check firewall settings

**PPT import not working**
- Ensure PowerPoint files are not corrupted
- Check file permissions
- For full image extraction, install LibreOffice

**Scenes not appearing in OBS**
- Ensure you're connected to OBS
- Check OBS WebSocket version (v5.x required)
- Verify OBS is not in Studio Mode (or switch to Program view)

## License

ISC

## Contributing

Contributions are welcome! Please feel free to submit issues and pull requests.

## Acknowledgments

- Built with [Electron](https://www.electronjs.org/)
- OBS integration via [obs-websocket-js](https://github.com/obs-websocket-community-projects/obs-websocket-js)
- Designed for school events and live performances
