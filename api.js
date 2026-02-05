import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8002';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 5000,
});

// Intercepteurs pour gérer les erreurs
api.interceptors.response.use(
  (response) => response,
  (error) => {
    console.error('API Error:', error);
    return Promise.reject(error);
  }
);

// Mettez à jour TOUTES les fonctions pour utiliser /api/v1/
export const getSystemStatus = () => api.get('/api/v1/status');
export const getStatistics = () => api.get('/api/v1/statistics');
export const getTrafficData = () => api.get('/api/v1/traffic');
export const getDrivers = () => api.get('/api/v1/drivers');
export const verifyDriver = (id) => api.post(`/api/v1/verify-driver/${id}`);
export const getCities = () => api.get('/api/v1/cities');
export const getRoutes = (start, end, hour) => 
  api.get('/api/v1/route', { params: { start, end, hour } });
export const getAlgorithms = () => api.get('/api/v1/algorithms');
export const runAlgorithm = (algorithmId, parameters) => 
  api.post(`/api/v1/algorithms/${algorithmId}/run`, parameters);
export const getNearestVehicle = (latitude, longitude, city) =>
  api.get('/api/v1/vehicles/nearest', { params: { city } });

// Fonctions supplémentaires pour votre backend
export const getCityInfo = (cityName) => api.get(`/api/v1/city/${cityName}`);
export const registerDriver = (driverData) => api.post('/api/v1/drivers/register', driverData);
export const updateTraffic = (hour, delay) => api.post('/api/v1/traffic/update', { hour, delay });
export const planAdvancedRoute = (routeRequest) => api.post('/api/v1/route/advanced', routeRequest);

export default api;