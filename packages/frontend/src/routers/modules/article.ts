import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: '/article/:id',
        name: 'article-detail',
        component: () => import('@/views/article/ArticleDetailView.vue'),
        meta: {
            activeMenu: 'article'
        }
    }
] as RouteRecordRaw[];
