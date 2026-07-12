import type { DataSource } from 'typeorm';
import { config } from '@/config';
import { logger } from '@/lib/logger';

type MariaDbPool = {
    on?: (event: string, listener: () => void) => void;
    _allConnections?: { length?: number };
    _freeConnections?: { length?: number };
    _connectionQueue?: { length?: number };
};

function collectionSize(collection?: { length?: number }) {
    return Number(collection?.length || 0);
}

export class DatabasePoolMonitor {
    static start(dataSource: DataSource) {
        const pool = (dataSource.driver as unknown as { pool?: MariaDbPool }).pool;
        if (!pool) {
            logger.warn('MariaDB pool metrics unavailable');
            return;
        }

        let queuedAcquisitions = 0;
        pool.on?.('enqueue', () => {
            queuedAcquisitions += 1;
        });

        const timer = setInterval(() => {
            const metrics = {
                connectionLimit: config.db.connectionLimit,
                totalConnections: collectionSize(pool._allConnections),
                freeConnections: collectionSize(pool._freeConnections),
                queuedConnections: collectionSize(pool._connectionQueue),
                queuedAcquisitions
            };
            if (queuedAcquisitions > 0) logger.warn(metrics, 'MariaDB pool experienced contention');
            else logger.debug(metrics, 'MariaDB pool metrics');
            queuedAcquisitions = 0;
        }, config.db.poolMetricsIntervalMs);
        timer.unref?.();
    }
}
