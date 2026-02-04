import { ChildrenValues, TaskHandler, TaskTextResult, WorkflowResult } from '@/workers/types';
import { AiTask } from '@/shared/task';
import { Job, UnrecoverableError } from 'bullmq';
import { extractUpsteamData, getSourceTextById, shouldSkip } from '@/workers/helpers/common.helper';
import { llm } from '@/lib/llm';

export class ChatHandler implements TaskHandler<AiTask> {
    public taskType = 'llm:chat';

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

        content = extractUpsteamData(childrenValues, data => typeof data.text === 'string')?.text;

        if (!content) {
            if (task.payload.sourceId) {
                content = await getSourceTextById(task.payload.sourceId, job.id);
            } else {
                throw new UnrecoverableError(
                    `No upstream text data found for chat task in job ${job.id}`
                );
            }
        }

        const prompt = `
<prompt>
Now you are a professional conversational assistant.
Please engage in a conversation based on the text in \`<content>\`.
Always respond in Chinese.
</prompt>
<content>
${content!}
</content>
        `;

        const result = await llm.chat(
            [
                {
                    role: 'user',
                    content: prompt
                }
            ],
            'chat'
        );

        return {
            skipNextStep: false,
            data: {
                text: result.content || ''
            }
        };
    }
}
