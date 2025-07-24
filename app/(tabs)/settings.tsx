import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useAuth } from '../../context/AuthContext';

type User = {
  mongoId?: string;
  firebaseUid?: string;
  uid?: string;
  id?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

interface DatabaseJournalEntry {
  id: string;
  textContent: string;
  entryDate: string;
  wordCount: number;
  tags: string[];
  userId: string;
}

interface JournalEntry {
  date: string;
  day: string;
  color: string;
  text: string;
  fullReflection: string;
  originalEntry?: DatabaseJournalEntry;
}

interface MonthSeparator {
  isMonth: true;
  label: string;
}

type JournalItem = JournalEntry | MonthSeparator;

export default function settings() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { user } = useAuth() as { user: User | null };
  
  const colors = ['#CFF5C3', '#F9E1DD', '#C5F1F2', '#F5C6C6', '#E8D5F0', '#FFE4B5'];

  const getUserFirebaseUid = () => {
    return user?.firebaseUid || user?.uid || user?.id;
  };

  const fetchJournalEntries = async (isRefresh = false) => {
    const firebaseUid = getUserFirebaseUid();
    
    if (!firebaseUid) {
      Alert.alert('Authentication Error', 'User not found. Please login again.');
      router.push ('/auth/login');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_API_URL}/api/journal/${firebaseUid}`;
      const response = await fetch(apiUrl, {
        method: 'GET',
        headers: {
          'Accept': 'application/json',
          'Content-Type': 'application/json'
        },
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      const data = await response.json();

      if (data.success && data.entries && Array.isArray(data.entries)) {
        const processedJournals = processJournalEntries(data.entries);
        setJournals(processedJournals);
      } else {
        setJournals([]);
      }

    } catch (error) {
      Alert.alert(
        'Error', 
        'Failed to load journal entries. Please check your internet connection.'
      );
      setJournals([]);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const processJournalEntries = (entries: DatabaseJournalEntry[]): JournalItem[] => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const processed: JournalItem[] = [];
    let currentMonth = '';

    const sortedEntries = [...entries].sort((a, b) => 
      new Date(b.entryDate).getTime() - new Date(a.entryDate).getTime()
    );

    sortedEntries.forEach((entry, index) => {
      try {
        const entryDate = new Date(entry.entryDate);
        const month = entryDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
        const date = entryDate.getDate().toString();
        const day = entryDate.toLocaleDateString('en-US', { weekday: 'short' });

        if (month !== currentMonth) {
          processed.push({
            isMonth: true,
            label: month
          });
          currentMonth = month;
        }

        const previewText = entry.textContent && entry.textContent.length > 100 
          ? entry.textContent.substring(0, 100) + '...'
          : entry.textContent || 'No content';

        const color = colors[index % colors.length];

        processed.push({
          date,
          day,
          color,
          text: previewText,
          fullReflection: entry.textContent || 'No content',
          originalEntry: entry
        });

      } catch (error) {
        console.error(`Error processing entry ${index}:`, error);
      }
    });

    return processed;
  };

  useEffect(() => {
    if (user) {
      fetchJournalEntries();
    } else {
      setIsLoading(false);
    }
  }, [user]);

  const openReflection = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setModalVisible(true);
  };

  const getUserDisplayName = (): string => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'friend';
  };

  const getUserProfileImage = () => {
    if (user?.photoURL) { 
      return { uri: user.photoURL };
    }
    return require('../../assets/images/default-profile.jpg');
  };

  const refreshJournals = () => {
    fetchJournalEntries(true);
  };

  const handleLogout = async () => {
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            setIsLoggingOut(true);
            try {
              await logout();
              // Navigation will be handled by the auth context/router
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }},
        }, ]
    ); };


  return (
    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileSection}>
          <View style={styles.profileImageContainer}>
            <Image
              source={getUserProfileImage()}
              style={styles.profileImage}
            />
          </View>
          <Text style={styles.name}>{getUserDisplayName()}</Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.journalHeader}>
            <View style={styles.journalBtn}>
              <Text style={styles.journalBtnText}>My Journals</Text>
            </View>
            <TouchableOpacity 
              style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
              onPress={refreshJournals}
              disabled={isLoading || isRefreshing}
              activeOpacity={0.7}
            >
              <Icon 
                name={isRefreshing ? "refresh" : "refresh-outline"} 
                size={18} 
                color={isRefreshing ? "#999" : "#6B4E71"} 
                style={isRefreshing ? styles.refreshIconSpinning : null}
              />
            </TouchableOpacity>
            <TouchableOpacity 
                style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
                onPress={handleLogout}
                disabled={isLoading || isRefreshing || isLoggingOut}
                activeOpacity={0.7}
              >
                {isLoggingOut ? (
                  <ActivityIndicator size={18} color="#999" />
                ) : (
                  <Icon 
                    name="log-out-outline" 
                    size={18} 
                    color="#D64545" 
                  />
                )}
              </TouchableOpacity>
          </View>
        </View>

        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#C295BC" />
            <Text style={styles.loadingText}>Loading your journals...</Text>
          </View>
        ) : journals.length === 0 ? (
          <View style={styles.emptyContainer}>
            <View style={styles.emptyIconContainer}>
              <Icon name="journal-outline" size={60} color="#B8A2C8" />
            </View>
            <Text style={styles.emptyText}>No journal entries yet</Text>
            <Text style={styles.emptySubtext}>
              Start writing your daily reflections to see them here
            </Text>
          </View>
        ) : (
          journals.map((entry, index) =>
            'isMonth' in entry ? (
              <View key={`month-${index}`} style={styles.monthContainer}>
                <View style={styles.monthLine} />
                <Text style={styles.monthText}>{entry.label}</Text>
                <View style={styles.monthLine} />
              </View>
            ) : (
              <TouchableOpacity
                key={`entry-${entry.originalEntry?.id || index}`}
                style={styles.journalContainer}
                onPress={() => openReflection(entry)}
                activeOpacity={0.8}
              >
                <View
                  style={[styles.dateContainer, { backgroundColor: entry.color }]}
                >
                  <Text style={styles.dateText}>{entry.date}</Text>
                  <Text style={styles.dayText}>{entry.day}</Text>
                </View>
                <View
                  style={[styles.entryBox, { backgroundColor: entry.color }]}
                >
                  <Text style={styles.entryText}>{entry.text}</Text>
                  {entry.originalEntry && (
                    <View style={styles.entryMetadata}>
                      <Text style={styles.wordCountText}>
                        {entry.originalEntry.wordCount} words
                      </Text>
                      <Icon name="chevron-forward" size={14} color="#777" />
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            )
          )
        )}
      </ScrollView>

      <Modal
        transparent={true}
        visible={modalVisible}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalDateContainer}>
                <Text style={styles.modalCornerDate}>{selectedEntry?.date}</Text>
                <Text style={styles.modalCornerDay}>{selectedEntry?.day}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.7}
              >
                <Icon name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.centeredTextWrapper}>
                <Text style={styles.modalText}>
                  {selectedEntry?.fullReflection}
                </Text>
                {selectedEntry?.originalEntry && (
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryInfoText}>
                      Written on {new Date(selectedEntry.originalEntry.entryDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.entryInfoText}>
                      {selectedEntry.originalEntry.wordCount} words
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            <Pressable
              style={styles.insightButton}
              onPress={() => setModalVisible(false)}
              android_ripple={{ color: 'rgba(255,255,255,0.3)' }}
            >
              <Text style={styles.insightButtonText}>Get insights</Text>
            </Pressable>
          </View>
        </View>
      </Modal>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    paddingVertical: 80,
    paddingHorizontal: 16,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 40,
  },
  profileImageContainer: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderRadius: 40,
    marginBottom: 15,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.8)',
  },
  name: {
    fontSize: 24,
    fontWeight: '700',
    color: '#4A4A4A',
    marginBottom: 4,
  },
  email: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    marginBottom: 20,
    opacity: 0.8,
  },
  journalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  journalBtn: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  journalBtnText: {
    fontWeight: '600',
    color: '#6B4E71',
    fontSize: 16,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  refreshButtonDisabled: {
    opacity: 0.6,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.12,
    shadowRadius: 6,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(214, 69, 69, 0.2)',
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  refreshIconSpinning: {
    //  add animation here if front end guys are mehenati enough
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#777',
    fontWeight: '500',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.7)',
    width: 100,
    height: 100,
    borderRadius: 50,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  emptyText: {
    fontSize: 20,
    color: '#6B4E71',
    fontWeight: '600',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#999',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
  },
  journalContainer: {
    flexDirection: 'row',
    marginVertical: 8,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  dateContainer: {
    width: 60,
    height: 80,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  dateText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#555',
  },
  dayText: {
    fontSize: 12,
    color: '#555',
    fontWeight: '500',
    marginTop: 2,
  },
  entryBox: {
    flex: 1,
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 6,
    elevation: 4,
  },
  entryText: {
    color: '#555',
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 8,
  },
  entryMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCountText: {
    fontSize: 12,
    color: '#777',
    fontWeight: '500',
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 20,
  },
  monthLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255,255,255,0.5)',
  },
  monthText: {
    fontSize: 14,
    color: '#6B4E71',
    fontWeight: '600',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.8)',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.75)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF0F5',
    padding: 24,
    paddingTop: 70,
    borderTopLeftRadius: 30,
    borderTopRightRadius: 30,
    maxHeight: '85%',
    position: 'relative',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.2,
    shadowRadius: 12,
    elevation: 10,
  },
  modalHeader: {
    position: 'absolute',
    top: 24,
    left: 24,
    right: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalDateContainer: {
    alignItems: 'flex-start',
  },
  modalCornerDate: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B4E71',
  },
  modalCornerDay: {
    fontSize: 14,
    color: '#999',
    fontWeight: '500',
    marginTop: 2,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  centeredTextWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },
  modalText: {
    fontSize: 16,
    color: '#555',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 300,
    letterSpacing: 0.3,
  },
  entryInfo: {
    marginTop: 20,
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.6)',
    padding: 12,
    borderRadius: 12,
  },
  entryInfoText: {
    fontSize: 13,
    color: '#777',
    marginBottom: 3,
    fontWeight: '500',
  },
  insightButton: {
    backgroundColor: '#D8BFD8',
    borderRadius: 25,
    alignSelf: 'center',
    paddingVertical: 14,
    paddingHorizontal: 40,
    marginTop: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.3)',
  },
  insightButtonText: {
    color: '#4A4A4A',
    fontWeight: '700',
    fontSize: 16,
  },
});

function logout() {
  router.push ('/auth/login');
}
