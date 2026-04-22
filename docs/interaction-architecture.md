# 交互架构与实现规范

> 目标：把 Floe Webapp 的点击、页面切换、overlay 打开/关闭、拖拽、resize 等交互统一到一套可复用、可审计、可持续演进的实现规范里，并通过工程守卫防止后续组件回退到“局部补丁式”实现。

## 1. 问题定义

当前项目历史上存在三类容易让交互发涩的模式：

1. 高频几何交互（拖拽 / resize）直接驱动响应式全局状态或持久化状态，导致每帧都触发大范围重算。
2. 热路径表面带有 `transition-all`、`transition-[width]` 等布局动画，拖动时出现明显追手。
3. 点击 / 打开页面 / overlay 切换时，UI 视觉变化和宿主逻辑耦合在同一事件栈里，导致“按钮按下了，但界面晚一拍”。

这三类问题本质上都来自同一个架构缺陷：

- 热路径没有和低频业务状态分层。

## 2. 核心原则

### 2.1 UI first

任何交互都必须先让用户看见界面变化，再执行可能更重的逻辑。

标准做法：

- 同步执行：选中态、折叠态、打开/关闭 overlay、optimistic active tab。
- `deferAfterPaint()`：需要等一帧后再执行的宿主回调、focus restore、测量类逻辑。
- `deferNonBlocking()`：不要求紧跟首帧、但不能阻塞当前点击栈的逻辑。

禁止：

- 在 click / keydown 主路径里直接做重过滤、重布局、网络调用、复杂树更新。

### 2.2 热路径与提交态分离

所有拖拽 / resize / 跟手动画都必须区分两层状态：

- `preview/live state`：仅服务于当前交互帧，允许使用局部 signal、局部变量、DOM imperative style。
- `committed state`：交互结束后再写入 context/store/persist 的状态。

标准做法：

- 拖拽/resize 过程中：更新 preview/live state。
- pointerup / cancel：一次性 commit 到 store/context。

禁止：

- 在每一帧 pointermove 里直接写持久化状态。
- 在每一帧 pointermove 里触发跨 shell/跨 provider 的大范围响应式更新，除非没有更小的局部承载面。

### 2.3 热表面只允许“反馈动画”，不允许“几何追手动画”

热表面包括但不限于：

- Shell sidebar
- FileBrowser sidebar pane
- FloatingWindow
- 未来任何可拖拽 / 可 resize 的容器

规则：

- 几何属性（`width` / `height` / `left` / `top` / `transform`）在热交互期间不能再叠加 transition。
- 允许保留颜色、阴影、透明度等低成本反馈动画。
- 统一通过 `data-floe-hot-interaction` + `data-floe-geometry-surface` 约束热交互期间的 motion 行为。
- 对于 shell-owned page boundary 切换，如果产品要求某一次 sidebar 显隐直接完成而不是播放宽度动画，应使用 shared one-shot `visibilityMotion` contract，而不是在下游页面里长期关闭 sidebar transition。

禁止：

- 在热表面上使用无约束的 `transition-all`。
- 在可 resize 面板上长期保留 `transition-[width]`，但又不提供热交互时的禁用机制。

### 2.4 overlay 语义统一

所有 modal / drawer / command palette 都要共用统一遮罩契约：

- 滚动阻断
- Escape 关闭
- hotkey 阻断
- focus trap / restore focus
- auto focus 策略

标准做法：

- 一律优先复用 `useOverlayMask()`。
- 如果 floating overlay 必须保留极少数 shell 级快捷键，使用 `useOverlayMask()` 的 allowlist 放行明确 keybind；不要在产品层零散重写键盘桥接。
- 如果 overlay 由 deck cell、workbench widget、floating window 这类局部 surface 打开，必须优先挂到最近的 overlay host，而不是默认逃逸到整个 viewport。

禁止：

- 新 overlay 自己重新拼 document 监听和 body lock。
- 打开 overlay 后仍让背景滚动和全局快捷键穿透。

### 2.5 可访问性也是共享交互契约的一部分

交互实现不能只追求“能点开”，还必须保证键盘、焦点、landmark 与播报语义一致。

共享层负责的内容：

- Shell landmark 命名、skip link、主内容 focus target
- Tabs / MobileTabBar 的 roving tabindex 与 Arrow/Home/End 导航
- Dropdown 的 menu-button 语义与菜单内焦点遍历
- notification / disclosure 等共享组件的 live-region 与展开语义

下游业务层负责的内容：

- 业务表单 label、help/error 关联
- 业务自定义 widget 的可见焦点与键盘闭环
- 领域语义命名，而不是在共享组件外层再包一层临时 `role` 补丁

结论：

- 优先把可访问性放进共享 primitive / contract。
- 禁止在下游页面里用零散的 ARIA patch 掩盖基础组件缺陷。

## 3. 本次落地的统一约束

### 3.1 共享运行时

- `packages/core/src/utils/hotInteraction.ts`
  - 提供 `startHotInteraction()`
  - 统一维护 `data-floe-hot-interaction`
  - 统一处理拖拽/resize 期间的 cursor 与 `user-select`

### 3.2 共享样式约束

- `packages/core/src/styles/floe.css`
  - 统一定义 `data-floe-geometry-surface`
  - 在热交互期间禁用热表面的 animation/transition

### 3.3 preview / commit 分层

- Shell sidebar：拖动时只改本地 preview width，结束后再写 `LayoutContext`
- FileBrowser sidebar：拖动时只改本地 preview width，结束后再写 `FileBrowserContext`
- FloatingWindow：拖拽/resize 期间直接写 DOM 几何，结束后再 commit 到 signal
- Deck：drag / resize 必须通过共享 `deckPointerSession` 维护一次 pointer session；drag 期间 drop preview 维护唯一的 snapped `currentPosition` 作为 collision / commit 真相，而 dragged widget 允许通过“snapped anchor + residual motion overlay”连续跟手，release 时只允许这份 snapped truth 进入 commit
- NotesOverlay：note drag 只更新 note-local preview 坐标，pointerup 后再 `updateNote()`
- NotesOverlay：minimap / overview navigation 只更新本地 viewport preview，release 后再 `setViewport()`

### 3.4 组件必须遵守的实现规范

新增或重构组件时，必须遵守以下规范：

1. 可拖拽 / 可 resize 组件必须声明自己的几何表面：`data-floe-geometry-surface="..."`
2. 任何热交互必须复用 `startHotInteraction()`，不能各自手写 body cursor lock
3. 任何 overlay 必须优先使用 `useOverlayMask()`
4. 任何 UI-first 行为必须先更新视觉状态，再 defer 宿主逻辑
5. 任何热路径组件禁止直接使用无约束的 `transition-all`
6. 如果组件确实需要布局动画，必须证明该动画不会和热交互同时发生，或者必须受 `data-floe-hot-interaction` 保护
7. 对于 shell-owned sidebar 的单次显隐切换，如果产品想禁用该次 width motion，必须通过 shared `visibilityMotion` contract，而不是添加产品私有 class hack
8. 像 Notes 数字复制这类“依赖 overlay 语义 + 焦点/输入状态 + 共享视觉反馈”的键盘 affordance，必须收敛在 shared overlay boundary 中统一判定，不允许在下游产品层通过 DOM decorate + document 监听重复实现

### 3.5 Freeform pointer-session contract

`InfiniteCanvas` / workbench widget / workbench filter bar 这类自由几何交互必须复用共享 pointer session：

1. `packages/core/src/components/ui/pointerSession.ts` 是自由几何 drag / resize / pan 的共享 pointer lifecycle 入口；各组件只能保留自己的几何计算，不能各自手写完整 teardown 逻辑。
2. Pointer session 必须统一覆盖 `document` capture 阶段的 `pointermove` / `pointerup` / `pointercancel`，并额外监听 `lostpointercapture`、`window.blur`、`document.visibilitychange`。
3. `pointermove` 必须验证主按钮仍处于按下态；当用户在浏览器窗口外松开鼠标后重新进入页面，`event.buttons === 0` 必须立即收敛为一次结束信号，不能继续沿用旧 drag state。
4. `pointer capture` 只能作为增强能力，不能作为唯一正确性来源；即使 capture 设置失败，document capture listeners 仍必须保证 session 可结束。
5. 禁止用 `mouseleave` / `mouseout` 作为 drag 的主要结束条件，因为合法拖拽本来就可能跨过元素边界；终止 authority 必须来自 pointer lifecycle 与按钮状态，而不是几何边界。

结论：

- 自由几何表面的拖拽状态必须能自证仍然有效。
- “窗口外松手”不能让 UI 留在 hot interaction / grabbing / panning 状态。
- 下游业务仓库需要这类能力时应消费该共享 session，而不是复制一份本地事件监听器。

### 3.6 Deck pointer-session contract

Deck 的几何交互必须额外遵守下面三条共享约束：

1. `packages/core/src/components/deck/deckPointerSession.ts` 是 Deck drag / resize 的单一 pointer lifecycle 入口；`pointer capture` 只是增强能力，不能作为唯一正确性来源。
2. Deck pointer session 必须统一覆盖 `document` capture 阶段的 `pointermove` / `pointerup` / `pointercancel`，并额外监听 `lostpointercapture`，保证指针跨过其它 widget、复杂 surface 或浏览器重定向事件链时仍能稳定结束。
3. Drag 渲染必须坚持 one commit truth：
   - `DropZonePreview` 独占 snapped `currentPosition`，它是唯一的 collision / commit 候选落位
   - dragged widget 允许渲染为 anchored floating overlay，但 anchor 必须跟随 snapped `currentPosition`，只把 pointer residual 留给视觉 affordance
   - 禁止让 dragged widget 再参与第二份独立的 grid layout truth；视觉 overlay 不能绕过 snapped preview 自行决定最终 commit

结论：

- Deck 是离散网格表面，不是自由画布。
- 一旦交互已经吸附到某个 grid slot，UI 就必须让用户看到这就是当前唯一候选落位。
- 连续跟手只能服务于拖拽感知，不能演变成第二套布局真相。

### 3.7 文件浏览浮层与几何交互

文件浏览的框选与右键菜单，必须遵守下面两条共享契约：

1. marquee 命中检测使用 viewport rect，但视觉 overlay 必须先投影到当前 overlay host 的本地坐标系，再以容器内 `absolute` 方式渲染。
2. 禁止继续假设 `fixed` 永远跟 viewport 同步；一旦承载面处于 transformed surface（例如 floating window），`fixed` 子元素就可能转为局部 containing block，视觉会和鼠标脱离。
3. 像 tabs indicator、selection rail 这类容器内 `absolute` affordance，如果宿主可能处于 transformed surface，测量必须优先使用宿主本地布局坐标（例如 `offsetLeft` / `offsetWidth`），不能把 `getBoundingClientRect()` 的屏幕坐标直接回写到局部坐标系。
4. context menu 的 outside-dismiss 必须使用 `pointerdown capture`，而不是依赖兼容性的 `mousedown`。
5. context menu 的关闭口径必须统一覆盖 outside pointer、Escape、scroll、resize，避免不同承载面出现“菜单挂住”的分叉行为。

结论：

- 框选的“命中坐标系”和“渲染坐标系”必须显式分层。
- 右键菜单的关闭判定必须先于空白区自己的手势逻辑触发。

### 3.8 局部 dialog surface contract

当 dialog 由局部工作表面触发时（例如 deck widget、workbench widget、floating window），必须遵守同一套局部弹窗契约。`Dialog`、`FileContextMenu`、`Dropdown` 这类 portal overlay 现在共用同一套 surface portal scope：都依赖最近一次 `pointerdown capture` / `focusin` 交互快照回溯最近的局部 host，而不是各自发明一份 host 解析逻辑。

1. 局部宿主节点显式声明 `data-floe-dialog-surface-host="true"`。
2. 如需把 overlay 挂到非 transform 的宿主上，局部 surface layer 显式声明 `data-floe-surface-portal-layer="true"`。
3. overlay 打开时优先根据最近一次 `pointerdown capture` / `focusin` 交互快照，先回溯 `boundaryHost`，再继续解析最近的 `surface portal layer` 作为 `mountHost`；禁止再把这两层语义混成一个 host。
4. 找到局部 host 时，overlay 必须以局部 surface 模式挂载：
   - `boundaryHost` 负责局部关闭、局部 Escape、clamp boundary 等语义边界
   - `Portal mount={mountHost}`，其中 `mountHost` 必须是非 transform 的 overlay layer（若 boundary 本身安全，也可由同一节点同时承担两种角色）
   - modal root / menu panel 使用 client/screen 坐标作为视觉真相，再投影到 `mountHost` 的本地坐标系
   - menu / dropdown / submenu 必须先按 viewport rect 计算目标位置，再把坐标投影到当前 `mountHost` 的本地坐标系，而不是再直接减 `boundaryHost.left/top`
   - overlay root 显式声明 `data-floe-local-interaction-surface="true"`
   - dialog 自身使用 `data-floe-dialog-surface-boundary`
5. 局部 dialog 的 backdrop 点击只在当前宿主内部关闭；点击其它 widget、其它 surface、页面其它区域不自动关闭。
6. 局部 dialog 的 `Escape` 只允许由当前 dialog boundary 内的事件 target / activeElement 响应，不能跨 surface 误关其它组件。
7. 承载 `InfiniteCanvas` / workbench / notes board 这类外层手势表面，必须把 `data-floe-local-interaction-surface="true"` 视为“局部交互面”，pointer / wheel / contextmenu 都必须优先让权，不能再从 dialog 内部抢走 pan / zoom / canvas menu。
8. 局部 dialog 不锁整个 body scroll，但仍要阻断 dialog 内按键向全局热键穿透。
9. 没有局部 host 时必须自动回退为全局 modal 语义，不能留下半局部、半全局的漂移状态。

补充约束：

- `context menu` / `dropdown` 的主菜单与子菜单都必须复用同一个 surface portal scope；不能主菜单挂在 host、子菜单又重新逃回 `document.body`。
- 局部菜单的 outside-dismiss 仍然要走 `pointerdown capture`，但“菜单内部点击是否算 inside”必须以显式菜单根边界为准，而不是靠 DOM 祖先偶然还在原 surface 下面。
- 任何业务组件如果声明自己依赖局部 overlay，就应优先复用共享 surface portal scope，而不是在下游仓库临时硬编码 `Portal mount` 和坐标减法。

### 3.9 浮窗 local surface contract

当 `FloatingWindow` 被渲染在 `InfiniteCanvas` / workbench / 其它外层手势表面之上时，必须额外遵守下面两条共享契约：

1. 浮窗的几何根节点与可见表面都要显式声明 `data-floe-local-interaction-surface="true"`。
2. 几何根节点必须覆盖 resize handles 等不在可见内容面板内部的热区，避免这些热区因为 DOM 结构在表面边界外侧而重新落回 canvas 手势。
3. 这样做不是为了“兼容某个页面特判”，而是为了覆盖 portal + delegated events 的统一运行时事实：即使浮窗 DOM 被 portal 到 `document.body`，上层交互容器仍可能通过事件委托看见这次 `pointerdown`，所以浮窗必须自己声明“我是局部交互面”。
4. 任何 app-owned wrapper 都只能做薄适配；共享 `FloatingWindow` 本身仍然是这条契约的单一事实来源。

### 3.10 Canvas wheel ownership contract

`InfiniteCanvas` / workbench / notes board 这类可缩放画布必须把 wheel ownership 当成一条**独立契约**，不能直接复用 pointer / contextmenu 的 local-surface 判定。

规则如下：

1. `data-floe-canvas-interactive="true"` 只表示 pointer / focus / contextmenu 需要让权给局部交互，不自动表示该区域消费 wheel。
2. 普通 widget 内容、note body、按钮式壳层等**不消费 wheel** 的区域，应继续允许 canvas 在鼠标位置做 anchor-preserving zoom。
3. 只有下面三类区域才应拦截 wheel，阻止 canvas zoom：
   - typing / editing 元素；
   - `data-floe-local-interaction-surface="true"` 局部 overlay / dialog / floating surface；
   - 显式声明 `data-floe-canvas-wheel-interactive="true"` 的局部 wheel consumer（例如 scroller、editor viewport、terminal viewport）。
4. 锁定态下，如果当前目标不是局部 wheel consumer，wheel 结果应是 `ignore`，而不是偷偷把普通区域也当成 local surface。
5. 共享 helper 必须返回可解释的 wheel routing decision，而不是只靠布尔值散落在各组件里。
6. workbench / notes 这类带程序化导航的画布，必须把 `direct manipulation`（wheel / pan）与 `programmatic navigation` 明确分层：一旦用户开始直接操控 viewport，程序化导航动画必须立刻让权，禁止两者并行争抢 viewport authority。

### 3.10 Projected workbench surfaces contract

当 workbench widget 承载 Monaco、terminal、iframe、rich preview 等“不能安全挂在 CSS scale 祖先里”的业务 DOM 时，必须切换到 projected surface contract：

1. widget definition 显式声明 `renderMode: 'projected_surface'`。
2. projected widget 仍然使用相同的 world-space `x / y / width / height / z_index` 持久化模型，禁止改存 screen-space rect。
3. `InfiniteCanvas` 必须提供 live viewport overlay 能力，让 projected widget 在 pan / zoom 过程中继续跟随实时 viewport，而不是只依赖节流后的 committed viewport。
4. projected widget 的可见几何必须来自共享 projected rect helper，禁止在下游各自手写 `x * scale + offset` 公式。
5. rich widget body 必须通过 `surfaceMetrics` 感知自己的 projected rect 与 ready 状态，而不是自行猜测 mount host 是否稳定。
6. projected surface 只解决“业务 DOM 不再处于 canvas scale transform 祖先”这个架构问题；selection、focus、fronting、drag、resize、context menu、persisted geometry 仍然保持 workbench 统一契约。
7. 下游产品如果需要特殊的 wheel / focus / hotkey ownership，只能通过 `WorkbenchSurface` 的 `interactionAdapter` 做薄适配，禁止重新 fork 一套 canvas / widget / surface 壳层。
8. 如果 widget body 需要根据 shell 状态做 pause/resume、placeholder 或懒加载判断，应直接消费共享 `WorkbenchWidgetBodyProps` 里的 `selected` / `filtered` / `lifecycle` / `requestActivate()`，禁止下游重新 fork widget shell 只为了补这些 host hints。

结论：

- world model 和 pixel-space host 必须显式分层。
- rich widget 不能再依赖 canvas transform 祖先承担 DOM runtime 几何。

### 3.11 Workbench selection / navigation contract

workbench 的选择态、导航态与菜单关闭态必须保持在共享模型里，而不是由下游产品各自手写一份相近但不一致的 canvas math。

规则如下：

1. `selectedWidgetId` 仍然是 persisted workbench state 的唯一选择态字段；不新增 transient wheel / pointer state 到持久化结构。
2. 共享 surface API 必须显式提供 `clearSelection()`，让下游在“点击空白画布”等产品语义下清空选择态，而不是伪造 widget focus。
3. `focusWidget(...)` 保留 center-only 语义，用于 shell activation、keyboard navigation、ensure-widget 等不应改变 zoom level 的入口。
4. `fitWidget(...)` 表示“将 widget 完整 fit 到当前 viewport”，必须通过共享 helper 计算目标 scale 与中心点，禁止下游重复手写公式。
5. `overviewWidget(...)` 表示“将 widget 置中并回到最小 canvas scale”，用于从局部工作状态回到全局空间感。
6. context menu root 必须声明显式菜单边界；outside-dismiss 使用 `pointerdown capture`，并统一覆盖 Escape、scroll、resize。
7. backdrop 只能参与视觉遮罩和右键 retarget，不应再依赖 backdrop `click` 作为唯一关闭机制，否则 transformed / portal 场景下容易抢走 menu item click。
8. 任何 `focus / fit / overview` 这类程序化 viewport 动画，如果遇到用户 `wheel / pan` 直接操控，必须立即取消；不要再让 `live viewport` 与导航动画互相覆盖。

结论：

- 选择态仍然是共享 workbench state 的一部分。
- wheel ownership 可以由下游产品根据业务 widget 边界做薄适配，但 viewport navigation math 必须复用共享 helper。

### 3.12 Monaco standalone runtime contract

`CodeEditor` 这类共享 surface 不允许再假设所有 standalone service 都应无条件加载。

规则如下：

1. Monaco standalone runtime 必须以 feature set 维度缓存，而不是“一次性全量导入后全局复用”。
2. preview / readonly surface 应该通过 `runtimeOptions.standaloneFeatures` 显式关闭不需要的 optional service。
3. richer editor surface 可以继续使用默认 feature set，但默认值必须集中在共享 runtime helper 中维护。
4. runtime loader 失败后必须允许同一 feature set 重试，不能把失败状态永久缓存。
5. 共享测试必须覆盖：默认 runtime、最小 preview runtime、以及不同 feature set 的独立缓存行为。

## 4. 工程化防回退手段

### 4.1 源码守卫测试

新增测试：

- `packages/core/test/interaction-architecture-guard.test.ts`

职责：

- 校验共享运行时与共享样式约束存在
- 校验热表面文件挂上 `data-floe-geometry-surface`
- 校验关键交互组件复用 `startHotInteraction()`
- 校验移动端 tab 选择不再被 defer 到下一 task
- 校验 Notes overlay 继续复用 `useOverlayMask()`，且仍保持 preview / commit 分层
- 校验规范文档本身存在并纳入 docs 索引

### 4.2 文档约束

- 对外文档新增本文件，作为交互实现的单一事实来源。
- README / docs 索引同步收录，避免规范只存在于临时说明里。
- 可访问性契约另见 `docs/accessibility.md`，作为 shared primitives 与 downstream 责任边界的正式说明。

### 4.3 API 约束

- `ResizeHandle` 提供 `onResizeStart` / `onResizeEnd`，强制消费方可以显式处理 preview / commit 分层。
- `LayoutContext` / `FileBrowserContext` 暴露 `clampSidebarWidth()`，防止各处重复写 clamp 细节。

## 5. 详细落地 checklist

### 5.1 基础设施

- [x] 新增 `hotInteraction` 共享运行时
- [x] 新增热交互 data attribute 与统一样式约束
- [x] 为 sidebar/file-browser 暴露统一 clamp 能力
- [x] 扩展 `ResizeHandle` 生命周期回调

### 5.2 布局与 overlay

- [x] Shell sidebar 改成 preview width -> commit width
- [x] Shell mobile drawer 接入 `useOverlayMask`
- [x] Sidebar / SidebarPane 标记几何表面
- [x] 热交互期间禁用 sidebar 类表面的几何 transition

### 5.3 浮层与窗口

- [x] FloatingWindow 改成 DOM imperative geometry + end commit
- [x] FloatingWindow 复用共享 hot interaction 运行时
- [x] CommandPalette 统一走 `useOverlayMask` autofocus
- [x] Dialog 支持基于 overlay host 的局部 surface mount
- [x] 新增共享 surface portal scope，统一局部 host 解析与局部坐标投影
- [x] FileContextMenu / Dropdown / submenu 复用共享 surface portal scope
- [x] FloatingWindow / DeckCell / WorkbenchWidget 显式声明 dialog surface host
- [x] 局部 dialog 的 backdrop / Escape 语义收敛到共享 contract

### 5.4 Notes overlay

- [x] NotesOverlay 根层接入 `useOverlayMask`
- [x] Notes note drag 改成 note-local preview -> release commit
- [x] Notes minimap / overview navigation 改成 local viewport preview -> release commit
- [x] Notes hot surfaces 标记 `data-floe-geometry-surface` 并接入共享热交互防护
- [x] Notes 数字编号 / digit-copy 统一收敛到 shared overlay model + overlay-wide key capture，避免下游重复接管快捷键语义

### 5.5 拖拽 / resize 统一

- [x] Layout `ResizeHandle` 复用共享 hot interaction
- [x] Deck drag / resize 收敛到共享 `deckPointerSession`，并补齐 document-level release fallback
- [x] FileBrowser drag 复用共享 hot interaction
- [x] FileBrowser global drag context 统一管理拖拽光标状态

### 5.6 点击 / 页面切换

- [x] MobileTabBar 改为同步更新 UI-owned selection
- [x] ActivityBar / MobileTabBar 的热按钮去掉 `transition-all`
- [x] 仅保留颜色/transform 等低成本反馈动画

### 5.7 工程守卫

- [x] 新增交互架构守卫测试
- [x] README / docs 索引更新
- [x] 方案文档入库

## 6. 后续新增组件时的操作模板

当新增一个有交互的组件时，必须按下面顺序设计：

1. 判断该交互是“点击类”还是“热几何类”还是“overlay 类”。
2. 点击类：先同步 UI，再 `deferAfterPaint` / `deferNonBlocking` 调宿主逻辑。
3. 热几何类：先设计 preview/live state，再设计 pointerup commit。
4. 如果组件本身会被拖拽/resize，挂 `data-floe-geometry-surface`。
5. 如果组件是 overlay，先接 `useOverlayMask()`，再补视觉样式。
6. 写完后补守卫测试，至少证明：
   - 共享契约被复用
   - 没有新增 `transition-all` 热表面
   - 没有把重逻辑塞回交互热路径

## 7. 验收标准

满足以下条件才算达标：

- 侧边栏拖动不再出现明显追手
- FloatingWindow 拖拽与 resize 明显更接近 code-server 的直接跟手感
- 移动端 tab / 页面切换反馈更即时
- mobile drawer 不再滚动穿透 / hotkey 穿透
- 关键交互规范有文档、有代码、有测试守卫，而不是只有一次性修复
