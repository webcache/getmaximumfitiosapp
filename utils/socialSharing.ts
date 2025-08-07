import Share, { Social } from 'react-native-share';

export interface ShareContent {
  type: 'achievement' | 'workout' | 'progress' | 'personal_record';
  title: string;
  message: string;
  imageUri?: string;
  data?: any; // Additional data like workout stats, PR numbers, etc.
}

export interface ShareOptions {
  platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
  includeAppUrl?: boolean;
}

/**
 * Share fitness content to social media platforms
 */
export const shareToSocialMedia = async (
  content: ShareContent, 
  options: ShareOptions = {}
): Promise<boolean> => {
  try {
    const { platform = 'generic', includeAppUrl = true } = options;
    
    // Build share options
    let shareOptions: any = {
      title: content.title,
      message: content.message,
    };

    // Add app URL if requested
    if (includeAppUrl) {
      shareOptions.url = 'https://getmaximumfit.app';
    }

    // Add image if provided
    if (content.imageUri) {
      shareOptions.url = content.imageUri;
      shareOptions.type = 'image/jpeg';
    }

    // Handle platform-specific sharing
    if (platform !== 'generic') {
      let socialPlatform: Social;
      
      switch (platform) {
        case 'instagram':
          socialPlatform = Social.Instagram;
          break;
        case 'facebook':
          socialPlatform = Social.Facebook;
          break;
        case 'twitter':
          socialPlatform = Social.Twitter;
          break;
        case 'whatsapp':
          socialPlatform = Social.Whatsapp;
          break;
        default:
          // Fallback to generic sharing
          await Share.open(shareOptions);
          return true;
      }

      shareOptions.social = socialPlatform;
      
      try {
        const result = await Share.shareSingle(shareOptions);
        console.log(`Share result for ${platform}:`, result);
        return true;
      } catch (shareError: any) {
        console.log(`Platform-specific share failed, trying generic share:`, shareError);
        // If platform-specific sharing fails, fall back to generic share
        delete shareOptions.social;
        await Share.open(shareOptions);
        return true;
      }
    } else {
      // Use generic sharing (will show system share sheet)
      const result = await Share.open(shareOptions);
      console.log('Share result:', result);
      return true;
    }
  } catch (error: any) {
    if (error.message !== 'User did not share' && error.message !== 'User cancelled') {
      console.error('Error sharing content:', error);
      return false;
    }
    return false; // User cancelled
  }
};

/**
 * Generate share content for different types of achievements
 */
export const generateShareContent = (
  type: ShareContent['type'],
  data: any = {}
): ShareContent => {
  const baseHashtags = '#MaximumFit #Fitness #Workout #FitnessJourney';
  
  switch (type) {
    case 'personal_record':
      return {
        type: 'personal_record',
        title: 'New Personal Record! 🏆',
        message: `🔥 NEW PR! Just hit ${data.exercise || 'a new'} personal record: ${data.weight ? `${data.weight} lbs` : data.reps ? `${data.reps} reps` : 'amazing numbers'}!\n\n💪 Feeling stronger than ever. Consistency pays off!\n\n${baseHashtags} #PersonalRecord #NewPR`,
        data,
      };
    
    case 'workout':
      return {
        type: 'workout',
        title: 'Workout Complete! 💪',
        message: `💪 Just crushed an amazing ${data.duration || '45-minute'} workout session!\n\n🔥 ${data.exercises || 'Multiple exercises'} completed with ${data.sets || 'great'} sets. Feeling stronger and more energized than ever!\n\n${baseHashtags} #WorkoutComplete`,
        data,
      };
    
    case 'progress':
      return {
        type: 'progress',
        title: 'Progress Update! 📈',
        message: `📈 ${data.timeframe || 'Weekly'} Progress Update!\n\n🎯 Staying consistent with my fitness routine and seeing amazing results. ${data.achievement || 'The journey continues!'}\n\n${baseHashtags} #ProgressUpdate #Consistency`,
        data,
      };
    
    case 'achievement':
    default:
      return {
        type: 'achievement',
        title: 'Achievement Unlocked! 🏆',
        message: `🏆 Achievement Unlocked!\n\n🚀 Just reached another milestone in my fitness journey! ${data.description || 'Thanks to Maximum Fit for keeping me motivated and on track.'}\n\n${baseHashtags} #Achievement #Milestone`,
        data,
      };
  }
};

/**
 * Quick share functions for common scenarios
 */
export const sharePersonalRecord = async (
  exercise: string,
  weight?: number,
  reps?: number,
  platform?: ShareOptions['platform']
) => {
  const content = generateShareContent('personal_record', { exercise, weight, reps });
  return shareToSocialMedia(content, { platform });
};

export const shareWorkoutComplete = async (
  duration?: string,
  exercises?: string,
  sets?: string,
  platform?: ShareOptions['platform']
) => {
  const content = generateShareContent('workout', { duration, exercises, sets });
  return shareToSocialMedia(content, { platform });
};

export const shareAchievement = async (
  description: string,
  platform?: ShareOptions['platform']
) => {
  const content = generateShareContent('achievement', { description });
  return shareToSocialMedia(content, { platform });
};
