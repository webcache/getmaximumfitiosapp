# Achievement Sharing Integration Guide

Your achievement sharing system is now complete and ready to integrate into your existing workout screens. This guide shows how to easily add achievement sharing to any screen in your app.

## 🚀 Quick Start

### 1. Basic Workout Completion Sharing

Add this to any workout completion screen:

```typescript
import { useAchievementShare } from '../hooks/useAchievementShare';
import AchievementShareModal from '../components/AchievementShareModal';

export const WorkoutCompletionScreen = () => {
  const achievementShare = useAchievementShare();

  const handleWorkoutComplete = (workoutData) => {
    // Trigger the achievement sharing modal
    achievementShare.showWorkoutComplete({
      workoutName: workoutData.name,
      duration: `${workoutData.duration} min`,
      exercises: workoutData.exerciseCount,
    });
  };

  return (
    <View>
      {/* Your existing workout UI */}
      
      {/* Add the modal */}
      {achievementShare.isVisible && achievementShare.achievementData && (
        <AchievementShareModal
          visible={achievementShare.isVisible}
          onClose={achievementShare.hideAchievementShare}
          achievementType={achievementShare.achievementType!}
          achievementData={achievementShare.achievementData}
        />
      )}
    </View>
  );
};
```

### 2. Personal Record Detection & Sharing

```typescript
const handlePersonalRecord = (exercise: string, weight: number, reps: number) => {
  // This would typically be called when you detect a PR
  achievementShare.triggerPersonalRecord(exercise, weight, reps);
};
```

### 3. Milestone Achievements

```typescript
const handleMilestone = () => {
  // Celebrate reaching 100 workouts, etc.
  achievementShare.triggerMilestone(
    '100 Workouts Completed!', 
    'You\'ve reached an incredible milestone! 🎉'
  );
};
```

## 📱 Platform-Specific Sharing

### Text-Based Sharing (Twitter, Facebook, WhatsApp)
```typescript
import { shareToSocialMedia } from '../utils/socialSharing';

const shareWorkout = async () => {
  const success = await shareToSocialMedia({
    type: 'workout',
    title: 'Workout Complete!',
    message: 'Just crushed my workout! 💪 #MaximumFit'
  }, { 
    platform: 'twitter' // or 'facebook', 'whatsapp'
  });
};
```

### Visual Sharing (Instagram, Screenshots)
```typescript
import ShareableAchievementCard from '../components/ShareableAchievementCard';

const VisualSharingExample = ({ workoutData }) => (
  <ShareableAchievementCard
    achievement={{
      title: "Personal Record!",
      description: "New bench press PR",
      icon: "trophy",
      color: "#FFD700",
      stats: {
        exercise: "Bench Press",
        weight: 225,
        reps: 8
      }
    }}
    onShare={(imageUri) => {
      // Handle the screenshot sharing
      console.log('Screenshot captured:', imageUri);
    }}
  />
);
```

## 🎯 Integration Points

### In ActiveWorkoutScreen.tsx
```typescript
// After workout completion
const completeWorkout = async () => {
  // ... your existing workout completion logic
  
  // Check for personal records
  const personalRecords = detectPersonalRecords(workoutData);
  
  if (personalRecords.length > 0) {
    // Show PR achievement
    achievementShare.triggerPersonalRecord(
      personalRecords[0].exercise,
      personalRecords[0].weight,
      personalRecords[0].reps
    );
  } else {
    // Show general workout completion
    achievementShare.showWorkoutComplete({
      workoutName: workoutData.name,
      duration: `${workoutData.duration} min`,
      exercises: workoutData.exercises.length,
    });
  }
};
```

### In WorkoutCard.tsx
```typescript
// Quick share button on workout cards
const quickShare = async () => {
  await shareToSocialMedia({
    type: 'workout',
    title: 'Check out my workout!',
    message: `Just completed ${workout.name}! 💪 #MaximumFit`
  }, { platform: 'generic' }); // Shows system share sheet
};
```

## ⚙️ Configuration

### Enable/Disable Platforms
Users can control which platforms they want to share to. You can store these preferences and pass them to the sharing functions:

```typescript
const userPreferences = {
  enableTwitter: true,
  enableInstagram: true,
  enableFacebook: false,
  enableWhatsApp: true,
};

// Use preferences in sharing logic
if (userPreferences.enableTwitter) {
  // Show Twitter option
}
```

### Custom Achievement Types
You can create custom achievement types for your specific fitness app needs:

```typescript
// Custom achievement for streak milestones
achievementShare.showAchievement({
  title: '🔥 7-Day Streak!',
  description: 'You\'ve worked out 7 days in a row!',
  milestone: '7-day streak',
});

// Custom achievement for weight loss goals
achievementShare.showProgress({
  title: '🎯 Weight Goal Progress',
  description: 'You\'re 75% of the way to your goal!',
  milestone: '75% to weight goal',
});
```

## 🔧 Troubleshooting

### Common Issues

1. **Screenshots not working on iOS**
   - Make sure you have the proper permissions for photos
   - Check that react-native-view-shot is properly installed

2. **Social sharing fails**
   - The app gracefully falls back to generic sharing
   - User will see the system share sheet if platform-specific sharing fails

3. **Modal not appearing**
   - Ensure you're calling the trigger functions after state updates
   - Check that the modal component is rendered in your component tree

### Required Packages
All required packages are already installed:
- `react-native-share` - For platform-specific sharing
- `react-native-view-shot` - For screenshot capture
- `expo-media-library` - For saving screenshots to gallery

## 📊 Analytics Integration

You can easily add analytics to track sharing behavior:

```typescript
const trackShare = (platform: string, achievementType: string) => {
  // Your analytics implementation
  Analytics.track('achievement_shared', {
    platform,
    achievement_type: achievementType,
    timestamp: new Date().toISOString(),
  });
};

// Use in sharing functions
const handleShare = async (platform) => {
  const success = await shareToSocialMedia(content, { platform });
  if (success) {
    trackShare(platform, 'workout_complete');
  }
};
```

## 🎨 Customization

### Styling Achievement Cards
The `ShareableAchievementCard` component is fully customizable. You can modify the styling in the component file or create variants for different achievement types.

### Custom Share Messages
Create templates for different achievement types:

```typescript
const generateShareMessage = (type: string, data: any) => {
  switch (type) {
    case 'personal_record':
      return `🏆 New PR Alert! Just hit ${data.weight}lbs on ${data.exercise}! #MaximumFit #PersonalRecord`;
    case 'workout_complete':
      return `💪 Workout complete! ${data.duration} of pure dedication! #MaximumFit #WorkoutComplete`;
    case 'milestone':
      return `🎯 Milestone achieved: ${data.milestone}! The grind continues! #MaximumFit #Milestone`;
    default:
      return `Another step closer to maximum fitness! 💪 #MaximumFit`;
  }
};
```

## 🚀 Ready to Use

Your achievement sharing system is production-ready! The components handle:
- ✅ Error handling and graceful fallbacks
- ✅ User cancellation scenarios  
- ✅ Platform-specific sharing optimization
- ✅ Beautiful visual achievement cards
- ✅ Screenshot capture and sharing
- ✅ Multiple achievement types
- ✅ Customizable messaging

Simply import the components and hooks into your existing screens and start celebrating your users' achievements! 🎉
