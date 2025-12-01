import { User } from './user';

export interface Article {
    id: string;
    title: string;
    content?: string;
    authorUid?: number;
    category?: number;
    upvote?: number;
    favorCount?: number;
    solutionForPid?: string;
    priority: number;
    deleted: boolean;
    tags?: string;
    createdAt: string;
    updatedAt: string;
    deletedReason?: string;
    contentHash?: string;
    viewCount: number;
    author?: User;
    renderedContent?: string;
}

export interface PlazaArticle {
    id: string;
    title: string;
    summary: string;
    category?: number;
    author?: User;
    updatedAt: string;
    tags?: string;
    reason?: string;
}