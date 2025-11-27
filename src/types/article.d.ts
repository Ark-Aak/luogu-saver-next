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
    createdAt: number;
    updatedAt: number;
    deletedReason?: string;
    contentHash?: string;
    author?: User;
    renderedContent?: string;
}