import { render } from 'solid-js/web';
import { Button } from '../../src/components/ui/Button';
import { builtInShellThemePresets } from '../../src/styles/themes';
import '../../src/styles/globals.css';

Object.assign(window, {
  buttonThemes: builtInShellThemePresets.map(({ name, mode }) => ({ name, mode })),
});
render(
  () => (
    <main class="flex gap-6 p-6">
      <Button data-variant="default">Review update</Button>
      <Button variant="primary" data-variant="primary">
        Approve connection
      </Button>
    </main>
  ),
  document.getElementById('root')!
);
