import LottieView from 'lottie-react-native';
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, PanResponder, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import Needle from '../../assets/images/needle.svg';

const { width, height } = Dimensions.get('window');
const RADIUS = width * 0.270;

const EMOJIS = [
  { name: 'sad', image: require('../../assets/images/sad.png') },
  { name: 'fine', image: require('../../assets/images/fine.png') },
  { name: 'happy', image: require('../../assets/images/happy.png') },
  { name: 'nervous', image: require('../../assets/images/nervous.png') },
  { name: 'disappointed', image: require('../../assets/images/disappointed.png') },
  { name: 'irritated', image: require('../../assets/images/irritated.png') },
];

const ANGLE_STEP = Math.PI / (EMOJIS.length - 1);
const REPEAT_COUNT = 100;
const LOOP_EMOJIS = Array(REPEAT_COUNT).fill(EMOJIS).flat();
const CENTER_OFFSET = Math.floor(LOOP_EMOJIS.length / 2);

const MESSAGES = ["Sad", "Fine", "Happy!", "Nervous", "Disappointed", "Irritated"];

export default function MoodWheel() {
  const [rotation, setRotation] = useState(0);
  const [showAnimation, setShowAnimation] = useState(false);
  const [currentMood, setCurrentMood] = useState<string | null>(null);
  const animationRef = useRef<LottieView>(null);

  const panResponder = PanResponder.create({
    onStartShouldSetPanResponder: () => true,
    onPanResponderMove: (_, gestureState) => {
      let newRotation = rotation - gestureState.dx * 0.01;
      setRotation(newRotation);
    },
    onPanResponderRelease: (_, gestureState) => {
      let newRotation = rotation - gestureState.dx * 0.01;
      const snapped = Math.round(newRotation / ANGLE_STEP);
      setRotation(snapped * ANGLE_STEP);
    },
  });

  let selectedIndex = Math.round(rotation / ANGLE_STEP) % EMOJIS.length;
  if (selectedIndex < 0) selectedIndex += EMOJIS.length;

  useEffect(() => {
    if (showAnimation) {
      animationRef.current?.play();
    }
  }, [showAnimation]);

  return (
    <View style={styles.container} {...panResponder.panHandlers}>
      <View style={styles.donutContainer}>
        <View style={styles.outerHalfCircle} />
        <View style={styles.innerHalfCircle} />
      </View>

      <View style={styles.needleIcon}>
        <Needle width={60} height={80} fill="#6A4E77" />
      </View>

      <View style={styles.labelContainer}>
        <View style={styles.centerEmojiCircle}>
          <Image source={EMOJIS[selectedIndex].image} style={styles.labelEmoji} />
        </View>
        <Text style={styles.labelMessage}>{MESSAGES[selectedIndex]}</Text>
      </View>

      {/* Emoji Wheel */}
      {LOOP_EMOJIS.map((emoji, i) => {
        const angle = ANGLE_STEP * (i - CENTER_OFFSET);
        const posAngle = angle - rotation;
        if (Math.abs(posAngle) > Math.PI / 2 + 0.5) return null;

        const x = RADIUS * Math.cos(posAngle - Math.PI / 2);
        const y = RADIUS * Math.sin(posAngle - Math.PI / 2);
        const isSelected = Math.abs(posAngle) < ANGLE_STEP / 2;

        return (
          <Image
            key={i + emoji.name}
            source={emoji.image}
            style={{
              position: 'absolute',
              left: width / 2 + x - (isSelected ? 25 : 18),
              top: RADIUS + y - (isSelected ? 25 : 18),
              width: isSelected ? 60 : 35,
              height: isSelected ? 60 : 35,
              opacity: isSelected ? 1 : 0.5,
              resizeMode: 'contain',
            }}
          />
        );
      })}

      {/* Save Button */}
      <TouchableOpacity
        style={styles.saveButtonContainer}
        onPress={() => {
          const moodName = EMOJIS[selectedIndex].name;
          setCurrentMood(moodName);
          setShowAnimation(true);
          console.log("Mood saved!", moodName);
        }}
      >
        <Text style={styles.saveButtonText}>Save Mood</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width,
    height: RADIUS * 2.2,
  },
  labelContainer: {
    position: 'absolute',
    top: -170,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  labelEmoji: {
    width: 87,
    height: 87,
    resizeMode: 'contain',
  },
  labelMessage: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#6A4E77',
    left: 2,
    marginTop: -17,
  },
  needleIcon: {
    position: 'absolute',
    top: 40,
    left: width / 1.58 - 80,
    zIndex: 10,
    transform: [{ rotate: '-93deg' }],
  },
  saveButtonContainer: {
    marginTop: RADIUS * 1.3,
    alignSelf: 'center',
    backgroundColor: '#fffcdbff',
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderWidth: 0.2,
    borderRadius: 24,
    shadowColor: '#B197FC',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 3 },
    shadowRadius: 6,
    elevation: 5,
  },
  saveButtonText: {
    color: '#6A4E77',
    fontSize: 18,
    fontWeight: 'bold',
  },
  centerEmojiCircle: {
    width: 92,
    top: -30,
    height: 92,
    borderRadius: 45,
    borderWidth: 1.3,
    borderColor: '#6A4E77',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#6A4E77',
    shadowOpacity: 0.3,
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 6,
    elevation: 8,
  },
  donutContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: RADIUS * 2,
    alignItems: 'center',
    justifyContent: 'flex-start',
    zIndex: 0,
  },
  outerHalfCircle: {
    width: RADIUS * 2.54,
    height: RADIUS * 2.54,
    borderRadius: RADIUS * 1.5,
    backgroundColor: '#7d847796',
    position: 'absolute',
    top: -30,
    opacity: 0.35,
  },
  innerHalfCircle: {
    width: RADIUS * 1.5,
    height: RADIUS * 1.55,
    borderRadius: RADIUS * 0.8,
    backgroundColor: '#fcdefcff',
    position: 'absolute',
    top: 40,
    opacity: 1,
  },
  confetti: {
    position: 'absolute',
    top: -height * 0.8,  // adjust as needed to center nicely
    left: -width * 0.1,
    width: width * 1.4,
    height: height * 1.2,
    zIndex: 999,
  },
});
