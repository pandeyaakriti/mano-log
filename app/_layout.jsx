import { Stack } from "expo-router";
import { useFonts } from "expo-font";

export default function RootLayout() {

  useFonts({
    'DancingScript': require('../assets/fonts/DancingScript.ttf'),
    'Instrument': require('../assets/fonts/InstrumentSans.ttf'),
    'BreeSerif': require('../assets/fonts/BreeSerif-Regular.ttf'),
  })

  return (
    <Stack>
      <Stack.Screen name="index" options={{ headerShown: false }} />
      <Stack.Screen name="login" options={{ headerShown: false }} />
      <Stack.Screen name="signup" options={{ headerShown: false }} />
    </Stack>);

}
