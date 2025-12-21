#!/bin/bash

# Detach any existing StageForge volumes to prevent "Resource busy" errors
echo "Checking for stale StageForge volumes..."
if [[ "$OSTYPE" == "darwin"* ]]; then
    # Use mount command which is more reliable for parsing mount points with spaces
    # Output format: /dev/diskXsY on /Volumes/Name (filesystem, ...)
    # We extract the path between " on " and " ("
    MOUNTED_VOLUMES=$(mount | grep "/Volumes/StageForge" | sed 's/.* on \(\/Volumes\/.*\) (.*/\1/')
    
    if [ -n "$MOUNTED_VOLUMES" ]; then
        echo "Found stale volumes:"
        echo "$MOUNTED_VOLUMES"
        
        # Set Internal Field Separator to newline to handle spaces in filenames
        IFS=$'\n'
        for volume in $MOUNTED_VOLUMES; do
            echo "Detaching $volume..."
            hdiutil detach "$volume" -force -quiet
        done
        unset IFS
    else
        echo "No stale volumes found."
    fi
else
    echo "Not running on macOS, skipping hdiutil cleanup."
fi
