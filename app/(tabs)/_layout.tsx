import { Feather, Ionicons } from '@expo/vector-icons';
import { Tabs, usePathname, useRouter } from "expo-router";
import { Platform, StyleSheet, TouchableOpacity, View } from "react-native";

export default function TabsLayout() {
  const router = useRouter();
  const pathname = usePathname();
  const isChatScreen = pathname.endsWith("/chat");

  return (
    <>
      <Tabs
        screenOptions={{
          tabBarShowLabel: false,
          tabBarStyle: {
            backgroundColor: "#fff",
            height: 70,
            borderTopLeftRadius: 20,
            borderTopRightRadius: 20,
            position: "absolute",
            paddingBottom: Platform.OS === "android" ? 10 : 30,
            paddingTop: 10,
          },
          headerShown: false,
        }}>
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                name={focused ? "home" : "home-outline"} 
                size={24} 
                color="#754491" 
              />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            tabBarIcon: ({ focused }) => (
              <Ionicons 
                name={focused ? "chatbubble-ellipses" : "chatbubble-ellipses-outline"} 
                size={24} 
                color="#754491" 
              />
            ),
            tabBarStyle: { display: 'none' },
          }}
        />

        {/* Center Placeholder for Floating Button */}
        <Tabs.Screen
          name="placeholder"
          options={{
            tabBarButton: () => (
              <View style={styles.centerButtonPlaceholder} />
            ),
          }}
        />

        <Tabs.Screen
          name="trends"
          options={{
            tabBarIcon: ({ focused }) => (
              <Feather 
                name="bar-chart-2" 
                size={24} 
                color="#754491" 
              />
            ),
          }}
        />

        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ focused }) => (
              <Feather 
                name="settings" 
                size={24} 
                color="#754491" 
              />
            ),
          }}
        />
      </Tabs>

      {/* Floating + Journal Button */}
      {!isChatScreen && (
        <TouchableOpacity
          onPress={() => router.push("/journal")}
          style={styles.floatingButton}
          activeOpacity={0.8}>
          <Ionicons name="add" size={28} color="#754491" />
        </TouchableOpacity>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  centerButtonPlaceholder: {
    width: 70,
    height: 70,
  },
  floatingButton: {
    position: "absolute",
    bottom: Platform.OS === "ios" ? 45 : 40,
    left: "50%",
    marginLeft: -35, // Half of width to center
    backgroundColor: "#fff",
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#754491",
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 5,
    elevation: 8,
    zIndex: 10,
    borderWidth: 3,
    borderColor: "#754491",
  },
});