import { Ionicons } from '@expo/vector-icons';
import { Tabs } from 'expo-router';




export default function TabLayout() {
  return (
    <Tabs
      screenOptions={({ route }) => ({

        tabBarActiveTintColor: '#9A5DC6',
        tabBarInactiveTintColor: 'gray',
        tabBarStyle: { backgroundColor: '#fff6f6f6', height: 66, width: 416, borderTopWidth: 0, position: 'absolute', bottom: 0, left: 0, right: 0 },
        headerShown: false,
        tabBarIcon: ({ color, size }) => {
          let iconName: any;

          switch (route.name) {
            case 'index':
              iconName = 'home-outline';
              break;
            case 'journal':
              iconName = 'book-outline';
              break;
            case 'mood':
              iconName = 'happy-outline';
              break;
            case 'insights':
              iconName = 'chatbubble-ellipses-outline';
              break;
            case 'chat':
              iconName = 'person-outline';
              break;
            case 'trends':
              iconName = 'bar-chart-outline';
              break;
          }

          return <Ionicons name={iconName} size={size} color={color} />;
        },
      })}
    />
  );
}
