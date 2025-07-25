import { useEffect, useRef } from 'react';
import { StyleSheet } from 'react-native';
import Animated, {
    cancelAnimation,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withTiming,
} from 'react-native-reanimated';

import { ThemedText } from '@/components/ThemedText';

export function HelloWave() {
  const rotationAnimation = useSharedValue(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Only start animation if component is still mounted
    if (isMountedRef.current) {
      rotationAnimation.value = withRepeat(
        withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
        4 // Run the animation 4 times
      );
    }

    // Cleanup animation on unmount to prevent warnings and crashes
    return () => {
      isMountedRef.current = false;
      try {
        cancelAnimation(rotationAnimation);
      } catch (error) {
        // Silently ignore cancellation errors during teardown
        console.warn('Animation cleanup error (expected during teardown):', error);
      }
    };
  }, [rotationAnimation]);

  const animatedStyle = useAnimatedStyle(() => {
    // Add safety check for animation value
    try {
      return {
        transform: [{ rotate: `${rotationAnimation.value}deg` }],
      };
    } catch (error) {
      // Fallback to no transform on animation errors
      console.warn('Animation style error:', error);
      return {};
    }
  });

  return (
    <Animated.View style={animatedStyle}>
      <ThemedText style={styles.text}>👋</ThemedText>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  text: {
    fontSize: 28,
    lineHeight: 32,
    marginTop: -6,
  },
});
