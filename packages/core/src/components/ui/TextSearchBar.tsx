import { Show } from 'solid-js';
import { ChevronUp, ChevronDown, X } from '../icons';
import type { TextSearchController } from './textSearch';

export interface TextSearchLabels {
  find: string; previous: string; next: string; close: string; noMatches: string;
  matches: (current: number, total: number) => string;
}
export function TextSearchBar(props: { search: TextSearchController; labels: TextSearchLabels }) {
  return <Show when={props.search.open()}>
    <div class="floe-text-search" role="search" aria-label={props.labels.find} onKeyDown={event => props.search.onKeyDown(event)}>
      <input ref={props.search.bindInput} type="search" aria-label={props.labels.find} placeholder={props.labels.find}
        value={props.search.query()} onInput={event => props.search.setQuery(event.currentTarget.value)} />
      <span role="status" aria-live="polite" aria-atomic="true">{props.search.query() ? props.search.count() ? props.labels.matches(props.search.current(), props.search.count()) : props.labels.noMatches : ''}</span>
      <button type="button" title={props.labels.previous} aria-label={props.labels.previous} disabled={!props.search.count()} onClick={() => props.search.previous()}><ChevronUp /></button>
      <button type="button" title={props.labels.next} aria-label={props.labels.next} disabled={!props.search.count()} onClick={() => props.search.next()}><ChevronDown /></button>
      <button type="button" title={props.labels.close} aria-label={props.labels.close} onClick={() => props.search.close()}><X /></button>
    </div>
  </Show>;
}
