import { v4 as uuidv4 } from 'uuid';

import { DEVICE_ID_STORAGE_KEY } from '@/utils/constants.ts';

export function getDeviceId(): string {
    let deviceId = localStorage.getItem(DEVICE_ID_STORAGE_KEY);

    if (!deviceId) {
        deviceId = uuidv4();
        localStorage.setItem(DEVICE_ID_STORAGE_KEY, deviceId);
    }

    return deviceId;
}