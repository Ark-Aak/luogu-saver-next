import { Job, UnrecoverableError } from 'bullmq';
import { RagTask } from '@/shared/task';
import { ChildrenValues, TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { ArticleService } from '@/services/article.service';
import { shouldSkip } from '@/workers/helpers/common.helper';

type MergedHit = {
    id: string;
    score: number;
    keywordRank?: number;
    vectorDistance?: number;
    sources: string[];
};

export class RagContextHandler implements TaskHandler<RagTask> {
    public taskType = 'rag:context';

    public async handle(
        task: RagTask,
        job: Job<RagTask>
    ): Promise<WorkflowResult<TaskCommonResult>> {
        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;
        if (shouldSkip(childrenValues))
            return { skipNextStep: true, data: { text: '', documents: [] } };

        const question = this.extractQuestion(childrenValues, task.payload.query);
        if (!question)
            throw new UnrecoverableError(`No question found for rag context job ${job.id}`);

        const maxArticles = Math.min(
            10,
            Math.max(1, Number(task.payload.metadata?.maxArticles) || 6)
        );
        const maxChars = Math.min(
            20000,
            Math.max(1000, Number(task.payload.metadata?.maxChars) || 8000)
        );
        const merged = this.mergeHits(childrenValues).slice(0, maxArticles);
        const documents = [];

        for (const hit of merged) {
            const article = await ArticleService.getArticleByIdWithAuthorWithoutCache(hit.id);
            if (!article || article.deleted) continue;
            documents.push({
                id: article.id,
                title: article.title,
                summary: article.summary || '',
                excerpt: this.truncate(article.content || '', 900),
                authorName: article.author?.name || '',
                score: hit.score,
                sources: hit.sources,
                vectorDistance: hit.vectorDistance
            });
        }

        let text = `<question>\n${question}\n</question>\n<documents>\n`;
        for (const doc of documents) {
            const candidate = `<document id="${doc.id}" title="${this.escapeAttr(doc.title)}" source="${doc.sources.join(',')}">\n<summary>${doc.summary}</summary>\n<excerpt>${doc.excerpt}</excerpt>\n</document>\n`;
            if ((text + candidate + '</documents>').length > maxChars) break;
            text += candidate;
        }
        text += '</documents>';

        return {
            skipNextStep: false,
            data: {
                text,
                documents
            }
        };
    }

    private extractQuestion(childrenValues: ChildrenValues, fallback?: string): string {
        for (const value of Object.values(childrenValues)) {
            if (typeof value?.data?.text === 'string' && value.data.text.trim()) {
                return value.data.text.trim();
            }
        }
        return (fallback || '').trim();
    }

    private mergeHits(childrenValues: ChildrenValues): MergedHit[] {
        const merged = new Map<string, MergedHit>();

        for (const value of Object.values(childrenValues)) {
            const hits = value?.data?.hits;
            if (!Array.isArray(hits)) continue;

            hits.forEach((hit: any, index: number) => {
                if (!hit?.id) return;
                const current: MergedHit = merged.get(hit.id) || {
                    id: hit.id,
                    score: 0,
                    sources: []
                };
                if (hit.source === 'vector') {
                    const vectorScore =
                        typeof hit.score === 'number'
                            ? hit.score
                            : Math.max(0, 1 - (hit.distance || 1));
                    current.score += vectorScore;
                    current.vectorDistance = hit.distance;
                    if (!current.sources.includes('vector')) current.sources.push('vector');
                } else {
                    current.score += 1 / (index + 1);
                    current.keywordRank = index;
                    if (!current.sources.includes('keyword')) current.sources.push('keyword');
                }
                merged.set(hit.id, current);
            });
        }

        for (const hit of merged.values()) {
            if (hit.sources.includes('keyword') && hit.sources.includes('vector')) hit.score += 0.5;
        }

        return [...merged.values()].sort((a, b) => b.score - a.score);
    }

    private truncate(text: string, max: number): string {
        const chars = Array.from(text || '');
        if (chars.length <= max) return text || '';
        return `${chars.slice(0, max).join('')}...`;
    }

    private escapeAttr(text: string): string {
        return text.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');
    }
}
