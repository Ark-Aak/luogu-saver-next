import {
    PersonOutline,
    BulbOutline,
    ConstructOutline,
    HardwareChipOutline,
    CameraOutline,
    SchoolOutline,
    GameControllerOutline,
    ChatbubblesOutline,
    HelpCircleOutline
} from '@vicons/ionicons5';

export const ARTICLE_CATEGORIES: Record<number, { label: string; icon: any; color: string }> = {
    1: { label: '个人记录', icon: PersonOutline, color: '#667eea' },
    2: { label: '题解', icon: BulbOutline, color: '#f39c12' },
    3: { label: '科技·工程', icon: ConstructOutline, color: '#e74c3c' },
    4: { label: '算法·理论', icon: HardwareChipOutline, color: '#3498db' },
    5: { label: '生活·游记', icon: CameraOutline, color: '#2ecc71' },
    6: { label: '学习·文化课', icon: SchoolOutline, color: '#9b59b6' },
    7: { label: '休闲·娱乐', icon: GameControllerOutline, color: '#1abc9c' },
    8: { label: '闲话', icon: ChatbubblesOutline, color: '#34495e' },
    9: { label: '未知', icon: HelpCircleOutline, color: '#95a5a6' }
};

export const UNKNOWN_CATEGORY = { label: '未知分类', icon: HelpCircleOutline, color: '#95a5a6' };

export const THEME_STORAGE_KEY = 'ui_theme';
export const CACHE_STORAGE_KEY = 'save_cache_';
export const DEVICE_ID_STORAGE_KEY = 'anon_device_id';
export const CONSENT_TRACKING_STORAGE_KEY = 'consent_tracking';
