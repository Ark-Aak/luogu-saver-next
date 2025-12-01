import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: '/search',
        name: 'search',
        component: () => import('@/views/search/SearchView.vue'),
        meta: {
            activeMenu: 'search'
        }
    }
] as RouteRecordRaw[];