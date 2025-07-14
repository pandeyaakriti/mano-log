import { LinearGradient } from 'expo-linear-gradient';
import { Link, useRouter } from 'expo-router';
import { useEffect } from 'react';
import { Alert, Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { useAuth } from '../context/AuthContext';

export default function IndexScreen() {
  const { user, loading, syncStatus, syncError, testBackendConnection } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading && user) {
      // User is authenticated, redirect to main app
      router.replace('/(tabs)');
    }
  }, [user, loading, router]);

  // Test backend connection on mount (only in development)
  useEffect(() => {
    if (__DEV__ && !loading) {
      testBackendConnection?.()
        .then(() => console.log('✅ Backend connection verified'))
        .catch(error => {
          console.error('❌ Backend connection failed:', error);
          if (__DEV__) {
            Alert.alert(
              'Backend Connection Issue',
              `Cannot connect to backend: ${error.message}`,
              [{ text: 'OK' }]
            );
          }
        });
    }
  }, [loading, testBackendConnection]);

  if (loading) {
    return (
      <LinearGradient
        colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
        locations={[0.1, 0.3, 0.5]}
        style={[styles.container, { justifyContent: 'center' }]}>
        <Text style={styles.title}>Loading...</Text>
        {syncStatus === 'syncing' && (
          <Text style={styles.syncStatus}>Syncing user data...</Text>
        )}
        {syncError && (
          <Text style={styles.syncError}>Sync Error: {syncError}</Text>
        )}
      </LinearGradient>
    );
  }

  return (
    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={styles.container}>

      <View style={styles.logocontainer}>
        <Image 
          source={require('../assets/images/Manolog.png')}
          style={styles.logo}
          resizeMode="contain" 
        />
        <Text style={styles.title}>MANO-LOG</Text>
        <Text style={styles.subtitle}>A log of your mind</Text>
      </View>

      <View style={{ width: '80%' }}>
        <Link href="/auth/signup" asChild>
          <TouchableOpacity style={styles.signupbutton}>
            <Text style={styles.signuptext}>SIGN UP</Text>
          </TouchableOpacity>
        </Link>
        
        <Link href="/auth/login" asChild>
          <TouchableOpacity style={styles.loginbutton}>
            <Text style={styles.logintext}>LOGIN</Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.socialcontainer}>
        <Text style={styles.socialtext}>Login with social media</Text>
        <View style={styles.socialIconsContainer}>
          {['google', 'facebook', 'twitter'].map((icon, index) => (
            <TouchableOpacity
              key={index}
              style={styles.socialIconsbackground}>
              <FontAwesome name={icon} size={25} color="#8A2D6B" />
            </TouchableOpacity>
          ))}
        </View>
      </View>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 50,
  },
  logocontainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  logo: {
    width: 90,
    height: 90,
    marginBottom: 10,
  },
  title: {
    fontFamily: 'BreeSerif',
    fontSize: 21,
    fontWeight: 'bold',
    color: '#3D0066',
    letterSpacing: 5,
  },
  subtitle: {
    fontSize: 17,
    fontFamily: 'DancingScript',
    color: '#3c0071',
  },
  signuptext: {
    fontFamily: 'Instrument',
    fontWeight: 'bold',
    color: 'white',
    fontSize: 13,
  },
  logintext: {
    fontFamily: 'Instrument',
    fontWeight: 'bold',
    color: '#8A2D6B',
    fontSize: 13,
  },
  signupbutton: {
    backgroundColor: '#8D658A',
    paddingVertical: 14,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: 'white',
    alignItems: 'center',
    marginBottom: 23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  loginbutton: {
    backgroundColor: 'white',
    paddingVertical: 14,
    borderRadius: 30,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#8D658A',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 4,
  },
  socialcontainer: {
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  socialtext: {
    fontFamily: 'Instrument',
    fontWeight: 'bold',
    color: 'white',
    fontSize: 15,
    marginBottom: 15,
  },
  socialIconsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 5,
  },
  socialIconsbackground: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  syncStatus: {
    fontFamily: 'Instrument',
    color: '#8A2D6B',
    fontSize: 14,
    marginTop: 10,
    textAlign: 'center',
  },
  syncError: {
    fontFamily: 'Instrument',
    color: '#FF6B6B',
    fontSize: 12,
    marginTop: 5,
    textAlign: 'center',
  },
});
