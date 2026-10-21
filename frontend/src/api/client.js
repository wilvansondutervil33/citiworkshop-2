import axios from 'axios';

// In production the site and API share the CloudFront domain, which routes /api/facilities/* to the Lambda
const apiClient = axios.create({
    baseURL : import.meta.env.VITE_API_BASE_URL || (import.meta.env.PROD ? '/api/facilities' : 'http://127.0.0.1:8000'),
})

apiClient.interceptors.request.use((config) => {
    const token = localStorage.getItem('workToken');

    if(token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export default apiClient;