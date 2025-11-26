<script setup lang="ts">
import CardTitle from '@/components/CardTitle.vue';
import Card from '@/components/Card.vue';
import Statistic from '@/components/Statistic.vue';
import { NGrid, NGi, NInput, NIcon, NButton } from 'naive-ui';
import {
	Bookmark, Megaphone, Newspaper, Clipboard, Search, PaperPlane, Save, Link
} from '@vicons/ionicons5';

import { getArticleCount } from "@/api/article.ts";
import { getPasteCount } from "@/api/paste.ts";
import { onMounted, ref } from "vue";

const articleCount = ref(0);
const pasteCount = ref(0);
onMounted(async () => {
	articleCount.value = (await getArticleCount()).data.count;
	pasteCount.value = (await getPasteCount()).data.count;
});
</script>

<template>
	<n-grid cols="1" y-gap="16">
		<n-gi>
			<CardTitle
				title="洛谷保存站"
				subtitle="Save everything, keep it alive."
				:icon="Bookmark"
			/>
		</n-gi>
		<n-gi>
			<n-grid cols="24" :x-gap="16">
				<n-gi span="17">
					<n-grid cols="1" y-gap="16">
						<n-gi>
							<Card title="公告" :icon="Megaphone">
								This is a sample announcement text.
							</Card>
						</n-gi>
						<n-gi>
							<Card title="搜索" :icon="Search">
								<n-input placeholder="搜索文章内容、作者 UID...">
									<template #prefix>
										<n-icon :component="Search" />
									</template>
									<template #suffix>
										<n-button size="small" text style="font-size: 20px;">
											<n-icon :component="PaperPlane" />
										</n-button>
									</template>
								</n-input>
							</Card>
						</n-gi>
						<n-gi>
							<Card title="专栏 / 剪贴板 / 个人主页保存" :icon="Newspaper">
								<n-input placeholder="输入专栏 / 剪贴板 / 个人主页链接">
									<template #prefix>
										<n-icon :component="Link" />
									</template>
								</n-input>
							</Card>
						</n-gi>
					</n-grid>
				</n-gi>
				<n-gi span="7">
					<n-grid cols="1" y-gap="16">
						<n-gi>
							<Statistic :value="articleCount" label="文章总数" :icon="Newspaper" />
						</n-gi>
						<n-gi>
							<Statistic :value="pasteCount" label="剪贴板总数" :icon="Clipboard" />
						</n-gi>
					</n-grid>
				</n-gi>
			</n-grid>
		</n-gi>
	</n-grid>
</template>

<style scoped>

</style>