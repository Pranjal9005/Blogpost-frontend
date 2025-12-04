const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000';

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
  
  // Don't set Content-Type for FormData, let the browser set it with boundary
  const isFormData = options.body instanceof FormData;
  const headers = {
    ...(!isFormData && { 'Content-Type': 'application/json' }),
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

    // Try to parse JSON, but handle cases where response might not be JSON
    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      // If response is not JSON, create a basic error
      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }
      throw new Error('Invalid response from server');
    }

    if (!response.ok) {
      // Extract error message from response
      const errorMessage = data.error || data.message || `Server error: ${response.status} ${response.statusText}`;
      const error = new Error(errorMessage);
      error.status = response.status;
      error.data = data;
      error.endpoint = endpoint;
      throw error;
    }

    return data;
  } catch (error) {
    // If it's already our custom error, re-throw it
    if (error.status) {
      throw error;
    }
    
    // Handle specific network errors
    if (error.message.includes('Failed to fetch') || 
        error.message.includes('ERR_CONNECTION_REFUSED') ||
        error.message.includes('NetworkError') ||
        error.name === 'TypeError') {
      throw new Error('Cannot connect to server. Please make sure the backend server is running on http://localhost:3000');
    }
    
    // Handle other network errors or JSON parsing errors
    throw new Error(error.message || 'Network error. Please check your connection.');
  }
};

// Auth API functions
export const authAPI = {
  /**
   * Sign up a new user
   * @param {string} username - User's username
   * @param {string} email - User's email
   * @param {string} password - User's password (min 6 characters)
   * @returns {Promise<{message: string, token: string, user: {id: number, username: string, email: string}}>}
   * @throws {Error} With error message from API
   */
  signup: async (username, email, password) => {
    try {
      const data = await apiRequest('/api/auth/signup', {
        method: 'POST',
        body: JSON.stringify({ username, email, password }),
      });
      
      // Store token if present
      if (data.token) {
        setToken(data.token);
      }
      
      return data;
    } catch (error) {
      // Re-throw with the error message from API
      throw error;
    }
  },

  /**
   * Log in an existing user
   * @param {string} email - User's email
   * @param {string} password - User's password
   * @returns {Promise<{message: string, token: string, user: {id: number, username: string, email: string}}>}
   * @throws {Error} With error message from API
   */
  login: async (email, password) => {
    try {
      const data = await apiRequest('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
      
      // Store token if present
      if (data.token) {
        setToken(data.token);
      }
      
      return data;
    } catch (error) {
      // Re-throw with the error message from API
      throw error;
    }
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

  /**
   * Create a new post with optional image
   * @param {Object} payload - Post data
   * @param {string} payload.title - Post title (required)
   * @param {string} payload.content - Post content (required)
   * @param {File} payload.image - Image file (optional, max 5MB, JPEG/PNG/GIF/WebP)
   * @returns {Promise<{message: string, post: Object}>}
   */
  createPost: async ({ title, content, image }) => {
    if (!title || !content) {
      throw new Error('Title and content are required');
    }

    const formData = new FormData();
    formData.append('title', title);
    formData.append('content', content);
    
    if (image) {
      formData.append('image', image);
    }

    return apiRequest('/api/posts', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Update an existing post with optional image
   * @param {number|string} id - Post ID
   * @param {Object} payload - Post data
   * @param {string} payload.title - Updated title (optional)
   * @param {string} payload.content - Updated content (optional)
   * @param {File} payload.image - New image file (optional, max 5MB, JPEG/PNG/GIF/WebP)
   * @returns {Promise<{message: string, post: Object}>}
   */
  updatePost: async (id, payload) => {
    if (!id) {
      throw new Error('Post id is required');
    }
    
    const { title, content, image } = payload || {};
    
    // At least one field must be provided
    if (!title && !content && !image) {
      throw new Error('Title, content, or image must be provided');
    }

    const formData = new FormData();
    
    if (title) {
      formData.append('title', title);
    }
    if (content) {
      formData.append('content', content);
    }
    if (image) {
      formData.append('image', image);
    }

    return apiRequest(`/api/posts/${id}`, {
      method: 'PUT',
      body: formData,
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

// User Profile API functions
export const userAPI = {
  /**
   * Get current user's profile
   * @returns {Promise<{id: number, username: string, email: string, profile_picture_url: string|null, bio: string|null, created_at: string, post_count: number}>}
   */
  getProfile: async () => {
    return apiRequest('/api/user/profile');
  },

  /**
   * Update user profile
   * @param {Object} payload - Profile data
   * @param {string} payload.username - New username (optional)
   * @param {string} payload.email - New email (optional)
   * @param {string} payload.bio - New bio (optional)
   * @param {string} payload.currentPassword - Current password (required if changing password)
   * @param {string} payload.newPassword - New password (optional, min 6 chars)
   * @returns {Promise<{message: string, user: Object}>}
   */
  updateProfile: async (payload) => {
    return apiRequest('/api/user/profile', {
      method: 'PUT',
      body: JSON.stringify(payload),
    });
  },

  /**
   * Upload profile picture
   * @param {File} profilePicture - Image file (max 5MB, JPEG/PNG/GIF/WebP)
   * @returns {Promise<{message: string, user: Object}>}
   */
  uploadProfilePicture: async (profilePicture) => {
    if (!profilePicture) {
      throw new Error('Profile picture is required');
    }

    const formData = new FormData();
    formData.append('profile_picture', profilePicture);

    return apiRequest('/api/user/profile-picture', {
      method: 'POST',
      body: formData,
    });
  },

  /**
   * Remove profile picture
   * @returns {Promise<{message: string, user: Object}>}
   */
  removeProfilePicture: async () => {
    return apiRequest('/api/user/profile-picture', {
      method: 'DELETE',
    });
  },

  /**
   * Get current user's posts
   * @param {number} page - Page number (default: 1)
   * @param {number} limit - Posts per page (default: 10)
   * @returns {Promise<{posts: Array, pagination: Object}>}
   */
  getUserPosts: async (page = 1, limit = 10) => {
    return apiRequest(`/api/user/posts?page=${page}&limit=${limit}`);
  },

  /**
   * Get user statistics
   * @returns {Promise<{total_posts: number, latest_post_date: string|null}>}
   */
  getUserStats: async () => {
    return apiRequest('/api/user/stats');
  },
};

// Health check
export const healthCheck = async () => {
  return apiRequest('/health');
};

// Helper function to get full image URL
export const getImageUrl = (imagePath) => {
  if (!imagePath) return null;
  // If it's already a full URL, return as is
  if (imagePath.startsWith('http://') || imagePath.startsWith('https://')) {
    return imagePath;
  }
  // Otherwise, prepend the API base URL
  return `${API_BASE_URL}${imagePath}`;
};

export { getToken, setToken, removeToken };
