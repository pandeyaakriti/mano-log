import React, { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';

export default function Homepage() {
  const [reflection, setReflection] = useState('');
  const [showReflectionCard, setShowReflectionCard] = useState(false);
  const [showAIInsights, setShowAIInsights] = useState(false);

  return (
    <View style={styles.gradient}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.wrapper}>
          <ScrollView contentContainerStyle={styles.container}>
            {/* Profile Header */}
            <View style={styles.profileHeader}>
              <Image
                source={require('../../assets/images/image.png')}
                style={styles.profileImage}
              />
              <Text style={styles.greeting}>Hey kreetee,{"\n"}how are you doing today?</Text>
            </View>

            {/* Daily Reflection Section (Figma-style) */}
            <View style={styles.reflectionCard}>
              <Text style={styles.sectionTitle}>Daily Reflection</Text>
              <Text style={styles.questionText}>How do you feel about your current emotions?</Text>
              <View style={styles.inputWithArrow}>
                <TextInput
                  placeholder="reflect here..."
                  placeholderTextColor="#7A7A7A"
                  value={reflection}
                  onChangeText={setReflection}
                  style={styles.reflectionInput}
                />
                <TouchableOpacity
                  style={styles.arrowButton}
                  onPress={() => setShowReflectionCard(true)}
                >
                  <Icon name="arrow-forward" size={20} color="#333" />
                </TouchableOpacity>
              </View>
            </View>

            {/* Streak and Mood Section (Figma-style) */}
            <View style={styles.streakMoodContainer}>
              <View style={styles.streakColumn}>
                <View style={styles.streakCard}>
                  <Text style={styles.streakLabel}>Longest Streak</Text>
                  <Text style={styles.streakValue}>43 <Text>✨</Text></Text>
                </View>
                <View style={styles.streakCard}>
                  <Text style={styles.streakLabel}>Current Streak</Text>
                  <Text style={styles.streakValue}>27 <Text>💥</Text></Text>
                </View>
              </View>
              <View style={styles.moodCard}>
                <Text style={styles.moodLabel}>Average Mood this week</Text>
                <Text style={styles.moodEmoji}>😟</Text>
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

          {/* Reflection Modal */}
          {showReflectionCard && (
            <View style={styles.overlay}>
              <View style={styles.card}>
                <View style={styles.checkIconContainer}>
                  <Icon name="checkmark-circle" size={50} color="#A1D1A1" />
                </View>
                <Text style={styles.cardDate}>24{"\n"}Sat</Text>
                <TextInput
                  style={styles.cardTextInput}
                  value={reflection}
                  onChangeText={setReflection}
                  placeholder="Type your reflection here..."
                  multiline
                  textAlign="center"
                />
                <TouchableOpacity
                  style={styles.insightButton}
                  onPress={() => {
                    setShowReflectionCard(false);
                    setShowAIInsights(true);
                  }}
                >
                  <Text style={styles.insightButtonText}>Get insights</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setShowReflectionCard(false)}
                >
                  <Icon name="close-circle" size={28} color="#999" />
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* AI Insights Modal */}
          {showAIInsights && (
            <View style={styles.overlay}>
              <View style={styles.card}>
                <TouchableOpacity
                  style={styles.checkIconContainer}
                  onPress={() => setShowAIInsights(false)}
                >
                  <Icon name="checkmark-circle" size={50} color="#A1D1A1" />
                </TouchableOpacity>
                <Text style={styles.cardDate}>24{"\n"}Sat</Text>
                <View style={styles.aiCardBox}>
                  <Text style={styles.aiCardTitle}>🧠 Emotional Summary</Text>
                  <Text style={styles.aiCardText}>
                    It sounds like you had a mixed day with some challenges but also successes. You're showing resilience & how you're handling stress.
                  </Text>
                </View>
                <View style={styles.aiCardBoxYellow}>
                  <Text style={styles.aiCardTitle}>🌙 Wellness Tip</Text>
                  <Text style={styles.aiCardText}>
                    Consider taking 5 minutes for deep breathing exercises before bed tonight to help clear your mind and prepare for restful sleep.
                  </Text>
                </View>
              </View>
            </View>
          )}
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

  // New Daily Reflection (Figma-style)
  reflectionCard: {
    backgroundColor: '#F7F0F3',
    borderRadius: 15,
    padding: 15,
    marginBottom: 25,
  },
  questionText: {
    fontSize: 14,
    color: '#555',
    marginBottom: 10,
  },
  inputWithArrow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E3F0C1',
    borderRadius: 10,
    paddingHorizontal: 10,
  },
  reflectionInput: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 5,
    fontSize: 14,
    color: '#333',
  },
  arrowButton: {
    padding: 6,
    backgroundColor: '#E3F0C1',
    borderRadius: 8,
    marginLeft: 5,
  },

  // New Streak + Mood Section
  streakMoodContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 25,
  },
  streakColumn: {
    flex: 1,
    justifyContent: 'space-between',
  },
  streakCard: {
    backgroundColor: '#FCEBF5',
    borderRadius: 15,
    padding: 12,
    marginBottom: 10,
  },
  streakLabel: {
    fontSize: 14,
    color: '#333',
  },
  streakValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#000',
  },
  moodCard: {
    backgroundColor: '#FCEBF5',
    borderRadius: 15,
    padding: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 10,
    width: 130,
  },
  moodLabel: {
    fontSize: 14,
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  moodEmoji: {
    fontSize: 40,
  },

  // Affirmation
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
  affirmationContent: {
    color: '#666',
    lineHeight: 22,
    fontSize: 14,
  },

  // Bottom Nav
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

  // Overlay + Modal Cards
  overlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  card: {
    width: '85%',
    backgroundColor: '#F8DDEB',
    borderRadius: 25,
    padding: 20,
    paddingTop: 30,
    alignItems: 'center',
    position: 'relative',
  },
  checkIconContainer: {
    position: 'absolute',
    top: -25,
    backgroundColor: '#F8DDEB',
    borderRadius: 25,
    padding: 5,
  },
  cardDate: {
    fontSize: 14,
    color: '#888',
    textAlign: 'center',
    marginBottom: 10,
  },
  cardTextInput: {
    fontSize: 14,
    color: '#333',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 10,
    borderRadius: 10,
    width: '100%',
    minHeight: 80,
    textAlignVertical: 'top',
  },
  insightButton: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 30,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 3,
    elevation: 4,
  },
  insightButtonText: {
    fontWeight: 'bold',
    color: '#D16D96',
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
  },

  // AI Insight Styles
  aiCardBox: {
    backgroundColor: '#E1F8F4',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    width: '100%',
  },
  aiCardBoxYellow: {
    backgroundColor: '#FDF3D9',
    borderRadius: 10,
    padding: 15,
    width: '100%',
  },
  aiCardTitle: {
    fontWeight: 'bold',
    marginBottom: 5,
  },
  aiCardText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
});