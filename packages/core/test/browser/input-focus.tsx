import { render } from 'solid-js/web';
import { Input, Textarea, NumberInput, AffixInput } from '../../src/components/ui/Input';
import { DirectoryInput } from '../../src/components/ui/DirectoryInput';
import { Button } from '../../src/components/ui/Button';
import { Switch } from '../../src/components/ui/Switch';
import { ChatProvider } from '../../src/components/chat/ChatProvider';
import { ChatInput } from '../../src/components/chat/input/ChatInput';
import { builtInShellThemePresets } from '../../src/styles/themes';
import '../../src/styles/globals.css';

Object.assign(window, {
  inputFocusThemes: builtInShellThemePresets.map(({ name, mode }) => ({ name, mode })),
});
render(
  () => (
    <main class="grid grid-cols-3 gap-6 p-6">
      <section data-case="text">
        <Input aria-label="Text" value="Sample text" />
      </section>
      <section data-case="password">
        <Input aria-label="Password" type="password" value="secret" />
      </section>
      <section data-case="textarea">
        <Textarea aria-label="Description" value="Multiline text" />
      </section>
      <section data-case="invalid">
        <Input aria-label="Invalid" error="Required" />
      </section>
      <section data-case="aria-invalid">
        <Input aria-label="Aria invalid" aria-invalid="true" />
      </section>
      <section data-case="readonly">
        <Input aria-label="Readonly" value="Read only" readOnly />
      </section>
      <section data-case="disabled">
        <Input aria-label="Disabled" disabled />
      </section>
      <section data-case="host"><input aria-label="Host styled text" class="host-field" /></section>
    <section data-case="native">
        <input aria-label="Native text" class="border border-input bg-background p-2" />
      </section>
      <section data-case="search">
        <input type="search" aria-label="Search" class="border border-input bg-background p-2" />
      </section>
      <section data-case="select">
        <select aria-label="Native select" class="border border-input bg-background p-2">
          <option>One</option>
          <option>Two</option>
        </select>
      </section>
      <section data-case="underline">
        <input aria-label="Underline" class="border-0 border-b border-input bg-background p-2" />
      </section>
      <section data-case="number">
        <NumberInput value={3} onChange={() => undefined} />
      </section>
      <section data-case="number-invalid">
        <NumberInput value={3} error="Invalid number" onChange={() => undefined} />
      </section>
      <section data-case="affix">
        <AffixInput
          aria-label="URL"
          prefixOptions={[{ value: 'https', label: 'https://' }]}
          value="example.com"
        />
      </section>
      <section data-case="directory">
        <DirectoryInput value="/workspace" open={false} defaultExpanded={false} />
      </section>
      <section data-case="chat">
        <ChatProvider config={{ allowAttachments: false }}>
          <ChatInput />
        </ChatProvider>
      </section>
      <section data-case="button">
        <Button>Save</Button>
      </section>
      <section data-case="switch">
        <Switch aria-label="Switch" checked />
      </section>
    </main>
  ),
  document.getElementById('root')!
);
