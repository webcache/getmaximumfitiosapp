import React from 'react';
import {
    Keyboard,
    KeyboardAvoidingView,
    Platform,
    TouchableWithoutFeedback,
    View,
    ViewStyle,
} from 'react-native';

interface KeyboardSafeScreenWrapperProps {
  children: React.ReactNode;
  keyboardVerticalOffset?: number;
  style?: ViewStyle;
  behavior?: 'padding' | 'height' | 'position';
}

export default function KeyboardSafeScreenWrapper({
  children,
  keyboardVerticalOffset,
  style,
  behavior,
}: KeyboardSafeScreenWrapperProps) {
  const defaultBehavior = behavior || (Platform.OS === 'ios' ? 'padding' : 'height');
  const defaultOffset = keyboardVerticalOffset || (Platform.OS === 'ios' ? 0 : 0);

  return (
    <KeyboardAvoidingView 
      style={[{ flex: 1 }, style]}
      behavior={defaultBehavior}
      keyboardVerticalOffset={defaultOffset}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
        <View style={{ flex: 1 }}>
          {children}
        </View>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
}
