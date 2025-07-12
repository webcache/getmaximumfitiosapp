import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { myExercisesService } from '@/services/MyExercisesService';
import { Exercise } from '@/types/exercise';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import React, { useEffect, useRef, useState } from 'react';
import {
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';

interface ExerciseInputWithSuggestionsProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectExercise?: (exercise: Exercise) => void;
  placeholder?: string;
  style?: any;
  autoFocus?: boolean;
}

const SUGGESTION_HEIGHT = 50;
const MAX_SUGGESTIONS = 5;

export default function ExerciseInputWithSuggestions({
  value,
  onChangeText,
  onSelectExercise,
  placeholder = "Exercise name",
  style,
  autoFocus = false,
}: ExerciseInputWithSuggestionsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [suggestions, setSuggestions] = useState<Exercise[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load user's exercises
  useEffect(() => {
    if (user) {
      loadMyExercises();
    }
  }, [user]);

  // Update suggestions when value changes
  useEffect(() => {
    if (!value.trim() || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const term = value.toLowerCase().trim();
    const filtered = myExercises.filter(exercise => 
      exercise.name.toLowerCase().includes(term) &&
      exercise.name.toLowerCase() !== term // Don't show if exact match
    );
    
    setSuggestions(filtered.slice(0, MAX_SUGGESTIONS));
    setShowSuggestions(filtered.length > 0 && inputFocused);
  }, [value, myExercises, inputFocused]);

  const loadMyExercises = async () => {
    if (!user) return;
    
    try {
      const exercises = await myExercisesService.getMyExercises(user.uid);
      setMyExercises(exercises);
    } catch (error) {
      console.error('Error loading My Exercises for suggestions:', error);
    }
  };

  const handleSelectSuggestion = (exercise: Exercise) => {
    onChangeText(exercise.name);
    setShowSuggestions(false);
    inputRef.current?.blur();
    
    if (onSelectExercise) {
      onSelectExercise(exercise);
    }
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    // Recheck suggestions when input is focused
    if (value.trim().length >= 2) {
      const term = value.toLowerCase().trim();
      const filtered = myExercises.filter(exercise => 
        exercise.name.toLowerCase().includes(term) &&
        exercise.name.toLowerCase() !== term
      );
      setSuggestions(filtered.slice(0, MAX_SUGGESTIONS));
      setShowSuggestions(filtered.length > 0);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for tap on suggestion
    setTimeout(() => {
      setInputFocused(false);
      setShowSuggestions(false);
    }, 150);
  };

  const handleChangeText = (text: string) => {
    onChangeText(text);
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={[styles.input, { color: colors.text, borderColor: colors.text + '30' }, style]}
        value={value}
        onChangeText={handleChangeText}
        onFocus={handleInputFocus}
        onBlur={handleInputBlur}
        placeholder={placeholder}
        placeholderTextColor={colors.text + '60'}
        autoFocus={autoFocus}
        autoCorrect={false}
        autoCapitalize="words"
      />
      
      {showSuggestions && suggestions.length > 0 && (
        <View 
          style={[
            styles.suggestionsContainer, 
            { 
              backgroundColor: colors.background,
              borderColor: colors.text + '20',
              maxHeight: MAX_SUGGESTIONS * SUGGESTION_HEIGHT,
            }
          ]}
        >
          {suggestions.map((item) => (
            <TouchableOpacity
              key={item.id || item.name}
              style={[styles.suggestionItem, { borderBottomColor: colors.text + '10' }]}
              onPress={() => handleSelectSuggestion(item)}
            >
              <View style={styles.suggestionContent}>
                <ThemedText style={styles.suggestionName}>{item.name}</ThemedText>
                <ThemedText style={[styles.suggestionCategory, { color: colors.text + '60' }]}>
                  {item.category} • {item.primary_muscles.slice(0, 2).join(', ')}
                </ThemedText>
              </View>
              <FontAwesome5 name="arrow-up" size={12} color={colors.text + '40'} />
            </TouchableOpacity>
          ))}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    maxHeight: MAX_SUGGESTIONS * SUGGESTION_HEIGHT,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    height: SUGGESTION_HEIGHT,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionName: {
    fontSize: 15,
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionCategory: {
    fontSize: 12,
    textTransform: 'capitalize',
  },
});
