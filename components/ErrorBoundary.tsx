import React, { Component, ReactNode } from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';

interface Props {
  children: ReactNode;
  fallback?: ReactNode;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): State {
    console.error('💥 ErrorBoundary: Caught error:', error);
    console.error('💥 ErrorBoundary: Error name:', error.name);
    console.error('💥 ErrorBoundary: Error message:', error.message);
    console.error('💥 ErrorBoundary: Error stack:', error.stack);
    
    // Log to crash reporting service if available
    if (typeof (global as any).__ErrorUtils !== 'undefined') {
      (global as any).__ErrorUtils.reportFatalError(error);
    }
    
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: any) {
    console.error('💥 ErrorBoundary: Error details:', error, errorInfo);
    console.error('💥 ErrorBoundary: Component stack:', errorInfo.componentStack);
    
    // Additional logging for auth-related errors
    if (error.message.includes('auth') || error.message.includes('firebase') || error.message.includes('google')) {
      console.error('🔑 Authentication-related error detected:', {
        errorName: error.name,
        errorMessage: error.message,
        timestamp: new Date().toISOString(),
      });
    }
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        return this.props.fallback;
      }

      return (
        <View style={styles.container}>
          <ThemedText style={styles.title}>Something went wrong</ThemedText>
          <ThemedText style={styles.message}>
            An unexpected error occurred. Please try restarting the app.
          </ThemedText>
          <TouchableOpacity
            style={styles.button}
            onPress={() => this.setState({ hasError: false, error: undefined })}
          >
            <ThemedText style={styles.buttonText}>Try Again</ThemedText>
          </TouchableOpacity>
          {this.state.error && (
            <View style={styles.debugContainer}>
              <ThemedText style={styles.debugTitle}>Error Details:</ThemedText>
              <ThemedText style={styles.debugText}>Name: {this.state.error.name}</ThemedText>
              <ThemedText style={styles.debugText}>Message: {this.state.error.message}</ThemedText>
              <ThemedText style={styles.debugText}>Time: {new Date().toISOString()}</ThemedText>
              {this.state.error.stack && (
                <ThemedText style={styles.debugText} numberOfLines={10}>
                  Stack: {this.state.error.stack}
                </ThemedText>
              )}
            </View>
          )}
        </View>
      );
    }

    return this.props.children;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: '#333',
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 24,
    color: '#666',
    lineHeight: 24,
  },
  button: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
    marginBottom: 20,
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  debugContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    width: '100%',
  },
  debugTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginBottom: 8,
    color: '#333',
  },
  debugText: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
});

export default ErrorBoundary;
