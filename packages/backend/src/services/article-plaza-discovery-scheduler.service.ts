import { logger } from '@/lib/logger';
import { DiscoveryService } from '@/services/discovery.service';
import { config } from '@/config';

export class ArticlePlazaDiscoveryScheduler {
    private static timer: NodeJS.Timeout | null = null;
    private static running = false;

    static start() {
        if (this.timer) return;
        const schedulerConfig = config.discovery.articlePlaza;
        if (!schedulerConfig.enabled) {
            logger.info('Article plaza discovery scheduler disabled');
            return;
        }

        this.timer = setInterval(() => {
            void this.runOnce();
        }, schedulerConfig.intervalMs);

        logger.info(
            { intervalMs: schedulerConfig.intervalMs },
            'Article plaza discovery scheduler started'
        );
    }

    static stop() {
        if (!this.timer) return;
        clearInterval(this.timer);
        this.timer = null;
    }

    private static async runOnce() {
        if (this.running) return;
        this.running = true;

        try {
            if (await DiscoveryService.hasActiveArticlePlazaRun()) {
                logger.info('Article plaza discovery scheduler skipped: active run exists');
                return;
            }

            const result = await DiscoveryService.startArticlePlazaDiscovery({
                maxPages: config.discovery.articlePlaza.maxPages,
                includeCategories: config.discovery.articlePlaza.includeCategories,
                forceUpdate: config.discovery.articlePlaza.forceUpdate
            });
            logger.info(
                { runId: result.run.id, taskIds: result.taskIds },
                'Article plaza discovery scheduler started a run'
            );
        } catch (error) {
            logger.error({ error }, 'Article plaza discovery scheduler failed');
        } finally {
            this.running = false;
        }
    }
}
