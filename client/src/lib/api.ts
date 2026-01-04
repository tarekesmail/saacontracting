import axios from 'axios';
import toast from 'react-hot-toast';

export const api = axios.create({
  baseURL: '/api',
  timeout: 30000, // Increased timeout for bulk operations
});

// Request interceptor
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // For 401 errors, don't redirect here - let components handle it
    // This prevents redirect loops when token is invalid
    if (error.response?.status === 401) {
      // Just clear the token, components will handle logout/redirect
      localStorage.removeItem('token');
      delete api.defaults.headers.common['Authorization'];
      return Promise.reject(error);
    }

    const message = error.response?.data?.error || 'An error occurred';
    toast.error(message);
    
    return Promise.reject(error);
  }
);