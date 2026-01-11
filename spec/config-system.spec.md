# Configuration System Specification

## 1. Overview

The configuration system loads and validates application settings from a YAML file at startup. Configuration is immutable after loading.

## 2. Configuration File Discovery

### 2.1 Explicit Path

If the environment variable `CONFIG_PATH` is set, the system SHALL use the resolved absolute path of that value as the configuration file path.

### 2.2 Automatic Discovery

If `CONFIG_PATH` is not set, the system SHALL search for `config.yml` in the following order:

1. `${CWD}/config.yml`
2. `${CWD}/packages/backend/config.yml`
3. `${CWD}/packages/backend/config/config.yml`
4. `${CWD}/config/config.yml`
5. Paths relative to the executing script directory (`process.argv[1]`)
6. Ancestor directories traversed upward from `CWD`

The first existing file found SHALL be used. If no file is found, the system SHALL throw an error listing all searched paths.

## 3. Configuration Schema

The configuration is validated using Zod schemas. All fields have default values.

### 3.1 Server Configuration

| Field             | Type   | Default       | Description                        |
|-------------------|--------|---------------|------------------------------------|
| `port`            | number | 3000          | HTTP server listening port         |
| `env`             | string | "development" | Environment name                   |
| `network.timeout` | number | 30000         | Network request timeout in ms      |

### 3.2 Database Configuration (`db`)

| Field      | Type   | Default      | Description                |
|------------|--------|--------------|----------------------------|
| `host`     | string | "localhost"  | MySQL server hostname      |
| `port`     | number | 3306         | MySQL server port          |
| `user`     | string | "root"       | MySQL username             |
| `password` | string | ""           | MySQL password             |
| `database` | string | "mydatabase" | MySQL database name        |

### 3.3 Redis Configuration (`redis`)

| Field       | Type   | Default     | Description                    |
|-------------|--------|-------------|--------------------------------|
| `host`      | string | "localhost" | Redis server hostname          |
| `port`      | number | 6379        | Redis server port              |
| `password`  | string | ""          | Redis password                 |
| `keyPrefix` | string | ""          | Prefix for all Redis keys      |

### 3.4 Chroma Configuration (`chroma`)

| Field            | Type    | Default        | Description                      |
|------------------|---------|----------------|----------------------------------|
| `enable`         | boolean | false          | Enable Chroma vector database    |
| `ssl`            | boolean | false          | Use SSL for Chroma connection    |
| `host`           | string  | "127.0.0.1"    | Chroma server hostname           |
| `port`           | number  | 8000           | Chroma server port               |
| `collectionName` | string  | "lgs_articles" | Chroma collection name           |

### 3.5 Recommendation Configuration (`recommendation`)

| Field                   | Type   | Default         | Description                                             |
|-------------------------|--------|-----------------|---------------------------------------------------------|
| `anonymous.expireTime`  | number | 604800 (7 days) | TTL in seconds for anonymous behavior records in Redis  |
| `anonymous.maxCount`    | number | 100             | Maximum behavior records per anonymous device           |
| `maxHistory`            | number | 500             | Maximum history entries for recommendation profiling    |
| `decayFactor`           | number | 0.9             | Decay factor for weighted profile vector calculation    |
| `relevantThreshold`     | number | 0.75            | Minimum string similarity for title-based matching      |

### 3.6 Queue Configuration (`queue`)

| Field                 | Type   | Default | Description                                      |
|-----------------------|--------|---------|--------------------------------------------------|
| `concurrencyLimit`    | number | 5       | Maximum concurrent jobs per worker               |
| `maxRequestToken`     | number | 20      | Token bucket capacity for rate limiting          |
| `regenerationSpeed`   | number | 1       | Tokens regenerated per interval                  |
| `regenerationInterval`| number | 1000    | Token regeneration interval in ms                |
| `maxQueueLength`      | number | 1000    | Maximum pending jobs in queue                    |
| `processInterval`     | number | 100     | Job processing interval in ms                    |

## 4. Loading Behavior

### 4.1 Successful Load

1. Read the YAML file contents.
2. Parse YAML to a JavaScript object.
3. Validate against `AppConfigSchema` using Zod.
4. Return the validated configuration object.

### 4.2 Missing File

If the configuration file does not exist at the discovered path:

- Log a warning message.
- Use default values by parsing an empty object through the schema.

### 4.3 Validation Errors

If schema validation fails:

- Log each validation error with its path and message.
- Terminate the process with `process.exit(1)`.

## 5. Invariants

1. The configuration object is a singleton; `config` is loaded once and reused.
2. All configuration values conform to their schema-defined types.
3. Default values are applied for any missing fields.
4. The system MUST NOT start if the configuration file exists but contains invalid data.

## 6. File Locations

- Entry point: `packages/backend/src/config/index.ts`
- Loader: `packages/backend/src/config/loader.ts`
- Schemas: `packages/backend/src/config/schemas/*.ts`
