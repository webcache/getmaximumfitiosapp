# GetMaximumFit iOS App

A React Native fitness app built with Expo, featuring Firebase authentication, AI-powered fitness assistant, and workout tracking capabilities.

## 🚀 Quick Start

### Prerequisites

Before setting up the development environment, ensure you have the following installed:

- **Node.js** (v18 or later) - [Download here](https://nodejs.org/)
- **npm** or **yarn** package manager
- **Git** - [Download here](https://git-scm.com/)
- **Expo CLI** - Install globally: `npm install -g @expo/cli`
- **EAS CLI** (for builds) - Install globally: `npm install -g eas-cli`

### iOS Development (Optional)
- **Xcode** (latest version) - Available on Mac App Store
- **iOS Simulator** (included with Xcode)

### Android Development (Optional)
- **Android Studio** - [Download here](https://developer.android.com/studio)
- **Android SDK** and **Android Virtual Device (AVD)**

## 📦 Project Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/getmaximumfitiosapp.git
cd getmaximumfitiosapp
```

### 2. Install Dependencies

```bash
# Install all project dependencies
npm install

# Or if you prefer yarn
yarn install
```

### 3. Environment Variables Setup

Create a `.env` file in the root directory with the following variables:

```env
# Firebase Configuration
EXPO_PUBLIC_FIREBASE_API_KEY=your_firebase_api_key
EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN=your_project.firebaseapp.com
EXPO_PUBLIC_FIREBASE_DATABASE_URL=https://your_project-default-rtdb.firebaseio.com
EXPO_PUBLIC_FIREBASE_PROJECT_ID=your_project_id
EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET=your_project.firebasestorage.app
EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=your_sender_id
EXPO_PUBLIC_FIREBASE_APP_ID=your_app_id
EXPO_PUBLIC_FIREBASE_MEASUREMENT_ID=your_measurement_id

# OpenAI Configuration
OPENAI_API_KEY=your_openai_api_key

# API Configuration
EXPO_PUBLIC_API_BASE_URL=https://your-production-domain.com

# Environment
ENV=development
```

### 4. Firebase Setup

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Create a new project or use existing one
3. Enable Authentication (Email/Password)
4. Enable Firestore Database
5. Get your Firebase configuration values from Project Settings
6. Update the `.env` file with your Firebase credentials

### 5. OpenAI Setup

1. Go to [OpenAI Platform](https://platform.openai.com/)
2. Create an API key
3. Add the API key to your `.env` file

## 🏗️ Project Dependencies

### Main Dependencies

```json
{
  "@ai-sdk/openai": "^1.3.23",
  "@ai-sdk/react": "^1.2.12",
  "@expo/vector-icons": "^14.1.0",
  "@react-native-async-storage/async-storage": "2.1.2",
  "@react-navigation/bottom-tabs": "^7.3.10",
  "@react-navigation/elements": "^2.3.8",
  "@react-navigation/native": "^7.1.6",
  "ai": "^4.3.17",
  "expo": "^53.0.19",
  "expo-router": "~5.1.3",
  "firebase": "^10.3.1",
  "react": "19.0.0",
  "react-native": "0.79.5"
}
```

### Development Dependencies

```json
{
  "@babel/core": "^7.25.2",
  "@types/react": "~19.0.10",
  "eslint": "^9.25.0",
  "eslint-config-expo": "~9.2.0",
  "typescript": "~5.8.3"
}
```

## 🛠️ Development Commands

### Start Development Server

```bash
# Start Expo development server
npm start

# Start with cache cleared
npm start -- --clear

# Start web version
npm run web

# Start iOS simulator (Mac only)
npm run ios

# Start Android emulator
npm run android
```

### Code Quality

```bash
# Run ESLint
npm run lint

# Reset project (removes node_modules and reinstalls)
npm run reset-project
```

## 📱 Running the App

### Development Mode

1. Start the development server:
   ```bash
   npm start
   ```

2. Choose your platform:
   - **iOS Simulator**: Press `i` in terminal (Mac only)
   - **Android Emulator**: Press `a` in terminal
   - **Web Browser**: Press `w` in terminal
   - **Physical Device**: Install Expo Go app and scan QR code

### Production Builds

```bash
# Login to EAS (first time only)
eas login

# Build for iOS
eas build --platform ios

# Build for Android
eas build --platform android

# Build for both platforms
eas build --platform all
```

## 🏗️ Project Structure

```
getmaximumfitiosapp/
├── app/                          # App router pages
│   ├── (tabs)/                   # Tab navigation
│   │   ├── dashboard.tsx         # Main dashboard
│   │   ├── profile.tsx           # User profile
│   │   ├── progress.tsx          # Progress tracking
│   │   └── explore.tsx           # Workout library
│   ├── api/                      # API routes
│   │   └── ai/
│   │       └── chat+api.ts       # OpenAI chat endpoint
│   ├── login/                    # Authentication
│   │   └── loginScreen.tsx       # Login/signup screen
│   └── _layout.tsx               # Root layout
├── components/                   # Reusable components
├── contexts/                     # React contexts
│   └── AuthContext.tsx           # Authentication context
├── assets/                       # Images, fonts, etc.
├── firebase.ts                   # Firebase configuration
├── utils.ts                      # Utility functions
├── .env                          # Environment variables
├── app.json                      # Expo configuration
├── eas.json                      # EAS build configuration
└── package.json                  # Dependencies
```

## 🔧 Key Features

### Authentication
- Firebase Authentication with email/password
- User profile management
- Persistent login state with AsyncStorage

### AI Chat Assistant
- OpenAI-powered fitness assistant
- Real-time chat interface
- Personalized fitness advice

### Workout Tracking
- Last workout display
- Firestore data persistence
- Exercise history

### Navigation
- Tab-based navigation
- FontAwesome5 icons
- Safe area handling

## 🚨 Troubleshooting

### Common Issues

1. **Metro bundler issues**
   ```bash
   npm start -- --clear
   ```

2. **iOS simulator not opening**
   - Ensure Xcode is installed
   - Check iOS simulator is available

3. **Firebase authentication errors**
   - Verify `.env` file has correct Firebase config
   - Check Firebase project settings

4. **OpenAI API errors**
   - Verify API key is valid
   - Check API usage limits

### Environment Variables Not Loading

If environment variables aren't loading:
1. Restart the development server
2. Ensure `.env` file is in root directory
3. Check variable names start with `EXPO_PUBLIC_` for client-side access

## 📄 License

This project is private and proprietary.

## 🤝 Contributing

1. Create a feature branch
2. Make your changes
3. Test thoroughly
4. Submit a pull request

## 📞 Support

For issues and questions, please create an issue in the GitHub repository.

---

**Note**: This is a React Native app built with Expo. Make sure you have the latest versions of Node.js and Expo CLI installed for the best development experience.
   
   Then edit the `.env` file with your Firebase credentials and other configuration values.

3. Start the app

   ```bash
   npx expo start
   ```

In the output, you'll find options to open the app in a

- [development build](https://docs.expo.dev/develop/development-builds/introduction/)
- [Android emulator](https://docs.expo.dev/workflow/android-studio-emulator/)
- [iOS simulator](https://docs.expo.dev/workflow/ios-simulator/)
- [Expo Go](https://expo.dev/go), a limited sandbox for trying out app development with Expo

You can start developing by editing the files inside the **app** directory. This project uses [file-based routing](https://docs.expo.dev/router/introduction).

## Get a fresh project

When you're ready, run:

```bash
npm run reset-project
```

This command will move the starter code to the **app-example** directory and create a blank **app** directory where you can start developing.

## Learn more

To learn more about developing your project with Expo, look at the following resources:

- [Expo documentation](https://docs.expo.dev/): Learn fundamentals, or go into advanced topics with our [guides](https://docs.expo.dev/guides).
- [Learn Expo tutorial](https://docs.expo.dev/tutorial/introduction/): Follow a step-by-step tutorial where you'll create a project that runs on Android, iOS, and the web.

## Environment Variables

This project uses environment variables to manage sensitive configuration like API keys and Firebase credentials. These are stored in the `.env` file which is not committed to the repository for security reasons.

### Required Environment Variables

- `FIREBASE_API_KEY`: Firebase API key
- `FIREBASE_AUTH_DOMAIN`: Firebase authentication domain
- `FIREBASE_DATABASE_URL`: Firebase database URL
- `FIREBASE_PROJECT_ID`: Firebase project ID
- `FIREBASE_STORAGE_BUCKET`: Firebase storage bucket
- `FIREBASE_MESSAGING_SENDER_ID`: Firebase messaging sender ID
- `FIREBASE_APP_ID`: Firebase application ID
- `FIREBASE_MEASUREMENT_ID`: Firebase measurement ID (for Google Analytics)

### Using Environment Variables

To use an environment variable in your code:

```javascript
import { FIREBASE_API_KEY } from '@env';

console.log(FIREBASE_API_KEY);
```

## Join the community

Join our community of developers creating universal apps.

- [Expo on GitHub](https://github.com/expo/expo): View our open source platform and contribute.
- [Discord community](https://chat.expo.dev): Chat with Expo users and ask questions.
