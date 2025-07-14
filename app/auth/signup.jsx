import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { useAuth } from '../../context/AuthContext';

export default function Signup() {
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { signup } = useAuth();

  const handleSignup = async () => {
    if (!name || !email || !password) {
      Alert.alert('Error', 'Please fill in all required fields');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      const additionalData = {
        name,
        phone: phone || null,
      };
      
      await signup(email, password, additionalData);
      router.replace('/(tabs)');
    } catch (error) {
      Alert.alert('Signup Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const navigateToLogin = () => {
    router.push('/auth/login');
  };

  return (
    <LinearGradient
      colors={['#FFDDEC', '#D5AFC7', '#C295BC']}
      locations={[0.1, 0.3, 0.5]}
      style={styles.container}>

      <View style={styles.topsection}>
        <Text style={styles.title}>Hello{'\n'}Create your {'\n'}account!</Text>
      </View>

      <View style={styles.cardWrapper}>
        <View style={styles.card}>
          <View style={styles.form}>
            <Text style={styles.label}>Name *</Text>
            <TextInput
              style={styles.input}
              placeholder="Enter your name"
              placeholderTextColor="#A2A2A2"
              value={name}
              onChangeText={setName}
            />
            
            <Text style={styles.label}>Phone</Text>
            <TextInput
              style={styles.input}
              placeholder="Your phone number"
              placeholderTextColor="#A2A2A2"
              keyboardType="phone-pad"
              value={phone}
              onChangeText={setPhone}
            />
            
            <Text style={styles.label}>Gmail *</Text>
            <TextInput
              style={styles.input}
              placeholder="yourname@gmail.com"
              placeholderTextColor="#A2A2A2"
              keyboardType="email-address"
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
            />

            <Text style={styles.label}>Password *</Text>
            <TextInput
              style={styles.input}
              placeholder="Minimum 6 characters"
              placeholderTextColor="#A2A2A2"
              secureTextEntry
              value={password}
              onChangeText={setPassword}
            />

            <TouchableOpacity 
              style={[styles.button, loading && styles.buttonDisabled]}
              onPress={handleSignup}
              disabled={loading}>
              <Text style={styles.buttonText}>
                {loading ? 'CREATING ACCOUNT...' : 'SIGNUP'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>

      <View style={styles.socialcontainer}>
        <Text style={styles.socialtext}>
          Already have an account?{'\n'}Login here
        </Text>
        <TouchableOpacity onPress={navigateToLogin} style={styles.loginLink}>
          <Text style={styles.loginLinkText}>Go to Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
}

// ... (styles remain the same as your original)
const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 50,
    paddingHorizontal: 35,
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
    width: 370,
    height: 490,
    transform: [{ rotate: '-13deg' }],
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
    transform: [{ rotate: '13deg' }],
  },
  label: {
    marginTop: 20,
    fontWeight: 'bold',
    color: '#A38CBC',
    fontSize: 14,
  },
  input: {
    borderBottomWidth: 1,
    borderColor: '#A2A2A2',
    paddingVertical: 5,
    fontSize: 14,
    color: '#333',
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
  buttonDisabled: {
    opacity: 0.6,
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
  loginLink: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
  },
  loginLinkText: {
    color: '#F0EFEF',
    fontWeight: 'bold',
    fontSize: 14,
  },
});