# StageForge User Guide

## Quick Start

### 1. Prerequisites
Before using StageForge, ensure you have:
- ✅ OBS Studio installed and running
- ✅ OBS WebSocket server enabled (v5.x)
- ✅ PowerPoint files prepared (see TEMPLATE_GUIDE.md)

### 2. First Launch
1. Start OBS Studio
2. Launch StageForge: `npm start`
3. You should see the main window with three panels

### 3. Connect to OBS
1. Click **"Connect to OBS"** in the top-right
2. Enter your OBS WebSocket settings:
   - **Address**: `ws://127.0.0.1:4455` (default)
   - **Password**: Leave blank if not set
3. Click **"Connect"**
4. Status should change to "Connected" (green indicator)

### 4. Import Programs
1. Click **"+ Import PPT"** in the Programs sidebar
2. Select one or more PowerPoint files
3. Wait for processing (may take a moment)
4. Programs appear in the sidebar

### 5. Load a Program
1. Click on a program name in the sidebar
2. Acts will appear in the center panel
3. Scenes are automatically created in OBS
4. Preview appears in the right panel

### 6. Control Scenes
Use the control buttons in the center panel:
- **⬅️ Previous**: Go to previous act
- **➡️ Next**: Advance to next act
- **⚫ Blackout**: Switch to blank screen
- **Act List**: Click any act to jump directly to it

## Panel Overview

### Left Panel: Programs
- Lists all imported programs
- Shows act count for each
- Click to load a program
- Active program highlighted in green

### Center Panel: Scene Control
- Current scene information
- Navigation buttons (Prev/Next/Blackout)
- Act list with jump capability
- Shows act number and name

### Right Panel: Preview
- Shows preview of current slide
- Act details and notes
- Helpful for operator reference

## Features in Detail

### Batch Import
You can import multiple PowerPoint files at once:
1. Click "+ Import PPT"
2. Hold Ctrl (Windows/Linux) or Cmd (Mac)
3. Select multiple files
4. Click "Open"

### Scene Navigation
Three ways to navigate:
1. **Sequential**: Use Prev/Next buttons
2. **Jump**: Click act in the list
3. **Keyboard**: (Future feature)

### Blackout Scene
Special scene for breaks or emergencies:
- Completely black screen
- Instantly available
- Doesn't affect program position
- Click any act to resume

### Preview Panel
The preview helps operators:
- See what's coming next
- Verify correct scene
- Read act details
- Plan transitions

## Workflow for Events

### Pre-Event Setup
1. **Day Before**:
   - Import all programs
   - Test each program
   - Verify scenes in OBS
   - Do a full run-through

2. **Event Day** (Early):
   - Start OBS and StageForge
   - Connect to OBS
   - Load first program
   - Verify all scenes work
   - Set starting scene

3. **Just Before Event**:
   - Confirm connection status
   - Load correct program
   - Position on first act
   - Keep blackout ready

### During Event
1. **Follow Program Order**:
   - Use Next button for sequential flow
   - Watch preview for confirmation
   - Use Blackout between segments if needed

2. **Handle Changes**:
   - Jump to specific acts as needed
   - Switch programs if required
   - Use Blackout for unexpected pauses

3. **Monitor Status**:
   - Keep eye on connection indicator
   - Watch current scene display
   - Verify preview matches OBS

### Post-Event
1. Programs remain saved
2. Can replay for recording/archival
3. Export/backup if needed

## Tips for Operators

### Preparation
- ✅ Always test before the event
- ✅ Know the program order
- ✅ Practice navigation
- ✅ Have backup plan

### During Operation
- 👀 Watch preview before advancing
- 🎯 Click deliberately (avoid double-clicks)
- ⏸️ Use Blackout for pauses
- 🔄 Know how to go back

### Troubleshooting

**Connection Lost**:
1. Check OBS is still running
2. Click "Connect to OBS" again
3. Program will remain loaded

**Wrong Scene**:
1. Click correct act in list
2. Or use Prev to go back
3. Verify in preview

**Program Not Loading**:
1. Check OBS connection
2. Try reloading program
3. Restart StageForge if needed

**Preview Not Showing**:
- This is normal if LibreOffice wasn't available during import
- Scenes still work in OBS
- Use OBS preview instead

## Keyboard Shortcuts (Future)

Planned shortcuts:
- `Space` / `→`: Next scene
- `←`: Previous scene
- `B`: Blackout
- `1-9`: Jump to act
- `Esc`: Emergency blackout

## Advanced Usage

### Multiple Programs
You can:
- Import many programs
- Switch between them during event
- Create program sets for different events

### Custom Scene Names
Scenes follow pattern: `SF_[ProgramName]_Act[N]`
- Don't rename in OBS (StageForge won't find them)
- You can add sources to scenes
- Original image sources remain

### OBS Integration
StageForge creates scenes, but you can:
- Add overlays in OBS
- Apply filters
- Adjust sources
- Use scene collections

## Getting Help

- 📖 Read README.md for setup
- 📋 Check TEMPLATE_GUIDE.md for PPT tips
- 🐛 Report issues on GitHub
- 💡 Request features on GitHub

## Safety Tips

### For School Events
- Have a backup operator who knows the system
- Test thoroughly before students arrive
- Keep troubleshooting guide handy
- Have PowerPoint ready as fallback

### Connection Reliability
- Use wired network if possible
- Keep OBS on same computer
- Minimize other applications
- Close unnecessary programs

### Emergency Procedures
1. **If StageForge freezes**: Use OBS directly
2. **If OBS crashes**: Restart both OBS and StageForge
3. **If connection lost**: Reconnect via dialog
4. **If nothing works**: Use PowerPoint directly

## Best Practices

1. **Test Early**: Import and test at least 1 day before
2. **Keep Simple**: Don't over-complicate the program
3. **Use Blackout**: Between major segments
4. **Monitor Preview**: Always confirm before advancing
5. **Stay Calm**: Technology issues happen, have backups

## Conclusion

StageForge is designed to be simple and reliable for live events. With proper preparation and practice, it provides smooth, professional control of your presentations.

Remember:
- 🎯 Preparation is key
- 🔍 Always verify before advancing
- 🆘 Keep backup plans ready
- 😊 Practice makes perfect

Good luck with your event! 🎭
