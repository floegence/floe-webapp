import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { PromptCard, Button, type PromptCardProps } from '../../src/ui';
import { Sparkles } from '../../src/icons';
import '../../src/styles/globals.css';

render(() => {
  const surface = new URLSearchParams(location.search).has('surface');
  const [anchor, setAnchor] = createSignal<PromptCardProps['anchor']>({ x: 28, y: 192 });
  const [open, setOpen] = createSignal(false);
  const [value, setValue] = createSignal('');
  const [busy, setBusy] = createSignal(false);
  const [top, setTop] = createSignal(160);
  const [feedback, setFeedback] = createSignal('');
  const [submits, setSubmits] = createSignal(0);
  const [outside, setOutside] = createSignal(0);
  const [model, setModel] = createSignal('balanced');
  const [question, setQuestion] = createSignal<string>();
  const [files, setFiles] = createSignal<File[]>([]);
  Object.assign(window, {
    promptCard: {
      setQuestion,
      setAnchor,
      setOpen,
      setBusy,
      setTop,
      setFeedback,
      submits,
      outside,
      value,
      model,
      files,
    },
  });
  return (
    <main
      data-floe-dialog-surface-host={surface ? 'true' : undefined}
      style={{
        padding: '24px',
        background: 'var(--background)',
        position: 'relative',
        'min-height': surface ? '500px' : '100vh',
        width: surface ? '600px' : undefined,
        transform: surface ? 'translate(120px, 80px) scale(.75)' : undefined,
        'transform-origin': 'top left',
      }}
    >
      <Button
        id="trigger"
        onClick={(event) => {
          const bounds = event.currentTarget.getBoundingClientRect();
          setAnchor(
            new URLSearchParams(location.search).has('implicit')
              ? undefined
              : { x: bounds.left + 4, y: bounds.bottom }
          );
          if (new URLSearchParams(location.search).has('frame'))
            requestAnimationFrame(() => setOpen(true));
          else setOpen(true);
        }}
        style={{ position: 'fixed', top: `${top()}px`, left: '24px' }}
      >
        Ask assistant
      </Button>
      <Button id="outside" onClick={() => setOutside((n) => n + 1)}>
        Outside action
      </Button>
      <div id="related" style={{ position: 'fixed', bottom: '20px' }}>
        <Button>Related preview</Button>
      </div>
      <PromptCard
        open={open()}
        anchor={anchor()}
        title="Ask assistant"
        icon={<Sparkles />}
        question={question()}
        inputLabel="Message"
        closeLabel="Close"
        submitLabel={busy() ? 'Sending' : 'Send'}
        value={value()}
        onValueChange={setValue}
        busy={busy()}
        submitDisabled={!value().trim()}
        onClose={() => setOpen(false)}
        onSubmit={() => {
          setSubmits((n) => n + 1);
          setBusy(true);
        }}
        containsTarget={(target) =>
          target instanceof Element && Boolean(target.closest('#related'))
        }
        attachment={{
          label: 'Attach files',
          onFiles: (added) => setFiles((previous) => [...previous, ...added]),
        }}
        selection={{
          label: 'Model',
          value: model(),
          onChange: setModel,
          search: { label: 'Search models', placeholder: 'Search models' },
          options: [
            { value: 'balanced', label: 'GPT-4.1', group: 'openai', groupLabel: 'OpenAI' },
            {
              value: 'fast',
              label: 'Claude Sonnet 4.5',
              group: 'anthropic',
              groupLabel: 'Anthropic',
            },
            {
              value: 'unavailable',
              label: 'Unavailable',
              disabled: true,
              group: 'anthropic',
              groupLabel: 'Anthropic',
              description: 'Missing key',
            },
          ],
        }}
        references={<span>Project files</span>}
        feedback={feedback() && <p role="alert">{feedback()}</p>}
      />
    </main>
  );
}, document.getElementById('root')!);
