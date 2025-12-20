/**
 * After build hook for electron-builder
 * Safely handles DMG volume detachment on macOS
 */

const { execSync } = require('child_process');
const path = require('path');

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
    
    console.log(`Checking for mounted volume: ${volumePath}`);
    
    // Check if the volume is actually mounted
    try {
      execSync(`test -d "${volumePath}"`, { stdio: 'ignore' });
      console.log(`Volume ${volumePath} is mounted, attempting to detach...`);
      
      // Try to detach the volume
      execSync(`hdiutil detach "${volumePath}" -quiet -force`, { stdio: 'inherit' });
      console.log(`Successfully detached ${volumePath}`);
    } catch (error) {
      // Volume is not mounted or detach failed, which is fine
      console.log(`Volume ${volumePath} is not mounted or already detached.`);
    }
  } catch (error) {
    console.error('Error in after-build hook:', error.message);
    // Don't fail the build if cleanup fails
  }
  
  console.log('After-build hook completed.');
};
