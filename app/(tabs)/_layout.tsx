import { Tabs } from 'expo-router';
import { Platform } from 'react-native';

import FontAwesome5 from '@expo/vector-icons/FontAwesome5';
import { HapticTab } from '../../components/HapticTab';
import { WorkoutsTabButton } from '../../components/WorkoutsTabButton';
import { useColorScheme } from '../../hooks/useColorScheme';
import { useDynamicThemeColor } from '../../hooks/useThemeColor';

export default function TabLayout() {
  const colorScheme = useColorScheme();
  const { themeColor } = useDynamicThemeColor();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: themeColor,
        headerShown: false,
        tabBarButton: HapticTab,
        tabBarStyle: Platform.select({
          ios: {
            // Use a transparent background on iOS to show the blur effect
            position: 'absolute',
          },
          default: {},
        }),
      }}>
      <Tabs.Screen
        name="dashboard"
        options={{
          title: 'Dashboard',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="tachometer-alt" color={color} />,
        }}
      />
      <Tabs.Screen
        name="progress"
        options={{
          title: 'Progress',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="chart-line" color={color} />,
        }}
      />
      <Tabs.Screen
        name="workouts"
        options={{
          title: 'Workouts',
          headerShown: false,
          tabBarButton: (props) => (
            <WorkoutsTabButton 
              onPress={() => props.onPress?.({} as any)} 
              focused={props.accessibilityState?.selected || false} 
            />
          ),
        }}
      />      <Tabs.Screen
        name="settings"
        options={{
          title: 'Settings',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="cog" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          headerShown: false,
          tabBarIcon: ({ color }) => <FontAwesome5 size={24} name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
