import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';
import { FavoriteExercise } from '@/components/WorkoutModal';
import { useAuth } from '@/contexts/AuthContext';
import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { useRouter } from 'expo-router';
import { collection, deleteDoc, doc, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { useEffect, useState } from 'react';
import { Alert, ScrollView, StyleSheet, TextInput, TouchableOpacity, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { db } from '../firebase';

export default function ManageFavoritesScreen() {
  const { user } = useAuth();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const [favorites, setFavorites] = useState<FavoriteExercise[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [editNotes, setEditNotes] = useState('');

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
    <ThemedView style={{ flex: 1, backgroundColor: '#fff' }}>
      {/* Header with back button */}
      <View style={{
        paddingTop: insets.top + 8,
        paddingBottom: 16,
        paddingHorizontal: 16,
        flexDirection: 'row',
        alignItems: 'center',
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
        backgroundColor: '#fff',
        gap: 12,
      }}>
        <TouchableOpacity onPress={() => router.back()} style={{ padding: 8, marginRight: 8 }}>
          <FontAwesome5 name="arrow-left" size={20} color="#222" />
        </TouchableOpacity>
        <ThemedText type="title" style={{ fontSize: 20, fontWeight: 'bold' }}>Manage Favorite Exercises</ThemedText>
      </View>
      <ScrollView contentContainerStyle={{ padding: 16 }}>
        {favorites.length === 0 ? (
          <ThemedText>No favorites saved yet.</ThemedText>
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
  card: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 16,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
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
