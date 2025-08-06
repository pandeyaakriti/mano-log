//app/components/affirmation/dailyAffirmation.tsx
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
  getPersonalizedDailyAffirmation
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
      activeOpacity={0.9}
    >
      <View style={styles.affirmationHeader}>
        <View style={styles.titleContainer}>
          <Icon name="flower-outline" size={18} color="#7C9885" style={styles.titleIcon} />
          <Text style={styles.sectionTitle}>Daily Affirmation</Text>
        </View>
        <Text style={styles.dayIndicator}>
          {new Date().toLocaleDateString('en-US', { weekday: 'short' })}
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
              size={18} 
              color={state.isAffirmationFavorited ? "#D4756B" : "#B4A5A0"} 
            />
            <Text style={[
              styles.actionText,
              state.isAffirmationFavorited && styles.actionTextActive
            ]}>
              {state.isAffirmationFavorited ? 'Loved' : 'Love'}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={shareAffirmation}
          >
            <Icon name="paper-plane-outline" size={18} color="#B4A5A0" />
            <Text style={styles.actionText}>Share</Text>
          </TouchableOpacity>

          <TouchableOpacity 
            style={styles.actionButton}
            onPress={getAnotherAffirmation}
          >
            <Icon name="refresh-outline" size={18} color="#B4A5A0" />
            <Text style={styles.actionText}>Refresh</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Progress indicator
      {currentStreak > 0 && (
        <View style={styles.progressIndicator}>
          <Icon name="leaf-outline" size={14} color="#E8A87C" style={styles.progressIcon} />
          <Text style={styles.progressText}>
            {getStreakMotivation(currentStreak)}
          </Text>
        </View>
      )} */}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  affirmationSection: {
    marginBottom: 28,
    backgroundColor: 'rgba(244, 236, 236, 0.9)',
    borderRadius: 24,
    padding: 24,
    shadowColor: '#7C9885',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 3,
    borderWidth: 1,
    borderColor: 'rgba(124, 152, 133, 0.1)',
  },
  affirmationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  titleIcon: {
    marginRight: 8,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '500',
    color: '#2D3E2F',
    letterSpacing: 0.2,
  },
  dayIndicator: {
    fontSize: 12,
    color: '#928b89ff',
    fontWeight: '400',
    backgroundColor: 'rgba(228, 203, 199, 1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    letterSpacing: 0.3,
  },
  affirmationContent: {
    color: '#2D3E2F',
    lineHeight: 24,
    fontSize: 16,
    fontStyle: 'italic',
    textAlign: 'center',
    marginBottom: 16,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  affirmationActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 20,
    paddingTop: 20,
    borderTopWidth: 1,
    borderTopColor: 'rgba(124, 152, 133, 0.15)',
  },
  actionButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 16,
    minWidth: 60,
  },
  actionText: {
    fontSize: 12,
    color: '#B4A5A0',
    marginTop: 6,
    fontWeight: '300',
    letterSpacing: 0.2,
  },
  actionTextActive: {
    color: '#D4756B',
    fontWeight: '400',
  },
  progressIndicator: {
    marginTop: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    backgroundColor: 'rgba(230, 193, 193, 0.34)',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 20,
  },
  progressIcon: {
    marginRight: 6,
  },
  progressText: {
    fontSize: 13,
    color: '#7C9885',
    fontWeight: '300',
    letterSpacing: 0.2,
  },
});

export default DailyAffirmation;