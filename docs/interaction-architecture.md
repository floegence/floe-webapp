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

### 3.5 文件浏览浮层与几何交互

文件浏览的框选与右键菜单，必须遵守下面两条共享契约：

1. marquee 命中检测使用 viewport rect，但视觉 overlay 必须先投影到当前 overlay host 的本地坐标系，再以容器内 `absolute` 方式渲染。
2. 禁止继续假设 `fixed` 永远跟 viewport 同步；一旦承载面处于 transformed surface（例如 floating window），`fixed` 子元素就可能转为局部 containing block，视觉会和鼠标脱离。
3. context menu 的 outside-dismiss 必须使用 `pointerdown capture`，而不是依赖兼容性的 `mousedown`。
4. context menu 的关闭口径必须统一覆盖 outside pointer、Escape、scroll、resize，避免不同承载面出现“菜单挂住”的分叉行为。

结论：

- 框选的“命中坐标系”和“渲染坐标系”必须显式分层。
- 右键菜单的关闭判定必须先于空白区自己的手势逻辑触发。

### 3.6 局部 dialog surface contract

当 dialog 由局部工作表面触发时（例如 deck widget、workbench widget、floating window），必须遵守同一套局部弹窗契约：

1. 局部宿主节点显式声明 `data-floe-dialog-surface-host="true"`。
2. `Dialog` 打开时优先根据最近一次 `pointerdown capture` / `focusin` 交互快照，回溯最近的 overlay host。
3. 找到局部 host 时，dialog 必须以局部 surface 模式挂载：
   - `Portal mount={host}`
   - overlay root / backdrop 使用局部 `absolute inset-0`
   - overlay root 显式声明 `data-floe-local-interaction-surface="true"`
   - dialog 自身使用 `data-floe-dialog-surface-boundary`
4. 局部 dialog 的 backdrop 点击只在当前宿主内部关闭；点击其它 widget、其它 surface、页面其它区域不自动关闭。
5. 局部 dialog 的 `Escape` 只允许由当前 dialog boundary 内的事件 target / activeElement 响应，不能跨 surface 误关其它组件。
6. 承载 `InfiniteCanvas` / workbench / notes board 这类外层手势表面，必须把 `data-floe-local-interaction-surface="true"` 视为“局部交互面”，pointer / wheel / contextmenu 都必须优先让权，不能再从 dialog 内部抢走 pan / zoom / canvas menu。
7. 局部 dialog 不锁整个 body scroll，但仍要阻断 dialog 内按键向全局热键穿透。
8. 没有局部 host 时必须自动回退为全局 modal 语义，不能留下半局部、半全局的漂移状态。

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
- [x] Deck drag / resize 复用共享 hot interaction
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
