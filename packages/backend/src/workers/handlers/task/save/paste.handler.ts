import { SaveTask } from '@/shared/task';
import { TaskHandler, TaskTextResult, WorkflowResult } from '@/workers/types';
import { fetch } from '@/utils/fetch';
import { C3vkMode } from '@/shared/c3vk';
import type { Paste as LuoguPaste, DataResponse } from '@/types/luogu-api';
import { PasteService } from '@/services/paste.service';
import { buildUser } from '@/utils/luogu-api';
import { UserService } from '@/services/user.service';
import { logger } from '@/lib/logger';

export class PasteHandler implements TaskHandler<SaveTask> {
    public taskType = 'save:paste';

    public async handle(task: SaveTask): Promise<WorkflowResult<TaskTextResult>> {
        const url = `https://www.luogu.com/paste/${task.payload.targetId}`;
        const resp: DataResponse<{ paste: LuoguPaste }> = await fetch(url, C3vkMode.MODERN);

        const incomingUser = buildUser(resp.currentData.paste.user);
        let user = await UserService.getUserByIdWithoutCache(incomingUser.id!);
        if (user) {
            Object.assign(user, incomingUser);
        } else {
            user = UserService.createUser(incomingUser);
        }
        await UserService.saveUser(user!);

        const data = resp.currentData.paste;

        const saveResult = await PasteService.saveLuoguPaste(
            data,
            task.payload.metadata?.forceUpdate
        );

        if (saveResult.skipped) {
            logger.info({ pasteId: data.id }, 'Paste content unchanged, skipping update');
            return {
                skipNextStep: true,
                data: {
                    text: ''
                }
            };
        }

        return {
            skipNextStep: false,
            data: {
                text: saveResult.content
            }
        };
    }
}
