import axios from 'axios';
import { getDeviceId } from '@/utils/device-id.ts';
import { CONSENT_TRACKING_STORAGE_KEY } from '@/utils/constants.ts';

export const apiFetch = axios.create({
    baseURL: import.meta.env.VITE_API_URL || '/api',
    timeout: 30000
});

apiFetch.interceptors.request.use(
    config => {
        if (localStorage.getItem(CONSENT_TRACKING_STORAGE_KEY) === 'true') {
            config.headers!['X-Consent-Tracking'] = 'true';
            config.headers!['X-Device-ID'] = getDeviceId();
        } else {
            config.headers!['X-Consent-Tracking'] = 'false';
        }
        return config;
    },
    error => {
        return Promise.reject(error);
    }
);

apiFetch.interceptors.response.use(
    response => response.data,
    error => {
        return Promise.reject(error);
    }
);
