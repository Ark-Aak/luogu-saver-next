import assert from 'node:assert/strict';
import { test } from 'node:test';

import { renderMarkdown } from '../dist/index.js';

test('recovers from an unclosed display math fence', async () => {
    const html = await renderMarkdown(
        ['normal text', '', '$$', 'inline math: $$ a = b $$', '', 'following text'].join('\n')
    );

    assert.match(html, /<p>\$\$\s+inline math:/);
    assert.match(html, /class="katex"/);
    assert.match(html, /<p>following text<\/p>/);
    assert.doesNotMatch(html, /katex-error/);
});

test('preserves valid display math fences', async () => {
    const html = await renderMarkdown(['$$', 'a = b', '$$'].join('\r\n'));

    assert.match(html, /class="katex-display"/);
    assert.doesNotMatch(html, /katex-error/);
});

test('parses code and links after an unclosed math fence', async () => {
    const html = await renderMarkdown(
        [
            '$$',
            'inline math: $$ x + y $$',
            '',
            '```text',
            '$$',
            '```',
            '',
            '[link](https://example.com)'
        ].join('\n')
    );

    assert.match(html, /class="katex"/);
    assert.match(html, /<pre/);
    assert.match(html, /\$\$/);
    assert.match(html, /<a href="https:\/\/example.com">link<\/a>/);
    assert.doesNotMatch(html, /katex-error/);
});

test('does not treat dollar signs in code blocks as math fences', async () => {
    const html = await renderMarkdown(['```text', '$$', 'not math', '```'].join('\n'));

    assert.match(html, /\$\$/);
    assert.doesNotMatch(html, /class="katex(?:-display)?"/);
});

test('does not use indented code as a closing math fence', async () => {
    const html = await renderMarkdown(
        ['$$', 'text', '', '    $$', '', 'following text'].join('\n')
    );

    assert.match(html, /<pre><code>\$\$/);
    assert.match(html, /<p>following text<\/p>/);
    assert.doesNotMatch(html, /katex-error/);
});

test('recovers multiple unmatched fence widths in one document', async () => {
    const fences = Array.from({ length: 40 }, (_, index) => '$'.repeat(42 - index));
    const html = await renderMarkdown([...fences, '', 'following text'].join('\n'));

    assert.match(html, /<p>following text<\/p>/);
    assert.doesNotMatch(html, /katex-error/);
});

test('recovers an unclosed math fence inside a blockquote', async () => {
    const html = await renderMarkdown(
        ['> $$', '> inline math: $$ a = b $$', '>', '> following text'].join('\n')
    );

    assert.match(html, /<blockquote>/);
    assert.match(html, /class="katex"/);
    assert.match(html, /following text/);
    assert.doesNotMatch(html, /katex-error/);
});

test('preserves valid display math inside a list item', async () => {
    const html = await renderMarkdown(['- $$', '  a = b', '  $$'].join('\n'));

    assert.match(html, /<li>/);
    assert.match(html, /class="katex-display"/);
    assert.doesNotMatch(html, /katex-error/);
});

test('preserves table merge processing with the normalized source file', async () => {
    const html = await renderMarkdown(
        ['| value | other |', '| --- | --- |', '| top | right |', '| ^ | bottom |'].join('\n')
    );

    assert.match(html, /class="md-table-merged-cell"/);
    assert.match(html, /rowspan="2"/);
    assert.doesNotMatch(html, /<td>\^<\/td>/);
});
