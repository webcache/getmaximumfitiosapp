import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React from 'react';
import { Dimensions, Linking, StyleSheet, Text, TouchableOpacity, View } from 'react-native';

interface VideoPlayerProps {
  videoUrl: string;
  height?: number;
}

export default function VideoPlayer({ videoUrl, height = 200 }: VideoPlayerProps) {
  const screenWidth = Dimensions.get('window').width;

  // Debug logging
  console.log('🎥 VideoPlayer received videoUrl:', videoUrl);
  console.log('🎥 VideoUrl type:', typeof videoUrl);
  console.log('🎥 VideoUrl length:', videoUrl?.length);

  const handleOpenVideo = async () => {
    console.log('🎥 Attempting to open video URL:', videoUrl);
    try {
      await Linking.openURL(videoUrl);
    } catch (error) {
      console.error('Error opening video URL:', error);
    }
  };

  // For now, show a fallback UI that opens the video in browser
  // until expo-av native module is properly configured
  return (
    <View style={[styles.container, { height }]}>
      <TouchableOpacity style={[styles.fallbackContainer, { width: screenWidth, height }]} onPress={handleOpenVideo}>
        <FontAwesome5 name="play-circle" size={60} color="#007AFF" />
        <Text style={styles.fallbackText}>Tap to watch video</Text>
        <Text style={styles.fallbackSubtext}>Opens in browser</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
  },
  fallbackContainer: {
    backgroundColor: '#000',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 10,
  },
  fallbackText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: '600',
  },
  fallbackSubtext: {
    color: '#ccc',
    fontSize: 14,
  },
});
