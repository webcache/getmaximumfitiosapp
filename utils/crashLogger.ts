import crashlytics from '@react-native-firebase/crashlytics';
import { User } from 'firebase/auth';

class CrashLogger {
  static init() {
    // Enable crash collection in production builds
    if (!__DEV__) {
      crashlytics().setCrashlyticsCollectionEnabled(true);
      console.log('Crashlytics enabled for production');
    } else {
      console.log('Crashlytics disabled in development');
    }
  }

  static setUserId(userId: string) {
    if (!__DEV__) {
      crashlytics().setUserId(userId);
    }
    console.log(`[CrashLogger] User ID set: ${userId}`);
  }

  static setUserAttributes(user: User | null) {
    if (!__DEV__ && user) {
      crashlytics().setAttributes({
        email: user.email || 'unknown',
        displayName: user.displayName || 'unknown',
        emailVerified: user.emailVerified.toString(),
        providersCount: user.providerData.length.toString(),
        providers: user.providerData.map(p => p.providerId).join(','),
      });
    }
    console.log(`[CrashLogger] User attributes set for: ${user?.email || 'no user'}`);
  }

  static logAuthStep(step: string, details?: any) {
    const message = `[AUTH] ${step}`;
    if (!__DEV__) {
      crashlytics().log(message);
      if (details) {
        crashlytics().log(`[AUTH] Details: ${JSON.stringify(details)}`);
      }
    }
    console.log(message, details || '');
  }

  static logFirebaseStep(step: string, details?: any) {
    const message = `[FIREBASE] ${step}`;
    if (!__DEV__) {
      crashlytics().log(message);
      if (details) {
        crashlytics().log(`[FIREBASE] Details: ${JSON.stringify(details)}`);
      }
    }
    console.log(message, details || '');
  }

  static logGoogleSignInStep(step: string, details?: any) {
    const message = `[GOOGLE_SIGNIN] ${step}`;
    if (!__DEV__) {
      crashlytics().log(message);
      if (details) {
        crashlytics().log(`[GOOGLE_SIGNIN] Details: ${JSON.stringify(details)}`);
      }
    }
    console.log(message, details || '');
  }

  static recordError(error: Error, context?: string) {
    const contextMessage = context ? `[${context}] ` : '';
    const message = `${contextMessage}${error.message}`;
    
    if (!__DEV__) {
      crashlytics().recordError(error);
      crashlytics().log(message);
    }
    console.error(`[CrashLogger] ${message}`, error);
  }

  static recordNonFatalError(message: string, stack?: string) {
    const error = new Error(message);
    if (stack) {
      error.stack = stack;
    }
    
    if (!__DEV__) {
      crashlytics().recordError(error);
      crashlytics().log(`[NON_FATAL] ${message}`);
    }
    console.error(`[CrashLogger] Non-fatal: ${message}`, stack || '');
  }

  static crash(message: string) {
    console.error(`[CrashLogger] Forcing crash: ${message}`);
    if (!__DEV__) {
      crashlytics().log(`[FORCED_CRASH] ${message}`);
      crashlytics().crash();
    }
  }
}

export default CrashLogger;
