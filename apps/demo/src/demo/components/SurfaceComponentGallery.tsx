import { For, createSignal, type ParentProps } from 'solid-js';
import {
  Button,
  Card,
  CardContent,
  Tag,
  Input,
  Textarea,
  AffixInput,
  NumberInput,
  RadioGroup,
  RadioOption,
  Checkbox,
  Switch,
  SegmentedControl,
  Tabs,
  Pagination,
  LinearProgress,
  CircularProgress,
  SegmentedProgress,
  StepsProgress,
  Stepper,
  Dialog,
  Dropdown,
  Select,
  Tooltip,
  HighlightBlock,
  QuoteBlock,
  ProcessingIndicator,
  type TagVariant,
  type RadioVariant,
} from '@floegence/floe-webapp-core/ui';

function Group(props: ParentProps<{ title: string; description: string; id: string }>) {
  return (
    <section class="surface-gallery-group" data-gallery-group={props.id}>
      <div class="surface-gallery-heading">
        <h3>{props.title}</h3>
        <p>{props.description}</p>
      </div>
      <Card>
        <CardContent>
          <div class="surface-gallery-stack">{props.children}</div>
        </CardContent>
      </Card>
    </section>
  );
}

/** The Demo and packed consumers render this same public-component state matrix. */
export function SurfaceComponentGallery(props: { progress?: number; dense?: boolean }) {
  const [radio, setRadio] = createSignal('local');
  const [checked, setChecked] = createSignal(true);
  const [enabled, setEnabled] = createSignal(true);
  const [optionalSync, setOptionalSync] = createSignal(false);
  const [mixed, setMixed] = createSignal(true);
  const [segment, setSegment] = createSignal('day');
  const [tab, setTab] = createSignal('overview');
  const [page, setPage] = createSignal(2);
  const [progress, setProgress] = createSignal(64);
  const [step, setStep] = createSignal(1);
  const [dialog, setDialog] = createSignal(false);
  const value = () => props.progress ?? progress();
  const variants: TagVariant[] = ['neutral', 'primary', 'success', 'warning', 'error', 'info'];
  const choiceVariants: RadioVariant[] = ['default', 'button', 'card', 'tile'];
  return (
    <div class="surface-gallery" data-component-gallery>
      <style>{`
      .surface-gallery { color:var(--foreground); width:100%; }
      .surface-gallery-intro { margin-bottom:28px; }
      .surface-gallery-intro h2 { font-size:24px; font-weight:650; letter-spacing:-.025em; }
      .surface-gallery-intro p,.surface-gallery-heading p { color:var(--muted-foreground); font-size:12px; margin-top:6px; line-height:1.6; }
      .surface-gallery-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:28px; }
      .surface-gallery-heading { margin-bottom:12px; }
      .surface-gallery-heading h3 { font-size:14px; font-weight:600; }
      .surface-gallery-stack { display:flex; flex-direction:column; gap:20px; padding:6px; }
      .surface-gallery-row { display:flex; align-items:center; flex-wrap:wrap; gap:12px; }
      .surface-gallery-label { font-size:10px; color:var(--muted-foreground); text-transform:uppercase; letter-spacing:.06em; margin-bottom:10px; }
      .surface-gallery-field { display:flex; flex-direction:column; gap:7px; font-size:11px; }
      .surface-gallery-choices { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:14px; }
      .surface-gallery-variants { margin-top:32px; } .surface-gallery-variants summary { cursor:pointer; font-size:13px; font-weight:600; margin-bottom:22px; }
      .surface-gallery-dense { display:grid; grid-template-columns:repeat(4,minmax(0,1fr)); gap:16px; margin-top:32px; }
      @media(max-width:760px) { .surface-gallery-grid { grid-template-columns:minmax(0,1fr); gap:24px; } .surface-gallery-dense {grid-template-columns:repeat(2,minmax(0,1fr));} }
    `}</style>
      <header class="surface-gallery-intro">
        <h2>Every detail, in the same light.</h2>
        <p>
          Explore selection, depth and feedback across the component system. Use the theme and
          surface controls to compare.
        </p>
      </header>
      <div class="surface-gallery-grid">
        <Group
          id="tags"
          title="Tags & status"
          description="Small embossed badges and recessed tints retain each semantic color."
        >
          <For each={['solid', 'soft'] as const}>
            {(tone) => (
              <div>
                <p class="surface-gallery-label">{tone}</p>
                <div class="surface-gallery-row">
                  <For each={variants}>
                    {(variant) => (
                      <Tag tone={tone} variant={variant} dot>
                        {variant}
                      </Tag>
                    )}
                  </For>
                </div>
              </div>
            )}
          </For>
          <div class="surface-gallery-row">
            <For each={['sm', 'md', 'lg'] as const}>
              {(size) => (
                <Tag size={size} variant="success">
                  Ready · {size}
                </Tag>
              )}
            </For>
          </div>
          <div class="surface-gallery-row">
            <ProcessingIndicator variant="minimal" />
            <ProcessingIndicator variant="pill" />
          </div>
        </Group>
        <Group
          id="actions"
          title="Buttons & navigation"
          description="Raised actions, pressed current pages and a shared selection rail."
        >
          <div class="surface-gallery-row">
            <Button>Primary</Button>
            <Button variant="secondary">Secondary</Button>
            <Button variant="outline">Outline</Button>
            <Button variant="destructive">Delete</Button>
          </div>
          <div class="surface-gallery-row">
            <Button disabled>Disabled</Button>
            <Button loading>Loading</Button>
            <Button variant="ghost">Quiet action</Button>
            <Tooltip content="A small floating surface">
              <Button variant="outline">Tooltip</Button>
            </Tooltip>
          </div>
          <SegmentedControl
            aria-label="Time range"
            value={segment()}
            onChange={setSegment}
            options={[
              { value: 'day', label: 'Day' },
              { value: 'week', label: 'Week' },
              { value: 'month', label: 'Month' },
              { value: 'year', label: 'Year', disabled: true },
            ]}
          />
          <Pagination page={page()} totalPages={8} onChange={setPage} />
        </Group>
        <Group
          id="radios"
          title="Radio selections"
          description="Recessed wells and color-led choices, across all four variants."
        >
          <For each={choiceVariants}>
            {(variant) => (
              <div data-radio-variant={variant}>
                <p class="surface-gallery-label">{variant}</p>
                <RadioGroup
                  value={radio()}
                  onChange={setRadio}
                  variant={variant}
                  orientation="horizontal"
                  aria-label={`${variant} environment`}
                >
                  <RadioOption value="local" label="Local" />
                  <RadioOption value="cloud" label="Cloud" />
                  <RadioOption value="disabled" label="Locked" disabled />
                </RadioGroup>
              </div>
            )}
          </For>
        </Group>
        <Group
          id="checks"
          title="Checkboxes & switches"
          description="Checked, mixed and disabled states keep their familiar meaning."
        >
          <div class="surface-gallery-row">
            <Checkbox label="Notifications" checked={checked()} onChange={setChecked} />
            <Checkbox
              label="Mixed selection"
              indeterminate={mixed()}
              checked={!mixed() && checked()}
              onChange={(value) => {
                setMixed(false);
                setChecked(value);
              }}
            />
            <Checkbox label="Disabled" disabled checked />
          </div>
          <div class="surface-gallery-choices">
            <For each={['button', 'card', 'tile'] as const}>
              {(variant) => (
                <Checkbox
                  variant={variant}
                  checked={checked()}
                  onChange={setChecked}
                  label={variant}
                />
              )}
            </For>
          </div>
          <For each={['sm', 'md', 'lg'] as const}>
            {(size) => (
              <div class="surface-gallery-row" data-switch-size={size}>
                <Switch
                  size={size}
                  label={`Sync ${size}`}
                  checked={enabled()}
                  onChange={setEnabled}
                />
                <Switch
                  size={size}
                  label={`Off ${size}`}
                  checked={optionalSync()}
                  onChange={setOptionalSync}
                />
                <Switch size={size} label={`Disabled ${size}`} disabled checked />
              </div>
            )}
          </For>
        </Group>
        <Group
          id="fields"
          title="Fields & compound controls"
          description="Recessed surfaces; focus changes only the existing border to a quiet, readable color."
        >
          <label class="surface-gallery-field">
            Workspace name
            <Input aria-label="Gallery workspace" value="Studio workspace" />
          </label>
          <div class="surface-gallery-choices">
            <Input aria-label="Invalid endpoint" aria-invalid="true" value="Invalid endpoint" />
            <Input aria-label="Disabled endpoint" value="Disabled endpoint" disabled />
          </div>
          <AffixInput aria-label="Gallery domain" prefix="https://" value="studio.example" />
          <NumberInput aria-label="Gallery sessions" value={3} onChange={() => undefined} />
          <Textarea aria-label="Gallery notes" value="Write, select and edit naturally." />
        </Group>
        <Group
          id="progress"
          title="Progress & completion"
          description="Inset tracks and lit fills express value without a strong outline."
        >
          <div class="surface-gallery-row">
            <Button
              variant="secondary"
              onClick={() => setProgress((v) => (v >= 100 ? 0 : Math.min(v + 12, 100)))}
            >
              Advance progress
            </Button>
            <Tag tone="soft">{Math.round(value())}% complete</Tag>
          </div>
          <For each={['primary', 'success', 'warning', 'error', 'info'] as const}>
            {(color) => <LinearProgress value={value()} color={color} size="md" />}
          </For>
          <LinearProgress value={value()} buffer={85} striped size="lg" />
          <SegmentedProgress value={value()} segments={10} color="success" />
          <div class="surface-gallery-row">
            <For each={['sm', 'md', 'lg'] as const}>
              {(size) => <CircularProgress value={value()} size={size} showLabel />}
            </For>
            <CircularProgress indeterminate color="info" />
            <LinearProgress indeterminate class="max-w-32" />
          </div>
        </Group>
        <Group
          id="steps"
          title="Tabs & workflow stages"
          description="A selected face accompanies the existing tab indicator and stage semantics."
        >
          <Tabs
            items={[
              { id: 'overview', label: 'Overview' },
              { id: 'activity', label: 'Activity' },
              { id: 'locked', label: 'Locked', disabled: true },
            ]}
            activeId={tab()}
            onChange={setTab}
            ariaLabel="Gallery sections"
          />
          <StepsProgress current={step()} steps={['Connect', 'Configure', 'Ready']} />
          <Stepper
            steps={[
              { id: 'connect', label: 'Connect' },
              { id: 'configure', label: 'Configure' },
              { id: 'ready', label: 'Ready' },
            ]}
            currentStep={step()}
            onStepClick={setStep}
            allowClickFuture
          />
          <div class="surface-gallery-row">
            <Button variant="outline" onClick={() => setStep((v) => (v + 1) % 3)}>
              Next stage
            </Button>
            <Tag tone="soft">Stage {step() + 1}</Tag>
          </div>
        </Group>
        <Group
          id="layers"
          title="Messages & floating layers"
          description="Quiet seams, readable semantic messages and distinct floating surfaces."
        >
          <HighlightBlock variant="success" title="Workspace connected">
            Your workspace is ready for the next step.
          </HighlightBlock>
          <QuoteBlock author="Workspace note">
            Keep the content easy to read and the actions easy to find.
          </QuoteBlock>
          <div class="surface-gallery-row">
            <Button variant="secondary" onClick={() => setDialog(true)}>
              Open component dialog
            </Button>
            <Dropdown
              trigger={<span>Component menu</span>}
              triggerAriaLabel="Component menu"
              items={[
                { id: 'open', label: 'Open workspace' },
                {
                  id: 'more',
                  label: 'More actions',
                  children: [{ id: 'export', label: 'Export settings' }],
                },
              ]}
              onSelect={() => undefined}
            />
          </div>
        </Group>
      </div>
      <details class="surface-gallery-variants" data-gallery-variants>
        <summary>Explore sizes, disabled controls &amp; alternate variants</summary>
        <div class="surface-gallery-grid">
          <For each={['sm', 'md', 'lg'] as const}>
            {(size) => (
              <Group
                id={`sizes-${size}`}
                title={`Control size · ${size}`}
                description="The same material at each supported density."
              >
                <div class="surface-gallery-row">
                  <Button size={size}>Action</Button>
                  <Button size={size} variant="outline" disabled>
                    Disabled
                  </Button>
                  <Checkbox
                    size={size}
                    label={`Size ${size}`}
                    checked={checked()}
                    onChange={setChecked}
                  />
                </div>
                <RadioGroup
                  size={size}
                  value={radio()}
                  onChange={setRadio}
                  orientation="horizontal"
                  aria-label={`Size ${size} environment`}
                >
                  <RadioOption value="local" label="On device" />
                  <RadioOption value="cloud" label="Remote" />
                </RadioGroup>
                <SegmentedControl
                  size={size}
                  value={segment()}
                  onChange={setSegment}
                  options={[
                    { value: 'day', label: 'Daily' },
                    { value: 'week', label: 'Weekly' },
                  ]}
                />
                <LinearProgress size={size} value={0} />
                <LinearProgress size={size} value={100} color="success" />
                <SegmentedProgress size={size} value={value()} />
              </Group>
            )}
          </For>
          <Group
            id="alternate"
            title="Alternate controls"
            description="Existing options keep their meaning and geometry."
          >
            <div class="surface-gallery-row">
              <Button size="xs">Extra small</Button>
              <Select
                value={radio()}
                onChange={setRadio}
                options={[
                  { value: 'local', label: 'Local environment' },
                  { value: 'cloud', label: 'Cloud environment' },
                ]}
              />
            </div>
            <SegmentedControl
              value="day"
              onChange={() => undefined}
              disabled
              options={[
                { value: 'day', label: 'Daily' },
                { value: 'week', label: 'Weekly' },
              ]}
            />
            <Pagination variant="simple" page={page()} totalPages={8} onChange={setPage} />
            <Pagination variant="minimal" page={page()} totalPages={8} onChange={setPage} />
            <For each={['minimal', 'dots'] as const}>
              {(variant) => (
                <Stepper
                  variant={variant}
                  steps={[
                    { id: 'a', label: 'Connect' },
                    { id: 'b', label: 'Configure' },
                    { id: 'c', label: 'Ready' },
                  ]}
                  currentStep={step()}
                />
              )}
            </For>
            <StepsProgress
              orientation="vertical"
              current={step()}
              steps={['Connect', 'Configure', 'Ready']}
            />
          </Group>
        </div>
      </details>
      {props.dense && (
        <div class="surface-gallery-dense" data-dense-controls>
          <For each={Array.from({ length: 80 }, (_, i) => i)}>
            {(i) => (
              <div class="surface-gallery-stack">
                <Tag tone={i % 2 ? 'soft' : 'solid'} variant={variants[i % 6]}>
                  Module {i + 1}
                </Tag>
                <Switch aria-label={`Module ${i + 1}`} checked={value() % 2 === 0} />
                <LinearProgress value={value()} color="success" />
              </div>
            )}
          </For>
        </div>
      )}
      <Dialog
        open={dialog()}
        onOpenChange={setDialog}
        title="Workspace preferences"
        description="A floating surface with the same material language."
      >
        <div class="surface-gallery-stack">
          <Input aria-label="Dialog workspace" value="Studio workspace" />
          <Switch checked={enabled()} onChange={setEnabled} label="Synchronize changes" />
          <Button onClick={() => setDialog(false)}>Save preferences</Button>
        </div>
      </Dialog>
    </div>
  );
}
