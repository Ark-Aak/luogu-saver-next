import fs from 'fs';
import yaml from 'js-yaml';
import { z } from 'zod';
import { AppConfigSchema, type AppConfig } from './schemas';
import { logger } from '@/lib/logger';

function applyEnvOverrides(config: AppConfig): AppConfig {
    const overrides: { key: string; env: string | undefined }[] = [
        { key: 'auth.cpOAuth.clientSecret', env: process.env.SAVER_AUTH_CP_OAUTH_CLIENT_SECRET },
        { key: 'auth.cpOAuth.clientId', env: process.env.SAVER_AUTH_CP_OAUTH_CLIENT_ID },
        { key: 'db.password', env: process.env.SAVER_DB_PASSWORD },
        { key: 'redis.password', env: process.env.SAVER_REDIS_PASSWORD }
    ];

    let modified = false;
    for (const { key, env } of overrides) {
        if (!env) continue;
        const parts = key.split('.');
        let obj: any = config;
        for (let i = 0; i < parts.length - 1; i++) {
            if (obj[parts[i]] === undefined) obj[parts[i]] = {};
            obj = obj[parts[i]];
        }
        if (obj[parts[parts.length - 1]] !== env) {
            obj[parts[parts.length - 1]] = env;
            modified = true;
            logger.debug({ key }, 'Configuration overridden by environment variable');
        }
    }

    if (!modified) return config;
    return AppConfigSchema.parse(config);
}

export class ConfigLoader {
    private config: AppConfig | null = null;

    constructor(private configPath: string) {}

    load(): AppConfig {
        if (this.config) {
            return this.config;
        }

        if (!fs.existsSync(this.configPath)) {
            logger.warn(
                `Configuration file not found at ${this.configPath}, using default configuration.`
            );
            this.config = AppConfigSchema.parse({});
            return this.config;
        }

        try {
            const fileContents = fs.readFileSync(this.configPath, 'utf8');
            const rawConfig = yaml.load(fileContents);

            this.config = AppConfigSchema.parse(rawConfig);
            this.config = applyEnvOverrides(this.config);
            return this.config;
        } catch (error) {
            this.handleError(error);
            throw error;
        }
    }

    private handleError(error: unknown) {
        logger.error({ error }, 'Failed to load configuration.');

        if (error instanceof z.ZodError) {
            error.issues.forEach(issue => {
                const path = issue.path.join('.');
                logger.error({ path, message: issue.message }, 'Configuration validation error');
            });
        } else {
            logger.error({ error }, 'Unknown error during configuration loading');
        }

        process.exit(1);
    }
}
