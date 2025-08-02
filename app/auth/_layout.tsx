//app/auth/_layout.tsx
import { Stack } from 'expo-router';
import { StyleSheet, View } from 'react-native';

export default function AuthLayout() {
  return (
    <View style={styles.container}>
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="login" />
        <Stack.Screen name="signup" />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});