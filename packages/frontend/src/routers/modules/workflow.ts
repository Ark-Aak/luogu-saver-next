import type { RouteRecordRaw } from 'vue-router';

export default [
    {
        path: '/workflow/:id',
        name: 'workflow-tracker',
        component: () => import('@/views/workflow/WorkflowTrackerView.vue'),
        meta: {
            activeMenu: '',
            title: '工作流跟踪'
        }
    }
] as RouteRecordRaw[];
