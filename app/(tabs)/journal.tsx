import { StyleSheet, Text, View } from "react-native";


const Journal = () => {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Journals </Text>
      <Text style={styles.subtitle}> your log of minds</Text>
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

//export default Journal;


