import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkRehype from 'remark-rehype';
import rehypeStringify from 'rehype-stringify';
import remarkGfm from 'remark-gfm';
import remarkDirective from 'remark-directive';
import rehypeRaw from 'rehype-raw';
import remarkSmartypants from 'remark-smartypants';
import { visit } from 'unist-util-visit';
import crypto from 'crypto';
import { logger } from '@/lib/logger';

let processorPromise: Promise<any> | null = null;

async function getProcessor() {
    if (processorPromise) return processorPromise;

    processorPromise = (async () => {
        const { default: rehypeShiki } = await import('@shikijs/rehype');

        function remarkCustomContainers() {
            return (tree: any) => {
                visit(tree, node => {
                    if (node.type === 'containerDirective') {
                        const data = node.data || (node.data = {});
                        const attributes = node.attributes || {};
                        const name = node.name;

                        if (name === 'align') {
                            const align = attributes.class || Object.keys(attributes)[0] || 'center';
                            data.hName = 'div';
                            data.hProperties = { className: [`md-align-${align}`] };
                        } else if (name === 'epigraph') {
                            const author = attributes.author || '';
                            data.hName = 'div';
                            data.hProperties = { className: ['md-epigraph'], 'data-author': author };
                        } else if (['info', 'warning', 'success', 'error'].includes(name)) {
                            logger.debug({ attributes }, `Processing custom container: ${name}`);
                            const title = attributes.title || name.toUpperCase();
                            const open = attributes.open !== undefined;
                            data.hName = 'div';
                            data.hProperties = {
                                className: ['md-block', name],
                                'data-title': title,
                                'data-open': open.toString()
                            };
                        }
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
                            const author = node.properties['data-author'] || '';
                            delete node.properties['data-author'];

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

                        const typeClass = classes.find((c: string) =>
                            ['info', 'warning', 'success', 'error'].includes(c)
                        );
                        if (typeClass && classes.includes('md-block')) {
                            const title = node.properties['dataTitle'] || typeClass.toUpperCase();
                            const open = node.properties['dataOpen'] === 'true';
                            delete node.properties['dataTitle'];
                            delete node.properties['dataOpen'];

                            const titleNode = {
                                type: 'element',
                                tagName: 'div',
                                properties: { className: ['md-block-title'] },
                                children: [
                                    { type: 'element', tagName: 'span', children: [{ type: 'text', value: title }] },
                                    {
                                        type: 'element',
                                        tagName: 'i',
                                        properties: {
                                            className: ['toggle-btn', 'fa', `fa-caret-${open ? 'down' : 'right'}`]
                                        },
                                        children: []
                                    }
                                ]
                            };

                            const bodyNode = {
                                type: 'element',
                                tagName: 'div',
                                properties: { className: ['md-block-body'], style: open ? '' : 'display:none' },
                                children: node.children
                            };

                            node.children = [titleNode, bodyNode];
                        }
                    }
                });
            };
        }

        return unified()
            .use(remarkParse)
            .use(remarkGfm)
            .use(remarkSmartypants)
            .use(remarkDirective)
            .use(remarkCustomContainers)
            .use(remarkRehype, { allowDangerousHtml: true })
            .use(rehypeRaw)
            .use(rehypeCustomContainers)
            .use(rehypeShiki, {
                themes: { light: 'github-light', dark: 'github-light' },
                defaultColor: false
            })
            .use(rehypeStringify);
    })();

    return processorPromise;
}

export default async function renderMarkdown(src: string) {
    if (!src) return '';

    const processor = await getProcessor();

    const pattern = /^(:{2,})\s*([\w|-]+)(\s*\[.*?])?(\s*\{.*?})?\s*$/;

    function preprocessLine(line: string) {
        const match = line.match(pattern);
        if (match) {
            const word = match[2];
            let bracket = match[3] || '';
            let brace = match[4] || '';

            let attributes = '';

            if (bracket) {
                const content = bracket.trim().slice(1, -1);
                if (['info', 'warning', 'success', 'error'].includes(word)) {
                    attributes += `title="${content}" `;
                } else if (word === 'epigraph') {
                    attributes += `author="${content}" `;
                }
            }

            if (brace) {
                attributes += brace.trim().slice(1, -1);
            }

            logger.debug({ line, attributes }, `Preprocessing custom syntax: ${word}`);

            return `:::${word}{${attributes.trim()}}`;
        }
        return line;
    }

    const preprocessed = src.split(/\r?\n/).map(preprocessLine).join('\n');

    const uid = Date.now().toString(36) + crypto.randomBytes(4).toString('hex').slice(0, 4);

    const codePlaceholder = (i: number) => `CODE?PLACEHOLDER${uid}?${i}?`;
    const mathDisplayPlaceholder = (i: number) => `MATH?DISPLAY${uid}?${i}?`;
    const mathInlinePlaceholder = (i: number) => `MATH?INLINE${uid}?${i}?`;

    const codeBlocks: string[] = [];
    const codeHtmlBlocks: string[] = [];
    const mathBlocks: string[] = [];

    const codeRegex = /((?:^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$))|(`+)([\s\S]*?)\3/g;
    const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^$]+?)\$/g;

    let processed = preprocessed.replace(codeRegex, function (match: string) {
        const idx = codeBlocks.push(match) - 1;
        codeHtmlBlocks[idx] = match;
        return codePlaceholder(idx);
    });

    processed = processed.replace(mathRegex, function (match: string, block: string, inline: string) {
        if (block !== undefined) {
            const idx = mathBlocks.push(block) - 1;
            return mathDisplayPlaceholder(idx);
        } else {
            const idx = mathBlocks.push(inline) - 1;
            return mathInlinePlaceholder(idx);
        }
    });

    for (let i = 0; i < codeHtmlBlocks.length; i++) {
        const ph = codePlaceholder(i);
        processed = processed.split(ph).join(codeHtmlBlocks[i] || '');
    }

    let resultHtml;
    try {
        const file = await processor.process(processed);
        resultHtml = String(file);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Render Error';
        return `<p>渲染失败：${msg}</p>`;
    }

    function escapeHtmlInMath(str: string) {
        if (!str) return '';
        return String(str).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    }

    for (let i = 0; i < mathBlocks.length; i++) {
        const display = mathDisplayPlaceholder(i);
        const inline = mathInlinePlaceholder(i);
        resultHtml = resultHtml.split(display).join(`$$${escapeHtmlInMath(mathBlocks[i])}$$`);
        resultHtml = resultHtml.split(inline).join(`$${escapeHtmlInMath(mathBlocks[i])}$`);
    }

    function replaceUI(s: string) {
        return s.split('<table>').join('<div class="table-container"><table>').split('</table>').join('</table></div>');
    }

    resultHtml = replaceUI(resultHtml);

    return resultHtml;
}
