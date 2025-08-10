import * as FileSystem from 'expo-file-system';
import * as MediaLibrary from 'expo-media-library';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export interface ScreenshotShareOptions {
  viewRef: any; // React ref to the view to screenshot
  filename?: string;
  format?: 'png' | 'jpg';
  quality?: number; // 0-1 for jpg
  platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
  saveToGallery?: boolean;
}

/**
 * Capture a screenshot and share it to social media
 */
export const captureAndShare = async (options: ScreenshotShareOptions): Promise<boolean> => {
  try {
    const {
      viewRef,
      filename = `achievement_${Date.now()}`,
      format = 'png',
      quality = 1,
      platform = 'generic',
      saveToGallery = false
    } = options;

    // Capture the screenshot
    console.log('Capturing screenshot...');
    const uri = await captureRef(viewRef, {
      format,
      quality,
      result: 'tmpfile', // Save to temporary file
    });

    console.log('Screenshot captured:', uri);

    // Create a proper file path in the cache directory
    const fileExtension = format === 'png' ? 'png' : 'jpg';
    const filePath = `${FileSystem.cacheDirectory}${filename}.${fileExtension}`;
    
    // Copy to cache directory with proper naming
    await FileSystem.copyAsync({
      from: uri,
      to: filePath,
    });

    console.log('File saved to:', filePath);

    // Save to gallery if requested
    if (saveToGallery) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(filePath);
          console.log('Image saved to gallery');
        }
      } catch (galleryError) {
        console.warn('Failed to save to gallery:', galleryError);
        // Don't fail the entire operation if gallery save fails
      }
    }

    // Share the image
    const shareResult = await shareImageFile(filePath, platform);

    // Clean up temporary file after sharing
    try {
      await FileSystem.deleteAsync(filePath, { idempotent: true });
      console.log('Temporary file cleaned up');
    } catch (cleanupError) {
      console.warn('Failed to cleanup temporary file:', cleanupError);
    }

    return shareResult;

  } catch (error) {
    console.error('Error capturing and sharing screenshot:', error);
    
    // Show user-friendly error message
    Alert.alert(
      'Screenshot Failed',
      'Unable to capture and share the screenshot. Please try again.',
      [{ text: 'OK' }]
    );
    
    return false;
  }
};

/**
 * Share an image file to social media platforms
 * Updated to use expo-sharing with platform-specific optimizations
 */
export const shareImageFile = async (
  filePath: string, 
  platform: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic' = 'generic',
  message?: string
): Promise<boolean> => {
  try {
    console.log('Sharing image file:', filePath);
    
    // Verify file exists
    const fileInfo = await FileSystem.getInfoAsync(filePath);
    if (!fileInfo.exists) {
      throw new Error('Image file does not exist');
    }

    console.log('File verified, size:', fileInfo.size);

    // Platform-specific sharing optimizations
    if (platform === 'twitter') {
      // Twitter works well with the generic sharing sheet
      await Sharing.shareAsync(filePath, {
        mimeType: 'image/png',
        dialogTitle: message || 'Share to Twitter',
      });
    } else if (platform === 'whatsapp') {
      // WhatsApp works well with the generic sharing sheet
      await Sharing.shareAsync(filePath, {
        mimeType: 'image/png',
        dialogTitle: message || 'Share to WhatsApp',
      });
    } else {
      // Use expo-sharing for native share sheet (works for all platforms)
      await Sharing.shareAsync(filePath, {
        mimeType: 'image/png',
        dialogTitle: message || 'Share Achievement',
      });
    }

    return true;
  } catch (error: any) {
    console.error('Error sharing image file:', error);
    
    // Check if it's a user cancellation
    if (error.message?.includes('User did not share') || 
        error.message?.includes('User cancelled') || 
        error.message?.includes('cancelled')) {
      return false; // User cancelled, don't show error
    }
    
    // Show user-friendly error message for actual errors
    Alert.alert(
      'Share Failed',
      `Unable to share image to ${platform}. Please try again.`,
      [{ text: 'OK' }]
    );
    
    return false;
  }
};

/**
 * Create a shareable achievement card as text
 * Updated to use expo-sharing
 */
export const shareTextAsImage = async (
  content: {
    title: string;
    message: string;
    platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
  }
): Promise<boolean> => {
  try {
    // Create share content
    const shareText = `${content.title}\n\n${content.message}\n\n🎉 Shared from Maximum Fit`;
    
    // Create a temporary text file
    const tempDir = FileSystem.cacheDirectory + 'temp_shares/';
    await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
    
    const fileName = `share_${Date.now()}.txt`;
    const filePath = tempDir + fileName;
    
    await FileSystem.writeAsStringAsync(filePath, shareText, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    // Share using expo-sharing
    await Sharing.shareAsync(filePath, {
      mimeType: 'text/plain',
      dialogTitle: content.title,
    });

    // Clean up temp file
    try {
      await FileSystem.deleteAsync(filePath);
    } catch (cleanupError) {
      console.log('Failed to clean up temp file:', cleanupError);
    }

    return true;
  } catch (error: any) {
    if (error.message !== 'User did not share' && error.message !== 'User cancelled') {
      console.error('Error sharing text:', error);
      return false;
    }
    return false;
  }
};

/**
 * Check if a platform requires an image
 */
export const platformRequiresImage = (platform: string): boolean => {
  return platform === 'instagram';
};

/**
 * Get platform-specific sharing tips
 */
export const getPlatformSharingTips = (platform: string): string => {
  switch (platform) {
    case 'instagram':
      return 'Instagram works best with images. Take a screenshot of your achievement for best results!';
    case 'facebook':
      return 'Facebook supports both text and images. Your achievement will be shared as a post.';
    case 'twitter':
      return 'Your achievement will be shared as a tweet. Keep it under 280 characters!';
    case 'whatsapp':
      return 'Share your achievement with friends and family via WhatsApp message.';
    default:
      return 'Choose from available apps on your device to share your achievement.';
  }
};
