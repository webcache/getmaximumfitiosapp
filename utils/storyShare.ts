import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as MediaLibrary from 'expo-media-library';
import { Alert } from 'react-native';

// Instagram Stories share
export async function shareToInstagramStory(imageUri: string, caption?: string) {
  const urlScheme = 'instagram-stories://share';
  const appStoreUrl = 'https://apps.apple.com/app/instagram/id389801252';

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'We need media access to share to Instagram.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(urlScheme);
    if (!canOpen) {
      Alert.alert(
        'Instagram Not Installed',
        'Instagram is not available on this device. You can install it or copy the caption to use later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open App Store', onPress: () => Linking.openURL(appStoreUrl) },
          caption ? { text: 'Show Caption', onPress: () => Alert.alert('Caption', caption) } : undefined,
        ].filter(Boolean) as any
      );
      return;
    }

    // Ensure the file is in cache with a predictable name
    const dest = `${FileSystem.cacheDirectory}shared.png`;
    await FileSystem.copyAsync({ from: imageUri, to: dest });

    // Open Instagram Stories
    await Linking.openURL(urlScheme);
  } catch (err) {
    console.error('IG Story share failed:', err);
    if (caption) {
      Alert.alert('Share Failed', 'Instagram share failed. Here is your caption to copy:', [
        { text: 'OK' }
      ]);
      Alert.alert('Caption', caption);
    } else {
      Alert.alert('Share Failed', 'Instagram share failed. Please try again.');
    }
  }
}

// Facebook Stories share
export async function shareToFacebookStory(imageUri: string, caption?: string) {
  const urlScheme = 'facebook-stories://share';
  const appStoreUrl = 'https://apps.apple.com/app/facebook/id284882215';

  const { status } = await MediaLibrary.requestPermissionsAsync();
  if (status !== 'granted') {
    Alert.alert('Permission Required', 'We need media access to share to Facebook.');
    return;
  }

  try {
    const canOpen = await Linking.canOpenURL(urlScheme);
    if (!canOpen) {
      Alert.alert(
        'Facebook Not Installed',
        'Facebook is not available on this device. You can install it or copy the caption to use later.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Open App Store', onPress: () => Linking.openURL(appStoreUrl) },
          caption ? { text: 'Show Caption', onPress: () => Alert.alert('Caption', caption) } : undefined,
        ].filter(Boolean) as any
      );
      return;
    }

    // Ensure the file is in cache with a predictable name
    const dest = `${FileSystem.cacheDirectory}shared.png`;
    await FileSystem.copyAsync({ from: imageUri, to: dest });

    // Open Facebook Stories
    await Linking.openURL(urlScheme);
  } catch (err) {
    console.error('FB Story share failed:', err);
    if (caption) {
      Alert.alert('Share Failed', 'Facebook share failed. Here is your caption to copy:', [
        { text: 'OK' }
      ]);
      Alert.alert('Caption', caption);
    } else {
      Alert.alert('Share Failed', 'Facebook share failed. Please try again.');
    }
  }
}
