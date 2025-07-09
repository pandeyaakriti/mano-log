// config/api.ts
const API_BASE_URL = __DEV__ 
  ? 'http://192.168.137.1:3000' // Development - put your local server URL here 
  : 'https://api.manolog.app'; // production url not deployed yet just example this is

export const API_ENDPOINTS = {
  USERS: `${API_BASE_URL}/api/users`,
  JOURNALS: `${API_BASE_URL}/api/journals`,
  HEALTH: `${API_BASE_URL}/health`,
};

// API utility functions
export const apiRequest = async (url: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      throw new Error(errorData?.error || `HTTP ${response.status}`);
    }

    return await response.json();
  } catch (error) {
    console.error('API Request Error:', error);
    throw error;
  }
};

// Journal API functions
export const journalAPI = {
  create: async (userId: string, content: string) => {
    return apiRequest(`${API_ENDPOINTS.JOURNALS}`, {
      method: 'POST',
      body: JSON.stringify({ userId, content }),
    });
  },

  getByUserId: async (userId: string) => {
    return apiRequest(`${API_ENDPOINTS.JOURNALS}/${userId}`);
  },
};

// User API functions
export const userAPI = {
  createOrUpdate: async (userData: any) => {
    return apiRequest(`${API_ENDPOINTS.USERS}`, {
      method: 'POST',
      body: JSON.stringify(userData),
    });
  },

  getByFirebaseUid: async (firebaseUid: string) => {
    return apiRequest(`${API_ENDPOINTS.USERS}/${firebaseUid}`);
  },
};