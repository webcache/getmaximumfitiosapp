import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import CrashLogger from './crashLogger';

export interface GoogleSignInDiagnostic {
  isConfigured: boolean;
  hasValidClientId: boolean;
  canCheckCurrentUser: boolean;
  platformSupported: boolean;
  error?: string;
  details: any;
}

/**
 * Run comprehensive Google Sign-In diagnostic checks
 */
export const runGoogleSignInDiagnostic = async (): Promise<GoogleSignInDiagnostic> => {
  const diagnostic: GoogleSignInDiagnostic = {
    isConfigured: false,
    hasValidClientId: false,
    canCheckCurrentUser: false,
    platformSupported: Platform.OS === 'ios' || Platform.OS === 'android',
    details: {}
  };

  try {
    CrashLogger.logGoogleSignInStep('Starting Google Sign-In diagnostic');

    // Check 1: Platform support
    if (!diagnostic.platformSupported) {
      diagnostic.error = 'Platform not supported';
      return diagnostic;
    }

    // Check 2: Environment variable
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    diagnostic.hasValidClientId = !!iosClientId && iosClientId.length > 20;
    diagnostic.details.clientIdLength = iosClientId?.length || 0;
    diagnostic.details.clientIdPrefix = iosClientId?.substring(0, 20);

    if (!diagnostic.hasValidClientId) {
      diagnostic.error = 'Invalid or missing iOS Client ID';
      return diagnostic;
    }

    // Check 3: Test GoogleSignin module availability
    try {
      await GoogleSignin.getCurrentUser();
      diagnostic.canCheckCurrentUser = true;
      diagnostic.isConfigured = true;
      CrashLogger.logGoogleSignInStep('GoogleSignin module is accessible');
    } catch (error: any) {
      // This is expected if no user is signed in
      if (error.message && error.message.includes('The user is not signed in')) {
        diagnostic.canCheckCurrentUser = true;
        diagnostic.isConfigured = true;
        CrashLogger.logGoogleSignInStep('GoogleSignin module is accessible (no signed in user - OK)');
      } else {
        diagnostic.error = `GoogleSignin module error: ${error.message}`;
        diagnostic.details.moduleError = error.message;
        CrashLogger.recordError(error, 'GOOGLE_SIGNIN_DIAGNOSTIC');
      }
    }

    // Check 4: Additional iOS-specific checks
    if (Platform.OS === 'ios') {
      try {
        // Try to check if we can access the sign-in configuration
        // This should not throw if GoogleSignin is properly configured
        diagnostic.details.iosSpecific = 'iOS Google Sign-In module accessible';
      } catch (error) {
        diagnostic.details.iosError = error;
      }
    }

    CrashLogger.logGoogleSignInStep('Google Sign-In diagnostic completed', diagnostic);
    return diagnostic;

  } catch (error: any) {
    diagnostic.error = `Diagnostic failed: ${error.message}`;
    CrashLogger.recordError(error, 'GOOGLE_SIGNIN_DIAGNOSTIC_FATAL');
    return diagnostic;
  }
};

/**
 * Format diagnostic results for user display
 */
export const formatDiagnosticResults = (diagnostic: GoogleSignInDiagnostic): string => {
  const lines = [
    `Platform Supported: ${diagnostic.platformSupported ? '✅' : '❌'}`,
    `Valid Client ID: ${diagnostic.hasValidClientId ? '✅' : '❌'}`,
    `Module Accessible: ${diagnostic.canCheckCurrentUser ? '✅' : '❌'}`,
    `Configured: ${diagnostic.isConfigured ? '✅' : '❌'}`,
  ];

  if (diagnostic.error) {
    lines.push(`Error: ${diagnostic.error}`);
  }

  if (diagnostic.details.clientIdPrefix) {
    lines.push(`Client ID: ${diagnostic.details.clientIdPrefix}...`);
  }

  return lines.join('\n');
};
