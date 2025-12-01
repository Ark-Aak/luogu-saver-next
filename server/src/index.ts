import Koa from 'koa';
import bodyParser from 'koa-bodyparser';
import cors from '@koa/cors';

import { config } from './config';
import { AppDataSource } from './data-source';

import router from './routers';
import { logger } from './utils/logger';

import { authorization } from "@/middlewares/authorization";
import { trackingMiddleware } from './middlewares/tracking';
import { responseHelper } from './middlewares/response';
import path from "path";
import history from "koa2-connect-history-api-fallback";
import serve from "koa-static";

const app = new Koa();

app.use(cors());
app.use(bodyParser());
app.use(authorization);
app.use(trackingMiddleware);
app.use(responseHelper);
app.use(router.routes()).use(router.allowedMethods());

if (config.env === 'production') {
    const staticPath = path.join(__dirname, '../../dist');
    app.use(history({ whiteList: ['/api'] }));
    app.use(serve(staticPath));
}

AppDataSource.initialize()
    .then(() => {
        app.listen(config.port, () => {
            logger.info({ port: config.port }, `Server started.`);
        });
    });