import Router from 'koa-router';
import articleRouter from './article.router';
import pasteRouter from './paste.router';
import plazaRouter from './plaza.router';
import taskRouter from './task.router';
import workflowRouter from './workflow.router';
import censorshipRouter from './censorship.router';
import { DefaultState, Context } from 'koa';

const router = new Router<DefaultState, Context>();

router.use(articleRouter.routes(), articleRouter.allowedMethods());
router.use(pasteRouter.routes(), pasteRouter.allowedMethods());
router.use(plazaRouter.routes(), plazaRouter.allowedMethods());
router.use(taskRouter.routes(), taskRouter.allowedMethods());
router.use(workflowRouter.routes(), workflowRouter.allowedMethods());
router.use(censorshipRouter.routes(), censorshipRouter.allowedMethods());

export default router;
