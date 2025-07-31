import { db } from '@/firebase';
import { Exercise, ExerciseSearchFilters } from '@/types/exercise';
import {
    collection,
    doc,
    DocumentData,
    getDoc,
    getDocs,
    limit,
    orderBy,
    OrderByDirection,
    query,
    QueryDocumentSnapshot,
    startAfter,
    where
} from 'firebase/firestore';

interface FirestoreExercise extends Exercise {
  searchKeywords: string[];
  all_muscles: string[];
  level: string;
  createdAt: Date;
  updatedAt: Date;
  difficulty: "Beginner" | "Intermediate" | "Advanced" | undefined;
}

interface ExerciseMetadata {
  totalExercises: number;
  categories: string[];
  equipment: string[];
  muscles: string[];
  levels: string[];
  difficulties: string[];
  lastUpdated: Date;
  version: string;
  dataSource: string;
}

interface PaginatedResult<T> {
  data: T[];
  lastDoc: QueryDocumentSnapshot<DocumentData> | null;
  hasMore: boolean;
  total?: number;
}

interface FirestoreSearchFilters extends ExerciseSearchFilters {
  pageSize?: number;
  lastDoc?: QueryDocumentSnapshot<DocumentData> | null;
  sortBy?: 'name' | 'category' | 'difficulty' | 'createdAt';
  sortDirection?: OrderByDirection;
}

class FirestoreExerciseService {
  private exercisesCollection = 'exercises';
  private metadataDoc = 'exercise_metadata/current';
  private cache: {
    metadata?: ExerciseMetadata;
    categories?: string[];
    equipment?: string[];
    muscles?: string[];
  } = {};

  /**
   * Get exercise metadata (categories, equipment, etc.)
   */
  async getMetadata(): Promise<ExerciseMetadata | null> {
    if (this.cache.metadata) {
      return this.cache.metadata;
    }

    try {
      const metadataRef = doc(db, 'exercise_metadata', 'current');
      const metadataSnap = await getDoc(metadataRef);
      
      if (!metadataSnap.exists()) {
        console.warn('Exercise metadata not found');
        return null;
      }

      const metadata = metadataSnap.data() as ExerciseMetadata;
      this.cache.metadata = metadata;
      return metadata;
    } catch (error) {
      console.error('Error fetching exercise metadata:', error);
      return null;
    }
  }

  /**
   * Get all available categories
   */
  async getCategories(): Promise<string[]> {
    if (this.cache.categories) {
      return this.cache.categories;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.categories = metadata.categories;
      return metadata.categories;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const categories = [...new Set(snapshot.docs.map(doc => doc.data().category))].sort();
      this.cache.categories = categories;
      return categories;
    } catch (error) {
      console.error('Error fetching categories:', error);
      return [];
    }
  }

  /**
   * Get all available equipment
   */
  async getEquipment(): Promise<string[]> {
    if (this.cache.equipment) {
      return this.cache.equipment;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.equipment = metadata.equipment;
      return metadata.equipment;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const equipment = [...new Set(
        snapshot.docs.flatMap(doc => doc.data().equipment || [])
      )].sort();
      this.cache.equipment = equipment;
      return equipment;
    } catch (error) {
      console.error('Error fetching equipment:', error);
      return [];
    }
  }

  /**
   * Get all available muscle groups
   */
  async getMuscleGroups(): Promise<string[]> {
    if (this.cache.muscles) {
      return this.cache.muscles;
    }

    const metadata = await this.getMetadata();
    if (metadata) {
      this.cache.muscles = metadata.muscles;
      return metadata.muscles;
    }

    // Fallback: query exercises directly
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const snapshot = await getDocs(exercisesRef);
      const muscles = [...new Set(
        snapshot.docs.flatMap(doc => [
          ...(doc.data().primary_muscles || []),
          ...(doc.data().secondary_muscles || [])
        ])
      )].sort();
      this.cache.muscles = muscles;
      return muscles;
    } catch (error) {
      console.error('Error fetching muscle groups:', error);
      return [];
    }
  }

  /**
   * Search exercises with enhanced name-based search and filtering
   * Prioritizes Firestore name queries over client-side filtering for better performance
   */
  async searchExercises(filters: FirestoreSearchFilters = {}): Promise<PaginatedResult<Exercise>> {
    console.log('🔍 FirestoreExerciseService.searchExercises called with filters:', filters);
    
    try {
      const exercisesRef = collection(db, this.exercisesCollection);

      // If we have a search term, prioritize name-based Firestore queries
      if (filters.searchTerm) {
        return await this.searchByNameWithFallback(filters);
      }

      // For non-search queries, use the existing filter-based approach
      return await this.searchWithFilters(filters);
    } catch (error) {
      console.error('Error searching exercises:', error);
      return {
        data: [],
        lastDoc: null,
        hasMore: false,
      };
    }
  }

  /**
   * Enhanced name-based search with multiple strategies
   */
  private async searchByNameWithFallback(filters: FirestoreSearchFilters): Promise<PaginatedResult<Exercise>> {
    const searchTerm = filters.searchTerm!.trim();
    const exercisesRef = collection(db, this.exercisesCollection);
    const pageSize = filters.pageSize || 50;
    
    console.log('🔍 Enhanced name-based search for:', searchTerm);

    // Strategy 1: Exact name match (case-insensitive)
    const exactResults = await this.searchExactName(searchTerm, filters, pageSize);
    console.log('📊 Exact name matches:', exactResults.length);

    // Strategy 2: Prefix search for single words
    const words = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);
    const prefixResults = words.length === 1 ? 
      await this.searchNamePrefix(words[0], filters, pageSize) : [];
    console.log('📊 Prefix matches:', prefixResults.length);

    // Strategy 3: Multi-word search using range queries
    const multiWordResults = words.length > 1 ? 
      await this.searchMultiWordNames(words, filters, pageSize) : [];
    console.log('📊 Multi-word matches:', multiWordResults.length);

    // Strategy 4: Fallback to comprehensive client-side search
    const fallbackResults = await this.searchClientSideWithFilters(filters, Math.max(pageSize * 2, 100));
    console.log('📊 Client-side fallback matches:', fallbackResults.length);

    // Combine and deduplicate results with relevance scoring
    const allResults = this.combineAndScoreResults(
      exactResults,
      prefixResults, 
      multiWordResults,
      fallbackResults,
      searchTerm
    );

    console.log('✅ Total unique results after combining:', allResults.length);

    return {
      data: allResults.slice(0, pageSize),
      lastDoc: null, // Simplified for now
      hasMore: allResults.length > pageSize,
    };
  }

  /**
   * Search for exact name matches (case-insensitive)
   */
  private async searchExactName(searchTerm: string, filters: FirestoreSearchFilters, limit: number): Promise<Exercise[]> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const constraints = [];

      // Add other filters first
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      // Try exact match with proper case
      const exactQuery = query(
        exercisesRef,
        ...constraints,
        where('name', '==', searchTerm),
        orderBy('name'),
        limit(limit)
      );

      const exactSnapshot = await getDocs(exactQuery);
      const exactResults = exactSnapshot.docs.map(doc => this.convertToExercise(doc));

      // If no exact match, try case variations
      if (exactResults.length === 0) {
        const variations = [
          searchTerm.toLowerCase(),
          searchTerm.toUpperCase(),
          this.toTitleCase(searchTerm),
          searchTerm.replace(/\s+/g, '_'), // Handle underscore variants
          searchTerm.replace(/_/g, ' '), // Handle space variants
        ];

        for (const variation of variations) {
          if (variation === searchTerm) continue; // Skip original
          
          try {
            const variantQuery = query(
              exercisesRef,
              ...constraints,
              where('name', '==', variation),
              orderBy('name'),
              limit(limit)
            );
            
            const variantSnapshot = await getDocs(variantQuery);
            if (!variantSnapshot.empty) {
              return variantSnapshot.docs.map(doc => this.convertToExercise(doc));
            }
          } catch (error) {
            // Continue to next variation
            continue;
          }
        }
      }

      return exactResults;
    } catch (error) {
      console.error('Error in exact name search:', error);
      return [];
    }
  }

  /**
   * Search for names that start with the search term (prefix search)
   */
  private async searchNamePrefix(searchTerm: string, filters: FirestoreSearchFilters, limit: number): Promise<Exercise[]> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const constraints = [];

      // Add other filters
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      // Firestore range query for prefix matching
      const lowerBound = searchTerm.toLowerCase();
      const upperBound = lowerBound + '\uf8ff'; // Unicode high character for range

      const prefixQuery = query(
        exercisesRef,
        ...constraints,
        where('name', '>=', lowerBound),
        where('name', '<=', upperBound),
        orderBy('name'),
        limit(limit)
      );

      const snapshot = await getDocs(prefixQuery);
      return snapshot.docs
        .map(doc => this.convertToExercise(doc))
        .filter(exercise => exercise.name.toLowerCase().startsWith(lowerBound));

    } catch (error) {
      console.error('Error in prefix search:', error);
      return [];
    }
  }

  /**
   * Search for multi-word names using range queries on first word
   */
  private async searchMultiWordNames(words: string[], filters: FirestoreSearchFilters, limit: number): Promise<Exercise[]> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const constraints = [];

      // Add other filters
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      // Use the first word for Firestore range query
      const firstWord = words[0];
      const lowerBound = firstWord;
      const upperBound = firstWord + '\uf8ff';

      const multiWordQuery = query(
        exercisesRef,
        ...constraints,
        where('name', '>=', lowerBound),
        where('name', '<=', upperBound),
        orderBy('name'),
        limit(limit * 2) // Get more for client-side filtering
      );

      const snapshot = await getDocs(multiWordQuery);
      
      // Client-side filter for all words
      return snapshot.docs
        .map(doc => this.convertToExercise(doc))
        .filter(exercise => {
          const exerciseName = exercise.name.toLowerCase();
          return words.every(word => exerciseName.includes(word));
        });

    } catch (error) {
      console.error('Error in multi-word search:', error);
      return [];
    }
  }

  /**
   * Fallback search with other filters applied
   */
  private async searchWithFilters(filters: FirestoreSearchFilters): Promise<PaginatedResult<Exercise>> {
    const exercisesRef = collection(db, this.exercisesCollection);
    
    // Build query constraints with priority-based filtering
    const constraints = [];
    
    // Count array-contains filters to determine strategy
    const arrayFilters = [];
    if (filters.equipment && filters.equipment.length > 0) arrayFilters.push('equipment');
    if (filters.primaryMuscle) arrayFilters.push('primaryMuscle');
    if (filters.secondaryMuscle) arrayFilters.push('secondaryMuscle');

    console.log('🔍 Array filters detected:', arrayFilters);

    // Strategy 1: Single array filter with other constraints
    if (arrayFilters.length <= 1) {
      console.log('📊 Using Strategy 1: Single array filter');
      
      // Category filter
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }

      // Equipment filter (highest priority for array filters)
      if (filters.equipment && filters.equipment.length > 0) {
        if (filters.equipment.length === 1) {
          constraints.push(where('equipment', 'array-contains', filters.equipment[0]));
        } else {
          constraints.push(where('equipment', 'array-contains-any', filters.equipment.slice(0, 10)));
        }
      }
      // Primary muscle filter
      else if (filters.primaryMuscle) {
        constraints.push(where('primary_muscles', 'array-contains', filters.primaryMuscle));
      }
      // Secondary muscle filter
      else if (filters.secondaryMuscle) {
        constraints.push(where('secondary_muscles', 'array-contains', filters.secondaryMuscle));
      }

      // Difficulty filter
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      // Sorting
      const sortBy = filters.sortBy || 'name';
      const sortDirection = filters.sortDirection || 'asc';
      constraints.push(orderBy(sortBy, sortDirection));

      // Pagination
      const pageSize = filters.pageSize || 50;
      constraints.push(limit(pageSize));

      if (filters.lastDoc) {
        constraints.push(startAfter(filters.lastDoc));
      }

      // Apply all constraints
      const finalQuery = query(exercisesRef, ...constraints);
      const snapshot = await getDocs(finalQuery);

      const exercises: Exercise[] = snapshot.docs.map(doc => this.convertToExercise(doc));

      return {
        data: exercises,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === pageSize,
      };
    }

    // Strategy 2: Multiple array filters - use most restrictive filter in query
    else {
      // Implementation for complex filters (simplified for now)
      const finalQuery = query(exercisesRef, orderBy('name'), limit(filters.pageSize || 50));
      const snapshot = await getDocs(finalQuery);
      const exercises: Exercise[] = snapshot.docs.map(doc => this.convertToExercise(doc));

      return {
        data: exercises,
        lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
        hasMore: snapshot.docs.length === (filters.pageSize || 50),
      };
    }
  }

  /**
   * Client-side search with comprehensive filtering
   */
  private async searchClientSideWithFilters(filters: FirestoreSearchFilters, limit: number): Promise<Exercise[]> {
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      const constraints = [];

      // Add basic filters that don't conflict
      if (filters.category) {
        constraints.push(where('category', '==', filters.category));
      }
      if (filters.difficulty) {
        constraints.push(where('difficulty', '==', filters.difficulty));
      }

      constraints.push(orderBy('name'));
      constraints.push(limit(limit));

      const query_ = query(exercisesRef, ...constraints);
      const snapshot = await getDocs(query_);
      
      let exercises = snapshot.docs.map(doc => this.convertToExercise(doc));

      // Apply search term filtering
      if (filters.searchTerm) {
        const searchTerm = filters.searchTerm.toLowerCase();
        const searchWords = searchTerm.split(/\s+/).filter(w => w.length > 0);
        
        exercises = exercises.filter(exercise => {
          const name = exercise.name.toLowerCase();
          const category = exercise.category.toLowerCase();
          const primaryMuscles = exercise.primary_muscles.map(m => m.toLowerCase());
          const secondaryMuscles = exercise.secondary_muscles.map(m => m.toLowerCase());
          const equipment = exercise.equipment.map(e => e.toLowerCase());
          
          return searchWords.some(word => 
            name.includes(word) ||
            category.includes(word) ||
            primaryMuscles.some(muscle => muscle.includes(word)) ||
            secondaryMuscles.some(muscle => muscle.includes(word)) ||
            equipment.some(eq => eq.includes(word))
          );
        });
      }

      // Apply other filters
      if (filters.equipment && filters.equipment.length > 0) {
        exercises = exercises.filter(exercise =>
          filters.equipment!.some(eq => exercise.equipment.includes(eq))
        );
      }

      if (filters.primaryMuscle) {
        exercises = exercises.filter(exercise =>
          exercise.primary_muscles.includes(filters.primaryMuscle!)
        );
      }

      if (filters.secondaryMuscle) {
        exercises = exercises.filter(exercise =>
          exercise.secondary_muscles.includes(filters.secondaryMuscle!)
        );
      }

      return exercises;
    } catch (error) {
      console.error('Error in client-side search:', error);
      return [];
    }
  }

  /**
   * Combine and score search results, removing duplicates
   */
  private combineAndScoreResults(
    exactResults: Exercise[],
    prefixResults: Exercise[],
    multiWordResults: Exercise[],
    fallbackResults: Exercise[],
    searchTerm: string
  ): Exercise[] {
    const resultsMap = new Map<string, { exercise: Exercise; score: number }>();
    const searchWords = searchTerm.toLowerCase().split(/\s+/).filter(w => w.length > 0);

    // Helper function to calculate relevance score
    const calculateScore = (exercise: Exercise, source: string): number => {
      const name = exercise.name.toLowerCase();
      let score = 0;

      // Base score by source
      switch (source) {
        case 'exact': score = 1000; break;
        case 'prefix': score = 500; break;
        case 'multiword': score = 300; break;
        case 'fallback': score = 100; break;
      }

      // Bonus for exact name match
      if (name === searchTerm.toLowerCase()) {
        score += 500;
      }

      // Bonus for word boundary matches
      searchWords.forEach(word => {
        const regex = new RegExp(`\\b${word}\\b`, 'i');
        if (regex.test(exercise.name)) {
          score += 50;
        } else if (name.includes(word)) {
          score += 25;
        }
      });

      // Bonus for name starting with search term
      if (name.startsWith(searchTerm.toLowerCase())) {
        score += 200;
      }

      return score;
    };

    // Add results with scores
    exactResults.forEach(exercise => {
      const score = calculateScore(exercise, 'exact');
      const existing = resultsMap.get(exercise.id);
      if (!existing || existing.score < score) {
        resultsMap.set(exercise.id, { exercise, score });
      }
    });

    prefixResults.forEach(exercise => {
      const score = calculateScore(exercise, 'prefix');
      const existing = resultsMap.get(exercise.id);
      if (!existing || existing.score < score) {
        resultsMap.set(exercise.id, { exercise, score });
      }
    });

    multiWordResults.forEach(exercise => {
      const score = calculateScore(exercise, 'multiword');
      const existing = resultsMap.get(exercise.id);
      if (!existing || existing.score < score) {
        resultsMap.set(exercise.id, { exercise, score });
      }
    });

    fallbackResults.forEach(exercise => {
      const score = calculateScore(exercise, 'fallback');
      const existing = resultsMap.get(exercise.id);
      if (!existing || existing.score < score) {
        resultsMap.set(exercise.id, { exercise, score });
      }
    });

    // Sort by score and return exercises
    return Array.from(resultsMap.values())
      .sort((a, b) => b.score - a.score)
      .map(item => item.exercise);
  }

  /**
   * Convert Firestore document to Exercise object
   */
  private convertToExercise(doc: QueryDocumentSnapshot<DocumentData>): Exercise {
    const data = doc.data() as FirestoreExercise;
    return {
      id: doc.id,
      name: data.name,
      category: data.category,
      primary_muscles: data.primary_muscles || [],
      secondary_muscles: data.secondary_muscles || [],
      equipment: data.equipment || [],
      instructions: data.instructions || [],
      description: data.description || '',
      tips: data.tips || [],
      difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
      variation_on: data.variation_on || [],
      video: data.video,
    };
  }

  /**
   * Convert string to title case
   */
  private toTitleCase(str: string): string {
    return str.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  }
          
          // Don't add Firestore constraints for search terms - rely on client-side filtering
          // This ensures we get comprehensive results regardless of case sensitivity
        }

        // Difficulty filter
        if (filters.difficulty) {
          constraints.push(where('difficulty', '==', filters.difficulty));
        }

        // Sorting
        const sortBy = filters.sortBy || 'name';
        const sortDirection = filters.sortDirection || 'asc';
        constraints.push(orderBy(sortBy, sortDirection));

        // Pagination
        let pageSize = filters.pageSize || 50;
        
        // If we have a search term, increase page size to get more results for client-side filtering
        if (filters.searchTerm) {
          pageSize = Math.max(pageSize, 200); // Get more exercises to filter from
          console.log('📊 Increased page size for search to:', pageSize);
        }
        
        constraints.push(limit(pageSize));

        if (filters.lastDoc) {
          constraints.push(startAfter(filters.lastDoc));
        }

        console.log('📊 Query constraints:', constraints.length);

        // Apply all constraints
        const finalQuery = query(exercisesRef, ...constraints);
        const snapshot = await getDocs(finalQuery);

        console.log('✅ Firestore query returned:', snapshot.docs.length, 'documents');

        let exercises: Exercise[] = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreExercise;
          
          // Debug first exercise
          if (doc.id === 'Ab_Roller') {
            console.log('🔍 Raw Firestore data for Ab_Roller:', JSON.stringify(data, null, 2));
            console.log('🔍 Video field value:', data.video);
            console.log('🔍 Video field type:', typeof data.video);
            console.log('🔍 All fields in document:', Object.keys(data));
          }
          
          return {
            id: doc.id,
            name: data.name,
            category: data.category,
            primary_muscles: data.primary_muscles,
            secondary_muscles: data.secondary_muscles,
            equipment: data.equipment,
            instructions: data.instructions,
            description: data.description,
            tips: data.tips,
            difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
            variation_on: data.variation_on,
            video: data.video,
          };
        });

        // If we have a search term, always apply client-side filtering
        if (filters.searchTerm) {
          console.log('🔍 Applying client-side search filtering for term:', filters.searchTerm);
          const searchTerm = filters.searchTerm.toLowerCase();
          const originalCount = exercises.length;
          
          // Normalize search term: split into words and remove special characters
          const normalizeText = (text: string) => {
            return text.toLowerCase()
              .replace(/[_-]/g, ' ')  // Convert underscores and hyphens to spaces
              .replace(/[^\w\s]/g, '') // Remove special characters except words and spaces
              .trim();
          };
          
          const searchWords = normalizeText(searchTerm).split(/\s+/).filter(word => word.length > 0);
          console.log('🔍 Search words:', searchWords);
          
          exercises = exercises.filter(exercise => {
            // Normalize exercise name for comparison
            const normalizedName = normalizeText(exercise.name);
            const normalizedCategory = normalizeText(exercise.category);
            
            // Check if all search words are found in the exercise name (partial match)
            const nameMatch = searchWords.every(word => normalizedName.includes(word));
            const categoryMatch = searchWords.every(word => normalizedCategory.includes(word));
            
            // Check muscle matches
            const muscleMatch = [...exercise.primary_muscles, ...exercise.secondary_muscles]
              .some(muscle => {
                const normalizedMuscle = normalizeText(muscle);
                return searchWords.every(word => normalizedMuscle.includes(word));
              });
            
            // Check equipment matches
            const equipmentMatch = exercise.equipment.some(eq => {
              const normalizedEquipment = normalizeText(eq);
              return searchWords.every(word => normalizedEquipment.includes(word));
            });
            
            // Check instructions matches
            const instructionsMatch = exercise.instructions?.some(instruction => {
              const normalizedInstruction = normalizeText(instruction);
              return searchWords.some(word => normalizedInstruction.includes(word));
            }) || false;
            
            // Check description matches
            const descriptionMatch = exercise.description ? 
              searchWords.some(word => normalizeText(exercise.description!).includes(word)) : false;
            
            const isMatch = nameMatch || categoryMatch || muscleMatch || equipmentMatch || instructionsMatch || descriptionMatch;
            
            // Debug logging for specific searches
            if (searchTerm.includes('dumbbell') && (exercise.name.toLowerCase().includes('dumbbell') || exercise.name.toLowerCase().includes('bench'))) {
              console.log(`🔍 Checking exercise: "${exercise.name}"`);
              console.log(`🔍 Normalized name: "${normalizedName}"`);
              console.log(`🔍 Search words: [${searchWords.join(', ')}]`);
              console.log(`🔍 Name match: ${nameMatch}`);
              console.log(`🔍 Overall match: ${isMatch}`);
            }
            
            return isMatch;
          });
          
          console.log('🔍 Client-side filtering reduced results from', originalCount, 'to', exercises.length);
        }

        console.log('📊 Converted exercises:', exercises.length);
        if (exercises.length > 0) {
          console.log('🔍 First exercise:', exercises[0].name);
        }

        return {
          data: exercises,
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
        };
      }

      // Strategy 2: Multiple array filters - use most restrictive filter in query, then client-side filtering
      else {
        // Determine the most restrictive filter (prioritize in order: category, equipment, primaryMuscle, searchTerm)
        const baseConstraints: any[] = [];
        const usedFilters: Set<string> = new Set();
        
        if (filters.category) {
          baseConstraints.push(where('category', '==', filters.category));
        }

        // Choose the most restrictive array filter for the query
        if (filters.equipment && filters.equipment.length > 0) {
          if (filters.equipment.length === 1) {
            baseConstraints.push(where('equipment', 'array-contains', filters.equipment[0]));
          } else {
            baseConstraints.push(where('equipment', 'array-contains-any', filters.equipment.slice(0, 10)));
          }
          usedFilters.add('equipment');
        } else if (filters.primaryMuscle) {
          baseConstraints.push(where('primary_muscles', 'array-contains', filters.primaryMuscle));
          usedFilters.add('primaryMuscle');
        } else if (filters.searchTerm) {
          // Tokenize search term and use the first word for Firestore query
          const searchWords = filters.searchTerm.toLowerCase().trim().split(/\s+/);
          const firstWord = searchWords[0];
          baseConstraints.push(where('searchKeywords', 'array-contains', firstWord));
          usedFilters.add('searchTerm');
        }

        // Sorting
        const sortBy = filters.sortBy || 'name';
        const sortDirection = filters.sortDirection || 'asc';
        baseConstraints.push(orderBy(sortBy, sortDirection));

        // Larger page size for client-side filtering
        const pageSize = Math.max(filters.pageSize || 50, 50);
        baseConstraints.push(limit(pageSize));

        if (filters.lastDoc) {
          baseConstraints.push(startAfter(filters.lastDoc));
        }

        // Execute the base query
        const finalQuery = query(exercisesRef, ...baseConstraints);
        const snapshot = await getDocs(finalQuery);

        let exercises: Exercise[] = snapshot.docs.map(doc => {
          const data = doc.data() as FirestoreExercise;
          return {
            id: doc.id,
            name: data.name,
            category: data.category,
            primary_muscles: data.primary_muscles,
            secondary_muscles: data.secondary_muscles,
            equipment: data.equipment,
            instructions: data.instructions,
            description: data.description,
            tips: data.tips,
            difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
            variation_on: data.variation_on,
            video: data.video,
          };
        });

        // Apply client-side filtering for remaining criteria and calculate relevance scores
        const exercisesWithScores = exercises.map(exercise => ({ exercise, relevanceScore: 0 }))
          .filter(({ exercise }) => {
            // Apply filters that weren't used in the Firestore query
            
            // Equipment filter (if not used in query)
            if (filters.equipment && filters.equipment.length > 0 && !usedFilters.has('equipment')) {
              const hasEquipment = filters.equipment.some(eq => exercise.equipment.includes(eq));
              if (!hasEquipment) return false;
            }

            // Primary muscle filter (if not used in query)
            if (filters.primaryMuscle && !usedFilters.has('primaryMuscle')) {
              if (!exercise.primary_muscles.includes(filters.primaryMuscle)) return false;
            }

            // Secondary muscle filter
            if (filters.secondaryMuscle) {
              if (!exercise.secondary_muscles.includes(filters.secondaryMuscle)) return false;
            }

            // Difficulty filter
            if (filters.difficulty) {
              if (exercise.difficulty !== filters.difficulty) return false;
            }

            return true;
          })
          .map(({ exercise }) => {
            let relevanceScore = 0;
            
            // Calculate relevance score for search terms
            if (filters.searchTerm) {
              const searchTerms = filters.searchTerm.toLowerCase().trim().split(/\s+/);
              
              // For multi-word searches, always apply client-side filtering
              // For single-word searches, only apply if not used in Firestore query
              if (searchTerms.length > 1 || !usedFilters.has('searchTerm')) {
                const exerciseName = exercise.name.toLowerCase();
                const category = exercise.category.toLowerCase();
                const primaryMuscles = exercise.primary_muscles.map(m => m.toLowerCase());
                const secondaryMuscles = exercise.secondary_muscles.map(m => m.toLowerCase());
                const equipment = exercise.equipment.map(e => e.toLowerCase());
                
                let matchedTerms = 0;
                let nameRelevanceScore = 0;
                
                for (const term of searchTerms) {
                  let termMatchedAnywhere = false;
                  
                  // Primary check: Exercise name contains the term
                  if (exerciseName.includes(term)) {
                    nameRelevanceScore += exerciseName.match(new RegExp(`\\b${term}\\b`)) ? 10 : 5;
                    termMatchedAnywhere = true;
                  }
                  
                  // Secondary checks: Only if name doesn't contain all terms
                  if (!termMatchedAnywhere) {
                    if (category.includes(term)) {
                      relevanceScore += 2;
                      termMatchedAnywhere = true;
                    } else if (primaryMuscles.some(muscle => muscle.includes(term))) {
                      relevanceScore += 1;
                      termMatchedAnywhere = true;
                    } else if (equipment.some(eq => eq.includes(term))) {
                      relevanceScore += 1;
                      termMatchedAnywhere = true;
                    }
                  }
                  
                  if (termMatchedAnywhere) {
                    matchedTerms++;
                  }
                }
                
                // Debug logging for search term matching
                if (searchTerms.length >= 3 && exerciseName.includes('dumbbell')) {
                  console.log(`🔍 Checking exercise: "${exercise.name}"`);
                  console.log(`🔍 Normalized name: "${exerciseName}"`);
                  console.log(`🔍 Search words: [${searchTerms.join(', ')}]`);
                  console.log(`🔍 Matched terms: ${matchedTerms}/${searchTerms.length}`);
                  console.log(`🔍 Name relevance score: ${nameRelevanceScore}`);
                  const nameMatches = searchTerms.filter(term => exerciseName.includes(term)).length;
                  console.log(`🔍 Terms in name: ${nameMatches}`);
                }
                
                // For multi-word searches, be very strict
                if (searchTerms.length > 1) {
                  // All terms must be matched
                  if (matchedTerms !== searchTerms.length) {
                    return null; // Filter out
                  }
                  
                  // For 3+ word searches, prioritize name matches but don't require ALL terms in name
                  if (searchTerms.length >= 3) {
                    // Require at least 2 terms to appear in exercise name for 3+ word searches
                    const nameMatches = searchTerms.filter(term => exerciseName.includes(term)).length;
                    if (nameMatches < 2) {
                      return null; // Filter out if name doesn't contain at least 2 terms
                    }
                  }
                  
                  // Require some name relevance score for multi-word searches
                  if (nameRelevanceScore < searchTerms.length) {
                    return null; // Filter out if not enough name relevance (lowered threshold)
                  }
                }
                
                relevanceScore += nameRelevanceScore;
              }
            }
            
            return { exercise, relevanceScore };
          })
          .filter(item => item !== null) // Remove filtered out items
          .sort((a, b) => {
            // Sort by relevance score descending, then by name ascending
            if (filters.searchTerm && a.relevanceScore !== b.relevanceScore) {
              return b.relevanceScore - a.relevanceScore;
            }
            return a.exercise.name.localeCompare(b.exercise.name);
          });

        const sortedExercises = exercisesWithScores.map(item => item.exercise);

        return {
          data: sortedExercises,
          lastDoc: snapshot.docs[snapshot.docs.length - 1] || null,
          hasMore: snapshot.docs.length === pageSize,
        };
      }
    } catch (error) {
      console.error('Error searching exercises:', error);
      return {
        data: [],
        lastDoc: null,
        hasMore: false,
      };
    }
  }

  /**
   * Get exercise by ID
   */
  async getExerciseById(id: string): Promise<Exercise | null> {
    try {
      const exerciseRef = doc(db, this.exercisesCollection, id);
      const exerciseSnap = await getDoc(exerciseRef);

      if (!exerciseSnap.exists()) {
        return null;
      }

      const data = exerciseSnap.data() as FirestoreExercise;
      return {
        id: exerciseSnap.id,
        name: data.name,
        category: data.category,
        primary_muscles: data.primary_muscles,
        secondary_muscles: data.secondary_muscles,
        equipment: data.equipment,
        instructions: data.instructions,
        description: data.description,
        tips: data.tips,
        difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
        variation_on: data.variation_on,
        video: data.video,
      };
    } catch (error) {
      console.error('Error fetching exercise by ID:', error);
      return null;
    }
  }

  /**
   * Get exercises by category
   */
  async getExercisesByCategory(category: string, pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ category, pageSize });
  }

  /**
   * Get exercises by muscle group
   */
  async getExercisesByMuscle(muscle: string, pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ primaryMuscle: muscle, pageSize });
  }

  /**
   * Get exercises by equipment
   */
  async getExercisesByEquipment(equipment: string[], pageSize = 20): Promise<PaginatedResult<Exercise>> {
    return this.searchExercises({ equipment, pageSize });
  }

  /**
   * Get popular/featured exercises
   */
  async getPopularExercises(pageSize = 10): Promise<Exercise[]> {
    try {
      // Get exercises from popular categories
      const popularCategories = ['strength', 'cardio', 'plyometrics'];
      const exercisesRef = collection(db, this.exercisesCollection);
      
      const q = query(
        exercisesRef,
        where('category', 'in', popularCategories),
        orderBy('name'),
        limit(pageSize)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles,
          secondary_muscles: data.secondary_muscles,
          equipment: data.equipment,
          instructions: data.instructions,
          description: data.description,
          tips: data.tips,
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on,
          video: data.video,
        };
      });
    } catch (error) {
      console.error('Error fetching popular exercises:', error);
      return [];
    }
  }

  /**
   * Get similar exercises based on muscle groups
   */
  async getSimilarExercises(exerciseId: string, maxResults = 5): Promise<Exercise[]> {
    try {
      const exercise = await this.getExerciseById(exerciseId);
      if (!exercise) return [];

      const exercisesRef = collection(db, this.exercisesCollection);
      
      // Find exercises with similar primary muscles
      const q = query(
        exercisesRef,
        where('primary_muscles', 'array-contains-any', exercise.primary_muscles),
        where('id', '!=', exerciseId),
        orderBy('name'),
        limit(maxResults)
      );

      const snapshot = await getDocs(q);
      return snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles,
          secondary_muscles: data.secondary_muscles,
          equipment: data.equipment,
          instructions: data.instructions,
          description: data.description,
          tips: data.tips,
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on,
          video: data.video,
        };
      });
    } catch (error) {
      console.error('Error fetching similar exercises:', error);
      return [];
    }
  }

  /**
   * Get all exercises without filters (for testing)
   */
  async getAllExercisesSimple(pageSize = 20): Promise<Exercise[]> {
    try {
      console.log('🔍 Getting all exercises (simple query)...');
      const exercisesRef = collection(db, this.exercisesCollection);
      const q = query(exercisesRef, limit(pageSize));
      const snapshot = await getDocs(q);
      
      console.log('📊 Simple query returned:', snapshot.docs.length, 'exercises');
      
      const exercises: Exercise[] = snapshot.docs.map(doc => {
        const data = doc.data() as FirestoreExercise;
        return {
          id: doc.id,
          name: data.name,
          category: data.category,
          primary_muscles: data.primary_muscles || [],
          secondary_muscles: data.secondary_muscles || [],
          equipment: data.equipment || [],
          instructions: data.instructions || [],
          description: data.description || '',
          tips: data.tips || [],
          difficulty: this.mapDifficultyLevel(data.difficulty || data.level),
          variation_on: data.variation_on || [],
          video: data.video,
        };
      });
      
      if (exercises.length > 0) {
        console.log('📋 First exercise:', exercises[0]);
      }
      
      return exercises;
    } catch (error) {
      console.error('❌ Error getting all exercises:', error);
      return [];
    }
  }

  /**
   * Check if exercises exist in Firestore and get count
   */
  async hasExercises(): Promise<boolean> {
    try {
      console.log('🔍 Checking if exercises exist in Firestore...');
      const exercisesRef = collection(db, this.exercisesCollection);
      const q = query(exercisesRef, limit(10));
      const snapshot = await getDocs(q);
      const hasExercises = !snapshot.empty;
      console.log('📊 Firestore exercises check:', hasExercises ? `Found ${snapshot.docs.length} exercises` : 'No exercises found');
      
      if (hasExercises) {
        // Log some sample exercise names to verify data structure
        const sampleExercises = snapshot.docs.map(doc => {
          const data = doc.data();
          return { id: doc.id, name: data.name, category: data.category };
        });
        console.log('📋 Sample exercises:', sampleExercises);
      }
      
      return hasExercises;
    } catch (error) {
      console.error('❌ Error checking if exercises exist:', error);
      return false;
    }
  }

  /**
   * Debug function to test basic Firestore connectivity
   */
  async debugFirestoreConnection(): Promise<void> {
    console.log('🔍 Testing Firestore connection...');
    
    try {
      // Test 1: Check exercises collection
      const exercisesRef = collection(db, this.exercisesCollection);
      const exercisesSnapshot = await getDocs(query(exercisesRef, limit(5)));
      console.log('📊 Exercises collection:', exercisesSnapshot.size, 'documents found');
      
      if (exercisesSnapshot.size > 0) {
        const firstDoc = exercisesSnapshot.docs[0];
        console.log('🔍 First exercise document:', {
          id: firstDoc.id,
          name: firstDoc.data().name,
          category: firstDoc.data().category,
          hasSearchKeywords: !!firstDoc.data().searchKeywords
        });
      }

      // Test 2: Check metadata collection
      const metadataRef = doc(db, 'exercise_metadata', 'current');
      const metadataSnap = await getDoc(metadataRef);
      console.log('📊 Metadata document exists:', metadataSnap.exists());
      
      if (metadataSnap.exists()) {
        const metadata = metadataSnap.data();
        console.log('🔍 Metadata:', {
          totalExercises: metadata.totalExercises,
          categoriesCount: metadata.categories?.length || 0,
          equipmentCount: metadata.equipment?.length || 0,
          musclesCount: metadata.muscles?.length || 0
        });
      }

    } catch (error) {
      console.error('❌ Firestore connection test failed:', error);
    }
  }

  /**
   * Debug function to test search functionality
   */
  async debugSearch(searchTerm: string): Promise<void> {
    console.log('🔍 Testing search for:', searchTerm);
    
    try {
      const exercisesRef = collection(db, this.exercisesCollection);
      
      // Test 1: Simple name search
      const nameQuery = query(
        exercisesRef,
        where('name', '>=', searchTerm),
        where('name', '<=', searchTerm + '\uf8ff'),
        limit(5)
      );
      const nameSnapshot = await getDocs(nameQuery);
      console.log('📊 Name search results:', nameSnapshot.size);

      // Test 2: Search keywords search
      const keywordQuery = query(
        exercisesRef,
        where('searchKeywords', 'array-contains', searchTerm.toLowerCase()),
        limit(5)
      );
      const keywordSnapshot = await getDocs(keywordQuery);
      console.log('📊 Keyword search results:', keywordSnapshot.size);

      // Test 3: Get all exercises and filter client-side
      const allQuery = query(exercisesRef, limit(20));
      const allSnapshot = await getDocs(allQuery);
      const clientFilteredResults = allSnapshot.docs.filter(doc => {
        const data = doc.data();
        return data.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               data.category?.toLowerCase().includes(searchTerm.toLowerCase()) ||
               data.primary_muscles?.some((muscle: string) => muscle.toLowerCase().includes(searchTerm.toLowerCase()));
      });
      console.log('📊 Client-side filtered results:', clientFilteredResults.length);

    } catch (error) {
      console.error('❌ Search test failed:', error);
    }
  }

  /**
   * Map difficulty/level string to the correct enum values
   */
  private mapDifficultyLevel(level?: string): "Beginner" | "Intermediate" | "Advanced" | undefined {
    if (!level) return undefined;
    
    const lowerLevel = level.toLowerCase();
    switch (lowerLevel) {
      case 'beginner':
      case 'easy':
      case 'novice':
        return 'Beginner';
      case 'intermediate':
      case 'medium':
      case 'moderate':
        return 'Intermediate';
      case 'advanced':
      case 'hard':
      case 'expert':
        return 'Advanced';
      default:
        console.warn('Unknown difficulty level:', level);
        return undefined;
    }
  }
}

// Export singleton instance
export const firestoreExerciseService = new FirestoreExerciseService();
export default firestoreExerciseService;
