const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGoogleServiceInfo = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const googleServiceInfoPlist = process.env.GOOGLE_SERVICE_INFO_PLIST;
      const rootPlistPath = path.join(config.modRequest.projectRoot, 'GoogleService-Info.plist');
      const iosProjectPath = path.join(config.modRequest.projectRoot, 'ios', config.modRequest.projectName);
      const plistPath = path.join(iosProjectPath, 'GoogleService-Info.plist');
      
      // Check if file exists locally first, for development builds
      if (fs.existsSync(rootPlistPath)) {
        console.log('✅ Found local GoogleService-Info.plist in project root');
        
        try {
          // Ensure iOS directory exists
          if (!fs.existsSync(iosProjectPath)) {
            fs.mkdirSync(iosProjectPath, { recursive: true });
          }
          
          // Copy from root to iOS directory
          fs.copyFileSync(rootPlistPath, plistPath);
          console.log('✅ Copied GoogleService-Info.plist to iOS directory:', plistPath);
          return config;
        } catch (error) {
          console.warn('⚠️ Error copying GoogleService-Info.plist:', error.message);
          // Continue to try environment variable if available
        }
      }
      
      // If no local file or copy failed, try environment variable
      if (!googleServiceInfoPlist) {
        console.log('⚠️ GOOGLE_SERVICE_INFO_PLIST environment variable not found and no local file exists');
        return config;
      }

      try {
        // Decode base64 and write to iOS project directory
        const plistContent = Buffer.from(googleServiceInfoPlist, 'base64').toString('utf8');
        
        // Ensure the directory exists
        if (!fs.existsSync(iosProjectPath)) {
          fs.mkdirSync(iosProjectPath, { recursive: true });
        }
        
        fs.writeFileSync(plistPath, plistContent);
        console.log('✅ GoogleService-Info.plist created from environment variable at:', plistPath);
        
        // Also update the root plist if it doesn't exist or had issues
        if (!fs.existsSync(rootPlistPath)) {
          fs.writeFileSync(rootPlistPath, plistContent);
          console.log('✅ GoogleService-Info.plist created in project root');
        }
        
      } catch (error) {
        console.error('❌ Failed to create GoogleService-Info.plist:', error.message);
        throw error;
      }

      return config;
    },
  ]);
};

module.exports = withGoogleServiceInfo;
