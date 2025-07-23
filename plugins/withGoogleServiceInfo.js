const { withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const withGoogleServiceInfo = (config) => {
  return withDangerousMod(config, [
    'ios',
    async (config) => {
      const googleServiceInfoPlist = process.env.GOOGLE_SERVICE_INFO_PLIST;
      
      if (!googleServiceInfoPlist) {
        console.log('⚠️  GOOGLE_SERVICE_INFO_PLIST environment variable not found');
        return config;
      }

      try {
        // Decode base64 and write to iOS project directory
        const plistContent = Buffer.from(googleServiceInfoPlist, 'base64').toString('utf8');
        const iosProjectPath = path.join(config.modRequest.projectRoot, 'ios', config.modRequest.projectName);
        const plistPath = path.join(iosProjectPath, 'GoogleService-Info.plist');
        
        // Ensure the directory exists
        if (!fs.existsSync(iosProjectPath)) {
          fs.mkdirSync(iosProjectPath, { recursive: true });
        }
        
        fs.writeFileSync(plistPath, plistContent);
        console.log('✅ GoogleService-Info.plist created successfully at:', plistPath);
        
        // Also create in project root for development
        const rootPlistPath = path.join(config.modRequest.projectRoot, 'GoogleService-Info.plist');
        fs.writeFileSync(rootPlistPath, plistContent);
        console.log('✅ GoogleService-Info.plist created in project root');
        
      } catch (error) {
        console.error('❌ Failed to create GoogleService-Info.plist:', error.message);
        throw error;
      }

      return config;
    },
  ]);
};

module.exports = withGoogleServiceInfo;
