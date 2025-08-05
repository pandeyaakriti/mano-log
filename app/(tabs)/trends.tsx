//@ts-ignore
//@ts-nocheck
import { useFonts } from 'expo-font';
import { LinearGradient } from 'expo-linear-gradient';
import { useFocusEffect } from 'expo-router';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Added missing import
import { useCallback, useEffect, useState } from 'react';
import {
  ActivityIndicator, Dimensions, Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import { BarChart } from 'react-native-gifted-charts';
import Svg, { Circle, Defs, G, Path, Stop, LinearGradient as SvgLinearGradient, Text as SvgText } from 'react-native-svg';

const { width } = Dimensions.get('window');

const EMOJIS = [
  { name: 'sad', image: require('../../assets/images/sad.png'), color: '#bed9efff' },
  { name: 'fine', image: require('../../assets/images/fine.png'), color: '#ffe1c8ff' },
  { name: 'happy', image: require('../../assets/images/happy.png'), color: '#eac8d7ff' },
  { name: 'nervous', image: require('../../assets/images/nervous.png'), color: '#dfa7cfff' },
  { name: 'disappointed', image: require('../../assets/images/disappointed.png'), color: '#e4a787c5' },
  { name: 'irritated', image: require('../../assets/images/irritated.png'), color: '#7ab7deff' },
];

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// API configuration
const API_BASE_URL = process.env.EXPO_PUBLIC_API_BASE_URL;

// Auth helper functions
const getAuthToken = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    const user = auth.currentUser;
    if (user) {
      const token = await user.getIdToken();
      return token;
    }
    return null;
  } catch (error) {
    console.error('Error getting Firebase token:', error);
    return null;
  }
};

const getCurrentUserId = async (): Promise<string | null> => {
  try {
    const auth = getAuth();
    const firebaseUser = auth.currentUser;
    
    if (!firebaseUser) {
      console.log('No Firebase user found');
      return null;
    }

    const response = await fetch(`${API_BASE_URL}/users/by-firebase/${firebaseUser.uid}`);
    
    if (response.ok) {
      const userData = await response.json();
      if (userData.success && userData.data && userData.data.id) {
        return userData.data.id;
      }
    }
    
    console.error('Failed to get user ID from database');
    return null;
  } catch (error) {
    console.error('Error getting current user ID:', error);
    return null;
  }
};

// Types for API responses
interface WeeklyTrendBar {
  value: number;
  label: string;
  frontColor: string;
  originalCount?: number;
  aggregatedMood?: string;
  allMoodsThisDay?: { mood: string; intensity: number; time: string }[];
}

interface WeeklyTrendData {
  label: string;
  bars: WeeklyTrendBar[];
  startDate: string;
  endDate: string;
  moodCounts: number[]; // Array of 6 numbers for each mood type
  stats: {
    totalDaysWithMoods: number;
    totalEntries: number;
    allMoodCounts: number[];
  };
}

interface MoodStats {
  longestStreak: number;
  currentStreak: number;
  avgMoodThisWeek: string;
  avgMoodIndex: number;
  weeklyStats: {
    totalEntriesThisWeek: number;
    allMoodCountsThisWeek: number[];
  };
}

// Enhanced API functions
const trendsApi = {
  getWeeklyTrends: async (userId: string, algorithm: string = 'mostFrequent'): Promise<{ success: boolean; data: WeeklyTrendData[] }> => {
    try {
      const token = await getAuthToken();
      
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/trends/weekly?userId=${userId}&algorithm=${algorithm}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching weekly trends:', error);
      throw error;
    }
  },

  getMonthlyTrends: async (userId: string, algorithm: string = 'latest'): Promise<{ 
    success: boolean; 
    data: Record<string, number[]>;
    moodCounts: Record<string, number[]>; // NEW: Separate mood counts
  }> => {
    try {
      const token = await getAuthToken();
      
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/trends/monthly?userId=${userId}&algorithm=${algorithm}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching monthly trends:', error);
      throw error;
    }
  },

  getMoodStats: async (userId: string, algorithm: string = 'latest'): Promise<{ success: boolean; data: MoodStats }> => {
    try {
      const token = await getAuthToken();
      
      if (!token || !userId) {
        throw new Error('Authentication required');
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000);

      const response = await fetch(`${API_BASE_URL}/trends/stats?userId=${userId}&algorithm=${algorithm}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'X-User-Id': userId,
        },
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || `HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      return data;
    } catch (error) {
      console.error('Error fetching mood stats:', error);
      throw error;
    }
  },
};

// Enhanced fallback data generation
const generateRecentWeeklyData = (): WeeklyTrendData[] => {
  const today = new Date();
  const weeks = [];
  
  for (let i = 2; i >= 0; i--) {
    const weekStart = new Date(today);
    weekStart.setDate(today.getDate() - (i * 7) - today.getDay());
    
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    
    const formatDate = (date: Date) => {
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };
    
    const bars = [];
    const moodCounts = new Array(6).fill(0);
    let totalEntries = 0;
    
    for (let day = 0; day < 7; day++) {
      const currentDay = new Date(weekStart);
      currentDay.setDate(weekStart.getDate() + day);
      
      const hasMood = Math.random() > 0.3;
      
      if (hasMood) {
        // Simulate multiple entries per day sometimes
        const entriesThisDay = Math.random() > 0.7 ? Math.floor(Math.random() * 3) + 2 : 1;
        
        // For display, use the "aggregated" mood (latest)
        const displayMoodIndex = Math.floor(Math.random() * EMOJIS.length);
        const value = (displayMoodIndex + 1) * 5;
        
        // For mood counts, add all simulated entries
        for (let e = 0; e < entriesThisDay; e++) {
          const moodIndex = Math.floor(Math.random() * EMOJIS.length);
          moodCounts[moodIndex]++;
          totalEntries++;
        }
        
        bars.push({
          value,
          label: currentDay.getDate().toString(),
          frontColor: EMOJIS[displayMoodIndex].color,
          originalCount: entriesThisDay,
        });
      } else {
        bars.push({
          value: 0,
          label: currentDay.getDate().toString(),
          frontColor: 'transparent',
          originalCount: 0,
        });
      }
    }
    
    weeks.push({
      label: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      bars,
      moodCounts,
      stats: {
        totalDaysWithMoods: bars.filter(b => b.value > 0).length,
        totalEntries,
        allMoodCounts: moodCounts,
      }
    });
  }
  
  return weeks;
};

const generateRecentMonthlyData = (): { 
  data: Record<string, number[]>; 
  moodCounts: Record<string, number[]>;
} => {
  const data: Record<string, number[]> = {};
  const moodCounts: Record<string, number[]> = {};
  const today = new Date();
  
  for (let i = 2; i >= 0; i--) {
    const month = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${month.getFullYear()}-${(month.getMonth() + 1).toString().padStart(2, '0')}`;
    const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
    
    const monthData = [];
    const monthMoodCounts = new Array(6).fill(0);
    
    for (let day = 0; day < daysInMonth; day++) {
      const hasMood = Math.random() > 0.2;
      if (hasMood) {
        // For calendar display (aggregated)
        const displayMoodIndex = Math.floor(Math.random() * EMOJIS.length);
        monthData.push(displayMoodIndex);
        
        // For mood counts (all entries)
        const entriesThisDay = Math.random() > 0.6 ? Math.floor(Math.random() * 3) + 2 : 1;
        for (let e = 0; e < entriesThisDay; e++) {
          const moodIndex = Math.floor(Math.random() * EMOJIS.length);
          monthMoodCounts[moodIndex]++;
        }
      } else {
        monthData.push(-1);
      }
    }
    
    data[key] = monthData;
    moodCounts[key] = monthMoodCounts;
  }
  
  return { data, moodCounts };
};

// Updated fallback data
const fallbackWeeklyData: WeeklyTrendData[] = generateRecentWeeklyData();
const fallbackMonthlyData = generateRecentMonthlyData();

const fallbackMoodStats: MoodStats = {
  longestStreak: Math.floor(Math.random() * 50) + 20,
  currentStreak: Math.floor(Math.random() * 30) + 5,
  avgMoodThisWeek: 'HAPPY',
  avgMoodIndex: 2,
  weeklyStats: {
    totalEntriesThisWeek: Math.floor(Math.random() * 15) + 5,
    allMoodCountsThisWeek: Array.from({ length: 6 }, () => Math.floor(Math.random() * 5)),
  }
};

// Generate calendar days array
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0);
  const firstWeekday = firstDay.getDay();
  const totalDays = lastDay.getDate();

  const daysArray = [];

  for (let i = 0; i < firstWeekday; i++) {
    daysArray.push(null);
  }
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  return daysArray;
};

// Enhanced mood counting functions that work with the new data structure
function getMoodCountFromWeek(weekData: WeeklyTrendData) {
  // Use the moodCounts array directly from the API response
  return weekData.moodCounts || new Array(EMOJIS.length).fill(0);
}

function getMoodCountFromMonth(monthMoodCounts: number[]) {
  // Use the moodCounts array directly from the API response
  return monthMoodCounts || new Array(EMOJIS.length).fill(0);
}

const MoodArc = ({ counts, total }: { counts: number[]; total: number }) => {
  const rOuter = 50;
  const rInner = 35;
  const cx = 60;
  const cy = 60;

  const toRadians = (angle: number) => (Math.PI / 180) * angle;

  const createArcPath = (startAngle: number, endAngle: number) => {
    const largeArc = endAngle - startAngle > 180 ? 1 : 0;

    const x1 = cx + rOuter * Math.cos(toRadians(startAngle - 90));
    const y1 = cy + rOuter * Math.sin(toRadians(startAngle - 90));
    const x2 = cx + rOuter * Math.cos(toRadians(endAngle - 90));
    const y2 = cy + rOuter * Math.sin(toRadians(endAngle - 90));

    const x3 = cx + rInner * Math.cos(toRadians(endAngle - 90));
    const y3 = cy + rInner * Math.sin(toRadians(endAngle - 90));
    const x4 = cx + rInner * Math.cos(toRadians(startAngle - 90));
    const y4 = cy + rInner * Math.sin(toRadians(startAngle - 90));

    return `
      M ${x1},${y1}
      A ${rOuter},${rOuter} 0 ${largeArc} 1 ${x2},${y2}
      L ${x3},${y3}
      A ${rInner},${rInner} 0 ${largeArc} 0 ${x4},${y4}
      Z
    `;
  };

  let startAngle = 0;

  if (total === 0) {
    return (
      <Svg width={120} height={120}>
        <G>
          <Circle cx={60} cy={60} r={58} fill="#f5ebf7ff" />
          <Circle cx={cx} cy={cy} r={rOuter} fill="#e0e0e0" stroke="#ccc" strokeWidth={2} />
          <Circle cx={cx} cy={cy} r={rInner - 3} fill="#fff" />
          <SvgText
            x={cx}
            y={cy - 6}
            fontSize={12}
            fontWeight="bold"
            fill="#888"
            textAnchor="middle"
          >
            No Data
          </SvgText>
          <SvgText
            x={cx}
            y={cy + 8}
            fontSize={10}
            fill="#888"
            textAnchor="middle"
          >
            Available
          </SvgText>
        </G>
      </Svg>
    );
  }

  return (
    <Svg width={120} height={120}>
      <G>
        <Circle cx={60} cy={60} r={58} fill="#f5ebf7ff" />
        {counts.map((count, i) => {
          if (count === 0) return null;

          const angle = (count / total) * 360;
          const endAngle = startAngle + angle;

          const path = createArcPath(startAngle, endAngle);
          startAngle = endAngle;

          return (
            <Path
              key={i}
              d={path}
              fill={EMOJIS[i].color}
            />
          );
        })}
        <Circle cx={cx} cy={cy} r={rInner - 3} fill="#fff" />
        <SvgText
          x={cx}
          y={cy + 6}
          fontSize={26}
          fontWeight="bold"
          fill="#444"
          textAnchor="middle"
        >
          {total}
        </SvgText>
      </G>
    </Svg>
  );
};

const MOOD_TYPE_MAPPING = {
  'sad': 'SAD',
  'fine': 'NEUTRAL',
  'happy': 'HAPPY',
  'nervous': 'ANXIOUS',
  'disappointed': 'TIRED',
  'irritated': 'ANGRY'
};

// Intensity mapping based on mood selection (1-10 scale)
const INTENSITY_MAPPING = {
  'SAD': 5.8,
  'NEUTRAL': 4.8,      // maps to 'fine' in frontend
  'HAPPY': 3.8,
  'ANXIOUS': 2.8,   // maps to 'nervous' in frontend
  'ANGRY': 1.8,     // maps to 'disappointed' in frontend
  'TIRED': 0.8     // maps to 'irritated' in frontend
};

export default function MoodTrendsUI() {
  // Move all hooks to the top level - BEFORE any conditional returns
  const [fontsLoaded] = useFonts({
    PlusJakartaSans: require('../../assets/fonts/PlusJakartaSans.ttf'),
  });

  const [tab, setTab] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [weekIndex, setWeekIndex] = useState(0);
  const [monthIndex, setMonthIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOfflineMode, setIsOfflineMode] = useState(false);
  const [algorithm, setAlgorithm] = useState('mostFrequent'); // Default algorithm
  
  // Authentication state
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [authUser, setAuthUser] = useState(null);
  const [isInitializing, setIsInitializing] = useState(true);
  
  // State for API data
  const [weeklyData, setWeeklyData] = useState<WeeklyTrendData[]>([]);
  const [monthlyData, setMonthlyData] = useState<Record<string, number[]>>({});
  const [monthlyMoodCounts, setMonthlyMoodCounts] = useState<Record<string, number[]>>({});
  const [moodStats, setMoodStats] = useState<MoodStats>(fallbackMoodStats);

  // Enhanced data loading function
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      setIsOfflineMode(false);

      if (!currentUserId || !authUser) {
        throw new Error('Authentication required');
      }

      console.log(`Loading trends data from API for user: ${currentUserId} using algorithm: ${algorithm}`);

      const [weeklyResponse, monthlyResponse, statsResponse] = await Promise.allSettled([
        trendsApi.getWeeklyTrends(currentUserId, algorithm),
        trendsApi.getMonthlyTrends(currentUserId, algorithm),
        trendsApi.getMoodStats(currentUserId, algorithm),
      ]);

      let hasSuccessfulResponse = false;

      if (weeklyResponse.status === 'fulfilled' && weeklyResponse.value.success) {
        setWeeklyData(weeklyResponse.value.data);
        setWeekIndex(weeklyResponse.value.data.length - 1);
        hasSuccessfulResponse = true;
        console.log('Weekly trends data loaded successfully');
      }

      if (monthlyResponse.status === 'fulfilled' && monthlyResponse.value.success) {
        setMonthlyData(monthlyResponse.value.data);
        // Ensure moodCounts exists and has proper structure
        const moodCounts = monthlyResponse.value.moodCounts || {};
        console.log('Received monthly mood counts:', moodCounts);
        setMonthlyMoodCounts(moodCounts);
        const monthKeys = Object.keys(monthlyResponse.value.data).sort();
        setMonthIndex(monthKeys.length - 1);
        hasSuccessfulResponse = true;
        console.log('Monthly trends data loaded successfully');
      }
      if (statsResponse.status === 'fulfilled' && statsResponse.value.success) {
        setMoodStats(statsResponse.value.data);
        hasSuccessfulResponse = true;
        console.log('Mood stats loaded successfully');
      }

      if (!hasSuccessfulResponse) {
        throw new Error('No successful API responses');
      }

    } catch (err) {
      console.log('Trends API failed, switching to offline mode:', err);
      
      if (err.message.includes('Authentication')) {
        setError('Please log in to view your mood trends');
        setIsOfflineMode(false);
      } else {
        setError('Using offline mode with sample data');
        setIsOfflineMode(true);
        
        setWeeklyData(fallbackWeeklyData);
        setMonthlyData(fallbackMonthlyData.data);
        setMonthlyMoodCounts(fallbackMonthlyData.moodCounts);
        setMoodStats(fallbackMoodStats);
        setWeekIndex(fallbackWeeklyData.length - 1);
        const fallbackMonthKeys = Object.keys(fallbackMonthlyData.data).sort();
        setMonthIndex(fallbackMonthKeys.length - 1);
      }
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      if (!isInitializing && currentUserId && authUser) {
        console.log('Trends tab focused - refreshing data...');
        loadData();
      } else if (!isInitializing && !currentUserId) {
        setLoading(false);
        setError('Please log in to view your mood trends');
      }
    }, [currentUserId, authUser, isInitializing, algorithm])
  );

  // Keep your authentication useEffect separate since it should only run once
  useEffect(() => {
    const initializeUser = async () => {
      console.log('Initializing user authentication for trends...');
      setIsInitializing(true);
      setError(null);

      try {
        const auth = getAuth();
        const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
          if (firebaseUser) {
            console.log('Firebase user found for trends:', firebaseUser.uid);
            setAuthUser(firebaseUser);
            
            try {
              const response = await fetch(`${API_BASE_URL}/users/by-firebase/${firebaseUser.uid}`);
              console.log('Trends user lookup response status:', response.status);
              
              if (response.ok) {
                const userData = await response.json();
                console.log('Trends database user found:', userData);
                
                if (userData.success && userData.data && userData.data.id) {
                  setCurrentUserId(userData.data.id);
                  console.log('Successfully set trends user ID:', userData.data.id);
                } else {
                  throw new Error('Invalid user data structure');
                }
              } else {
                const errorData = await response.json();
                console.log('Trends user lookup failed:', errorData);
                throw new Error(errorData.error || 'Failed to fetch user data');
              }
            } catch (fetchError) {
              console.error('Error fetching trends user data:', fetchError);
              setError(`Failed to load user data: ${fetchError.message}`);
            }
          } else {
            console.log('No authenticated user found for trends');
            setAuthUser(null);
            setCurrentUserId(null);
            setError('Please log in to view your mood trends');
          }
          setIsInitializing(false);
        });

        return () => unsubscribe();
      } catch (error) {
        console.error('Error during trends user initialization:', error);
        setError(`Authentication error: ${error.message}`);
        setIsInitializing(false);
      }
    };

    initializeUser();
  }, []);

  // Load data when user is authenticated or algorithm changes
  useEffect(() => {
    if (!isInitializing && currentUserId && authUser) {
      loadData();
    } else if (!isInitializing && !currentUserId) {
      setLoading(false);
      setError('Please log in to view your mood trends');
    }
  }, [currentUserId, authUser, isInitializing, algorithm]); // Added algorithm dependency

  // NOW check for fonts after all hooks are declared
  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' }}>
        <Text>Loading fonts...</Text>
      </View>
    );
  }

  const monthKeys = Object.keys(monthlyData).sort();

  const canGoLeftWeek = weekIndex > 0;
  const canGoRightWeek = weekIndex < weeklyData.length - 1;

  const canGoLeftMonth = monthIndex > 0;
  const canGoRightMonth = monthIndex < monthKeys.length - 1;

  const currentWeek = weeklyData[weekIndex];
  const currentMonthKey = monthKeys[monthIndex];
  const currentMonthMoods = monthlyData[currentMonthKey] || [];
  const currentMonthMoodCounts = monthlyMoodCounts[currentMonthKey] || new Array(6).fill(0);

  const onWeeklyHandlerStateChange = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === 5) {
      if (translationX < -50 && canGoRightWeek) setWeekIndex((w) => Math.min(w + 1, weeklyData.length - 1));
      else if (translationX > 50 && canGoLeftWeek) setWeekIndex((w) => Math.max(w - 1, 0));
    }
  };

  const onMonthlyHandlerStateChange = (event: any) => {
    const { translationX, state } = event.nativeEvent;
    if (state === 5) {
      if (translationX < -50 && canGoRightMonth) setMonthIndex((m) => Math.min(m + 1, monthKeys.length - 1));
      else if (translationX > 50 && canGoLeftMonth) setMonthIndex((m) => Math.max(m - 1, 0));
    }
  };

  const [yearStr, monthStr] = currentMonthKey ? currentMonthKey.split('-') : ['2024', '01'];
  const displayMonthLabel = new Date(+yearStr, +monthStr - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays = generateCalendarDays(+yearStr, +monthStr - 1);
  
  // Use enhanced mood counting
  const weeklyMoodCounts = currentWeek ? getMoodCountFromWeek(currentWeek) : new Array(EMOJIS.length).fill(0);
  const weeklyMoodTotal = weeklyMoodCounts.reduce((a, b) => a + b, 0);
  
  const monthlyMoodCountsArray = currentMonthMoodCounts || new Array(6).fill(0);
  const monthlyMoodTotal = monthlyMoodCountsArray.reduce((a, b) => a + b, 0);

  const avgMoodEmoji = EMOJIS[moodStats.avgMoodIndex] || EMOJIS[1];

  if (loading || isInitializing) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color="#5b006bff" />
          <Text style={[styles.title, { marginTop: 20 }]}>
            {isInitializing ? 'Authenticating...' : 'Loading Mood Trends...'}
          </Text>
          <Text style={[styles.loadingSubtext, { marginTop: 10 }]}>
            {isInitializing ? 'Checking user authentication...' : 'Fetching your mood data...'}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  if (!authUser || !currentUserId) {
    return (
      <SafeAreaView style={styles.safe}>
        <View style={[styles.container, { justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={styles.authRequiredText}>Please log in to view your mood trends</Text>
          {error && !isOfflineMode && (
            <TouchableOpacity onPress={loadData} style={styles.retryButton}>
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          )}
        </View>
      </SafeAreaView>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <View style={styles.waveWrapper}>
          <Svg width={width} height={240} viewBox={`0 0 ${width} 200`}>
            <Defs>
                <SvgLinearGradient id="gradient" x1="0" y1="0" x2="1" y2="1">
                    <Stop offset="0%" stopColor="#decff8ff" />
                    <Stop offset="60%" stopColor="#fdd9f0ff" />
                    <Stop offset="80%" stopColor="#f2d5eaff" />
                    <Stop offset="100%" stopColor="#feffd3ff" />
                </SvgLinearGradient>
                </Defs>
            <Path
              d={`
                M0,-70 
                H${width} 
                V150 
                C${width * 0.8},100 ${width * 0.6},80 ${width * 0.5},100 
                C${width * 0.2},160 ${width * 0.1},140 0,100 
                Z
              `}
              fill="url(#gradient)"
            />
          </Svg>
        </View>
        
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={[{ fontFamily: 'PlusJakartaSans' }, styles.title]}>Mood Trends</Text>

          {error && (
            <View style={[styles.errorContainer, isOfflineMode && styles.offlineModeContainer]}>
              <Text style={[styles.errorText, isOfflineMode && styles.offlineModeText]}>
                {isOfflineMode ? '📱 Offline Mode - Sample Data' : error}
              </Text>
              {!isOfflineMode && (
                <TouchableOpacity onPress={loadData} style={styles.retryButton}>
                  <Text style={styles.retryButtonText}>Retry Connection</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          <View style={styles.statsRow}>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Longest Streak</Text>
              <Text style={styles.statValue}>{moodStats.longestStreak} ✨</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Current Streak</Text>
              <Text style={styles.statValue}>{moodStats.currentStreak} 🌟</Text>
            </View>
            <View style={styles.statBox}>
              <Text style={styles.statLabel}>Avg Mood this week</Text>
              <Image
                source={avgMoodEmoji.image}
                style={{
                  width: 32,
                  height: 32,
                  resizeMode: 'contain',
                  alignSelf: 'center',
                  marginTop: 4,
                }}
              />
            </View>
          </View>

          <LinearGradient
            colors={['#e9d5ff', '#fcd5ce']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.sectionTitle}>Mood Chart</Text>
            <View style={styles.tabRow}>
              {['Weekly', 'Monthly'].map((key) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => setTab(key as any)}
                  style={[styles.tab, tab === key && styles.activeTab]}
                >
                  <Text style={[styles.tabText, tab === key && styles.activeTabText]}>{key}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {tab === 'Weekly' ? (
              <>
                <View style={styles.dateNavContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginBottom: 4 }}>
                    <TouchableOpacity
                      disabled={!canGoLeftWeek}
                      onPress={() => setWeekIndex((w) => Math.max(w - 1, 0))}
                      style={[styles.navButton, !canGoLeftWeek && styles.navButtonDisabled]}
                    >
                      <Text style={styles.navButtonText}>{'‹'}</Text>
                    </TouchableOpacity>
                    <View style={styles.dateLabelContainer}>
                      <Text style={styles.dateLabel}>{currentWeek?.label || 'No data'}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={!canGoRightWeek}
                      onPress={() => setWeekIndex((w) => Math.min(w + 1, weeklyData.length - 1))}
                      style={[styles.navButton, !canGoRightWeek && styles.navButtonDisabled]}
                    >
                      <Text style={styles.navButtonText}>{'›'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                
                {currentWeek && (
                  <View style={[styles.chartContainer, { alignSelf: 'center', width: 300 }]}>
                    <View style={{ flexDirection: 'row', paddingLeft: -6 }}>
                      <View style={styles.emojiColumn}>
                        {EMOJIS.map((m, i) => (
                          <Image key={i} source={m.image} style={styles.emojiImage} />
                        ))}
                      </View>

                      <PanGestureHandler onHandlerStateChange={onWeeklyHandlerStateChange}>
                        <View style={{ flex: 1 }}>
                          <BarChart
                            data={currentWeek.bars.filter(bar => bar.value > 0)} // Only show bars with actual data
                            barWidth={20}
                            spacing={13}
                            maxValue={30}
                            roundedTop
                            xAxisLabelTextStyle={{ color: '#444', fontWeight: 'bold' }}
                            yAxisThickness={0}
                            yAxisTextStyle={{ height: 0, width: 0 }}
                            xAxisThickness={0}
                            hideRules
                            height={144}
                            noOfSections={EMOJIS.length - 1}
                            showVerticalLines={false}
                          />
                          <View
                            style={{
                              height: 2,
                              width: '80%',
                              backgroundColor: '#888',
                              right: -41,
                              marginTop: -24,
                            }}
                          />
                        </View>
                      </PanGestureHandler>
                    </View>
                    
                    {/* Show days with no mood data */}
                    <View style={styles.noMoodIndicator}>
                      {currentWeek.bars.map((bar, index) => (
                        bar.value === 0 ? (
                          <View key={index} style={styles.noMoodDay}>
                            <Text style={styles.noMoodDayText}>{bar.label}</Text>
                            <Text style={styles.noMoodLabel}>No mood</Text>
                          </View>
                        ) : null
                      ))}
                    </View>
                  </View>
                )}
              </>
            ) : (
              <>
                <View style={styles.dateNavContainer}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginHorizontal: 10, marginBottom: 4 }}>
                    <TouchableOpacity
                      disabled={!canGoLeftMonth}
                      onPress={() => setMonthIndex((m) => Math.max(m - 1, 0))}
                      style={[styles.navButton, !canGoLeftMonth && styles.navButtonDisabled]}
                    >
                      <Text style={styles.navButtonText}>{'‹'}</Text>
                    </TouchableOpacity>
                    <View style={styles.dateLabelContainer}>
                      <Text style={styles.dateLabel}>{displayMonthLabel}</Text>
                    </View>
                    <TouchableOpacity
                      disabled={!canGoRightMonth}
                      onPress={() => setMonthIndex((m) => Math.min(m + 1, monthKeys.length - 1))}
                      style={[styles.navButton, !canGoRightMonth && styles.navButtonDisabled]}
                    >
                      <Text style={styles.navButtonText}>{'›'}</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                <PanGestureHandler onHandlerStateChange={onMonthlyHandlerStateChange}>
                  <View>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 6 }}>
                      {daysOfWeek.map((day) => (
                        <Text key={day} style={{ width: 40, textAlign: 'center', fontWeight: 'bold', color: '#666' }}>{day}</Text>
                      ))}
                    </View>

                    <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                      {calendarDays.map((day, i) => {
                        if (day === null) {
                          return (
                            <View key={i} style={[styles.calendarCell, { backgroundColor: '#c3abd5ff' }]} />
                          );
                        }

                        const moodIndex = currentMonthMoods?.[day - 1] ?? 1; // Default to 'fine' if no data
                        const moodEmoji = EMOJIS[moodIndex]?.image;

                        return (
                          <View key={i} style={styles.calendarCell}>
                            <Image
                              source={moodEmoji}
                              style={{ width: 28, height: 28, resizeMode: 'contain', marginBottom: 2 }}
                            />
                            <Text style={styles.calendarDateText}>{day}</Text>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                </PanGestureHandler>
              </>
            )}
          </LinearGradient>

          <LinearGradient
            colors={['#eed4ffff', '#fdd9f0ff', '#f2d5eaff', '#ffdcc6ff']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.card}
          >
            <Text style={styles.sectionTitle}>Mood Count</Text>
            <View style={styles.dateBox}>
              <Text style={styles.dateLabel}>
                {tab === 'Weekly' ? (currentWeek?.label || 'No data') : displayMonthLabel}
              </Text>
            </View>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <MoodArc
                counts={tab === 'Weekly' ? weeklyMoodCounts : monthlyMoodCountsArray}
                total={tab === 'Weekly' ? weeklyMoodTotal : monthlyMoodTotal}
              />
            </View>
            <View style={styles.moodCountContainer}>
              <View style={styles.moodIconRow}>
                {(tab === 'Weekly' ? weeklyMoodCounts : monthlyMoodCountsArray).map((count, i) => (
                  <View key={i} style={{ width: 40, height: 40, alignItems: 'center', justifyContent: 'center' }}>
                    <View style={{ width: 32, height: 32 }}>
                      <Image
                        source={EMOJIS[i].image}
                        style={{ width: '100%', height: '100%', resizeMode: 'contain' }}
                      />
                      <View style={[styles.badge, { backgroundColor: EMOJIS[i].color }]}>
                        <Text style={styles.badgeText}>{count ?? 0}</Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </LinearGradient>
        </ScrollView>
      </SafeAreaView>
    </GestureHandlerRootView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffffd2', paddingTop: 30 },
  container: { padding: 18, paddingBottom: 90 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    fontFamily: 'PlusJakartaSans',
    color: '#480b70ff',
    textAlign: 'center',
    marginVertical: 12,
  },
  loadingSubtext: {
    fontSize: 14,
    color: '#666',
    fontFamily: 'PlusJakartaSans',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  authRequiredText: {
    fontSize: 18,
    color: '#6A4E77',
    textAlign: 'center',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  errorContainer: {
    backgroundColor: '#ffebee',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    borderColor: '#f44336',
    borderWidth: 1,
  },
  offlineModeContainer: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196f3',
  },
  errorText: {
    color: '#d32f2f',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 8,
  },
  offlineModeText: {
    color: '#480b70ff',
  },
  retryButton: {
    backgroundColor: '#5b006bff',
    borderRadius: 6,
    paddingVertical: 6,
    paddingHorizontal: 12,
    alignSelf: 'center',
  },
  retryButtonText: {
    color: 'white',
    fontSize: 14,
    fontWeight: 'bold',
  },
  chartContainer: {
    backgroundColor: '#FCEAFD',
    borderRadius: 14,
    paddingVertical: 10,
    height: 195,
    marginHorizontal: 6,
    marginTop: 6,
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
  },
  statsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statBox: {
    backgroundColor: '#bf98d2c9',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#decceaff',
    padding: 12,
    width: '30%',
    marginVertical: 6,
  },
  statLabel: { fontSize: 12, color: '#480b70ff', fontWeight: 'bold' },
  statValue: { fontSize: 22, color: '#480b70ff', fontWeight: 'bold', marginTop: 2 },
  card: {
    backgroundColor: '#ccddea',
    borderRadius: 18,
    padding: 16,
    marginTop: 16,
    shadowColor: '#ccc',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#480b70ff',
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginVertical: 10,
    backgroundColor: '#c29edaff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#8b70b6fe',
    borderRadius: 10,
  },
  activeTabText: { color: '#ffffffff' },
  tabText: { color: '#480b70ff', fontWeight: 'bold', fontSize: 14 },
  dateLabel: {
    alignSelf: 'center',
    color: '#ffffffff',
    fontWeight: 'bold',
    marginBottom: 2,
    paddingTop: 4,
  },
  navButton: {
    marginTop: 4,
    paddingHorizontal: 6,
    marginLeft: -15,
    marginRight: -15,
    paddingBottom: 2,
    backgroundColor: '#b590c6ff',
    borderRadius: 10,
    opacity: 1,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    color: '#ccddea',
    fontWeight: 'bold',
  },
  
  emojiColumn: {
    right: -25,
    width: 10,
    height: 148, // match the bar chart height
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  emojiImage: {
    width: 20,
    height: 20,
    resizeMode: 'contain',
  },
  dateNavContainer: {
    flexDirection: 'row',
    height: 30,
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#b590c6ff',
    paddingHorizontal: 12,
    paddingVertical: 0,
    borderRadius: 16,
    marginVertical: 3,
    marginHorizontal: 10,
    shadowColor: '#ccc',
    shadowOpacity: 0.1,
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 4,
    elevation: 3,
  },

  dateLabelContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  calendarCell: {
    width: 45,
    height: 60,
    borderRadius: 18,
    borderColor: '#b590c6ff',
    borderWidth: 1,
    backgroundColor: '#e4cbf0ff',
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateText: {
    color: '#480b70ff',
    fontWeight: 'bold',
  },
  moodIconRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  badge: {
    position: 'absolute',
    right: -6,
    top: -10,
    backgroundColor: '#ccddea',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#480b70ff',
    fontWeight: 'bold',
    fontSize: 11,
  },
  moodCountContainer: {
    backgroundColor: '#fbeeff', 
    paddingVertical: 10,
    paddingHorizontal: 12,
    height: 50,
    marginTop: -5,
    borderRadius: 14,
    shadowColor: '#fff',
    shadowOpacity: 0.2,
    shadowOffset: { width: 0, height: 1 },
    shadowRadius: 4,
    elevation: 3,
  },
  dateBox: {
    backgroundColor: '#b590c6ff',
    paddingVertical: 4,
    width: 150,
    height: 35,
    alignSelf: 'center',
    paddingHorizontal: 16,
    borderRadius: 14,
    shadowColor: '#ccc',
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  waveWrapper: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: width,
    height: 300,
    zIndex: 0,
  },
  noMoodIndicator: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 10,
  },
  noMoodDay: {
    backgroundColor: '#f0f0f0',
    borderRadius: 6,
    padding: 4,
    margin: 2,
    alignItems: 'center',
  },
  noMoodDayText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#666',
  },
  noMoodLabel: {
    fontSize: 10,
    color: '#999',
  },
});