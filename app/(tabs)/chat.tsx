import { Ionicons as Icon } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Animated,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { useAuth } from '../../context/AuthContext'; // Add this import

interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
  delivered?: boolean;
}

interface AiChatProps {
  navigation?: any;
}

// User type matching the one from settings
type User = {
  mongoId?: string;
  firebaseUid?: string;
  uid?: string;
  id?: string;
  displayName?: string;
  email?: string;
  photoURL?: string;
  emailVerified?: boolean;
  createdAt?: string | Date;
  updatedAt?: string | Date;
};

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL;
const { height: screenHeight } = Dimensions.get('window');

export default function AiChat({ navigation }: AiChatProps) {
  const { user } = useAuth() as { user: User | null }; // Add auth context
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Welcome to Wellness Chat. How are you feeling today?',
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: true,
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const [connectionChecking, setConnectionChecking] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const scrollRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const inputRef = useRef<TextInput>(null);

  // Helper function to get user ID (same pattern as settings)
  const getUserFirebaseUid = () => {
    return user?.firebaseUid || user?.uid || user?.id;
  };

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  useEffect(() => {
    // Only check connection if user is authenticated
    if (user) {
      checkBackendConnection();
      // Auto-check connection every 30 seconds
      const interval = setInterval(checkBackendConnection, 30000);
      return () => clearInterval(interval);
    }
  }, [user]);

  // Animate loading indicator
  useEffect(() => {
    if (isLoading) {
      Animated.loop(
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: 800,
            useNativeDriver: true,
          }),
          Animated.timing(fadeAnim, {
            toValue: 0.3,
            duration: 800,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      fadeAnim.setValue(0);
    }
  }, [isLoading, fadeAnim]);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      
      if (response.ok) {
        setIsConnected(true);
        setRetryCount(0);
      } else {
        setIsConnected(false);
      }
    } catch (error: unknown) {
      console.error('Backend connection failed:', error);
      setIsConnected(false);
    } finally {
      setConnectionChecking(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim() || isLoading) return;

    // Check if user is authenticated
    const userId = getUserFirebaseUid();
    if (!userId) {
      Alert.alert('Authentication Error', 'Please login to send messages.');
      return;
    }

    const messageText = input.trim();
    const userMessage: Message = {
      text: messageText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      delivered: false,
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    // Auto-scroll to bottom
    setTimeout(() => {
      scrollRef.current?.scrollToEnd({ animated: true });
    }, 100);

    try {
      // Call backend API with dynamic user ID
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: userId, // Use dynamic user ID instead of hardcoded
          message: messageText,
          source: 'chat'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.botMessage) {
        // Mark user message as delivered
        setMessages((prev) => 
          prev.map((msg, index) => 
            index === prev.length - 1 && msg.sender === 'user' 
              ? { ...msg, delivered: true }
              : msg
          )
        );

        // Add bot response with typing effect
        setTimeout(() => {
          const botMessage: Message = {
            id: data.botMessage.id,
            text: data.botMessage.text,
            sender: 'bot',
            time: data.botMessage.time,
            delivered: true,
          };
          setMessages((prev) => [...prev, botMessage]);
        }, 500);
        
        setRetryCount(0);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      
      setRetryCount(prev => prev + 1);
      
      // Enhanced error handling
      let errorMessage = "I'm having trouble connecting right now.";
      
      if (retryCount >= 2) {
        errorMessage = "I'm experiencing connection issues. Please check your internet and try again later.";
      } else {
        errorMessage = "Let me try to reconnect. Please wait a moment.";
      }

      const fallbackMessage: Message = {
        text: errorMessage,
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        delivered: true,
      };
      
      setMessages((prev) => [...prev, fallbackMessage]);

      // Auto-retry connection check
      if (retryCount < 3) {
        setTimeout(() => {
          checkBackendConnection();
        }, 2000);
      }

      // Show user-friendly alert only on repeated failures
      if (retryCount >= 2) {
        Alert.alert(
          'Connection Issue',
          'I\'m having trouble responding right now. Your messages are saved and I\'ll try to reconnect automatically.',
          [
            { text: 'Retry Now', onPress: checkBackendConnection },
            { text: 'OK', style: 'cancel' }
          ]
        );
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleRetryConnection = () => {
    setConnectionChecking(true);
    checkBackendConnection();
  };

  // Show authentication prompt if user is not logged in
  if (!user) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.authPromptContainer}>
          <Icon name="lock-closed-outline" size={60} color="#D5AABF" />
          <Text style={styles.authPromptTitle}>Authentication Required</Text>
          <Text style={styles.authPromptText}>
            Please login to access the wellness chat.
          </Text>
          <TouchableOpacity 
            style={styles.loginButton}
            onPress={() => navigation?.navigate('Login')}
            activeOpacity={0.7}
          >
            <Text style={styles.loginButtonText}>Go to Login</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const ConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      {connectionChecking ? (
        <ActivityIndicator size="small" color="#fff" style={{ width: 8, height: 8 }} />
      ) : (
        <View style={[
          styles.statusDot, 
          { backgroundColor: isConnected ? '#4CAF50' : '#FF5722' }
        ]} />
      )}
      <Text style={styles.statusText}>
        {connectionChecking ? 'Connecting...' : (isConnected ? 'Online' : 'Offline')}
      </Text>
    </View>
  );

  const TypingIndicator = () => (
    <Animated.View style={[styles.loadingContainer, { opacity: fadeAnim }]}>
      <View style={styles.typingDots}>
        <View style={[styles.dot, styles.dot1]} />
        <View style={[styles.dot, styles.dot2]} />
        <View style={[styles.dot, styles.dot3]} />
      </View>
      <Text style={styles.loadingText}>Wellness bot is thinking...</Text>
    </Animated.View>
  );

  const MessageBubble = ({ msg, index }: { msg: Message; index: number }) => (
    <View
      key={msg.id || index}
      style={[
        styles.messageWrapper,
        msg.sender === 'user' ? styles.userMessageWrapper : styles.botMessageWrapper,
      ]}
    >
      <View
        style={[
          styles.messageBubble,
          msg.sender === 'user' ? styles.userBubble : styles.botBubble,
          msg.sender === 'user' && !msg.delivered && styles.undeliveredBubble,
        ]}
      >
        <Text style={[
          styles.messageText,
          msg.sender === 'user' ? styles.userMessageText : styles.botMessageText
        ]}>
          {msg.text}
        </Text>
        <View style={styles.messageFooter}>
          <Text style={styles.timeText}>{msg.time}</Text>
          {msg.sender === 'user' && (
            <Icon 
              name={msg.delivered ? "checkmark-done" : "checkmark"} 
              size={12} 
              color={msg.delivered ? "#4CAF50" : "#999"} 
              style={styles.deliveryIcon}
            />
          )}
        </View>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      <LinearGradient
  colors={['#EFB7D4', '#CBB1E0']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.header}
>
  <TouchableOpacity 
    style={styles.headerButton} 
    onPress={() => navigation?.goBack()}
    activeOpacity={0.7}
  >
    <Icon name="arrow-back" size={24} color="#fff" />
  </TouchableOpacity>

  <View style={styles.headerCenter}>
    <Text style={styles.headerTitle}>Wellness Bot</Text>
    <ConnectionStatus />
  </View>

  <TouchableOpacity 
    style={styles.headerButton} 
    onPress={handleRetryConnection}
    activeOpacity={0.7}
  >
    <Icon name="refresh" size={24} color="#000" />
  </TouchableOpacity>
</LinearGradient>

      {/* Chat + Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.chatContainer}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {messages.map((msg, index) => (
            <MessageBubble key={msg.id || index} msg={msg} index={index} />
          ))}
          
          {/* Typing indicator */}
          {isLoading && <TypingIndicator />}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBar}>
            
            <TextInput
              ref={inputRef}
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={!isLoading}
              multiline={true}
              maxLength={500}
              blurOnSubmit={false}
            />
            <TouchableOpacity 
              style={[
                styles.sendButton, 
                (!input.trim() || isLoading) && styles.sendButtonDisabled
              ]} 
              onPress={sendMessage}
              disabled={isLoading || !input.trim()}
              activeOpacity={0.7}
            >
              <Icon 
                name="send" 
                size={18} 
                color={(!input.trim() || isLoading) ? "#ccc" : "#D5AABF"} 
              />
            </TouchableOpacity>
          </View>
          {!isConnected && (
            <View style={styles.offlineIndicator}>
              <Text style={styles.offlineText}>
                You&apos;re offline. Messages will be sent when connection is restored.
              </Text>
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFF',
  },
 header: {
  height: 70,
  paddingHorizontal: 15,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
},
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 20,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    color: '#fff',
    fontWeight: 'bold',
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 5,
  },
  statusText: {
    fontSize: 12,
    color: '#fff',
    opacity: 0.9,
  },
  scrollView: {
    flex: 1,
  },
  chatContainer: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 20,
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 12,
  },
  userMessageWrapper: {
    alignItems: 'flex-end',
  },
  botMessageWrapper: {
    alignItems: 'flex-start',
  },
  messageBubble: {
    padding: 12,
    borderRadius: 18,
    maxWidth: '85%',
    minWidth: 60,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  userBubble: {
    backgroundColor: '#E4DDE8',
  },
  undeliveredBubble: {
    opacity: 0.7,
  },
  botBubble: {
    backgroundColor: '#D8D5F0',
  },
  messageText: {
    fontSize: 16,
    lineHeight: 20,
  },
  userMessageText: {
    color: '#333333',
  },
  botMessageText: {
    color: '#333333',
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 4,
  },
  timeText: {
    fontSize: 11,
    color: '#777',
    opacity: 0.8,
  },
  deliveryIcon: {
    marginLeft: 4,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    padding: 15,
    paddingLeft: 0,
  },
  typingDots: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 18,
    padding: 12,
    marginRight: 10,
    elevation: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
  },
  dot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#D5AABF',
    marginHorizontal: 2,
  },
  dot1: {
    animationDelay: '0ms',
  },
  dot2: {
    animationDelay: '200ms',
  },
  dot3: {
    animationDelay: '400ms',
  },
  loadingText: {
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#E8E8E8',
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: 12,
    minHeight: 60,
  },
  
  textInput: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#F8F8F8',
    borderRadius: 24,
    fontSize: 16,
    marginHorizontal: 4,
    maxHeight: 100,
    borderWidth: 1,
    borderColor: '#E8E8E8',
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 8,
    borderRadius: 20,
    backgroundColor: '#F8F8F8',
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
  offlineIndicator: {
    backgroundColor: '#FFF3CD',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: '#FFE69C',
  },
  offlineText: {
    fontSize: 12,
    color: '#856404',
    textAlign: 'center',
  },
  // New styles for authentication prompt
  authPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  authPromptTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#6B4E71',
    marginTop: 20,
    marginBottom: 12,
  },
  authPromptText: {
    fontSize: 16,
    color: '#777',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 30,
  },
  loginButton: {
    backgroundColor: '#D5AABF',
    paddingVertical: 14,
    paddingHorizontal: 32,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 6,
  },
  loginButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});