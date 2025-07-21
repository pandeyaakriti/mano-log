import { Ionicons as Icon } from '@expo/vector-icons';
import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
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

interface Message {
  id?: string;
  text: string;
  sender: 'user' | 'bot';
  time: string;
}

interface AiChatProps {
  navigation?: any;
}

// Configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_URL
const USER_ID = '6876a91ad13eac66af0cc683'; // You can make this dynamic based on actual user

export default function AiChat({ navigation }: AiChatProps) {
  const [messages, setMessages] = useState<Message[]>([
    {
      text: 'Welcome to Wellness Chat. How are you feeling today?',
      sender: 'bot',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isConnected, setIsConnected] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages]);

  // Check backend connection on component mount
  useEffect(() => {
    checkBackendConnection();
  }, []);

  const checkBackendConnection = async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/health`);
      if (response.ok) {
        setIsConnected(true);
      } else {
        setIsConnected(false);
      }
    } catch (error) {
      console.error('Backend connection failed:', error);
      setIsConnected(false);
    }
  };

  const sendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: Message = {
      text: input.trim(),
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    // Add user message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInput('');
    setIsLoading(true);

    try {
      // Call backend API
      const response = await fetch(`${API_BASE_URL}/api/chat/message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: USER_ID,
          message: userMessage.text,
          source: 'chat'
        }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();

      if (data.success && data.botMessage) {
        // Add bot response
        const botMessage: Message = {
          id: data.botMessage.id,
          text: data.botMessage.text,
          sender: 'bot',
          time: data.botMessage.time,
        };
        setMessages((prev) => [...prev, botMessage]);
      } else {
        throw new Error('Invalid response from server');
      }
    } catch (error) {
      console.error('Error sending message:', error);
      
      // Fallback response when backend is unavailable
      const fallbackMessage: Message = {
        text: "I'm having trouble connecting right now. Please try again later.",
        sender: 'bot',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      };
      setMessages((prev) => [...prev, fallbackMessage]);

      // Show alert to user
      Alert.alert(
        'Connection Error',
        'Unable to connect to the wellness bot. Please check your internet connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoading(false);
    }
  };

  const ConnectionStatus = () => (
    <View style={styles.connectionStatus}>
      <View style={[styles.statusDot, { backgroundColor: isConnected ? '#4CAF50' : '#FF5722' }]} />
      <Text style={styles.statusText}>
        {isConnected ? 'Connected' : 'Disconnected'}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
      <TouchableOpacity style={styles.headerButton} onPress={() => navigation?.navigate('index')}
>
  <Icon name="arrow-back" size={24} color="#fff" />
</TouchableOpacity>

        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Wellness Bot</Text>
          <ConnectionStatus />
        </View>
        <TouchableOpacity style={styles.headerButton} onPress={checkBackendConnection}>
          <Icon name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Chat + Input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={60}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollRef}
          style={styles.scrollView}
          contentContainerStyle={styles.chatContainer}
          keyboardShouldPersistTaps="handled"
        >
          {messages.map((msg, index) => (
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
                ]}
              >
                <Text style={styles.messageText}>{msg.text}</Text>
                <Text style={styles.timeText}>{msg.time}</Text>
              </View>
            </View>
          ))}
          
          {/* Loading indicator */}
          {isLoading && (
            <View style={styles.loadingContainer}>
              <ActivityIndicator size="small" color="#D5AABF" />
              <Text style={styles.loadingText}>Bot is typing...</Text>
            </View>
          )}
        </ScrollView>

        {/* Input */}
        <View style={styles.inputContainer}>
          <View style={styles.inputBar}>
            <TouchableOpacity style={styles.attachButton}>
              <Icon name="attach" size={20} color="#aaa" />
            </TouchableOpacity>
            <TextInput
              style={styles.textInput}
              placeholder="What's on your mind?"
              placeholderTextColor="#999"
              value={input}
              onChangeText={setInput}
              onSubmitEditing={sendMessage}
              returnKeyType="send"
              editable={!isLoading}
            />
            <TouchableOpacity 
              style={[styles.sendButton, isLoading && styles.sendButtonDisabled]} 
              onPress={sendMessage}
              disabled={isLoading || !input.trim()}
            >
              <Icon name="send" size={18} color={isLoading ? "#ccc" : "#aaa"} />
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F0D4D6',
  },
  header: {
    backgroundColor: '#D5AABF',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 15,
    height: 60,
  },
  headerButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
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
    opacity: 0.8,
  },
  scrollView: {
    flex: 1,
  },
  chatContainer: {
    padding: 15,
    paddingTop: 20,
    paddingBottom: 100,
  },
  messageWrapper: {
    width: '100%',
    marginBottom: 15,
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
    maxWidth: '80%',
    minWidth: 60,
  },
  userBubble: {
    backgroundColor: '#B9A9D1',
  },
  botBubble: {
    backgroundColor: '#F7F1F3',
  },
  messageText: {
    fontSize: 14,
    color: '#333',
    lineHeight: 18,
  },
  timeText: {
    fontSize: 10,
    color: '#777',
    marginTop: 5,
    textAlign: 'right',
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 10,
  },
  loadingText: {
    marginLeft: 8,
    fontSize: 14,
    color: '#777',
    fontStyle: 'italic',
  },
  inputContainer: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  inputBar: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    minHeight: 60,
  },
  attachButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 5,
  },
  textInput: {
    flex: 1,
    paddingHorizontal: 15,
    paddingVertical: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 20,
    fontSize: 14,
    marginHorizontal: 5,
  },
  sendButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    marginLeft: 5,
  },
  sendButtonDisabled: {
    opacity: 0.5,
  },
});