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
  platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic'; // kept for API compatibility (unused)
  saveToGallery?: boolean;
}

/**
 * Capture a screenshot and share it via the native share sheet (expo-sharing)
 */
export const captureAndShare = async (options: ScreenshotShareOptions): Promise<boolean> => {
  try {
    const {
      viewRef,
      filename = `achievement_${Date.now()}`,
      format = 'png',
      quality = 1,
      saveToGallery = false,
    } = options;

    // Capture the screenshot
    const tmpUri = await captureRef(viewRef, {
      format,
      quality,
      result: 'tmpfile',
    });

    // Copy to cache directory with proper naming
    const ext = format === 'png' ? 'png' : 'jpg';
    const filePath = `${FileSystem.cacheDirectory}${filename}.${ext}`;
    await FileSystem.copyAsync({ from: tmpUri, to: filePath });

    // Save to gallery if requested
    if (saveToGallery) {
      try {
        const { status } = await MediaLibrary.requestPermissionsAsync();
        if (status === 'granted') {
          await MediaLibrary.saveToLibraryAsync(filePath);
        }
      } catch (galleryError) {
        console.warn('Failed to save to gallery:', galleryError);
      }
    }

    // Share via native share sheet
    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(filePath, { dialogTitle: 'Share your achievement!' });

    // Clean up temporary file (best-effort)
    try { await FileSystem.deleteAsync(filePath, { idempotent: true }); } catch {}

    return true;
  } catch (error) {
    console.error('Error capturing and sharing screenshot:', error);
    Alert.alert('Screenshot Failed', 'Unable to capture and share the screenshot. Please try again.');
    return false;
  }
};

/**
 * Share an existing image file via the native share sheet
 */
export const shareImageFile = async (
  filePath: string,
): Promise<boolean> => {
  try {
    const info = await FileSystem.getInfoAsync(filePath);
    if (!info.exists) throw new Error('Image file does not exist');

    if (!(await Sharing.isAvailableAsync())) {
      Alert.alert('Sharing Unavailable', 'Sharing is not available on this device.');
      return false;
    }

    await Sharing.shareAsync(filePath, { dialogTitle: 'Share your achievement!' });
    return true;
  } catch (error) {
    console.error('Error sharing image file:', error);
    Alert.alert('Share Failed', 'Unable to share this image. Please try again.');
    return false;
  }
};
