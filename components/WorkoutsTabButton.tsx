import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React from 'react';
import { Animated, Platform, StyleSheet, TouchableOpacity, View } from 'react-native';
import { Colors } from '../constants/Colors';
import { useColorScheme } from '../hooks/useColorScheme';
import { useDynamicThemeColor } from '../hooks/useThemeColor';

interface WorkoutsTabButtonProps {
  onPress?: () => void;
  focused: boolean;
}

export function WorkoutsTabButton({ onPress, focused }: WorkoutsTabButtonProps) {
  const colorScheme = useColorScheme();
  const { themeColor } = useDynamicThemeColor();
  const colors = Colors[colorScheme ?? 'light'];
  
  const scaleAnim = React.useRef(new Animated.Value(focused ? 1.15 : 1)).current;
  
  React.useEffect(() => {
    Animated.spring(scaleAnim, {
      toValue: focused ? 1.15 : 1,
      useNativeDriver: true,
      tension: 300,
      friction: 10,
    }).start();
  }, [focused, scaleAnim]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        onPress={onPress || (() => {})}
        style={[
          styles.container,
          { backgroundColor: themeColor }, // Always use theme color
          focused && styles.containerFocused, // Apply enhanced shadow when focused
        ]}
        activeOpacity={0.8}
      >
        <View style={styles.iconContainer}>
          <FontAwesome5 
            name="dumbbell" 
            size={24} 
            color="#FFFFFF" // Always white
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    paddingVertical: 0,
    paddingHorizontal: 0,
    borderRadius: 32,
    marginHorizontal: 10,
    marginBottom: 10,
    marginTop: -8, // Lift the button up slightly
    minHeight: 64,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 4,
        },
        shadowOpacity: 0.25,
        shadowRadius: 8,
      },
      android: {
        elevation: 8,
      },
    }),
  },
  containerFocused: {
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: {
          width: 0,
          height: 6,
        },
        shadowOpacity: 0.4,
        shadowRadius: 12,
      },
      android: {
        elevation: 12,
      },
    }),
  },
  containerUnfocused: {
    // Removed border and background overrides
  },
  iconContainer: {
    marginBottom: 0,
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    textAlign: 'center',
    letterSpacing: 0.3,
  },
});
