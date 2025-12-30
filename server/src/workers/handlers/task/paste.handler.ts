import { SaveTask, TaskHandler } from "@/shared/task";
import { fetch } from "@/utils/fetch";
import { C3vkMode } from "@/shared/c3vk";
import type { Paste as LuoguPaste, DataResponse } from "@/types/luogu-api";
import { PasteService } from "@/services/paste.service";
import { Paste } from "@/entities/paste";
import { logger } from "@/lib/logger";
import { buildUser } from "@/utils/luogu-api";
import { User } from "@/entities/user";
import { UserService } from "@/services/user.service";

export class PasteHandler implements TaskHandler<SaveTask> {
    public taskType = 'save:paste';

    public async handle(task: SaveTask): Promise<void> {
        const url = `https://www.luogu.com/paste/${task.payload.targetId}`;
        const resp: DataResponse<{ paste: LuoguPaste }> = await fetch(url, C3vkMode.MODERN);

        const incomingUser = buildUser(resp.currentData.paste.user);
        let user = await UserService.getUserByIdWithoutCache(incomingUser.id!);
        if (user) {
            Object.assign(user, incomingUser);
        } else {
            user = User.create(incomingUser) as User;
        }
        await UserService.saveUser(user!);

        const data = resp.currentData.paste;
        let paste = await PasteService.getPasteByIdWithoutCache(data.id);
        const incomingData: Partial<Paste> = {
            content: data.data,
            authorId: data.user.uid
        };
        if (paste) {
            Object.assign(paste, incomingData);
        } else {
            paste = new Paste();
            paste.id = data.id;
            paste.deleted = false;
            Object.assign(paste, incomingData);
        }
        await PasteService.savePaste(paste);
    }
}