import { createSignal } from 'solid-js';
import { Form, FormField, FormLabel, FormMessage, Input, Select, Button } from '../../src/ui';
import { render } from 'solid-js/web';
import { BusinessControlsDemo } from '../../../../apps/demo/src/demo/components/BusinessControlsDemo';
import '../../src/styles/globals.css';
function AsyncFormFixture() {
  const [error, setError] = createSignal('');
  const [submitted, setSubmitted] = createSignal(0);
  let complete: (() => void) | undefined;
  return (
    <section aria-label="Async form contracts">
      <Form
        onSubmit={() => {
          setSubmitted((value) => value + 1);
        }}
        validate={() =>
          new Promise((resolve) => {
            complete = () => resolve({ async: 'Late validation' });
          })
        }
      >
        <FormField name="async">
          <FormLabel>Async field</FormLabel>
          <Input />
          <FormMessage error={error()} />
        </FormField>
        <FormField name="remote">
          <FormLabel>Remote selection</FormLabel>
          <Select defaultValue="retained" options={[]} />
        </FormField>
        <FormField name="empty-option"><FormLabel>Default choice</FormLabel><Select defaultValue="" options={[{value:'',label:'Use default'},{value:'other',label:'Other'}]} /></FormField>
      <Button type="submit">Validate asynchronously</Button>
        <Button type="reset">Reset async form</Button>
      </Form>
      <Button onClick={() => complete?.()}>Complete validation</Button>
      <Button onClick={() => setError(error() ? '' : 'Dynamic error')}>Toggle field error</Button>
      <output aria-label="Async submissions">{submitted()}</output>
    </section>
  );
}
render(
  () => (
    <main class="mx-auto max-w-5xl p-4">
      <h1 class="mb-4 text-lg font-semibold">Business controls</h1>
      <BusinessControlsDemo />
      <AsyncFormFixture />
    </main>
  ),
  document.getElementById('root')!
);
