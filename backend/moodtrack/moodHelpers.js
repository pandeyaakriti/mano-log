// backend/moodtrack/moodHelpers.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get user mood trends
const getUserMoodTrends = async (userId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const moodEntries = await prisma.moodEntry.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    },
    orderBy: { createdAt: 'asc' },
    select: {
      moodType: true,
      intensity: true,
      createdAt: true
    }
  });

  return moodEntries;
};

// Get mood insights
const getMoodInsights = async (userId, days = 30) => {
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);
  
  const moodEntries = await prisma.moodEntry.findMany({
    where: {
      userId,
      createdAt: { gte: startDate }
    }
  });

  const totalEntries = moodEntries.length;
  const avgIntensity = totalEntries > 0 
    ? moodEntries.reduce((sum, entry) => sum + entry.intensity, 0) / totalEntries 
    : 0;

  const moodCounts = moodEntries.reduce((acc, entry) => {
    acc[entry.moodType] = (acc[entry.moodType] || 0) + 1;
    return acc;
  }, {});

  const dominantMood = Object.keys(moodCounts).reduce((a, b) => 
    moodCounts[a] > moodCounts[b] ? a : b, null
  );

  return {
    totalEntries,
    avgIntensity: Math.round(avgIntensity * 100) / 100,
    dominantMood,
    moodDistribution: moodCounts
  };
};

// Check if user has logged mood today
const hasMoodToday = async (userId) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  
  const todayEntry = await prisma.moodEntry.findFirst({
    where: {
      userId,
      createdAt: {
        gte: today,
        lt: tomorrow
      }
    }
  });

  return !!todayEntry;
};

module.exports = {
  getUserMoodTrends,
  getMoodInsights,
  hasMoodToday
};