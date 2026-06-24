import axios from 'axios';

const api = axios.create({
    baseURL: 'http://localhost:5000/api', // In production, this would be an env var
    headers: {
        'Content-Type': 'application/json',
    },
});

// Request interceptor to attach the JWT token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('nexus_token');
        if (token) {
            config.headers['Authorization'] = `Bearer ${token}`;
        }
        return config;
    },
    (error) => {
        return Promise.reject(error);
    }
);

export default api;
