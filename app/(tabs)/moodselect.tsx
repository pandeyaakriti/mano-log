import MoodWheel from '@/components/screen/MoodWheel';
import { LinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, Text, View } from 'react-native';

const { width } = Dimensions.get('window');

export default function index() {
  return (
    <LinearGradient
      colors={['#e8ffe2ff', '#f7d8e2ff', '#f9ceffff', '#fffedeff']}
      style={styles.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    > 
    {/* Main content */}
      <View style={styles.headerContainer}>
        <Text style={styles.text}>How would you describe your mood today?</Text>
      <View style={styles.wheelContainer}>
        <MoodWheel />
      </View>
      </View>
      {/* Top semicircular gradient */}
      
      <LinearGradient
        colors={['#d1f3b6ff', '#ffe7d1ff', '#cad8ccff']}
        style={styles.topCircle}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      />
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  background: {
    flex: 1,
    position: 'relative',
  },
  topCircle: {
    position: 'absolute',
    top: -width * 0.7, // shift it up to make only half visible
    left: -width * 0.1, // center it
    width: width * 1.2,
    height: width * 1.6,
    borderRadius: width * 0.6,
    borderWidth: 0.4,
    zIndex: 0,
    opacity: 0.6,
    shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
  elevation: 20,
  },
  headerContainer: {
        position: 'absolute',
    top: 220, // adjust to move it up/down
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  text: {
    fontSize: 32,
    color: '#6A4E77',
    fontFamily: 'BreeSerif',  
    fontStyle: 'italic',   
    textAlign: 'center',
    paddingHorizontal: 20,
  },
  wheelContainer: {
    position: 'absolute',
    bottom: -550,  // adjust as needed to raise/lower the wheel
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 2,
  },
  topCircleShadowWrapper: {
  position: 'absolute',
  top: -width * 0.6,
  left: -width * 0.1,
  width: width * 1.2,
  height: width * 1.6,
  borderRadius: width * 0.6,
  zIndex: 0,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 8 },
  shadowOpacity: 0.2,
  shadowRadius: 12,
  elevation: 10, 
},
});