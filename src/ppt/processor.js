const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const CONSTANTS = require('../utils/constants');

const execFilePromise = promisify(execFile);

class PPTProcessor {
  constructor() {
    this.dataDir = path.join(__dirname, '../../', CONSTANTS.PATHS.DATA);
    this.programsDir = path.join(this.dataDir, CONSTANTS.PATHS.PROGRAMS);
    this.slidesDir = path.join(this.dataDir, CONSTANTS.PATHS.SLIDES);
    this.videosDir = path.join(this.dataDir, CONSTANTS.PATHS.VIDEOS);
    this._ensureDirectories();
  }

  async _ensureDirectories() {
    try {
      await Promise.all([
        fs.mkdir(this.dataDir, { recursive: true }),
        fs.mkdir(this.programsDir, { recursive: true }),
        fs.mkdir(this.slidesDir, { recursive: true }),
        fs.mkdir(this.videosDir, { recursive: true })
      ]);
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async processFile(filePath, options = {}) {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));
      const programId = this._sanitizeName(fileName);
      const programDir = path.join(this.programsDir, programId);
      const slideDir = path.join(this.slidesDir, programId);
      const videoDir = path.join(this.videosDir, programId);

      // Create directories for this program
      await Promise.all([
        fs.mkdir(programDir, { recursive: true }),
        fs.mkdir(slideDir, { recursive: true }),
        fs.mkdir(videoDir, { recursive: true })
      ]);

      // Copy PPT file to program directory
      const targetPath = path.join(programDir, path.basename(filePath));
      await fs.copyFile(filePath, targetPath);

      // Determine mode: default to 'renderer' if not specified
      const mode = options.mode || CONSTANTS.MODES.RENDERER;

      // Extract acts (only needed for scene mode, but useful for metadata)
      const acts = mode === CONSTANTS.MODES.SCENE 
        ? await this._extractActs(targetPath, slideDir, videoDir) 
        : [];
      
      // Get slide count (useful for both modes)
      const slideCount = acts.length > 0 ? acts.length : await this._getSlideCount(targetPath);

      const program = {
        id: programId,
        name: fileName,
        filePath: targetPath,
        mode: mode,
        createdAt: new Date().toISOString(),
        slideCount: slideCount,
        acts: acts
      };

      // Save program metadata
      const metadataPath = path.join(programDir, 'metadata.json');
      await fs.writeFile(metadataPath, JSON.stringify(program, null, 2));

      return program;
    } catch (error) {
      throw new Error(`Failed to process PPT file: ${error.message}`);
    }
  }

  /**
   * Get slide count from PPT file
   * This is a placeholder - in production, you'd parse the PPT structure
   */
  async _getSlideCount(pptPath) {
    // Placeholder: return estimated count
    // In a full implementation, parse PPT XML structure or use LibreOffice UNO
    return 5; // Default placeholder
  }

  async _extractActs(pptPath, slideDir, videoDir) {
    // This is a simplified implementation
    // In a real implementation, you would:
    // 1. Use LibreOffice or similar to convert PPT to images
    // 2. Extract slide notes/metadata for act information
    // 3. Generate thumbnails
    // 4. Extract embedded videos
    
    const acts = [];
    
    try {
      // Try to use LibreOffice to convert slides (if available)
      const converted = await this._convertWithLibreOffice(pptPath, slideDir);
      
      if (converted) {
        // Extract videos from PPT if any
        await this._extractVideos(pptPath, videoDir);
        
        // List generated images
        const files = await fs.readdir(slideDir);
        const imageFiles = files.filter(f => CONSTANTS.EXTENSIONS.IMAGE.test(f));
        
        // Check for extracted videos
        let videoFiles = [];
        try {
          const vFiles = await fs.readdir(videoDir);
          videoFiles = vFiles.filter(f => CONSTANTS.EXTENSIONS.VIDEO.test(f));
        } catch (err) {
          // No videos directory or no videos
        }
        
        imageFiles.sort().forEach((file, index) => {
          const actData = {
            index: index,
            name: `Act ${index + 1}`,
            imagePath: path.join(slideDir, file),
            notes: ''
          };
          
          // Check if this slide has an associated video
          const videoFile = videoFiles.find(v => v.includes(`slide_${index + 1}`));
          if (videoFile) {
            actData.videoPath = path.join(videoDir, videoFile);
            actData.hasVideo = true;
          }
          
          acts.push(actData);
        });
      }
    } catch (error) {
      console.error('Error extracting acts:', error);
    }

    // If no acts were created, create placeholders
    if (acts.length === 0) {
      for (let i = 0; i < 5; i++) {
        acts.push({
          index: i,
          name: `Act ${i + 1}`,
          imagePath: null,
          notes: 'Placeholder - image extraction not available'
        });
      }
    }

    return acts;
  }

  async _convertWithLibreOffice(pptPath, outputDir) {
    // Try to convert using LibreOffice if available
    try {
      const loPath = this._getLibreOfficePath();

      await execFilePromise(loPath, [
        '--headless',
        '--convert-to', 'png',
        '--outdir', outputDir,
        pptPath
      ], { timeout: CONSTANTS.TIMING.LO_CONVERSION_TIMEOUT_MS });

      return true;
    } catch (error) {
      console.log('LibreOffice conversion not available, using placeholders');
      return false;
    }
  }

  _getLibreOfficePath() {
    return process.platform === 'win32' 
      ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
      : '/usr/bin/soffice';
  }

  /**
   * Extract videos from PPT file
   * This is a placeholder implementation
   * In production, you'd extract embedded videos from the PPT XML structure
   */
  async _extractVideos(pptPath, videoDir) {
    try {
      // Placeholder: In a real implementation, you would:
      // 1. Unzip the PPTX file (it's a ZIP archive)
      // 2. Navigate to ppt/media/ directory
      // 3. Copy video files to videoDir
      // 4. Rename them to match slide numbers
      
      // For now, this is a no-op placeholder
      console.log('Video extraction would happen here for:', pptPath);
      
      // Example of how it would work:
      // const AdmZip = require('adm-zip');
      // const zip = new AdmZip(pptPath);
      // const entries = zip.getEntries();
      // for (const entry of entries) {
      //   if (entry.entryName.startsWith('ppt/media/') && CONSTANTS.EXTENSIONS.VIDEO.test(entry.entryName)) {
      //     const videoName = path.basename(entry.entryName);
      //     zip.extractEntryTo(entry, videoDir, false, true);
      //   }
      // }
    } catch (error) {
      console.log('Video extraction not available:', error.message);
    }
  }

  async loadProgram(programId) {
    try {
      const metadataPath = path.join(this.programsDir, programId, 'metadata.json');
      const data = await fs.readFile(metadataPath, 'utf-8');
      return JSON.parse(data);
    } catch (error) {
      throw new Error(`Failed to load program: ${error.message}`);
    }
  }

  async listPrograms() {
    try {
      const entries = await fs.readdir(this.programsDir, { withFileTypes: true });
      const programPromises = entries
        .filter(entry => entry.isDirectory())
        .map(async (entry) => {
          try {
            const program = await this.loadProgram(entry.name);
            return {
              id: program.id,
              name: program.name,
              createdAt: program.createdAt,
              actCount: program.acts ? program.acts.length : (program.slideCount || 0),
              slideCount: program.slideCount,
              mode: program.mode || CONSTANTS.MODES.RENDERER
            };
          } catch (error) {
            console.error(`Error loading program ${entry.name}:`, error);
            return null;
          }
        });

      const programs = await Promise.all(programPromises);
      return programs.filter(p => p !== null);
    } catch (error) {
      return [];
    }
  }

  _sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}

module.exports = PPTProcessor;
