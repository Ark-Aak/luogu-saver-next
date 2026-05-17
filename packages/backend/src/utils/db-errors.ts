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
