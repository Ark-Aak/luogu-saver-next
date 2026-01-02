import Koa from 'koa';
import bodyParser from 'koa-bodyparser';

import { config } from './config';
import { AppDataSource } from './data-source';

import router from './routers';
import { logger } from './lib/logger';

import { authorization } from '@/middlewares/authorization';
import { trackingMiddleware } from './middlewares/tracking';
import { responseHelper } from './middlewares/response';
import path from 'path';
import history from 'koa2-connect-history-api-fallback';
import serve from 'koa-static';
import * as worker from '@/workers';
import { Server } from 'socket.io';
import http from 'http';

const app = new Koa();
const server = http.createServer(app.callback());
const io = new Server(server, {
    path: '/websocket',
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', socket => {
    logger.info({ id: socket.id }, 'Client connected');

    socket.on('join', room => {
        socket.join(room);
        logger.info({ id: socket.id, room }, 'Client joined room');
    });

    socket.on('leave', room => {
        socket.leave(room);
        logger.info({ id: socket.id, room }, 'Client left room');
    });

    socket.on('disconnect', () => {
        logger.info({ id: socket.id }, 'Client disconnected');
    });
});

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

AppDataSource.initialize().then(() => {
    worker.bootstrap();
    server.listen(config.port, () => {
        logger.info({ port: config.port }, `Server started.`);
    });
});
