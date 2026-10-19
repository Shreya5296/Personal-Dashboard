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
}

export class MockSpreadsheet {
  sheets: Map<string, MockSheet>;

  constructor() {
    this.sheets = new Map();
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
