import { Job, UnrecoverableError } from 'bullmq';
import { RagTask } from '@/shared/task';
import { ChildrenValues, TaskCommonResult, TaskHandler, WorkflowResult } from '@/workers/types';
import { shouldSkip } from '@/workers/helpers/common.helper';
import { llm } from '@/lib/llm';

export class RagAnswerHandler implements TaskHandler<RagTask> {
    public taskType = 'rag:answer';

    public async handle(
        _task: RagTask,
        job: Job<RagTask>
    ): Promise<WorkflowResult<TaskCommonResult>> {
        const childrenValues = (await job.getChildrenValues()) as ChildrenValues;
        if (shouldSkip(childrenValues))
            return { skipNextStep: true, data: { text: '', documents: [] } };

        const context = Object.values(childrenValues).find(
            value => typeof value?.data?.text === 'string'
        )?.data;
        if (!context?.text) throw new UnrecoverableError(`No RAG context found for job ${job.id}`);

        const prompt = `
<prompt>
You are a retrieval-augmented question answering assistant.
Answer in Chinese.
Use only the provided documents.
If the answer cannot be determined from the documents, state that the existing material cannot determine the answer.
At the end, list cited article titles and IDs from the documents you used.
</prompt>
<context>
${context.text}
</context>
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
                text: result.content || '',
                documents: context.documents || []
            }
        };
    }
}
