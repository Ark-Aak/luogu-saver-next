import markdownit from "markdown-it";
import markdownItAttrs from "markdown-it-attrs";
import markdownItContainer from "markdown-it-container";
import { createHighlighter } from 'shiki';
import { fromHighlighter } from '@shikijs/markdown-it/core';

let mdPromise = null;

async function getMdInstance() {
    if (mdPromise) return mdPromise;

    mdPromise = (async () => {
        const highlighter = await createHighlighter({
            themes: ['github-light'],
            langs: ['cpp', 'java', 'python', 'javascript', 'typescript', 'sql', 'bash', 'json', 'html', 'css', 'go', 'rust']
        });

        const md = markdownit({
            html: true,
            linkify: true,
            typographer: true
        });

        md.use(fromHighlighter(highlighter, {
            theme: 'github-light'
        }));

        md.use(markdownItAttrs);

        md.use(markdownItContainer, "align", {
            render: (tokens, idx) => {
                if (tokens[idx].nesting === 1) {
                    const m = tokens[idx].attrs ? (tokens[idx].attrs[0]?.length ? tokens[idx].attrs[0][0] : "") : "";
                    const cls = m ? `md-align-${m}` : "md-align-center";
                    return `<div class="${cls}">`;
                } else return "</div>";
            },
        });

        md.use(markdownItContainer, "epigraph", {
            render: (tokens, idx) => {
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
                render: (tokens, idx) => {
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
            render: (tokens, idx) => {
                return "";
            }
        });

        return md;
    })();

    return mdPromise;
}

export default async function renderMarkdown(src) {
    if (!src) return "";

    const md = await getMdInstance();

    const pattern = /^(:{2,})([\w|-]+)(\s*\[.*?\])?(\s*\{.*?\})?$/;
    function preprocessLine(line) {
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

    const uid = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const mathDisplayPlaceholder = (i) => `MATH?DISPLAY${uid}?${i}?`;
    const mathInlinePlaceholder = (i) => `MATH?INLINE${uid}?${i}?`;

    const mathBlocks = [];

    const mathRegex = /\$\$([\s\S]*?)\$\$|\$([^\$]+?)\$/g;

    let processed = preprocessed.replace(mathRegex, function (match, block, inline) {
        if (block !== undefined) {
            const idx = mathBlocks.push(block) - 1;
            return mathDisplayPlaceholder(idx);
        } else {
            const idx = mathBlocks.push(inline) - 1;
            return mathInlinePlaceholder(idx);
        }
    });

    let resultHtml;
    try {
        resultHtml = md.render(processed);
    } catch (err) {
        return `<p>渲染失败：${md.utils ? md.utils.escapeHtml(err.message) : 'Render Error'}</p>`;
    }

    function escapeHtmlInMath(str) {
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

    function replaceUI(s) {
        return s.split('<table>')
            .join('<div class="table-container"><table>')
            .split('</table>')
            .join('</table></div>');
    }

    resultHtml = replaceUI(resultHtml);

    return resultHtml;
}