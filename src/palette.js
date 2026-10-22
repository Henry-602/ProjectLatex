/* Palette data for LaTeX 公式助手.
   Each item:
     i  : LaTeX used as the icon (rendered by KaTeX)
     c  : text inserted into the editor ("\u0001" marks the caret)
     t  : title
     d  : description shown in the tooltip
     demo: optional nicer sample for the tooltip preview
     display: insert inside $$...$$ when auto-wrapping
     tpl: template (rendered with a smaller icon font)
     noWrap: never auto-wrap in $
*/
(function (root) {
  'use strict';

  var D = '\\displaystyle ';

  var PALETTE = {
    '常用': [
      { i: '\\frac{a}{b}', c: '\\frac{}{}', t: '分式', d: '\\frac{分子}{分母}，可嵌套。' },
      { i: '\\sqrt{x}', c: '\\sqrt{}', t: '平方根', d: '\\sqrt{x}：根号内为参数。' },
      { i: '\\sqrt[n]{x}', c: '\\sqrt[\u0001]{}', t: 'n 次根', d: '\\sqrt[n]{x}，方括号里是根指数。' },
      { i: 'x^{2}', c: 'x^{\u0001}', t: '上标', d: 'x^{2}；指数多于一个字符时要用花括号。' },
      { i: 'x_{n}', c: 'x_{\u0001}', t: '下标', d: 'x_{n}，常用于数列、分量。' },
      { i: 'x_{n}^{2}', c: 'x_{\u0001}^{}', t: '上下标', d: 'x_{n}^{2}，先下标再上标。' },
      { i: '\\pm', c: '\\pm ', t: '正负号', d: '\\pm 输出 ±。' },
      { i: '\\times', c: '\\times ', t: '乘号', d: '\\times 输出 ×；点乘用 \\cdot。' },
      { i: '\\cdot', c: '\\cdot ', t: '点乘', d: '\\cdot 输出 ·，常用于向量与数量积。' },
      { i: '\\div', c: '\\div ', t: '除号', d: '\\div 输出 ÷。' },
      { i: '\\leq', c: '\\leq ', t: '小于等于', d: '\\leq 或 \\le，输出 ≤。' },
      { i: '\\geq', c: '\\geq ', t: '大于等于', d: '\\geq 或 \\ge，输出 ≥。' },
      { i: '\\neq', c: '\\neq ', t: '不等于', d: '\\neq 输出 ≠。' },
      { i: '\\approx', c: '\\approx ', t: '约等于', d: '\\approx 输出 ≈。' },
      { i: '\\equiv', c: '\\equiv ', t: '恒等/同余', d: '\\equiv 输出 ≡。' },
      { i: '\\infty', c: '\\infty ', t: '无穷', d: '\\infty 输出 ∞。' },
      { i: '\\pi', c: '\\pi ', t: '圆周率', d: '\\pi 输出 π。' },
      { i: '90^{\\circ}', c: '^{\\circ}', t: '度数', d: '^{\\circ} 输出 °，如 90^{\\circ}。' },
      { i: '\\cdots', c: '\\cdots ', t: '居中省略号', d: '\\cdots 用于 a_1+a_2+\\cdots+a_n。' },
      { i: '\\ldots', c: '\\ldots ', t: '基线省略号', d: '\\ldots 用于 1,2,\\ldots,n。' },
      { i: '\\vdots', c: '\\vdots ', t: '竖向省略号', d: '\\vdots，矩阵中常用。' },
      { i: '\\ddots', c: '\\ddots ', t: '斜向省略号', d: '\\ddots，矩阵对角线常用。' },
      { i: '\\angle', c: '\\angle ', t: '角', d: '\\angle ABC 输出 ∠ABC。' },
      { i: '\\triangle', c: '\\triangle ', t: '三角形', d: '\\triangle ABC 输出 △ABC。' },
      { i: '\\perp', c: '\\perp ', t: '垂直', d: '\\perp 输出 ⊥。' },
      { i: '\\parallel', c: '\\parallel ', t: '平行', d: '\\parallel 输出 ∥。' },
      { i: '\\text{文字}', c: '\\text{\u0001}', t: '文本', d: '\\text{…} 在公式里插入正体文字。' }
    ],

    '微积分': [
      { i: '\\lim_{x\\to 0}', c: '\\lim_{x \\to 0} ', t: '极限', d: '\\lim_{x \\to 0}：下标写趋近过程，行间公式会自动排到下方。' },
      { i: '\\lim_{n\\to\\infty}', c: '\\lim_{n \\to \\infty} ', t: '数列极限', d: '\\lim_{n \\to \\infty}。' },
      { i: '\\lim_{x\\to 0^{+}}', c: '\\lim_{x \\to 0^{+}} ', t: '单侧极限', d: '\\lim_{x \\to 0^{+}} 右极限；左极限改 0^{-}。' },
      { i: 'x \\to 0', c: '\\to ', t: '趋于', d: '\\to 输出 →。' },
      { i: '\\infty', c: '\\infty ', t: '无穷', d: '\\infty 输出 ∞。' },
      { i: '\\partial', c: '\\partial ', t: '偏导符号', d: '\\partial 输出 ∂。' },
      { i: '\\nabla', c: '\\nabla ', t: '梯度算子', d: '\\nabla 输出 ∇。' },
      { i: '\\frac{dy}{dx}', c: '\\frac{\\mathrm{d}y}{\\mathrm{d}x}', t: '导数', d: '微分算子用直体 d：\\mathrm{d}，符合排版规范。' },
      { i: '\\frac{\\partial z}{\\partial x}', c: '\\frac{\\partial z}{\\partial x}', t: '偏导数', d: '\\partial 表示偏导。' },
      { i: "f'(x)", c: "f'(x)", t: '导数撇号', d: "f'(x)：撇号直接用 ' 即可。" },
      { i: '\\dot{x}', c: '\\dot{x}', t: '一阶导点', d: '\\dot{x} 表示对时间的一阶导。' },
      { i: '\\ddot{x}', c: '\\ddot{x}', t: '二阶导点', d: '\\ddot{x} 表示对时间的二阶导。' },
      { i: '\\Delta x', c: '\\Delta x', t: '增量', d: '\\Delta x 输出 Δx。' },
      { i: '\\mathrm{d}x', c: '\\mathrm{d}x', t: '微分', d: '\\mathrm{d}x：直体 d 是中文排版惯例。' },
      { i: '\\int f\\,dx', c: '\\int f(x)\\,\\mathrm{d}x', t: '不定积分', d: '\\int 后接被积函数；\\, 是细空格。' },
      { i: '\\int_{a}^{b}', c: '\\int_{a}^{b} ', t: '定积分', d: '\\int_{a}^{b}：上下限写在积分号右侧。' },
      { i: '\\iint', c: '\\iint ', t: '二重积分', d: '\\iint 输出 ∬。' },
      { i: '\\iiint', c: '\\iiint ', t: '三重积分', d: '\\iiint 输出 ∭。' },
      { i: '\\oint', c: '\\oint ', t: '环路积分', d: '\\oint 输出 ∮。' },
      { i: '\\sum_{n=1}^{\\infty}', c: '\\sum_{n=1}^{\\infty} ', t: '级数求和', d: '\\sum_{n=1}^{\\infty}，行间公式上下限会排到上下方。' },
      { i: '\\prod_{i=1}^{n}', c: '\\prod_{i=1}^{n} ', t: '连乘', d: '\\prod 输出 ∏。' },
      { i: '\\left. F(x)\\right|_{a}^{b}', c: '\\left. \\right|_{a}^{b}', t: '代入上下限', d: '定积分计算常用的“竖线代入”写法。' },
      { i: '\\varepsilon', c: '\\varepsilon ', t: 'ε', d: '\\varepsilon 输出 ε，与 \\epsilon 略有区别。' },
      { i: '\\delta', c: '\\delta ', t: 'δ', d: '\\delta 输出 δ。' },
      { i: '\\lim_{\\Delta x\\to 0}', c: '\\lim_{\\Delta x \\to 0} ', t: '增量极限', d: '导数的原始定义写法。' }
    ],

    '希腊字母': [
      { i: '\\alpha', c: '\\alpha ' }, { i: '\\beta', c: '\\beta ' }, { i: '\\gamma', c: '\\gamma ' },
      { i: '\\delta', c: '\\delta ' }, { i: '\\epsilon', c: '\\epsilon ' }, { i: '\\varepsilon', c: '\\varepsilon ' },
      { i: '\\zeta', c: '\\zeta ' }, { i: '\\eta', c: '\\eta ' }, { i: '\\theta', c: '\\theta ' },
      { i: '\\vartheta', c: '\\vartheta ' }, { i: '\\iota', c: '\\iota ' }, { i: '\\kappa', c: '\\kappa ' },
      { i: '\\lambda', c: '\\lambda ' }, { i: '\\mu', c: '\\mu ' }, { i: '\\nu', c: '\\nu ' },
      { i: '\\xi', c: '\\xi ' }, { i: '\\pi', c: '\\pi ' }, { i: '\\rho', c: '\\rho ' },
      { i: '\\sigma', c: '\\sigma ' }, { i: '\\tau', c: '\\tau ' }, { i: '\\upsilon', c: '\\upsilon ' },
      { i: '\\phi', c: '\\phi ' }, { i: '\\varphi', c: '\\varphi ' }, { i: '\\chi', c: '\\chi ' },
      { i: '\\psi', c: '\\psi ' }, { i: '\\omega', c: '\\omega ' },
      { i: '\\Gamma', c: '\\Gamma ' }, { i: '\\Delta', c: '\\Delta ' }, { i: '\\Theta', c: '\\Theta ' },
      { i: '\\Lambda', c: '\\Lambda ' }, { i: '\\Xi', c: '\\Xi ' }, { i: '\\Pi', c: '\\Pi ' },
      { i: '\\Sigma', c: '\\Sigma ' }, { i: '\\Phi', c: '\\Phi ' }, { i: '\\Psi', c: '\\Psi ' },
      { i: '\\Omega', c: '\\Omega ' }
    ],

    '上下标·结构': [
      { i: 'x^{2}', c: 'x^{\u0001}', t: '上标', d: 'x^{2}。' },
      { i: 'x_{i}', c: 'x_{\u0001}', t: '下标', d: 'x_{i}。' },
      { i: 'x_{i}^{2}', c: 'x_{\u0001}^{}', t: '上下标', d: 'x_{i}^{2}。' },
      { i: 'a_{n+1}', c: 'a_{n+1}', t: '复合下标', d: '多字符下标要用花括号包住。' },
      { i: '\\sum_{i=1}^{n}', c: '\\sum_{i=1}^{n} ', t: '求和', d: '上下限用 ^ 与 _。' },
      { i: '\\int_{a}^{b}', c: '\\int_{a}^{b} ', t: '积分', d: '上下限用 ^ 与 _。' },
      { i: '\\lim_{n\\to\\infty}', c: '\\lim_{n \\to \\infty} ', t: '极限', d: '趋近过程写在下标。' },
      { i: '\\binom{n}{k}', c: '\\binom{n}{k}', t: '组合数', d: '\\binom{n}{k} 输出 C_n^k 样式。' },
      { i: '\\overset{\\text{def}}{=}', c: '\\overset{\\text{def}}{=}', t: '定义等号', d: '\\overset{上}{下} 在符号上叠字。' },
      { i: '\\underset{n\\to\\infty}{\\lim}', c: '\\underset{n \\to \\infty}{\\lim}', t: '正下方极限', d: '\\underset 把条件排到正下方。' },
      { i: '\\overline{AB}', c: '\\overline{AB}', t: '上划线', d: '\\overline 用于线段、平均值。' },
      { i: '\\underline{x}', c: '\\underline{\u0001}', t: '下划线', d: '\\underline{x}。' },
      { i: '\\vec{a}', c: '\\vec{a}', t: '向量', d: '\\vec{a}。' },
      { i: '\\overrightarrow{AB}', c: '\\overrightarrow{AB}', t: '有向线段', d: '\\overrightarrow{AB}。' },
      { i: '\\hat{x}', c: '\\hat{x}', t: '帽', d: '\\hat{x}，估计量常用。' },
      { i: '\\bar{x}', c: '\\bar{x}', t: '横线', d: '\\bar{x}，样本均值常用。' },
      { i: '\\tilde{x}', c: '\\tilde{x}', t: '波浪线', d: '\\tilde{x}。' },
      { i: '\\widehat{ABC}', c: '\\widehat{ABC}', t: '宽帽', d: '\\widehat 用于多字符。' },
      { i: '\\dot{x}', c: '\\dot{x}', t: '点', d: '\\dot{x}。' },
      { i: '\\ddot{x}', c: '\\ddot{x}', t: '双点', d: '\\ddot{x}。' }
    ],

    '大型运算符': [
      { i: '\\sum', c: '\\sum ', t: '求和', d: '\\sum；上下限用 _ ^ 指定。' },
      { i: '\\prod', c: '\\prod ', t: '连乘', d: '\\prod。' },
      { i: '\\coprod', c: '\\coprod ', t: '余积', d: '\\coprod。' },
      { i: '\\int', c: '\\int ', t: '积分', d: '\\int。' },
      { i: '\\iint', c: '\\iint ', t: '二重积分', d: '\\iint。' },
      { i: '\\iiint', c: '\\iiint ', t: '三重积分', d: '\\iiint。' },
      { i: '\\oint', c: '\\oint ', t: '环路积分', d: '\\oint。' },
      { i: '\\bigcup', c: '\\bigcup ', t: '并集', d: '\\bigcup_{i=1}^{n}。' },
      { i: '\\bigcap', c: '\\bigcap ', t: '交集', d: '\\bigcap_{i=1}^{n}。' },
      { i: '\\bigoplus', c: '\\bigoplus ', t: '直和', d: '\\bigoplus。' },
      { i: '\\bigotimes', c: '\\bigotimes ', t: '张量积', d: '\\bigotimes。' },
      { i: '\\lim', c: '\\lim ', t: '极限', d: '\\lim_{x \\to a}。' },
      { i: '\\max', c: '\\max ', t: '最大值', d: '\\max_{x \\in D}。' },
      { i: '\\min', c: '\\min ', t: '最小值', d: '\\min_{x \\in D}。' },
      { i: '\\sup', c: '\\sup ', t: '上确界', d: '\\sup。' },
      { i: '\\inf', c: '\\inf ', t: '下确界', d: '\\inf。' },
      { i: '\\det', c: '\\det ', t: '行列式', d: '\\det A。' },
      { i: '\\gcd', c: '\\gcd ', t: '最大公因数', d: '\\gcd(a,b)。' },
      { i: '\\log', c: '\\log ', t: '对数', d: '\\log_a x。' },
      { i: '\\ln', c: '\\ln ', t: '自然对数', d: '\\ln x。' },
      { i: '\\exp', c: '\\exp ', t: '指数', d: '\\exp x。' },
      { i: '\\sin', c: '\\sin ', t: '正弦', d: '\\sin x。' },
      { i: '\\cos', c: '\\cos ', t: '余弦', d: '\\cos x。' },
      { i: '\\tan', c: '\\tan ', t: '正切', d: '\\tan x。' },
      { i: '\\cot', c: '\\cot ', t: '余切', d: '\\cot x。' },
      { i: '\\arcsin', c: '\\arcsin ', t: '反正弦', d: '\\arcsin x。' },
      { i: '\\arctan', c: '\\arctan ', t: '反正切', d: '\\arctan x。' },
      { i: '\\sinh', c: '\\sinh ', t: '双曲正弦', d: '\\sinh x。' },
      { i: '\\cosh', c: '\\cosh ', t: '双曲余弦', d: '\\cosh x。' }
    ],

    '矩阵·分段': [
      {
        i: '\\begin{cases}1\\\\0\\end{cases}',
        c: '\\begin{cases}\n  \u0001 & , \\\\\n   & .\n\\end{cases}',
        demo: '\\begin{cases} x^2, & x>0 \\\\ 0, & x\\le 0 \\end{cases}',
        t: '分段函数', d: 'cases 环境：每行用 & 对齐、\\\\ 换行；整个环境要放在 $…$ 内。', tpl: true
      },
      {
        i: '\\begin{aligned}a&=b\\\\&=c\\end{aligned}',
        c: '\\begin{aligned}\n  \u0001 &= \\\\\n   &=\n\\end{aligned}',
        demo: '\\begin{aligned} a &= b+c \\\\ &= d \\end{aligned}',
        t: 'aligned 对齐', d: 'aligned 可嵌在 $…$ 内，用 & 对齐等号、\\\\ 换行。', tpl: true
      },
      {
        i: '\\begin{align*}a&=b\\\\&=c\\end{align*}',
        c: '\\begin{align*}\n  \u0001 &= \\\\\n   &=\n\\end{align*}',
        demo: '\\begin{align*} a &= b+c \\\\ &= d \\end{align*}',
        t: 'align* 环境', d: '独立的多行对齐公式，不能放进 $…$，直接写在正文即可。', tpl: true, noWrap: true, display: true
      },
      {
        i: '\\begin{gather*}a\\\\b\\end{gather*}',
        c: '\\begin{gather*}\n  \u0001 \\\\\n  \n\\end{gather*}',
        demo: '\\begin{gather*} a+b \\\\ c+d \\end{gather*}',
        t: 'gather* 环境', d: '多行居中公式，不能放进 $…$，直接写在正文即可。', tpl: true, noWrap: true, display: true
      },
      {
        i: '\\begin{pmatrix}1&2\\\\3&4\\end{pmatrix}',
        c: '\\begin{pmatrix}\n  \u0001 & \\\\\n   &\n\\end{pmatrix}',
        demo: '\\begin{pmatrix} a & b \\\\ c & d \\end{pmatrix}',
        t: '圆括号矩阵', d: 'pmatrix：& 分列，\\\\ 分行，需放在 $…$ 内。', tpl: true
      },
      {
        i: '\\begin{bmatrix}1&2\\\\3&4\\end{bmatrix}',
        c: '\\begin{bmatrix}\n  \u0001 & \\\\\n   &\n\\end{bmatrix}',
        demo: '\\begin{bmatrix} a & b \\\\ c & d \\end{bmatrix}',
        t: '方括号矩阵', d: 'bmatrix。', tpl: true
      },
      {
        i: '\\begin{vmatrix}1&2\\\\3&4\\end{vmatrix}',
        c: '\\begin{vmatrix}\n  \u0001 & \\\\\n   &\n\\end{vmatrix}',
        demo: '\\begin{vmatrix} a & b \\\\ c & d \\end{vmatrix}',
        t: '行列式', d: 'vmatrix：竖线定界，适合行列式。', tpl: true
      },
      {
        i: '\\begin{matrix}1&2\\\\3&4\\end{matrix}',
        c: '\\begin{matrix}\n  \u0001 & \\\\\n   &\n\\end{matrix}',
        demo: '\\begin{matrix} a & b \\\\ c & d \\end{matrix}',
        t: '无括号矩阵', d: 'matrix：不带定界符。', tpl: true
      },
      {
        i: '\\begin{array}{cc}1&2\\\\3&4\\end{array}',
        c: '\\begin{array}{cc}\n  \u0001 & \\\\\n   &\n\\end{array}',
        demo: '\\begin{array}{cc} a & b \\\\ c & d \\end{array}',
        t: 'array 表格', d: 'array{cc}：可指定列对齐（l/c/r）。', tpl: true
      },
      {
        i: '\\left\\{\\begin{aligned}1\\\\2\\end{aligned}\\right.',
        c: '\\left\\{\n\\begin{aligned}\n  \u0001\n\\end{aligned}\n\\right.',
        demo: '\\left\\{ \\begin{aligned} x &= 1 \\\\ y &= 2 \\end{aligned} \\right.',
        t: '左花括号组', d: '\\left\\{ … \\right. 配 aligned，可写联立式。', tpl: true
      }
    ],

    '关系·逻辑': [
      { i: '\\because', c: '\\because ', t: '因为', d: '\\because 输出 ∵。' },
      { i: '\\therefore', c: '\\therefore ', t: '所以', d: '\\therefore 输出 ∴。' },
      { i: '=', c: ' = ', t: '等号', d: '=。' },
      { i: '\\neq', c: '\\neq ', t: '不等', d: '\\neq。' },
      { i: '\\approx', c: '\\approx ', t: '约等', d: '\\approx。' },
      { i: '\\equiv', c: '\\equiv ', t: '恒等', d: '\\equiv。' },
      { i: '\\sim', c: '\\sim ', t: '相似/等价', d: '\\sim。' },
      { i: '\\cong', c: '\\cong ', t: '全等', d: '\\cong。' },
      { i: '\\propto', c: '\\propto ', t: '正比', d: '\\propto。' },
      { i: '\\ll', c: '\\ll ', t: '远小于', d: '\\ll。' },
      { i: '\\gg', c: '\\gg ', t: '远大于', d: '\\gg。' },
      { i: '\\leq', c: '\\leq ', t: '≤', d: '\\leq。' },
      { i: '\\geq', c: '\\geq ', t: '≥', d: '\\geq。' },
      { i: '\\in', c: '\\in ', t: '属于', d: '\\in。' },
      { i: '\\notin', c: '\\notin ', t: '不属于', d: '\\notin。' },
      { i: '\\subset', c: '\\subset ', t: '真子集', d: '\\subset。' },
      { i: '\\subseteq', c: '\\subseteq ', t: '子集', d: '\\subseteq。' },
      { i: '\\supset', c: '\\supset ', t: '超集', d: '\\supset。' },
      { i: '\\cup', c: '\\cup ', t: '并集', d: '\\cup。' },
      { i: '\\cap', c: '\\cap ', t: '交集', d: '\\cap。' },
      { i: '\\setminus', c: '\\setminus ', t: '差集', d: '\\setminus。' },
      { i: '\\emptyset', c: '\\emptyset ', t: '空集', d: '\\emptyset 或 \\varnothing。' },
      { i: '\\forall', c: '\\forall ', t: '任意', d: '\\forall。' },
      { i: '\\exists', c: '\\exists ', t: '存在', d: '\\exists。' },
      { i: '\\neg', c: '\\neg ', t: '否定', d: '\\neg。' },
      { i: '\\land', c: '\\land ', t: '且', d: '\\land 输出 ∧。' },
      { i: '\\lor', c: '\\lor ', t: '或', d: '\\lor 输出 ∨。' }
    ],

    '箭头': [
      { i: '\\to', c: '\\to ', t: '趋于', d: '\\to 与 \\rightarrow 等价。' },
      { i: '\\rightarrow', c: '\\rightarrow ', t: '右箭头', d: '\\rightarrow。' },
      { i: '\\leftarrow', c: '\\leftarrow ', t: '左箭头', d: '\\leftarrow。' },
      { i: '\\leftrightarrow', c: '\\leftrightarrow ', t: '双向箭头', d: '\\leftrightarrow。' },
      { i: '\\Rightarrow', c: '\\Rightarrow ', t: '推出', d: '\\Rightarrow 输出 ⇒。' },
      { i: '\\Leftarrow', c: '\\Leftarrow ', t: '反向推出', d: '\\Leftarrow。' },
      { i: '\\Leftrightarrow', c: '\\Leftrightarrow ', t: '等价', d: '\\Leftrightarrow 输出 ⇔。' },
      { i: '\\mapsto', c: '\\mapsto ', t: '映射到', d: '\\mapsto 输出 ↦。' },
      { i: '\\longrightarrow', c: '\\longrightarrow ', t: '长箭头', d: '\\longrightarrow。' },
      { i: '\\rightrightarrows', c: '\\rightrightarrows ', t: '双右箭头', d: '\\rightrightarrows。' },
      { i: '\\uparrow', c: '\\uparrow ', t: '上箭头', d: '\\uparrow。' },
      { i: '\\downarrow', c: '\\downarrow ', t: '下箭头', d: '\\downarrow。' },
      { i: '\\nearrow', c: '\\nearrow ', t: '斜上箭头', d: '\\nearrow。' },
      { i: '\\searrow', c: '\\searrow ', t: '斜下箭头', d: '\\searrow。' }
    ],

    '括号·定界符': [
      { i: '\\left( x \\right)', c: '\\left( \\right)', t: '自适应圆括号', d: '\\left( … \\right) 会随内容高度伸缩。' },
      { i: '\\left[ x \\right]', c: '\\left[ \\right]', t: '自适应方括号', d: '\\left[ … \\right]。' },
      { i: '\\left\\{ x \\right\\}', c: '\\left\\{ \\right\\}', t: '自适应花括号', d: '花括号要写成 \\{ 和 \\}。' },
      { i: '\\left| x \\right|', c: '\\left| \\right|', t: '绝对值', d: '\\left| … \\right|。' },
      { i: '\\langle x \\rangle', c: '\\langle \\rangle', t: '尖括号', d: '内积或分组。' },
      { i: '\\lfloor x \\rfloor', c: '\\lfloor \\rfloor', t: '向下取整', d: '\\lfloor … \\rfloor。' },
      { i: '\\lceil x \\rceil', c: '\\lceil \\rceil', t: '向上取整', d: '\\lceil … \\rceil。' },
      { i: '\\big( x \\big)', c: '\\big( \\big)', t: '稍大括号', d: '\\big 手动放大一档。' },
      { i: '\\bigg(', c: '\\Bigg( \\Bigg)', t: '特大括号', d: '\\Bigg 放大四档。' },
      { i: '\\overbrace{a+b}^{n}', c: '\\overbrace{\u0001}^{}', t: '上花括号', d: '\\overbrace{…}^{说明}。' },
      { i: '\\underbrace{a+b}_{n}', c: '\\underbrace{\u0001}_{}', t: '下花括号', d: '\\underbrace{…}_{说明}。' },
      { i: '\\left. x \\right|_{0}', c: '\\left. \\right|_{}^{}', t: '代入竖线', d: '\\left. … \\right| 配合上下标。' }
    ],

    '字体·排版': [
      { i: '\\mathbb{R}', c: '\\mathbb{R}', t: '实数集', d: '\\mathbb{R} 输出 ℝ。' },
      { i: '\\mathbb{N}', c: '\\mathbb{N}', t: '自然数集', d: '\\mathbb{N}。' },
      { i: '\\mathbb{Z}', c: '\\mathbb{Z}', t: '整数集', d: '\\mathbb{Z}。' },
      { i: '\\mathbb{Q}', c: '\\mathbb{Q}', t: '有理数集', d: '\\mathbb{Q}。' },
      { i: '\\mathbb{C}', c: '\\mathbb{C}', t: '复数集', d: '\\mathbb{C}。' },
      { i: '\\mathcal{L}', c: '\\mathcal{L}', t: '花体', d: '\\mathcal{…}，如拉普拉斯变换。' },
      { i: '\\mathbf{v}', c: '\\mathbf{v}', t: '粗体向量', d: '\\mathbf{v} 正体粗。' },
      { i: '\\boldsymbol{\\alpha}', c: '\\boldsymbol{\\alpha}', t: '粗体希腊', d: '\\boldsymbol 用于希腊字母加粗。' },
      { i: '\\mathrm{d}', c: '\\mathrm{d}', t: '直体 d', d: '微分算子用直体，符合 GB/T 规范。' },
      { i: '\\operatorname{rank}', c: '\\operatorname{rank}', t: '自定义算子', d: '\\operatorname{…} 生成正体函数名。' },
      { i: '\\displaystyle\\sum', c: '\\displaystyle ', t: '行内变行间', d: '\\displaystyle 让行内公式按行间大小排版。' },
      { i: 'a\\quad b', c: '\\quad ', t: '宽空格', d: '\\quad 一个汉字宽。' },
      { i: 'a\\qquad b', c: '\\qquad ', t: '更宽空格', d: '\\qquad 两个 \\quad 宽。' },
      { i: 'a\\,b', c: '\\,', t: '细空格', d: '\\, 用于 f(x)\\,\\mathrm{d}x。' },
      { i: 'a\\;b', c: '\\;', t: '中空格', d: '\\; 稍宽于 \\,。' },
      { i: '\\boxed{E=mc^2}', c: '\\boxed{\u0001}', t: '方框', d: '\\boxed{…}。', tpl: true }
    ]
  };

  // Fill in a generic title/description for the Greek letters.
  PALETTE['希腊字母'].forEach(function (it) {
    if (!it.t) {
      it.t = '希腊字母';
      it.d = '插入 ' + it.c.trim() + '。';
    }
  });

  root.LHPalette = PALETTE;
  if (typeof module !== 'undefined' && module.exports) module.exports = PALETTE;
})(typeof window !== 'undefined' ? window : globalThis);
