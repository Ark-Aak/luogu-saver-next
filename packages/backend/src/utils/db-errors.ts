import { logger } from '@/lib/logger';

type DatabaseError = {
    code?: string;
    errno?: number;
    driverError?: {
        code?: string;
        errno?: number;
    };
};

export function isDuplicateKeyError(error: unknown): boolean {
    const dbError = error as DatabaseError;
    return (
        dbError.code === 'ER_DUP_ENTRY' ||
        dbError.errno === 1062 ||
        dbError.driverError?.code === 'ER_DUP_ENTRY' ||
        dbError.driverError?.errno === 1062
    );
}

export async function retryOnDuplicateKey<T>(
    operation: () => Promise<T>,
    attempts: number = 3
): Promise<T> {
    const maxAttempts = Math.max(1, attempts);

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (!isDuplicateKeyError(error) || attempt === maxAttempts) {
                throw error;
            }
        }
    }

    throw new Error('Duplicate key retry failed');
}

export function isRetryableTransactionError(error: unknown): boolean {
    const dbError = error as DatabaseError;
    const codes = [dbError.code, dbError.driverError?.code];
    const numbers = [dbError.errno, dbError.driverError?.errno];
    return (
        codes.includes('ER_LOCK_DEADLOCK') ||
        codes.includes('ER_LOCK_WAIT_TIMEOUT') ||
        numbers.includes(1213) ||
        numbers.includes(1205)
    );
}

export async function retryOnTransactionConflict<T>(
    operation: () => Promise<T>,
    attempts: number = 3
): Promise<T> {
    const maxAttempts = Math.max(1, attempts);
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
        try {
            return await operation();
        } catch (error) {
            if (!isRetryableTransactionError(error) || attempt === maxAttempts) throw error;
            const dbError = error as DatabaseError;
            const delayMs = 20 * attempt + Math.floor(Math.random() * 50);
            logger.warn(
                {
                    code: dbError.code || dbError.driverError?.code,
                    errno: dbError.errno || dbError.driverError?.errno,
                    attempt,
                    maxAttempts,
                    delayMs
                },
                'Retrying database transaction after lock conflict'
            );
            await new Promise(resolve => setTimeout(resolve, delayMs));
        }
    }
    throw new Error('Transaction conflict retry failed');
}
