import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: '/admin',
        name: 'admin',
        component: () => import('@/views/admin/AdminView.vue'),
        meta: {
            activeMenu: 'admin'
        }
    }
] as RouteRecordRaw[];
