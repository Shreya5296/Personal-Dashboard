/**
 * MockSpreadsheet: In-memory simulation of Google Apps Script SpreadsheetApp.
 */

export class MockSheet {
  name: string;
  rows: any[][];

  constructor(name: string, initialRows: any[][] = []) {
    this.name = name;
    this.rows = initialRows.map((r) => [...r]);
  }

  getName(): string {
    return this.name;
  }

  getHeaders(): string[] {
    return this.rows.length > 0 ? [...this.rows[0]] : [];
  }

  getLastRowNum(): number {
    return this.rows.length;
  }

  getLastRow(): number {
    return this.rows.length;
  }

  getLastColumn(): number {
    return this.rows.length > 0 ? this.rows[0].length : 0;
  }

  getDataRange() {
    return {
      getValues: () => this.rows.map((r) => [...r]),
    };
  }

  getRange(row: number, col: number, numRows: number, numCols: number) {
    return {
      getValues: () => {
        const result: any[][] = [];
        for (let r = 0; r < numRows; r++) {
          const rowIdx = row - 1 + r;
          const rowData = this.rows[rowIdx] || [];
          const rowSlice: any[] = [];
          for (let c = 0; c < numCols; c++) {
            const colIdx = col - 1 + c;
            rowSlice.push(rowData[colIdx] !== undefined ? rowData[colIdx] : '');
          }
          result.push(rowSlice);
        }
        return result;
      },
      setValues: (values: any[][]) => {
        for (let r = 0; r < numRows; r++) {
          const rowIdx = row - 1 + r;
          while (this.rows.length <= rowIdx) {
            this.rows.push([]);
          }
          for (let c = 0; c < numCols; c++) {
            const colIdx = col - 1 + c;
            this.rows[rowIdx][colIdx] = values[r][c];
          }
        }
      },
    };
  }

  appendRow(row: any[]): void {
    this.rows.push([...row]);
  }

  getData(): any[][] {
    return this.rows.map((r) => [...r]);
  }

  setRow(index: number, row: any[]): void {
    if (index >= 0 && index < this.rows.length) {
      this.rows[index] = [...row];
    }
  }

  deleteRow(index: number): void {
    if (index >= 0 && index < this.rows.length) {
      this.rows.splice(index, 1);
    }
  }

  getMaxColumns(): number {
    let max = 0;
    for (const r of this.rows) {
      if (r.length > max) max = r.length;
    }
    return max;
  }

  deleteColumns(startCol: number, numCols: number): void {
    const startIdx = startCol - 1;
    for (const r of this.rows) {
      if (r.length > startIdx) {
        r.splice(startIdx, numCols);
      }
    }
  }

  insertColumnsAfter(afterCol: number, numCols: number): void {
    for (const r of this.rows) {
      while (r.length < afterCol) {
        r.push('');
      }
      for (let i = 0; i < numCols; i++) {
        r.splice(afterCol, 0, '');
      }
    }
  }
}

export class MockSpreadsheet {
  sheets: Map<string, MockSheet>;

  constructor() {
    this.sheets = new Map();
  }

  getId(): string {
    return '1cVQknq_Ix-T6igp7c-DwwuYHvgn60fVGbwTGZfGSii8';
  }

  deleteSheet(sheet: MockSheet): void {
    this.sheets.delete(sheet.name);
  }

  getSheetByName(name: string): MockSheet | null {
    return this.sheets.get(name) || null;
  }

  insertSheet(name: string): MockSheet {
    if (this.sheets.has(name)) {
      throw new Error(`Sheet already exists: ${name}`);
    }
    const sheet = new MockSheet(name);
    this.sheets.set(name, sheet);
    return sheet;
  }

  getSheets(): MockSheet[] {
    return Array.from(this.sheets.values());
  }
}
