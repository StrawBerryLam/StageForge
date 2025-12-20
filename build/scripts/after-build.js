/**
 * After build hook for electron-builder
 * Safely handles DMG volume detachment on macOS
 */

const { spawn } = require('child_process');
const { existsSync } = require('fs');
const path = require('path');

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
  const { platform } = context;
  
  // Only run on macOS
  if (platform.name !== 'mac') {
    return;
  }

  console.log('Running after-build hook for macOS...');
  
  // Check for and safely detach any StageForge DMG volumes
  try {
    const productName = context.packager.appInfo.productName;
    const version = context.packager.appInfo.version;
    const volumeName = `${productName} ${version}`;
    const volumePath = `/Volumes/${volumeName}`;
    
    // Validate that volumeName doesn't contain dangerous characters
    // Only allow alphanumeric, spaces, dots, and hyphens
    if (!/^[a-zA-Z0-9\s\.\-]+$/.test(volumeName)) {
      console.log(`Skipping volume detachment - volume name contains unsafe characters: ${volumeName}`);
      return;
    }
    
    console.log(`Checking for mounted volume: ${volumePath}`);
    
    // Check if the volume is actually mounted using fs
    if (existsSync(volumePath)) {
      console.log(`Volume ${volumePath} is mounted, attempting to detach...`);
      
      // Try to detach the volume using spawn to prevent command injection
      try {
        await execCommand('hdiutil', ['detach', volumePath, '-quiet', '-force']);
        console.log(`Successfully detached ${volumePath}`);
      } catch (detachError) {
        console.log(`Could not detach ${volumePath}: ${detachError.message}`);
      }
    } else {
      console.log(`Volume ${volumePath} is not mounted.`);
    }
  } catch (error) {
    console.error('Error in after-build hook:', error.message);
    // Don't fail the build if cleanup fails
  }
  
  console.log('After-build hook completed.');
};
