import { renderToString } from 'solid-js/web';
import { describe, expect, it } from 'vitest';
import { FormField, FormLabel, FormControl, FormMessage } from '../src/components/ui/Form';
import { Input } from '../src/components/ui/Input';

describe('field composition', () => {
  it('associates a composed input with its label, description and error', () => {
    const html = renderToString(() => (
      <FormField name="email" error="Invalid email" description="Use a work email." required>
        <FormLabel>Email</FormLabel>
        <FormControl>
          <Input />
        </FormControl>
        <FormMessage />
      </FormField>
    ));
    const id = html.match(/<label[^>]*for="([^"]+)"/)?.[1];
    const input = html.match(/<input[^>]*>/)?.[0] ?? '';
    expect(id).toBeTruthy();
    expect(input).toContain(`id="${id}"`);
    expect(input).toContain('name="email"');
    expect(input).toContain('aria-invalid="true"');
    expect(input).toContain(`${id}-helper`);
    expect(input).toContain(`${id}-error`);
    expect(html).toContain('Invalid email');
  });
});
