import { User } from './user';

export interface Paste {
    id: string;
    title: string;
    content: string;
    authorUid?: number;
    deleted: boolean;
    createdAt: number;
    updatedAt: number;
    deletedReason: string;
    author?: User;
    renderedContent?: string;
}