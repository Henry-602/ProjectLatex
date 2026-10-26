/* ============================================================
   LaTeX 公式助手 — application logic
   Single-file friendly: depends only on global `katex`
   ============================================================ */
(function () {
  'use strict';

  /* ---------------- tiny helpers ---------------- */

  const $ = (sel, root) => (root || document).querySelector(sel);
  const $$ = (sel, root) => Array.from((root || document).querySelectorAll(sel));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, n));

  function el(tag, cls, text) {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text != null) node.textContent = text;
    return node;
  }

  const ESC_MAP = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
  const escapeHtml = (s) => String(s).replace(/[&<>"']/g, (c) => ESC_MAP[c]);

  function debounce(fn, ms) {
    let t = null;
    return function () {
      const args = arguments;
      clearTimeout(t);
      t = setTimeout(() => fn.apply(null, args), ms);
    };
  }

  const uid = () => 'ex' + Math.random().toString(36).slice(2, 9);
  const pad2 = (n) => String(n).padStart(2, '0');

  function scrollSafe(node, opts) {
    try { if (node && node.scrollIntoView) node.scrollIntoView(opts); } catch (e) { /* jsdom */ }
  }

  /* ---------------- constants ---------------- */

  const STORE_KEY = 'latex-helper.v1';
  const CUSTOM_CAT = '自定义';

  // Display-math environments that are legal at top level in a real document.
  const DISPLAY_ENVS = ['align', 'align*', 'gather', 'gather*', 'equation', 'equation*', 'flalign', 'flalign*'];
  // Environments that must be inside $...$ in a real document.
  const MATH_ONLY_ENVS = [
    'cases', 'dcases', 'rcases', 'matrix', 'pmatrix', 'bmatrix', 'Bmatrix',
    'vmatrix', 'Vmatrix', 'smallmatrix', 'array', 'subarray',
    'aligned', 'alignedat', 'gathered', 'split'
  ];

  const KATEX_BASE = { throwOnError: true, strict: false, trust: true };

  const DEFAULT_STATE = {
    mode: 'formula',
    formula: '',
    exercises: [{ id: 'ex1', num: '1', tex: '', preview: false }],
    theme: 'auto',
    bg: { image: null, opacity: 0.45, blur: 8 },
    pair: true,
    autoWrap: true,
    smartDollar: true,
    export: { bracket: 'paren-en', sep: 'blank', wrap: 'none', nbsp: false },
    split: 0.44,
    paletteCat: '常用',
    paletteOpen: false,
    custom: [],
    layoutV: 2
  };

  const SEP_OPTIONS = [
    { id: 'blank', label: '空行', note: '最通用：留一个空行另起段落，任何文档都能编译。' },
    { id: 'par', label: '\\par', note: '显式分段命令，效果同空行。' },
    { id: 'newline', label: '\\newline', note: '强制换行但不分段，正文中可用，行距紧凑。' },
    { id: 'dblslash', label: '\\\\', note: '最紧凑；只在表格、数学、align 等环境内合法，正文直接用会报错。' },
    { id: 'dblslash-em', label: '\\\\[0.5em]', note: '紧凑换行并额外留 0.5em 行距；同样需要表格或数学环境。' },
    { id: 'backslash', label: '\\', note: '在除最后一行外的每行末尾加一个反斜杠；这是 Markdown 的硬换行写法，LaTeX 里请用 \\\\。' },
    { id: 'medskip', label: '\\medskip', note: '先分段，再插入约 6pt 的竖直间距；正文中可用。' },
    { id: 'bigskip', label: '\\bigskip', note: '先分段，再插入约 12pt 的竖直间距；正文中可用。' },
    { id: 'vspace', label: '\\vspace{1em}', note: '先分段，再留 1em 竖直间距；正文中可用。' },
    { id: 'enumerate', label: 'enumerate', note: '输出列表环境并自动编号，题号作为 \\item 标签。' }
  ];

  const BRACKET_OPTIONS = [
    { id: 'paren-en', label: '(1)', note: '西文圆括号 · 后加空格' },
    { id: 'paren-cn', label: '（1）', note: '中文圆括号 · 紧排' },
    { id: 'bracket-en', label: '[1]', note: '西文方括号 · 后加空格' },
    { id: 'bracket-cn', label: '【1】', note: '中文方括号 · 紧排' },
    { id: 'dot', label: '1.', note: '数字加点 · 后加空格' },
    { id: 'dun', label: '1、', note: '中文顿号 · 紧排' },
    { id: 'none', label: '—', note: '不输出题号' }
  ];

  const WRAP_OPTIONS = [
    { id: 'none', label: '不包裹', note: '只输出题目行本身。' },
    { id: 'tabular', label: 'tabular', note: '用单列表格包住，使 \\\\ 在正文中也能编译。' },
    { id: 'document', label: '完整文档', note: '生成 ctexart 完整文档（含 amsmath），可直接编译。' }
  ];

  const BRACKET_META = {
    'paren-en': { open: '(', close: ')', space: true },
    'paren-cn': { open: '（', close: '）', space: false },
    'bracket-en': { open: '[', close: ']', space: true },
    'bracket-cn': { open: '【', close: '】', space: false },
    dot: { suffix: '.', space: true },
    dun: { suffix: '、', space: false },
    none: null
  };

  const SEP_SUFFIX = {
    dblslash: '\\\\',
    'dblslash-em': '\\\\[0.5em]',
    backslash: '\\',
    newline: '\\newline',
    medskip: '\\par\\medskip',
    bigskip: '\\par\\bigskip',
    vspace: '\\par\\vspace{1em}'
  };

  const ICON_WARN = '<svg viewBox="0 0 24 24"><path d="M12 3.2 21 19.4H3L12 3.2Z"/><path d="M12 9.6v4.3"/><circle cx="12" cy="17" r="1" fill="currentColor" stroke="none"/></svg>';
  const ICON_CHECK = '<svg viewBox="0 0 24 24"><path d="m4.5 12.5 4.6 4.6L19.5 6.7"/></svg>';

  /* ---------------- state ---------------- */

  let state = loadState();

  function loadState() {
    let loaded = null;
    try {
      const raw = localStorage.getItem(STORE_KEY);
      if (raw) loaded = JSON.parse(raw);
    } catch (e) { loaded = null; }

    const s = JSON.parse(JSON.stringify(DEFAULT_STATE));
    if (!loaded || typeof loaded !== 'object') return s;

    if (loaded.mode === 'exercise' || loaded.mode === 'formula') s.mode = loaded.mode;
    if (typeof loaded.formula === 'string') s.formula = loaded.formula;
    if (Array.isArray(loaded.exercises)) {
      s.exercises = loaded.exercises
        .filter((e) => e && typeof e === 'object')
        .map((e) => ({
          id: String(e.id || uid()),
          num: String(e.num == null ? '' : e.num),
          tex: String(e.tex || ''),
          preview: !!e.preview
        }));
    }
    if (loaded.theme === 'light' || loaded.theme === 'dark' || loaded.theme === 'auto') s.theme = loaded.theme;
    if (loaded.bg && typeof loaded.bg === 'object') {
      s.bg.image = typeof loaded.bg.image === 'string' ? loaded.bg.image : null;
      s.bg.opacity = clamp(Number(loaded.bg.opacity) || 0.45, 0, 1);
      s.bg.blur = clamp(Number(loaded.bg.blur) || 0, 0, 40);
    }
    if (typeof loaded.pair === 'boolean') s.pair = loaded.pair;
    if (typeof loaded.autoWrap === 'boolean') s.autoWrap = loaded.autoWrap;
    if (typeof loaded.smartDollar === 'boolean') s.smartDollar = loaded.smartDollar;
    if (loaded.export && typeof loaded.export === 'object') {
      if (Object.prototype.hasOwnProperty.call(BRACKET_META, loaded.export.bracket)) s.export.bracket = loaded.export.bracket;
      if (SEP_OPTIONS.some((o) => o.id === loaded.export.sep)) s.export.sep = loaded.export.sep;
      if (WRAP_OPTIONS.some((o) => o.id === loaded.export.wrap)) s.export.wrap = loaded.export.wrap;
      s.export.nbsp = !!loaded.export.nbsp;
    }
    if (typeof loaded.split === 'number') s.split = clamp(loaded.split, 0.18, 0.8);
    if (typeof loaded.paletteCat === 'string') s.paletteCat = loaded.paletteCat;
    if (Array.isArray(loaded.custom)) {
      s.custom = loaded.custom
        .filter((c) => c && typeof c === 'object' && typeof c.code === 'string' && c.code.trim())
        .slice(0, 200)
        .map((c) => ({
          id: String(c.id || uid()),
          title: String(c.title || ''),
          note: String(c.note || ''),
          icon: String(c.icon || ''),
          code: String(c.code)
        }));
    }
    // layout v2: the quick-input bar starts collapsed; older saves migrate once.
    if (loaded.layoutV === 2 && typeof loaded.paletteOpen === 'boolean') {
      s.paletteOpen = loaded.paletteOpen;
    }
    if (!s.exercises.length) s.exercises = [{ id: uid(), num: '1', tex: '', preview: false }];
    return s;
  }

  let suppressSave = false;

  const saveNow = () => {
    if (suppressSave) return;
    try {
      localStorage.setItem(STORE_KEY, JSON.stringify(state));
    } catch (e) {
      /* quota exceeded (huge background) or storage disabled — ignore */
    }
  };
  const scheduleSave = debounce(saveNow, 400);

  /* ---------------- katex helpers ---------------- */

  function renderTex(tex, displayMode) {
    return katex.renderToString(tex, Object.assign({}, KATEX_BASE, { displayMode: !!displayMode }));
  }

  function renderTexSafe(tex, displayMode) {
    try {
      return renderTex(tex, displayMode);
    } catch (e) {
      if (!displayMode) {
        try { return renderTex(tex, true); } catch (e2) { /* fall through */ }
      }
      return '<span class="katex-error" style="font-family:monospace;font-size:11px;color:var(--danger)">?</span>';
    }
  }

  const iconCache = new Map();
  function iconHtml(tex) {
    if (iconCache.has(tex)) return iconCache.get(tex);
    const html = renderTexSafe(tex, false);
    iconCache.set(tex, html);
    return html;
  }

  // Rendered HTML cache: while typing, most formulas are unchanged, so reuse their markup.
  const mathCache = new Map();
  function cachedMathHtml(tex, displayMode) {
    const key = (displayMode ? 'D' : 'I') + tex;
    const hit = mathCache.get(key);
    if (hit !== undefined) return hit;
    const html = renderTex(tex, displayMode);
    if (mathCache.size > 600) mathCache.clear();
    mathCache.set(key, html);
    return html;
  }

  /* ---------------- math / text parsing ---------------- */

  function lineOf(src, pos) {
    let line = 1;
    for (let i = 0; i < pos && i < src.length; i++) if (src[i] === '\n') line++;
    return line;
  }

  function lineEnd(src, from) {
    const i = src.indexOf('\n', from);
    return i === -1 ? src.length : i;
  }

  /**
   * Split plain text into text / inline-math / display-math segments.
   * Supports $...$, $$...$$, \(...\), \[...\], plus bare display environments.
   */
  function parseRich(src) {
    const segs = [];
    let i = 0;
    let textStart = 0;

    const flushText = (end) => {
      if (end > textStart) {
        segs.push({ type: 'text', value: src.slice(textStart, end), start: textStart });
      }
    };

    while (i < src.length) {
      const c = src[i];

      if (c === '\\' && src[i + 1] === '\\') { i += 2; continue; }
      if (c === '\\' && src[i + 1] === '$') { i += 2; continue; }

      if (c === '$') {
        if (src[i + 1] === '$') {
          let j = i + 2;
          let close = -1;
          while (j < src.length - 1) {
            if (src[j] === '\\' && src[j + 1] === '$') { j += 2; continue; }
            if (src[j] === '$' && src[j + 1] === '$') { close = j; break; }
            j++;
          }
          flushText(i);
          if (close === -1) {
            segs.push({ type: 'display', value: src.slice(i + 2), start: i, closed: false });
            i = src.length;
          } else {
            segs.push({ type: 'display', value: src.slice(i + 2, close), start: i, closed: true });
            i = close + 2;
          }
          textStart = i;
          continue;
        }

        // inline math may span lines, but is bounded by the next unescaped $
        let j = i + 1;
        let close = -1;
        while (j < src.length) {
          if (src[j] === '\\' && src[j + 1] === '$') { j += 2; continue; }
          if (src[j] === '$') { close = j; break; }
          j++;
        }
        flushText(i);
        if (close === -1) {
          const end = lineEnd(src, i + 1);
          segs.push({ type: 'inline', value: src.slice(i + 1, end), start: i, closed: false });
          i = end;
        } else {
          segs.push({ type: 'inline', value: src.slice(i + 1, close), start: i, closed: true });
          i = close + 1;
        }
        textStart = i;
        continue;
      }

      if (c === '\\' && (src[i + 1] === '(' || src[i + 1] === '[')) {
        const isParen = src[i + 1] === '(';
        const closer = isParen ? '\\)' : '\\]';
        const j = src.indexOf(closer, i + 2);
        flushText(i);
        if (j === -1) {
          segs.push({ type: isParen ? 'inline' : 'display', value: src.slice(i + 2), start: i, closed: false });
          i = src.length;
        } else {
          segs.push({ type: isParen ? 'inline' : 'display', value: src.slice(i + 2, j), start: i, closed: true });
          i = j + 2;
        }
        textStart = i;
        continue;
      }

      if (c === '\\' && src.startsWith('\\begin{', i)) {
        const m = /^\\begin\{([A-Za-z*]+)\}/.exec(src.slice(i));
        if (m) {
          const env = m[1];
          const endTag = '\\end{' + env + '}';
          const j = src.indexOf(endTag, i + m[0].length);
          if (j !== -1 && (DISPLAY_ENVS.indexOf(env) !== -1 || MATH_ONLY_ENVS.indexOf(env) !== -1)) {
            flushText(i);
            segs.push({
              type: 'display',
              value: src.slice(i, j + endTag.length),
              start: i,
              closed: true,
              bare: true,
              env
            });
            i = j + endTag.length;
            textStart = i;
            continue;
          }
        }
      }

      i++;
    }

    flushText(src.length);
    return segs;
  }

  function cleanKatexError(err) {
    let msg = String((err && err.message) || err || '渲染失败');
    msg = msg.replace(/^KaTeX parse error:\s*/i, '');
    return msg;
  }

  function hintFor(errMsg) {
    const m = /Undefined control sequence:\s*(\\[A-Za-z]+)/i.exec(errMsg);
    if (m) return '未定义的命令 ' + m[1] + '，请检查拼写，或确认所用宏包（KaTeX 只支持部分宏包命令）。';
    if (/Expected '}', got 'EOF'/i.test(errMsg) || /Unexpected end of input/i.test(errMsg)) return '花括号没有闭合：检查 { 与 } 是否成对。';
    if (/Missing \\right/i.test(errMsg)) return '\\left 与 \\right 必须成对出现。';
    if (/Extra \}/i.test(errMsg)) return '多了一个 }。';
    if (/^No such environment/i.test(errMsg)) return 'KaTeX 不支持该环境；可改用 aligned、cases、matrix 等。';
    return '';
  }

  /* ---------------- app elements ---------------- */

  const els = {
    html: document.documentElement,
    formulaInput: $('#formulaInput'),
    preview: $('#preview'),
    previewStat: $('#previewStat'),
    inputStat: $('#inputStat'),
    palette: $('#palette'),
    paletteTabs: $('#paletteTabs'),
    paletteGrid: $('#paletteGrid'),
    paletteToggle: $('#paletteToggle'),
    paletteBtn: $('#paletteBtn'),
    customManage: $('#customManage'),
    formulaView: $('#formulaView'),
    exerciseView: $('#exerciseView'),
    exerciseList: $('#exerciseList'),
    exCount: $('#exCount'),
    addExercise: $('#addExercise'),
    exportBtn: $('#exportBtn'),
    modal: $('#modalBackdrop'),
    validation: $('#validation'),
    hints: $('#exportHints'),
    bracketOpts: $('#bracketOpts'),
    sepOpts: $('#sepOpts'),
    wrapOpts: $('#wrapOpts'),
    bracketHint: $('#bracketHint'),
    sepHint: $('#sepHint'),
    nbspOpt: $('#nbspOpt'),
    exportPre: $('#exportPre'),
    exportRender: $('#exportRender'),
    exportInfo: $('#exportInfo'),
    tooltip: $('#tooltip'),
    toast: $('#toast'),
    customModal: $('#customModal'),
    customTitle: $('#customTitle'),
    customName: $('#customName'),
    customNote: $('#customNote'),
    customIcon: $('#customIcon'),
    customCode: $('#customCode'),
    customPreview: $('#customPreview'),
    customError: $('#customError'),
    customDelete: $('#customDelete')
  };

  /* ---------------- theme & background ---------------- */

  const darkMedia = (function () {
    try { return window.matchMedia('(prefers-color-scheme: dark)'); } catch (e) { return null; }
  })();

  function isDark() {
    if (state.theme === 'dark') return true;
    if (state.theme === 'light') return false;
    return !!(darkMedia && darkMedia.matches);
  }

  function applyTheme() {
    const dark = isDark();
    els.html.dataset.theme = dark ? 'dark' : 'light';
    $('#iconMoon').classList.toggle('hidden', dark);
    $('#iconSun').classList.toggle('hidden', !dark);
    $('#themeBtn').title = dark ? '切换到浅色主题' : '切换到深色主题';
    $$('#themeSeg button').forEach((b) => b.classList.toggle('active', b.dataset.theme === state.theme));
  }

  function applyBg() {
    const layer = $('#bgLayer');
    if (state.bg.image) {
      layer.style.backgroundImage = 'url("' + state.bg.image + '")';
      layer.classList.add('on');
    } else {
      layer.classList.remove('on');
      layer.style.backgroundImage = '';
    }
    els.html.style.setProperty('--bg-opacity', String(state.bg.opacity));
    els.html.style.setProperty('--bg-blur', state.bg.blur + 'px');

    const op = $('#bgOpacity');
    const bl = $('#bgBlur');
    if (op) op.value = String(Math.round(state.bg.opacity * 100));
    if (bl) bl.value = String(state.bg.blur);
    $('#bgOpacityVal').textContent = Math.round(state.bg.opacity * 100) + '%';
    $('#bgBlurVal').textContent = state.bg.blur + 'px';
    const name = $('#bgName');
    if (name) name.textContent = state.bg.image ? '已设置' : '未设置';
  }

  function resetBg() {
    state.bg = { image: null, opacity: 0.45, blur: 8 };
    applyBg();
    scheduleSave();
  }

  /* ---------------- palette ---------------- */

  let activeEditor = null;
  const everFocused = new WeakSet();

  function setActiveEditor(ta) {
    if (ta && ta.isConnected) {
      activeEditor = ta;
      everFocused.add(ta);
    }
  }

  function currentEditor() {
    if (activeEditor && activeEditor.isConnected) return activeEditor;
    if (state.mode === 'exercise') {
      const ta = $('#exerciseList textarea');
      if (ta) return ta;
    }
    return els.formulaInput;
  }

  function buildInsertable(code) {
    let text = String(code);
    let caret = text.indexOf('\u0001');
    if (caret >= 0) {
      text = text.replace(/\u0001/g, '');
    } else {
      const m = text.indexOf('{}');
      caret = m >= 0 ? m + 1 : text.length;
    }
    return { text, caret };
  }

  function mathModeAt(value, pos) {
    let mode = 'text';
    for (let i = 0; i < pos; i++) {
      const c = value[i];
      if (c === '\\') {
        const n = value[i + 1];
        if (n === '$' || n === '\\') { i++; continue; }
        if (mode === 'text' && n === '[') { mode = 'display'; i++; continue; }
        if (mode === 'text' && n === '(') { mode = 'inline'; i++; continue; }
        if (mode === 'inline' && n === ')') { mode = 'text'; i++; continue; }
        if (mode === 'display' && n === ']') { mode = 'text'; i++; continue; }
        continue;
      }
      if (mode === 'text') {
        if (c === '$') {
          if (value[i + 1] === '$') { mode = 'display'; i++; } else { mode = 'inline'; }
        }
      } else if (mode === 'inline') {
        if (c === '$') mode = 'text';
      } else if (mode === 'display') {
        if (c === '$' && value[i + 1] === '$') { mode = 'text'; i++; }
      }
    }
    return mode;
  }

  function insertPaletteItem(item) {
    const ta = currentEditor();
    const ins = buildInsertable(item.c);
    let out = ins.text;
    let caret = ins.caret;

    // Fall back to the end only when this editor has never had a caret.
    if (!everFocused.has(ta)) {
      const end = ta.value.length;
      ta.setSelectionRange(end, end);
    }

    if (state.autoWrap && !item.noWrap) {
      const mode = mathModeAt(ta.value, ta.selectionStart);
      if (mode === 'text') {
        const w = item.display ? '$$' : '$';
        out = w + ins.text + w;
        caret = ins.caret + w.length;
      }
    }
    replaceRange(ta, ta.selectionStart, ta.selectionEnd, out, caret);
    setActiveEditor(ta);
    hideTooltip();
  }

  let customEditing = false;

  function customPaletteItem(c) {
    return {
      i: c.icon || c.code,
      c: c.code,
      t: c.title || '自定义公式',
      d: c.note || '',
      demo: c.icon || c.code
    };
  }

  function paletteButton(item, customRaw) {
    const isCustom = !!customRaw;
    const btn = el('button', 'pal' + (item.tpl ? ' tpl' : '') + (isCustom ? ' custom' : ''));
    btn.type = 'button';
    btn.setAttribute('aria-label', (item.t || '') + ' ' + (item.c || '').replace(/\u0001/g, ''));
    btn.innerHTML = '<span class="pal-inner">' + iconHtml(item.i || item.c) + '</span>';
    // Keep the caret in the textarea when clicking a symbol.
    btn.addEventListener('mousedown', (e) => e.preventDefault());

    if (isCustom) {
      btn.classList.toggle('managing', customEditing);
      const mark = el('span', 'edit-mark');
      mark.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 20h4L19 9l-4-4L4 16v4Z"/><path d="m13.5 6.5 4 4"/></svg>';
      btn.appendChild(mark);
      btn.addEventListener('click', () => {
        if (customEditing) openCustomEditor(customRaw);
        else insertPaletteItem(item);
      });
    } else {
      btn.addEventListener('click', () => insertPaletteItem(item));
    }

    bindTooltip(btn, item);
    els.paletteGrid.appendChild(btn);
  }

  function addCustomTile() {
    const btn = el('button', 'pal pal-add');
    btn.type = 'button';
    btn.title = '新建快捷公式';
    btn.setAttribute('aria-label', '新建快捷公式');
    btn.innerHTML = '<span class="pal-inner">＋</span>';
    btn.addEventListener('mousedown', (e) => e.preventDefault());
    btn.addEventListener('click', () => openCustomEditor(null));
    els.paletteGrid.appendChild(btn);
  }

  function renderPalette() {
    const cats = Object.keys(LHPalette).concat([CUSTOM_CAT]);
    els.paletteTabs.innerHTML = '';
    cats.forEach((cat) => {
      const btn = el('button', 'tab', cat);
      btn.type = 'button';
      btn.setAttribute('role', 'tab');
      btn.setAttribute('aria-selected', String(cat === state.paletteCat));
      btn.classList.toggle('active', cat === state.paletteCat);
      btn.addEventListener('click', () => {
        if (cat !== CUSTOM_CAT) customEditing = false;
        state.paletteCat = cat;
        scheduleSave();
        renderPalette();
      });
      els.paletteTabs.appendChild(btn);
    });

    if (cats.indexOf(state.paletteCat) === -1) state.paletteCat = cats[0];
    els.paletteGrid.innerHTML = '';

    if (state.paletteCat === CUSTOM_CAT) {
      state.custom.forEach((c) => paletteButton(customPaletteItem(c), c));
      addCustomTile();
      if (!state.custom.length) customEditing = false;
    } else {
      LHPalette[state.paletteCat].forEach((item) => paletteButton(item, null));
    }

    els.customManage.classList.toggle('hidden', state.paletteCat !== CUSTOM_CAT || !state.custom.length);
    els.customManage.textContent = customEditing ? '完成' : '管理';
    els.customManage.classList.toggle('active', customEditing);

    applyPaletteState();
  }

  function applyPaletteState() {
    els.palette.classList.toggle('collapsed', !state.paletteOpen);
    els.paletteToggle.setAttribute('aria-expanded', String(state.paletteOpen));
    els.paletteToggle.title = state.paletteOpen ? '收起快捷输入' : '展开快捷输入';
    if (els.paletteBtn) {
      els.paletteBtn.classList.toggle('active', state.paletteOpen);
      els.paletteBtn.setAttribute('aria-expanded', String(state.paletteOpen));
      els.paletteBtn.title = state.paletteOpen ? '收起快捷输入（Ctrl+/）' : '快捷输入（Ctrl+/）';
    }
  }

  function togglePalette() {
    state.paletteOpen = !state.paletteOpen;
    applyPaletteState();
    saveNow();
  }

  /* ---------------- custom quick formulas ---------------- */

  let editingCustomId = null;
  let customCloseTimer = null;

  function tryRenderCustom(tex) {
    try {
      return renderTex(tex, false);
    } catch (e) {
      return renderTex(tex, true);
    }
  }

  function renderCustomPreview() {
    const icon = els.customIcon.value.trim();
    const code = els.customCode.value.trim();
    const tex = icon || code;
    els.customPreview.innerHTML = '';
    els.customError.classList.add('hidden');
    if (!tex) {
      els.customPreview.appendChild(el('span', 'c-empty', '—'));
      return;
    }
    try {
      els.customPreview.innerHTML = tryRenderCustom(tex);
    } catch (e) {
      els.customPreview.appendChild(el('span', 'c-empty', '无法渲染'));
      els.customError.textContent = cleanKatexError(e);
      els.customError.classList.remove('hidden');
    }
  }

  function openCustomEditor(item) {
    editingCustomId = item ? item.id : null;
    els.customTitle.textContent = item ? '编辑快捷公式' : '新建快捷公式';
    els.customName.value = item ? item.title : '';
    els.customNote.value = item ? item.note : '';
    els.customIcon.value = item ? item.icon : '';
    els.customCode.value = item ? item.code : '';
    els.customDelete.classList.toggle('hidden', !item);
    els.customError.classList.add('hidden');
    renderCustomPreview();
    clearTimeout(customCloseTimer);
    els.customModal.classList.remove('hidden');
    requestAnimationFrame(() => els.customModal.classList.add('show'));
    setTimeout(() => els.customName.focus(), 30);
  }

  function closeCustomEditor() {
    els.customModal.classList.remove('show');
    clearTimeout(customCloseTimer);
    customCloseTimer = setTimeout(() => els.customModal.classList.add('hidden'), 160);
  }

  function saveCustomItem() {
    const isEdit = !!editingCustomId;
    const code = els.customCode.value.trim();
    const icon = els.customIcon.value.trim();

    if (!code) {
      els.customError.textContent = '请填写「插入内容」';
      els.customError.classList.remove('hidden');
      els.customCode.focus();
      return;
    }
    if (icon) {
      try {
        tryRenderCustom(icon);
      } catch (e) {
        els.customError.textContent = '图标公式无法渲染：' + cleanKatexError(e);
        els.customError.classList.remove('hidden');
        els.customIcon.focus();
        return;
      }
    }

    const item = {
      id: editingCustomId || uid(),
      title: els.customName.value.trim(),
      note: els.customNote.value.trim(),
      icon,
      code
    };

    if (isEdit) {
      const i = state.custom.findIndex((c) => c.id === editingCustomId);
      if (i >= 0) state.custom[i] = item;
    } else {
      state.custom.push(item);
      state.paletteCat = CUSTOM_CAT;
      customEditing = false;
    }

    saveNow();
    renderPalette();
    closeCustomEditor();
    toast(isEdit ? '已保存' : '已添加');
  }

  function deleteCustomItem() {
    if (!editingCustomId) return;
    if (!window.confirm('删除这个快捷公式？')) return;
    state.custom = state.custom.filter((c) => c.id !== editingCustomId);
    saveNow();
    renderPalette();
    closeCustomEditor();
    toast('已删除');
  }

  /* ---------------- tooltip ---------------- */

  let tipTimer = null;

  function bindTooltip(btn, item) {
    btn.addEventListener('mouseenter', () => {
      clearTimeout(tipTimer);
      tipTimer = setTimeout(() => showTooltip(btn, item), 90);
    });
    btn.addEventListener('mouseleave', hideTooltip);
    btn.addEventListener('focus', () => showTooltip(btn, item));
    btn.addEventListener('blur', hideTooltip);
  }

  function showTooltip(btn, item) {
    const code = String(item.c || '').replace(/\u0001/g, '');
    const demo = item.demo || item.i || code;
    const tip = els.tooltip;
    tip.innerHTML =
      '<div class="tip-preview">' + renderTexSafe(demo, false) + '</div>' +
      '<div class="tip-code">' + escapeHtml(code) + '</div>' +
      '<div class="tip-title">' + escapeHtml(item.t || '') + '</div>' +
      '<div class="tip-desc">' + escapeHtml(item.d || '') + '</div>';
    tip.classList.remove('hidden');

    const r = btn.getBoundingClientRect();
    const tw = tip.offsetWidth;
    const th = tip.offsetHeight;
    let left = r.left + r.width / 2 - tw / 2;
    left = clamp(left, 8, window.innerWidth - tw - 8);
    let top = r.top - th - 9;
    if (top < 8) top = r.bottom + 9;
    tip.style.left = left + 'px';
    tip.style.top = top + 'px';
    requestAnimationFrame(() => tip.classList.add('show'));
  }

  function hideTooltip() {
    clearTimeout(tipTimer);
    els.tooltip.classList.remove('show');
    els.tooltip.classList.add('hidden');
  }

  /* ---------------- editor input mechanics ---------------- */

  function replaceRange(ta, from, to, text, caret) {
    ta.focus();
    ta.setSelectionRange(from, to);

    let ok = false;
    try { ok = document.execCommand('insertText', false, text); } catch (e) { ok = false; }

    if (!ok) {
      const v = ta.value;
      ta.value = v.slice(0, from) + text + v.slice(to);
      ta.selectionStart = ta.selectionEnd = from + text.length;
      ta.dispatchEvent(new Event('input', { bubbles: true }));
    }

    if (typeof caret === 'number') {
      const pos = clamp(from + caret, 0, ta.value.length);
      ta.setSelectionRange(pos, pos);
    }
  }

  let lastDollar = null;

  function onEditorKeyDown(e) {
    const ta = e.target;
    if (!ta || ta.tagName !== 'TEXTAREA' || !ta.classList.contains('js-editor')) return;
    if (e.isComposing || e.keyCode === 229) return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (!state.pair) return;

    const key = e.key;
    const v = ta.value;
    const s = ta.selectionStart;
    const t = ta.selectionEnd;

    if (key === '$') {
      if (v[s - 1] === '\\') return; // escaped dollar: let the browser insert it
      e.preventDefault();

      if (s !== t) {
        replaceRange(ta, s, t, '$' + v.slice(s, t) + '$', 1);
        lastDollar = null;
        return;
      }
      if (lastDollar && lastDollar.ta === ta && lastDollar.pos === s &&
          Date.now() - lastDollar.time < 700 && v[s] === '$') {
        replaceRange(ta, s - 1, s + 1, '$$$$', 2);
        lastDollar = null;
        return;
      }
      if (v[s] === '$') {
        ta.setSelectionRange(s + 1, s + 1);
        lastDollar = null;
        return;
      }
      if (state.smartDollar && mathModeAt(v, s) !== 'text') {
        // "$ 补全优化": already inside $...$, so this dollar only closes it.
        replaceRange(ta, s, s, '$', 1);
        lastDollar = null;
        return;
      }
      replaceRange(ta, s, s, '$$', 1);
      lastDollar = { ta, pos: s + 1, time: Date.now() };
      return;
    }

    if (key === '{') {
      if (v[s - 1] === '\\') return;
      e.preventDefault();
      if (s !== t) replaceRange(ta, s, t, '{' + v.slice(s, t) + '}', 1);
      else replaceRange(ta, s, s, '{}', 1);
      lastDollar = null;
      return;
    }

    if (key === '(') {
      e.preventDefault();
      if (s !== t) {
        replaceRange(ta, s, t, '(' + v.slice(s, t) + ')', 1);
      } else if (/\\left$/.test(v.slice(0, s))) {
        replaceRange(ta, s, s, '(\\right)', 1);
      } else {
        replaceRange(ta, s, s, '()', 1);
      }
      lastDollar = null;
      return;
    }

    if (key === '[') {
      if (v[s - 1] === '\\') {
        e.preventDefault();
        replaceRange(ta, s, s, '[\\]', 1);
        lastDollar = null;
        return;
      }
      e.preventDefault();
      if (s !== t) replaceRange(ta, s, t, '[' + v.slice(s, t) + ']', 1);
      else replaceRange(ta, s, s, '[]', 1);
      lastDollar = null;
      return;
    }

    if (key === '}' || key === ')' || key === ']') {
      if (s === t && v[s] === key) {
        e.preventDefault();
        ta.setSelectionRange(s + 1, s + 1);
      }
      lastDollar = null;
      return;
    }

    if (key === 'Backspace' && s === t && s > 0) {
      const before = v[s - 1];
      const after = v[s];
      const pairs = { '{': '}', '(': ')', '[': ']', '$': '$' };
      if (pairs[before] && pairs[before] === after) {
        e.preventDefault();
        replaceRange(ta, s - 1, s + 1, '', 0);
      }
    }
    lastDollar = null;
  }

  /* ---------------- preview ---------------- */

  let renderTimer = null;

  function schedulePreview() {
    clearTimeout(renderTimer);
    renderTimer = setTimeout(renderPreview, 110);
  }

  function emptyPreview() {
    els.preview.innerHTML = '';
    const box = el('div', 'preview-empty');
    const icon = el('div', 'pe-icon', '∫');
    const h = el('h3', null, '还没有内容');
    const btn = el('button', 'example-btn', '插入示例');
    btn.type = 'button';
    btn.addEventListener('click', () => {
      els.formulaInput.value =
        '设 $f(x)=\\lim_{n\\to\\infty}\\left(1+\\frac{x}{n}\\right)^n$，求 $f\'(0)$。\n\n' +
        '$$\\int_0^1 \\frac{1}{1+x^2}\\,\\mathrm{d}x = \\frac{\\pi}{4}$$';
      onFormulaInput();
      els.formulaInput.focus();
    });
    box.appendChild(icon);
    box.appendChild(h);
    box.appendChild(btn);
    els.preview.appendChild(box);
  }

  function onFormulaInput() {
    state.formula = els.formulaInput.value;
    schedulePreview();
    scheduleSave();
  }

  function renderPreview() {
    const src = state.formula;
    const t0 = (window.performance && performance.now) ? performance.now() : Date.now();
    const scrollTop = els.preview.scrollTop;

    if (!src.trim()) {
      emptyPreview();
      els.previewStat.textContent = '';
      updateInputStat();
      return;
    }

    const segs = parseRich(src);
    const frag = document.createDocumentFragment();
    let errorCount = 0;
    let warnCount = 0;
    let mathCount = 0;

    let trimLeading = false;
    segs.forEach((seg, idx) => {
      if (seg.type === 'text') {
        let value = seg.value;
        if (trimLeading) {
          value = value.replace(/^[ \t]*\n+/, '');
          trimLeading = false;
        }
        const next = segs[idx + 1];
        if (next && next.type === 'display') {
          value = value.replace(/\n+[ \t]*$/, '');
        }
        if (value) frag.appendChild(document.createTextNode(value));
        return;
      }
      trimLeading = seg.type === 'display';
      mathCount++;
      const line = lineOf(src, seg.start);

      if (!seg.closed) {
        warnCount++;
        frag.appendChild(inlineWarn('第 ' + line + ' 行：' + (seg.type === 'display' ? '$$' : '$') + ' 未闭合'));
      }
      if (seg.bare && MATH_ONLY_ENVS.indexOf(seg.env) !== -1) {
        warnCount++;
        frag.appendChild(inlineWarn('\\begin{' + seg.env + '} 需要放在 $…$ 内'));
      }

      try {
        const node = document.createElement(seg.type === 'display' ? 'div' : 'span');
        node.className = seg.type === 'display' ? 'pv-math-display' : 'pv-math-inline';
        node.innerHTML = cachedMathHtml(seg.value, seg.type === 'display');
        frag.appendChild(node);
      } catch (err) {
        errorCount++;
        frag.appendChild(errorBox(err, seg, line));
      }
    });

    els.preview.innerHTML = '';
    els.preview.appendChild(frag);
    els.preview.scrollTop = scrollTop;

    const t1 = (window.performance && performance.now) ? performance.now() : Date.now();
    const ms = Math.max(0.1, t1 - t0);
    els.previewStat.innerHTML =
      mathCount + ' 处公式 · ' + ms.toFixed(1) + ' ms' +
      (errorCount ? ' · <span class="err">' + errorCount + ' 个错误</span>' : '') +
      (!errorCount && warnCount ? ' · ' + warnCount + ' 个提示' : '');
    updateInputStat();
  }

  function inlineWarn(text) {
    const s = el('span', 'pv-warn');
    s.innerHTML = ICON_WARN;
    s.appendChild(document.createTextNode(text));
    return s;
  }

  function errorBox(err, seg, line) {
    const msg = cleanKatexError(err);
    const hint = hintFor(msg);

    const box = el('div', 'pv-error');
    const head = el('div', 'pv-error-head');
    head.innerHTML = ICON_WARN;
    head.appendChild(document.createTextNode('第 ' + line + ' 行 · 语法错误'));

    const pre = el('pre', 'pv-error-src');
    const raw = seg.value;
    const pos = typeof err.position === 'number' ? err.position : -1;
    if (pos >= 0) {
      const upto = raw.slice(0, pos);
      const ls = upto.lastIndexOf('\n') + 1;
      let le = raw.indexOf('\n', pos);
      if (le < 0) le = raw.length;
      const lineStr = raw.slice(ls, le);
      const col = clamp(pos - ls, 0, lineStr.length);
      pre.innerHTML = escapeHtml(lineStr) + '\n<span class="caret-line">' + ' '.repeat(col) + '^</span>';
    } else {
      const short = raw.length > 220 ? raw.slice(0, 220) + '…' : raw;
      pre.textContent = short;
    }

    const msgEl = el('div', 'pv-error-msg');
    msgEl.appendChild(document.createTextNode(msg));
    if (hint) {
      const h = el('div');
      h.style.marginTop = '5px';
      h.style.opacity = '0.85';
      h.textContent = '提示：' + hint;
      msgEl.appendChild(h);
    }

    box.appendChild(head);
    box.appendChild(pre);
    box.appendChild(msgEl);
    return box;
  }

  function updateInputStat() {
    const v = state.formula;
    const lines = v ? v.split('\n').length : 0;
    els.inputStat.textContent = v.length ? v.length + ' 字符 · ' + lines + ' 行' : '';
  }

  /* ---------------- exercise mode ---------------- */

  let rowErrors = new Map();

  function nextExerciseNumber() {
    let max = 0;
    state.exercises.forEach((ex) => {
      const n = parseInt(String(ex.num).trim(), 10);
      if (!isNaN(n) && n > max) max = n;
    });
    return max > 0 ? max + 1 : state.exercises.length + 1;
  }

  function autosize(ta) {
    if (!ta.isConnected) return;
    ta.style.height = 'auto';
    const h = Math.max(38, ta.scrollHeight || 0);
    ta.style.height = h + 'px';
  }

  function renderExercises() {
    els.exerciseList.innerHTML = '';

    if (!state.exercises.length) {
      const empty = el('div', 'list-empty');
      empty.textContent = '还没有习题';
      els.exerciseList.appendChild(empty);
    }

    state.exercises.forEach((ex, idx) => {
      els.exerciseList.appendChild(exerciseRow(ex, idx));
    });

    // keep the "add" control right after the last row
    els.exerciseList.appendChild(els.addExercise);

    updateExCount();
  }

  function renderRowPreview(ex, row) {
    const box = row.querySelector('.row-preview');
    if (!box) return;
    box.innerHTML = '';
    const tex = String(ex.tex || '');
    if (!tex.trim()) {
      box.appendChild(el('span', 'rp-empty', '空'));
      return;
    }
    appendRich(box, tex);
  }

  const rowPreviewTimers = new Map();

  function scheduleRowPreview(ex, row) {
    clearTimeout(rowPreviewTimers.get(ex.id));
    rowPreviewTimers.set(ex.id, setTimeout(() => {
      if (row.isConnected && ex.preview) renderRowPreview(ex, row);
    }, 120));
  }

  function exerciseRow(ex, idx) {
    const row = el('div', 'exercise-row');
    row.dataset.id = ex.id;

    const numWrap = el('div', 'num-wrap');
    const idxEl = el('span', 'num-index', pad2(idx + 1));
    const num = el('input', 'num-input');
    num.type = 'text';
    num.value = ex.num;
    num.placeholder = String(idx + 1);
    num.setAttribute('aria-label', '第 ' + (idx + 1) + ' 题的题号');
    num.addEventListener('input', () => {
      ex.num = num.value;
      scheduleSave();
    });
    numWrap.appendChild(idxEl);
    numWrap.appendChild(num);

    const texWrap = el('div', 'tex-wrap');
    const ta = el('textarea', 'tex-input js-editor');
    ta.rows = 1;
    ta.spellcheck = false;
    ta.value = ex.tex;
    ta.setAttribute('aria-label', '第 ' + (idx + 1) + ' 题的公式');
    ta.addEventListener('input', () => {
      ex.tex = ta.value;
      autosize(ta);
      updateExCount();
      if (ex.preview) scheduleRowPreview(ex, row);
      scheduleSave();
    });
    ta.addEventListener('focus', () => setActiveEditor(ta));
    ta.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        addExercise(true);
      }
    });
    texWrap.appendChild(ta);

    const previewBox = el('div', 'row-preview' + (ex.preview ? '' : ' hidden'));
    texWrap.appendChild(previewBox);

    const err = rowErrors.get(ex.id);
    if (err) {
      row.classList.add('has-error');
      const errEl = el('div', 'row-error');
      errEl.innerHTML = ICON_WARN;
      errEl.appendChild(document.createTextNode(err));
      texWrap.appendChild(errEl);
    }

    const eye = el('button', 'row-act eye' + (ex.preview ? ' on' : ''));
    eye.type = 'button';
    eye.title = ex.preview ? '收起预览' : '预览';
    eye.setAttribute('aria-label', '第 ' + (idx + 1) + ' 题：' + (ex.preview ? '收起预览' : '显示预览'));
    eye.setAttribute('aria-pressed', String(!!ex.preview));
    eye.innerHTML = '<svg viewBox="0 0 24 24"><path d="M2.5 12S6 6 12 6s9.5 6 9.5 6-3.5 6-9.5 6S2.5 12 2.5 12Z"/><circle cx="12" cy="12" r="2.6"/></svg>';
    eye.addEventListener('click', () => {
      ex.preview = !ex.preview;
      eye.classList.toggle('on', ex.preview);
      eye.setAttribute('aria-pressed', String(ex.preview));
      eye.title = ex.preview ? '收起预览' : '预览';
      previewBox.classList.toggle('hidden', !ex.preview);
      if (ex.preview) renderRowPreview(ex, row);
      saveNow();
    });

    const del = el('button', 'row-act del');
    del.type = 'button';
    del.title = '删除这道题';
    del.setAttribute('aria-label', '删除第 ' + (idx + 1) + ' 题');
    del.innerHTML = '<svg viewBox="0 0 24 24"><path d="M4 7h16M9.5 7V5.2h5V7M6.5 7l.8 12.2h9.4L17.5 7M10.2 10.5v5.5M13.8 10.5v5.5"/></svg>';
    del.addEventListener('click', () => {
      const i = state.exercises.findIndex((x) => x.id === ex.id);
      if (i >= 0) state.exercises.splice(i, 1);
      rowErrors.delete(ex.id);
      clearTimeout(rowPreviewTimers.get(ex.id));
      renderExercises();
      scheduleSave();
    });

    const actions = el('div', 'row-actions');
    actions.appendChild(eye);
    actions.appendChild(del);

    row.appendChild(numWrap);
    row.appendChild(texWrap);
    row.appendChild(actions);

    requestAnimationFrame(() => {
      autosize(ta);
      if (ex.preview) renderRowPreview(ex, row);
    });
    return row;
  }

  function addExercise(focus) {
    const ex = { id: uid(), num: String(nextExerciseNumber()), tex: '', preview: false };
    state.exercises.push(ex);
    renderExercises();
    scheduleSave();
    if (focus) {
      const ta = els.exerciseList.querySelector('[data-id="' + ex.id + '"] textarea');
      if (ta) {
        ta.focus();
        scrollSafe(ta, { block: 'nearest', behavior: 'smooth' });
      }
    }
  }

  function updateExCount() {
    const n = state.exercises.length;
    const filled = state.exercises.filter((e) => String(e.tex).trim()).length;
    els.exCount.textContent = '共 ' + n + ' 题' + (filled && filled !== n ? '（已填写 ' + filled + '）' : '');
    els.exportBtn.disabled = n === 0;
  }

  function renumber() {
    state.exercises.forEach((ex, i) => { ex.num = String(i + 1); });
    renderExercises();
    scheduleSave();
    toast('题号已按顺序重排');
  }

  function clearExercises() {
    if (!state.exercises.length) return;
    if (!window.confirm('确定清空全部 ' + state.exercises.length + ' 道习题吗？此操作不可撤销。')) return;
    state.exercises = [];
    rowErrors.clear();
    renderExercises();
    scheduleSave();
    toast('已清空');
  }

  /* ---------------- export ---------------- */

  function displayNum(ex, idx) {
    const n = String(ex.num == null ? '' : ex.num).trim();
    return n || String(idx + 1);
  }

  function labelFor(num, opts) {
    const meta = BRACKET_META[opts.bracket];
    if (!meta) return { core: '', text: '' };
    const core = meta.suffix ? num + meta.suffix : meta.open + num + meta.close;
    return { core, text: meta.space ? core + (opts.nbsp ? '~' : ' ') : core };
  }

  function validateExercises() {
    const issues = [];
    state.exercises.forEach((ex, idx) => {
      const tex = String(ex.tex || '');
      const num = displayNum(ex, idx);
      const tag = '第 ' + (idx + 1) + ' 题（题号 ' + num + '）';

      if (!tex.trim()) {
        issues.push({ level: 'warn', idx, exId: ex.id, tag, message: '还没有输入公式，导出时会跳过' });
        return;
      }

      const segs = parseRich(tex);
      const mathSegs = segs.filter((s) => s.type !== 'text');
      if (!mathSegs.length) {
        issues.push({ level: 'warn', idx, exId: ex.id, tag, message: '没有检测到 $…$ 数学内容，导出后就是一段纯文本' });
      }

      segs.forEach((seg) => {
        if (seg.type === 'text') return;
        const line = lineOf(tex, seg.start);

        if (!seg.closed) {
          issues.push({
            level: 'error', idx, exId: ex.id, tag, line,
            message: '第 ' + line + ' 行：缺少结束定界符（$ 或 \\] 未闭合）'
          });
          return;
        }
        if (seg.bare && MATH_ONLY_ENVS.indexOf(seg.env) !== -1) {
          issues.push({
            level: 'warn', idx, exId: ex.id, tag, line,
            message: '\\begin{' + seg.env + '} 在正文中必须用 $…$ 包裹，否则编译报 Missing $ inserted'
          });
        }
        try {
          renderTex(seg.value, seg.type === 'display');
        } catch (err) {
          const msg = cleanKatexError(err);
          issues.push({
            level: 'error', idx, exId: ex.id, tag, line, err,
            message: '第 ' + line + ' 行：' + msg
          });
        }
      });
    });
    return issues;
  }

  function exportItems() {
    const opts = state.export;
    const items = [];
    state.exercises.forEach((ex, idx) => {
      const tex = String(ex.tex || '').trim();
      if (!tex) return;
      const num = displayNum(ex, idx);
      items.push({ num, tex, label: labelFor(num, opts) });
    });
    return items;
  }

  function buildExportText() {
    const opts = state.export;
    const items = exportItems();

    if (!items.length) return '';

    let out = '';

    if (opts.sep === 'enumerate') {
      const lines = items.map((it) => {
        if (!it.label.core.trim()) return '  \\item ' + it.tex;
        const gap = (it.label.text.slice(-1) === ' ' || it.label.text.slice(-1) === '~') ? ' ' : '';
        return '  \\item[' + it.label.core + ']' + gap + it.tex;
      });
      out = '\\begin{enumerate}\n' + lines.join('\n') + '\n\\end{enumerate}';
    } else if (opts.sep === 'blank') {
      out = items.map((it) => it.label.text + it.tex).join('\n\n');
    } else if (opts.sep === 'par') {
      out = items.map((it) => it.label.text + it.tex).join('\n\\par\n');
    } else {
      const suffix = SEP_SUFFIX[opts.sep] || '';
      out = items
        .map((it, i) => it.label.text + it.tex + (i < items.length - 1 ? suffix : ''))
        .join('\n');
    }

    const isDbl = opts.sep === 'dblslash' || opts.sep === 'dblslash-em';
    if (opts.wrap === 'tabular' && isDbl) {
      out = '\\begin{tabular}{@{}p{\\linewidth}@{}}\n' + out + '\n\\end{tabular}';
    } else if (opts.wrap === 'document') {
      const body = isDbl
        ? '\\begin{tabular}{@{}p{\\linewidth}@{}}\n' + out + '\n\\end{tabular}'
        : out;
      out =
        '\\documentclass[11pt]{ctexart}\n' +
        '\\usepackage{amsmath,amssymb}\n' +
        '\\usepackage[margin=2.5cm]{geometry}\n' +
        '\\begin{document}\n\n' +
        body +
        '\n\n\\end{document}';
    }

    return out;
  }

  const EX_PREVIEW_GAP = {
    blank: '1.15em',
    par: '1.15em',
    newline: '0.1em',
    dblslash: '0.1em',
    'dblslash-em': '0.6em',
    backslash: '0.1em',
    medskip: '0.7em',
    bigskip: '1.3em',
    vspace: '0.7em'
  };

  function appendRich(container, src) {
    parseRich(src).forEach((seg) => {
      if (seg.type === 'text') {
        container.appendChild(document.createTextNode(seg.value));
        return;
      }
      if (!seg.closed) container.appendChild(el('span', 'ex-warn', '未闭合'));
      try {
        const node = document.createElement(seg.type === 'display' ? 'div' : 'span');
        node.className = seg.type === 'display' ? 'ex-math-display' : 'ex-math-inline';
        node.innerHTML = cachedMathHtml(seg.value, seg.type === 'display');
        container.appendChild(node);
      } catch (err) {
        container.appendChild(el('span', 'ex-err', '⚠ ' + cleanKatexError(err)));
      }
    });
  }

  function renderExportPreview() {
    const box = els.exportRender;
    if (!box) return;
    box.innerHTML = '';
    const items = exportItems();
    if (!items.length) {
      box.appendChild(el('div', 'ex-empty', '没有可预览的内容'));
      return;
    }

    const opts = state.export;
    const isEnum = opts.sep === 'enumerate';
    const gap = EX_PREVIEW_GAP[opts.sep] || '1em';
    const doc = el('div', 'ex-doc');

    items.forEach((it, i) => {
      const row = el('div', 'ex-row' + (isEnum ? ' ex-item' : ''));
      if (it.label.text.trim()) {
        row.appendChild(el('span', 'ex-label', it.label.text.replace(/~$/, ' ')));
      } else if (isEnum) {
        row.appendChild(el('span', 'ex-index', String(i + 1) + '. '));
      }
      appendRich(row, it.tex);
      if (isEnum) row.style.marginBottom = '0.6em';
      else if (i < items.length - 1) row.style.marginBottom = gap;
      doc.appendChild(row);
    });

    box.appendChild(doc);
  }

  let exportTab = 'code';

  function setExportTab(tab) {
    exportTab = tab;
    $$('.export-tab').forEach((b) => {
      const on = b.dataset.tab === tab;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });
    els.exportPre.classList.toggle('hidden', tab !== 'code');
    els.exportRender.classList.toggle('hidden', tab !== 'render');
    if (tab === 'render') renderExportPreview();
  }

  function pillNode(opt, name, current, onPick, disabled) {
    const label = el('label', 'pill' + (disabled ? ' disabled' : ''));
    const input = el('input');
    input.type = 'radio';
    input.name = name;
    input.value = opt.id;
    input.checked = opt.id === current;
    input.disabled = !!disabled;
    label.classList.toggle('checked', input.checked);
    if (opt.note) label.title = opt.note;
    input.addEventListener('change', () => {
      if (input.checked) onPick(opt.id);
    });
    label.appendChild(input);
    label.appendChild(el('span', 'pill-main', opt.label));
    return label;
  }

  function renderOptions() {
    els.bracketOpts.innerHTML = '';
    BRACKET_OPTIONS.forEach((opt) => {
      els.bracketOpts.appendChild(
        pillNode(opt, 'bracket', state.export.bracket, (id) => {
          state.export.bracket = id;
          scheduleSave();
          refreshExport();
        })
      );
    });

    els.sepOpts.innerHTML = '';
    SEP_OPTIONS.forEach((opt) => {
      els.sepOpts.appendChild(
        pillNode(opt, 'sep', state.export.sep, (id) => {
          state.export.sep = id;
          const isDbl = id === 'dblslash' || id === 'dblslash-em';
          if (!isDbl && state.export.wrap === 'tabular') state.export.wrap = 'none';
          scheduleSave();
          renderOptions();
          refreshExport();
        })
      );
    });

    els.wrapOpts.innerHTML = '';
    WRAP_OPTIONS.forEach((opt) => {
      const disabled = opt.id === 'tabular' && ['dblslash', 'dblslash-em'].indexOf(state.export.sep) === -1;
      els.wrapOpts.appendChild(
        pillNode(opt, 'wrap', state.export.wrap, (id) => {
          state.export.wrap = id;
          scheduleSave();
          refreshExport();
        }, disabled)
      );
    });

    updateOptionHints();
  }

  function syncOptionStates() {
    $$('#bracketOpts .pill').forEach((n) => {
      n.classList.toggle('checked', n.querySelector('input').value === state.export.bracket);
    });
    $$('#sepOpts .pill').forEach((n) => {
      n.classList.toggle('checked', n.querySelector('input').value === state.export.sep);
    });
    $$('#wrapOpts .pill').forEach((n) => {
      n.classList.toggle('checked', n.querySelector('input').value === state.export.wrap);
    });
  }

  function updateOptionHints() {
    const b = BRACKET_META[state.export.bracket];
    let bh = b
      ? (b.space ? '西文括号与公式之间保留一个空格。' : '中文括号紧排，括号与公式之间不留空格。')
      : '不输出题号，只导出公式本身。';
    if (b && b.space && state.export.nbsp) bh += ' 已改用不可断行空格 ~，避免题号与公式被分到两行。';
    els.bracketHint.textContent = bh;

    const sep = SEP_OPTIONS.find((o) => o.id === state.export.sep);
    if (sep) {
      els.sepHint.textContent = sep.note;
      els.sepHint.classList.toggle('warn', state.export.sep === 'dblslash' || state.export.sep === 'dblslash-em');
    }
  }

  function refreshExport() {
    const issues = validateExercises();
    const errors = issues.filter((i) => i.level === 'error');

    els.validation.innerHTML = '';
    if (!state.exercises.length) {
      els.validation.className = 'validation warn';
      els.validation.textContent = '还没有习题。';
    } else if (errors.length) {
      els.validation.className = 'validation bad';
      const title = el('div', 'v-title');
      title.innerHTML = ICON_WARN;
      title.appendChild(document.createTextNode('发现 ' + errors.length + ' 处语法错误，请先修正'));
      els.validation.appendChild(title);
      els.validation.appendChild(issueList(errors));
    } else if (issues.length) {
      els.validation.className = 'validation warn';
      const title = el('div', 'v-title');
      title.innerHTML = ICON_WARN;
      title.appendChild(document.createTextNode('语法检查通过，但有 ' + issues.length + ' 条提示'));
      els.validation.appendChild(title);
      els.validation.appendChild(issueList(issues));
    } else {
      els.validation.className = 'validation ok';
      const title = el('div', 'v-title');
      title.innerHTML = ICON_CHECK;
      title.appendChild(document.createTextNode('全部 ' + state.exercises.length + ' 题语法检查通过'));
      els.validation.appendChild(title);
    }

    els.hints.innerHTML = '';
    if (state.export.sep === 'dblslash' || state.export.sep === 'dblslash-em') {
      const safe = state.export.wrap === 'tabular' || state.export.wrap === 'document';
      const tip = el('div', 'validation warn');
      tip.style.marginBottom = '16px';
      tip.innerHTML =
        '<b>\\\\</b> 只能在表格、数学或 align 等环境中使用；直接粘进正文会报 “There\'s no line here to end”。' +
        (safe
          ? (state.export.wrap === 'document'
            ? ' 完整文档中已自动用 tabular 包裹，可以安全编译。'
            : ' 已用 tabular 包裹，可以安全编译。')
          : ' 若要在正文中使用，请把「包裹方式」改为 tabular 或「完整文档」，或改用空行分段。');
      els.hints.appendChild(tip);
    }
    if (state.export.sep === 'backslash') {
      const tip = el('div', 'validation warn');
      tip.style.marginBottom = '16px';
      tip.innerHTML =
        '<b>\\</b> 单个反斜杠在 LaTeX 里不是换行命令，编译会报 Undefined control sequence；' +
        '它适合 Markdown 等以行尾 <b>\\</b> 表示硬换行的场合。需要 LaTeX 换行请选 <b>\\\\</b>，或用空行 / \\par / \\newline。';
      els.hints.appendChild(tip);
    }

    const text = buildExportText();
    els.exportPre.textContent = text || '（没有可导出的内容）';
    if (exportTab === 'render') renderExportPreview();
    const count = state.exercises.filter((e) => String(e.tex).trim()).length;
    els.exportInfo.textContent = '共 ' + count + ' 题 · ' + text.split('\n').length + ' 行 · ' + text.length + ' 字符';

    syncOptionStates();
    els.nbspOpt.checked = !!state.export.nbsp;
    els.nbspOpt.disabled = !(BRACKET_META[state.export.bracket] && BRACKET_META[state.export.bracket].space);
    updateOptionHints();
  }

  function issueList(issues) {
    const ul = el('ul', 'issue-list');
    issues.forEach((it) => {
      const li = el('li', 'issue' + (it.level === 'warn' ? ' warn' : ''));
      li.appendChild(el('span', 'tag', '题 ' + (it.idx + 1)));
      const txt = el('span', 'txt');
      txt.innerHTML = '<b>' + escapeHtml(it.tag) + '</b> ' + escapeHtml(it.message);
      li.appendChild(txt);
      li.addEventListener('click', () => {
        closeModal();
        focusExercise(it);
      });
      ul.appendChild(li);
    });
    return ul;
  }

  function focusExercise(it) {
    rowErrors.clear();
    if (it && it.exId) rowErrors.set(it.exId, it.message);
    renderExercises();
    const row = els.exerciseList.querySelector('[data-id="' + (it && it.exId) + '"]');
    if (row) {
      row.classList.add('is-target');
      scrollSafe(row, { block: 'center', behavior: 'smooth' });
      const ta = row.querySelector('textarea');
      if (ta) ta.focus();
    }
  }

  let modalTimer = null;

  function openModal() {
    if (!state.exercises.length) {
      toast('还没有习题，先添加一道吧', true);
      return;
    }
    clearTimeout(modalTimer);
    els.modal.classList.remove('hidden');
    requestAnimationFrame(() => els.modal.classList.add('show'));
    renderOptions();
    refreshExport();
    setExportTab(exportTab);
    setTimeout(() => $('#modalClose').focus(), 30);
  }

  function closeModal() {
    els.modal.classList.remove('show');
    clearTimeout(modalTimer);
    modalTimer = setTimeout(() => els.modal.classList.add('hidden'), 160);
  }

  async function copyExport() {
    const text = buildExportText();
    if (!text) { toast('没有可导出的内容', true); return; }
    const bad = validateExercises().filter((i) => i.level === 'error');
    if (bad.length && !window.confirm('仍有 ' + bad.length + ' 处语法错误，仍要复制吗？')) return;

    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch (e) {
      try {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.position = 'fixed';
        ta.style.opacity = '0';
        document.body.appendChild(ta);
        ta.select();
        ok = document.execCommand('copy');
        document.body.removeChild(ta);
      } catch (e2) { ok = false; }
    }
    toast(ok ? '已复制到剪贴板' : '复制失败，请手动选择文本复制', !ok);
  }

  function downloadExport() {
    const text = buildExportText();
    if (!text) { toast('没有可导出的内容', true); return; }
    const bad = validateExercises().filter((i) => i.level === 'error');
    if (bad.length && !window.confirm('仍有 ' + bad.length + ' 处语法错误，仍要下载吗？')) return;

    const blob = new Blob([text], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    const d = new Date();
    a.href = url;
    a.download = '习题-' + d.getFullYear() + pad2(d.getMonth() + 1) + pad2(d.getDate()) + '.tex';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 2000);
    toast('已下载 .tex 文件');
  }

  /* ---------------- toast ---------------- */

  let toastTimer = null;
  function toast(msg, isError) {
    els.toast.textContent = msg;
    els.toast.classList.toggle('err', !!isError);
    els.toast.classList.add('show');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => els.toast.classList.remove('show'), 2000);
  }

  /* ---------------- background image ---------------- */

  function downscaleImage(file, maxW, quality) {
    return new Promise((resolve, reject) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        try {
          const scale = Math.min(1, maxW / img.width);
          const w = Math.max(1, Math.round(img.width * scale));
          const h = Math.max(1, Math.round(img.height * scale));
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch (e) {
          reject(e);
        } finally {
          URL.revokeObjectURL(url);
        }
      };
      img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('图片读取失败')); };
      img.src = url;
    });
  }

  /* ---------------- popovers ---------------- */

  function openPopover(pop, anchor) {
    closePopovers();
    pop.classList.remove('hidden');
    const r = anchor.getBoundingClientRect();
    const w = pop.offsetWidth;
    const h = pop.offsetHeight;
    const left = clamp(r.right - w, 12, window.innerWidth - w - 12);
    let top = r.bottom + 8;
    if (top + h > window.innerHeight - 12) top = Math.max(12, r.top - h - 8);
    pop.style.left = left + 'px';
    pop.style.top = top + 'px';
  }

  function closePopovers() {
    $('#settingsPop').classList.add('hidden');
    $('#helpPop').classList.add('hidden');
  }

  /* ---------------- init ---------------- */

  function switchMode(mode) {
    if (mode !== 'formula' && mode !== 'exercise') return;
    state.mode = mode;
    scheduleSave();

    $$('#modeSwitch .mode-btn').forEach((b) => {
      const on = b.dataset.mode === mode;
      b.classList.toggle('active', on);
      b.setAttribute('aria-selected', String(on));
    });

    els.formulaView.classList.toggle('hidden', mode !== 'formula');
    els.exerciseView.classList.toggle('hidden', mode !== 'exercise');

    requestAnimationFrame(positionModeIndicator);
  }

  function bindEvents() {
    $('#modeSwitch').addEventListener('click', (e) => {
      const btn = e.target.closest('.mode-btn');
      if (btn) switchMode(btn.dataset.mode);
    });

    $('#themeBtn').addEventListener('click', () => {
      state.theme = isDark() ? 'light' : 'dark';
      applyTheme();
      scheduleSave();
    });
    $$('#themeSeg button').forEach((b) => {
      b.addEventListener('click', () => {
        state.theme = b.dataset.theme;
        applyTheme();
        scheduleSave();
      });
    });
    if (darkMedia) {
      const onSys = () => { if (state.theme === 'auto') applyTheme(); };
      if (darkMedia.addEventListener) darkMedia.addEventListener('change', onSys);
      else if (darkMedia.addListener) darkMedia.addListener(onSys);
    }

    $('#settingsBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#settingsPop');
      if (!pop.classList.contains('hidden')) closePopovers();
      else openPopover(pop, $('#settingsBtn'));
    });
    $('#helpBtn').addEventListener('click', (e) => {
      e.stopPropagation();
      const pop = $('#helpPop');
      if (!pop.classList.contains('hidden')) closePopovers();
      else openPopover(pop, $('#helpBtn'));
    });
    $('#settingsClose').addEventListener('click', closePopovers);
    $('#helpClose').addEventListener('click', closePopovers);
    document.addEventListener('mousedown', (e) => {
      if (e.target.closest('#settingsPop, #helpPop, #settingsBtn, #helpBtn')) return;
      closePopovers();
    });

    $('#bgPick').addEventListener('click', () => $('#bgFile').click());
    $('#bgClear').addEventListener('click', () => { resetBg(); toast('已移除背景'); });

    $('#clearCacheBtn').addEventListener('click', () => {
      if (!window.confirm('清除本地缓存？\n\n将删除浏览器中保存的公式、习题、主题、背景和自定义快捷公式，且无法恢复。')) return;
      suppressSave = true;
      try { localStorage.removeItem(STORE_KEY); } catch (e) { /* ignore */ }
      state = JSON.parse(JSON.stringify(DEFAULT_STATE));
      closePopovers();
      toast('已清除本地缓存');
      setTimeout(() => location.reload(), 450);
    });
    $('#bgFile').addEventListener('change', async (e) => {
      const file = e.target.files && e.target.files[0];
      if (!file) return;
      try {
        const data = await downscaleImage(file, 1920, 0.82);
        state.bg.image = data;
        applyBg();
        saveNow();
        toast('背景已设置');
      } catch (err) {
        toast('图片处理失败', true);
      }
      e.target.value = '';
    });
    $('#bgOpacity').addEventListener('input', (e) => {
      state.bg.opacity = clamp(Number(e.target.value) / 100, 0, 1);
      applyBg();
      scheduleSave();
    });
    $('#bgBlur').addEventListener('input', (e) => {
      state.bg.blur = clamp(Number(e.target.value), 0, 40);
      applyBg();
      scheduleSave();
    });

    const pairSwitch = $('#pairSwitch');
    const wrapSwitch = $('#wrapSwitch');
    const smartSwitch = $('#smartDollarSwitch');
    const syncSwitches = () => {
      pairSwitch.classList.toggle('on', state.pair);
      pairSwitch.setAttribute('aria-checked', String(state.pair));
      wrapSwitch.classList.toggle('on', state.autoWrap);
      wrapSwitch.setAttribute('aria-checked', String(state.autoWrap));
      smartSwitch.classList.toggle('on', state.smartDollar);
      smartSwitch.setAttribute('aria-checked', String(state.smartDollar));
    };
    pairSwitch.addEventListener('click', () => { state.pair = !state.pair; syncSwitches(); scheduleSave(); });
    wrapSwitch.addEventListener('click', () => { state.autoWrap = !state.autoWrap; syncSwitches(); scheduleSave(); });
    smartSwitch.addEventListener('click', () => { state.smartDollar = !state.smartDollar; syncSwitches(); saveNow(); });
    syncSwitches();

    els.paletteToggle.addEventListener('click', togglePalette);
    els.paletteBtn.addEventListener('click', togglePalette);
    els.customManage.addEventListener('click', () => {
      customEditing = !customEditing;
      renderPalette();
    });
    $('#customSave').addEventListener('click', saveCustomItem);
    $('#customCancel').addEventListener('click', closeCustomEditor);
    $('#customClose').addEventListener('click', closeCustomEditor);
    els.customDelete.addEventListener('click', deleteCustomItem);
    els.customModal.addEventListener('click', (e) => { if (e.target === els.customModal) closeCustomEditor(); });
    els.customIcon.addEventListener('input', renderCustomPreview);
    els.customCode.addEventListener('input', renderCustomPreview);
    els.customModal.addEventListener('keydown', (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        saveCustomItem();
      }
    });

    els.formulaInput.addEventListener('input', onFormulaInput);
    els.formulaInput.addEventListener('focus', () => setActiveEditor(els.formulaInput));

    document.addEventListener('keydown', onEditorKeyDown);

    initSplitter();

    els.addExercise.addEventListener('click', () => addExercise(true));
    $('#renumberBtn').addEventListener('click', renumber);
    $('#clearExBtn').addEventListener('click', clearExercises);
    els.exportBtn.addEventListener('click', openModal);

    $('#modalClose').addEventListener('click', closeModal);
    $('#exportDone').addEventListener('click', closeModal);
    $('#copyExport').addEventListener('click', copyExport);
    $('#downloadExport').addEventListener('click', downloadExport);
    els.modal.addEventListener('click', (e) => { if (e.target === els.modal) closeModal(); });
    els.nbspOpt.addEventListener('change', () => {
      state.export.nbsp = els.nbspOpt.checked;
      scheduleSave();
      refreshExport();
    });

    $$('.export-tab').forEach((b) => {
      b.addEventListener('click', () => setExportTab(b.dataset.tab));
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!els.modal.classList.contains('hidden')) closeModal();
        if (!els.customModal.classList.contains('hidden')) closeCustomEditor();
        closePopovers();
        hideTooltip();
      }
      if ((e.ctrlKey || e.metaKey) && (e.key === '/' || e.key === '?')) {
        e.preventDefault();
        togglePalette();
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === 'E' || e.key === 'e')) {
        if (state.mode === 'exercise') { e.preventDefault(); openModal(); }
      }
    });

    window.addEventListener('resize', () => {
      fitTopbar();
      positionModeIndicator();
    });
  }

  function positionModeIndicator() {
    const active = $('#modeSwitch .mode-btn.active');
    const ind = $('#modeIndicator');
    if (!active || !ind) return;
    ind.style.width = active.offsetWidth + 'px';
    ind.style.transform = 'translateX(' + (active.offsetLeft - 3) + 'px)';
  }

  // Hide the logo only when the top bar is genuinely too tight for it.
  function fitTopbar() {
    const topbar = $('.topbar');
    const logo = $('.logo');
    const mode = $('#modeSwitch');
    if (!topbar || !logo || !mode) return;
    topbar.classList.remove('no-brand');
    const logoRect = logo.getBoundingClientRect();
    const modeRect = mode.getBoundingClientRect();
    const overlaps = logoRect.right > modeRect.left + 1;
    const overflows = topbar.scrollWidth > topbar.clientWidth + 1;
    if (overlaps || overflows) topbar.classList.add('no-brand');
  }

  function initSplitter() {
    const sp = $('#splitter');
    const pane = $('#editorPane');
    const view = els.formulaView;

    const applySplit = (ratio) => {
      state.split = clamp(ratio, 0.18, 0.8);
      els.html.style.setProperty('--editor-size', (state.split * 100).toFixed(2) + '%');
    };
    applySplit(state.split);

    sp.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sp.classList.add('dragging');
      const startY = e.clientY;
      const total = Math.max(200, view.getBoundingClientRect().height - 12);
      const startH = pane.getBoundingClientRect().height;
      if (sp.setPointerCapture) sp.setPointerCapture(e.pointerId);

      const move = (ev) => {
        applySplit((startH + (ev.clientY - startY)) / total);
      };
      const up = () => {
        sp.classList.remove('dragging');
        window.removeEventListener('pointermove', move);
        window.removeEventListener('pointerup', up);
        scheduleSave();
      };
      window.addEventListener('pointermove', move);
      window.addEventListener('pointerup', up);
    });
  }

  function init() {
    els.formulaInput.value = state.formula;

    applyTheme();
    applyBg();
    renderPalette();
    bindEvents();
    renderExercises();
    switchMode(state.mode);
    renderPreview();
    updateInputStat();
    fitTopbar();

    // Web fonts can change the button widths after the first paint.
    if (document.fonts && document.fonts.ready) {
      document.fonts.ready
        .then(() => {
          fitTopbar();
          positionModeIndicator();
        })
        .catch(() => {});
    }
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
