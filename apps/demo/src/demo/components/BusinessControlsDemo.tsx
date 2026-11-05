import { createMemo, createSignal } from 'solid-js';
import { LocaleProvider, defaultFloeMessages, type FloeLocale } from '@floegence/floe-webapp-core';
import {
  Accordion,
  Breadcrumb,
  Button,
  Calendar,
  Combobox,
  DataTable,
  DatePicker,
  DateRangePicker,
  Form,
  FormField,
  FormLabel,
  FormDescription,
  FormMessage,
  Input,
  MultiSelect,
  Pagination,
  PromptCard,
  Select,
  Slider,
  createTableModel,
  type TableSort,
} from '@floegence/floe-webapp-core/ui';

const environments = [
  { value: 'dev', label: 'Development' },
  { value: 'disabled', label: 'Unavailable', disabled: true },
  { value: 'prod', label: 'Production' },
];
const records = [
  { id: 'one', name: 'Atlas', region: 'Europe' },
  { id: 'two', name: 'Boreal', region: 'Asia' },
  { id: 'three', name: 'Cirrus', region: 'Europe' },
];
export function BusinessControlsDemo() {
  const [promptOpen, setPromptOpen] = createSignal(false);
  const [promptDraft, setPromptDraft] = createSignal('');
  const [promptAnchor, setPromptAnchor] = createSignal<{ x: number; y: number }>();
  const [lastPrompt, setLastPrompt] = createSignal('');
  const [rtl, setRtl] = createSignal(false),
    [pending, setPending] = createSignal(false),
    [remoteError, setRemoteError] = createSignal(false);
  const locale = createMemo<FloeLocale>(() => ({
    locale: 'en-US',
    direction: rtl() ? 'rtl' : 'ltr',
    messages: defaultFloeMessages,
  }));
  const [submitted, setSubmitted] = createSignal(''),
    [query, setQuery] = createSignal(''),
    [page, setPage] = createSignal(1);
  const [sort, setSort] = createSignal<TableSort>({ column: 'name', direction: 'asc' }),
    [selected, setSelected] = createSignal<string[]>([]),
    [hideRegion, setHideRegion] = createSignal(false);
  const [date, setDate] = createSignal('2026-11-02'),
    [range, setRange] = createSignal({ start: '2026-11-02', end: '2026-11-09' });
  const model = createMemo(() =>
    createTableModel({
      rows: records,
      filter: (row) => row.name.toLowerCase().includes(query().toLowerCase()),
      compare: (a, b) => a.name.localeCompare(b.name) * (sort().direction === 'asc' ? 1 : -1),
      page: page(),
      pageSize: 2,
    })
  );
  return (
    <LocaleProvider value={locale()}>
      <div class="space-y-6" dir={locale().direction}>
        <div class="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => setRtl(!rtl())}>
            Toggle direction
          </Button>
          <Button variant="outline" onClick={() => setPending(!pending())}>
            Toggle loading
          </Button>
          <Button variant="outline" onClick={() => setRemoteError(!remoteError())}>
            Toggle error
          </Button>
        </div>
        <section class="space-y-2">
          <h2 class="text-base font-semibold">Contextual question</h2>
          <Button
            variant="outline"
            onClick={(event) => {
              const rect = event.currentTarget.getBoundingClientRect();
              setPromptAnchor({ x: rect.left, y: rect.bottom });
              setPromptOpen(true);
            }}
          >
            Ask about this project
          </Button>
          <output class="block text-caption" aria-label="Last submitted question">
            {lastPrompt()}
          </output>
          <PromptCard
            open={promptOpen()}
            anchor={promptAnchor()}
            title="Project assistant"
            closeLabel="Close"
            question="What would you like to check?"
            inputLabel="Your question"
            placeholder="Describe what you need…"
            value={promptDraft()}
            onValueChange={setPromptDraft}
            submitLabel="Ask"
            submitDisabled={!promptDraft().trim()}
            references={<span>Atlas project</span>}
            onClose={() => setPromptOpen(false)}
            onSubmit={() => {
              setLastPrompt(promptDraft());
              setPromptOpen(false);
            }}
          />
        </section>
        <Breadcrumb
          items={[
            { id: 'home', label: 'Workspace', href: '#' },
            { id: 'current', label: 'Business controls' },
          ]}
        />
        <div class="grid min-w-0 gap-6 lg:grid-cols-2">
          <section class="min-w-0 space-y-3">
            <h2 class="text-base font-semibold">Project settings</h2>
            <Form
              id="business-form"
              validate={(data) =>
                String(data.get('project') ?? '').trim().length < 3
                  ? { project: 'Use at least three characters.' }
                  : undefined
              }
              onSubmit={(_event, { data }) => {
                setSubmitted(JSON.stringify(Array.from(data.entries())));
              }}
            >
              <FormField name="project" required>
                <FormLabel>Project name</FormLabel>
                <Input />
                <FormDescription>Choose a descriptive project name.</FormDescription>
                <FormMessage />
              </FormField>
              <FormField name="environment" required>
                <FormLabel>Environment</FormLabel>
                <Select defaultValue="dev" options={environments} />
              </FormField>
              <FormField name="search">
                <FormLabel>Search environment</FormLabel>
                <Combobox
                  options={environments}
                  loading={pending()}
                  error={remoteError() ? 'Could not load environments.' : undefined}
                  onRetry={() => setRemoteError(false)}
                />
              </FormField>
              <FormField name="regions">
                <FormLabel>Regions</FormLabel>
                <MultiSelect
                  defaultValue={['eu']}
                  options={[
                    { value: 'eu', label: 'Europe' },
                    { value: 'ap', label: 'Asia Pacific' },
                  ]}
                />
              </FormField>
              <FormField name="capacity">
                <FormLabel>Capacity</FormLabel>
                <Slider min={0} max={100} value={50} />
              </FormField>
              <div class="flex flex-wrap gap-2">
                <Button type="submit">Save settings</Button>
                <Button type="reset" variant="outline">
                  Reset settings
                </Button>
              </div>
              <output aria-label="Submitted settings" class="block break-all text-caption">
                {submitted()}
              </output>
            </Form>
          </section>
          <section class="min-w-0 space-y-3">
            <h2 class="text-base font-semibold">Schedule</h2>
            <FormField name="release">
              <FormLabel>Release date</FormLabel>
              <DatePicker value={date()} onChange={setDate} clearable />
            </FormField>
            <DateRangePicker value={range()} onChange={setRange} />
            <Calendar
              ariaLabel="Release calendar"
              value={date()}
              onChange={setDate}
              min="2026-01-01"
              max="2027-12-31"
            />
          </section>
        </div>
        <DataTable
          ariaLabel="Projects"
          rows={model().rows}
          rowKey={(row) => row.id}
          rowLabel={(row) => row.name}
          columns={[
            { id: 'name', header: 'Name', sortable: true, cell: (row) => row.name },
            { id: 'region', header: 'Region', cell: (row) => row.region },
          ]}
          sort={sort()}
          onSortChange={setSort}
          selectedKeys={selected()}
          onSelectionChange={setSelected}
          hiddenColumns={hideRegion() ? ['region'] : []}
          loading={pending()}
          error={remoteError() ? 'Could not refresh projects.' : undefined}
          onRetry={() => setRemoteError(false)}
          toolbar={
            <div class="mb-3 flex flex-wrap items-center gap-2">
              <Input
                aria-label="Filter projects"
                value={query()}
                onInput={(event) => {
                  setQuery(event.currentTarget.value);
                  setPage(1);
                }}
              />
              <Button variant="outline" onClick={() => setHideRegion(!hideRegion())}>
                Toggle region column
              </Button>
            </div>
          }
          pagination={
            <Pagination
              page={model().page}
              totalPages={model().totalPages}
              totalItems={model().totalRows}
              onChange={setPage}
            />
          }
        />
        <Accordion
          items={[
            {
              id: 'details',
              title: 'Deployment details',
              content: <Input aria-label="Retained deployment note" />,
            },
            {
              id: 'audit',
              title: 'Audit requirements',
              content: <p>Changes retain their project and environment identity.</p>,
            },
          ]}
        />
      </div>
    </LocaleProvider>
  );
}
