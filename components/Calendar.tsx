import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ThemedText } from './ThemedText';
import { ThemedView } from './ThemedView';

interface CalendarProps {
  selectedDate: Date;
  onDateSelect: (date: Date) => void;
  workoutDates: Date[];
}

export default function Calendar({ selectedDate, onDateSelect, workoutDates }: CalendarProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  
  const [currentMonth, setCurrentMonth] = useState(new Date());
  
  const today = new Date();
  const year = currentMonth.getFullYear();
  const month = currentMonth.getMonth();
  
  // Get first day of month and number of days
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const daysInMonth = lastDay.getDate();
  const startDayOfWeek = firstDay.getDay();
  
  // Month names
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  // Day names
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  
  const navigateMonth = (direction: 'prev' | 'next') => {
    const newMonth = new Date(currentMonth);
    if (direction === 'prev') {
      newMonth.setMonth(month - 1);
    } else {
      newMonth.setMonth(month + 1);
    }
    setCurrentMonth(newMonth);
  };
  
  const isDateSelected = (date: Date) => {
    return selectedDate.toDateString() === date.toDateString();
  };
  
  const isToday = (date: Date) => {
    return today.toDateString() === date.toDateString();
  };
  
  const hasWorkout = (date: Date) => {
    return workoutDates.some(workoutDate => 
      workoutDate.toDateString() === date.toDateString()
    );
  };
  
  const renderCalendarDays = () => {
    const days = [];
    
    // Add empty cells for days before the first day of the month
    for (let i = 0; i < startDayOfWeek; i++) {
      days.push(<View key={`empty-${i}`} style={styles.dayCell} />);
    }
    
    // Add days of the month
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      const isSelected = isDateSelected(date);
      const isTodayDate = isToday(date);
      const hasWorkoutData = hasWorkout(date);
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            isSelected && { backgroundColor: colors.tint },
            isTodayDate && !isSelected && { backgroundColor: colors.tint + '30' },
          ]}
          onPress={() => onDateSelect(date)}
        >
          <Text
            style={[
              styles.dayText,
              { color: colors.text },
              isSelected && { color: '#fff', fontWeight: 'bold' },
              isTodayDate && !isSelected && { color: colors.tint, fontWeight: 'bold' },
            ]}
          >
            {day}
          </Text>
          {hasWorkoutData && (
            <View
              style={[
                styles.workoutIndicator,
                { backgroundColor: isSelected ? '#fff' : colors.tint },
              ]}
            />
          )}
        </TouchableOpacity>
      );
    }
    
    return days;
  };
  
  return (
    <ThemedView style={styles.container}>
      {/* Header with month navigation */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigateMonth('prev')} style={styles.navButton}>
          <ThemedText style={styles.navText}>‹</ThemedText>
        </TouchableOpacity>
        
        <ThemedText type="subtitle" style={styles.monthTitle}>
          {monthNames[month]} {year}
        </ThemedText>
        
        <TouchableOpacity onPress={() => navigateMonth('next')} style={styles.navButton}>
          <ThemedText style={styles.navText}>›</ThemedText>
        </TouchableOpacity>
      </View>
      
      {/* Day names row */}
      <View style={styles.dayNamesRow}>
        {dayNames.map((dayName) => (
          <View key={dayName} style={styles.dayNameCell}>
            <ThemedText style={styles.dayNameText}>{dayName}</ThemedText>
          </View>
        ))}
      </View>
      
      {/* Calendar grid */}
      <View style={styles.calendarGrid}>
        {renderCalendarDays()}
      </View>
    </ThemedView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    borderRadius: 12,
    marginBottom: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  navText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  dayNameText: {
    fontSize: 12,
    fontWeight: '600',
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.28%', // 1/7 of the width
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    margin: 1,
    position: 'relative',
  },
  dayText: {
    fontSize: 16,
  },
  workoutIndicator: {
    position: 'absolute',
    bottom: 4,
    width: 6,
    height: 6,
    borderRadius: 3,
  },
});
