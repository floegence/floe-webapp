export interface TableSort {
  column: string;
  direction: 'asc' | 'desc';
}
export interface TableModelOptions<T> {
  rows: readonly T[];
  filter?: (row: T) => boolean;
  compare?: (left: T, right: T) => number;
  page?: number;
  pageSize?: number;
}
/** Pure local projection. Remote pagination and authorization remain host owned. */
export function createTableModel<T>(options: TableModelOptions<T>) {
  const filtered = options.filter ? options.rows.filter(options.filter) : [...options.rows];
  const sorted = options.compare ? filtered.sort(options.compare) : filtered;
  const pageSize = options.pageSize ?? Math.max(1, sorted.length);
  if (!Number.isInteger(pageSize) || pageSize < 1)
    throw new Error('Table pageSize must be a positive integer');
  const totalPages = Math.max(1, Math.ceil(sorted.length / pageSize));
  const requestedPage = options.page ?? 1;
  if (!Number.isInteger(requestedPage) || requestedPage < 1)
    throw new Error('Table page must be a positive integer');
  const page = Math.min(requestedPage, totalPages);
  return {
    rows: sorted.slice((page - 1) * pageSize, page * pageSize),
    totalRows: sorted.length,
    totalPages,
    page,
  };
}
