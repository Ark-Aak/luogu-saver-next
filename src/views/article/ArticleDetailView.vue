<script setup lang="ts">
import { useRoute } from "vue-router";
import { onMounted, ref } from "vue";
import type { Article } from "@/types/article";
import { getArticleById } from "@/api/article.ts";

const route = useRoute();
const articleId = route.params.id as string;

const articleDetail = ref<Article | null>(null);
import { nextTick } from 'vue';

import 'katex/dist/katex.min.css';
import renderMathInElement from 'katex/dist/contrib/auto-render';

const contentRef = ref<HTMLElement | null>(null);
const processing = ref(false);

const loadData = async () => {
	articleDetail.value = (await getArticleById(articleId)).data;
	await nextTick();
	
	if (contentRef.value) {
		processing.value = true;
		
		renderMathInElement(contentRef.value, {
			delimiters: [
				{ left: '$$', right: '$$', display: true },
				{ left: '$', right: '$', display: false }
			],
			throwOnError: false
		});
		
		processing.value = false;
	}
};

onMounted(() => {
	loadData();
});
</script>

<template>
	<div v-if="articleDetail">
		<h1>{{ articleDetail.title }}</h1>
		<p>作者 UID: {{ articleDetail.authorUid }}</p>
		<p>创建时间: {{ articleDetail.createdAt }}</p>
		<hr />
		<div ref="contentRef" v-html="articleDetail.renderedContent"></div>
	</div>
	<div v-else>
		<p>正在加载文章详情...</p>
	</div>
</template>

<style scoped>

</style>