import 'koa';

declare module 'koa' {
    interface Context {
        success(data?: any, msg?: string): void;
        fail(code: number, msg: string, data?: any): void;
        user: {
            id: number;
            role: number;
        };
        track(event: string, data: string): void;
    }
}
