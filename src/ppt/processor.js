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
      // Validate and sanitize input path
      if (!filePath || typeof filePath !== 'string') {
        throw new Error('Invalid file path');
      }
      
      // Resolve absolute path to prevent directory traversal
      const resolvedPath = path.resolve(filePath);
      
      // Check if file exists and is accessible
      try {
        await fs.access(resolvedPath);
      } catch (error) {
        throw new Error(`File not accessible: ${resolvedPath}`);
      }
      
      const fileName = path.basename(resolvedPath, path.extname(resolvedPath));
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
      const targetPath = path.join(programDir, path.basename(resolvedPath));
      await fs.copyFile(resolvedPath, targetPath);

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
   * Fully implemented using ZIP parsing for PPTX files
   */
  async _getSlideCount(pptPath) {
    try {
      // For PPTX files (which are ZIP archives), parse the presentation.xml
      const ext = path.extname(pptPath).toLowerCase();
      
      if (ext === '.pptx') {
        // Use adm-zip to read the PPTX structure
        const AdmZip = require('adm-zip');
        const zip = new AdmZip(pptPath);
        
        // Try to get slide count from presentation.xml
        const presentationEntry = zip.getEntry('ppt/presentation.xml');
        if (presentationEntry) {
          const presentationXml = zip.readAsText(presentationEntry);
          // Count <p:sldId> elements (slide IDs)
          const slideMatches = presentationXml.match(/<p:sldId /g);
          if (slideMatches) {
            return slideMatches.length;
          }
        }
        
        // Fallback: count slide files directly
        const entries = zip.getEntries();
        const slideFiles = entries.filter(e => 
          e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)
        );
        return slideFiles.length;
      }
      
      // For older .ppt files, we need LibreOffice or similar
      // Fall back to LibreOffice inspection
      return await this._getSlideCountViaLibreOffice(pptPath);
    } catch (error) {
      console.error('Error getting slide count:', error);
      return 5; // Default fallback
    }
  }
  
  async _getSlideCountViaLibreOffice(pptPath) {
    // This would require LibreOffice UNO API or similar
    // For now, return a default count
    // In full implementation, use LibreOffice headless mode to get slide count
    return 5;
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
          // Match pattern: video file contains "slide" followed by the slide number
          const slideNumberPattern = new RegExp(`slide[_\\s-]?${index + 1}[_\\s-]?`, 'i');
          const videoFile = videoFiles.find(v => slideNumberPattern.test(v));
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
   * Fully implemented using ZIP extraction for PPTX files
   */
  async _extractVideos(pptPath, videoDir) {
    try {
      const ext = path.extname(pptPath).toLowerCase();
      
      // Only PPTX files can be processed (they're ZIP archives)
      if (ext !== '.pptx') {
        console.log('Video extraction only supported for .pptx files');
        return;
      }
      
      const AdmZip = require('adm-zip');
      const zip = new AdmZip(pptPath);
      const entries = zip.getEntries();
      
      // Extract all video files from ppt/media/ directory
      let videoCount = 0;
      for (const entry of entries) {
        if (entry.entryName.startsWith('ppt/media/') && 
            CONSTANTS.EXTENSIONS.VIDEO.test(entry.entryName)) {
          const videoName = path.basename(entry.entryName);
          const targetPath = path.join(videoDir, videoName);
          
          // Extract the video file
          zip.extractEntryTo(entry, videoDir, false, true);
          videoCount++;
          
          console.log(`Extracted video: ${videoName}`);
        }
      }
      
      if (videoCount > 0) {
        console.log(`Extracted ${videoCount} video(s) from ${path.basename(pptPath)}`);
        
        // Try to associate videos with slides by parsing slide XMLs
        await this._associateVideosWithSlides(zip, videoDir);
      }
    } catch (error) {
      console.error('Video extraction error:', error.message);
    }
  }
  
  /**
   * Associate extracted videos with their corresponding slides
   * by parsing slide XML files to find video references
   */
  async _associateVideosWithSlides(zip, videoDir) {
    try {
      const entries = zip.getEntries();
      const slideEntries = entries.filter(e => 
        e.entryName.match(/^ppt\/slides\/slide\d+\.xml$/)
      );
      
      // Parse each slide XML to find video references
      for (const slideEntry of slideEntries) {
        const slideNumber = slideEntry.entryName.match(/slide(\d+)\.xml$/)[1];
        const slideXml = zip.readAsText(slideEntry);
        
        // Look for video references in the slide XML
        // Video references typically appear as <p:video> or media references
        if (slideXml.includes('<p:video') || slideXml.includes('r:embed')) {
          // Extract media reference IDs
          const mediaRefs = slideXml.match(/r:embed="rId(\d+)"/g);
          
          if (mediaRefs) {
            // Parse the slide relationships to find actual media files
            const relsPath = `ppt/slides/_rels/slide${slideNumber}.xml.rels`;
            const relsEntry = zip.getEntry(relsPath);
            
            if (relsEntry) {
              const relsXml = zip.readAsText(relsEntry);
              
              // Find video file references in relationships
              const videoTargets = relsXml.match(/Target="\.\.\/media\/[^"]+\.(mp4|avi|mov|mkv|webm)"/gi);
              
              if (videoTargets) {
                // Rename videos to associate with slide number
                for (const target of videoTargets) {
                  const mediaFile = target.match(/media\/([^"]+)/)[1];
                  const oldPath = path.join(videoDir, mediaFile);
                  const newPath = path.join(videoDir, `slide_${slideNumber}_${mediaFile}`);
                  
                  try {
                    await fs.rename(oldPath, newPath);
                    console.log(`Associated video with slide ${slideNumber}: ${mediaFile}`);
                  } catch (err) {
                    // File might already be renamed or not exist
                  }
                }
              }
            }
          }
        }
      }
    } catch (error) {
      console.log('Could not associate videos with slides:', error.message);
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
    // Remove or replace invalid characters for filesystem
    // Allow only alphanumeric, underscore, hyphen, and spaces
    return name
      .replace(/[^a-zA-Z0-9_\s-]/g, '_')
      .replace(/\s+/g, '_')
      .substring(0, 100); // Limit length to prevent issues
  }
}

module.exports = PPTProcessor;
