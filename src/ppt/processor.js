const fs = require('fs').promises;
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const execFilePromise = promisify(execFile);

class PPTProcessor {
  constructor() {
    this.dataDir = path.join(__dirname, '../../data');
    this.programsDir = path.join(this.dataDir, 'programs');
    this.slidesDir = path.join(this.dataDir, 'slides');
    this.ensureDirectories();
  }

  async ensureDirectories() {
    try {
      await fs.mkdir(this.dataDir, { recursive: true });
      await fs.mkdir(this.programsDir, { recursive: true });
      await fs.mkdir(this.slidesDir, { recursive: true });
    } catch (error) {
      console.error('Error creating directories:', error);
    }
  }

  async processFile(filePath, options = {}) {
    try {
      const fileName = path.basename(filePath, path.extname(filePath));
      const programId = this.sanitizeName(fileName);
      const programDir = path.join(this.programsDir, programId);
      const slideDir = path.join(this.slidesDir, programId);

      // Create directories for this program
      await fs.mkdir(programDir, { recursive: true });
      await fs.mkdir(slideDir, { recursive: true });

      // Copy PPT file to program directory
      const targetPath = path.join(programDir, path.basename(filePath));
      await fs.copyFile(filePath, targetPath);

      // Determine mode: default to 'renderer' if not specified
      // Mode can be set during import or auto-detected
      const mode = options.mode || 'renderer';

      // Extract acts (only needed for scene mode, but useful for metadata)
      const acts = mode === 'scene' ? await this.extractActs(targetPath, slideDir) : [];
      
      // Get slide count (useful for both modes)
      const slideCount = acts.length > 0 ? acts.length : await this.getSlideCount(targetPath);

      const program = {
        id: programId,
        name: fileName,
        filePath: targetPath,
        mode: mode, // 'renderer' or 'scene'
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
  async getSlideCount(pptPath) {
    // Placeholder: return estimated count
    // In a full implementation, parse PPT XML structure or use LibreOffice UNO
    return 5; // Default placeholder
  }

  async extractActs(pptPath, slideDir) {
    // This is a simplified implementation
    // In a real implementation, you would:
    // 1. Use LibreOffice or similar to convert PPT to images
    // 2. Extract slide notes/metadata for act information
    // 3. Generate thumbnails
    
    // For demonstration, we'll create placeholder acts
    const acts = [];
    
    try {
      // Try to use LibreOffice to convert slides (if available)
      // This is a basic implementation - a full version would need more robust conversion
      const converted = await this.convertWithLibreOffice(pptPath, slideDir);
      
      if (converted) {
        // List generated images
        const files = await fs.readdir(slideDir);
        const imageFiles = files.filter(f => f.match(/\.(png|jpg|jpeg)$/i));
        
        imageFiles.sort().forEach((file, index) => {
          acts.push({
            index: index,
            name: `Act ${index + 1}`,
            imagePath: path.join(slideDir, file),
            notes: ''
          });
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

  async convertWithLibreOffice(pptPath, outputDir) {
    // Try to convert using LibreOffice if available
    // This is optional - if LibreOffice is not installed, we'll use placeholders
    try {
      // Check if LibreOffice is available
      const loPath = process.platform === 'win32' 
        ? 'C:\\Program Files\\LibreOffice\\program\\soffice.exe'
        : '/usr/bin/soffice';

      // Try conversion (this may fail if LibreOffice is not installed)
      await execFilePromise(loPath, [
        '--headless',
        '--convert-to', 'png',
        '--outdir', outputDir,
        pptPath
      ], { timeout: 60000 });

      return true;
    } catch (error) {
      console.log('LibreOffice conversion not available, using placeholders');
      return false;
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
      const programs = [];

      for (const entry of entries) {
        if (entry.isDirectory()) {
          try {
            const program = await this.loadProgram(entry.name);
            programs.push({
              id: program.id,
              name: program.name,
              createdAt: program.createdAt,
              actCount: program.acts ? program.acts.length : (program.slideCount || 0),
              slideCount: program.slideCount,
              mode: program.mode || 'renderer'
            });
          } catch (error) {
            console.error(`Error loading program ${entry.name}:`, error);
          }
        }
      }

      return programs;
    } catch (error) {
      return [];
    }
  }

  sanitizeName(name) {
    return name.replace(/[^a-zA-Z0-9_-]/g, '_');
  }
}

module.exports = PPTProcessor;
