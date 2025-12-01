import type { RouteRecordRaw } from "vue-router";

export default [
    {
        path: '/plaza',
        name: 'plaza',
        component: () => import('@/views/plaza/PlazaView.vue'),
        meta: {
            activeMenu: 'plaza'
        }
    }
] as RouteRecordRaw[];