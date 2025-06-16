//import { Feather, Ionicons } from "@expo/vector-icons";
import { Feather, Ionicons } from '@expo/vector-icons';

import { Tabs, useRouter } from "expo-router";
import { Platform, StyleSheet, Text, TouchableOpacity } from "react-native";

export default function Layout() {
  const router = useRouter();

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
          },
          headerShown: false,
        }}
      >
        <Tabs.Screen
          name="index"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="home-outline" size={28} color="#754491" />
            ),
          }}
        />
        <Tabs.Screen
          name="trends"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="bar-chart-2" size={28} color="#754491" />
            ),
          }}
        />
        <Tabs.Screen
          name="chat"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Ionicons name="chatbubble-ellipses-outline" size={28} color="#754491" />
            ),
          }}
        />
        <Tabs.Screen
          name="settings"
          options={{
            tabBarIcon: ({ color, size }) => (
              <Feather name="settings" size={28} color="#754491" />
            ),
          }}
        />
      </Tabs>

      {/* Floating Journal Button */}
      <TouchableOpacity
        onPress={() => router.push("/journal")}
        style={styles.floatingButton}
      >
        <Text style={styles.plusIcon}>＋</Text>
      </TouchableOpacity>
    </>
  );
}

const styles = StyleSheet.create({
  floatingButton: {
    position: "absolute",
    bottom: 35,
    alignSelf: "center",
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
  },
  plusIcon: {
    fontSize: 40,
    color: "#754491",
    marginTop: -4,
  },
});
