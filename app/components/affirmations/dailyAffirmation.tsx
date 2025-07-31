import React, { useEffect, useState } from 'react';
import {
    Alert,
    Animated,
    Easing,
    StyleSheet,
    Text,
    TouchableOpacity,
    View,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import {
    getMoodBasedAffirmation,
    getPersonalizedDailyAffirmation,
    getStreakMotivation
} from './affirmationData';
import type { AffirmationState, User } from './types';

interface DailyAffirmationProps {
  user?: User | null;
  selectedMood?: string | null;
  currentStreak?: number;
}

const DailyAffirmation: React.FC<DailyAffirmationProps> = ({ 
  user, 
  selectedMood, 
  currentStreak = 0 
}) => {
  const [state, setState] = useState<AffirmationState>({
    currentAffirmation: '',
    isAffirmationFavorited: false,
    showAffirmationActions: false,
    affirmationReadCount: 0,
    favoriteAffirmations: []
  });
  
  const [affirmationAnimation] = useState(new Animated.Value(0));

  const getUserDisplayName = (): string => {
    if (user?.displayName) return user.displayName;
    if (user?.email) return user.email.split('@')[0];
    return 'friend';
  };

  const animateAffirmation = () => {
    Animated.timing(affirmationAnimation, {
      toValue: 1,
      duration: 1000,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: true,
    }).start();
  };

  useEffect(() => {
    const userName = getUserDisplayName();
    let affirmation: string;

    // Priority: Mood-based > Regular daily affirmation
    if (selectedMood && selectedMood !== null) {
      affirmation = getMoodBasedAffirmation(selectedMood);
    } else {
      affirmation = getPersonalizedDailyAffirmation(userName);
    }

    setState(prev => ({
      ...prev,
      currentAffirmation: affirmation,
      affirmationReadCount: prev.affirmationReadCount + 1
    }));

    // Animate affirmation on load
    setTimeout(() => {
      animateAffirmation();
    }, 500);
  }, [user, selectedMood]);

  const handleAffirmationTap = () => {
    setState(prev => ({
      ...prev,
      showAffirmationActions: !prev.showAffirmationActions
    }));
  };

  const handleFavoriteAffirmation = () => {
    setState(prev => ({
      ...prev,
      isAffirmationFavorited: !prev.isAffirmationFavorited
    }));
    
    Alert.alert(
      state.isAffirmationFavorited ? 'Removed from favorites' : 'Added to favorites!',
      state.isAffirmationFavorited ? 'Affirmation removed from your collection' : 'This affirmation has been saved to your favorites'
    );
  };

  const shareAffirmation = () => {
    Alert.alert('Share Affirmation', 'Feature coming soon! You\'ll be able to share your daily affirmation with friends.');
  };

  const getAnotherAffirmation = () => {
    const userName = getUserDisplayName();
    const affirmation = getPersonalizedDailyAffirmation(userName);
    setState(prev => ({
      ...prev,
      currentAffirmation: affirmation
    }));
  };

  const animatedStyle = {
    opacity: affirmationAnimation,
    transform: [
      {
        translateY: affirmationAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [20, 0],
        }),
      },
    ],
  };

  return (
    <TouchableOpacity 
      style={styles.affirmationSection} 
      onPress={handleAffirmationTap}
      activeOpacity={0.8}
    >
      <View style={styles.affirmationHeader}>
        <Text style={styles.sectionTitle}>Daily Words of Affirmation</Text>
        <Text style={styles.dayIndicator}>
          {new Date().toLocaleDateString('en-US', { weekday: 'long' })}
        </Text>
      </View>
      
      <Animated.View style={animatedStyle}>
        <Text style={styles.affirmationContent}>
          {state.currentAffirmation}
        </Text>
      </Animated.View>

      {/* Interactive Actions */}
      {state.showAffirmationActions && (
        <View style={styles.affirmationActions}>
          <TouchableOpacity 
            style={styles.actionButton}
            onPress={handleFavoriteAffirmation}
          >
            <Icon 
              name={state.isAffirmationFavorited ? "heart" : "heart-outline"} 
              size={20} 
              color={state.isAffirmationFavorited ? "#E91E63" : "#666"} 
            />
            <Text style={styles.actionText}>
              {state.isAffirmationFavorited ? 'Favorited' : 'Favorite'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={shareAffirmation}
          >
            <Icon name="share-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={getAnotherAffirmation}
          >
            <Icon name="refresh-outline" size={20} color="#666" />
            <Text style={styles.actionText}>Another</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress indicator */}
      {currentStreak > 0 && (
        <View style={styles.progressIndicator}>
          <Text style={styles.progressText}>
            {getStreakMotivation(currentStreak)}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  affirmationSection: {
    marginBottom: 25,
    backgroundColor: '#E0E8DD',
    borderRadius: 18,
    padding: 20,
    borderLeftWidth: 5,
    borderLeftColor: '#81C784',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 5,
  },
  affirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: 'bold',
    color: '#2E7D32',
  },
  dayIndicator: {
    fontSize: 12,
    color: '#4CAF50',
    fontWeight: '600',
    backgroundColor: '#C8E6C9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  affirmationContent: {
    color: '#1B5E20',
    lineHeight: 26,
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 10,
  },
  affirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#A5D6A7',
  },
  actionButton: {
    alignItems: 'center',
    padding: 8,
  },
  actionText: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  progressIndicator: {
    marginTop: 10,
    alignItems: 'center',
  },
  progressText: {
    fontSize: 11,
    color: '#4CAF50',
    fontWeight: '500',
  },
});

export default DailyAffirmation;