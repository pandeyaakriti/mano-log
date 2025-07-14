<<<<<<< HEAD
import { Text, View } from "react-native";

export default function trends() {
  return (
    <View style={{ flex: 1, backgroundColor: "#f0f0f0", justifyContent: "center", alignItems: "center" }}>
      <Text style={{ fontSize: 20 }}>mood swings chart</Text>
    </View>
  );
}
=======
import { LinearGradient } from 'expo-linear-gradient';
import { useState } from 'react';
import {
  Image,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  GestureHandlerRootView,
  PanGestureHandler,
} from 'react-native-gesture-handler';
import { BarChart } from 'react-native-gifted-charts';
import Svg, { Circle, G, Path, Text as SvgText } from 'react-native-svg';

const EMOJIS = [
  { name: 'sad', image: require('../../assets/images/sad.png'), color: '#bed9efff' },
  { name: 'fine', image: require('../../assets/images/fine.png'), color: '#fed8cfff' },
  { name: 'happy', image: require('../../assets/images/happy.png'), color: '#eac8d7ff' },
  { name: 'nervous', image: require('../../assets/images/nervous.png'), color: '#dfa7cfff' },
  { name: 'disappointed', image: require('../../assets/images/disappointed.png'), color: '#f29e71c5' },
  { name: 'irritated', image: require('../../assets/images/irritated.png'), color: '#7ab7deff' },
];

const moodToLevel = {
  sad: 30,
  fine: 25,
  happy: 20,
  nervous: 15,
  disappointed: 10,
  irritated: 5,
};

// Sample multiple weeks data
const weeklyData = [
  {
    label: 'Mar 14 - Mar 20',
    bars: [
      { value: moodToLevel['fine'], label: '14', frontColor: EMOJIS[1].color },
      { value: moodToLevel['happy'], label: '15', frontColor: EMOJIS[2].color },
      { value: moodToLevel['nervous'], label: '16', frontColor: EMOJIS[3].color },
      { value: moodToLevel['sad'], label: '17', frontColor: EMOJIS[0].color },
      { value: moodToLevel['disappointed'], label: '18', frontColor: EMOJIS[4].color },
      { value: moodToLevel['irritated'], label: '19', frontColor: EMOJIS[5].color },
      { value: moodToLevel['fine'], label: '20', frontColor: EMOJIS[1].color },
    ],
  },
  {
    label: 'Mar 21 - Mar 27',
    bars: [
      { value: moodToLevel['sad'], label: '21', frontColor: EMOJIS[0].color },
      { value: moodToLevel['happy'], label: '22', frontColor: EMOJIS[2].color },
      { value: moodToLevel['disappointed'], label: '23', frontColor: EMOJIS[4].color },
      { value: moodToLevel['nervous'], label: '24', frontColor: EMOJIS[3].color },
      { value: moodToLevel['irritated'], label: '25', frontColor: EMOJIS[5].color },
      { value: moodToLevel['fine'], label: '26', frontColor: EMOJIS[1].color },
      { value: moodToLevel['disappointed'], label: '27', frontColor: EMOJIS[4].color },
    ],
  },
  {
    label: 'Mar 28 - Apr 03',
    bars: [
      { value: moodToLevel['happy'], label: '28', frontColor: EMOJIS[2].color },
      { value: moodToLevel['happy'], label: '29', frontColor: EMOJIS[2].color },
      { value: moodToLevel['fine'], label: '30', frontColor: EMOJIS[1].color },
      { value: moodToLevel['nervous'], label: '31', frontColor: EMOJIS[3].color },
      { value: moodToLevel['sad'], label: '01', frontColor: EMOJIS[0].color },
      { value: moodToLevel['irritated'], label: '02', frontColor: EMOJIS[5].color },
      { value: moodToLevel['disappointed'], label: '03', frontColor: EMOJIS[4].color },
    ],
  },
];

const monthMoodsByMonth: Record<string, number[]> = {
  '2021-01': [1, 2, 2, 3, 4, 1, 2, 1, 0, 3, 3, 2, 2, 4, 0, 0, 1, 1, 3, 1, 2, 0, 1, 3, 4, 1, 2, 1, 1, 0, 1],
  '2021-02': [
    2, 2, 1, 0, 3, 1, 1, 2, 4, 4, 3, 1, 2, 2,
    0, 0, 1, 1, 3, 2, 2, 4, 3, 0, 1, 2, 1, 0,
  ],
  '2021-03': [
    0, 2, 1, 2, 4, 2, 1, 1, 2, 3, 0, 1, 2, 1, 0,
    4, 3, 1, 2, 2, 1, 0, 3, 4, 2, 1, 1, 0, 2, 3, 2,
  ],
};

const daysOfWeek = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

// Generate calendar days array with null for blank cells before month start
const generateCalendarDays = (year: number, month: number) => {
  const firstDay = new Date(year, month, 1);
  const lastDay = new Date(year, month + 1, 0); // last date of month
  const firstWeekday = firstDay.getDay(); // 0 = Sunday
  const totalDays = lastDay.getDate();

  const daysArray = [];

  // empty cells for days before month start
  for (let i = 0; i < firstWeekday; i++) {
    daysArray.push(null);
  }
  // actual days
  for (let d = 1; d <= totalDays; d++) {
    daysArray.push(d);
  }

  return daysArray;
};

// Count moods for current week bars and return counts aligned with EMOJIS index order
function getMoodCountFromWeek(weekBars: typeof weeklyData[0]['bars']) {
  // Initialize counts with zeros per EMOJIS
  const counts = new Array(EMOJIS.length).fill(0);

  weekBars.forEach((bar) => {
    // Find the mood index by matching frontColor with EMOJIS color
    const moodIndex = EMOJIS.findIndex((e) => e.color === bar.frontColor);
    if (moodIndex !== -1) counts[moodIndex]++;
  });

  return counts;
}

// New: Count moods for whole month given monthMoods (indices to EMOJIS)
function getMoodCountFromMonth(monthMoods: number[]) {
  const counts = new Array(EMOJIS.length).fill(0);
  monthMoods.forEach((moodIndex) => {
    if (moodIndex >= 0 && moodIndex < EMOJIS.length) {
      counts[moodIndex]++;
    }
  });
  return counts;
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
        {/* Inner white circle */}
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

export default function MoodTrendsUI() {
  const [tab, setTab] = useState<'Weekly' | 'Monthly'>('Weekly');
  const [weekIndex, setWeekIndex] = useState(1);
  const [monthIndex, setMonthIndex] = useState(1);

  const monthKeys = Object.keys(monthMoodsByMonth).sort();

  const canGoLeftWeek = weekIndex > 0;
  const canGoRightWeek = weekIndex < weeklyData.length - 1;

  const canGoLeftMonth = monthIndex > 0;
  const canGoRightMonth = monthIndex < monthKeys.length - 1;

  const canGoLeft = canGoLeftWeek;
  const canGoRight = canGoRightWeek;

  const currentWeek = weeklyData[weekIndex];
  const currentMonthKey = monthKeys[monthIndex];
  const currentMonthMoods = monthMoodsByMonth[currentMonthKey];

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

  const monthlyMoodCounts = getMoodCountFromMonth(currentMonthMoods);
  const monthlyMoodTotal = monthlyMoodCounts.reduce((a, b) => a + b, 0);

  const [yearStr, monthStr] = currentMonthKey.split('-');
  const displayMonthLabel = new Date(+yearStr, +monthStr - 1).toLocaleString('default', { month: 'long', year: 'numeric' });

  const calendarDays = generateCalendarDays(+yearStr, +monthStr - 1);
  const weeklyMoodCounts = getMoodCountFromWeek(currentWeek.bars);
  const weeklyMoodTotal = weeklyMoodCounts.reduce((a, b) => a + b, 0);

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaView style={styles.safe}>
        <ScrollView contentContainerStyle={styles.container}>
          <Text style={styles.title}>Mood Trends</Text>

          <View style={styles.statsRow}>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Longest Streak</Text>
                        <Text style={styles.statValue}>43 ✨</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Current Streak</Text>
                        <Text style={styles.statValue}>27 🌟</Text>
                      </View>
                      <View style={styles.statBox}>
                        <Text style={styles.statLabel}>Avg Mood this week</Text>
                        <Image
                          source={EMOJIS[weeklyMoodCounts.indexOf(Math.max(...weeklyMoodCounts))]?.image}
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
  style={styles.card}  // still applies padding, borderRadius, shadow, etc.
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
                    disabled={!canGoLeft}
                    onPress={() => setWeekIndex((w) => Math.max(w - 1, 0))}
                    style={[styles.navButton, !canGoLeft && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>{'‹'}</Text>
                  </TouchableOpacity>
                  <View style={styles.dateLabelContainer}>
                  <Text style={styles.dateLabel}>{currentWeek.label}</Text>
</View>
                  <TouchableOpacity
                    disabled={!canGoRight}
                    onPress={() => setWeekIndex((w) => Math.min(w + 1, weeklyData.length - 1))}
                    style={[styles.navButton, !canGoRight && styles.navButtonDisabled]}
                  >
                    <Text style={styles.navButtonText}>{'›'}</Text>
                  </TouchableOpacity>
                  </View>
                </View>
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
                        data={currentWeek.bars}
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
    width: '80%',        // adjust as needed
    backgroundColor: '#888', // your desired color
    right: -41,
    marginTop: -24,        // adjust spacing
  }}
/>

                    </View>
                  </PanGestureHandler>
                </View>
                </View>
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
                            <View key={i} style={[styles.calendarCell, { backgroundColor: '#f0e6f7' }]} />
                          );
                        }

                        const moodIndex = currentMonthMoods?.[day - 1] ?? 0;
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
  colors={['#eed4ffff', '#ffe9c6ff']}
  start={{ x: 0, y: 0 }}
  end={{ x: 1, y: 1 }}
  style={styles.card}  // still applies padding, borderRadius, shadow, etc.
>
            <Text style={styles.sectionTitle}>Mood Count</Text>
            <View style={styles.dateBox}>
            <Text style={styles.dateLabel}>
              {tab === 'Weekly' ? currentWeek.label : displayMonthLabel}
            </Text>
</View>
            <View style={{ alignItems: 'center', marginVertical: 8 }}>
              <MoodArc
                counts={tab === 'Weekly' ? weeklyMoodCounts : monthlyMoodCounts}
                total={tab === 'Weekly' ? weeklyMoodTotal : monthlyMoodTotal}
              />
            </View>
            <View style={styles.moodCountContainer}>
            <View style={styles.moodIconRow}>
              {(tab === 'Weekly' ? weeklyMoodCounts : monthlyMoodCounts).map((count, i) => (
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
  safe: { flex: 1, backgroundColor: '#f3e5f3ff', paddingTop: 30 },
  container: { padding: 18, paddingBottom: 90 },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#5b006bff',
    textAlign: 'center',
    marginVertical: 12,
  },
  chartContainer: {
  backgroundColor: '#FCEAFD', // your custom background
  borderRadius: 14,
  paddingVertical: 10,
  height: 195,
  marginHorizontal: 6,
  marginTop: 6,
  elevation: 3, // optional shadow on Android
  shadowColor: '#000', // optional shadow on iOS
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
    backgroundColor: '#ffebf0ff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#b085b5ff',
    padding: 12,
    width: '30%',
    marginVertical: 6,
  },
  statLabel: { fontSize: 12, color: '#540060bb', fontWeight: 'bold' },
  statValue: { fontSize: 22, color: '#444', fontWeight: 'bold', marginTop: 2 },
  card: {
    backgroundColor: '#d9ebc3b0',
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
    color: '#470a57ff',
    marginBottom: 4,
  },
  tabRow: {
    flexDirection: 'row',
    marginVertical: 10,
    backgroundColor: '#f2e4ffff',
    borderRadius: 10,
    overflow: 'hidden',
  },
  tab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
  },
  activeTab: {
    backgroundColor: '#ecc2ede2',
    borderRadius: 10,
  },
  activeTabText: { color: '#470a57ff' },
  tabText: { color: '#412f48ff', fontWeight: 'bold', fontSize: 14 },
  dateLabel: {
    alignSelf: 'center',
    color: '#444',
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
    backgroundColor: '#f5d5fdff',
    borderRadius: 10,
    opacity: 1,
  },
  navButtonDisabled: {
    opacity: 0.3,
  },
  navButtonText: {
    fontSize: 14,
    color: '#63006eff',
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
  backgroundColor: '#fce7ffff',
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
    borderRadius: 12,
    borderColor: '#cca9d7ff',
    borderWidth: 1,
    backgroundColor: '#ffeaf4ff',
    margin: 2,
    alignItems: 'center',
    justifyContent: 'center',
  },
  calendarDateText: {
    color: '#581872ff',
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
    backgroundColor: '#a56db1',
    borderRadius: 8,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: {
    color: '#000',
    fontWeight: 'bold',
    fontSize: 11,
  },
  moodCountContainer: {
  backgroundColor: '#fbeeff', // your desired bg color
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
  backgroundColor: '#fbe9fd',
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
});
>>>>>>> 1a2c2db (Moodwheel and trends ui added)
