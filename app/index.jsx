import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import FontAwesome from 'react-native-vector-icons/FontAwesome';
import { Link } from 'expo-router';

export default function index() {
  return (
    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={styles.container} >

      <View style={styles.logocontainer}>
        <Image source={require('../assets/images/Manolog.png')}
          style={styles.logo}
          resizeMode="contain" />

        <Text style={styles.title}> MANO-LOG </Text>

        <Text style={styles.subtitle}> A log of your mind</Text>
      </View>

      <View style={{ width: '80%' }}>
        <Link href="/signup" asChild>
        <TouchableOpacity style={styles.signupbutton}>
          <Text style={styles.signuptext}> SIGN UP </Text>
        </TouchableOpacity>
        </Link>
        
        <Link href="/login" asChild>
          <TouchableOpacity style={styles.loginbutton}>
            <Text style={styles.logintext}> LOGIN </Text>
          </TouchableOpacity>
        </Link>
      </View>

      <View style={styles.socialcontainer}>
        <Text style={styles.socialtext}> Login with social media </Text>

        <View style={{
          flexDirection: 'row',
          justifyContent: 'center',
          gap: 5,
        }}>{['instagram', 'twitter', 'facebook'].map((icon, index) => (
          <TouchableOpacity
            key={index}
            style={styles.socialIconsbackground}
          >
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
  socialIconsbackground: {
    backgroundColor: 'white',
    borderRadius: 25,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
});