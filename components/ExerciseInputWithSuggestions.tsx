import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { myExercisesService } from '@/services/MyExercisesService';
import { Exercise } from '@/types/exercise';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../contexts/AuthContext';
import { ThemedText } from './ThemedText';

/**
 * Props for ExerciseInputWithSuggestions.
 * @property value - The current input value.
 * @property onChangeText - Callback when input text changes.
 * @property onSelectExercise - Optional callback when an exercise is selected.
 * @property placeholder - Optional placeholder text for the input.
 * @property style - Optional style for the input.
 * @property autoFocus - Optional flag to autofocus the input.
 * @property suggestionsSource - Optional array of exercises to use as the source for suggestions.
 */
interface ExerciseInputWithSuggestionsProps {
  value: string;
  onChangeText: (text: string) => void;
  onSelectExercise?: (exercise: Exercise | string) => void;
  placeholder?: string;
  style?: any;
  autoFocus?: boolean;
  /** Optional array of exercises to use as the source for suggestions. */
  suggestionsSource?: (Exercise | string)[];
}

const SUGGESTION_HEIGHT = 60; // Increased height to prevent text overlap
const MAX_SUGGESTIONS = 3; // Reduced to fit better on screen

export default function ExerciseInputWithSuggestions({
  value,
  onChangeText,
  onSelectExercise,
  placeholder = "Exercise name",
  style,
  autoFocus = false,
  suggestionsSource,
}: ExerciseInputWithSuggestionsProps) {
  const colorScheme = useColorScheme();
  const colors = Colors[colorScheme ?? 'light'];
  const { user } = useAuth();
  
  const [myExercises, setMyExercises] = useState<Exercise[]>([]);
  const [suggestions, setSuggestions] = useState<(Exercise | string)[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputFocused, setInputFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);

  // Load user's exercises
  const loadMyExercises = useCallback(async () => {
    if (!user) return;
    
    try {
      const exercises = await myExercisesService.getMyExercises(user.uid);
      setMyExercises(exercises);
    } catch (error) {
      console.error('Error loading My Exercises for suggestions:', error);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      loadMyExercises();
    }
  }, [user, loadMyExercises]);

  // Update suggestions when value changes
  useEffect(() => {
    if (!value || !value.trim() || value.length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    const term = value.toLowerCase().trim();
    
    // Combine suggestions from both sources
    let combinedSources: (Exercise | string)[] = [];
    
    // Add myExercises (always include these)
    if (myExercises && myExercises.length > 0) {
      combinedSources = [...myExercises];
    }
    
    // Add suggestionsSource if provided (e.g. from exerciseLibrary)
    if (suggestionsSource && suggestionsSource.length > 0) {
      // Ensure no duplicates by filtering out any exercises that already exist in combinedSources
      const newSuggestions = suggestionsSource.filter(suggestion => {
        const suggestionName = typeof suggestion === 'string' ? suggestion : suggestion.name;
        return !combinedSources.some(existing => {
          const existingName = typeof existing === 'string' ? existing : existing.name;
          return existingName === suggestionName;
        });
      });
      combinedSources = [...combinedSources, ...newSuggestions];
    }
    
    console.log('Combined sources length:', combinedSources.length);
    console.log('Search term:', term);
    
    // Filter the combined sources
    const filtered = combinedSources.filter(exercise => {
      if (!exercise) return false;
      
      // Handle both Exercise objects and string-only values
      const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
      
      if (!exerciseName) return false;
      
      const match = exerciseName.toLowerCase().includes(term) && 
                   exerciseName.toLowerCase() !== term; // Don't show if exact match
      if (match) {
        console.log('Match found:', exerciseName);
      }
      return match;
    });
    
    console.log('Filtered suggestions:', filtered.length);
    
    setSuggestions(filtered.slice(0, MAX_SUGGESTIONS));
    setShowSuggestions(filtered.length > 0 && inputFocused);
  }, [value, myExercises, suggestionsSource, inputFocused]);

  const handleSelectSuggestion = (exercise: Exercise | string) => {
    const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
    console.log('Selected suggestion:', exerciseName);
    
    // Force input to update with the selected exercise name
    onChangeText('');
    setTimeout(() => {
      onChangeText(exerciseName);
    }, 10);
    
    setShowSuggestions(false);
    inputRef.current?.blur();
    
    if (onSelectExercise && typeof exercise !== 'string') {
      console.log('Calling onSelectExercise with:', exercise);
      onSelectExercise(exercise);
    }
  };

  const handleInputFocus = () => {
    setInputFocused(true);
    // Recheck suggestions when input is focused
    if (value && value.trim().length >= 2) {
      const term = value.toLowerCase().trim();
      
      // Combine suggestions from both sources
      let combinedSources: (Exercise | string)[] = [];
      
      // Add myExercises (always include these)
      if (myExercises && myExercises.length > 0) {
        combinedSources = [...myExercises];
      }
      
      // Add suggestionsSource if provided (e.g. from exerciseLibrary)
      if (suggestionsSource && suggestionsSource.length > 0) {
        // Ensure no duplicates by filtering out any exercises that already exist in combinedSources
        const newSuggestions = suggestionsSource.filter(suggestion => {
          const suggestionName = typeof suggestion === 'string' ? suggestion : suggestion.name;
          return !combinedSources.some(existing => {
            const existingName = typeof existing === 'string' ? existing : existing.name;
            return existingName === suggestionName;
          });
        });
        combinedSources = [...combinedSources, ...newSuggestions];
      }
      
      // Filter the combined sources
      const filtered = combinedSources.filter(exercise => {
        if (!exercise) return false;
        
        // Handle both Exercise objects and string-only values
        const exerciseName = typeof exercise === 'string' ? exercise : exercise.name;
        if (!exerciseName) return false;
        
        return exerciseName.toLowerCase().includes(term) && 
               exerciseName.toLowerCase() !== term; // Don't show if exact match
      });
      
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
      
      {/* Debug information */}
      {inputFocused && value && value.length >= 2 && (
        <View style={{ position: 'absolute', top: -20, left: 0, backgroundColor: 'rgba(0,0,0,0.7)', padding: 3, borderRadius: 3 }}>
          <ThemedText style={{ fontSize: 10, color: 'white' }}>
            {showSuggestions ? `Showing ${suggestions.length} suggestions` : 'No suggestions'}
          </ThemedText>
        </View>
      )}
      
      {showSuggestions && suggestions.length > 0 && (
        <View 
          style={[
            styles.suggestionsContainer, 
            { 
              backgroundColor: '#FFFFFF',
              borderColor: colors.text + '20',
              shadowColor: colors.text,
            }
          ]}
        >
          {suggestions.map((item, index) => {
            const isString = typeof item === 'string';
            const displayName = isString ? item : item.name;
            const itemId = isString ? `string-${index}` : (item.id || item.name);
            
            return (
              <TouchableOpacity
                key={itemId}
                style={[
                  styles.suggestionItem, 
                  { 
                    borderBottomColor: colors.text + '10',
                    borderBottomWidth: index === suggestions.length - 1 ? 0 : 0.5
                  }
                ]}
                onPress={() => handleSelectSuggestion(item)}
              >
                <View style={styles.suggestionContent}>
                  <ThemedText style={[styles.suggestionName, { color: colors.text }]}>{displayName}</ThemedText>
                  {!isString && (item.category || (item.primary_muscles && item.primary_muscles.length > 0)) && (
                    <ThemedText style={[styles.suggestionCategory, { color: colors.text + '70' }]}>
                      {[
                        item.category,
                        item.primary_muscles && item.primary_muscles.length > 0 
                          ? item.primary_muscles.slice(0, 1).join(', ')
                          : null
                      ].filter(Boolean).join(' • ')}
                    </ThemedText>
                  )}
                </View>
                <FontAwesome5 name="arrow-up" size={14} color={colors.text + '100'} style={{ marginTop: 2 }} />
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 99999, // Much higher z-index to ensure it's above everything
  },
  input: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 8,
    fontSize: 16,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderTopWidth: 0,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
    marginTop: 0,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 99999,
    zIndex: 99999,
    overflow: 'hidden',
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 8,
    minHeight: SUGGESTION_HEIGHT,
    borderBottomWidth: 1,
  },
  suggestionContent: {
    flex: 1,
    paddingRight: 8,
    paddingTop: 2,
  },
  suggestionName: {
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    marginBottom: 4,
    lineHeight: 20,
  },
  suggestionCategory: {
    fontSize: 12,
    fontWeight: '400',
    lineHeight: 16,
    opacity: 0.7,
  },
});
