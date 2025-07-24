import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FavoriteExercise } from '@/components/WorkoutModal';
import { useReduxAuth } from '@/contexts/ReduxAuthProvider';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useNavigation } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useEffect, useLayoutEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { db } from '../firebase';

export default function ManageFavoritesScreen() {
  const { user } = useReduxAuth();
  const navigation = useNavigation();
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

  // Set up navigation header
  useLayoutEffect(() => {
    navigation.setOptions({
      title: 'Manage Favorites',
      headerShown: true,
      headerBackTitle: 'Back',
      headerTintColor: '#000000',
    });
  }, [navigation]);

  useEffect(() => {
    if (!user) return;
    const favoritesRef = collection(db, 'profiles', user.uid, 'favoriteExercises');
    const q = query(favoritesRef, orderBy('name'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const favs: FavoriteExercise[] = [];
      snapshot.forEach((doc) => {
        const data = doc.data();
        favs.push({
          id: doc.id,
          name: data.name,
          defaultSets: data.defaultSets || [],
          notes: data.notes,
          createdAt: data.createdAt?.toDate() || new Date(),
        });
      });
      setFavorites(favs);
    });
    return () => unsubscribe();
  }, [user]);

  const startEdit = (fav: FavoriteExercise) => {
    setEditingId(fav.id);
    setEditName(fav.name);
    setEditNotes(fav.notes || '');
  };

  const saveEdit = async (fav: FavoriteExercise) => {
    if (!user) return;
    try {
      const ref = doc(db, 'profiles', user.uid, 'favoriteExercises', fav.id);
      await setDoc(ref, { ...fav, name: editName, notes: editNotes });
      setEditingId(null);
    } catch (e) {
      Alert.alert('Error', 'Failed to save changes.');
    }
  };

  const deleteFavorite = async (fav: FavoriteExercise) => {
    if (!user) return;
    try {
      const ref = doc(db, 'profiles', user.uid, 'favoriteExercises', fav.id);
      await deleteDoc(ref);
    } catch (e) {
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
            <View key={fav.id} style={styles.card}>
              {editingId === fav.id ? (
                <>
                  <TextInput
                    style={styles.input}
                    value={editName}
                    onChangeText={setEditName}
                    placeholder="Exercise name"
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
                  <ThemedText style={styles.name}>{fav.name}</ThemedText>
                  {/* Sets summary */}
                  {fav.defaultSets && fav.defaultSets.length > 0 && (
                    <ThemedText style={styles.setsSummary}>
                      {fav.defaultSets.map((set, idx) => {
                        let summary = `Set ${idx + 1}: ${set.reps || '-'} reps`;
                        if (set.weight && set.weight.trim()) summary += ` @ ${set.weight}`;
                        return summary;
                      }).join('  |  ')}
                    </ThemedText>
                  )}
                  <ThemedText style={styles.notes}>{fav.notes}</ThemedText>
                  <View style={styles.actions}>
                    <TouchableOpacity onPress={() => startEdit(fav)} style={styles.editBtn}>
                      <FontAwesome5 name="edit" size={16} color="#fff" />
                    </TouchableOpacity>
                    <TouchableOpacity onPress={() => deleteFavorite(fav)} style={styles.deleteBtn}>
                      <FontAwesome5 name="trash" size={16} color="#fff" />
                    </TouchableOpacity>
                  </View>
                </>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </ThemedView>
  );
}

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
  name: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  setsSummary: {
    fontSize: 13,
    color: '#444',
    marginBottom: 4,
  },
  notes: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
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
});
