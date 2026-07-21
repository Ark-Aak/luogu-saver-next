<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { NButton, NIcon } from 'naive-ui';
import { ChevronLeft, ChevronRight } from 'lucide-vue-next';
import type { Advertisement } from '@/api/advertisement.ts';

const props = defineProps<{
    advertisements: Advertisement[];
}>();

const root = ref<HTMLElement | null>(null);
const currentIndex = ref(0);
const slideDirection = ref<-1 | 1>(1);
const pointerInside = ref(false);
const focusInside = ref(false);
let rotationTimer: ReturnType<typeof setInterval> | null = null;

const currentAdvertisement = computed(() => props.advertisements[currentIndex.value] ?? null);
const hasControls = computed(() => props.advertisements.length > 1);
const isPaused = computed(() => pointerInside.value || focusInside.value);
const transitionName = computed(() =>
    slideDirection.value === 1 ? 'advertisement-forward' : 'advertisement-backward'
);

function isInteractionPaused() {
    return isPaused.value || root.value?.matches(':hover, :focus-within') === true;
}

function stopTimer() {
    if (rotationTimer === null) return;
    clearInterval(rotationTimer);
    rotationTimer = null;
}

function startTimer() {
    stopTimer();
    if (!hasControls.value || isInteractionPaused()) return;
    rotationTimer = setInterval(() => {
        if (!isInteractionPaused()) showRelative(1, false);
    }, 5000);
}

function showRelative(direction: -1 | 1, resetTimer = true) {
    const length = props.advertisements.length;
    if (length < 2) return;
    slideDirection.value = direction;
    currentIndex.value = (currentIndex.value + direction + length) % length;
    if (resetTimer) startTimer();
}

function showAdvertisement(index: number) {
    if (index === currentIndex.value) {
        startTimer();
        return;
    }
    slideDirection.value = index > currentIndex.value ? 1 : -1;
    currentIndex.value = index;
    startTimer();
}

function handleFocusOut(event: FocusEvent) {
    const nextTarget = event.relatedTarget;
    focusInside.value = nextTarget instanceof Node && root.value?.contains(nextTarget) === true;
}

watch(
    () => props.advertisements.length,
    () => {
        currentIndex.value = 0;
        startTimer();
    }
);
watch(isPaused, startTimer);

onMounted(startTimer);
onBeforeUnmount(stopTimer);
</script>

<template>
    <section
        v-if="currentAdvertisement"
        ref="root"
        class="advertisement-carousel"
        aria-label="广告轮播"
        @pointerenter="pointerInside = true"
        @pointerleave="pointerInside = false"
        @focusin="focusInside = true"
        @focusout="handleFocusOut"
    >
        <div class="advertisement-frame">
            <div class="adblock-fallback">若要查看此内容，请关闭 AdBlock 类插件</div>
            <Transition :name="transitionName">
                <a
                    v-if="currentAdvertisement.targetUrl"
                    :key="currentAdvertisement.id"
                    class="advertisement-link"
                    :href="currentAdvertisement.targetUrl"
                    target="_blank"
                    rel="noopener noreferrer sponsored"
                >
                    <img
                        class="advertisement-image"
                        :src="currentAdvertisement.imageUrl"
                        :alt="currentAdvertisement.altText"
                        loading="lazy"
                        decoding="async"
                    />
                </a>
                <div v-else :key="currentAdvertisement.id" class="advertisement-static">
                    <img
                        class="advertisement-image"
                        :src="currentAdvertisement.imageUrl"
                        :alt="currentAdvertisement.altText"
                        loading="lazy"
                        decoding="async"
                    />
                </div>
            </Transition>

            <span class="advertisement-label">广告</span>

            <template v-if="hasControls">
                <n-button
                    circle
                    quaternary
                    class="carousel-control carousel-control-previous"
                    aria-label="上一张广告"
                    @click="showRelative(-1)"
                >
                    <template #icon><n-icon :component="ChevronLeft" /></template>
                </n-button>
                <n-button
                    circle
                    quaternary
                    class="carousel-control carousel-control-next"
                    aria-label="下一张广告"
                    @click="showRelative(1)"
                >
                    <template #icon><n-icon :component="ChevronRight" /></template>
                </n-button>

                <div class="carousel-indicators" aria-label="广告位置">
                    <button
                        v-for="(advertisement, index) in advertisements"
                        :key="advertisement.id"
                        type="button"
                        class="carousel-indicator"
                        :class="{ 'is-active': index === currentIndex }"
                        :aria-label="`显示第 ${index + 1} 张广告`"
                        :aria-current="index === currentIndex ? 'true' : undefined"
                        @click="showAdvertisement(index)"
                    ></button>
                </div>
            </template>
        </div>
    </section>
</template>

<style scoped>
.advertisement-carousel {
    width: 100%;
}

.advertisement-frame {
    position: relative;
    width: 100%;
    aspect-ratio: 16 / 9;
    overflow: hidden;
    border: 1px solid var(--ui-border-color);
    border-radius: var(--ui-card-radius);
    background: var(--ui-panel-color);
    box-shadow: var(--ui-card-shadow);
}

.adblock-fallback {
    position: absolute;
    inset: 0;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: var(--ui-space-6);
    color: var(--ui-muted-text-color);
    font-size: 13px;
    line-height: 1.6;
    text-align: center;
}

.advertisement-link,
.advertisement-static {
    position: absolute;
    inset: 0;
}

.advertisement-image {
    display: block;
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.advertisement-forward-enter-active,
.advertisement-forward-leave-active,
.advertisement-backward-enter-active,
.advertisement-backward-leave-active {
    transition:
        transform 420ms cubic-bezier(0.22, 1, 0.36, 1),
        opacity 420ms cubic-bezier(0.22, 1, 0.36, 1);
    will-change: transform, opacity;
}

.advertisement-forward-enter-from {
    opacity: 0.7;
    transform: translateX(100%);
}

.advertisement-forward-leave-to {
    opacity: 0.7;
    transform: translateX(-100%);
}

.advertisement-backward-enter-from {
    opacity: 0.7;
    transform: translateX(-100%);
}

.advertisement-backward-leave-to {
    opacity: 0.7;
    transform: translateX(100%);
}

.advertisement-label {
    position: absolute;
    top: var(--ui-space-2);
    left: var(--ui-space-2);
    padding: 2px 6px;
    border-radius: 3px;
    color: #ffffff;
    background: rgba(15, 23, 42, 0.66);
    font-size: 11px;
    line-height: 1.4;
    z-index: 2;
}

.carousel-control {
    position: absolute;
    top: 50%;
    width: 32px;
    height: 32px;
    color: #ffffff;
    background: rgba(15, 23, 42, 0.58);
    opacity: 0;
    pointer-events: none;
    transform: translateY(-50%);
    transition:
        opacity 180ms ease,
        background-color 180ms ease;
    z-index: 2;
}

.advertisement-carousel:hover .carousel-control,
.advertisement-carousel:focus-within .carousel-control {
    opacity: 1;
    pointer-events: auto;
}

.carousel-control:hover,
.carousel-control:focus-visible {
    color: #ffffff;
    background: rgba(15, 23, 42, 0.78);
}

.carousel-control-previous {
    left: var(--ui-space-2);
}

.carousel-control-next {
    right: var(--ui-space-2);
}

.carousel-indicators {
    position: absolute;
    right: var(--ui-space-3);
    bottom: var(--ui-space-2);
    left: var(--ui-space-3);
    display: flex;
    justify-content: center;
    gap: var(--ui-space-2);
    z-index: 2;
}

.carousel-indicator {
    width: 7px;
    height: 7px;
    padding: 0;
    border: 1px solid rgba(255, 255, 255, 0.9);
    border-radius: 50%;
    background: rgba(15, 23, 42, 0.52);
    cursor: pointer;
}

.carousel-indicator.is-active {
    background: #ffffff;
}

.carousel-indicator:focus-visible {
    outline: 2px solid #ffffff;
    outline-offset: 2px;
}
</style>
