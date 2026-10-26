import React from 'react';
import styles from './tables.module.css';

export interface Column<T> {
  key: string;
  header: string;
  width?: string;
  render?: (row: T) => React.ReactNode;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  fixedLayout?: boolean;
  minWidth?: string | number;
  rowStyle?: (row: T) => React.CSSProperties | undefined;
  rowClassName?: (row: T) => string | undefined;
}

export function DataTable<T>({ columns, data, keyExtractor, fixedLayout, minWidth, rowStyle, rowClassName }: DataTableProps<T>) {
  return (
    <div className={styles.tableWrapper}>
      <table
        className={`${styles.table} ${fixedLayout ? styles.tableFixed : ''}`}
        style={minWidth ? { minWidth: typeof minWidth === 'number' ? `${minWidth}px` : minWidth } : undefined}
      >
        <colgroup>
          {columns.map((col) => (
            <col key={col.key} style={col.width ? { width: col.width } : undefined} />
          ))}
        </colgroup>
        <thead>
          <tr>
            {columns.map((col) => (
              <th key={col.key} style={col.width ? { width: col.width } : undefined}>
                {col.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row) => (
            <tr
              key={keyExtractor(row)}
              style={rowStyle ? rowStyle(row) : undefined}
              className={rowClassName ? rowClassName(row) : undefined}
            >
              {columns.map((col) => (
                <td key={col.key} style={col.width ? { width: col.width } : undefined}>
                  {col.render ? col.render(row) : (row as Record<string, unknown>)[col.key] as React.ReactNode}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
