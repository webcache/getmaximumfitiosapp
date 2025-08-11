import React, { useState } from 'react';
import { Alert, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useFeatureGating } from '../hooks/useFeatureGating';
import { sendChatMessage } from '../services/openaiService';

export const OpenAIDebugComponent: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [lastResult, setLastResult] = useState<string>('');
  const { canUseFeature, incrementUsage, getRemainingUsage } = useFeatureGating();

  const testOpenAIConnection = async () => {
    setIsLoading(true);
    try {
      console.log('🧪 Testing OpenAI connection...');
      
      const testMessage = [{
        role: 'user' as const,
        content: 'Just say "AI working" if you can respond.'
      }];

      const response = await sendChatMessage(testMessage, []);
      setLastResult(`✅ Success: ${response}`);
      
      Alert.alert(
        'OpenAI Test Result',
        `Success! AI responded: "${response}"`,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Error: ${errorMsg}`);
      
      Alert.alert(
        'OpenAI Test Failed',
        `Error: ${errorMsg}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const testFeatureGating = async () => {
    setIsLoading(true);
    try {
      console.log('🔒 Testing feature gating system...');
      
      const canUse = await canUseFeature('aiQueriesPerMonth');
      const remaining = await getRemainingUsage('aiQueriesPerMonth');
      
      const result = `Feature gating test:\n• Can use AI: ${canUse}\n• Remaining queries: ${remaining === -1 ? 'Unlimited' : remaining}`;
      setLastResult(`✅ ${result}`);
      
      Alert.alert(
        'Feature Gating Test',
        result,
        [{ text: 'OK' }]
      );
    } catch (error) {
      const errorMsg = error instanceof Error ? error.message : 'Unknown error';
      setLastResult(`❌ Feature gating error: ${errorMsg}`);
      
      Alert.alert(
        'Feature Gating Test Failed',
        `Error: ${errorMsg}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  // Only show in development builds, hide in production/TestFlight
  const shouldShow = __DEV__;

  if (!shouldShow) {
    return null;
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>🧪 AI Debug Tools</Text>
      
      <TouchableOpacity
        style={[styles.button, isLoading && styles.buttonDisabled]}
        onPress={testOpenAIConnection}
        disabled={isLoading}
      >
        <Text style={styles.buttonText}>
          {isLoading ? 'Testing...' : 'Test OpenAI Connection'}
        </Text>
      </TouchableOpacity>
      
      <TouchableOpacity
        style={[styles.button, styles.secondaryButton, isLoading && styles.buttonDisabled]}
        onPress={testFeatureGating}
        disabled={isLoading}
      >
        <Text style={[styles.buttonText, styles.secondaryButtonText]}>
          {isLoading ? 'Testing...' : 'Test Feature Gating'}
        </Text>
      </TouchableOpacity>
      
      {lastResult ? (
        <Text style={styles.result}>{lastResult}</Text>
      ) : null}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#f0f0f0',
    padding: 16,
    margin: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ddd',
  },
  title: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
    color: '#333',
  },
  button: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
    marginBottom: 12,
  },
  secondaryButton: {
    backgroundColor: '#6c757d',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: 'white',
    fontWeight: '600',
  },
  secondaryButtonText: {
    color: 'white',
  },
  result: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});
