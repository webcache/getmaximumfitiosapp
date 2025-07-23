import { User } from 'firebase/auth';

class CrashLogger {
  private static logs: string[] = [];
  private static maxLogs = 100;

  static init() {
    console.log('[CrashLogger] Enhanced logging initialized for TestFlight debugging');
    this.logAuthStep('CrashLogger initialized');
  }

  static setUserId(userId: string) {
    console.log(`[CrashLogger] User ID set: ${userId}`);
    this.logs.push(`USER_ID_SET: ${userId}`);
  }

  static setUserAttributes(user: User | null) {
    const attributes = {
      email: user?.email || 'unknown',
      displayName: user?.displayName || 'unknown',
      emailVerified: user?.emailVerified?.toString() || 'unknown',
      providersCount: user?.providerData?.length?.toString() || '0',
      providers: user?.providerData?.map(p => p.providerId)?.join(',') || 'none',
    };
    console.log(`[CrashLogger] User attributes set:`, attributes);
    this.logs.push(`USER_ATTRIBUTES: ${JSON.stringify(attributes)}`);
  }

  static logAuthStep(step: string, details?: any) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [AUTH] ${step}`;
    const fullMessage = details ? `${message} - ${JSON.stringify(details)}` : message;
    
    console.log(fullMessage);
    this.logs.push(fullMessage);
    this.pruneOldLogs();
  }

  static logFirebaseStep(step: string, details?: any) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [FIREBASE] ${step}`;
    const fullMessage = details ? `${message} - ${JSON.stringify(details)}` : message;
    
    console.log(fullMessage);
    this.logs.push(fullMessage);
    this.pruneOldLogs();
  }

  static logGoogleSignInStep(step: string, details?: any) {
    const timestamp = new Date().toISOString();
    const message = `[${timestamp}] [GOOGLE_SIGNIN] ${step}`;
    const fullMessage = details ? `${message} - ${JSON.stringify(details)}` : message;
    
    console.log(fullMessage);
    this.logs.push(fullMessage);
    this.pruneOldLogs();
  }

  static recordError(error: Error, context?: string) {
    const timestamp = new Date().toISOString();
    const contextMessage = context ? `[${context}] ` : '';
    const message = `[${timestamp}] [ERROR] ${contextMessage}${error.message}`;
    
    console.error(message, error.stack || '');
    this.logs.push(`${message} - Stack: ${error.stack || 'No stack trace'}`);
    this.pruneOldLogs();
    
    // Print recent logs for debugging
    this.printRecentLogs();
  }

  static recordNonFatalError(message: string, stack?: string) {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] [NON_FATAL] ${message}`;
    
    console.error(fullMessage, stack || '');
    this.logs.push(`${fullMessage} - Stack: ${stack || 'No stack trace'}`);
    this.pruneOldLogs();
  }

  static crash(message: string) {
    const timestamp = new Date().toISOString();
    const fullMessage = `[${timestamp}] [FORCED_CRASH] ${message}`;
    console.error(fullMessage);
    this.logs.push(fullMessage);
    this.printRecentLogs();
    
    // Force a JavaScript error for debugging
    throw new Error(`[CrashLogger] Forced crash: ${message}`);
  }

  static printRecentLogs() {
    console.log('=== RECENT CRASHLOGGER LOGS ===');
    this.logs.slice(-20).forEach(log => console.log(log));
    console.log('=== END RECENT LOGS ===');
  }

  static getAllLogs(): string[] {
    return [...this.logs];
  }

  static clearLogs() {
    this.logs = [];
    console.log('[CrashLogger] Logs cleared');
  }

  private static pruneOldLogs() {
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }
}

export default CrashLogger;
