// File: (tabs)/insights.tsx
import React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const moodtrack= () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Insights</Text>
      <Text style={styles.subtitle}>Coming soon...</Text>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#754491',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
});

export default moodtrack;
