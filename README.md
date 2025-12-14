# StageForge 🎭

A powerful, reliable live event control application built with Electron + Node.js for managing stage presentations using OBS (Open Broadcaster Software).

## Overview

StageForge enables school events and live performances to seamlessly control visual presentations through OBS WebSocket. Import PowerPoint files, convert them to structured programs, and control scenes in real-time with an intuitive operator interface.

## Features

✨ **PPT to Scene Conversion**
- Import multiple PowerPoint files (batch import supported)
- Automatic conversion to images and structured JSON metadata
- Each PPT = one program, each slide = one act/background

🎬 **OBS Integration**
- Connect to OBS via WebSocket (obs-websocket-js)
- Automatic scene generation from imported programs
- No manual OBS config editing required
- Scene templates for consistent presentation

🎮 **Operator Controls**
- Simple, school-event-friendly UI
- Manual Next/Prev/Jump navigation
- Dedicated Blackout scene
- Real-time preview of slides
- Current scene indicator

🔒 **Reliability Focus**
- Error handling throughout
- Connection status monitoring
- Graceful fallbacks

## Requirements

- **Node.js** 16+ and npm
- **Electron** (automatically installed)
- **OBS Studio** with obs-websocket plugin (v5.x)
- **Optional**: LibreOffice (for PPT to image conversion)

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
- Click "+ Import PPT" in the sidebar
- Select one or more PowerPoint files
- Files will be processed and added to the program list

### 5. Load a Program
- Click on a program in the sidebar
- Scenes will be automatically created in OBS
- Acts will appear in the center panel

### 6. Control Scenes
- **Next**: Advance to the next act/scene
- **Previous**: Go back to the previous act/scene
- **Blackout**: Switch to a blank black scene
- **Jump**: Click an act in the list to jump directly to it

## Project Structure

```
StageForge/
├── src/
│   ├── main.js              # Electron main process
│   ├── obs/
│   │   └── controller.js    # OBS WebSocket controller
│   ├── ppt/
│   │   └── processor.js     # PPT import and processing
│   └── renderer/
│       ├── index.html       # Main UI
│       ├── styles.css       # Styling
│       └── renderer.js      # UI logic and IPC
├── data/                    # Program data and slides
│   ├── programs/            # Program metadata
│   └── slides/              # Extracted slide images
├── package.json
└── README.md
```

## Development

```bash
# Run in development mode (with DevTools)
npm run dev
```

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
