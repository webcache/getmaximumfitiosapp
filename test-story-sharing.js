// Test file to verify story sharing functionality
// Run this in a React Native environment to test the functions

import { shareToFacebookStory, shareToInstagramStory } from './utils/socialSharing';

// Test Instagram story sharing
const testInstagramStory = async () => {
  try {
    console.log('Testing Instagram story sharing...');
    const result = await shareToInstagramStory('path/to/test/image.jpg');
    console.log('Instagram story sharing result:', result);
  } catch (error) {
    console.error('Instagram story sharing error:', error);
  }
};

// Test Facebook story sharing  
const testFacebookStory = async () => {
  try {
    console.log('Testing Facebook story sharing...');
    const result = await shareToFacebookStory('path/to/test/image.jpg');
    console.log('Facebook story sharing result:', result);
  } catch (error) {
    console.error('Facebook story sharing error:', error);
  }
};

// Run tests
console.log('Starting story sharing tests...');
testInstagramStory();
testFacebookStory();

// Check if URL schemes are configured
console.log('URL schemes that should be configured in app.json:');
console.log('- instagram-stories://');
console.log('- facebook-stories://');
console.log('');
console.log('To test story sharing:');
console.log('1. Install Instagram and/or Facebook apps on device');
console.log('2. Test on a real device (not simulator)');
console.log('3. Try sharing a workout screenshot or progress photo');
console.log('4. Select Instagram or Facebook from the sharing modal');
console.log('5. Choose "Stories" option when prompted');
