import { createContext, createMemo, useContext, type JSX } from 'solid-js';

export const defaultFloeMessages = {
  selectPlaceholder: 'Select…',
  searchPlaceholder: 'Search…',
  noResults: 'No results',
  loading: 'Loading…',
  retry: 'Retry',
  clear: 'Clear',
  close: 'Close',
  pagination: 'Pagination',
  firstPage: 'First page',
  previousPage: 'Previous page',
  nextPage: 'Next page',
  lastPage: 'Last page',
  page: 'Page {page}',
  pageOf: 'Page {page} of {total}',
  itemCount: 'Items: {count}',
  pageSize: 'Items per page',
  jumpTo: 'Go to page',
  increase: 'Increase value',
  decrease: 'Decrease value',
  selectedCount: '{count} selected',
  selectAll: 'Select all rows',
  selectRow: 'Select row {row}',
  sortAscending: 'Sort {column} ascending',
  sortDescending: 'Sort {column} descending',
  columns: 'Columns',
  emptyTable: 'No data',
  breadcrumb: 'Breadcrumb',
  previousMonth: 'Previous month',
  nextMonth: 'Next month',
  chooseDate: 'Choose date',
  startDate: 'Start date',
  endDate: 'End date',
  today: 'Today',
} as const;
export type FloeMessageKey = keyof typeof defaultFloeMessages;
export type FloeMessages = Record<FloeMessageKey, string>;
export interface FloeLocale {
  locale: string;
  direction: 'ltr' | 'rtl';
  /** Complete host-owned copy. Never silently fall back across languages. */
  messages: FloeMessages;
}
const defaultLocale: FloeLocale = {
  locale: 'en-US',
  direction: 'ltr',
  messages: defaultFloeMessages,
};
const LocaleContext = createContext<() => FloeLocale>(() => defaultLocale);
export function LocaleProvider(props: { value: FloeLocale; children: JSX.Element }) {
  const value = createMemo(() => props.value);
  return <LocaleContext.Provider value={value}>{props.children}</LocaleContext.Provider>;
}
export function useFloeLocale() {
  const value = useContext(LocaleContext);
  return {
    get locale() {
      return value().locale;
    },
    get direction() {
      return value().direction;
    },
    t(key: FloeMessageKey, params: Record<string, string | number> = {}) {
      const message = value().messages[key];
      if (typeof message !== 'string') throw new Error(`Missing Floe message: ${key}`);
      return message.replace(/\{(\w+)\}/g, (_, name: string) => {
        if (!(name in params)) throw new Error(`Missing Floe message parameter: ${key}.${name}`);
        return typeof params[name] === 'number'
          ? new Intl.NumberFormat(value().locale).format(params[name])
          : params[name];
      });
    },
    number(number: number, options?: Intl.NumberFormatOptions) {
      return new Intl.NumberFormat(value().locale, options).format(number);
    },
    date(date: Date, options?: Intl.DateTimeFormatOptions) {
      return new Intl.DateTimeFormat(value().locale, options).format(date);
    },
  };
}
