import { v4 as uuidv4 } from 'uuid';

import { DEVICE_ID_STORAGE_KEY } from '@/utils/constants.ts';
import { useLocalStorage } from "@/composables/useLocalStorage.ts";

const deviceIdStorage = useLocalStorage(DEVICE_ID_STORAGE_KEY, '')

export function getDeviceId(): string {
    let deviceId = deviceIdStorage.value;

    if (!deviceId) {
        deviceId = uuidv4();
        deviceIdStorage.value = deviceId;
    }

    return deviceId;
}
