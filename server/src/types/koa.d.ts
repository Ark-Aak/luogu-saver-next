declare module 'koa' {
    interface Context {
        success(data?: any, msg?: string): void;
        fail(code: number, msg: string, data?: any): void;
        userId?: number;
        track(event: string, data: string): void;
    }
}