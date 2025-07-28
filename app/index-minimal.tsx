import React from 'react';
import { Text, View } from 'react-native';

export default function MinimalIndex() {
  console.log('🔄 Minimal index rendering');

  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
      <Text style={{ fontSize: 24, marginBottom: 20 }}>Test App Running</Text>
      <Text style={{ fontSize: 16, color: '#666' }}>This is a minimal version to test for crashes</Text>
    </View>
  );
}
