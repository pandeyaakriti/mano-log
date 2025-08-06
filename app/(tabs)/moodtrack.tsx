import MoodWheel from '@/components/screen/MoodWheel';
import { useFonts } from 'expo-font';
import { LinearGradient as XPLinearGradient } from 'expo-linear-gradient';
import { Dimensions, StyleSheet, Text, View } from 'react-native';
import Svg, { Defs, Path, RadialGradient, Stop } from 'react-native-svg';


const { width } = Dimensions.get('window');

export default function index() {
  const [fontsLoaded] = useFonts({
      PlusJakartaSans: require('../../assets/fonts/PlusJakartaSans.ttf'),
    });
    if (!fontsLoaded) {
      return (
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
          <Text>Loading fonts...</Text>
        </View>
      );
      }
  return (
    <XPLinearGradient
      colors={['#f9fdf8ff', '#f6fff4ff']}
      style={styles.background}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
    > 
    {/* Main content */}
      <View style={styles.headerContainer}>
        <Text style={[{ fontFamily: 'PlusJakartaSans' }, styles.text]}>
        How would you describe your mood today? </Text>

        <Text style = {styles.choosetext}> Choose from the reactions below:</Text>
      <View style={styles.wheelContainer}>
        <MoodWheel />
      </View>
      </View>
<View style={styles.waveWrapper}>
  <Svg width={width} height={400} viewBox={`0 0 ${width} 400`}>
    <Defs>
    <RadialGradient id="grad" cx="50%"
  cy="50%"
  rx="50%"
  ry="50%"
  fx="70%"
  fy="70%">
        <Stop offset="0%" stopColor="#FFDDEC" />
        <Stop offset="70%" stopColor="#dcbcd0ff" />
        <Stop offset="100%" stopColor="#c5a8c1ff" />
    </RadialGradient>
    </Defs>
    <Path
      d={`
        M0,0 
        H${width} 
        V300 
        C${width * 0.83},360 ${width * 0.66},240 ${width * 0.5},300 
        C${width * 0.33},360 ${width * 0.16},240 0,300 
        Z
      `}
      fill="url(#grad)"
    />
    
  </Svg>
</View>
</XPLinearGradient> 
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
    fontSize: 28,
    color: '#480b70ff', 
    textAlign: 'center',
    paddingHorizontal: 20,
    top: -110,
  },
  choosetext: {
    fontSize: 15,
    color: '#480b70ff', 
    textAlign: 'center',
    paddingHorizontal: 20,
    fontFamily: 'PlusJakartaSans',
    top: -100,
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
topCircleWrapper: {
  position: 'absolute',
  top: -width * 0.82,
  left: -width * 0.1,
  width: width * 1.2,
  height: width * 1.6,
  borderRadius: width * 0.6,
  overflow: 'hidden', 
  zIndex: 0,
  elevation: 20,
  shadowColor: '#000',
  shadowOffset: { width: 0, height: 12 },
  shadowOpacity: 0.25,
  shadowRadius: 16,
},

patternBackground: {
  ...StyleSheet.absoluteFillObject,
  resizeMode: 'cover',
  opacity: 1,
},
waveWrapper: {
  position: 'absolute',
  top: 0, // top background with wave at bottom
  left: 0,
  width: width,
  height: 800,
  zIndex: 0,
}
});