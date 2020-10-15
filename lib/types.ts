import { PdfTable } from './PdfTable';

export interface IPdfTable {
    tableNumber: number;
    numrows: number;
    numcols: number;
    data: string[][];
}

export interface PdfPage {
    pageNumber: number;
    tables: PdfTable[];
}

export interface PdfDocument {
    numPages: number;
    pages: PdfPage[];
}

export interface Options {
    threshold?: number;
    hasTitles?: boolean;
    ignoreTexts?: string | string[];
    maxStrLength?: number;
}

