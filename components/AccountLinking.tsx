import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { useAuth } from '@/hooks/useAuth';
import { auth } from '@/firebase';
import {
    hasProviderLinked,
    isAppleSignInAvailable,
    linkAppleAccount,
    linkGoogleAccount
} from '@/utils/socialAuth';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import * as WebBrowser from 'expo-web-browser';
import { useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Platform,
    StyleSheet,
    TouchableOpacity,
    View
} from 'react-native';

export default function AccountLinking() {
  const { userProfile } = useAuth();
  // Note: refreshUserProfile function was removed from useAuthFunctions
  const user = auth.currentUser; // Get Firebase User object directly
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [loadingApple, setLoadingApple] = useState(false);
  const [appleAvailable, setAppleAvailable] = useState(false);

  // Google Auth configuration
  const getGoogleClientId = () => {
    return Platform.select({
      ios: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
      android: process.env.EXPO_PUBLIC_GOOGLE_ANDROID_CLIENT_ID,
      default: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
    });
  };

  // Check Apple availability on mount
  useEffect(() => {
    checkAppleAvailability();
  }, []);

  const checkAppleAvailability = async () => {
    try {
      const available = await isAppleSignInAvailable();
      setAppleAvailable(available);
    } catch {
      setAppleAvailable(false);
    }
  };

  const handleGoogleLinking = async (code: string) => {
    if (!user) return;
    
    try {
      await linkGoogleAccount(user);
      // Note: User profile refresh will happen automatically via Redux
    } catch (error: any) {
      let errorMessage = 'Failed to link Google account';
      if (error.message.includes('credential-already-in-use')) {
        errorMessage = 'This Google account is already linked to another user.';
      } else if (error.message.includes('provider-already-linked')) {
        errorMessage = 'A Google account is already linked to your account.';
      }
      
      throw new Error(errorMessage);
    }
  };

  const handleGoogleLink = async () => {
    if (!user) return;
    
    try {
      setLoadingGoogle(true);
      
      // Create OAuth URL
      const clientId = getGoogleClientId();
      if (!clientId) {
        throw new Error('Google Client ID not configured');
      }
      
      const redirectUri = encodeURIComponent('https://auth.expo.io/@getmaximumfreedomandfitness/getmaximumfitiosapp');
      const state = Math.random().toString(36).substring(7);
      
      const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${clientId}&` +
        `redirect_uri=${redirectUri}&` +
        `response_type=code&` +
        `scope=${encodeURIComponent('openid profile email')}&` +
        `state=${state}&` +
        `prompt=select_account`;
      
      // Open browser
      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);
      
      if (result.type === 'success' && result.url) {
        const url = new URL(result.url);
        const code = url.searchParams.get('code');
        
        if (code) {
          await handleGoogleLinking(code);
          Alert.alert('Success', 'Google account linked successfully!');
        } else {
          throw new Error('No authorization code received');
        }
      } else if (result.type === 'cancel') {
        // User cancelled, no error needed
      } else {
        throw new Error('Authentication failed');
      }
      
      setLoadingGoogle(false);
    } catch {
      setLoadingGoogle(false);
      Alert.alert('Error', 'Failed to link Google account');
    }
  };

  const handleAppleLink = async () => {
    if (!user) return;
    
    try {
      setLoadingApple(true);
      await linkAppleAccount(user);
      setLoadingApple(false);
      // Note: User profile refresh will happen automatically via Redux
      Alert.alert('Success', 'Apple account linked successfully!');
    } catch (error: any) {
      setLoadingApple(false);
      
      if (error.message.includes('user_cancelled_authorize')) {
        return; // User cancelled, don't show error
      }
      
      let errorMessage = 'Failed to link Apple account';
      if (error.message.includes('credential-already-in-use')) {
        errorMessage = 'This Apple account is already linked to another user.';
      } else if (error.message.includes('provider-already-linked')) {
        errorMessage = 'An Apple account is already linked to your account.';
      }
      
      Alert.alert('Error', errorMessage);
    }
  };

  if (!user || !userProfile) {
    return null;
  }

  const isGoogleLinked = hasProviderLinked(user, 'google.com') || userProfile.googleLinked;
  const isAppleLinked = hasProviderLinked(user, 'apple.com') || userProfile.appleLinked;

  return (
    <ThemedView style={styles.container}>
      <ThemedText style={styles.title}>Linked Accounts</ThemedText>
      <ThemedText style={styles.subtitle}>
        Link your social accounts for easier sign-in
      </ThemedText>

      {/* Google Account */}
      <View style={styles.accountRow}>
        <View style={styles.accountInfo}>
          <FontAwesome5 name="google" size={24} color="#4285F4" />
          <View style={styles.accountText}>
            <ThemedText style={styles.accountName}>Google</ThemedText>
            <ThemedText style={styles.accountStatus}>
              {isGoogleLinked ? 'Connected' : 'Not connected'}
            </ThemedText>
          </View>
        </View>

        {isGoogleLinked ? (
          <View style={styles.connectedBadge}>
            <FontAwesome5 name="check-circle" size={20} color="#34C759" />
          </View>
        ) : (
          <TouchableOpacity
            style={styles.linkButton}
            onPress={handleGoogleLink}
            disabled={loadingGoogle}
          >
            {loadingGoogle ? (
              <ActivityIndicator size="small" color="#4285F4" />
            ) : (
              <ThemedText style={styles.linkButtonText}>Link</ThemedText>
            )}
          </TouchableOpacity>
        )}
      </View>

      {/* Apple Account (iOS only) */}
      {appleAvailable && (
        <View style={styles.accountRow}>
          <View style={styles.accountInfo}>
            <FontAwesome5 name="apple" size={24} color="#000000" />
            <View style={styles.accountText}>
              <ThemedText style={styles.accountName}>Apple</ThemedText>
              <ThemedText style={styles.accountStatus}>
                {isAppleLinked ? 'Connected' : 'Not connected'}
              </ThemedText>
            </View>
          </View>

          {isAppleLinked ? (
            <View style={styles.connectedBadge}>
              <FontAwesome5 name="check-circle" size={20} color="#34C759" />
            </View>
          ) : (
            <TouchableOpacity
              style={styles.linkButton}
              onPress={handleAppleLink}
              disabled={loadingApple}
            >
              {loadingApple ? (
                <ActivityIndicator size="small" color="#000000" />
              ) : (
                <ThemedText style={styles.linkButtonText}>Link</ThemedText>
              )}
            </TouchableOpacity>
          )}
        </View>
      )}
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: '#fff',
    borderRadius: 12,
    marginVertical: 10,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
  },
  accountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountText: {
    marginLeft: 12,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '500',
  },
  accountStatus: {
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  linkButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e9ecef',
    minWidth: 60,
    alignItems: 'center',
  },
  linkButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#007AFF',
  },
  connectedBadge: {
    paddingHorizontal: 8,
  },
});
