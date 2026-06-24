import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import remarkSmartypants from 'remark-smartypants';
import { visit } from 'unist-util-visit';
import rehypeSanitize, { defaultSchema, type Options } from 'rehype-sanitize';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import type { ElementContent, Root } from 'hast';
import type { VFile } from 'vfile';

const headingAnchorIcon: ElementContent = {
    type: 'element',
    tagName: 'svg',
    properties: {
        className: ['heading-pin-icon', 'lucide', 'lucide-pin'],
        xmlns: 'http://www.w3.org/2000/svg',
        width: 24,
        height: 24,
        viewBox: '0 0 24 24',
        fill: 'none',
        stroke: 'currentColor',
        strokeWidth: 2,
        strokeLinecap: 'round',
        strokeLinejoin: 'round',
        ariaHidden: 'true',
        focusable: 'false'
    },
    children: [
        {
            type: 'element',
            tagName: 'path',
            properties: { d: 'M12 17v5' },
            children: []
        },
        {
            type: 'element',
            tagName: 'path',
            properties: {
                d: 'M9 10.76a2 2 0 0 1-1.11 1.79l-1.78.9A2 2 0 0 0 5 15.24V16a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-.76a2 2 0 0 0-1.11-1.79l-1.78-.9A2 2 0 0 1 15 10.76V7a1 1 0 0 1 1-1 2 2 0 0 0 0-4H8a2 2 0 0 0 0 4 1 1 0 0 1 1 1z'
            },
            children: []
        }
    ]
};

let processorPromise: Promise<any> | null = null;

function rehypeSafeKatex(options?: Parameters<typeof rehypeKatex>[0]) {
    const transform = rehypeKatex(options);

    return (tree: Root, file: VFile) => {
        visit(tree, 'element', node => {
            node.properties ||= {};
        });
        return transform(tree, file);
    };
}

async function getProcessor() {
    if (processorPromise) return processorPromise;

    processorPromise = (async () => {
        const [rehypeShikiModule, rehypeSlugModule, rehypeAutolinkHeadingsModule] =
            await Promise.all([
                import('@shikijs/rehype'),
                import('rehype-slug'),
                import('rehype-autolink-headings')
            ]);
        const rehypeShiki = rehypeShikiModule.default;
        const rehypeSlug = rehypeSlugModule.default;
        const rehypeAutolinkHeadings = rehypeAutolinkHeadingsModule.default;
        const schema: Options = {
            ...defaultSchema,
            attributes: {
                ...defaultSchema.attributes,
                '*': ['className'],
                div: [...(defaultSchema.attributes?.div || []), 'style', ['data*']],
                span: [...(defaultSchema.attributes?.span || []), 'className', 'style'],
                input: [...(defaultSchema.attributes?.input || []), 'type', 'checked', 'disabled'],
                pre: ['className', 'style'],
                code: ['className', 'style'],
                th: [
                    ...(defaultSchema.attributes?.th || []),
                    'align',
                    'className',
                    'rowspan',
                    'colspan',
                    'rowSpan',
                    'colSpan'
                ],
                td: [
                    ...(defaultSchema.attributes?.td || []),
                    'align',
                    'className',
                    'rowspan',
                    'colspan',
                    'rowSpan',
                    'colSpan'
                ],
                iframe: [
                    'src',
                    'scrolling',
                    'border',
                    'frameborder',
                    'framespacing',
                    'allowfullscreen',
                    'width',
                    'height',
                    'className',
                    'style'
                ]
            },
            tagNames: [
                ...(defaultSchema.tagNames || []),
                'div',
                'span',
                'i',
                'iframe',
                'video',
                'audio',
                'img',
                'math',
                'mi',
                'mo',
                'mn',
                'msup',
                'msub',
                'mfrac',
                'mtable',
                'mtr',
                'mtd'
            ]
        };

        function remarkCustomContainers() {
            return (tree: any) => {
                const stringifyDirective = (node: any) => {
                    const label =
                        node.children?.map((child: any) => child.value || '').join('') || '';
                    const attributes = Object.entries(node.attributes || {})
                        .map(([key, value]) => (value === true ? key : `${key}="${value}"`))
                        .join(' ');
                    return `:${node.name}${label ? `[${label}]` : ''}${attributes ? `{${attributes}}` : ''}`;
                };
                const extractDirectiveLabel = (node: any) => {
                    const labelNode = node.children?.[0];
                    if (!labelNode?.data?.directiveLabel) return '';
                    const label = labelNode.children
                        ?.map((child: any) => child.value || '')
                        .join('')
                        .trim();
                    node.children = node.children.slice(1);
                    return label || '';
                };
                visit(tree, node => {
                    if (node.type === 'textDirective' || node.type === 'leafDirective') {
                        node.type = 'text';
                        node.value = stringifyDirective(node);
                        delete node.name;
                        delete node.attributes;
                        delete node.children;
                        delete node.data;
                        return;
                    }

                    if (node.type === 'containerDirective') {
                        const data = node.data || (node.data = {});
                        const attributes = node.attributes || {};
                        const name = node.name;

                        if (name === 'align') {
                            const align =
                                attributes.class || Object.keys(attributes)[0] || 'center';
                            data.hName = 'div';
                            data.hProperties = { className: [`md-align-${align}`] };
                        } else if (name === 'epigraph') {
                            const label = extractDirectiveLabel(node);
                            const author = attributes.author || label || '';
                            data.hName = 'div';
                            data.hProperties = {
                                className: ['md-epigraph'],
                                'data-author': author
                            };
                        } else if (['info', 'warning', 'success', 'error'].includes(name)) {
                            const hasLabel = Boolean(
                                !attributes.title && node.children?.[0]?.data?.directiveLabel
                            );
                            const title = attributes.title || (hasLabel ? '' : name.toUpperCase());
                            const open = attributes.open !== undefined;
                            data.hName = 'div';
                            data.hProperties = {
                                className: hasLabel
                                    ? ['md-block', name, 'has-title-children']
                                    : ['md-block', name],
                                'data-title': title,
                                'data-open': open.toString()
                            };
                        }
                    }
                });
            };
        }

        function remarkCuteTable() {
            const addClass = (node: any, classToAdd: string) => {
                node.data ||= {};
                node.data.hProperties ||= {};
                const className = node.data.hProperties.className || [];
                node.data.hProperties.className = Array.isArray(className)
                    ? [...className, classToAdd]
                    : [className, classToAdd].filter(Boolean);
            };

            return (tree: any) => {
                const children = tree.children || [];
                for (let index = 0; index < children.length; index++) {
                    const node = children[index];
                    const next = children[index + 1];
                    if (
                        node?.type !== 'leafDirective' ||
                        node.name !== 'cute-table' ||
                        node.attributes?.tuack === undefined ||
                        next?.type !== 'table'
                    ) {
                        continue;
                    }

                    addClass(next, 'cute-table');
                    children.splice(index, 1);
                    index--;
                }
            };
        }

        function remarkBV() {
            return (tree: any) => {
                visit(tree, 'image', (node: any) => {
                    if (node.url.startsWith('bilibili:')) {
                        const bilibiliUrl = node.url.substring(9);
                        const [videoID, queryString] = bilibiliUrl.split('?');
                        let bvid = '';
                        let aid = '';

                        if (videoID.startsWith('BV')) {
                            bvid = videoID;
                        } else if (videoID.startsWith('av')) {
                            aid = videoID.substring(2);
                        } else if (/^\d+$/.test(videoID)) {
                            aid = videoID;
                        }

                        const params = new URLSearchParams(queryString || '');
                        const page = params.get('page') || '1';
                        const t = params.get('t') || '0';
                        let iframeURL = 'https://player.bilibili.com/player.html?';
                        if (bvid) {
                            iframeURL += `bvid=${bvid}`;
                        } else if (aid) {
                            iframeURL += `aid=${aid}`;
                        }
                        iframeURL += `&page=${page}`;
                        if (t !== '0') {
                            iframeURL += `&t=${t}`;
                        }

                        iframeURL += '&high_quality=1&autoplay=0';

                        node.type = 'html';
                        node.value = `<div class="bilibili-video-container"><iframe src="${iframeURL}" scrolling="no" border="0" frameborder="no" framespacing="0" allowfullscreen="true" width="100%" height="500"></iframe></div>`;

                        delete node.url;
                        delete node.alt;
                        delete node.title;
                    }
                });
            };
        }

        function rehypeCustomContainers() {
            return (tree: any) => {
                visit(tree, 'element', (node: any) => {
                    if (node.properties && node.properties.className) {
                        const classes = node.properties.className;

                        if (classes.includes('md-epigraph')) {
                            const author = node.properties.dataAuthor || '';
                            delete node.properties.dataAuthor;
                            const body = {
                                type: 'element',
                                tagName: 'div',
                                properties: { className: ['epigraph-body'] },
                                children: node.children
                            };
                            const children = [body];
                            if (author) {
                                children.push({
                                    type: 'element',
                                    tagName: 'span',
                                    properties: { className: ['epigraph-author'] },
                                    children: [{ type: 'text', value: author }]
                                });
                            }
                            node.children = children;
                        }

                        const typeClass = classes.find((className: string) =>
                            ['info', 'warning', 'success', 'error'].includes(className)
                        );
                        if (typeClass && classes.includes('md-block')) {
                            const title = node.properties['dataTitle'] || typeClass.toUpperCase();
                            const useTitleChildren = classes.includes('has-title-children');
                            const open = node.properties['dataOpen'] === 'true';
                            node.properties.className = classes.filter(
                                (className: string) => className !== 'has-title-children'
                            );
                            delete node.properties['dataTitle'];
                            delete node.properties['dataOpen'];

                            const titleChildren = useTitleChildren
                                ? node.children
                                      .splice(0, 1)
                                      .flatMap((child: any) => child.children || [child])
                                : [{ type: 'text', value: title }];

                            const titleNode = {
                                type: 'element',
                                tagName: 'div',
                                properties: { className: ['md-block-title'] },
                                children: [
                                    {
                                        type: 'element',
                                        tagName: 'span',
                                        children: titleChildren
                                    },
                                    {
                                        type: 'element',
                                        tagName: 'i',
                                        properties: {
                                            className: [
                                                'toggle-btn',
                                                'fa',
                                                `fa-caret-${open ? 'down' : 'right'}`
                                            ]
                                        },
                                        children: []
                                    }
                                ]
                            };
                            const bodyNode = {
                                type: 'element',
                                tagName: 'div',
                                properties: {
                                    className: ['md-block-body'],
                                    style: open ? '' : 'display:none'
                                },
                                children: node.children
                            };
                            node.children = [titleNode, bodyNode];
                        }
                    }
                });
            };
        }

        function remarkTableMergeMarkers() {
            const escapedMarkers: Record<string, string> = {
                '\\^': '^',
                '\\<': '<',
                '\\>': '>',
                '\\v': 'v'
            };
            const getCellText = (cell: any, source: string) => {
                if (!cell?.children || cell.children.length !== 1) return null;
                const child = cell.children[0];
                if (child.type !== 'text') return null;
                const start = child.position?.start?.offset;
                const end = child.position?.end?.offset;
                const raw =
                    typeof start === 'number' && typeof end === 'number'
                        ? source.slice(start, end)
                        : child.value;
                return { child, raw, value: child.value };
            };
            const hasNeighbor = (
                rows: any[][],
                rowIndex: number,
                cellIndex: number,
                marker: string
            ) => {
                switch (marker) {
                    case '^':
                        return rowIndex > 0 && Boolean(rows[rowIndex - 1]?.[cellIndex]);
                    case '<':
                        return cellIndex > 0 && Boolean(rows[rowIndex]?.[cellIndex - 1]);
                    case '>':
                        return Boolean(rows[rowIndex]?.[cellIndex + 1]);
                    case 'v':
                        return (
                            rowIndex < rows.length - 1 && Boolean(rows[rowIndex + 1]?.[cellIndex])
                        );
                    default:
                        return false;
                }
            };
            return (tree: any, file: VFile) => {
                const source = String(file.value || '');
                visit(tree, 'table', (table: any) => {
                    const rows: any[][] = (table.children || []).map(
                        (row: any) => row.children || []
                    );

                    rows.forEach((row, rowIndex) => {
                        row.forEach((cell, cellIndex) => {
                            const text = getCellText(cell, source);
                            if (!text) return;

                            if (escapedMarkers[text.raw]) {
                                text.child.value = escapedMarkers[text.raw];
                                return;
                            }

                            if (
                                text.value !== text.raw ||
                                !hasNeighbor(rows, rowIndex, cellIndex, text.raw)
                            ) {
                                return;
                            }

                            cell.data ||= {};
                            cell.data.hProperties ||= {};
                            cell.data.hProperties['data-merge-marker'] = text.raw;
                        });
                    });
                });
            };
        }

        function rehypeApplyTableMerges() {
            const getMarker = (cell: any) =>
                cell.properties?.dataMergeMarker || cell.properties?.['data-merge-marker'];
            const deleteMarker = (cell: any) => {
                if (!cell.properties) return;
                delete cell.properties.dataMergeMarker;
                delete cell.properties['data-merge-marker'];
            };
            const addClass = (cell: any, classToAdd: string) => {
                cell.properties ||= {};
                const className = cell.properties.className || [];
                const classes = Array.isArray(className) ? className : [className].filter(Boolean);
                if (!classes.includes(classToAdd)) classes.push(classToAdd);
                cell.properties.className = classes;
            };
            const getSpan = (cell: any, property: 'rowSpan' | 'colSpan') =>
                Number(
                    cell.properties?.[property] || cell.properties?.[property.toLowerCase()] || 1
                );
            const setSpan = (cell: any, property: 'rowSpan' | 'colSpan', value: number) => {
                cell.properties ||= {};
                cell.properties[property] = value;
            };
            const copyCell = (source: any, target: any) => {
                target.tagName = source.tagName;
                target.properties = { ...(source.properties || {}) };
                target.children = source.children || [];
                deleteMarker(target);
            };

            return (tree: any) => {
                visit(tree, 'element', (table: any) => {
                    if (table.tagName !== 'table') return;

                    const rowNodes: any[] = [];
                    visit(table, 'element', (row: any) => {
                        if (row.tagName === 'tr') rowNodes.push(row);
                    });
                    const rows = rowNodes.map(row =>
                        (row.children || []).filter(
                            (child: any) =>
                                child.type === 'element' &&
                                (child.tagName === 'td' || child.tagName === 'th')
                        )
                    );
                    const owners: any[][] = rows.map(row => row.map((cell: any) => cell));
                    const removed = new WeakSet<object>();

                    const ownerAt = (rowIndex: number, cellIndex: number) => {
                        const owner = owners[rowIndex]?.[cellIndex];
                        return owner && !removed.has(owner) ? owner : null;
                    };
                    const mergeInto = (
                        markerCell: any,
                        target: any,
                        property: 'rowSpan' | 'colSpan'
                    ) => {
                        addClass(target, 'md-table-merged-cell');
                        setSpan(target, property, getSpan(target, property) + 1);
                        removed.add(markerCell);
                    };

                    rows.forEach((row: any[], rowIndex: number) => {
                        row.forEach((cell: any, cellIndex: number) => {
                            if (removed.has(cell)) return;
                            const marker = getMarker(cell);
                            if (!marker) return;

                            if (marker === '^') {
                                const target = ownerAt(rowIndex - 1, cellIndex);
                                if (target) {
                                    mergeInto(cell, target, 'rowSpan');
                                    owners[rowIndex][cellIndex] = target;
                                }
                            } else if (marker === '<') {
                                const target = ownerAt(rowIndex, cellIndex - 1);
                                if (target) {
                                    mergeInto(cell, target, 'colSpan');
                                    owners[rowIndex][cellIndex] = target;
                                }
                            } else if (marker === '>') {
                                const target = ownerAt(rowIndex, cellIndex + 1);
                                if (target) {
                                    copyCell(target, cell);
                                    addClass(cell, 'md-table-merged-cell');
                                    setSpan(cell, 'colSpan', getSpan(cell, 'colSpan') + 1);
                                    removed.add(target);
                                    owners[rowIndex][cellIndex] = cell;
                                    owners[rowIndex][cellIndex + 1] = cell;
                                }
                            } else if (marker === 'v') {
                                const target = ownerAt(rowIndex + 1, cellIndex);
                                if (target) {
                                    copyCell(target, cell);
                                    addClass(cell, 'md-table-merged-cell');
                                    setSpan(cell, 'rowSpan', getSpan(cell, 'rowSpan') + 1);
                                    removed.add(target);
                                    owners[rowIndex][cellIndex] = cell;
                                    owners[rowIndex + 1][cellIndex] = cell;
                                }
                            }
                        });
                    });

                    rows.flat().forEach(deleteMarker);
                    rowNodes.forEach(row => {
                        row.children = (row.children || []).filter(
                            (child: any) => !(child.type === 'element' && removed.has(child))
                        );
                    });
                });
            };
        }

        return unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkMath)
            .use(remarkSmartypants)
            .use(remarkDirective)
            .use(remarkCuteTable)
            .use(remarkCustomContainers)
            .use(remarkTableMergeMarkers)
            .use(remarkBV)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeApplyTableMerges)
            .use(rehypeSanitize, schema)
            .use(rehypeSlug)
            .use(rehypeAutolinkHeadings, {
                behavior: 'prepend',
                content: headingAnchorIcon,
                properties: {
                    className: ['heading-anchor'],
                    ariaHidden: 'true',
                    tabIndex: -1
                }
            })
            .use(rehypeCustomContainers)
            .use(rehypeSafeKatex, { strict: 'ignore' })
            .use(rehypeShiki, {
                themes: { light: 'github-light', dark: 'github-dark' },
                langs: [
                    'javascript',
                    'typescript',
                    'python',
                    'java',
                    'c',
                    'cpp',
                    'go',
                    'rust',
                    'bash',
                    'json',
                    'yaml',
                    'markdown',
                    'vue',
                    'html',
                    'css'
                ],
                defaultColor: false
            })
            .use(rehypeStringify);
    })();

    return processorPromise;
}

export default async function renderMarkdown(src: string) {
    if (!src) return '';

    const processor = await getProcessor();

    try {
        const file = await processor.process(src);
        return replaceUI(String(file));
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Render Error';
        return `<p>渲染失败：${msg}</p>`;
    }
}

export { renderMarkdown };

function replaceUI(s: string) {
    return s
        .replace(/<table(\s[^>]*)?>/g, '<div class="table-container"><table$1>')
        .replace(/<\/table>/g, '</table></div>');
}
