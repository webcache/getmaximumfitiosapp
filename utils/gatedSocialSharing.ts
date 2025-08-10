import { FeatureKey } from '../config/features';
import { ShareContent, ShareOptions, shareToSocialMedia } from './socialSharing';

/**
 * Enhanced social sharing with feature gating
 */
export interface GatedShareOptions extends ShareOptions {
  // Feature gating options
  requiredFeature?: FeatureKey;
  onUpgradeRequired?: () => void;
  fallbackToBasic?: boolean;
}

/**
 * Feature-gated social sharing function
 * Checks subscription status before allowing advanced sharing features
 */
export const shareWithFeatureGating = async (
  content: ShareContent,
  options: GatedShareOptions,
  hasFeature: (feature: FeatureKey) => boolean
): Promise<boolean> => {
  // Define which platforms/features require which subscription level
  const featureRequirements: Record<string, FeatureKey> = {
    instagram_story: 'advancedSocialSharing',
    facebook_story: 'advancedSocialSharing',
    twitter: 'basicSocialSharing', // Twitter is available to all
    whatsapp: 'basicSocialSharing', // WhatsApp is available to all
    instagram_post: 'advancedSocialSharing',
    facebook_post: 'advancedSocialSharing',
    achievement_sharing: 'achievementSharing',
    progress_sharing: 'advancedSocialSharing',
    personal_record: 'achievementSharing',
  };

  // Check if this specific content type requires premium features
  const contentTypeFeature = featureRequirements[content.type] || 'basicSocialSharing';
  
  // Check if the platform requires premium features
  const platformFeature = options.platform ? 
    featureRequirements[`${options.platform}_${options.shareToStory ? 'story' : 'post'}`] || 'basicSocialSharing' :
    'basicSocialSharing';

  // Use the most restrictive requirement
  const requiredFeature = options.requiredFeature || 
    (contentTypeFeature === 'basicSocialSharing' ? platformFeature : contentTypeFeature);

  // Check if user has the required feature
  if (!hasFeature(requiredFeature)) {
    console.log(`🚫 Feature gating: ${requiredFeature} required for this sharing option`);
    
    // Handle upgrade required
    if (options.onUpgradeRequired) {
      options.onUpgradeRequired();
      return false;
    }

    // Fallback to basic sharing if allowed
    if (options.fallbackToBasic && hasFeature('basicSocialSharing')) {
      console.log('📱 Falling back to basic sharing');
      
      // Remove premium features from options
      const basicOptions: ShareOptions = {
        ...options,
        shareToStory: false, // Remove story sharing
        withScreenshot: false, // Remove screenshot sharing
        platform: ['twitter', 'whatsapp'].includes(options.platform || '') ? options.platform : 'generic',
      };

      // Simplify content for basic sharing
      const basicContent: ShareContent = {
        ...content,
        type: 'workout', // Simplify to basic workout sharing
      };

      return shareToSocialMedia(basicContent, basicOptions);
    }

    return false;
  }

  // User has required features, proceed with full sharing
  console.log(`✅ Feature gating: User has ${requiredFeature}, proceeding with full sharing`);
  return shareToSocialMedia(content, options);
};

/**
 * Helper function to get the appropriate sharing message based on tier
 */
export const getSharingMessage = (
  content: ShareContent,
  currentTier: 'freemium' | 'pro'
): string => {
  const baseMessage = content.message;
  
  if (currentTier === 'pro') {
    // Pro users get enhanced messages
    switch (content.type) {
      case 'achievement':
        return `${baseMessage}\n\n🏆 Achieved with GetMaximumFit Pro`;
      case 'personal_record':
        return `${baseMessage}\n\n💪 New PR tracked with advanced analytics!`;
      case 'progress':
        return `${baseMessage}\n\n📊 Progress tracked with detailed insights`;
      default:
        return `${baseMessage}\n\n💪 Powered by GetMaximumFit Pro`;
    }
  } else {
    // Free users get basic messages
    return `${baseMessage}\n\n💪 Get fit with GetMaximumFit - Download now!`;
  }
};

/**
 * Helper function to determine available sharing platforms based on tier
 */
export const getAvailablePlatforms = (
  hasFeature: (feature: FeatureKey) => boolean
): string[] => {
  const basicPlatforms = ['twitter', 'whatsapp', 'generic'];
  const premiumPlatforms = ['instagram', 'facebook'];

  const available = [...basicPlatforms];
  
  if (hasFeature('advancedSocialSharing')) {
    available.push(...premiumPlatforms);
  }

  return available;
};

/**
 * Helper function to determine available content types based on tier
 */
export const getAvailableContentTypes = (
  hasFeature: (feature: FeatureKey) => boolean
): ShareContent['type'][] => {
  const basicTypes: ShareContent['type'][] = ['workout'];
  const premiumTypes: ShareContent['type'][] = ['achievement', 'progress', 'personal_record'];

  const available = [...basicTypes];
  
  if (hasFeature('achievementSharing')) {
    available.push('achievement', 'personal_record');
  }
  
  if (hasFeature('advancedSocialSharing')) {
    available.push('progress');
  }

  return available;
};
