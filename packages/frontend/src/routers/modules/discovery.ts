import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: '/discovery/user-articles',
        name: 'user-article-discovery',
        component: () => import('@/views/discovery/UserArticleDiscoveryView.vue'),
        meta: {
            activeMenu: 'user-article-discovery',
            title: '用户文章爬取',
            requiresAdmin: true
        }
    }
] as RouteRecordRaw[];
