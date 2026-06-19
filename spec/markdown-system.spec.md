# Markdown System Specification

## 1. Scope

This specification defines Markdown rendering behavior provided by `@luogu-saver-next/markdown-renderer` and consumed by the backend through `packages/backend/src/lib/markdown.ts`.

## 2. Directive Containers

Supported block container directive names are:

- `info`
- `warning`
- `success`
- `error`

For a supported directive `:::name`, the renderer SHALL output one HTML container with:

1. Class `md-block`.
2. Class equal to `name`.
3. One title child with class `md-block-title`.
4. One body child with class `md-block-body`.

The renderer SHALL accept three or more leading colons for supported container directives.

For a supported nested directive block, a closing line containing the same number of colons as the opening line SHALL close that block and SHALL NOT be emitted as text.

For input:

```md
::::info[outer]
:::info[inner]
body
:::
::::
```

Expected postconditions:

1. The rendered HTML contains two nested `md-block info` containers.
2. The rendered HTML does not contain a paragraph whose text is `::::`.

## 3. Directive Title Resolution

For a supported directive `:::name`, the rendered title text SHALL be resolved by this precedence order:

1. If directive attribute `title` exists, use `title`.
2. Else if directive label `[label]` exists, use `label`.
3. Else use `name.toUpperCase()`.

The directive label node SHALL NOT be rendered inside `md-block-body`.

Example input:

```md
- aaa
  :::success[sb]
  a
  :::
- bbb
```

Expected postconditions:

1. The `success` block title text is `sb`.
2. The `success` block body contains text `a`.
3. The `success` block body does not contain text `sb`.

## 4. Open State

If directive attribute `open` exists, `md-block-body` SHALL be visible initially.

If directive attribute `open` does not exist, `md-block-body` SHALL have style `display:none`.

## 5. Heading Anchors

For each rendered heading element `h1`, `h2`, `h3`, `h4`, `h5`, or `h6`:

1. If the heading does not have an `id`, the renderer SHALL assign a deterministic slug `id` derived from heading text.
2. The renderer SHALL insert one `a` element as the first child of the heading.
3. The inserted `a` element SHALL have class `heading-anchor`.
4. The inserted `a` element SHALL have `href` equal to `#` followed by the heading `id`.
5. The inserted `a` element SHALL contain one Lucide Pin SVG.
6. The heading text SHALL remain outside the inserted `a` element.

## 6. Math Rendering Warnings

The Markdown renderer SHALL pass `strict="ignore"` to KaTeX.

If math content contains LaTeX-incompatible Unicode text, rendering SHALL NOT write a KaTeX strict-mode warning to stdout or stderr.

If a supported directive title contains Markdown math syntax, the title SHALL render that math using the same KaTeX pipeline as normal Markdown content.

For input `::::success[$$\\displaystyle\\sum_{i = 1}^n i$$]`, the rendered title SHALL contain KaTeX HTML and SHALL NOT render the raw TeX text as plain text.

## 6.1 GFM Task Lists

For GFM task list input `- [ ] item` or `- [x] item`, the renderer SHALL preserve checkbox inputs in the output HTML.

The checked state SHALL match the Markdown marker.

The checkbox inputs SHALL be disabled.

## 7. Unsupported Directives

Only block container directives listed in Section 2 are supported.

If the parser produces an inline text directive or a leaf directive, the renderer SHALL convert it back to literal Markdown text.

For input text `2023/12/15 9:29:37 [通过](https://www.luogu.com.cn/record/139634319)。`, the rendered HTML SHALL keep `9:29:37`, the link, and the trailing punctuation inside one paragraph element.

## 8. Table Merge Markers

For each Markdown table cell, the renderer SHALL inspect the cell text before HTML serialization.

Markdown table alignment markers (`:---`, `:---:`, `---:`) SHALL be preserved in the rendered HTML for normal tables and `cute-table` tables.

If a table cell contains exactly one of these marker strings and the target neighbor exists, the renderer SHALL treat the cell as a structural merge marker:

| Marker | Target neighbor | Structural effect            |
| ------ | --------------- | ---------------------------- |
| `^`    | cell above      | extend target cell downward  |
| `<`    | cell left       | extend target cell rightward |
| `>`    | cell right      | extend target cell leftward  |
| `v`    | cell below      | extend target cell upward    |

For a matched merge marker, the rendered table cell SHALL:

1. Be removed from the rendered HTML table.
2. Increase the target cell `rowspan` or `colspan` by one.
3. Add class `md-table-merged-cell` to the target cell.
4. Not render the marker text.

Any cell with class `md-table-merged-cell` SHALL render its content vertically centered over the merged cell area.

The horizontal alignment of a merged cell SHALL follow the original Markdown alignment of the target cell and SHALL be calculated by the browser over the final merged cell width.

If the required target neighbor does not exist, the renderer SHALL keep the original cell content unchanged.

If a table cell contains exactly one escaped marker string among `\^`, `\<`, `\>`, or `\v`, the renderer SHALL output the unescaped literal character and SHALL NOT apply merge classes.

If a table cell contains any other content, including whitespace around a marker, multiple characters, inline formatting, or nested elements, the renderer SHALL NOT apply merge classes.

## 9. Cute Table Directive

If a leaf directive `::cute-table{tuack}` appears immediately before a Markdown table, the renderer SHALL:

1. Remove the directive from rendered output.
2. Add class `cute-table` to the immediately following table element.
3. Not apply `cute-table` to any later table.

The directive SHALL match only leaf directive name `cute-table` with attribute `tuack` present.

Table merge markers from Section 8 SHALL still apply inside `cute-table` tables.

If the directive is not immediately followed by a table, the renderer SHALL keep its literal text behavior defined by Section 7.

For a `cute-table` table, frontend styles SHALL satisfy these postconditions:

1. The table element is horizontally centered inside its table container.
2. Cell text alignment SHALL follow the original Markdown table alignment rules.
3. The `cute-table` style SHALL NOT force all cell text to center alignment.
4. The leftmost cells have no visible left border.
5. The rightmost cells have no visible right border.
6. The top border and bottom border are the thickest table lines.
7. The second horizontal line from the top is thicker than ordinary inner lines and thinner than the top border.
8. Other visible table lines are solid black.

## 10. Epigraph Directive

For a supported directive `:::epigraph[author]`, the renderer SHALL output one block with class `md-epigraph`.

The block body SHALL be followed by one horizontal line.

Below the line, the renderer SHALL display `——author` aligned to the right.

The block width SHALL NOT exceed one quarter of its parent container width.

The block SHALL be aligned to the right side of its parent container.
