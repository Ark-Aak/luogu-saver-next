import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';
import { getCurrentUser } from '@/api/auth.ts';
import { currentAuth, isAuthenticated, setCurrentAuth } from '@/utils/auth.ts';
import { ROLE_ADMIN } from '@/utils/permissions.ts';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: {
            activeMenu: 'home',
            title: '首页'
        }
    }
];

const modules = import.meta.glob('./modules/*.ts', { eager: true });

Object.keys(modules).forEach(key => {
    const mod = modules[key] as { default: RouteRecordRaw[] };
    const modList = mod.default || [];
    routes.push(...modList);
});

routes.push({
    path: '/:pathMatch(.*)*',
    component: () => import('@/views/NotFound.vue')
});

const router = createRouter({
    history: createWebHistory(),
    routes
});

router.beforeEach(async to => {
    if (to.meta.requiresAdmin !== true) return true;

    if (isAuthenticated.value && !currentAuth.value) {
        try {
            const response = await getCurrentUser();
            if (response.code === 200) setCurrentAuth(response.data);
        } catch {
            return { name: 'home' };
        }
    }

    if (currentAuth.value?.role === ROLE_ADMIN) return true;
    return { name: 'home' };
});

const DEFAULT_TITLE = '洛谷保存站';

router.afterEach((to, from) => {
    if (to.path !== from.path) {
        document.title = to.meta.title ? `${to.meta.title} - ${DEFAULT_TITLE}` : DEFAULT_TITLE;
    }
});

export default router;
