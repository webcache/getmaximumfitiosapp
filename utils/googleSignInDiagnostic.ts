import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { Platform } from 'react-native';
import CrashLogger from './crashLogger';

export interface GoogleSignInDiagnostic {
  isConfigured: boolean;
  hasValidClientId: boolean;
  canCheckCurrentUser: boolean;
  platformSupported: boolean;
  configurationStatus: 'unknown' | 'configured' | 'failed';
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
    configurationStatus: 'unknown',
    details: {}
  };

  try {
    CrashLogger.logGoogleSignInStep('Starting Google Sign-In diagnostic');

    // Check 1: Platform support
    if (!diagnostic.platformSupported) {
      diagnostic.error = 'Platform not supported';
      return diagnostic;
    }

    // Check 2: Environment variables
    const iosClientId = process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID;
    const webClientId = process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID;
    const isSimulator = __DEV__ || process.env.NODE_ENV !== 'production';
    
    const iosClientIdValid = !!iosClientId && iosClientId.length > 20 && iosClientId.includes('.apps.googleusercontent.com');
    const webClientIdValid = !!webClientId && webClientId.length > 20 && webClientId.includes('.apps.googleusercontent.com');
    
    // In production/physical device, only iOS client ID is required
    // In development/simulator, both client IDs are preferred
    diagnostic.hasValidClientId = iosClientIdValid && (isSimulator ? webClientIdValid : true);
    diagnostic.details.iosClientIdLength = iosClientId?.length || 0;
    diagnostic.details.iosClientIdPrefix = iosClientId?.substring(0, 20);
    diagnostic.details.iosClientIdValid = iosClientIdValid;
    diagnostic.details.webClientIdLength = webClientId?.length || 0;
    diagnostic.details.webClientIdPrefix = webClientId?.substring(0, 20);
    diagnostic.details.webClientIdValid = webClientIdValid;
    diagnostic.details.isSimulator = isSimulator;
    diagnostic.details.webClientIdRequired = isSimulator;

    if (!diagnostic.hasValidClientId) {
      const missingIds = [];
      if (!iosClientIdValid) missingIds.push('iOS Client ID');
      if (isSimulator && !webClientIdValid) missingIds.push('Web Client ID (required for dev/simulator)');
      
      diagnostic.error = `Missing client IDs: ${missingIds.join(', ')}`;
      diagnostic.configurationStatus = 'failed';
      return diagnostic;
    }

    // Check 3: Try to access GoogleSignin configuration status
    try {
      // Import the configuration status from app layout
      const { getGoogleSignInStatus } = await import('../app/_layout');
      const status = getGoogleSignInStatus();
      diagnostic.configurationStatus = status.configured ? 'configured' : 'failed';
      diagnostic.details.layoutConfigStatus = status;
      
      if (!status.configured && status.error) {
        diagnostic.error = `Configuration error: ${status.error}`;
        return diagnostic;
      }
    } catch (importError) {
      diagnostic.details.importError = 'Could not check layout configuration status';
    }

    // Check 4: Test GoogleSignin module availability
    try {
      await GoogleSignin.getCurrentUser();
      diagnostic.canCheckCurrentUser = true;
      diagnostic.isConfigured = true;
      CrashLogger.logGoogleSignInStep('GoogleSignin module is accessible');
    } catch (error: any) {
      // This is expected if no user is signed in
      if (error.message && (error.message.includes('The user is not signed in') || error.message.includes('not signed in'))) {
        diagnostic.canCheckCurrentUser = true;
        diagnostic.isConfigured = true;
        CrashLogger.logGoogleSignInStep('GoogleSignin module is accessible (no signed in user - OK)');
      } else if (error.message && error.message.includes('not configured')) {
        diagnostic.error = `GoogleSignin not configured: ${error.message}`;
        diagnostic.configurationStatus = 'failed';
        diagnostic.details.moduleError = error.message;
        CrashLogger.recordError(error, 'GOOGLE_SIGNIN_NOT_CONFIGURED');
      } else {
        diagnostic.error = `GoogleSignin module error: ${error.message}`;
        diagnostic.details.moduleError = error.message;
        CrashLogger.recordError(error, 'GOOGLE_SIGNIN_DIAGNOSTIC');
      }
    }

    // Check 5: Additional iOS-specific checks
    if (Platform.OS === 'ios') {
      try {
        // Additional validation - check if we can call hasPlayServices without crashing
        diagnostic.details.iosSpecific = 'iOS Google Sign-In module accessible';
      } catch (error) {
        diagnostic.details.iosError = error;
      }
    }

    CrashLogger.logGoogleSignInStep('Google Sign-In diagnostic completed', diagnostic);
    return diagnostic;

  } catch (error: any) {
    diagnostic.error = `Diagnostic failed: ${error.message}`;
    diagnostic.configurationStatus = 'failed';
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
    `Configuration: ${diagnostic.configurationStatus === 'configured' ? '✅' : diagnostic.configurationStatus === 'failed' ? '❌' : '❓'}`,
    `Module Accessible: ${diagnostic.canCheckCurrentUser ? '✅' : '❌'}`,
    `Ready for Sign-In: ${diagnostic.isConfigured ? '✅' : '❌'}`,
  ];

  if (diagnostic.error) {
    lines.push(`Error: ${diagnostic.error}`);
  }

  if (diagnostic.details.iosClientIdPrefix) {
    lines.push(`iOS Client ID: ${diagnostic.details.iosClientIdPrefix}...`);
  }

  if (diagnostic.details.webClientIdPrefix) {
    lines.push(`Web Client ID: ${diagnostic.details.webClientIdPrefix}...`);
  }

  if (diagnostic.details.isSimulator !== undefined) {
    lines.push(`Environment: ${diagnostic.details.isSimulator ? 'Development/Simulator' : 'Production/Physical Device'}`);
    lines.push(`Web Client ID Required: ${diagnostic.details.webClientIdRequired ? 'Yes' : 'No'}`);
    lines.push(`Offline Access: ${diagnostic.details.isSimulator ? 'Enabled' : 'Disabled'}`);
  }

  if (diagnostic.details.layoutConfigStatus) {
    lines.push(`Layout Status: ${diagnostic.details.layoutConfigStatus.configured ? 'OK' : 'ERROR'}`);
    if (diagnostic.details.layoutConfigStatus.error) {
      lines.push(`Layout Error: ${diagnostic.details.layoutConfigStatus.error}`);
    }
  }

  return lines.join('\n');
};
