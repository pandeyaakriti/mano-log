import React, { useState } from 'react';
import {
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function Homepage() {
  const [reflection, setReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);

  const moods = ['😞', '😍', '😡', '🙂', '😭', '😌'];

  return (
    <View style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Profile Header Section */}
            <View style={styles.profileHeader}>
              <Image
                source={require('../../assets/images/image.png')}
                style={styles.profileImage}
              />
              <Text style={styles.greeting}>Hey kreetee,{"\n"}how are you doing today?</Text>
            </View>

            {/* Reflection Section */}
            <View style={styles.reflectionSection}>
              <Text style={styles.sectionTitle}>Daily Reflection</Text>
              <TextInput
                placeholder="How do you feel about your current emotions?"
                value={reflection}
                onChangeText={setReflection}
                style={styles.textInput}
                multiline
              />
              <Pressable
                style={styles.reflectButton}
                onPress={() => console.log('Reflect button pressed')}
              >
                <Text style={styles.reflectButtonText}>Reflect Here</Text>
                <Icon name="arrow-forward" size={20} color="#333" />
              </Pressable>
            </View>

            {/* Mood Log Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Daily Mood Log</Text>
              <View style={styles.moodRow}>
                {moods.map((mood, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.moodButton,
                      selectedMood === mood && styles.moodSelected,
                    ]}
                    onPress={() => setSelectedMood(mood)}
                  >
                    <Text style={styles.moodText}>{mood}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Affirmation Section */}
            <View style={styles.affirmationSection}>
              <Text style={styles.sectionTitle}>Daily Words of affirmations</Text>
              <Text style={styles.affirmationContent}>
                You are capable of amazing things. Every step forward, no matter how small, is progress worth celebrating.
              </Text>
            </View>
          </ScrollView>

          {/* Bottom Navigation */}
          <View style={styles.bottomNav}>
            <TouchableOpacity onPress={() => console.log('Home')}>
              <Icon name="home-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Chat')}>
              <Icon name="chatbubble-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Add')}>
              <View style={styles.addButton}>
                <Icon name="add" size={24} color="#F4CBE4" />
              </View>
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Mood Insights')}>
              <Icon name="analytics-outline" size={24} color="#333" />
            </TouchableOpacity>

            <TouchableOpacity onPress={() => console.log('Settings')}>
              <Icon name="settings-outline" size={24} color="#333" />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  gradient: {
    flex: 1,
    backgroundColor: '#E7B8D9', 
  },
  safeArea: {
    flex: 1,
  },
  wrapper: {
    flex: 1,
    position: 'relative',
  },
  container: {
    padding: 20,
    paddingBottom: 100,
    flexGrow: 1,
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  profileImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 3,
    borderColor: '#fff',
  },
  greeting: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
    flex: 1,
  },
  reflectionSection: {
    marginBottom: 25,
    backgroundColor: '#F7F0F3',
    borderRadius: 15,
    padding: 15,
  },
  section: {
    marginBottom: 25,
    backgroundColor: '#FDEFF4',
    borderRadius: 15,
    padding: 15,
  },
  affirmationSection: {
    marginBottom: 25,
    backgroundColor: '#EDF3DD',
    borderRadius: 15,
    padding: 15,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  textInput: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 10,
    textAlignVertical: 'top',
    minHeight: 60,
  },
  moodRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  moodButton: {
    padding: 10,
    borderRadius: 10,
  },
  moodSelected: {
    backgroundColor: '#fff',
  },
  moodText: {
    fontSize: 24,
  },
  reflectButton: {
    marginTop: 10,
    backgroundColor: '#CFD9B4',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reflectButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginRight: 10,
  },
  bottomNav: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    paddingVertical: 10,
    backgroundColor: '#fff',
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
  },
  addButton: {
    backgroundColor: '#fff',
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: -20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 5,
  },
  affirmationContent: {
    color: '#666',
    lineHeight: 22,
    fontSize: 14,
  },
});
