
// DEPRECATED: This service is no longer used for token persistence.
// All token persistence is now handled by SecureTokenService and TokenAuthService.
// This service is kept for backward compatibility but should not be used for new features.

interface FirestoreTokenData {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
  deviceId: string;
  createdAt: any; // Firestore timestamp
  updatedAt: any; // Firestore timestamp
}

interface TokenData {
  idToken: string;
  accessToken: string;
  refreshToken: string;
  tokenExpiry: number;
  lastRefresh: number;
}

class FirestoreTokenService {
  private static instance: FirestoreTokenService;
  private deviceId: string | null = null;

  static getInstance(): FirestoreTokenService {
    if (!FirestoreTokenService.instance) {
      FirestoreTokenService.instance = new FirestoreTokenService();
    }
    return FirestoreTokenService.instance;
  }

  /**
   * DEPRECATED: Generate a unique device ID for token management
   */
  private async getDeviceId(): Promise<string> {
    console.warn('⚠️ FirestoreTokenService.getDeviceId() called - This service is deprecated');
    
    if (this.deviceId) {
      return this.deviceId;
    }

    // Generate a unique device ID
    this.deviceId = `device_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    return this.deviceId;
  }

  /**
   * DEPRECATED: Save tokens to Firestore
   */
  async saveTokensToFirestore(userId: string, tokenData: TokenData): Promise<void> {
    console.warn('⚠️ FirestoreTokenService.saveTokensToFirestore() called - This service is deprecated and does nothing');
    return Promise.resolve();
  }

  /**
   * DEPRECATED: Load tokens from Firestore
   */
  async loadTokensFromFirestore(userId: string): Promise<TokenData | null> {
    console.warn('⚠️ FirestoreTokenService.loadTokensFromFirestore() called - This service is deprecated');
    return null;
  }

  /**
   * DEPRECATED: Clear tokens from Firestore
   */
  async clearTokensFromFirestore(userId: string): Promise<void> {
    console.warn('⚠️ FirestoreTokenService.clearTokensFromFirestore() called - This service is deprecated and does nothing');
    return Promise.resolve();
  }

  /**
   * DEPRECATED: Check if user has valid tokens
   */
  async hasValidTokens(userId?: string): Promise<boolean> {
    console.warn('⚠️ FirestoreTokenService.hasValidTokens() called - This service is deprecated');
    return false;
  }

  /**
   * DEPRECATED: Refresh tokens in Firestore
   */
  async refreshTokensInFirestore(userId: string): Promise<TokenData | null> {
    console.warn('⚠️ FirestoreTokenService.refreshTokensInFirestore() called - This service is deprecated');
    return null;
  }

  /**
   * DEPRECATED: Clean up expired tokens
   */
  async cleanupExpiredTokens(): Promise<void> {
    console.warn('⚠️ FirestoreTokenService.cleanupExpiredTokens() called - This service is deprecated and does nothing');
    return Promise.resolve();
  }

  /**
   * DEPRECATED: Get all user devices
   */
  async getUserDevices(userId: string): Promise<string[]> {
    console.warn('⚠️ FirestoreTokenService.getUserDevices() called - This service is deprecated');
    return [];
  }

  /**
   * DEPRECATED: Remove device tokens
   */
  async removeDeviceTokens(userId: string, deviceId: string): Promise<void> {
    console.warn('⚠️ FirestoreTokenService.removeDeviceTokens() called - This service is deprecated and does nothing');
    return Promise.resolve();
  }
}

// Export singleton instance
export const firestoreTokenService = FirestoreTokenService.getInstance();
