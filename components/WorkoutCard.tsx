import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React from 'react';
import { StyleSheet, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';
import { Workout } from './WorkoutModal';

interface WorkoutCardProps {
  workout: Workout;
  onPress: () => void;
  onEdit: () => void;
  onDelete: () => void;
  showDate?: boolean;
}

export default function WorkoutCard({ 
  workout, 
  onPress, 
  onEdit, 
  onDelete,
  showDate = false 
}: WorkoutCardProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const formatDate = (date: Date) => {
    const today = new Date();
    const tomorrow = new Date(today);
    tomorrow.setDate(today.getDate() + 1);
    const yesterday = new Date(today);
    yesterday.setDate(today.getDate() - 1);
    
    if (date.toDateString() === today.toDateString()) {
      return 'Today';
    } else if (date.toDateString() === tomorrow.toDateString()) {
      return 'Tomorrow';
    } else if (date.toDateString() === yesterday.toDateString()) {
      return 'Yesterday';
    } else {
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
      });
    }
  };
  
  const getTotalSets = () => {
    return workout.exercises.reduce((total, exercise) => {
      const sets = typeof exercise.sets === 'number' ? exercise.sets : 0;
      return total + sets;
    }, 0);
  };
  
  const isUpcoming = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const workoutDate = new Date(workout.date);
    workoutDate.setHours(0, 0, 0, 0);
    return workoutDate >= today;
  };
  
  return (
    <TouchableOpacity onPress={onPress} style={styles.container}>
      <ThemedView style={[
        styles.card,
        { borderColor: colors.text + '20' },
        isUpcoming() && { borderLeftColor: colors.tint, borderLeftWidth: 4 }
      ]}>
        <View style={styles.header}>
          <View style={styles.titleContainer}>
            <ThemedText type="subtitle" style={styles.title}>
              {workout.title}
            </ThemedText>
            {showDate && (
              <ThemedText style={[styles.date, { color: colors.text + '80' }]}>
                {formatDate(workout.date)}
              </ThemedText>
            )}
          </View>
          
          <View style={styles.actions}>
            <TouchableOpacity onPress={onEdit} style={styles.actionButton}>
              <FontAwesome5 name="edit" size={16} color={colors.text + '60'} />
            </TouchableOpacity>
            <TouchableOpacity onPress={onDelete} style={styles.actionButton}>
              <FontAwesome5 name="trash" size={16} color="#ff4444" />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.stats}>
          <View style={styles.stat}>
            <FontAwesome5 name="dumbbell" size={14} color={colors.text + '60'} />
            <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
              {workout.exercises.length} exercises
            </ThemedText>
          </View>
          
          <View style={styles.stat}>
            <FontAwesome5 name="layer-group" size={14} color={colors.text + '60'} />
            <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
              {getTotalSets()} sets
            </ThemedText>
          </View>
          
          {workout.duration && (
            <View style={styles.stat}>
              <FontAwesome5 name="clock" size={14} color={colors.text + '60'} />
              <ThemedText style={[styles.statText, { color: colors.text + '80' }]}>
                {workout.duration} min
              </ThemedText>
            </View>
          )}
        </View>
        
        {workout.exercises.length > 0 && (
          <View style={styles.exercisePreview}>
            <ThemedText style={[styles.exerciseList, { color: colors.text + '70' }]}>
              {workout.exercises.slice(0, 3).map(ex => ex.name).join(', ')}
              {workout.exercises.length > 3 && ` +${workout.exercises.length - 3} more`}
            </ThemedText>
          </View>
        )}
        
        {isUpcoming() && (
          <View style={[styles.upcomingBadge, { backgroundColor: colors.tint + '20' }]}>
            <ThemedText style={[styles.upcomingText, { color: colors.tint }]}>
              Upcoming
            </ThemedText>
          </View>
        )}
      </ThemedView>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 12,
  },
  card: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    position: 'relative',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  titleContainer: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
  },
  date: {
    fontSize: 14,
    fontWeight: '500',
  },
  actions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
  },
  stats: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 8,
  },
  stat: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  statText: {
    fontSize: 14,
  },
  exercisePreview: {
    marginTop: 8,
  },
  exerciseList: {
    fontSize: 14,
    lineHeight: 20,
  },
  upcomingBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  upcomingText: {
    fontSize: 12,
    fontWeight: '600',
  },
});
