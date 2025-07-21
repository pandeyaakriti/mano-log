import { LinearGradient } from 'expo-linear-gradient';
import React, { useState } from 'react';
import {
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { useAuth } from '../../context/AuthContext';
type User = {
  mongoId?: string;         // From MongoDB (_id mapped to mongoId)
  firebaseUid?: string;     // From Firebase
  uid?: string;             // Fallback for Firebase UID
  id?: string;              // General fallback
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;

};


// Define the journal entry type
interface JournalEntry {
  date: string;
  day: string;
  color: string;
  text: string;
  fullReflection: string;
}

// Define the month separator type
interface MonthSeparator {
  isMonth: true;
  label: string;
}

// Union type for journal items
type JournalItem = JournalEntry | MonthSeparator;

const journals: JournalItem[] = [
  {
    date: '24',
    day: 'Sat ',
    color: '#CFF5C3',
    text: 'Went on a walk with my dog Puku today. It was a simple moment, but it brought a lot of peace. The weather was nice, and seeing ......',
    fullReflection: 'Went on a walk with my dog Puku today. It was a simple moment, but it brought a lot of peace. Sometimes these small, quiet moments help me feel more grounded. It reminded me to slow down and appreciate the present.'
  },
  {
    date: '23',
    day: 'Fri ',
    color: '#F9E1DD',
    text: 'Couldn\'t focus nor solve the problem that was given. My mind kept drifting, and no matter how many times I tried to refocus, I ....',
    fullReflection: 'Couldn\'t focus nor solve the problem that was given. My mind kept drifting, and no matter how many times I tried to refocus, I felt distracted. It\'s frustrating, but I know it\'s part of the process sometimes.'
  },
  {
    date: '22',
    day: 'Thu ',
    color: '#C5F1F2',
    text: 'Completed my tough assignment finally. I got it done! It took a lot of effort, late nights, and moments of self-doubt....',
    fullReflection: 'Completed my tough assignment finally. I got it done! It took a lot of effort, late nights, and moments of self-doubt, but pushing through made me proud. Hard work pays off.'
  },
  { 
    isMonth: true, 
    label: 'April' 
  },
  {
    date: '31',
    day: 'Thu ',
    color: '#F5C6C6',
    text: 'Today was a normal day. I managed to control my anger. It feels good to respond calmly instead of letting anger take control.......',
    fullReflection: 'Today was a normal day. I managed to control my anger. It feels good to respond calmly instead of letting anger take control. I\'m learning to be patient.'
  }
];

export default function settings() {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
   const { user } = useAuth() as { user: User | null };

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
    return { uri: user.photoURL};}
    return require('../../assets/images/default-profile.jpg'); // Default profile image
    };

  return (
    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={{ flex: 1 }}
    >
      <ScrollView contentContainerStyle={styles.container}>
        <View style={styles.profileSection}>
          <Image
            source={ getUserProfileImage()}
            style={styles.profileImage}
          />
          <Text style={styles.name}> {getUserDisplayName()}  </Text>
          <Text style={styles.email}>{user?.email}</Text>
          
          <View style={styles.journalBtn}>
            <Text style={styles.journalBtnText}>My Journals</Text>
          </View>
        </View>

        {journals.map((entry, index) =>
          'isMonth' in entry ? (
            <Text key={index} style={styles.monthText}>
              {entry.label}
            </Text>
          ) : (
            <TouchableOpacity
              key={index}
              style={styles.journalContainer}
              onPress={() => openReflection(entry)}
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
              </View>
            </TouchableOpacity>
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
              <Text style={styles.modalCornerDate}>{selectedEntry?.date}</Text>
              <Text style={styles.modalCornerDay}>{selectedEntry?.day}</Text>
            </View>

            <View style={styles.centeredTextWrapper}>
              <Text style={styles.modalText}>
                {selectedEntry?.fullReflection}
              </Text>
            </View>

            <Pressable
              style={styles.insightButton}
              onPress={() => setModalVisible(false)}
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
    paddingHorizontal: 10,
  },
  profileSection: {
    alignItems: 'center',
    marginBottom: 30,
  },
  profileImage: {
    width: 70,
    height: 70,
    borderRadius: 35,
    marginBottom: 10,
  },
  name: {
    fontSize: 20,
    fontWeight: '600',
    color: '#555',
  },
  email: {
    fontSize: 14,
    color: '#777',
    textAlign: 'center',
    marginVertical: 4,
  },
  journalBtn: {
    backgroundColor: '#E5D0E3',
    paddingVertical: 6,
    paddingHorizontal: 16,
    borderRadius: 10,
    marginTop: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 7,
  },
  journalBtnText: {
    fontWeight: '500',
    color: '#555',
  },
  journalContainer: {
    flexDirection: 'row',
    marginVertical: 10,
    alignItems: 'flex-start',
  },
  dateContainer: {
    width: 55,
    height: 75,
    borderRadius: 15,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  dateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#555',
  },
  dayText: {
    fontSize: 12,
    color: '#555',
  },
  entryBox: {
    flex: 1,
    borderRadius: 15,
    padding: 12,
  },
  entryText: {
    color: '#555',
    fontSize: 13,
  },
  monthText: {
    fontSize: 12,
    color: '#777',
    alignSelf: 'center',
    marginTop: 10,
    fontWeight: '500',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#FFF0F5',
    padding: 24,
    paddingTop: 60,
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    minHeight: 350,
    position: 'relative',
  },
  modalHeader: {
    position: 'absolute',
    top: 20,
    left: 24,
    alignItems: 'flex-start',
  },
  modalCornerDate: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#666',
  },
  modalCornerDay: {
    fontSize: 14,
    color: '#999',
  },
  centeredTextWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 20,
    paddingHorizontal: 10,
  },

  modalText: {
    fontSize: 15,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: 260,
    letterSpacing: 0.3,
  },
  insightButton: {
    backgroundColor: '#D8BFD8',
    borderRadius: 20,
    alignSelf: 'center',
    paddingVertical: 10,
    paddingHorizontal: 30,
    marginTop: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 7,
  },
  insightButtonText: {
    color: '#444',
    fontWeight: 'bold',
  },
});