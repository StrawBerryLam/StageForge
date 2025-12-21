/**
 * After build hook for electron-builder
 * Safely handles DMG volume detachment on macOS
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');

/**
 * Execute a command safely using spawn
 */
function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, { stdio: 'inherit' });
    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`Command failed with exit code ${code}`));
      }
    });
    proc.on('error', reject);
  });
}

exports.default = async function(context) {
  // Determine platform name robustly and skip if not macOS
  const platformName = (context && context.platform && context.platform.name)
    || (context && context.electronPlatformName)
    || process.platform;

  if (platformName !== 'mac' && platformName !== 'darwin') {
    return;
  }

  console.log('Running after-build hook for macOS...');
  
  // Check for and safely detach any StageForge DMG volumes
  try {
    // Resolve product name and version with safe fallbacks
    let productName;
    let version;

    if (context && context.packager && context.packager.appInfo) {
      productName = context.packager.appInfo.productName;
      version = context.packager.appInfo.version;
    } else {
      const eb = require('../../electron-builder.json');
      const pkg = require('../../package.json');
      productName = eb.productName || pkg.productName || pkg.name || 'StageForge';
      version = pkg.version || '0.0.0';
    }
    
    const volumeNames = [
      `${productName} ${version}`,
      `${productName} ${version} x64`,
      `${productName} ${version} arm64`
    ];

    for (const volumeName of volumeNames) {
      const volumePath = `/Volumes/${volumeName}`;
      
      // Validate that volumeName doesn't contain dangerous characters
      // Only allow alphanumeric, spaces, dots, and hyphens (hyphen at end of character class)
      if (!/^[a-zA-Z0-9\s.-]+$/.test(volumeName)) {
        console.log(`Skipping volume detachment - volume name contains unsafe characters: ${volumeName}`);
        continue;
      }
      
      console.log(`Checking for mounted volume: ${volumePath}`);
      
      // Check if the volume is actually mounted using fs
      if (existsSync(volumePath)) {
        console.log(`Volume ${volumePath} is mounted, attempting to detach...`);
        
        // Try to detach the volume using spawn to prevent command injection
        try {
          await execCommand('hdiutil', ['detach', '-quiet', '-force', volumePath]);
          console.log(`Successfully detached ${volumePath}`);
        } catch (detachError) {
          console.log(`Could not detach ${volumePath}: ${detachError.message}`);
        }
      } else {
        console.log(`Volume ${volumePath} is not mounted.`);
      }
    }
  } catch (error) {
    console.error('Error in after-build hook:', error.message);
    // Don't fail the build if cleanup fails
  }
  
  console.log('After-build hook completed.');
};
