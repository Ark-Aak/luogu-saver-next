<script setup lang="ts">
import { useRoute } from "vue-router";
import { onMounted, ref } from "vue";
import type { Article } from "@/types/article";
import { getArticleById } from "@/api/article.ts";

const route = useRoute();
const articleId = route.params.id as string;

const articleDetail = ref<Article | null>(null);
onMounted(async () => {
	articleDetail.value = (await getArticleById(articleId)).data;
});
</script>

<template>

</template>

<style scoped>

</style>