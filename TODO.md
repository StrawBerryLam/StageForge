# StageForge - Future Improvements

## High Priority

### 1. Platform-Specific Keyboard Automation
**Status**: TODO  
**Impact**: High - Required for Renderer mode to work properly

Current implementation logs keyboard commands but doesn't send them to LibreOffice.

**Implementation Options**:
- **Windows**: Use SendKeys API or AutoHotkey integration
- **macOS**: AppleScript or CGEvents
- **Linux**: xdotool integration
- **Cross-platform**: robotjs or nut.js library

**Files to Update**:
- `src/libreoffice/controller.js` - `sendKey()` method

### 2. LibreOffice UNO API Integration
**Status**: TODO  
**Impact**: High - More reliable than keyboard automation

Replace keyboard automation with UNO API for better control.

**Benefits**:
- Reliable slide navigation
- Get slide count programmatically
- Extract speaker notes
- Query current slide position

**Resources**:
- LibreOffice UNO API documentation
- Python UNO bridge examples

### 3. Portable LibreOffice Bundle
**Status**: TODO  
**Impact**: Medium - Improves deployment

**Tasks**:
- Download portable LibreOffice for each platform
- Include in application bundle
- Update build scripts
- Test cross-platform

## Medium Priority

### 4. Improved Error Messaging
**Status**: Code review feedback  
**Impact**: Medium - Better UX

Replace `alert()` calls with toast notifications or custom modals.

**Files to Update**:
- `src/renderer/renderer.js` - lines 148, 243
- Create toast notification component
- Add to UI

### 5. Event Handler Consistency
**Status**: Code review feedback  
**Impact**: Low - Code quality

Replace direct `onclick` assignments with `addEventListener`.

**Files to Update**:
- `src/renderer/renderer.js` - lines 157, 162

### 6. Enhanced Scene Templates
**Status**: Feature request  
**Impact**: Medium

**Features**:
- Customizable OBS scene templates
- Transition effects between scenes
- Overlay support (logos, timers, etc.)
- Scene layout presets

### 7. Slide Timing & Auto-Advance
**Status**: Feature request  
**Impact**: Medium

**Features**:
- Configure auto-advance timing per slide
- Rehearsal mode
- Timeline view
- Pause/resume auto-advance

## Low Priority

### 8. Presenter Notes Display
**Status**: Feature request  
**Impact**: Low

**Features**:
- Extract speaker notes from PPT
- Display in preview panel
- Operator cues
- Act descriptions

### 9. Enhanced Preview
**Status**: Feature request  
**Impact**: Low

**Features**:
- Next slide preview
- Slide thumbnails
- Preview quality settings
- Preview caching

### 10. Keyboard Shortcuts
**Status**: Feature request  
**Impact**: Low

**Shortcuts**:
- Space/→: Next
- ←: Previous
- B: Blackout
- 1-9: Jump to act
- Esc: Emergency blackout

### 11. Program Templates
**Status**: Feature request  
**Impact**: Low

**Features**:
- Save program configurations as templates
- Quick program setup
- Common event types (concert, graduation, etc.)

### 12. Statistics & Logging
**Status**: Feature request  
**Impact**: Low

**Features**:
- Event logs
- Timing statistics
- Usage analytics
- Export logs

## Build & Deployment

### 13. Electron Builder Integration
**Status**: TODO  
**Impact**: High - Required for distribution

**Tasks**:
- Configure electron-builder
- Create platform installers
- Include LibreOffice bundle
- Code signing
- Auto-updater

### 14. Automated Tests
**Status**: Partial  
**Impact**: Medium

**Current**: Basic initialization tests  
**Needed**:
- Unit tests for controllers
- Integration tests
- UI tests
- E2E tests with OBS mock

### 15. CI/CD Pipeline
**Status**: TODO  
**Impact**: Medium

**Tasks**:
- GitHub Actions workflow
- Automated testing
- Build artifacts
- Release automation

## Documentation

### 16. Video Tutorials
**Status**: TODO  
**Impact**: Medium

**Topics**:
- Getting started
- Mode selection guide
- Creating PPT templates
- Operator training

### 17. Troubleshooting Guide
**Status**: TODO  
**Impact**: Medium

**Content**:
- Common issues
- Error messages
- Recovery procedures
- Platform-specific issues

## Technical Debt

### 18. TypeScript Migration
**Status**: Consideration  
**Impact**: Low - Code quality

**Benefits**:
- Type safety
- Better IDE support
- Easier refactoring
- Documentation via types

### 19. State Management
**Status**: Consideration  
**Impact**: Low - Architecture

Consider Redux or similar for complex state management as application grows.

### 20. Performance Optimization
**Status**: Future  
**Impact**: Low

**Areas**:
- Slide image caching
- Lazy loading
- Memory management
- Process optimization

## Notes

- Prioritization based on school event use cases
- Focus on reliability over features
- Maintain simplicity for operators
- Keep zero-learning-cost for program owners

---

Last Updated: 2025-12-14  
Version: 1.0.0
