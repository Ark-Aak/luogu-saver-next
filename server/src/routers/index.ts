import Router from 'koa-router';
import articleRouter from './article.router';
import pasteRouter from './paste.router';
import plazaRouter from './plaza.router';
import { DefaultState, Context } from 'koa';

const router = new Router<DefaultState, Context>();

router.use(articleRouter.routes(), articleRouter.allowedMethods());
router.use(pasteRouter.routes(), pasteRouter.allowedMethods());
router.use(plazaRouter.routes(), plazaRouter.allowedMethods());

export default router;