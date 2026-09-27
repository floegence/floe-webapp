import { createSignal } from 'solid-js';
import { render } from 'solid-js/web';
import { Button } from '../../src/components/ui/Button';
import { StableText } from '../../src/components/ui/StableText';
import { StatusRegion } from '../../src/components/ui/StatusRegion';
import { Refresh } from '../../src/components/icons';
import { MarkdownMedia } from '../../src/components/chat/blocks/MarkdownMedia';
import '../../src/styles/globals.css';

function Fixture() {
  const [loading, setLoading] = createSignal(false);
  const labels = { image: 'Image', video: 'Video', audio: 'Audio', html: 'HTML', loading: 'Loading', unavailable: 'Unavailable', retry: 'Retry', expand: 'Expand', collapse: 'Collapse', open: 'Open', close: 'Close' };
  const resolveMedia = async () => {
    await new Promise<void>(resolve => { (window as unknown as { resolveMedia: () => void }).resolveMedia = resolve; });
    return { src: '/test-image.svg' };
  };
  return <main class="p-4" style={{ width: 'min(100%, 600px)' }}>
    <button onClick={() => setLoading(!loading())}>Toggle pending</button>
    <div data-actions class="flex flex-wrap justify-end gap-2">
      <Button data-case="plain" loading={loading()}>Save</Button>
      <Button data-case="manual" loading={loading()}><Refresh class="h-3.5 w-3.5" />Refresh</Button>
      <Button data-case="icon" icon={Refresh} loading={loading()}>Refresh</Button>
      <Button data-case="neighbor">Cancel</Button>
    </div>
    <div data-case="labels" class="flex flex-wrap gap-2">
      <Button loading={loading()}><StableText reserve={['刷新', '正在刷新模型目录…']}>{loading() ? '正在刷新模型目录…' : '刷新'}</StableText></Button>
      <Button><StableText reserve={['Umgebungskennung kopieren', 'Kopiert']}>{loading() ? 'Kopiert' : 'Umgebungskennung kopieren'}</StableText></Button>
    </div>
    <div data-case="constrained-labels" class="flex gap-2">
      <Button data-label-alignment="fixed" size="sm" icon={Refresh} class="w-28">
        <StableText reserve={['启动', '正在设置编辑器…']}>启动</StableText>
      </Button>
      <Button data-label-alignment="wrapped" size="sm" icon={Refresh} loading={loading()} class="w-28 h-auto py-2">
        <StableText reserve={['启动', '正在设置编辑器…']}>{loading() ? '正在设置编辑器…' : '启动'}</StableText>
      </Button>
    </div>
    <StatusRegion data-case="feedback" class="text-xs" lines={2}>{loading() ? 'A long recoverable error. '.repeat(30) : ''}</StatusRegion>
    <p data-case="feedback-neighbor">Content after feedback</p>
    <section data-media>
      <MarkdownMedia labels={labels} source={{ kind: 'image', src: '/test-image.svg', title: 'Delayed portrait' }} resolve={resolveMedia} />
      <p data-media-neighbor>Following content</p>
    </section>
  </main>;
}
render(Fixture, document.getElementById('root')!);
