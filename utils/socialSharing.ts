import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export interface ShareContent {
  type: 'achievement' | 'workout' | 'progress' | 'personal_record';
  title: string;
  message: string;
  imageUri?: string;
  data?: any; // Additional data like workout stats, PR numbers, etc.
}

export interface ShareOptions {
  // For future platform-specific branches if needed; currently unused because we use native sheet
  platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
  includeAppUrl?: boolean;
}

// Helper: write a temp text file to share when no image is available
async function writeTempTextFile(text: string): Promise<string> {
  const path = `${FileSystem.cacheDirectory}share-${Date.now()}.txt`;
  await FileSystem.writeAsStringAsync(path, text, { encoding: FileSystem.EncodingType.UTF8 });
  return path;
}

/**
 * Share fitness content via the native share sheet using expo-sharing.
 * If an image URI is provided, that file will be shared.
 * Otherwise, a temporary text file containing the message will be created and shared.
 */
export const shareToSocialMedia = async (
  content: ShareContent,
  options: ShareOptions = {}
): Promise<boolean> => {
  try {
    const { includeAppUrl = true } = options;

    if (!(await Sharing.isAvailableAsync())) {
      console.warn('Sharing is not available on this device');
      return false;
    }

    // Prefer sharing an image if provided
    let fileUriToShare: string | undefined = content.imageUri;

    if (!fileUriToShare) {
      // Build the text content and write as a temporary file
      const textParts = [content.title, '', content.message];
      if (includeAppUrl) textParts.push('', 'https://getmaximumfit.app');
      const combined = textParts.join('\n');
      fileUriToShare = await writeTempTextFile(combined);
    }

    await Sharing.shareAsync(fileUriToShare, {
      dialogTitle: content.title || 'Share',
    });

    return true;
  } catch (error) {
    console.error('Error sharing content:', error);
    return false;
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
