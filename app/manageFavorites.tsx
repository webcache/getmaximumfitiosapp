import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FavoriteWorkout } from '@/components/WorkoutModal';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { router, useLocalSearchParams, useNavigation } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';
import { convertFirestoreDate } from '../utils';

export default function ManageFavoritesScreen() {
  const { user } = useAuth();
  const navigation = useNavigation();
  const params = useLocalSearchParams();
  const [favorites, setFavorites] = useState<FavoriteWorkout[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');
  
  // Check if we're in selection mode
  const isSelectionMode = params.selectionMode === 'true';
  const returnTo = params.returnTo as string;

  const handleDone = (selectedWorkout: FavoriteWorkout) => {
    if (returnTo === 'createWorkout') {
      // Get form data parameter to pass back
      const formDataParam = params.formData as string;
      
      // Convert FavoriteWorkout to exercises for createWorkout
      const encodedWorkout = encodeURIComponent(JSON.stringify(selectedWorkout));
      
      const routeParams: any = { selectedWorkout: encodedWorkout };
      if (formDataParam) {
        routeParams.formData = formDataParam;
      }
      
      router.push({
        pathname: '/createWorkout',
        params: routeParams
      });
    } else {
      router.back();
    }
  };

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: isSelectionMode ? 'Select Favorite Workout' : 'Manage Favorites',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
    });
  }, [navigation, isSelectionMode]);

  useEffect(() => {
    if (!user) return;
    const favoritesRef = collection(db, 'profiles', user.uid, 'favoriteWorkouts');
    const q = query(favoritesRef, orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      console.log('=== LOADING FAVORITES FROM FIRESTORE ===');
      const favs: FavoriteWorkout[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        console.log('Raw firestore document:', doc.id, data);
        
        const favorite = {
          id: doc.id,
          name: data.name,
          exercises: data.exercises || [], // Changed from defaultSets to exercises
          notes: data.notes,
          createdAt: convertFirestoreDate(data.createdAt),
        };
        
        console.log('Processed favorite:', favorite);
        if (favorite.exercises && favorite.exercises.length > 0) {
          console.log('Favorite exercises:', favorite.exercises);
          favorite.exercises.forEach((ex: any, i: number) => {
            console.log(`  Exercise ${i}:`, ex.name, 'sets:', ex.sets);
          });
        }
        
        favs.push(favorite);
      });
      console.log('Total favorites loaded:', favs.length);
      setFavorites(favs);
    });
    return () => unsubscribe();
  }, [user]);

  const startEdit = (fav: FavoriteWorkout) => {
    setEditingId(fav.id);
    setEditName(fav.name);
    setEditNotes(fav.notes || '');
  };

  const saveEdit = async (fav: FavoriteWorkout) => {
    if (!user) return;
    try {
      const ref = doc(db, 'profiles', user.uid, 'favoriteWorkouts', fav.id);
      await setDoc(ref, { ...fav, name: editName, notes: editNotes });
      setEditingId(null);
    } catch {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const deleteFavorite = async (fav: FavoriteWorkout) => {
    if (!user) return;
    try {
      const ref = doc(db, 'profiles', user.uid, 'favoriteWorkouts', fav.id);
      await deleteDoc(ref);
    } catch {
      Alert.alert('Error', 'Failed to delete favorite.');
    }
  };

  return (
    <ThemedView style={styles.container}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {favorites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <FontAwesome5 name="star" size={60} color="#ccc" />
            <ThemedText style={styles.emptyTitle}>No favorites saved yet</ThemedText>
            <ThemedText style={styles.emptyDescription}>
              Star exercises while creating workouts to add them here
            </ThemedText>
          </View>
        ) : (
          favorites.map((fav) => (
            <TouchableOpacity 
              key={fav.id} 
              style={[
                styles.card,
                isSelectionMode && styles.selectionCard
              ]}
              onPress={() => isSelectionMode ? handleDone(fav) : undefined}
              disabled={!isSelectionMode}
            >
              {editingId === fav.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Workout name"
                  />
                  <TextInput
                    style={styles.input}
                    value={editNotes}
                    onChangeText={setEditNotes}
                    placeholder="Notes"
                  />
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => saveEdit(fav)} style={styles.saveBtn}>
                      <FontAwesome5 name="save" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => setEditingId(null)} style={styles.cancelBtn}>
                      <FontAwesome5 name="times" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              ) : (
                <>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardContent}>
                      <ThemedText style={styles.name}>{fav.name}</ThemedText>
                      {/* Exercise summary with sets details */}
                      {fav.exercises && fav.exercises.length > 0 && (
                        <View style={styles.exercisesSummary}>
                          <ThemedText style={styles.exercisesCount}>
                            {fav.exercises.length} {fav.exercises.length === 1 ? 'exercise' : 'exercises'}
                          </ThemedText>
                          {fav.exercises.map((exercise, index) => (
                            <View key={index} style={styles.exerciseItem}>
                              <ThemedText style={styles.exerciseName}>
                                {exercise.name || `Exercise ${index + 1}`}
                              </ThemedText>
                              {exercise.sets && exercise.sets.length > 0 && (
                                <ThemedText style={styles.setsInfo}>
                                  {exercise.sets.length} {exercise.sets.length === 1 ? 'set' : 'sets'}
                                  {exercise.sets.length > 0 && (
                                    exercise.sets.map((set, setIndex) => {
                                      if (set.weight || set.reps) {
                                        return ` • ${set.reps || '?'} reps${set.weight ? ` x ${set.weight}` : ''}`;
                                      }
                                      return '';
                                    }).filter(Boolean).slice(0, 2).join('')
                                  )}
                                  {exercise.sets.length > 2 && '...'}
                                </ThemedText>
                              )}
                            </View>
                          ))}
                        </View>
                      )}
                      {fav.notes && (
                        <ThemedText style={styles.notes}>{fav.notes}</ThemedText>
                      )}
                    </View>
                    {isSelectionMode && (
                      <View style={styles.selectionIcon}>
                        <FontAwesome5 name="chevron-right" size={14} color="#007AFF" />
                      </View>
                    )}
                  </View>
                  {!isSelectionMode && (
                    <View style={styles.actions}>
                      <TouchableOpacity onPress={() => startEdit(fav)} style={styles.editBtn}>
                        <FontAwesome5 name="edit" size={16} color="#fff" />
                      </TouchableOpacity>
                      <TouchableOpacity onPress={() => deleteFavorite(fav)} style={styles.deleteBtn}>
                        <FontAwesome5 name="trash" size={16} color="#fff" />
                      </TouchableOpacity>
                    </View>
                  )}
                </>
              )}
            </TouchableOpacity>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

// Add the missing closing brace and parenthesis at the end of the styles
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    padding: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    paddingTop: 100,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 16,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptyDescription: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    lineHeight: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  selectionCard: {
    borderColor: '#007AFF',
    borderWidth: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardContent: {
    flex: 1,
  },
  selectionIcon: {
    marginLeft: 12,
    opacity: 0.6,
  },
  name: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 4,
    color: '#000',
  },
  setsSummary: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#888',
    fontStyle: 'italic',
  },
  exercisesSummary: {
    marginBottom: 8,
  },
  exercisesCount: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  exerciseItem: {
    marginBottom: 4,
    paddingLeft: 8,
  },
  exerciseName: {
    fontSize: 13,
    fontWeight: '500',
    color: '#333',
    marginBottom: 2,
  },
  setsInfo: {
    fontSize: 12,
    color: '#666',
  },
  setsDetails: {
    fontSize: 11,
    color: '#888',
  },
  actions: {
    flexDirection: 'row',
    gap: 12,
  },
  editBtn: {
    backgroundColor: '#007AFF',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  deleteBtn: {
    backgroundColor: '#FF3B30',
    padding: 8,
    borderRadius: 6,
  },
  saveBtn: {
    backgroundColor: '#34C759',
    padding: 8,
    borderRadius: 6,
    marginRight: 8,
  },
  cancelBtn: {
    backgroundColor: '#888',
    padding: 8,
    borderRadius: 6,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 6,
    padding: 8,
    marginBottom: 8,
    fontSize: 16,
  },
  selectionIndicator: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingTop: 8,
  },
}); // <- Add this closing brace and parenthesis