import { Text, View } from "react-native";

export default function journal() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>journal is in progress</Text>
    </View>
  );
}
// Compare this snippet from app/%28tabs%29/settings.tsx:
// import { View, Text, StyleSheet } from 'react-native';