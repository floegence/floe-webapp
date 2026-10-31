import { For, Show, createMemo, createSignal, onCleanup } from 'solid-js';
import { usePersisted, useResolvedFloeConfig } from '@floegence/floe-webapp-core';
import {
  Button,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Dialog,
  FeedbackIndicator,
  Input,
  Tag,
} from '@floegence/floe-webapp-core/ui';
import { FileCode, Save, Search } from '@floegence/floe-webapp-core/icons';
import { SAMPLE_FILES } from './model';

const initial = () => Object.fromEntries(SAMPLE_FILES.map((file) => [file.id, file.content]));
export function FileScenario() {
  const { persist } = useResolvedFloeConfig();
  const savedKey = 'demo.scenarios.files.saved.v1';
  const [saved, setSaved] = createSignal<Record<string, string>>(persist.load(savedKey, initial()));
  const commitSaved = (next: Record<string, string>) => {
    persist.save(savedKey, next);
    const stored = persist.load<Record<string, string> | null>(savedKey, null);
    if (!stored || SAMPLE_FILES.some((file) => stored[file.id] !== next[file.id])) return false;
    setSaved(next);
    return true;
  };
  const [drafts, setDrafts] = usePersisted<Record<string, string>>(
    'demo.scenarios.files.drafts.v1',
    initial()
  );
  const [active, setActive] = createSignal<string>(SAMPLE_FILES[0].id);
  const [query, setQuery] = createSignal('');
  const [saving, setSaving] = createSignal(false);
  const [fail, setFail] = createSignal(false);
  const [feedback, setFeedback] = createSignal('');
  const [error, setError] = createSignal('');
  const [resetOpen, setResetOpen] = createSignal(false);
  let timer: ReturnType<typeof setTimeout> | undefined;
  let saveButton: HTMLButtonElement | undefined;
  onCleanup(() => clearTimeout(timer));
  const filtered = createMemo(() =>
    SAMPLE_FILES.filter((file) => file.name.includes(query().toLowerCase()))
  );
  const dirty = (id: string) => drafts()[id] !== saved()[id];
  const save = () => {
    if (saving() || !dirty(active())) return;
    const id = active();
    const content = drafts()[id]!;
    const willFail = fail();
    setSaving(true);
    setError('');
    setFeedback('');
    timer = setTimeout(() => {
      setSaving(false);
      if (willFail) {
        setError(
          'The example save failed. Your draft is retained. Turn off the failure case and save again.'
        );
        return;
      }
      if (!commitSaved({ ...saved(), [id]: content })) {
        setError(
          'Browser storage is unavailable. Your draft remains open. Allow storage and save again, or copy the text before closing this page.'
        );
        return;
      }
      setFeedback(`${id} saved in this browser.`);
    }, 650);
  };
  const reset = () => {
    clearTimeout(timer);
    setSaving(false);
    if (!commitSaved(initial())) {
      setResetOpen(false);
      setError(
        'The example files could not be reset because browser storage is unavailable. Your current files are retained.'
      );
      return;
    }
    setDrafts(initial());
    setQuery('');
    setActive(SAMPLE_FILES[0].id);
    setError('');
    setFeedback('');
    setFail(false);
    setResetOpen(false);
  };
  return (
    <div class="space-y-4" data-scenario="files">
      <div class="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 class="text-base font-semibold">Files & editing</h2>
          <p class="text-caption text-[var(--floe-ink-soft)]">
            Find a file, edit it, and save a local copy. Drafts survive navigation.
          </p>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setResetOpen(true)}>
          Reset example files
        </Button>
      </div>
      <Card>
        <CardContent class="grid gap-4 pt-4 md:grid-cols-[12rem_minmax(0,1fr)]">
          <nav aria-label="Example files" class="space-y-3">
            <Input
              aria-label="Search example files"
              placeholder="Find a file"
              value={query()}
              onInput={(event) => setQuery(event.currentTarget.value)}
              leftIcon={<Search class="h-3.5 w-3.5" />}
            />
            <ul class="space-y-1">
              <For each={filtered()}>
                {(file) => (
                  <li>
                    <button
                      type="button"
                      aria-current={active() === file.id ? 'page' : undefined}
                      class="flex min-h-9 w-full items-center gap-2 rounded-control px-2 text-left text-xs hover:bg-[var(--floe-state-hover)]"
                      classList={{ 'bg-[var(--floe-state-selected)]': active() === file.id }}
                      onClick={() => setActive(file.id)}
                    >
                      <FileCode class="h-4 w-4 shrink-0" aria-hidden="true" />
                      <span class="flex-1">{file.name}</span>
                      <Show when={dirty(file.id)}>
                        <span class="text-caption" aria-label="Unsaved changes">
                          ●
                        </span>
                      </Show>
                    </button>
                  </li>
                )}
              </For>
            </ul>
            <Show when={!filtered().length}>
              <div class="space-y-2 py-3 text-xs">
                <p>No matching files.</p>
                <Button size="sm" variant="ghost" onClick={() => setQuery('')}>
                  Clear file search
                </Button>
              </div>
            </Show>
          </nav>
          <div class="min-w-0 space-y-3">
            <div class="flex flex-wrap items-center justify-between gap-2">
              <h3 class="text-sm font-medium">{active()}</h3>
              <Tag size="sm" tone="soft">
                {dirty(active()) ? 'Unsaved changes' : 'Saved locally'}
              </Tag>
            </div>
            <For each={SAMPLE_FILES}>
              {(file) => (
                <textarea
                  hidden={active() !== file.id}
                  aria-label={`Edit ${file.name}`}
                  class="floe-field h-72 w-full resize-y rounded-control p-3 font-mono text-xs leading-relaxed"
                  spellcheck={false}
                  value={drafts()[file.id] ?? file.content}
                  onInput={(event) => {
                    setDrafts({ ...drafts(), [file.id]: event.currentTarget.value });
                    setFeedback('');
                  }}
                />
              )}
            </For>
            <Show when={error()}>
              <p role="alert" class="text-xs text-error">
                {error()}
              </p>
            </Show>
            <div class="flex flex-wrap items-center justify-between gap-3">
              <Checkbox
                checked={fail()}
                onChange={setFail}
                label="Simulate a save failure"
                disabled={saving()}
              />
              <div class="flex items-center gap-2">
                <FeedbackIndicator
                  entries={
                    feedback() ? [{ id: 'saved', severity: 'info', summary: feedback() }] : []
                  }
                  label="Save feedback"
                  closeLabel="Close save feedback"
                  restoreFocus={() => saveButton}
                />
                <Button
                  ref={saveButton}
                  variant="primary"
                  icon={Save}
                  loading={saving()}
                  disabled={!dirty(active())}
                  onClick={save}
                >
                  Save file
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <CardTitle>What to try</CardTitle>
        </CardHeader>
        <CardContent>
          <ol class="list-decimal space-y-1 pl-5 text-xs text-[var(--floe-ink-soft)]">
            <li>Edit a file, switch to another file, then return.</li>
            <li>Save it and reload this page to inspect the retained content.</li>
            <li>Enable the failure case, edit again, and retry with your draft intact.</li>
          </ol>
        </CardContent>
      </Card>
      <Dialog
        open={resetOpen()}
        onOpenChange={setResetOpen}
        title="Reset example files?"
        bodyDescription="This replaces only the three example files and their drafts. Your theme, workspace layouts and other examples stay unchanged."
        footer={
          <>
            <Button variant="ghost" onClick={() => setResetOpen(false)}>
              Keep files
            </Button>
            <Button variant="destructive" onClick={reset}>
              Reset files
            </Button>
          </>
        }
      >
        <p class="text-sm">Any edits to these example files will be discarded.</p>
      </Dialog>
    </div>
  );
}
