import { AppDataSource } from '@/data-source';
import { EmbeddingService } from '@/services/embedding.service';
import { SearchService } from '@/services/search.service';
import { clampInt } from '@/utils/number';
import { redisClient } from '@/lib/redis';

function readBatchSize(): number {
    const argument = process.argv.find(value => value.startsWith('--batch-size='));
    const value = argument?.slice('--batch-size='.length);
    return clampInt(value, 100, 1, 1000);
}

async function main(): Promise<void> {
    const batchSize = readBatchSize();
    let initialized = false;
    let result: Record<string, unknown> | null = null;

    try {
        AppDataSource.setOptions({ synchronize: false });
        await AppDataSource.initialize();
        initialized = true;
        result = {
            batchSize,
            meilisearch: await SearchService.backfillArticleDeletionMarkers(batchSize),
            chroma: await EmbeddingService.backfillArticleDeletionMarkers(batchSize)
        };
    } finally {
        if (initialized) await AppDataSource.destroy();
        redisClient.disconnect();
    }

    console.log(JSON.stringify(result));
}

main().catch(error => {
    console.error(error);
    process.exitCode = 1;
});
