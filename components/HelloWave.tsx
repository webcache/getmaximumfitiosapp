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
import { safeReanimatedOperation } from '@/utils/reanimatedSafety';

export function HelloWave() {
  const rotationAnimation = useSharedValue(0);
  const isMountedRef = useRef(true);

  useEffect(() => {
    // Only start animation if component is still mounted
    if (isMountedRef.current) {
      safeReanimatedOperation(() => {
        rotationAnimation.value = withRepeat(
          withSequence(withTiming(25, { duration: 150 }), withTiming(0, { duration: 150 })),
          4 // Run the animation 4 times
        );
      }, 'HelloWave animation start failed');
    }

    // Cleanup animation on unmount to prevent warnings and crashes
    return () => {
      isMountedRef.current = false;
      safeReanimatedOperation(() => {
        cancelAnimation(rotationAnimation);
      }, 'HelloWave animation cleanup failed');
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
