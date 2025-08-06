import { router } from 'expo-router';
import React, { useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import Svg, { Defs, Path, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
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

interface DatabaseBlogEntry {
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

interface BlogEntry {
  date: string;
  day: string;
  color: string;
  text: string;
  fullReflection: string;
  originalEntry?: DatabaseBlogEntry;
}

interface MonthSeparator {
  isMonth: true;
  label: string;
}

type JournalItem = JournalEntry | MonthSeparator;
type BlogItem = BlogEntry | MonthSeparator;
type ViewMode = 'profile' | 'journals' | 'blogs';

export default function Settings() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [selectedBlogEntry, setSelectedBlogEntry] = useState<BlogEntry | null>(null);
  const [journals, setJournals] = useState<JournalItem[]>([]);
  const [blogs, setBlogs] = useState<BlogItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('profile');
  const { user} = useAuth() as { user: User | null };
  
  const colors = ['#CFF5C3', '#F9E1DD', '#C5F1F2', '#F5C6C6', '#E8D5F0', '#FFE4B5'];

  const getUserFirebaseUid = () => {
    return user?.firebaseUid || user?.uid || user?.id;
  };

  const fetchJournalEntries = async (isRefresh = false) => {
    const firebaseUid = getUserFirebaseUid();
    
    if (!firebaseUid) {
      Alert.alert('Authentication Error', 'User not found. Please login again.');
      router.push('/auth/signup');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/journal/${firebaseUid}`;
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
      console.error('Journal fetch error:', error);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  const fetchBlogEntries = async (isRefresh = false) => {
    const firebaseUid = getUserFirebaseUid();
    
    if (!firebaseUid) {
      Alert.alert('Authentication Error', 'User not found. Please login again.');
      router.push('/auth/login');
      setIsLoading(false);
      return;
    }

    try {
      if (isRefresh) {
        setIsRefreshing(true);
      } else {
        setIsLoading(true);
      }

      const apiUrl = `${process.env.EXPO_PUBLIC_API_BASE_URL}/blogsheet/${firebaseUid}`; 
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
        const processedBlogs = processBlogEntries(data.entries);
        setBlogs(processedBlogs);
      } else {
        setBlogs([]);
      }

    } catch (error) {
      Alert.alert(
        'Error', 
        'Failed to load blog sheet entries. Please check your internet connection.'
      );
      setBlogs([]);
      console.error('Blog fetch error:', error);
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
        console.error(`Error processing journal entry ${index}:`, error);
      }
    });

    return processed;
  };

  const processBlogEntries = (entries: DatabaseBlogEntry[]): BlogItem[] => {
    if (!Array.isArray(entries) || entries.length === 0) {
      return [];
    }

    const processed: BlogItem[] = [];
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
        console.error(`Error processing blog entry ${index}:`, error);
      }
    });

    return processed;
  };

  const openJournalEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setSelectedBlogEntry(null);
    setModalVisible(true);
  };

  const openBlogEntry = (entry: BlogEntry) => {
    setSelectedBlogEntry(entry);
    setSelectedEntry(null);
    setModalVisible(true);
  };

  // const getUserDisplayName = (): string => {
  //   if (user?.displayName) return user.displayName;
  //   if (user?.email) return user.email.split('@')[0];
  //   return 'friend';
  // };

  // const getUserProfileImage = () => {
  //   if (user?.photoURL) { 
  //     return { uri: user.photoURL };
  //   }
  //   return require('../../assets/images/default-profile.jpg');
  // };

  const refreshJournals = () => {
    fetchJournalEntries(true);
  };

  // const handleLogout = async () => {
  //   Alert.alert(
  //     'Logout',
  //     'Are you sure you want to logout?',
  //     [
  //       {
  //         text: 'Cancel',
  //         style: 'cancel',
  //       },
  //       {
  //         text: 'Logout',
  //         style: 'destructive',
  //         onPress: async () => {
  //           setIsLoggingOut(true);
  //           try {
  //             await logout();
  //             // Navigation will be handled by the auth context/router
  //           } catch (error) {
  //             Alert.alert('Error', 'Failed to logout. Please try again.');
  //             console.error('Logout error:', error);
  //           } finally {
  //             setIsLoggingOut(false);
  //           }},
  //       }, ]
  //   ); };


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

  const refreshContent = () => {
    if (viewMode === 'journals') {
      fetchJournalEntries(true);
    } else if (viewMode === 'blogs') {
      fetchBlogEntries(true);
    }
  };

  const handleMyJournalsPress = () => {
    setViewMode('journals');
    if (journals.length === 0) {
      fetchJournalEntries();
    }
  };

  const handleMyBlogsPress = () => {
    setViewMode('blogs');
    if (blogs.length === 0) {
      fetchBlogEntries();
    }
  };

  const handleBackToProfile = () => {
    setViewMode('profile');
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
            } catch (error) {
              Alert.alert('Error', 'Failed to logout. Please try again.');
              console.error('Logout error:', error);
            } finally {
              setIsLoggingOut(false);
            }
          },
        },
      ]
    );
  };

  const renderProfileView = () => (
    <View style={styles.profileSection}>
      {/* Profile Image and Info */}
      <View style={styles.profileInfoContainer}>
        <View style={styles.profileImageContainer}>
          <Image
            source={getUserProfileImage()}
            style={styles.profileImage}
          />
        </View>
        <View style={styles.profileTextContainer}>
          <Text style={styles.name}>{getUserDisplayName()}</Text>
          <Text style={styles.email}>{user?.email}</Text>
        </View>
      </View>
      
      {/* Action Buttons */}
      <View style={styles.actionButtonsContainer}>
        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleMyJournalsPress}
          activeOpacity={0.7}
        >
          <Icon name="journal-outline" size={20} color="#6B4E71" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>My Journals</Text>
        </TouchableOpacity>

        <TouchableOpacity 
          style={styles.primaryButton}
          onPress={handleMyBlogsPress}
          activeOpacity={0.7}
        >
          <Icon name="newspaper-outline" size={20} color="#6B4E71" style={styles.buttonIcon} />
          <Text style={styles.primaryButtonText}>My Blogs</Text>
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
            <Icon name="log-out-outline" size={18} color="#D64545" />
          )}
          {!isLoggingOut && <Text style={styles.logoutButtonText}>Logout</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderHeader = () => {
    if (viewMode === 'profile') {
      return (
        <View style={styles.profileHeader}>
          <Text style={styles.profileHeaderTitle}>Profile</Text>
        </View>
      );
    }

    return (
      <View style={styles.contentHeader}>
        <TouchableOpacity 
          style={styles.backButton}
          onPress={handleBackToProfile}
          activeOpacity={0.7}
        >
          <Icon name="arrow-back" size={20} color="#6B4E71" />
        </TouchableOpacity>
        
        <Text style={styles.contentTitle}>
          {viewMode === 'journals' ? 'My Journals' : 'My Blogs'}
        </Text>

        <TouchableOpacity 
          style={[styles.refreshButton, isRefreshing && styles.refreshButtonDisabled]}
          onPress={refreshContent}
          disabled={isLoading || isRefreshing}
          activeOpacity={0.7}
        >
          <Icon 
            name={isRefreshing ? "refresh" : "refresh-outline"} 
            size={18} 
            color={isRefreshing ? "#999" : "#6B4E71"} 
          />
        </TouchableOpacity>
      </View>
    );
  };

  const renderContent = () => {
    if (viewMode === 'profile') {
      return renderProfileView();
    }

    const currentEntries = viewMode === 'journals' ? journals : blogs;
    const entryType = viewMode === 'journals' ? 'journal' : 'blog';
    const emptyTitle = viewMode === 'journals' ? 'No journal entries yet' : 'No blog entries yet';
    const emptySubtext = viewMode === 'journals' 
      ? 'Start writing your daily reflections to see them here'
      : 'Start writing your random thoughts to see them here';

    if (isLoading) {
      return (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#C295BC" />
          <Text style={styles.loadingText}>
            Loading your {entryType}s...
          </Text>
        </View>
      );
    }

    if (currentEntries.length === 0) {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon 
              name={viewMode === 'journals' ? "journal-outline" : "newspaper-outline"} 
              size={60} 
              color="#B8A2C8" 
            />
          </View>
          <Text style={styles.emptyText}>{emptyTitle}</Text>
          <Text style={styles.emptySubtext}>{emptySubtext}</Text>
        </View>
      );
    }

    return currentEntries.map((entry, index) =>
      'isMonth' in entry ? (
        <View key={`month-${index}`} style={styles.monthContainer}>
          <View style={styles.monthLine} />
          <Text style={styles.monthText}>{entry.label}</Text>
          <View style={styles.monthLine} />
        </View>
      ) : (
        <TouchableOpacity
          key={`entry-${entry.originalEntry?.id || index}`}
          style={styles.entryContainer}
          onPress={() => viewMode === 'journals' ? openJournalEntry(entry) : openBlogEntry(entry)}
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
    );
  };

  const currentSelectedEntry = selectedEntry || selectedBlogEntry;

 return (
   <View style={styles.mainContainer}>
      
        <Svg height="700" width="100%" viewBox="0 70 1440 320" style={styles.svgBackground}>
           <Defs>
                      <SvgGradient id="waveGradient" x1="0%" y1="80%" x2="100%" y2="20%" gradientTransform="rotate(45)">
                        <Stop offset="18%" stopColor="#9791B9" />
                        <Stop offset="51%" stopColor="#DDA8D6" />
                        <Stop offset="52%" stopColor="#E0ACD8" />
                        <Stop offset="70%" stopColor="#F8D3EF" />
                        <Stop offset="100%" stopColor="#FFF9D3" />
                      </SvgGradient>
                    </Defs>
        <Path
                    fill="url(#waveGradient)"
                    d="
                      M0,-700 H1440 V64 L1380,64 
                      C1320,64 1200,64 1080,64 
                      C960,64 840,64 720,64 
                      C600,64 480,64 360,64 
                      C240,64 120,64 60,64 
                      L0,64 
                      L0,0 
                      Z
                      M0,64
                      L63,120
                      C120,170,240,240,360,230
                      C480,220,600,160,720,140
                      C840,120,960,140,1080,170
                      C1200,200,1320,240,1380,260
                      L1440,280
                      L1440,64
                    "
                  />
                  </Svg>
      <View style={styles.curvedBottom} />

      {/* Content */}
      <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
        {renderHeader()}
        {renderContent()}
      </ScrollView>

      {/* Modal */}
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
                <Text style={styles.modalCornerDate}>{currentSelectedEntry?.date}</Text>
                <Text style={styles.modalCornerDay}>{currentSelectedEntry?.day}</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setModalVisible(false)}
                activeOpacity={0.8}
              >
                <Icon name="close" size={24} color="#B4A5A0" />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView} showsVerticalScrollIndicator={false}>
              <View style={styles.centeredTextWrapper}>
                <Text style={styles.modalText}>
                  {currentSelectedEntry?.fullReflection}
                </Text>
                {currentSelectedEntry?.originalEntry && (
                  <View style={styles.entryInfo}>
                    <Text style={styles.entryInfoText}>
                      Written on {new Date(currentSelectedEntry.originalEntry.entryDate).toLocaleDateString('en-US', {
                        weekday: 'long',
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric'
                      })}
                    </Text>
                    <Text style={styles.entryInfoText}>
                      {currentSelectedEntry.originalEntry.wordCount} words
                    </Text>
                  </View>
                )}
              </View>
            </ScrollView>

            {/* <Pressable
              style={styles.insightButton}
              onPress={() => setModalVisible(false)}
              android_ripple={{ color: 'rgba(124,152,133,0.2)' }}
            >
              <Icon name="bulb-outline" size={18} color="#fff" style={styles.insightButtonIcon} />
              <Text style={styles.insightButtonText}>Get Insights</Text>
            </Pressable> */}
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    backgroundColor: '#FEFEFE',
  },
  gradientBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 320,
    zIndex: 0,
  },
  svgBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  curvedBottom: {
    position: 'absolute',
    top: 270,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: '#FEFEFE',
    borderTopLeftRadius: 40,
    borderTopRightRadius: 40,
    zIndex: 1,
  },
  container: {
    flex: 1,
    zIndex: 2,
  },
  contentContainer: {
    paddingTop: 60,
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  profileHeader: {
    alignItems: 'center',
    marginBottom: 36,
  },
  profileHeaderTitle: {
    fontSize: 24,
    fontWeight: '400',
    color: '#FFFFFF',
    textShadowColor: 'rgba(124,152,133,0.3)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 3,
    letterSpacing: 0.5,
  },
  profileSection: {
    alignItems: 'center',
  },
  profileInfoContainer: {
    alignItems: 'center',
    marginBottom: 40,
    paddingTop: 20,
  },
  profileImageContainer: {
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    borderRadius: 50,
    marginBottom: 24,
  },
  profileImage: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    borderColor: 'rgba(255,255,255,0.9)',
  },
  profileTextContainer: {
    alignItems: 'center',
  },
  name: {
    fontSize: 24,
    fontWeight: '500',
    color: '#2D3E2F',
    marginBottom: 8,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  email: {
    fontSize: 15,
    color: '#7C9885',
    textAlign: 'center',
    opacity: 0.8,
    fontWeight: '300',
  },
  actionButtonsContainer: {
    width: '100%',
    gap: 16,
    paddingHorizontal: 20,
  },
  primaryButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.15)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    fontWeight: '400',
    color: '#7C9885',
    fontSize: 16,
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  buttonIcon: {
    marginRight: 4,
  },
  logoutButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    paddingVertical: 18,
    paddingHorizontal: 24,
    borderRadius: 20,
    shadowColor: '#D4756B',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 5,
    borderWidth: 1,
    borderColor: 'rgba(212, 117, 107, 0.2)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  logoutButtonText: {
    fontWeight: '400',
    color: '#D4756B',
    fontSize: 16,
    marginLeft: 10,
    letterSpacing: 0.2,
  },
  logoutButtonDisabled: {
    opacity: 0.5,
  },
  contentHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 32,
    paddingHorizontal: 4,
  },
  backButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  contentTitle: {
    fontSize: 20,
    fontWeight: '500',
    color: '#2D3E2F',
    flex: 1,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  refreshButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  refreshButtonDisabled: {
    opacity: 0.5,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
  },
  loadingText: {
    marginTop: 20,
    fontSize: 16,
    color: '#7C9885',
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 80,
    paddingHorizontal: 20,
  },
  emptyIconContainer: {
    backgroundColor: 'rgba(255,255,255,0.9)',
    width: 96,
    height: 96,
    borderRadius: 48,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  emptyText: {
    fontSize: 18,
    color: '#2D3E2F',
    fontWeight: '400',
    marginBottom: 12,
    textAlign: 'center',
    letterSpacing: 0.3,
  },
  emptySubtext: {
    fontSize: 15,
    color: '#B4A5A0',
    textAlign: 'center',
    lineHeight: 22,
    maxWidth: 280,
    fontWeight: '300',
  },
  entryContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    alignItems: 'flex-start',
    paddingHorizontal: 4,
  },
  dateContainer: {
    width: 64,
    height: 84,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  dateText: {
    fontSize: 18,
    fontWeight: '500',
    color: '#2D3E2F',
    letterSpacing: 0.3,
  },
  dayText: {
    fontSize: 12,
    color: '#7C9885',
    fontWeight: '300',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  entryBox: {
    flex: 1,
    borderRadius: 20,
    padding: 20,
    backgroundColor: 'rgba(255,255,255,0.95)',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  entryText: {
    color: '#2D3E2F',
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 12,
    fontWeight: '300',
  },
  entryMetadata: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  wordCountText: {
    fontSize: 12,
    color: '#B4A5A0',
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  monthContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 24,
    paddingHorizontal: 20,
  },
  monthLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(124,152,133,0.2)',
  },
  monthText: {
    fontSize: 14,
    color: '#7C9885',
    fontWeight: '400',
    marginHorizontal: 16,
    backgroundColor: 'rgba(255,255,255,0.9)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 16,
    letterSpacing: 0.2,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(45, 62, 47, 0.6)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FEFEFE',
    padding: 28,
    paddingTop: 80,
    borderTopLeftRadius: 32,
    borderTopRightRadius: 32,
    maxHeight: '85%',
    position: 'relative',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
    borderWidth: 1,
    borderTopColor: 'rgba(124,152,133,0.1)',
  },
  modalHeader: {
    position: 'absolute',
    top: 28,
    left: 28,
    right: 28,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  modalDateContainer: {
    alignItems: 'flex-start',
  },
  modalCornerDate: {
    fontSize: 22,
    fontWeight: '500',
    color: '#2D3E2F',
    letterSpacing: 0.3,
  },
  modalCornerDay: {
    fontSize: 14,
    color: '#B4A5A0',
    fontWeight: '300',
    marginTop: 4,
    letterSpacing: 0.2,
  },
  modalCloseButton: {
    backgroundColor: 'rgba(255,255,255,0.95)',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 2,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  modalScrollView: {
    maxHeight: 400,
  },
  centeredTextWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 24,
    paddingHorizontal: 16,
  },
  modalText: {
    fontSize: 16,
    color: '#2D3E2F',
    textAlign: 'center',
    lineHeight: 26,
    maxWidth: 320,
    letterSpacing: 0.2,
    fontWeight: '300',
  },
  entryInfo: {
    marginTop: 24,
    alignItems: 'center',
    backgroundColor: 'rgba(124,152,133,0.05)',
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: 'rgba(124,152,133,0.1)',
  },
  entryInfoText: {
    fontSize: 13,
    color: '#7C9885',
    marginBottom: 4,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  // insightButton: {
  //   backgroundColor: '#7C9885',
  //   borderRadius: 24,
  //   alignSelf: 'center',
  //   paddingVertical: 16,
  //   paddingHorizontal: 32,
  //   marginTop: 24,
  //   shadowColor: '#7C9885',
  //   shadowOffset: { width: 0, height: 6 },
  //   shadowOpacity: 0.2,
  //   shadowRadius: 12,
  //   elevation: 6,
  //   borderWidth: 1,
  //   borderColor: 'rgba(255,255,255,0.2)',
  //   flexDirection: 'row',
  //   alignItems: 'center',
  //   justifyContent: 'center',
  // },
  // insightButtonIcon: {
  //   marginRight: 8,
  // },
  // insightButtonText: {
  //   color: '#FFFFFF',
  //   fontWeight: '400',
  //   fontSize: 16,
  //   letterSpacing: 0.3,
  // },
});

function logout() {
  router.push('/auth/signup');
}