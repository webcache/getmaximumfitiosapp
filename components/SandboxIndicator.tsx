import { Ionicons } from '@expo/vector-icons';
import { StyleSheet, Text, View } from 'react-native';

interface SandboxIndicatorProps {
  visible?: boolean;
}

export function SandboxIndicator({ visible = true }: SandboxIndicatorProps) {
  // Only show in development and if explicitly enabled
  if (!__DEV__ || !visible) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Ionicons name="flask" size={14} color="#FF9500" />
      <Text style={styles.text}>Sandbox Testing Mode</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF3CD',
    borderColor: '#FFEAA7',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginVertical: 4,
    gap: 4,
  },
  text: {
    fontSize: 12,
    color: '#856404',
    fontWeight: '500',
  },
});

export default SandboxIndicator;
