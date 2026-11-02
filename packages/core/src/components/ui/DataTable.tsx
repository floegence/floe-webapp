import { For, Show, createMemo, type JSX } from 'solid-js';
import { useFloeLocale } from '../../context/LocaleContext';
import { Button } from './Button';
import { FeedbackIndicator } from './FeedbackIndicator';
import { Checkbox } from './Checkbox';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableCaption,
} from './Table';
import type { TableSort } from './dataTableModel';

export interface DataTableColumn<T> {
  id: string;
  header: string;
  cell: (row: T) => JSX.Element;
  sortable?: boolean;
  class?: string;
}
export interface DataTableProps<T> {
  /** Rows are already filtered, sorted and paginated by the host or createTableModel. */
  rows: readonly T[];
  columns: readonly DataTableColumn<T>[];
  rowKey: (row: T) => string;
  ariaLabel: string;
  caption?: string;
  sort?: TableSort;
  onSortChange?: (sort: TableSort) => void;
  selectedKeys?: readonly string[];
  onSelectionChange?: (keys: string[]) => void;
  isRowSelectable?: (row: T) => boolean;
  rowLabel?: (row: T) => string;
  hiddenColumns?: readonly string[];
  loading?: boolean;
  error?: string;
  onRetry?: () => void;
  empty?: JSX.Element;
  /** Product-owned search, column visibility and bulk actions. */
  toolbar?: JSX.Element;
  pagination?: JSX.Element;
  class?: string;
}

export function DataTable<T>(props: DataTableProps<T>) {
  const locale = useFloeLocale();
  let viewport: HTMLDivElement | undefined;
  const columns = createMemo(() =>
    props.columns.filter((column) => !props.hiddenColumns?.includes(column.id))
  );
  const selectable = createMemo(() =>
    props.rows.filter((row) => props.isRowSelectable?.(row) !== false).map(props.rowKey)
  );
  const selected = () => new Set(props.selectedKeys ?? []);
  const all = () => selectable().length > 0 && selectable().every((key) => selected().has(key));
  const mixed = () => !all() && selectable().some((key) => selected().has(key));
  const toggle = (keys: string[], checked: boolean) => {
    const next = selected();
    keys.forEach((key) => (checked ? next.add(key) : next.delete(key)));
    props.onSelectionChange?.([...next]);
  };
  return (
    <section class={props.class} dir={locale.direction} aria-label={props.ariaLabel}>
      {props.toolbar}
      <Show when={props.error && !props.rows.length}>
        <div role="alert" class="flex flex-wrap items-center gap-2 py-2 text-error">
          {props.error}
          <Show when={props.onRetry}>
            <Button variant="outline" onClick={() => props.onRetry?.()}>
              {locale.t('retry')}
            </Button>
          </Show>
        </div>
      </Show>
      <div
        ref={viewport}
        class="max-w-full overflow-x-auto rounded-panel border border-border"
        tabIndex={0}
        role="region"
        aria-label={props.ariaLabel}
        data-floe-local-interaction-surface="true"
      >
        <Table aria-label={props.ariaLabel} aria-busy={props.loading || undefined}>
          <Show when={props.caption}>
            <TableCaption>{props.caption}</TableCaption>
          </Show>
          <TableHeader>
            <TableRow>
              <Show when={props.onSelectionChange}>
                <TableHead class="w-10">
                  <Checkbox
                    aria-label={locale.t('selectAll')}
                    checked={all()}
                    indeterminate={mixed()}
                    disabled={!selectable().length}
                    onChange={(value) => toggle(selectable(), value)}
                  />
                </TableHead>
              </Show>
              <For each={columns()}>
                {(column) => (
                  <TableHead
                    class={column.class}
                    aria-sort={
                      props.sort?.column === column.id
                        ? props.sort.direction === 'asc'
                          ? 'ascending'
                          : 'descending'
                        : column.sortable
                          ? 'none'
                          : undefined
                    }
                  >
                    <Show when={column.sortable && props.onSortChange} fallback={column.header}>
                      <Button
                        variant="ghost"
                        size="sm"
                        class="-ms-2"
                        aria-label={locale.t(
                          props.sort?.column === column.id && props.sort.direction === 'asc'
                            ? 'sortDescending'
                            : 'sortAscending',
                          { column: column.header }
                        )}
                        onClick={() =>
                          props.onSortChange?.({
                            column: column.id,
                            direction:
                              props.sort?.column === column.id && props.sort.direction === 'asc'
                                ? 'desc'
                                : 'asc',
                          })
                        }
                      >
                        {column.header}
                        <span aria-hidden="true">
                          {props.sort?.column === column.id
                            ? props.sort.direction === 'asc'
                              ? '↑'
                              : '↓'
                            : '↕'}
                        </span>
                      </Button>
                    </Show>
                  </TableHead>
                )}
              </For>
            </TableRow>
          </TableHeader>
          <TableBody>
            <For each={props.rows}>
              {(row) => (
                <TableRow data-selected={selected().has(props.rowKey(row)) ? 'true' : undefined}>
                  <Show when={props.onSelectionChange}>
                    <TableCell>
                      <Checkbox
                        aria-label={locale.t('selectRow', {
                          row: props.rowLabel?.(row) ?? props.rowKey(row),
                        })}
                        checked={selected().has(props.rowKey(row))}
                        disabled={props.isRowSelectable?.(row) === false}
                        onChange={(value) => toggle([props.rowKey(row)], value)}
                      />
                    </TableCell>
                  </Show>
                  <For each={columns()}>
                    {(column) => <TableCell class={column.class}>{column.cell(row)}</TableCell>}
                  </For>
                </TableRow>
              )}
            </For>
            <Show when={!props.rows.length}>
              <TableRow>
                <TableCell
                  colSpan={columns().length + (props.onSelectionChange ? 1 : 0)}
                  class="py-8 text-center text-muted-foreground"
                >
                  {props.loading
                    ? locale.t('loading')
                    : props.error
                      ? ''
                      : (props.empty ?? locale.t('emptyTable'))}
                </TableCell>
              </TableRow>
            </Show>
          </TableBody>
        </Table>
      </div>
      <div class="mt-2 flex min-h-[var(--floe-control-height-md)] flex-wrap items-center justify-between gap-2">
        <Show when={props.error && props.rows.length}>
          <FeedbackIndicator label={props.error!} closeLabel={locale.t('close')} restoreFocus={() => viewport}
            entries={[{id:'refresh',severity:'error',summary:props.error!,actions:props.onRetry ? <Button variant="outline" onClick={() => props.onRetry?.()}>{locale.t('retry')}</Button> : undefined}]} />
        </Show>
        <span role="status" class="sr-only">
          {props.loading ? locale.t('loading') : ''}
        </span>
        <Show when={props.onSelectionChange}>
          <span role="status" class="text-caption text-muted-foreground">
            {locale.t('selectedCount', { count: props.selectedKeys?.length ?? 0 })}
          </span>
        </Show>
        {props.pagination}
      </div>
    </section>
  );
}
