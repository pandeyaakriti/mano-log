// File: app/%28tabs%29/index.tsx
// This file is part of the Mano Log app, a mental health journaling application.
// It provides the main homepage layout, including user profile, daily reflection, mood log, and
// daily affirmations. The app uses React Native for the frontend and integrates with a backend server for data management.
// The homepage allows users to reflect on their emotions, log their daily mood, and view affirm
// ations to promote positive mental health.


import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { journalAPI } from '../../config/api';
import { useAuth } from '../../context/AuthContext';


type User = {
  id: string;
  displayName?: string;
  email?: string;
  // add other properties as needed
};

export default function Homepage() {
  const [reflection, setReflection] = useState('');
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth() as { user: User | null };

  const moods = ['😞', '😍', '😡', '🙂', '😭', '😌'];

  const handleReflectPress = async () => {
    // Validation
    if (!reflection.trim()) {
      Alert.alert('Empty Reflection', 'Please write something before reflecting.');
      return;
    }

    if (!user?.id) {
      Alert.alert('Authentication Error', 'Please sign in to save your reflection.');
      return;
    }

    setIsLoading(true);

    try {
      // Save journal entry
      await journalAPI.create(user.id, reflection.trim());
      
      // Show success message
      Alert.alert(
        'Reflection Saved! 🌟',
        'Your thoughts have been safely stored in your journal.',
        [
          {
            text: 'Continue Writing',
            style: 'default',
          },
          {
            text: 'View Journal',
            onPress: () => {
              // Navigate to journal/settings screen
              // You'll need to implement this based on your navigation setup
              console.log('Navigate to journal');
            },
          },
        ]
      );

      // Clear the input
      setReflection('');
      
    } catch (error) {
      console.error('Error saving reflection:', error);
      Alert.alert(
        'Save Failed',
        'We couldn\'t save your reflection right now. Please try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const getUserDisplayName = () => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'friend';
  };
  const greeting = `Hey ${getUserDisplayName()},\nhow are you doing today?`;

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
              <Text style={styles.greeting}>
                Hey {getUserDisplayName()},{"\n"}how are you doing today?</Text>
            </View>

            {/* Reflection Section */}
            <View style={styles.reflectionSection}>
               <Text style={styles.sectionTitle}>Daily Reflection</Text>
              <TextInput
                placeholder="How do you feel about your current emotions?"
                value={reflection}
                onChangeText={setReflection}
                style={[styles.textInput, { fontSize: 20 }]}
                multiline
                maxLength={1000}
                editable={!isLoading}
                />
              {/* Character count */}
              <Text style={styles.characterCount}>
                {reflection.length}/1000 characters
              </Text>

              {/* Reflect Button */}
              {/* <Pressable
                style={styles.reflectButton}
                onPress={() => console.log('Reflect button pressed')}
              >
                <Text style={styles.reflectButtonText}>Reflect Here</Text>
                <Icon name="arrow-forward" size={20} color="#333" />
              </Pressable>
            </View> */}
            <Pressable
                style={[
                  styles.reflectButton,
                  (isLoading || !reflection.trim()) && styles.reflectButtonDisabled
                ]}
                onPress={handleReflectPress}
                disabled={isLoading || !reflection.trim()}
              >
                {isLoading ? (
                  <ActivityIndicator color="#333" size="small" />
                ) : (
                  <>
                    <Text style={styles.reflectButtonText}>
                      {reflection.trim() ? 'Save Reflection' : 'Write Something First'}
                    </Text>
                    <Icon name="arrow-forward" size={20} color="#333" />
                  </>
                )}
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
    fontSize: 12,
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
    fontSize: 60,
    color: '#333',
  },
  characterCount: {
    fontSize: 12,
    color: '#666',
    textAlign: 'right',
    marginTop: 5,
    marginBottom: 10,
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
    //marginTop: 10,
    backgroundColor: '#CFD9B4',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 44,
  },
  reflectButtonDisabled: {
  backgroundColor: '#E5E5E5',
  opacity: 0.6,
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
