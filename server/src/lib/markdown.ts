import markdownit from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItContainer from "markdown-it-container";
import crypto from "crypto";

let mdPromise: Promise<markdownit> | null = null;

async function getMdInstance() {
    if (mdPromise) return mdPromise;

    mdPromise = (async () => {
        // @ts-ignore
        const { createHighlighter } = await import('shiki');
        // @ts-ignore
        const { fromHighlighter } = await import('@shikijs/markdown-it/core');

        const highlighter = await createHighlighter({
            themes: ['github-light'],
            langs: [
                'cpp', 'java', 'python',
                'javascript', 'typescript',
                'sql', 'bash', 'json', 'html',
                'css', 'go', 'rust', 'ruby', 'php',
                'csharp', 'kotlin', 'swift', 'haskell',
                'markdown'
            ]
        });

        const md = markdownit({
            html: true,
            linkify: true,
            typographer: true
        });

        md.use(fromHighlighter(highlighter, {
            theme: 'github-light'
        }));

        const renderPlainFence = (tokens: any[], idx: number) => {
            const token = tokens[idx];
            const lang = (token.info || "").trim().split(/\s+/)[0].toLowerCase();
            const langAddon = lang ? ` language-${md.utils.escapeHtml(lang)}` : "";
            return `<pre class="md-plain${langAddon}"><code class="md-plain${langAddon}">${md.utils.escapeHtml(token.content)}</code></pre>`;
        };

        const originalFence = md.renderer.rules.fence;
        md.renderer.rules.fence = function (tokens: any[], idx: number, options: any, env: any, slf: any) {
            const lang = (tokens[idx].info || "").trim().split(/\s+/)[0].toLowerCase();
            try {
                return originalFence
                    ? originalFence(tokens, idx, options, env, slf)
                    : renderPlainFence(tokens, idx);
            } catch {
                return renderPlainFence(tokens, idx);
            }
        };

        md.use(markdownItAttrs);

        md.use(markdownItContainer, "align", {
            render: (tokens: any[], idx: number) => {
                if (tokens[idx].nesting === 1) {
                    const m = tokens[idx].attrs ? (tokens[idx].attrs[0]?.length ? tokens[idx].attrs[0][0] : "") : "";
                    const cls = m ? `md-align-${m}` : "md-align-center";
                    return `<div class="${cls}">`;
                } else return "</div>";
            },
        });

        md.use(markdownItContainer, "epigraph", {
            render: (tokens: any[], idx: number) => {
                if (tokens[idx].nesting === 1) {
                    return `<div class="md-epigraph"><div class="epigraph-body">`;
                } else {
                    const m = tokens[idx].info.match(/\[(.*)\]/);
                    const author = m ? m[1] : "";
                    const authorHtml = author
                        ? `<span class="epigraph-author">${md.utils.escapeHtml(author)}</span>`
                        : "";
                    return `</div>${authorHtml}</div>`;
                }
            },
        });

        ["info", "warning", "success", "error"].forEach((name) => {
            md.use(markdownItContainer, name, {
                render: (tokens: any[], idx: number) => {
                    const info = tokens[idx].info || "";
                    if (tokens[idx].nesting === 1) {
                        const titleMatch = info.match(/\[(.*)\]$/);
                        const title = titleMatch ? md.render(titleMatch[1]) : name.toUpperCase();
                        const open = (tokens[idx].attrs ? (tokens[idx].attrs[0]?.length ? tokens[idx].attrs[0][0] : "") : "") === "open";
                        return `<div class="md-block ${name}"><div class="md-block-title"><span>${title}</span><i class="toggle-btn fa fa-caret-${open ? "down" : "right"}"></i></div><div class="md-block-body"${open ? "" : ' style="display:none"'}>`;
                    } else {
                        return `</div></div>`;
                    }
                },
            });
        });

        md.use(markdownItContainer, "cute-table", {
            render: (_tokens: any[], _idx: number) => {
                return "";
            }
        });

        return md;
    })();

    return mdPromise;
}

export default async function renderMarkdown(src: string) {
    if (!src) return "";

    const md = await getMdInstance();

    const pattern = /^(:{2,})([\w|-]+)(\s*\[.*?\])?(\s*\{.*?\})?$/;

    function preprocessLine(line: string) {
        const match = line.match(pattern);
        if (match) {
            const colons = match[1];
            const word = match[2];
            let bracket = match[3] || "";
            let brace = match[4] || "";
            if (bracket) bracket = " " + bracket.trim();
            if (brace) brace = " " + brace.trim();
            return `${colons} ${word}${bracket}${brace}`.trim();
        }
        return line;
    }

    const preprocessed = src.split(/\r?\n/).map(preprocessLine).join("\n");

    const uid =
        Date.now().toString(36) +
        crypto.randomBytes(4).toString("hex").slice(0, 4);

    const codePlaceholder = (i: number) => `CODE?PLACEHOLDER${uid}?${i}?`;
    const mathDisplayPlaceholder = (i: number) => `MATH?DISPLAY${uid}?${i}?`;
    const mathInlinePlaceholder = (i: number) => `MATH?INLINE${uid}?${i}?`;

    const codeBlocks: string[] = [];
    const codeHtmlBlocks: string[] = [];
    const mathBlocks: string[] = [];

    const codeRegex = /((?:^|\n)(`{3,}|~{3,})[^\n]*\n[\s\S]*?\n\2(?=\n|$))|(`+)([\s\S]*?)\3/g;
    const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$/g;

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
        resultHtml = md.render(processed);
    } catch (err: unknown) {
        const msg = err instanceof Error ? err.message : 'Render Error';
        return `<p>渲染失败：${md.utils ? md.utils.escapeHtml(msg) : 'Render Error'}</p>`;
    }

    function escapeHtmlInMath(str: string) {
        if (!str) return "";
        return String(str)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    for (let i = 0; i < mathBlocks.length; i++) {
        const display = mathDisplayPlaceholder(i);
        const inline = mathInlinePlaceholder(i);
        resultHtml = resultHtml.split(display).join(`$$${escapeHtmlInMath(mathBlocks[i])}$$`);
        resultHtml = resultHtml.split(inline).join(`$${escapeHtmlInMath(mathBlocks[i])}$`);
    }

    function replaceUI(s: string) {
        return s.split('<table>')
            .join('<div class="table-container"><table>')
            .split('</table>')
            .join('</table></div>');
    }

    resultHtml = replaceUI(resultHtml);

    return resultHtml;
}