import { createSignal, For } from 'solid-js';
import { render } from 'solid-js/web';
import { builtInShellThemePresets } from '@floegence/floe-webapp-core';
import './comparison.css';
const query = new URLSearchParams(location.search);
function Comparison() {
  const [theme, setTheme] = createSignal(query.get('theme') ?? 'paper');
  const [sample, setSample] = createSignal(query.get('sample') ?? 'regions');
  const [object, setObject] = createSignal(query.get('object') ?? 'blank-region');
  const [tools, setTools] = createSignal(query.get('tools') ?? 'style');
  const [scale, setScale] = createSignal(query.get('scale') ?? '.8');
  const [layout, setLayout] = createSignal('split');
  const [reset, setReset] = createSignal(0);
  const options = () =>
    sample() === 'regions'
      ? [
          ['blank-region', '空白区域'],
          ['field-region', '色块区域'],
          ['outline-region', '轮廓区域'],
          ['idea', '便笺'],
          ['board-title', '标题文字'],
          ['field-detail', '正文文字'],
        ]
      : [
          ['principle', '柔彩便笺'],
          ['next', '侧签便笺'],
          ['reference', '横线便笺'],
          ['product', '色块区域'],
          ['delivery', '轮廓区域'],
          ['board-title', '标题文字'],
          ['board-subtitle', '正文文字'],
        ];
  const search = () =>
    new URLSearchParams({
      theme: theme(),
      sample: sample(),
      object: object(),
      tools: tools(),
      scale: scale(),
      lang: 'zh-CN',
      scene: 'composition',
      design: 'proposed',
      reset: String(reset()),
    }).toString();
  return (
    <>
      <header>
        <strong>
          Workbench <span>A/B 验收</span>
        </strong>
        <nav>
          <label>
            主题
            <select value={theme()} onChange={(e) => setTheme(e.currentTarget.value)}>
              <For each={builtInShellThemePresets}>
                {(p) => <option value={p.name}>{p.displayName}</option>}
              </For>
            </select>
          </label>
          <label>
            场景
            <select
              value={sample()}
              onChange={(e) => {
                setSample(e.currentTarget.value);
                setObject(e.currentTarget.value === 'regions' ? 'blank-region' : 'principle');
              }}
            >
              <option value="regions">区域</option>
              <option value="composition">组合画布</option>
            </select>
          </label>
          <label>
            对象
            <select value={object()} onChange={(e) => setObject(e.currentTarget.value)}>
              <For each={options()}>{(o) => <option value={o[0]}>{o[1]}</option>}</For>
            </select>
          </label>
          <label>
            缩放
            <select value={scale()} onChange={(e) => setScale(e.currentTarget.value)}>
              <option value=".35">35%</option>
              <option value=".8">80%</option>
              <option value="1">100%</option>
            </select>
          </label>
          <button onClick={() => setTools(tools() ? '' : 'style')}>
            {tools() ? '收起材质' : '展开材质'}
          </button>
          <button onClick={() => setReset((n) => n + 1)}>重置</button>
        </nav>
      </header>
      <div class="review-bar">
        <div class="views">
          <For
            each={[
              ['split', '并排对比'],
              ['reference', 'A · 原 Demo'],
              ['library', 'B · Floe 组件'],
            ]}
          >
            {(v) => (
              <button aria-pressed={layout() === v[0]} onClick={() => setLayout(v[0])}>
                {v[1]}
              </button>
            )}
          </For>
        </div>
        <span>点击文字直接编辑 · 拖动手柄移动 · 空格＋拖动平移</span>
        <a href={'/workbench-composition.html?' + search()} target="_blank">
          单独打开 Floe 示例 ↗
        </a>
      </div>
      <main data-layout={layout()}>
        <section class="reference">
          <h2>
            A <span>已确认的 Demo v4.1</span>
            <small>保留原始设计</small>
          </h2>
          <iframe title="A 原始设计" src={'/workbench-reference/embed.html?' + search()} />
        </section>
        <section class="library">
          <h2>
            B <span>Floe Webapp 正式组件</span>
            <small>当前 worktree · 可实际编辑</small>
          </h2>
          <iframe title="B Floe 组件" src={'/workbench-composition.html?' + search()} />
        </section>
      </main>
    </>
  );
}
render(() => <Comparison />, document.getElementById('root')!);
