import { Redirect } from 'expo-router';

export default function TabsIndex() {
  // Redirect to dashboard as the default tab
  return <Redirect href="/(tabs)/dashboard" />;
}
