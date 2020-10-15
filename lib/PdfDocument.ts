import { PDFDocumentProxy, PDFPageProxy, TextContent, TextContentItem } from 'pdfjs-dist';
import { PdfTable } from './PdfTable';
import { Options, PdfPage } from './types';
const pdflib = require('pdfjs-dist/es5/build/pdf');

interface _PdfString {
    x: number; y: number; x2: number; y2: number; //w: number; h: number;
    s: string;
}

type _PdfRow = _PdfString[];

interface _PdfColumn {
    x: number; x2: number;
}

interface _PdfPreTable {
    tableNumber: number;
    rows: _PdfRow[];
}

export class PdfDocument {
    private _options: Options;

    public numPages: number;
    public pages: PdfPage[];

    constructor(_options?: Options) {
        _options = Object.assign({ hasTitles: true, threshold: 1.5, maxStrLength: 30, ignoreTexts: [] }, _options);
        if (!Array.isArray(_options.ignoreTexts))
            _options.ignoreTexts = [_options.ignoreTexts!];
        this._options = _options;
        this.numPages = 0;
        this.pages = [];
    }

    async load(source: string | Buffer): Promise<void> {
        let pdfdriver = await p(pdflib.getDocument(source).promise) as PDFDocumentProxy;
        this.numPages = pdfdriver.numPages;
        this.pages = [];
        try {
            for (let i = 1; i <= this.numPages; i++) {
                const page = await p(pdfdriver.getPage(i)) as PDFPageProxy;
                const content = (await p(page.getTextContent()) as TextContent)
                    .items.map(setTextBounds);
                this.pages.push({
                    pageNumber: i,
                    tables: this._extractTables(content)
                });
            }
        } finally {
            pdfdriver.destroy();
        }
        return;

        function p(promise: any): Promise<any> {
            return new Promise((resolve, reject) => promise.then(resolve, reject));
        }

        function setTextBounds(i: TextContentItem) {
            const x = i.transform[4], y = i.transform[5], s = i.str,
                x2 = x + i.width,
                y2 = y - i.height;
            return { x, x2, y, y2, s };
        }
    }

    private _extractTables(text: _PdfRow): PdfTable[] {
        const { max, min } = Math, me = this;
        text.sort((a, b) => b.y - a.y || a.x - b.x);
        const rows = this._extractRows(text);
        const tables = this._splitTables(rows);
        return tables.map(normalizeColumns);

        function normalizeColumns(table: _PdfPreTable): PdfTable {
            const rows = table.rows;
            const cols = infereColumnBounds();
            const data = rows.map(adjustToBounds);
            mergeColumns(cols, data);

            return new PdfTable({
                tableNumber: table.tableNumber,
                numrows: rows.length,
                numcols: cols.length,
                data
            });

            function adjustToBounds(row: _PdfRow): string[] {
                const data: string[] = [];
                row.forEach(str => {
                    const colIndex = cols.findIndex(c => intersect(str, c));
                    if (data[colIndex]) data[colIndex] += ' ' + str.s;
                    else data[colIndex] = str.s;
                });
                return data;
            }

            function mergeColumns(cols: _PdfColumn[], data: string[][]) {
                let t = 0;
                for (; t < data.length && data[t].filter(i => i).length <= 1; t++);
                const title = data[t];
                for (let i = 0; i < cols.length - 1; i++) {
                    if (title[i] && !title[i + 1] && countA(i) == 0 && countA(i + 1) > 0) {
                        cols.splice(i + 1, 1);
                        for (let j = t + 1; j < data.length; j++)
                            data[j][i] = data[j][i + 1];
                        data.forEach(r => r.splice(i + 1, 1));
                    }
                }
                function countA(col: number): number {
                    let count = 0;
                    for (let i = t + 1; i < data.length; i++)
                        if (data[i][col]) count++;
                    return count;
                }
            }

            function infereColumnBounds(): _PdfColumn[] {
                const { minX, maxX } = getMinMaxX(),
                    result: _PdfColumn[] = [];
                for (let incr = (maxX - minX) / 200, x = minX; x < maxX; x += incr) {
                    rows.forEach(row => row.forEach(str => {
                        if (str.s.length > me._options.maxStrLength!
                            || (me._options.ignoreTexts as string[]).some(ig => str.s.includes(ig)))
                            return;

                        if (str.x <= x && x <= str.x2) {
                            let col = result.find(c => intersect(str, c));
                            if (col) {
                                col.x = min(col.x, str.x);
                                col.x2 = max(col.x2, str.x2);
                            } else
                                result.push({ x: str.x, x2: str.x2 });
                        }
                    }));
                }
                return result.sort((a, b) => a.x - b.x);
            }
            function getMinMaxX() {
                let minX = 1e3, maxX = -1;
                rows.forEach(row => row.forEach(str => {
                    minX = min(minX, str.x);
                    maxX = max(maxX, str.x2);
                }));
                return { minX, maxX };
            }
        }
    }

    private _splitTables(rows: _PdfRow[]): _PdfPreTable[] {
        const tables: _PdfPreTable[] = [];
        let tableNumber = 1;
        let tableRow: _PdfRow[] = [];
        rows.forEach((row, i) => {
            const prev: _PdfString = i > 0 && rows[i - 1][0] as any;
            const curr = row[0];
            if (prev && curr.y < 2 * prev.y2 - prev.y) addTable();
            tableRow.push(row);
        });
        addTable();

        return tables;

        function addTable() {
            tables.push({
                tableNumber: tableNumber++,
                rows: tableRow
            });
            tableRow = [];
        }
    }

    private _extractRows(row: _PdfRow): _PdfRow[] {
        const rows: _PdfRow[] = [];
        while (row.length)
            rows.push(this._extractNextRow(row));
        return rows;
    }

    private _extractNextRow(text: _PdfRow): _PdfRow {
        const row: _PdfRow = [];
        const skipped: _PdfRow = [];
        const r = Object.assign({}, text[0]);
        let t: _PdfString;

        while (t = text.shift()!) {
            const yOk = Math.abs(t.y - r.y) <= this._options.threshold!;
            if (!yOk) {
                text.unshift(t);
                break;
            }
            const xOk = t.y == r.y || !row.some(s => s.x <= t.x2 && s.x2 >= t.x);
            if (xOk) row.push(t);
            else skipped.push(t);
        }
        text.unshift(...skipped.reverse());
        return row.sort((a, b) => a.x - b.x);
    }

}

function intersect(a: _PdfColumn, b: _PdfColumn): boolean {
    return a.x <= b.x2 && a.x2 >= b.x;
}