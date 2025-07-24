import 'react-native-gesture-handler/jestSetup';

// Mock AsyncStorage
jest.mock('@react-native-async-storage/async-storage', () =>
  require('@react-native-async-storage/async-storage/jest/async-storage-mock')
);

// Mock Environment Variables
process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID = 'test-web-client-id';
process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID = 'test-ios-client-id';

// Global React Native Platform mock
global.Platform = {
  OS: 'ios',
  Version: '14.0',
  constants: {},
  select: jest.fn((specifics) => specifics.ios || specifics.default),
};

// Mock React Native Platform
jest.mock('react-native/Libraries/Utilities/Platform', () => global.Platform);

// Mock React Native modules
jest.mock('react-native', () => {
  const RN = jest.requireActual('react-native');
  
  // Mock Platform globally before any other operations
  const MockPlatform = global.Platform || {
    OS: 'ios',
    Version: '14.0',
    constants: {},
    select: jest.fn((specifics) => specifics.ios || specifics.default),
  };
  
  // Provide a basic structure without requiring actual RN
  return {
    Platform: MockPlatform,
    LogBox: {
      ignoreLogs: jest.fn(),
    },
    TurboModuleRegistry: {
      getEnforcing: jest.fn(),
    },
    NativeModules: {
      DevMenu: {},
    },
    Dimensions: {
      get: jest.fn(() => ({ width: 375, height: 667 })),
    },
    StyleSheet: {
      create: jest.fn(styles => styles),
      flatten: jest.fn(style => style),
    },
    // Mock common components
    View: 'View',
    Text: 'Text',
    ScrollView: 'ScrollView',
    TouchableOpacity: 'TouchableOpacity',
    Modal: 'Modal',
    Image: 'Image',
  };
});

// Mock Firebase Auth service specifically
jest.mock('./services/firebaseAuthService', () => ({
  firebaseAuthService: {
    signOut: jest.fn(() => Promise.resolve()),
    initialize: jest.fn(() => Promise.resolve()),
    signInWithGoogle: jest.fn(),
    signInWithApple: jest.fn(),
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    getCurrentUser: jest.fn(),
    onAuthStateChanged: jest.fn(),
    saveUserTokens: jest.fn(() => Promise.resolve()),
    restoreUserFromTokens: jest.fn(() => Promise.resolve(null)),
    getCurrentIdToken: jest.fn(() => Promise.resolve(null)),
    handleGoogleSignInCredentials: jest.fn(),
    isUserAuthenticated: jest.fn(() => Promise.resolve(false)),
    getAuthStatus: jest.fn(() => Promise.resolve({ 
      isAuthenticated: false, 
      user: null, 
      tokens: null 
    })),
    reset: jest.fn(() => Promise.resolve()),
  },
}));

// Mock Firebase
jest.mock('./firebase', () => ({
  auth: {
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  },
  db: {
    collection: jest.fn(),
    doc: jest.fn(),
  },
}));

// Mock Firebase Auth functions
jest.mock('firebase/auth', () => ({
  getAuth: jest.fn(() => ({
    currentUser: null,
    signInWithEmailAndPassword: jest.fn(),
    createUserWithEmailAndPassword: jest.fn(),
    signOut: jest.fn(),
    onAuthStateChanged: jest.fn(),
  })),
  signInWithEmailAndPassword: jest.fn(),
  createUserWithEmailAndPassword: jest.fn(),
  signOut: jest.fn(),
  onAuthStateChanged: jest.fn(),
  GoogleAuthProvider: {
    credential: jest.fn(),
  },
  signInWithCredential: jest.fn(),
}));

// Mock Firestore functions
jest.mock('firebase/firestore', () => ({
  getFirestore: jest.fn(),
  doc: jest.fn(() => ({ id: 'mocked-doc-ref' })),
  getDoc: jest.fn(() => Promise.resolve({
    exists: () => true,
    data: () => ({
      id: 'test-uid',
      uid: 'test-uid',
      email: 'test@example.com',
      firstName: 'Test',
      lastName: 'User',
      displayName: 'Test User',
      createdAt: '2023-01-01T00:00:00.000Z',
    }),
  })),
  setDoc: jest.fn(() => Promise.resolve()),
  collection: jest.fn(),
  getDocs: jest.fn(),
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
}));

// Mock Expo Router
jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    back: jest.fn(),
  }),
  useLocalSearchParams: () => ({}),
}));

// Mock CrashLogger
jest.mock('./utils/crashLogger', () => ({
  __esModule: true,
  default: {
    init: jest.fn(),
    logAuthStep: jest.fn(),
    logFirebaseStep: jest.fn(),
    logGoogleSignInStep: jest.fn(),
    recordError: jest.fn(),
    setUserId: jest.fn(),
    setUserAttributes: jest.fn(),
  },
}));

// Mock Google Sign-In
jest.mock('@react-native-google-signin/google-signin', () => ({
  GoogleSignin: {
    configure: jest.fn(),
    hasPlayServices: jest.fn(() => Promise.resolve(true)),
    signIn: jest.fn(),
    signOut: jest.fn(),
    revokeAccess: jest.fn(),
    isSignedIn: jest.fn(() => Promise.resolve(false)),
  },
}));

// Mock React Native Reanimated
jest.mock('react-native-reanimated', () => {
  return {
    useSharedValue: jest.fn(() => ({ value: 0 })),
    useAnimatedStyle: jest.fn(() => ({})),
    useDerivedValue: jest.fn(),
    useAnimatedGestureHandler: jest.fn(),
    useAnimatedScrollHandler: jest.fn(),
    useAnimatedRef: jest.fn(),
    runOnJS: jest.fn((fn) => fn),
    runOnUI: jest.fn((fn) => fn),
    withSpring: jest.fn((value) => value),
    withTiming: jest.fn((value) => value),
    withRepeat: jest.fn((value) => value),
    withSequence: jest.fn((value) => value),
    Easing: {
      linear: jest.fn(),
      ease: jest.fn(),
      quad: jest.fn(),
      cubic: jest.fn(),
    },
    Extrapolate: {
      EXTEND: 'extend',
      CLAMP: 'clamp',
      IDENTITY: 'identity',
    },
    interpolate: jest.fn(),
  };
});

// Global test timeout
jest.setTimeout(10000);

// Clean up any open handles before tests exit
afterAll(() => {
  // Clear any remaining timers
  jest.clearAllTimers();
});
