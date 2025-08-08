import { Canvas, Circle, LinearGradient, matchFont, Rect, Text, vec } from '@shopify/react-native-skia';
import React, { forwardRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { captureRef } from 'react-native-view-shot';

export interface AchievementCardProps {
  username: string;
  achievementType: 'workout_complete' | 'personal_record' | 'achievement' | 'progress';
  achievementData: {
    title: string;
    description: string;
    // For workout completion
    workoutName?: string;
    duration?: string;
    exercises?: number;
    // For personal records
    exercise?: string;
    weight?: number;
    reps?: number;
    previousRecord?: number;
    // For general achievements
    milestone?: string;
    // Optional custom message
    customMessage?: string;
  };
  themeColor: string;
}

const AchievementCard = forwardRef<any, AchievementCardProps>(({ 
  username, 
  achievementType, 
  achievementData, 
  themeColor 
}, ref) => {
  // Card dimensions
  const cardWidth = 400;
  const cardHeight = 500;

  // Create font objects for different sizes
  const brandingFont = matchFont({ fontFamily: 'Arial', fontSize: 18, fontWeight: 'bold' });
  const usernameFont = matchFont({ fontFamily: 'Arial', fontSize: 16 });
  const titleFont = matchFont({ fontFamily: 'Arial', fontSize: 28, fontWeight: 'bold' });
  const subtextFont = matchFont({ fontFamily: 'Arial', fontSize: 20 });
  const messageFont = matchFont({ fontFamily: 'Arial', fontSize: 16, fontStyle: 'italic' });
  const hashtagFont = matchFont({ fontFamily: 'Arial', fontSize: 12 });

  const getMainText = () => {
    switch (achievementType) {
      case 'personal_record':
        return `New Personal Record!`;
      case 'workout_complete':
        return `Workout Complete!`;
      case 'achievement':
        return `Achievement Unlocked!`;
      case 'progress':
        return `Progress Milestone!`;
      default:
        return achievementData.title;
    }
  };
  
  const getSubText = () => {
    switch (achievementType) {
      case 'personal_record':
        if (achievementData.exercise && achievementData.weight) {
          return `${achievementData.exercise}\n${achievementData.weight}lbs x ${achievementData.reps || 1} reps`;
        }
        break;
      case 'workout_complete':
        if (achievementData.workoutName) {
          return `${achievementData.workoutName}\n${achievementData.duration || ''} • ${achievementData.exercises || 0} exercises`;
        }
        break;
      case 'achievement':
        return achievementData.milestone || achievementData.description;
      case 'progress':
        return achievementData.description;
    }
    return achievementData.description;
  };

  return (
    <View ref={ref} collapsable={false} style={styles.container}>
      <Canvas style={{ width: cardWidth, height: cardHeight }}>
        {/* Background gradient */}
        <Rect x={0} y={0} width={cardWidth} height={cardHeight}>
          <LinearGradient
            start={vec(0, 0)}
            end={vec(cardWidth, cardHeight)}
            colors={['#1a1a1a', '#2d2d2d', '#1a1a1a']}
          />
        </Rect>
        
        {/* Accent border */}
        <Rect 
          x={10} 
          y={10} 
          width={cardWidth - 20} 
          height={cardHeight - 20}
          style="stroke"
          strokeWidth={3}
          color={themeColor}
        />
        
        {/* Decorative circles */}
        <Circle cx={cardWidth - 60} cy={60} r={30} color={themeColor} opacity={0.2} />
        <Circle cx={60} cy={cardHeight - 60} r={25} color={themeColor} opacity={0.15} />
        
        {/* App branding */}
        <Text x={30} y={60} text="MAXIMUM FIT" color={themeColor} font={brandingFont} />
        
        {/* Username */}
        <Text x={30} y={120} text={`${username} just achieved:`} color="white" font={usernameFont} />
        
        {/* Main achievement text */}
        <Text x={30} y={180} text={getMainText()} color={themeColor} font={titleFont} />
        
        {/* Sub text with details */}
        <Text x={30} y={250} text={getSubText()} color="white" font={subtextFont} />
        
        {/* Custom message if provided */}
        {achievementData.customMessage && (
          <Text x={30} y={350} text={`"${achievementData.customMessage}"`} color="#cccccc" font={messageFont} />
        )}
        
        {/* Bottom branding */}
        <Text x={30} y={cardHeight - 40} text="#MaximumFit #FitnessGoals #PersonalRecord" color={themeColor} font={hashtagFont} opacity={0.8} />
      </Canvas>
    </View>
  );
});

export default AchievementCard;

// Utility to save card as image
export async function captureAchievementCard(ref: any): Promise<string | null> {
  try {
    const uri = await captureRef(ref, {
      format: 'png',
      quality: 1,
      result: 'tmpfile',
    });
    return uri;
  } catch (e) {
    console.warn('Capture failed:', e);
    return null;
  }
}

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
