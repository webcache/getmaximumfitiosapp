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
  
  const isPastDate = (date: Date) => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateStart < todayStart;
  };
  
  const isFutureDate = (date: Date) => {
    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const dateStart = new Date(date.getFullYear(), date.getMonth(), date.getDate());
    return dateStart > todayStart;
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
      const isPast = isPastDate(date);
      const isFuture = isFutureDate(date);
      const hasWorkoutData = hasWorkout(date);
      
      // Determine background color
      let backgroundColor = 'transparent';
      if (isSelected) {
        backgroundColor = colors.tint;
      } else if (isTodayDate) {
        backgroundColor = colors.tint + '30';
      } else if (isPast) {
        backgroundColor = '#E5E5E5'; // Always light since colorScheme is forced to 'light'
      } else if (isFuture) {
        backgroundColor = '#F5F5F5'; // Always light since colorScheme is forced to 'light'
      }
      
      days.push(
        <TouchableOpacity
          key={day}
          style={[
            styles.dayCell,
            { backgroundColor },
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
    padding: 8,
    borderRadius: 8,
    marginBottom: 10,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  navButton: {
    padding: 6,
    borderRadius: 8,
  },
  navText: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  monthTitle: {
    fontSize: 14,
    fontWeight: 'bold',
  },
  dayNamesRow: {
    flexDirection: 'row',
    marginBottom: 4,
  },
  dayNameCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 4,
  },
  dayNameText: {
    fontSize: 11,
    fontWeight: '600',
    opacity: 0.7,
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dayCell: {
    width: '14.285714285714286%', // Exact 1/7 with more precision
    aspectRatio: 1.2,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 0, // Reduced from 6 to 3
    position: 'relative',
    paddingTop: 0, // Add small top padding for better spacing
    paddingBottom: 8, // Add bottom padding to make room for indicator
  },
  dayText: {
    fontSize: 13, // Slightly smaller to fit better
  },
  workoutIndicator: {
    position: 'absolute',
    bottom: 2, // Move closer to bottom edge
    width: 4,
    height: 4,
    borderRadius: 2,
  },
});
