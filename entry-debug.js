console.log('🚀 EXPO ROUTER ENTRY POINT LOADED');
console.log('📁 Looking for routes in app directory...');

// This should help us debug what's happening
import { registerRootComponent } from 'expo';
import { ExpoRoot } from 'expo-router';

function App() {
  console.log('🔥 ExpoRoot component is being rendered');
  return <ExpoRoot context={require.context('./app')} />;
}

registerRootComponent(App);
