import type { Logger as TypeOrmLogger } from 'typeorm';
import { logger } from '@/lib/logger';

function normalizeQuery(query: string) {
    const normalized = query.replace(/\s+/g, ' ').trim();
    return normalized.length <= 1000 ? normalized : `${normalized.slice(0, 997)}...`;
}

export class DatabaseLogger implements TypeOrmLogger {
    logQuery() {}

    logQueryError(error: string | Error, query: string) {
        if (typeof error === 'object' && 'code' in error && error.code === 'ER_DUP_ENTRY') {
            logger.debug({ query: normalizeQuery(query) }, 'Database duplicate key conflict');
            return;
        }
        logger.error({ err: error, query: normalizeQuery(query) }, 'Database query failed');
    }

    logQuerySlow(time: number, query: string) {
        logger.warn({ durationMs: time, query: normalizeQuery(query) }, 'Slow database query');
    }

    logSchemaBuild(message: string) {
        logger.debug({ message }, 'Database schema synchronization');
    }

    logMigration(message: string) {
        logger.info({ message }, 'Database migration');
    }

    log(level: 'log' | 'info' | 'warn', message: any) {
        if (level === 'warn') logger.warn({ message }, 'TypeORM');
        else if (level === 'info') logger.info({ message }, 'TypeORM');
        else logger.debug({ message }, 'TypeORM');
    }
}
