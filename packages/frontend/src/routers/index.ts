import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router';

const routes: RouteRecordRaw[] = [
    {
        path: '/',
        name: 'home',
        component: () => import('@/views/HomeView.vue'),
        meta: {
            activeMenu: 'home'
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

export default router;
