# StageForge CI/CD and Build System

## Overview

StageForge uses GitHub Actions for continuous integration and automated builds. The build system supports multiple platforms and editions with security scanning integrated into the pipeline.

## Font Bundling

StageForge bundles **Gothic fonts** for optimal display of CJK (Chinese, Japanese, Korean) text:

- **Noto Sans JP** (Japanese Gothic)
- **Noto Sans SC** (Simplified Chinese Gothic)
- **Noto Sans TC** (Traditional Chinese Gothic)

These fonts are automatically downloaded during the build process via the `prepare-fonts` script and are bundled into all editions. The application automatically selects the appropriate font based on the selected language.

## Build Editions

StageForge is distributed in **4 different editions** per platform:

### 1. Full Edition
**Includes:** StageForge + OBS + LibreOffice  
**Use Case:** All-in-one package, no external dependencies  
**Best For:** Quick deployment, schools, events with no IT setup  

### 2. OBS Edition
**Includes:** StageForge + OBS  
**Use Case:** PPT scene-conversion mode only  
**Best For:** Users who already have LibreOffice or don't need renderer mode  

### 3. LibreOffice Edition
**Includes:** StageForge + LibreOffice  
**Use Case:** PPT renderer mode only  
**Best For:** Users who already have OBS installed  

### 4. Core Edition
**Includes:** StageForge only  
**Use Case:** Controller/scene generator only  
**Best For:** Advanced users with custom OBS/LibreOffice setups  

## Supported Platforms

- **Windows**: x64 (NSIS installer)
- **macOS**: x64 + arm64 (DMG)
- **Linux**: x64 (AppImage + tar.gz)

## CI/CD Workflows

### CodeQL Security Analysis (`codeql.yml`)

**Triggers:**
- Push to main/develop branches
- Pull requests
- Daily at 2 AM UTC
- Manual dispatch

**Purpose:**
- Scans JavaScript code for security vulnerabilities
- Runs security-and-quality queries
- **BLOCKS** builds if vulnerabilities found

**Configuration:**
```yaml
languages: javascript
queries: security-and-quality
```

### Build and Release (`build.yml`)

**Triggers:**
- Tag push (v*)
- Manual dispatch

**Jobs:**
1. **CodeQL Check** (prerequisite for all builds)
   - Must pass before any build starts
   - Analyzes code for security issues
   
2. **Build Windows** (4 editions in parallel)
   - Downloads OBS runtime (Full, OBS)
   - Downloads LibreOffice runtime (Full, LibreOffice)
   - Creates edition marker
   - Builds NSIS installer
   - Uploads artifacts
   
3. **Build macOS** (4 editions in parallel)
   - Downloads runtimes as needed
   - Builds DMG for x64 and arm64
   - Applies code signing/notarization
   - Uploads artifacts
   
4. **Build Linux** (4 editions in parallel)
   - Downloads runtimes as needed
   - Builds AppImage and tar.gz
   - Uploads artifacts
   
5. **Create Release**
   - Runs only on tag push
   - Downloads all artifacts
   - Creates draft GitHub release
   - Attaches all build artifacts

## Artifact Naming Convention

```
StageForge-{Edition}-{OS}-{Arch}.{ext}
```

**Examples:**
- `StageForge-Full-Windows-x64.exe`
- `StageForge-OBS-macOS-x64.dmg`
- `StageForge-LibreOffice-Linux-x64.AppImage`
- `StageForge-Core-Windows-x64.exe`

## Build Process

### Local Development Build

```bash
# Install dependencies
npm install

# Build specific edition
npm run build:full
npm run build:obs
npm run build:libreoffice
npm run build:core

# Build all editions
npm run build:all
```

### Manual CI Build

1. Go to Actions tab on GitHub
2. Select "Build and Release" workflow
3. Click "Run workflow"
4. Select branch and edition (optional)
5. Click "Run workflow"

### Release Build

1. Create and push a tag:
```bash
git tag v1.0.0
git push origin v1.0.0
```

2. CI automatically:
   - Runs CodeQL security check
   - Builds all editions for all platforms
   - Creates draft release with artifacts

3. Review draft release and publish

## Runtime Bundling

### Directory Structure

```
StageForge/
├── app/                      # Electron app
│   ├── src/
│   ├── locales/
│   └── config.json
└── resources/                # Bundled runtimes
    ├── obs/                  # OBS portable (Full, OBS editions)
    │   ├── bin/
    │   ├── data/
    │   └── obs-plugins/
    └── libreoffice/          # LibreOffice portable (Full, LibreOffice editions)
        ├── program/
        ├── share/
        └── presets/
```

### Runtime Download Scripts

Located in `build/scripts/`:

- **`download-obs.sh`**: Downloads OBS portable for platform
- **`download-libreoffice.sh`**: Downloads LibreOffice portable

**Usage:**
```bash
# Download OBS for Linux
./build/scripts/download-obs.sh linux resources/obs

# Download LibreOffice for Windows
./build/scripts/download-libreoffice.sh windows resources/libreoffice
```

## Security Scanning

### CodeQL Configuration

**Scan Triggers:**
- Every push to main branches
- All pull requests
- Daily scheduled scans
- Before every release build

**Security Policy:**
- ❌ Builds **FAIL** if CodeQL finds vulnerabilities
- ✅ Builds **PROCEED** only after passing CodeQL
- 📊 Results published to Security tab

### Viewing CodeQL Results

1. Go to repository Security tab
2. Click "Code scanning alerts"
3. Review any findings
4. Fix issues before release

## Build Matrix Strategy

The CI uses a matrix strategy to avoid duplication:

```yaml
strategy:
  matrix:
    edition: [Full, OBS, LibreOffice, Core]
```

**Benefits:**
- Single job definition for all editions
- Parallel builds (faster)
- Consistent build process
- Easy to add new editions

## Caching

**NPM Dependencies:**
```yaml
- uses: actions/setup-node@v4
  with:
    cache: 'npm'
```

**Benefits:**
- Faster builds (reuses dependencies)
- Reduced network usage
- Consistent dependency versions

## Code Signing (macOS)

### Requirements

Set repository secrets:
- `APPLE_ID`: Apple Developer ID
- `APPLE_ID_PASSWORD`: App-specific password
- `CSC_LINK`: Developer certificate (base64)
- `CSC_KEY_PASSWORD`: Certificate password

### Entitlements

Located at `build/entitlements.mac.plist`:
- JIT compilation
- Unsigned executable memory
- Audio/video device access

## Troubleshooting

### Build Fails on CodeQL

**Symptom:** Build stops at CodeQL check  
**Solution:**
1. Check Security tab for alerts
2. Fix identified vulnerabilities
3. Re-run build

### Missing Artifacts

**Symptom:** Artifacts not uploaded  
**Solution:**
1. Check job logs for build errors
2. Verify artifact paths in workflow
3. Ensure `dist/` directory contains files

### Runtime Download Fails

**Symptom:** Edition-specific build fails  
**Solution:**
1. Update download scripts with correct URLs
2. Check network connectivity
3. Verify download links are still valid

### macOS Signing Issues

**Symptom:** DMG not notarized  
**Solution:**
1. Verify secrets are set correctly
2. Check certificate expiration
3. Review entitlements.mac.plist

## Contributing

When adding new features:

1. ✅ Ensure code passes CodeQL locally
2. ✅ Update build scripts if adding dependencies
3. ✅ Test all 4 editions still build
4. ✅ Update this documentation

## References

- [electron-builder Documentation](https://www.electron.build/)
- [GitHub Actions Documentation](https://docs.github.com/actions)
- [CodeQL for JavaScript](https://codeql.github.com/docs/codeql-language-guides/codeql-for-javascript/)
- [OBS Studio Downloads](https://obsproject.com/download)
- [LibreOffice Downloads](https://www.libreoffice.org/download/)

---

**Last Updated:** 2025-12-15  
**Build System Version:** 1.0.0
