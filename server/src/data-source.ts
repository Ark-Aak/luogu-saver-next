import "reflect-metadata";
import { DataSource } from "typeorm";
import path from "path";
import { config } from "./config";
import { SnakeNamingStrategy } from 'typeorm-naming-strategies';
import { ChromaClient } from 'chromadb';

export const AppDataSource = new DataSource({
    type: "mariadb",
    host: config.db.host,
    port: config.db.port,
    username: config.db.user,
    password: config.db.password,
    database: config.db.database,

    synchronize: true,
    logging: true,

    entities: [path.join(__dirname, "/entities/*.{ts,js}")],
    namingStrategy: new SnakeNamingStrategy(),

    subscribers: [],
    migrations: [],
});

export const ChromaDataSource = new ChromaClient({
    ssl: config.chroma.ssl,
    host: config.chroma.host,
    port: config.chroma.port,
    tenant: "default_tenant",
    database: "default_database",
});