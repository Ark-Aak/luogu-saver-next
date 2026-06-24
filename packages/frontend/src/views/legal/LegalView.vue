<script setup lang="ts">
import { computed } from 'vue';
import { Icon } from '@vicons/utils';
import { UserShield, ExclamationCircle, TrashAlt } from '@vicons/fa';

import Card from '@/components/Card.vue';
import { LEGAL_DOCUMENTS, type LegalKey } from '@/views/legal/legal-content.ts';

const props = defineProps<{
    docKey: LegalKey;
}>();

const doc = computed(() => LEGAL_DOCUMENTS[props.docKey]);

const ICON_MAP = {
    privacy: UserShield,
    disclaimer: ExclamationCircle,
    deletion: TrashAlt
} as const;

const iconComponent = computed(() => ICON_MAP[doc.value.icon]);
</script>

<template>
    <div class="legal-view">
        <Card class="legal-card">
            <div class="legal-header">
                <span class="legal-icon">
                    <Icon>
                        <component :is="iconComponent" />
                    </Icon>
                </span>
                <div class="legal-header-text">
                    <h1 class="legal-title">{{ doc.title }}</h1>
                    <p class="legal-updated">最后更新于：{{ doc.updatedAt }}</p>
                </div>
            </div>
        </Card>

        <Card class="legal-card">
            <section v-for="section in doc.sections" :key="section.heading" class="legal-section">
                <h3 class="legal-heading">{{ section.heading }}</h3>
                <template v-for="(seg, idx) in section.segments" :key="idx">
                    <!-- Content is a hard-coded static constant (legal-content.ts),
                         not user input; v-html is safe here. -->
                    <!-- eslint-disable-next-line vue/no-v-html -->
                    <p
                        v-if="seg.kind === 'paragraph'"
                        class="legal-paragraph"
                        v-html="seg.html"
                    ></p>
                    <ul v-else class="legal-list">
                        <!-- eslint-disable-next-line vue/no-v-html -->
                        <li v-for="(item, i) in seg.items" :key="i" v-html="item"></li>
                    </ul>
                </template>
            </section>
        </Card>
    </div>
</template>

<style scoped>
.legal-view {
    max-width: 880px;
    margin: 0 auto;
    display: flex;
    flex-direction: column;
    gap: 16px;
}

.legal-header {
    display: flex;
    align-items: center;
    gap: 14px;
}
.legal-icon {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 28px;
    color: var(--n-primary-color, var(--ui-primary-color));
    flex-shrink: 0;
}
.legal-header-text {
    min-width: 0;
}
.legal-title {
    margin: 0;
    font-size: 24px;
    font-weight: 700;
    line-height: 1.3;
}
.legal-updated {
    margin: 4px 0 0;
    font-size: 13px;
    color: var(--n-text-color-3, var(--ui-muted-text-color));
}

.legal-section {
    margin-bottom: 22px;
}
.legal-section:last-child {
    margin-bottom: 0;
}
.legal-heading {
    margin: 0 0 10px;
    font-size: 16px;
    font-weight: 600;
    line-height: 1.4;
}
.legal-paragraph {
    margin: 0;
    line-height: 1.8;
    font-size: 14px;
    color: var(--n-text-color-1, var(--ui-text-color));
}
.legal-list {
    margin: 0;
    padding-left: 20px;
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.legal-list li {
    line-height: 1.8;
    font-size: 14px;
    color: var(--n-text-color-1, var(--ui-text-color));
}
.legal-paragraph + .legal-list {
    margin-top: 10px;
}
</style>
