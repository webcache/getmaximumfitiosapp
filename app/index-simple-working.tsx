import { Text, View } from 'react-native';

export default function App() {
  console.log('✅ INDEX.TSX IS LOADING!');
  return (
    <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#00FF00' }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold' }}>✅ SUCCESS! CUSTOM APP LOADED!</Text>
      <Text style={{ fontSize: 16 }}>The expo-router is working!</Text>
    </View>
  );
}
