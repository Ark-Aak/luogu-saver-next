import { ARTICLE_CATEGORIES } from '@/utils/constants';
import type { TocItem } from '@/types/article';

export const getCategoryLabel = (id?: number) => {
    if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].label;
    return ARTICLE_CATEGORIES[9]!.label;
};

export const getCategoryColor = (id?: number) => {
    if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].color;
    return ARTICLE_CATEGORIES[9]!.color;
};

export const getCategoryIcon = (id?: number) => {
    if (id && ARTICLE_CATEGORIES[id]) return ARTICLE_CATEGORIES[id].icon;
    return ARTICLE_CATEGORIES[9]!.icon;
};

export const generateTocAndProcessHtml = (html: string) => {
    if (!html.trim()) return { html, toc: [] };

    const div = document.createElement('div');
    div.innerHTML = html;

    const headers = div.querySelectorAll('h1, h2, h3, h4, h5, h6');
    const toc: TocItem[] = [];
    const stack: { level: number; item: TocItem }[] = [];

    headers.forEach((header, index) => {
        const level = parseInt(header.tagName.substring(1));
        const title = header.textContent?.trim() || '';

        let id = header.getAttribute('id');

        if (!id) {
            id = `toc-heading-${index}`;
            header.setAttribute('id', id);
        }

        const item: TocItem = { title, href: `#${id}`, children: [] };

        while (stack.length > 0 && stack[stack.length - 1]!.level >= level) {
            stack.pop();
        }

        if (stack.length === 0) {
            toc.push(item);
        } else {
            const parent = stack[stack.length - 1]!.item;
            if (!parent.children) parent.children = [];
            parent.children.push(item);
        }

        stack.push({ level, item });
    });

    return {
        html: div.innerHTML,
        toc
    };
};
