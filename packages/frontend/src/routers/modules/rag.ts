import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: '/rag',
        name: 'rag',
        component: () => import('@/views/rag/RagView.vue'),
        meta: {
            activeMenu: 'rag'
        }
    }
] as RouteRecordRaw[];
