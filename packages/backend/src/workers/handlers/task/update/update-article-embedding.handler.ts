import { UpdateTask } from '@/shared/task';
import { TaskHandler } from '@/workers/types';

export class UpdateArticleEmbeddingHandler implements TaskHandler<UpdateTask> {
    public taskType = 'update:article_embedding';

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    public async handle(task: UpdateTask): Promise<any> {}
}
