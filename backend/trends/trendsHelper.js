// backend/trends/trendsHelpers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Enhanced streak calculation with better logic for multiple entries per day
const updateUserStreak = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastMoodDate: true
      }
    });

    if (!user) {
      console.log('User not found for streak update:', userId);
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);

    let newCurrentStreak = user.currentStreak || 0;
    let newLongestStreak = user.longestStreak || 0;

    if (!user.lastMoodDate) {
      // First mood entry ever
      newCurrentStreak = 1;
      console.log('First mood entry ever, starting streak at 1');
    } else {
      const lastMoodDate = new Date(user.lastMoodDate);
      lastMoodDate.setHours(0, 0, 0, 0);

      if (lastMoodDate.getTime() === yesterday.getTime()) {
        // Consecutive day - increment streak
        newCurrentStreak += 1;
        console.log('Consecutive day detected, incrementing streak to:', newCurrentStreak);
      } else if (lastMoodDate.getTime() === today.getTime()) {
        // Already logged today - no change needed (multiple entries same day don't affect streak)
        console.log('Already logged mood today, no streak change needed');
        return {
          currentStreak: newCurrentStreak,
          longestStreak: newLongestStreak
        };
      } else {
        // Streak broken - start over
        newCurrentStreak = 1;
        console.log('Streak broken, resetting to 1. Last mood date was:', lastMoodDate.toISOString());
      }
    }

    // Update longest streak if current is higher
    if (newCurrentStreak > newLongestStreak) {
      newLongestStreak = newCurrentStreak;
      console.log('New longest streak achieved:', newLongestStreak);
    }

    // Update user record
    await prisma.user.update({
      where: { id: userId },
      data: {
        currentStreak: newCurrentStreak,
        longestStreak: newLongestStreak,
        lastMoodDate: today
      }
    });

    console.log('Streak updated successfully:', {
      userId,
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak,
      lastMoodDate: today.toISOString()
    });

    return {
      currentStreak: newCurrentStreak,
      longestStreak: newLongestStreak
    };

  } catch (error) {
    console.error('Error updating user streak:', error);
    throw error;
  }
};

// Enhanced streak maintenance with better batch processing
const checkAndBreakStreaks = async () => {
  try {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    yesterday.setHours(0, 0, 0, 0);

    // Find users who didn't log mood yesterday but had an active streak
    const usersWithActiveStreaks = await prisma.user.findMany({
      where: {
        currentStreak: {
          gt: 0
        },
        OR: [
          {
            lastMoodDate: {
              lt: yesterday
            }
          },
          {
            lastMoodDate: null
          }
        ]
      }
    });

    console.log(`Found ${usersWithActiveStreaks.length} users with potentially broken streaks`);

    let brokenStreaksCount = 0;

    // Process users in batches for better performance
    const batchSize = 100;
    for (let i = 0; i < usersWithActiveStreaks.length; i += batchSize) {
      const batch = usersWithActiveStreaks.slice(i, i + batchSize);
      
      const updatePromises = batch.map(async (user) => {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        
        const lastMoodDate = user.lastMoodDate ? new Date(user.lastMoodDate) : null;
        
        if (lastMoodDate) {
          lastMoodDate.setHours(0, 0, 0, 0);
          
          // Check if the gap is more than 1 day
          const daysDifference = Math.floor((today.getTime() - lastMoodDate.getTime()) / (1000 * 60 * 60 * 24));
          
          if (daysDifference > 1) {
            await prisma.user.update({
              where: { id: user.id },
              data: {
                currentStreak: 0
              }
            });
            
            console.log(`Broke streak for user ${user.id}. Last mood: ${lastMoodDate.toISOString()}, Days gap: ${daysDifference}`);
            brokenStreaksCount++;
          }
        } else {
          // No lastMoodDate but has streak - this shouldn't happen, but let's fix it
          await prisma.user.update({
            where: { id: user.id },
            data: {
              currentStreak: 0
            }
          });
          
          console.log(`Reset streak for user ${user.id} - no lastMoodDate found`);
          brokenStreaksCount++;
        }
      });

      await Promise.all(updatePromises);
    }

    return brokenStreaksCount;
  } catch (error) {
    console.error('Error checking and breaking streaks:', error);
    throw error;
  }
};

// Enhanced accurate streak calculation
const getAccurateCurrentStreak = async (userId) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        currentStreak: true,
        longestStreak: true,
        lastMoodDate: true
      }
    });

    if (!user) {
      console.log('User not found for streak check:', userId);
      return { currentStreak: 0, longestStreak: 0 };
    }

    if (!user.lastMoodDate) {
      console.log('No lastMoodDate found, resetting streak to 0');
      return { currentStreak: 0, longestStreak: user.longestStreak || 0 };
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const lastMoodDate = new Date(user.lastMoodDate);
    lastMoodDate.setHours(0, 0, 0, 0);

    // Calculate days difference
    const daysDifference = Math.floor((today.getTime() - lastMoodDate.getTime()) / (1000 * 60 * 60 * 24));
    
    console.log(`Streak check for user ${userId}:`, {
      today: today.toISOString(),
      lastMoodDate: lastMoodDate.toISOString(),
      daysDifference,
      currentStreak: user.currentStreak
    });

    // Check if streak should be broken
    if (daysDifference > 1) {
      // Streak is broken - update database
      await prisma.user.update({
        where: { id: userId },
        data: {
          currentStreak: 0
        }
      });
      
      console.log(`Streak broken for user ${userId}. Days gap: ${daysDifference}`);
      
      return {
        currentStreak: 0,
        longestStreak: user.longestStreak || 0
      };
    }

    // Streak is still valid (logged today or yesterday)
    return {
      currentStreak: user.currentStreak || 0,
      longestStreak: user.longestStreak || 0
    };
  } catch (error) {
    console.error('Error getting accurate current streak:', error);
    throw error;
  }
};

// Enhanced mood distribution with multiple aggregation strategies
const getMoodDistribution = async (userId, startDate, endDate, aggregationStrategy = 'latest') => {
  try {
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      select: {
        moodType: true,
        intensity: true,
        createdAt: true
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by day
    const dailyEntries = {};
    moodEntries.forEach(entry => {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      if (!dailyEntries[dateKey]) {
        dailyEntries[dateKey] = [];
      }
      dailyEntries[dateKey].push(entry);
    });

    // Apply aggregation strategy to each day
    const distribution = {};
    let totalDays = 0;

    Object.values(dailyEntries).forEach(dayEntries => {
      let representativeMood;
      
      switch (aggregationStrategy) {
        case 'mostFrequent':
          const moodCounts = {};
          dayEntries.forEach(entry => {
            moodCounts[entry.moodType] = (moodCounts[entry.moodType] || 0) + 1;
          });
          representativeMood = Object.keys(moodCounts).reduce((a, b) => 
            moodCounts[a] > moodCounts[b] ? a : b
          );
          break;
          
        case 'highestIntensity':
          representativeMood = dayEntries.reduce((highest, current) => 
            current.intensity > highest.intensity ? current : highest
          ).moodType;
          break;
          
        case 'average':
          // Map moods to numbers, average, then map back
          const moodToNumber = { 'SAD': 0, 'CALM': 1, 'HAPPY': 2, 'ANXIOUS': 3, 'ANGRY': 4, 'TIRED': 5 };
          const avgMoodValue = dayEntries.reduce((sum, entry) => 
            sum + (moodToNumber[entry.moodType] || 1), 0
          ) / dayEntries.length;
          const roundedMoodValue = Math.round(avgMoodValue);
          representativeMood = Object.keys(moodToNumber).find(key => 
            moodToNumber[key] === roundedMoodValue
          ) || 'CALM';
          break;
          
        case 'latest':
        default:
          representativeMood = dayEntries.reduce((latest, current) => 
            current.createdAt > latest.createdAt ? current : latest
          ).moodType;
          break;
      }
      
      distribution[representativeMood] = (distribution[representativeMood] || 0) + 1;
      totalDays++;
    });

    return {
      distribution,
      totalDays,
      totalEntries: moodEntries.length,
      averageEntriesPerDay: totalDays > 0 ? moodEntries.length / totalDays : 0,
      strategy: aggregationStrategy
    };
  } catch (error) {
    console.error('Error getting mood distribution:', error);
    throw error;
  }
};

// Enhanced daily mood entries with aggregation metadata
const getDailyMoodEntries = async (userId, startDate, endDate, includeMetadata = false) => {
  try {
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by date
    const dailyEntries = {};
    const dailyMetadata = {};
    
    moodEntries.forEach(entry => {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      if (!dailyEntries[dateKey]) {
        dailyEntries[dateKey] = [];
        dailyMetadata[dateKey] = {
          totalEntries: 0,
          timeSpan: null,
          moodChanges: 0,
          averageIntensity: 0
        };
      }
      dailyEntries[dateKey].push(entry);
    });

    // Calculate metadata for each day if requested
    if (includeMetadata) {
      Object.keys(dailyEntries).forEach(dateKey => {
        const dayEntries = dailyEntries[dateKey];
        const metadata = dailyMetadata[dateKey];
        
        metadata.totalEntries = dayEntries.length;
        metadata.averageIntensity = dayEntries.reduce((sum, entry) => 
          sum + entry.intensity, 0) / dayEntries.length;
        
        if (dayEntries.length > 1) {
          // Calculate time span
          const firstEntry = dayEntries[0];
          const lastEntry = dayEntries[dayEntries.length - 1];
          metadata.timeSpan = lastEntry.createdAt - firstEntry.createdAt;
          
          // Count mood changes
          for (let i = 1; i < dayEntries.length; i++) {
            if (dayEntries[i].moodType !== dayEntries[i-1].moodType) {
              metadata.moodChanges++;
            }
          }
        }
      });
    }

    // Return latest entry per day for backward compatibility
    const latestDailyEntries = {};
    Object.keys(dailyEntries).forEach(dateKey => {
      const dayEntries = dailyEntries[dateKey];
      latestDailyEntries[dateKey] = dayEntries.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      );
    });

    return includeMetadata ? {
      dailyEntries: latestDailyEntries,
      rawDailyEntries: dailyEntries,
      metadata: dailyMetadata
    } : latestDailyEntries;
    
  } catch (error) {
    console.error('Error getting daily mood entries:', error);
    throw error;
  }
};

// Enhanced function to check if user has mood entry for today
const hasMoodEntryToday = async (userId) => {
  try {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const entries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: today,
          lt: tomorrow
        }
      },
      select: {
        id: true,
        moodType: true,
        intensity: true,
        createdAt: true
      }
    });

    return {
      hasEntry: entries.length > 0,
      entryCount: entries.length,     // Number of entries today
      entries: entries,               // All entries for today
      latestEntry: entries.length > 0 ? entries.reduce((latest, current) => 
        current.createdAt > latest.createdAt ? current : latest
      ) : null
    };
  } catch (error) {
    console.error('Error checking today\'s mood entry:', error);
    throw error;
  }
};

// Enhanced mood summary generation with multiple aggregation strategies
const generateMoodSummary = async (userId, periodType, startDate, endDate, strategy = 'latest') => {
  try {
    const moodEntries = await prisma.moodEntry.findMany({
      where: {
        userId,
        createdAt: {
          gte: startDate,
          lte: endDate
        }
      },
      orderBy: { createdAt: 'asc' }
    });

    // Group by day and apply aggregation strategy
    const dailyEntries = {};
    moodEntries.forEach(entry => {
      const dateKey = entry.createdAt.toISOString().split('T')[0];
      if (!dailyEntries[dateKey]) {
        dailyEntries[dateKey] = [];
      }
      dailyEntries[dateKey].push(entry);
    });

    // Aggregate each day using the specified strategy
    const aggregatedDailyMoods = [];
    const moodCounts = {};
    let totalIntensity = 0;

    Object.values(dailyEntries).forEach(dayEntries => {
      let representativeEntry;
      
      switch (strategy) {
        case 'mostFrequent':
          const moodFreq = {};
          dayEntries.forEach(entry => {
            moodFreq[entry.moodType] = (moodFreq[entry.moodType] || 0) + 1;
          });
          const mostFrequentMood = Object.keys(moodFreq).reduce((a, b) => 
            moodFreq[a] > moodFreq[b] ? a : b
          );
          // Get the latest entry of the most frequent mood
          representativeEntry = dayEntries
            .filter(entry => entry.moodType === mostFrequentMood)
            .reduce((latest, current) => 
              current.createdAt > latest.createdAt ? current : latest
            );
          break;
          
        case 'highestIntensity':
          representativeEntry = dayEntries.reduce((highest, current) => 
            current.intensity > highest.intensity ? current : highest
          );
          break;
          
        case 'weightedAverage':
          // Create a weighted average entry
          const totalWeight = dayEntries.length;
          let weightedMoodSum = 0;
          let weightedIntensitySum = 0;
          
          dayEntries.forEach((entry, index) => {
            const weight = 1 + (index / dayEntries.length); // Later entries get higher weight
            const moodValue = { 'SAD': 0, 'CALM': 1, 'HAPPY': 2, 'ANXIOUS': 3, 'ANGRY': 4, 'TIRED': 5 }[entry.moodType] || 1;
            weightedMoodSum += moodValue * weight;
            weightedIntensitySum += entry.intensity * weight;
          });
          
          const avgMoodValue = Math.round(weightedMoodSum / totalWeight);
          const avgIntensity = Math.round(weightedIntensitySum / totalWeight);
          const avgMoodType = Object.keys({ 'SAD': 0, 'CALM': 1, 'HAPPY': 2, 'ANXIOUS': 3, 'ANGRY': 4, 'TIRED': 5 })
            .find(key => ({ 'SAD': 0, 'CALM': 1, 'HAPPY': 2, 'ANXIOUS': 3, 'ANGRY': 4, 'TIRED': 5 })[key] === avgMoodValue) || 'CALM';
          
          representativeEntry = {
            ...dayEntries[dayEntries.length - 1], // Use latest as base
            moodType: avgMoodType,
            intensity: avgIntensity,
            isAggregated: true,
            originalCount: dayEntries.length
          };
          break;
          
        case 'latest':
        default:
          representativeEntry = dayEntries.reduce((latest, current) => 
            current.createdAt > latest.createdAt ? current : latest
          );
          break;
      }
      
      aggregatedDailyMoods.push(representativeEntry);
      moodCounts[representativeEntry.moodType] = (moodCounts[representativeEntry.moodType] || 0) + 1;
      totalIntensity += representativeEntry.intensity;
    });

    const totalDays = aggregatedDailyMoods.length;
    const averageMood = totalDays > 0 ? totalIntensity / totalDays : 0;

    // Calculate additional metrics
    const moodVariety = Object.keys(moodCounts).length;
    const dominantMood = totalDays > 0 ? Object.keys(moodCounts).reduce((a, b) => 
      moodCounts[a] > moodCounts[b] ? a : b
    ) : null;

    // Save or update mood summary
    const summary = await prisma.moodSummary.upsert({
      where: {
        userId_timePeriodType_periodStartDate: {
          userId,
          timePeriodType: periodType,
          periodStartDate: startDate
        }
      },
      update: {
        moodCounts,
        totalEntries: moodEntries.length,
        averageMood: averageMood,
        periodEndDate: endDate,
        updatedAt: new Date()
      },
      create: {
        userId,
        timePeriodType: periodType,
        periodStartDate: startDate,
        periodEndDate: endDate,
        moodCounts,
        totalEntries: moodEntries.length,
        averageMood: averageMood
      }
    });

    return {
      ...summary,
      aggregationStrategy: strategy,
      metrics: {
        totalDays,
        totalEntries: moodEntries.length,
        averageEntriesPerDay: totalDays > 0 ? moodEntries.length / totalDays : 0,
        moodVariety,
        dominantMood,
        moodStability: totalDays > 1 ? 1 - (moodVariety / totalDays) : 1 // Higher = more stable
      }
    };
  } catch (error) {
    console.error('Error generating mood summary:', error);
    throw error;
  }
};

// Enhanced daily streak maintenance with performance optimizations
const dailyStreakMaintenance = async () => {
  try {
    console.log('Running enhanced daily streak maintenance...');
    
    const startTime = Date.now();
    const brokenStreaksCount = await checkAndBreakStreaks();
    const endTime = Date.now();
    
    console.log(`Daily streak maintenance completed in ${endTime - startTime}ms. ${brokenStreaksCount} streaks were broken.`);
    
    // Optional: Generate daily summaries for active users
    const activeDays = 7; // Consider users active if they logged mood in last 7 days
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - activeDays);
    
    const activeUsers = await prisma.user.findMany({
      where: {
        lastMoodDate: {
          gte: cutoffDate
        }
      },
      select: { id: true }
    });
    
    console.log(`Found ${activeUsers.length} active users for summary generation`);
    
    return {
      brokenStreaksCount,
      activeUsersCount: activeUsers.length,
      executionTime: endTime - startTime
    };
  } catch (error) {
    console.error('Error during daily streak maintenance:', error);
    throw error;
  }
};

// New helper function to get mood insights for a user
const getMoodInsights = async (userId, days = 30) => {
  try {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(endDate.getDate() - days);

    const distributionData = await getMoodDistribution(userId, startDate, endDate, 'latest');
    const dailyData = await getDailyMoodEntries(userId, startDate, endDate, true);

    // Calculate insights
    const insights = {
      period: `${days} days`,
      moodDistribution: distributionData.distribution,
      totalDays: distributionData.totalDays,
      totalEntries: distributionData.totalEntries,
      averageEntriesPerDay: distributionData.averageEntriesPerDay,
      patterns: {
        mostConsistentMood: null,
        moodVolatility: 0,
        weekdayVsWeekend: {},
        timeOfDayPatterns: {}
      }
    };

    // Find most consistent mood
    if (distributionData.distribution && Object.keys(distributionData.distribution).length > 0) {
      insights.patterns.mostConsistentMood = Object.keys(distributionData.distribution)
        .reduce((a, b) => distributionData.distribution[a] > distributionData.distribution[b] ? a : b);
    }

    // Calculate mood volatility (number of different moods / total days)
    insights.patterns.moodVolatility = distributionData.totalDays > 0 
      ? Object.keys(distributionData.distribution).length / distributionData.totalDays 
      : 0;

    return insights;
  } catch (error) {
    console.error('Error getting mood insights:', error);
    throw error;
  }
};

module.exports = {
  updateUserStreak,
  checkAndBreakStreaks,
  getAccurateCurrentStreak,
  getMoodDistribution,
  getDailyMoodEntries,
  hasMoodEntryToday,
  generateMoodSummary,
  dailyStreakMaintenance,
  getMoodInsights // New export
};