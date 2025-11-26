import axios from 'axios';

export const apiFetch = axios.create({
    baseURL: import.meta.env.VITE_API_URL,
    timeout: 5000,
    // headers: { 'Authorization': '' }
});

apiFetch.interceptors.response.use(
    response => response.data,
    error => {
        return Promise.reject(error);
    }
);