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
  platform?: 'instagram' | 'facebook' | 'twitter' | 'whatsapp' | 'generic';
  includeAppUrl?: boolean;
}

/**
 * Write temporary text file for sharing
 */
const writeTempTextFile = async (content: string): Promise<string> => {
  const tempDir = FileSystem.cacheDirectory + 'temp_shares/';
  await FileSystem.makeDirectoryAsync(tempDir, { intermediates: true });
  
  const fileName = `share_${Date.now()}.txt`;
  const filePath = tempDir + fileName;
  
  await FileSystem.writeAsStringAsync(filePath, content, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  
  return filePath;
};

/**
 * Share fitness content to social media platforms
 */
export const shareToSocialMedia = async (
  content: ShareContent, 
  options: ShareOptions = {}
): Promise<boolean> => {
  try {
    const { includeAppUrl = true } = options;
    
    // Build share message
    let shareMessage = content.message;
    
    // Add app URL if requested
    if (includeAppUrl) {
      shareMessage += '\n\nGet Maximum Fit: https://getmaximumfit.app';
    }

    if (content.imageUri) {
      // Share image with caption
      await Sharing.shareAsync(content.imageUri, {
        mimeType: 'image/jpeg',
        dialogTitle: content.title,
      });
    } else {
      // Share text content
      const tempFilePath = await writeTempTextFile(shareMessage);
      await Sharing.shareAsync(tempFilePath, {
        mimeType: 'text/plain',
        dialogTitle: content.title,
      });
      
      // Clean up temp file
      try {
        await FileSystem.deleteAsync(tempFilePath);
      } catch (cleanupError) {
        console.log('Failed to clean up temp file:', cleanupError);
      }
    }
    
    return true;
  } catch (error: any) {
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
