import Router from 'koa-router';
import articleRouter from './article.router';
import pasteRouter from './paste.router';
import plazaRouter from './plaza.router';
import taskRouter from './task.router';
import workflowRouter from './workflow.router';
import censorshipRouter from './censorship.router';
import tokenRouter from './token.router';
import authRouter from './auth.router';
import userRouter from './user.router';
import searchRouter from './search.router';
import adminRouter from './admin.router';
import markdownRouter from './markdown.router';
import { DefaultState, Context } from 'koa';

const router = new Router<DefaultState, Context>();

router.use(articleRouter.routes(), articleRouter.allowedMethods());
router.use(pasteRouter.routes(), pasteRouter.allowedMethods());
router.use(plazaRouter.routes(), plazaRouter.allowedMethods());
router.use(taskRouter.routes(), taskRouter.allowedMethods());
router.use(workflowRouter.routes(), workflowRouter.allowedMethods());
router.use(censorshipRouter.routes(), censorshipRouter.allowedMethods());
router.use(tokenRouter.routes(), tokenRouter.allowedMethods());
router.use(authRouter.routes(), authRouter.allowedMethods());
router.use(userRouter.routes(), userRouter.allowedMethods());
router.use(searchRouter.routes(), searchRouter.allowedMethods());
router.use(adminRouter.routes(), adminRouter.allowedMethods());
router.use(markdownRouter.routes(), markdownRouter.allowedMethods());

export default router;
