import { FontAwesome } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { Link, router} from 'expo-router';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';

export default function LoginPage() {
  return (

    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={styles.gradient} >

      <View style={styles.topsection}>
        <Text style={styles.title}>Hello{'\n'}Login Here!</Text>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.form}>
            <Text style={styles.label}>Gmail</Text>
            <TextInput
              style={styles.input}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#A2A2A2"
              keyboardType="email-address"
            />

            <Text style={styles.label}>Password</Text>
            <TextInput
              style={styles.input}
              secureTextEntry
              placeholderTextColor="#888"
            />

            <TouchableOpacity style={styles.forgot}>
              <Text style={styles.forgotText}>forgot password?</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
  style={styles.button}
  onPress={() => router.replace('/(tabs)')}
>
  <Text style={styles.buttonText}>LOGIN</Text>
</TouchableOpacity>

          </View>
        </View>
      </View>

      <View style={styles.socialcontainer}>
        <Text style={styles.socialtext}>
          <Text>Dont have any account? {'\n'}Sign up with social media</Text>
        </Text>

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
  gradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 35,
    paddingVertical: 50,
  },

  cardWrapper: {
    marginTop: -30,
    marginLeft: -25,
    alignItems: 'center',
    width: '100%',
  },

  card: {
    backgroundColor: '#F9F9F9',
    borderRadius: 50,
    width: 350,
    height: 420,
    transform: [{ rotate: '-20deg' }],
    shadowColor: '#000',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 5 },
    shadowRadius: 10,
    elevation: 10,
    alignSelf: 'center',
    marginLeft: 30,

  },
  topsection: {
    alignItems: 'flex-start',
    width: '100%',
    marginTop: -150,
    marginBottom: 50,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#F0EFEF',
    fontFamily: 'Inter',
  },
  form: {
    marginTop: 40,
    padding: 25,
    transform: [{ rotate: '20deg' }],
  },
  label: {
    marginTop: 20,
    fontWeight: 'bold',
    color: '#A38CBC',
    fontSize: 14,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#aaa',
    paddingVertical: 5,
    fontSize: 14,
    color: '#A2A2A2',
  },
  forgot: {
    alignSelf: 'flex-end',
    marginTop: 5,
  },
  forgotText: {
    fontSize: 12,
    color: '#A2A2A2',
  },
  button: {
    backgroundColor: '#8D658A',
    paddingVertical: 14,
    width: 220,
    borderRadius: 30,
    borderWidth: 1,
    borderColor: '#45117A',
    alignItems: 'center',
    alignSelf: 'center',
    marginTop: 50,
    marginBottom: 23,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
  },
  socialcontainer: {
    alignSelf: 'center',
    position: 'absolute',
    bottom: 50,
    alignItems: 'center',
    width: '100%',
  },
  socialtext: {
    fontFamily: 'Instrument',
    fontWeight: 'bold',
    color: '#F0EFEF',
    fontSize: 13,
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

