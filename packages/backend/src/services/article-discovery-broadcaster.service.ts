import { emitToRoom } from '@/lib/socket';
import { logger } from '@/lib/logger';

export const ARTICLE_DISCOVERY_RUNS_ROOM = 'discovery:runs';
export const ARTICLE_DISCOVERY_RUNS_EVENT = 'discovery:runs:update';

export class ArticleDiscoveryBroadcaster {
    private static readonly debounceMs = 500;
    private static pendingRunIds = new Set<string>();
    private static timer: NodeJS.Timeout | null = null;

    static scheduleRunsUpdate(runId?: string) {
        if (runId) this.pendingRunIds.add(runId);
        if (this.timer) return;

        this.timer = setTimeout(() => this.flush(), this.debounceMs);
        this.timer.unref?.();
    }

    private static flush() {
        const runIds = Array.from(this.pendingRunIds);
        this.pendingRunIds.clear();
        this.timer = null;

        try {
            emitToRoom(ARTICLE_DISCOVERY_RUNS_ROOM, ARTICLE_DISCOVERY_RUNS_EVENT, { runIds });
        } catch (error) {
            logger.error({ error, runIds }, 'Failed to broadcast article discovery update');
        }
    }
}
