// services/moodServices.ts
//@ts-nocheck
const API_BASE_URL = 'http://192.168.137.1:5000/api/moodtrack'; // Fixed: Added the correct route path

class MoodApiService {
  
  // Save mood entry
  static async saveMoodEntry(moodData) {
    try {
      const response = await fetch(API_BASE_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(moodData),
      });

      const result = await response.json();
      
      if (!response.ok) {
        throw new Error(result.error || 'Failed to save mood entry');
      }

      return result;
    } catch (error) {
      console.error('Error saving mood entry:', error);
      throw error;
    }
  }

  // Get mood entries
  static async getMoodEntries(userId = null, limit = 50, page = 1, moodType = null) {
    try {
      const params = new URLSearchParams({
        limit: limit.toString(),
        page: page.toString(),
      });

      if (userId) {
        params.append('userId', userId);
      }

      if (moodType) {
        params.append('moodType', moodType);
      }

      const response = await fetch(`${API_BASE_URL}?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch mood entries');
      }

      return result;
    } catch (error) {
      console.error('Error fetching mood entries:', error);
      throw error;
    }
  }

  // Get mood statistics
  static async getMoodStats(userId = null, days = 30) {
    try {
      const params = new URLSearchParams({
        days: days.toString(),
      });

      if (userId) {
        params.append('userId', userId);
      }

      const response = await fetch(`${API_BASE_URL}/stats?${params}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch mood stats');
      }

      return result;
    } catch (error) {
      console.error('Error fetching mood stats:', error);
      throw error;
    }
  }

  // Delete mood entry
  static async deleteMoodEntry(id) {
    try {
      const response = await fetch(`${API_BASE_URL}/${id}`, {
        method: 'DELETE',
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to delete mood entry');
      }

      return result;
    } catch (error) {
      console.error('Error deleting mood entry:', error);
      throw error;
    }
  }

  // Get mood trends for a user
  static async getMoodTrends(userId, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/trends/${userId}?days=${days}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch mood trends');
      }

      return result;
    } catch (error) {
      console.error('Error fetching mood trends:', error);
      throw error;
    }
  }

  // Get mood insights for a user
  static async getMoodInsights(userId, days = 30) {
    try {
      const response = await fetch(`${API_BASE_URL}/insights/${userId}?days=${days}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to fetch mood insights');
      }

      return result;
    } catch (error) {
      console.error('Error fetching mood insights:', error);
      throw error;
    }
  }

  // Check if user logged mood today
  static async hasMoodToday(userId) {
    try {
      const response = await fetch(`${API_BASE_URL}/today/${userId}`);
      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to check daily mood');
      }

      return result;
    } catch (error) {
      console.error('Error checking daily mood:', error);
      throw error;
    }
  }
}

export default MoodApiService;