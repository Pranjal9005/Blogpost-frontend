const API_BASE_URL = 'http://localhost:3000';

// Helper function to get token from localStorage
const getToken = () => {
  return localStorage.getItem('token');
};

// Helper function to set token in localStorage
const setToken = (token) => {
  localStorage.setItem('token', token);
};

// Helper function to remove token from localStorage
const removeToken = () => {
  localStorage.removeItem('token');
};

// Generic API request function
const apiRequest = async (endpoint, options = {}) => {
  const token = getToken();
  const headers = {
    'Content-Type': 'application/json',
    ...options.headers,
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || 'An error occurred');
    }

    return data;
  } catch (error) {
    throw error;
  }
};

// Auth API functions
export const authAPI = {
  signup: async (username, email, password) => {
    const data = await apiRequest('/api/auth/signup', {
      method: 'POST',
      body: JSON.stringify({ username, email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  login: async (email, password) => {
    const data = await apiRequest('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
    if (data.token) {
      setToken(data.token);
    }
    return data;
  },

  logout: () => {
    removeToken();
  },

  getToken: () => {
    return getToken();
  },
};

// Posts API functions
export const postsAPI = {
  getPosts: async (page = 1, limit = 10) => {
    return apiRequest(`/api/posts?page=${page}&limit=${limit}`);
  },

  getPostById: async (id) => {
    if (!id) {
      throw new Error('Post id is required');
    }
    return apiRequest(`/api/posts/${id}`);
  },

  createPost: async ({ title, content }) => {
    if (!title || !content) {
      throw new Error('Title and content are required');
    }
    return apiRequest('/api/posts', {
      method: 'POST',
      body: JSON.stringify({ title, content }),
    });
  },

  updatePost: async (id, payload) => {
    if (!id) {
      throw new Error('Post id is required');
    }
    const { title, content } = payload || {};
    if (!title && !content) {
      throw new Error('Title or content must be provided');
    }
    return apiRequest(`/api/posts/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, content }),
    });
  },

  deletePost: async (id) => {
    if (!id) {
      throw new Error('Post id is required');
    }
    return apiRequest(`/api/posts/${id}`, {
      method: 'DELETE',
    });
  },
};

// Health check
export const healthCheck = async () => {
  return apiRequest('/health');
};

export { getToken, setToken, removeToken };
