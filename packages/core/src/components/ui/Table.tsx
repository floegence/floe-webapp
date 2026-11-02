import { splitProps, type JSX } from 'solid-js';
import { cn } from '../../utils/cn';

export function Table(props: JSX.HTMLAttributes<HTMLTableElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <table
      class={cn(
        'w-full caption-bottom border-collapse text-[length:var(--floe-type-body)]',
        local.class
      )}
      {...rest}
    />
  );
}
export function TableHeader(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <thead class={cn('border-b border-border text-muted-foreground', local.class)} {...rest} />
  );
}
export function TableBody(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} />;
}
export function TableFooter(props: JSX.HTMLAttributes<HTMLTableSectionElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return <tfoot class={cn('border-t border-border font-medium', local.class)} {...rest} />;
}
export function TableRow(props: JSX.HTMLAttributes<HTMLTableRowElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <tr
      class={cn(
        'border-b border-border last:border-0 hover:bg-muted/50 data-[selected=true]:bg-accent',
        local.class
      )}
      {...rest}
    />
  );
}
export function TableHead(props: JSX.ThHTMLAttributes<HTMLTableCellElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return (
    <th
      scope="col"
      class={cn('px-3 py-2 text-start font-medium whitespace-nowrap', local.class)}
      {...rest}
    />
  );
}
export function TableCell(props: JSX.TdHTMLAttributes<HTMLTableCellElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return <td class={cn('px-3 py-2 align-middle', local.class)} {...rest} />;
}
export function TableCaption(props: JSX.HTMLAttributes<HTMLTableCaptionElement>) {
  const [local, rest] = splitProps(props, ['class']);
  return <caption class={cn('mt-3 text-caption text-muted-foreground', local.class)} {...rest} />;
}
