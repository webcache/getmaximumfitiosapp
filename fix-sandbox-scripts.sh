#!/bin/bash

echo "🔧 Fixing macOS sandbox issues with iOS shell scripts..."

# Find all shell scripts in the iOS directory
SCRIPT_FILES=$(find /Users/cash/github/GetMaximumFitIosApp/ios -name "*.sh" -type f)

for script in $SCRIPT_FILES; do
    echo "Processing: $script"
    
    # Make executable
    chmod +x "$script"
    
    # Remove all extended attributes
    xattr -c "$script" 2>/dev/null || true
    
    # Force remove the com.apple.provenance attribute specifically
    xattr -d com.apple.provenance "$script" 2>/dev/null || true
    
    # Check if attributes still exist
    if xattr -l "$script" | grep -q com.apple.provenance; then
        echo "⚠️  Warning: com.apple.provenance still exists on $script"
        
        # Try alternative approach - copy file content to new file without attributes
        temp_file="${script}.temp"
        cp "$script" "$temp_file"
        mv "$temp_file" "$script"
        chmod +x "$script"
    else
        echo "✅ Successfully cleaned: $script"
    fi
done

echo "🎉 Sandbox script fix complete!"
