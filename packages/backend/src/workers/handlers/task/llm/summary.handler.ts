import { ChildrenValues, TaskHandler, TaskTextResult, WorkflowResult } from '@/workers/types';
import { AiTask } from '@/shared/task';
import { UnrecoverableError, Job } from 'bullmq';
import { llm } from '@/lib/llm';
import { extractUpsteamData, shouldSkip } from '@/workers/helpers/common.helper';

export async function generateArticleSummary(content: string): Promise<string> {
    const prompt = `
<prompt>
Please provide a concise summary for the text in \`<content>\`.
The summary should always be in Chinese.
</prompt>
<content>
${content}
</content>
        `;

    const result = await llm.chat(
        [
            {
                role: 'user',
                content: prompt
            }
        ],
        'summary'
    );

    return result.content || '';
}

export class SummaryHandler implements TaskHandler<AiTask> {
    public taskType = 'llm:summary';

    public async handle(task: AiTask, job: Job<AiTask>): Promise<WorkflowResult<TaskTextResult>> {
        let content: string | null = null;

        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;

        if (shouldSkip(childrenValues)) {
            return {
                skipNextStep: true,
                data: {
                    text: ''
                }
            };
        }

        content = extractUpsteamData(
            childrenValues,
            data => typeof data.text === 'string',
            job.id
        )?.text;

        if (!content) {
            throw new UnrecoverableError(
                `No upstream text data found for summary task in job ${job.id}`
            );
        }

        const result = await generateArticleSummary(content);

        return {
            skipNextStep: false,
            data: {
                text: result
            }
        };
    }
}
