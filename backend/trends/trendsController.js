// backend/trends/trendsController.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Helper function to map mood types to emoji indices (matching your frontend)
const moodTypeToIndex = {
  'SAD': 0,
  'CALM': 1,      // maps to 'fine' in frontend
  'HAPPY': 2,
  'ANXIOUS': 3,   // maps to 'nervous' in frontend
  'ANGRY': 4,     // maps to 'disappointed' in frontend
  'TIRED': 5      // maps to 'irritated' in frontend
};

const indexToMoodType = {
  0: 'SAD',
  1: 'CALM',
  2: 'HAPPY',
  3: 'ANXIOUS',
  4: 'ANGRY',
  5: 'TIRED'
};

// Enhanced mood aggregation algorithms for multiple entries per day
const MoodAggregationAlgorithms = {
  // Algorithm 1: Latest mood of the day (current approach)
  latest: (moodEntries) => {
    if (moodEntries.length === 0) return null;
    return moodEntries.reduce((latest, current) => 
      current.createdAt > latest.createdAt ? current : latest
    );
  },

  // Algorithm 2: Most frequent mood of the day with tie-breaking
  mostFrequent: (moodEntries) => {
    if (moodEntries.length === 0) return null;
    if (moodEntries.length === 1) return moodEntries[0];
    
    const moodCounts = {};
    moodEntries.forEach(entry => {
      moodCounts[entry.moodType] = (moodCounts[entry.moodType] || 0) + 1;
    });
    
    // Find the maximum count
    const maxCount = Math.max(...Object.values(moodCounts));
    const mostFrequentMoods = Object.keys(moodCounts).filter(mood => moodCounts[mood] === maxCount);
    
    // If there's a tie, use the latest entry among tied moods
    if (mostFrequentMoods.length === 1) {
      return moodEntries
        .filter(entry => entry.moodType === mostFrequentMoods[0])
        .reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest);
    } else {
      // Tie-breaking: among tied moods, pick the one with highest average intensity
      let bestMood = mostFrequentMoods[0];
      let bestAvgIntensity = 0;
      
      mostFrequentMoods.forEach(mood => {
        const moodEntries_filtered = moodEntries.filter(entry => entry.moodType === mood);
        const avgIntensity = moodEntries_filtered.reduce((sum, entry) => sum + entry.intensity, 0) / moodEntries_filtered.length;
        if (avgIntensity > bestAvgIntensity) {
          bestAvgIntensity = avgIntensity;
          bestMood = mood;
        }
      });
      
      return moodEntries
        .filter(entry => entry.moodType === bestMood)
        .reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest);
    }
  },

  // Algorithm 3: Weighted average based on intensity and recency
  weightedAverage: (moodEntries) => {
    if (moodEntries.length === 0) return null;
    if (moodEntries.length === 1) return moodEntries[0];
    
    // Sort by time (most recent first)
    const sortedEntries = [...moodEntries].sort((a, b) => b.createdAt - a.createdAt);
    
    let totalWeight = 0;
    let weightedMoodSum = 0;
    let weightedIntensitySum = 0;
    
    sortedEntries.forEach((entry, index) => {
      const moodIndex = moodTypeToIndex[entry.moodType] || 1;
      const recencyWeight = Math.pow(0.9, index); // More recent entries have higher weight
      const intensityWeight = (entry.intensity / 10) * 0.5 + 0.5; // Normalize intensity (0.5-1.0)
      const weight = recencyWeight * intensityWeight;
      
      weightedMoodSum += moodIndex * weight;
      weightedIntensitySum += entry.intensity * weight;
      totalWeight += weight;
    });
    
    const avgMoodIndex = Math.round(weightedMoodSum / totalWeight);
    const avgMoodType = indexToMoodType[avgMoodIndex] || 'CALM';
    
    // Return a synthetic entry representing the average
    return {
      ...sortedEntries[0], // Use most recent entry as base
      moodType: avgMoodType,
      intensity: Math.round(weightedIntensitySum / totalWeight),
      isAggregated: true,
      originalCount: moodEntries.length,
      aggregationMethod: 'weightedAverage'
    };
  },

  // Algorithm 4: Dominant mood (considering both frequency and intensity)
  dominantMood: (moodEntries) => {
    if (moodEntries.length === 0) return null;
    if (moodEntries.length === 1) return moodEntries[0];
    
    const moodScores = {};
    
    moodEntries.forEach(entry => {
      const frequencyScore = 1; // Each entry counts as 1
      const intensityScore = entry.intensity / 10; // Normalize to 0-1
      const totalScore = frequencyScore + intensityScore; // Combined score
      
      moodScores[entry.moodType] = (moodScores[entry.moodType] || 0) + totalScore;
    });
    
    const dominantMood = Object.keys(moodScores).reduce((a, b) => 
      moodScores[a] > moodScores[b] ? a : b
    );
    
    // Return the highest intensity entry of the dominant mood
    return moodEntries
      .filter(entry => entry.moodType === dominantMood)
      .reduce((highest, current) => 
        current.intensity > highest.intensity ? current : highest
      );
  },

  // Algorithm 5: Time-weighted (gives more weight to moods during active hours)
  timeWeighted: (moodEntries) => {
    if (moodEntries.length === 0) return null;
    if (moodEntries.length === 1) return moodEntries[0];
    
    const moodScores = {};
    
    moodEntries.forEach(entry => {
      const hour = entry.createdAt.getHours();
      // Give more weight to moods during typical active hours (6 AM - 10 PM)
      let timeWeight = 1.0;
      if (hour >= 6 && hour <= 22) {
        timeWeight = 1.2; // 20% more weight for active hours
      } else {
        timeWeight = 0.8; // 20% less weight for sleep hours
      }
      
      const intensityWeight = entry.intensity / 10;
      const totalScore = timeWeight * intensityWeight;
      
      moodScores[entry.moodType] = (moodScores[entry.moodType] || 0) + totalScore;
    });
    
    const bestMood = Object.keys(moodScores).reduce((a, b) => 
      moodScores[a] > moodScores[b] ? a : b
    );
    
    return moodEntries
      .filter(entry => entry.moodType === bestMood)
      .reduce((latest, current) => current.createdAt > latest.createdAt ? current : latest);
  }
};

// Helper function to get week boundaries (Sunday to Saturday)
const getWeekBoundaries = (date) => {
  const start = new Date(date);
  const day = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = start.getDate() - day; // Adjust to Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);
  
  // Ensure we don't go beyond today
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  if (end > today) {
    end.setTime(today.getTime());
  }
  
  return { start, end };
};
// Helper function to get month boundaries
const getMonthBoundaries = (year, month) => {
  const start = new Date(year, month, 1);
  start.setHours(0, 0, 0, 0);
  const end = new Date(year, month + 1, 0);
  end.setHours(23, 59, 59, 999);
  return { start, end };
};

// Helper function to format week label
const formatWeekLabel = (startDate) => {
  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  
  const formatDate = (date) => {
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate().toString().padStart(2, '0');
    return `${month} ${day}`;
  };
  
  return `${formatDate(startDate)} - ${formatDate(endDate)}`;
};

// Enhanced function to aggregate multiple mood entries per day
const aggregateDailyMoods = (moodEntries, algorithm = 'latest') => {
  const dailyMoods = {};
  
  // Group mood entries by day
  moodEntries.forEach(entry => {
    const dayKey = entry.createdAt.toISOString().split('T')[0];
    if (!dailyMoods[dayKey]) {
      dailyMoods[dayKey] = [];
    }
    dailyMoods[dayKey].push(entry);
  });
  
  // Apply aggregation algorithm to each day
  const aggregatedMoods = {};
  Object.keys(dailyMoods).forEach(dayKey => {
    const dayEntries = dailyMoods[dayKey];
    const aggregatedEntry = MoodAggregationAlgorithms[algorithm](dayEntries);
    if (aggregatedEntry) {
      aggregatedMoods[dayKey] = {
        ...aggregatedEntry,
        originalEntries: dayEntries.length,
        allMoods: dayEntries.map(e => ({ mood: e.moodType, intensity: e.intensity, time: e.createdAt }))
      };
    }
  });
  
  return aggregatedMoods;
};

// Enhanced function to count ALL moods in a period (not just aggregated ones)
const countAllMoodsInPeriod = (moodEntries) => {
  const moodCounts = {};
  let totalEntries = 0;
  
  moodEntries.forEach(entry => {
    const moodIndex = moodTypeToIndex[entry.moodType] ?? 1;
    moodCounts[moodIndex] = (moodCounts[moodIndex] || 0) + 1;
    totalEntries++;
  });
  
  // Convert to array format matching frontend expectations
  const countsArray = new Array(6).fill(0); // 6 mood types
  Object.keys(moodCounts).forEach(indexStr => {
    const index = parseInt(indexStr);
    countsArray[index] = moodCounts[index];
  });
  
  return {
    counts: countsArray,
    totalEntries,
    moodCounts
  };
};
const getWeekBoundariesPastOnly = (date) => {
  const today = new Date();
  today.setHours(23, 59, 59, 999);
  
  const start = new Date(date);
  const day = start.getDay(); // 0 = Sunday, 1 = Monday, etc.
  const diff = start.getDate() - day; // Adjust to Sunday
  start.setDate(diff);
  start.setHours(0, 0, 0, 0);
  
  // If start is in the future, return null to indicate invalid week
  if (start > today) {
    return null;
  }
  
  const end = new Date(start);
  end.setDate(start.getDate() + 6); // Saturday
  end.setHours(23, 59, 59, 999);
  
  // Cap end date to today
  if (end > today) {
    end.setTime(today.getTime());
  }
  
  return { start, end };
};

// Get weekly mood trends with enhanced aggregation
// Replace the getWeeklyTrends function in trendsController.js:

// backend/trends/trendsController.js - Fixed getWeeklyTrends function

const getWeeklyTrends = async (req, res) => {
  try {
    const { userId } = req.user;
    const algorithm = req.query.algorithm || 'latest';
    
    if (!MoodAggregationAlgorithms[algorithm]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid aggregation algorithm',
        availableAlgorithms: Object.keys(MoodAggregationAlgorithms)
      });
    }
    
    const weeksData = [];
    const today = new Date();
    today.setHours(23, 59, 59, 999); // End of today
    
    // Start from current week and go back 11 more weeks (12 total)
    for (let i = 0; i < 12; i++) {
      const weekStartDate = new Date(today);
      // Go back i weeks from today
      weekStartDate.setDate(today.getDate() - (i * 7));
      
      const weekBoundaries = getWeekBoundariesPastOnly(weekStartDate);
      
      // Skip weeks that are entirely in the future
      if (!weekBoundaries) {
        continue;
      }
      
      const { start, end } = weekBoundaries;
      
      // Get ALL mood entries for this week
      const moodEntries = await prisma.moodEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      // Only include weeks that have at least some data or are recent
      const isCurrentWeek = i === 0;
      const isRecentWeek = i < 4; // Keep last 4 weeks even if no data
      
      if (moodEntries.length === 0 && !isRecentWeek) {
        continue;
      }
      
      // Count ALL moods for mood count display
      const allMoodCounts = countAllMoodsInPeriod(moodEntries);
      
      // Aggregate moods by day using selected algorithm for chart display
      const dailyMoods = aggregateDailyMoods(moodEntries, algorithm);
      
      // Create bars array only for days that have mood data
      const bars = [];
      let totalMoodDays = 0;
      let moodSum = 0;
      
      // Only process days that have mood entries
      const daysWithMoods = Object.keys(dailyMoods).sort();
      
      for (const dayKey of daysWithMoods) {
        const moodEntry = dailyMoods[dayKey];
        const currentDay = new Date(dayKey + 'T00:00:00.000Z');
        const dayLabel = currentDay.getDate().toString();
        const dayOfWeek = currentDay.toLocaleDateString('en-US', { weekday: 'short' });
        
        if (moodEntry) {
          const moodIndex = moodTypeToIndex[moodEntry.moodType] ?? 1;
          // Convert mood index to chart value (5, 10, 15, 20, 25, 30)
          const value = (moodIndex + 1) * 5;
          
          // Get all moods for this specific day for detailed info
          const dayMoodEntries = moodEntries.filter(entry => 
            entry.createdAt.toISOString().split('T')[0] === dayKey
          );
          
          bars.push({
            value,
            label: dayLabel,
            dayOfWeek,
            date: dayKey,
            frontColor: getColorForMoodIndex(moodIndex),
            originalCount: moodEntry.originalEntries || dayMoodEntries.length,
            aggregatedMood: moodEntry.moodType,
            aggregationMethod: algorithm,
            allMoodsThisDay: dayMoodEntries.map(entry => ({
              mood: entry.moodType,
              intensity: entry.intensity,
              time: entry.createdAt.toTimeString().slice(0, 5),
              timestamp: entry.createdAt
            })),
            dayStats: {
              totalEntries: dayMoodEntries.length,
              moodChanges: dayMoodEntries.length > 1 ? 
                dayMoodEntries.reduce((changes, entry, index) => {
                  if (index > 0 && entry.moodType !== dayMoodEntries[index - 1].moodType) {
                    return changes + 1;
                  }
                  return changes;
                }, 0) : 0,
              timeSpan: dayMoodEntries.length > 1 ? 
                dayMoodEntries[dayMoodEntries.length - 1].createdAt - dayMoodEntries[0].createdAt : 0
            }
          });
          
          totalMoodDays++;
          moodSum += moodIndex;
        }
      }
      
      // Calculate comprehensive week statistics
      const weekStats = {
        totalDaysWithMoods: totalMoodDays,
        averageMoodIndex: totalMoodDays > 0 ? Math.round(moodSum / totalMoodDays) : null,
        averageMoodType: totalMoodDays > 0 ? indexToMoodType[Math.round(moodSum / totalMoodDays)] : null,
        totalEntries: allMoodCounts.totalEntries,
        allMoodCounts: allMoodCounts.counts,
        uniqueDaysWithMoods: Object.keys(dailyMoods).length,
        consistency: totalMoodDays > 0 ? (totalMoodDays / 7 * 100).toFixed(1) : 0,
        moodVariability: totalMoodDays > 1 ? 
          Math.round((new Set(bars.filter(b => b.aggregatedMood).map(b => b.aggregatedMood)).size / totalMoodDays) * 100) : 0,
        multipleEntryDays: bars.filter(b => b.originalCount > 1).length,
        totalMoodChanges: bars.reduce((total, bar) => total + (bar.dayStats?.moodChanges || 0), 0)
      };
      
      weeksData.push({
        label: formatWeekLabel(start),
        bars: bars.sort((a, b) => new Date(a.date) - new Date(b.date)), // Sort bars by date
        startDate: start.toISOString(),
        endDate: end.toISOString(),
        stats: weekStats,
        algorithm: algorithm,
        moodCounts: allMoodCounts.counts,
        weekNumber: i + 1,
        isCurrentWeek: isCurrentWeek,
        metadata: {
          daysInWeek: 7,
          daysWithData: totalMoodDays,
          coverage: (totalMoodDays / 7 * 100).toFixed(1) + '%',
          mostActiveDay: bars.length > 0 ? bars.reduce((maxBar, currentBar) => 
            (currentBar.originalCount || 0) > (maxBar.originalCount || 0) ? currentBar : maxBar
          ) : null,
          averageEntriesPerActiveDay: totalMoodDays > 0 ? 
            (allMoodCounts.totalEntries / totalMoodDays).toFixed(1) : '0'
        }
      });
    }
    
    // Reverse the array so most recent week is last (for proper indexing)
    weeksData.reverse();
    
    res.json({
      success: true,
      data: weeksData,
      metadata: {
        algorithm: algorithm,
        totalWeeks: weeksData.length,
        availableAlgorithms: Object.keys(MoodAggregationAlgorithms),
        description: `Weekly trends using ${algorithm} aggregation, showing only days with mood data`,
        summary: {
          totalWeeksWithData: weeksData.filter(week => week.stats.totalDaysWithMoods > 0).length,
          averageConsistency: weeksData.reduce((sum, week) => sum + parseFloat(week.stats.consistency), 0) / weeksData.length,
          totalEntries: weeksData.reduce((sum, week) => sum + week.stats.totalEntries, 0)
        }
      }
    });
    
  } catch (error) {
    console.error('Error getting weekly trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get weekly trends',
      error: error.message
    });
  }
};

// Replace the getMonthlyTrends function in trendsController.js with this:

const getMonthlyTrends = async (req, res) => {
  try {
    const { userId } = req.user;
    const algorithm = req.query.algorithm || 'latest';
    
    console.log('Getting monthly trends for user:', userId, 'using algorithm:', algorithm);
    
    // Validate algorithm
    if (!MoodAggregationAlgorithms[algorithm]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid aggregation algorithm',
        availableAlgorithms: Object.keys(MoodAggregationAlgorithms)
      });
    }
    
    // Get last 6 months of data
    const monthsData = {};
    const monthsMetadata = {};
    const monthsMoodCounts = {}; // NEW: Track all mood counts per month
    const today = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(today.getFullYear(), today.getMonth() - i, 1);
      const year = monthDate.getFullYear();
      const month = monthDate.getMonth();
      
      const { start, end } = getMonthBoundaries(year, month);
      const monthKey = `${year}-${String(month + 1).padStart(2, '0')}`;
      
      console.log(`Month ${monthKey}: ${start.toISOString()} to ${end.toISOString()}`);
      
      // Get ALL mood entries for this month
      const moodEntries = await prisma.moodEntry.findMany({
        where: {
          userId,
          createdAt: {
            gte: start,
            lte: end
          }
        },
        orderBy: { createdAt: 'asc' }
      });
      
      console.log(`Found ${moodEntries.length} mood entries for ${monthKey}`);
      
      // Count ALL moods for this month (for mood count display)
      const allMoodCounts = countAllMoodsInPeriod(moodEntries);
      monthsMoodCounts[monthKey] = allMoodCounts.counts;
      
      // Aggregate moods by day using selected algorithm (for calendar display)
      const dailyMoods = aggregateDailyMoods(moodEntries, algorithm);
      
      // Create array of mood indices for each day of the month
      const daysInMonth = new Date(year, month + 1, 0).getDate();
      const monthMoods = [];
      let totalEntries = 0;
      let moodSum = 0;
      let daysWithMoods = 0;
      
      for (let day = 1; day <= daysInMonth; day++) {
        const dayKey = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const moodEntry = dailyMoods[dayKey];
        
        if (moodEntry) {
          const moodIndex = moodTypeToIndex[moodEntry.moodType] ?? 1;
          monthMoods.push(moodIndex);
          totalEntries += moodEntry.originalEntries || 1;
          moodSum += moodIndex;
          daysWithMoods++;
        } else {
          monthMoods.push(-1); // -1 indicates no mood entry for this day
        }
      }
      
      monthsData[monthKey] = monthMoods;
      monthsMetadata[monthKey] = {
        totalEntries: allMoodCounts.totalEntries, // All individual entries
        daysWithMoods,
        daysInMonth,
        averageMoodIndex: daysWithMoods > 0 ? Math.round(moodSum / daysWithMoods) : null,
        coverage: Math.round((daysWithMoods / daysInMonth) * 100),
        algorithm: algorithm,
        allMoodCounts: allMoodCounts.counts, // All individual mood counts
        aggregatedDaysCount: daysWithMoods
      };
    }
    
    console.log('Monthly mood counts being sent:', monthsMoodCounts);
    console.log(`Returning ${Object.keys(monthsData).length} months of data using ${algorithm} algorithm`);
    
    res.json({
      success: true,
      data: monthsData, // Aggregated daily moods for calendar
      moodCounts: monthsMoodCounts, // NEW: All mood counts for mood count display
      metadata: {
        months: monthsMetadata,
        algorithm: algorithm,
        availableAlgorithms: Object.keys(MoodAggregationAlgorithms),
        description: `Monthly calendar uses ${algorithm} aggregation, mood counts include all individual entries`
      }
    });
    
  } catch (error) {
    console.error('Error getting monthly trends:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get monthly trends',
      error: error.message
    });
  }
};
// Enhanced mood statistics with better algorithms
const getMoodStats = async (req, res) => {
  try {
    const { userId } = req.user;
    const algorithm = req.query.algorithm || 'latest';
    
    console.log('Getting mood stats for user:', userId, 'using algorithm:', algorithm);
    
    // Get user with streak data
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true
      }
    });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found'
      });
    }
    
    // Get this week's mood entries for average calculation
    const today = new Date();
    const { start: weekStart, end: weekEnd } = getWeekBoundaries(today);
    
    const weekMoods = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: weekStart,
          lte: weekEnd
        }
      },
      orderBy: { createdAt: 'asc' }
    });
    
    console.log(`Found ${weekMoods.length} mood entries this week`);
    
    // Method 1: Get average mood using aggregation algorithm
    const dailyMoods = aggregateDailyMoods(weekMoods, algorithm);
    const weeklyMoodEntries = Object.values(dailyMoods);
    
    // Method 2: Also get average considering ALL entries (not just aggregated)
    const allMoodCounts = countAllMoodsInPeriod(weekMoods);
    
    // Calculate statistics using aggregated daily moods
    let mostFrequentMood = 'CALM';
    let avgMoodIndex = 1;
    
    if (weeklyMoodEntries.length > 0) {
      const moodCounts = {};
      let moodSum = 0;
      
      weeklyMoodEntries.forEach(entry => {
        moodCounts[entry.moodType] = (moodCounts[entry.moodType] || 0) + 1;
        moodSum += moodTypeToIndex[entry.moodType] || 1;
      });
      
      mostFrequentMood = Object.keys(moodCounts).reduce((a, b) => 
        moodCounts[a] > moodCounts[b] ? a : b
      );
      
      avgMoodIndex = Math.round(moodSum / weeklyMoodEntries.length);
    }
    
    // Calculate most frequent mood from ALL entries
    let mostFrequentMoodOverall = 'CALM';
    if (allMoodCounts.totalEntries > 0) {
      let maxCount = 0;
      let maxIndex = 1;
      
      allMoodCounts.counts.forEach((count, index) => {
        if (count > maxCount) {
          maxCount = count;
          maxIndex = index;
        }
      });
      
      mostFrequentMoodOverall = indexToMoodType[maxIndex] || 'CALM';
    }
    
    // Get additional statistics
    const totalMoodEntries = await prisma.moodEntry.count({
      where: { userId }
    });
    
    const firstMoodEntry = await prisma.moodEntry.findFirst({
      where: { userId },
      orderBy: { createdAt: 'asc' }
    });
    
    const daysSinceFirstEntry = firstMoodEntry 
      ? Math.floor((today - firstMoodEntry.createdAt) / (1000 * 60 * 60 * 24))
      : 0;
    
    const stats = {
      longestStreak: user.longestStreak || 0,
      currentStreak: user.currentStreak || 0,
      avgMoodThisWeek: mostFrequentMood,
      avgMoodIndex: avgMoodIndex,
      algorithm: algorithm,
      weeklyStats: {
        totalEntriesThisWeek: weekMoods.length,
        daysWithMoodsThisWeek: weeklyMoodEntries.length,
        averageEntriesPerDay: weeklyMoodEntries.length > 0 
          ? Math.round(weekMoods.length / weeklyMoodEntries.length * 10) / 10 
          : 0,
        mostFrequentMoodOverall: mostFrequentMoodOverall, // Based on all entries
        allMoodCountsThisWeek: allMoodCounts.counts
      },
      overallStats: {
        totalMoodEntries,
        daysSinceFirstEntry,
        averageEntriesPerDay: daysSinceFirstEntry > 0 
          ? Math.round(totalMoodEntries / daysSinceFirstEntry * 10) / 10 
          : 0
      }
    };
    
    console.log('Returning mood stats:', stats);
    
    res.json({
      success: true,
      data: stats
    });
    
  } catch (error) {
    console.error('Error getting mood stats:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get mood statistics',
      error: error.message
    });
  }
};

// Helper function to get color for mood index (matching your frontend)
const getColorForMoodIndex = (index) => {
  const colors = [
    '#bed9efff', // sad
    '#fed8cfff', // fine/calm
    '#eac8d7ff', // happy
    '#dfa7cfff', // nervous/anxious
    '#f29e71c5', // disappointed/angry
    '#7ab7deff'  // irritated/tired
  ];
  return colors[index] || colors[1];
};

module.exports = {
  getWeeklyTrends,
  getMonthlyTrends,
  getMoodStats,
  MoodAggregationAlgorithms,
  aggregateDailyMoods,
  countAllMoodsInPeriod
};