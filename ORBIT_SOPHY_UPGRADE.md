# ORBIT SOPHY — UPGRADE COMPLETO
**Briefing para Claude Code · Nível Expert · 100% Gratuito**

---

## CONTEXTO DO PROJETO

**Repositório:** GitHub Pages · estático puro  
**Stack:** HTML/CSS/JS vanilla com ES modules  
**IA:** Groq LLaMA 3.3 70B (primário) + Gemini (fallback)  
**Storage:** localStorage / sessionStorage (zero backend próprio)  
**Fontes atuais:** Geist Variable (CDN), Space Grotesk, Inter, JetBrains Mono (locais)

### Estrutura de arquivos
```
OS-main/
├── index.html          ← HTML único (~800 linhas)
├── css/
│   ├── style.css       ← Design system principal
│   └── modules.css     ← Estilos por módulo
├── js/
│   ├── app.js          ← Controller principal (3768 linhas)
│   ├── ai.js           ← Motor IA: Groq + Gemini + webSearch
│   ├── agenda.js       ← Calendário e eventos
│   ├── entertainment.js← Esportes: ESPN, F1, transferências, notícias
│   ├── faith.js        ← Fé, versículos, orações
│   ├── finance.js      ← Finanças, categorias, orçamento
│   ├── habits.js       ← Hábitos, mood (humor)
│   ├── store.js        ← Chaves localStorage, estado global, DEFAULT_PROMPT
│   ├── study.js        ← Flashcards, UFPI, Pomodoro, Kanban
│   ├── tools.js        ← Calculadora, conversor, gerador de senha, JSON↔CSV
│   ├── ui.js           ← Aurora bg (WebGL), renderMd, toast, setStatus
│   └── vault.js        ← Cofre AES-256-GCM
├── fonts/              ← Space Grotesk, JetBrains Mono, Inter (woff2 locais)
├── manifest.json
└── sw.js
```

---

## REGRAS GERAIS PARA TODA IMPLEMENTAÇÃO

1. **Zero dependências novas** — tudo em vanilla JS, canvas puro, CSS puro
2. **Zero backend** — sem servidor, sem Node, sem build step
3. **Zero custo** — apenas APIs gratuitas já em uso ou listadas aqui
4. **Mobile-first** — device alvo: Xiaomi Redmi Note 11 Pro 5G (1080×2400, 20:9)
5. **ES Modules** — `import/export` já usado; manter o padrão
6. **Comentários em PT-BR** — todo código novo comentado em português
7. **Não quebrar o que já funciona** — cada bloco implementado testa antes de avançar
8. **`orbit` global** — o objeto `App` é exposto como `window.orbit`; manter

---

## BLOCO 1 — FONTE ARIAL GLOBAL

### O que mudar
**Arquivo:** `css/style.css`

Substituir as variáveis de fonte no `:root`:
```css
/* ANTES */
--font-display: 'Geist Variable', 'Space Grotesk', system-ui, sans-serif;
--font-body:    'Geist Variable', 'Inter', system-ui, -apple-system, sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', Menlo, monospace;

/* DEPOIS */
--font-display: Arial, 'Helvetica Neue', 'Liberation Sans', sans-serif;
--font-body:    Arial, 'Helvetica Neue', 'Liberation Sans', sans-serif;
--font-mono:    'JetBrains Mono', 'SF Mono', Consolas, monospace;
```

**Arquivo:** `index.html`  
Remover a linha do CDN do Geist (não precisa mais):
```html
<!-- REMOVER esta linha: -->
<link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/@fontsource-variable/geist@5.1.0/index.css">
```

**Arquivo:** `js/app.js`  
Buscar todas as ocorrências de fontes hardcoded dentro de `canvas.getContext('2d')` e substituir:
```js
// Buscar e substituir todo ctx.font que mencione Geist ou Space Grotesk:
// ANTES: ctx.font = `600 11px 'Geist Variable', sans-serif`;
// DEPOIS:
ctx.font = `600 11px Arial, sans-serif`;

// ANTES: ctx.font = `10px 'Geist Variable', sans-serif`;
// DEPOIS:
ctx.font = `10px Arial, sans-serif`;

// ANTES: ctx.font = `600 12px 'JetBrains Mono', monospace`;
// Manter monospace pra números financeiros — é intencional
```

> **Nota:** Fazer busca global por `'Geist Variable'` e `'Space Grotesk'` em todo o projeto e substituir por `Arial, sans-serif`. JetBrains Mono fica só onde é monospace explícito (código, números de câmbio, terminal).

---

## BLOCO 2 — LOADING SCREENS ELABORADAS

### Objetivo
Criar um componente `OS.Loader` reutilizável com etapas sequenciais animadas, inspirado no app Astra AI (tela preta, ícone animado, lista de etapas com check progressivo, barra de progresso).

### Implementação no `index.html`
Adicionar logo após a `<div id="aurora-bg">`:
```html
<!-- ── LOADER GLOBAL ─────────────────────────────── -->
<div id="os-loader" class="os-loader" style="display:none">
  <div class="osl-inner">
    <div class="osl-icon">
      <!-- Ícone SVG da OS já existente, com animação de pulso -->
      <svg viewBox="0 0 512 512" width="56" height="56" aria-hidden="true">
        <g fill="#fff" stroke="#fff" stroke-width="2" stroke-linejoin="round">
          <circle cx="256" cy="92" r="33" fill="none" stroke-width="22"/>
          <path d="M242 122 L270 122 L266 392 L246 392 Z"/>
          <path d="M120 196 L168 176 Q256 152 344 176 L392 196 L344 206 Q256 184 168 206 Z"/>
          <path d="M92 246 C 96 358 168 452 256 452 C 344 452 416 358 420 246 C 404 316 366 350 324 364 C 302 372 280 376 256 376 C 232 376 210 372 188 364 C 146 350 108 316 92 246 Z"/>
          <path d="M236 440 L256 488 L276 440 Z"/>
        </g>
      </svg>
    </div>
    <div class="osl-title" id="osl-title">Carregando...</div>
    <div class="osl-steps" id="osl-steps"></div>
    <div class="osl-bar-wrap">
      <div class="osl-bar" id="osl-bar"></div>
    </div>
  </div>
</div>
```

### CSS no `style.css`
```css
/* ── OS LOADER ── */
.os-loader {
  position: fixed; inset: 0; z-index: 9999;
  background: #000;
  display: flex; align-items: center; justify-content: center;
  animation: loaderFadeIn 0.2s ease;
}
@keyframes loaderFadeIn { from { opacity: 0 } to { opacity: 1 } }

.osl-inner {
  display: flex; flex-direction: column;
  align-items: center; gap: 20px;
  padding: 32px 24px; width: 100%; max-width: 340px;
}

.osl-icon svg {
  animation: osl-pulse 1.8s ease-in-out infinite;
  opacity: 0.9;
}
@keyframes osl-pulse {
  0%,100% { opacity: 0.7; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.06); }
}

.osl-title {
  font-family: Arial, sans-serif;
  font-size: 13px; font-weight: 700;
  letter-spacing: 2px; text-transform: uppercase;
  color: rgba(255,255,255,0.5);
}

.osl-steps {
  width: 100%; display: flex; flex-direction: column; gap: 10px;
}

.osl-step {
  display: flex; align-items: center; gap: 12px;
  font-family: Arial, sans-serif; font-size: 13px;
  color: rgba(255,255,255,0.35);
  transition: color 0.3s ease;
}
.osl-step.active  { color: rgba(255,255,255,0.85); }
.osl-step.done    { color: rgba(255,255,255,0.45); }

.osl-step-dot {
  width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
  background: rgba(255,255,255,0.15);
  transition: background 0.3s ease;
}
.osl-step.active .osl-step-dot {
  background: var(--gold);
  box-shadow: 0 0 8px var(--gold);
  animation: osl-dot-pulse 1s ease-in-out infinite;
}
.osl-step.done .osl-step-dot { background: var(--ok); }

@keyframes osl-dot-pulse {
  0%,100% { opacity: 1 } 50% { opacity: 0.4 }
}

.osl-step-check {
  margin-left: auto; font-size: 12px; color: var(--ok);
  opacity: 0; transition: opacity 0.3s;
}
.osl-step.done .osl-step-check { opacity: 1; }

.osl-bar-wrap {
  width: 100%; height: 2px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden;
}
.osl-bar {
  height: 100%; width: 0%;
  background: linear-gradient(90deg, var(--gold), var(--gold-hi));
  border-radius: 2px;
  transition: width 0.4s ease;
}
```

### Utilitário JS — criar arquivo `js/loader.js`
```js
/**
 * LOADER.JS — Loading screen com etapas sequenciais
 * Orbit Sophy v2
 */

export class Loader {
  static _timer = null;

  /**
   * Exibe o loader com etapas automáticas
   * @param {string} title - Título exibido acima das etapas
   * @param {string[]} steps - Lista de textos das etapas
   * @param {number} stepDelay - Ms entre cada etapa (padrão: 600)
   */
  static show(title, steps = [], stepDelay = 600) {
    const el = document.getElementById('os-loader');
    const titleEl = document.getElementById('osl-title');
    const stepsEl = document.getElementById('osl-steps');
    const bar = document.getElementById('osl-bar');
    if (!el) return;

    // Renderiza etapas
    titleEl.textContent = title || 'Carregando...';
    stepsEl.innerHTML = steps.map((s, i) => `
      <div class="osl-step" id="osl-step-${i}">
        <div class="osl-step-dot"></div>
        <span>${s}</span>
        <span class="osl-step-check">✓</span>
      </div>
    `).join('');
    bar.style.width = '0%';
    el.style.display = 'flex';

    // Anima etapas sequencialmente
    if (this._timer) clearTimeout(this._timer);
    steps.forEach((_, i) => {
      setTimeout(() => {
        // Marca anterior como done
        if (i > 0) {
          document.getElementById(`osl-step-${i - 1}`)?.classList.remove('active');
          document.getElementById(`osl-step-${i - 1}`)?.classList.add('done');
        }
        document.getElementById(`osl-step-${i}`)?.classList.add('active');
        bar.style.width = `${Math.round(((i + 1) / steps.length) * 85)}%`;
      }, i * stepDelay);
    });
  }

  /** Finaliza o loader (completa barra e some suavemente) */
  static hide(delay = 300) {
    const el = document.getElementById('os-loader');
    const bar = document.getElementById('osl-bar');
    const stepsEl = document.getElementById('osl-steps');
    if (!el) return;

    // Marca última etapa como done
    stepsEl?.querySelectorAll('.osl-step').forEach(s => {
      s.classList.remove('active');
      s.classList.add('done');
    });
    if (bar) bar.style.width = '100%';

    setTimeout(() => {
      el.style.opacity = '0';
      el.style.transition = 'opacity 0.3s ease';
      setTimeout(() => {
        el.style.display = 'none';
        el.style.opacity = '';
        el.style.transition = '';
      }, 300);
    }, delay);
  }
}
```

### Importar no `app.js`
```js
import { Loader } from './loader.js';
```

### Onde usar o Loader

**Inicialização do app** — dentro do método `boot()`, antes de mostrar o app:
```js
// Adicionar no início de boot(), depois de _migrateConfig():
Loader.show('INICIALIZANDO OS', [
  'Verificando identidade',
  'Carregando dados',
  'Preparando interface'
], 500);
// Esconder após o pin ser validado (dentro de unlockApp()):
Loader.hide(200);
```

**Web search** — em `app.js`, na seção `AI.needsWeb(text)`:
```js
// ANTES do UI.setStatus('buscando na web...'):
Loader.show('BUSCANDO NA INTERNET', [
  'Consultando fontes',
  'Filtrando resultados',
  'Preparando resposta'
], 700);
// Após receber resultado da busca:
Loader.hide(100);
```

**Carregando esportes** — no `switchHub('esportes')`:
```js
Loader.show('CARREGANDO ESPORTES', [
  'Buscando dados dos times',
  'Carregando classificação',
  'Buscando próximos jogos'
], 600);
// Após loadSports():
Loader.hide();
```

**IA respondendo** — na função de envio de mensagem, quando a IA começa a responder:
```js
// Mostrar brevemente enquanto aguarda primeiro token
Loader.show('ORBIT PENSANDO', [
  'Organizando contexto',
  'Gerando resposta'
], 800);
// Esconder quando chega o primeiro delta da IA
Loader.hide(0);
```

---

## BLOCO 3 — GRÁFICOS NOVOS (canvas puro)

### 3.1 Donut de Finanças — Melhorado

**Arquivo:** `js/app.js` — método `_renderFinChart(s)`

Substituir implementação atual por versão com:
- Animação sweep de entrada (0 → 360° em 500ms)
- Hover/touch: fatia se destaca (offset 6px do centro)
- Label central: valor total de gastos
- Legenda mais legível (Arial, espaçamento melhor)
- Altura aumentada para 200px

```js
_renderFinChart(s) {
  const canvas = document.getElementById('fin-chart');
  if (!canvas) return;
  const byCat = Finance.byCategory((s.txs || []).filter(t => t.type === 'expense'));
  if (!byCat.length) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 320;
  const H = 200;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);

  const COLORS = ['#d4af37','#4a9eff','#4ad08a','#ff6b6b','#a78bfa','#f59e0b','#06b6d4'];
  const cx = W * 0.28, cy = H / 2;
  const r = Math.min(cy - 14, W * 0.24);
  const total = byCat.reduce((a, b) => a + b.total, 0);

  // Animação sweep
  let progress = 0;
  const animate = () => {
    ctx.clearRect(0, 0, W, H);
    progress = Math.min(progress + 0.06, 1);
    const ease = 1 - Math.pow(1 - progress, 3); // ease-out cubic

    let angle = -Math.PI / 2;
    byCat.slice(0, 7).forEach((cat, i) => {
      const slice = (cat.total / total) * Math.PI * 2 * ease;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, angle, angle + slice);
      ctx.closePath();
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.fill();
      angle += slice;
    });

    // Buraco central
    ctx.beginPath();
    ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
    ctx.fillStyle = '#080808';
    ctx.fill();

    // Label central (total)
    if (progress >= 0.95) {
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.font = `700 13px Arial, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText(Finance.fmt(total), cx, cy + 5);
      ctx.fillStyle = 'rgba(255,255,255,0.4)';
      ctx.font = `10px Arial, sans-serif`;
      ctx.fillText('GASTOS', cx, cy - 9);
    }

    // Legenda
    const lx = W * 0.56;
    ctx.textAlign = 'left';
    byCat.slice(0, Math.min(5, byCat.length)).forEach((cat, i) => {
      const y = 20 + i * 36;
      // Bolinha cor
      ctx.fillStyle = COLORS[i % COLORS.length];
      ctx.beginPath();
      ctx.arc(lx + 5, y - 3, 5, 0, Math.PI * 2);
      ctx.fill();
      // Nome categoria
      ctx.fillStyle = 'rgba(255,255,255,0.5)';
      ctx.font = `10px Arial, sans-serif`;
      ctx.fillText(cat.name.slice(0, 11), lx + 14, y);
      // Valor
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `600 12px Arial, sans-serif`;
      ctx.fillText(Finance.fmt(cat.total), lx + 14, y + 14);
      // Percentual
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.font = `9px Arial, sans-serif`;
      ctx.fillText(`${Math.round((cat.total/total)*100)}%`, lx + 14, y + 26);
    });

    if (progress < 1) requestAnimationFrame(animate);
  };
  requestAnimationFrame(animate);

  // Touch/hover highlight
  const highlight = (px, py) => {
    let angle = -Math.PI / 2;
    byCat.slice(0, 7).forEach((cat, i) => {
      const slice = (cat.total / total) * Math.PI * 2;
      const mid = angle + slice / 2;
      const dx = px - cx, dy = py - cy;
      const dist = Math.sqrt(dx*dx + dy*dy);
      const testAngle = Math.atan2(dy, dx);
      // Verificação angular simplificada: desenhar fatia destacada
      angle += slice;
    });
  };
  canvas.addEventListener('click', e => {
    const rect = canvas.getBoundingClientRect();
    highlight(e.clientX - rect.left, e.clientY - rect.top);
  });
}
```

---

### 3.2 Line Chart — Humor da Semana

**Arquivo:** `js/app.js` — método `_renderMood()`

Substituir o HTML das barras por um canvas com line chart:

No `index.html`, dentro de `<div id="hub-habitos">`, substituir `<div class="mood-week" id="mood-week">` por:
```html
<canvas id="mood-chart" style="width:100%;height:90px;display:block;margin-top:12px"></canvas>
```

Novo método `_renderMoodChart()` em `app.js`:
```js
_renderMoodChart() {
  const canvas = document.getElementById('mood-chart');
  if (!canvas) return;
  const data = Mood.last7(); // [{date, day, value}]

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 300;
  const H = 90;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 8, r: 8, t: 12, b: 24 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const n = data.length;
  const stepX = chartW / (n - 1);

  // Converte valor (1-5) para coordenada Y (invertido)
  const toY = v => pad.t + chartH - ((v - 1) / 4) * chartH;
  const toX = i => pad.l + i * stepX;

  // Filtra pontos com valor
  const pts = data.map((d, i) => ({
    x: toX(i), y: d.value ? toY(d.value) : null,
    v: d.value, day: d.day
  }));

  // Área preenchida
  const validPts = pts.filter(p => p.y !== null);
  if (validPts.length >= 2) {
    ctx.beginPath();
    ctx.moveTo(validPts[0].x, toY(1) + chartH * 0.1);
    validPts.forEach(p => ctx.lineTo(p.x, p.y));
    ctx.lineTo(validPts[validPts.length - 1].x, toY(1) + chartH * 0.1);
    ctx.closePath();
    const grad = ctx.createLinearGradient(0, pad.t, 0, H - pad.b);
    grad.addColorStop(0, 'rgba(212,175,55,0.25)');
    grad.addColorStop(1, 'rgba(212,175,55,0)');
    ctx.fillStyle = grad;
    ctx.fill();

    // Linha
    ctx.beginPath();
    ctx.moveTo(validPts[0].x, validPts[0].y);
    for (let i = 1; i < validPts.length; i++) {
      // Bezier suavizado
      const cp1x = (validPts[i-1].x + validPts[i].x) / 2;
      ctx.bezierCurveTo(cp1x, validPts[i-1].y, cp1x, validPts[i].y, validPts[i].x, validPts[i].y);
    }
    ctx.strokeStyle = 'rgba(212,175,55,0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  // Pontos e labels
  pts.forEach((p, i) => {
    // Label do dia
    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(p.day, p.x, H - 6);

    if (p.y === null) return;

    // Ponto
    const isToday = i === n - 1;
    ctx.beginPath();
    ctx.arc(p.x, p.y, isToday ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fillStyle = isToday ? 'var(--gold, #d4af37)' : 'rgba(212,175,55,0.7)';
    ctx.fill();
    if (isToday) {
      ctx.strokeStyle = 'rgba(212,175,55,0.3)';
      ctx.lineWidth = 3;
      ctx.stroke();
    }

    // Emoji do mood como label
    const emojis = ['','😞','😕','😐','🙂','😄'];
    ctx.font = '11px Arial, sans-serif';
    ctx.fillText(emojis[p.v] || '', p.x, p.y - 9);
  });
}
```

Chamar `_renderMoodChart()` dentro de `renderHubHabitos()` e de `setMood()`.

---

### 3.3 Heatmap de Hábitos — Estilo GitHub

**Arquivo:** `js/app.js` — dentro de `renderHubHabitos()`, após a lista de hábitos

Substituir o heatmap simples de 30 dias por versão anual tipo GitHub:

```js
_renderHabitsHeatmap(habitId = null) {
  // Obtém os últimos 365 dias de dados
  const habits = Habits.getAll(); // array de hábitos
  const today = new Date();
  const days = [];
  for (let i = 364; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const ds = d.toISOString().slice(0, 10);
    const done = habitId
      ? (Habits.getDoneForDate(habitId, ds) ? 1 : 0)
      : habits.filter(h => Habits.getDoneForDate(h.id, ds)).length;
    days.push({ ds, done, max: habitId ? 1 : habits.length });
  }

  // Renderizar como grid de células
  const container = document.getElementById('habits-heatmap-container');
  if (!container) return;

  const COLS = Math.ceil(days.length / 7);
  const cellSize = Math.floor((container.offsetWidth - 16) / COLS);

  let html = `<div class="heatmap-grid" style="grid-template-columns:repeat(${COLS},${cellSize}px)">`;
  days.forEach(d => {
    const intensity = d.max ? Math.round((d.done / d.max) * 4) : 0;
    html += `<div class="hm-cell hm-i${intensity}" title="${d.ds}: ${d.done}/${d.max} hábitos" data-date="${d.ds}"></div>`;
  });
  html += '</div>';
  html += `<div class="hm-legend">
    <span style="font-size:10px;color:rgba(255,255,255,0.3)">Menos</span>
    <div class="hm-cell hm-i0"></div>
    <div class="hm-cell hm-i1"></div>
    <div class="hm-cell hm-i2"></div>
    <div class="hm-cell hm-i3"></div>
    <div class="hm-cell hm-i4"></div>
    <span style="font-size:10px;color:rgba(255,255,255,0.3)">Mais</span>
  </div>`;
  container.innerHTML = html;
}
```

**CSS no `modules.css`:**
```css
/* ── HEATMAP DE HÁBITOS ── */
.heatmap-grid {
  display: grid; gap: 2px;
  padding: 8px 8px 0;
}
.hm-cell {
  aspect-ratio: 1; border-radius: 2px;
  background: rgba(255,255,255,0.07);
}
.hm-i0 { background: rgba(255,255,255,0.06); }
.hm-i1 { background: rgba(212,175,55,0.25); }
.hm-i2 { background: rgba(212,175,55,0.45); }
.hm-i3 { background: rgba(212,175,55,0.70); }
.hm-i4 { background: rgba(212,175,55,0.95); }

.hm-legend {
  display: flex; align-items: center; gap: 3px;
  padding: 8px 8px 0; justify-content: flex-end;
}
.hm-legend .hm-cell { width: 10px; height: 10px; }
```

**No `index.html`**, dentro de `<div id="hub-habitos">`, adicionar antes do `hab-list`:
```html
<div id="habits-heatmap-container" style="margin-bottom:16px"></div>
```

> **Nota:** Implementar `Habits.getDoneForDate(habitId, dateStr)` em `habits.js` se não existir: retorna `true` se o hábito foi marcado naquela data.

---

### 3.4 Bar Chart — Finanças Mensais (6 meses)

**Arquivo:** `js/app.js` — adicionar método `_renderFinBarChart()`

Adicionar canvas no `index.html`, dentro de `<div id="cofre-fin">`, após os cards de saldo:
```html
<canvas id="fin-bar-chart" style="width:100%;height:150px;display:block;margin:0 0 12px"></canvas>
```

Método JS:
```js
_renderFinBarChart() {
  const canvas = document.getElementById('fin-bar-chart');
  if (!canvas) return;

  // Pega últimos 6 meses
  const months = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date();
    d.setMonth(d.getMonth() - i);
    const y = d.getFullYear(), m = d.getMonth() + 1;
    const txs = Finance.getTxs(y, m);
    months.push({
      label: ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez'][m-1],
      income:  txs.filter(t => t.type==='income').reduce((a,b) => a+b.amount, 0),
      expense: txs.filter(t => t.type==='expense').reduce((a,b) => a+b.amount, 0)
    });
  }

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 320;
  const H = 150;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const maxVal = Math.max(...months.map(m => Math.max(m.income, m.expense)), 1);
  const pad = { l: 8, r: 8, t: 10, b: 22 };
  const chartH = H - pad.t - pad.b;
  const groupW = (W - pad.l - pad.r) / months.length;
  const barW = groupW * 0.28;

  months.forEach((m, i) => {
    const x = pad.l + i * groupW + groupW * 0.1;
    // Barra entrada (verde)
    const ih = (m.income / maxVal) * chartH;
    ctx.fillStyle = 'rgba(74,208,138,0.75)';
    ctx.beginPath();
    ctx.roundRect(x, pad.t + chartH - ih, barW, ih, [3, 3, 0, 0]);
    ctx.fill();
    // Barra saída (vermelho)
    const eh = (m.expense / maxVal) * chartH;
    ctx.fillStyle = 'rgba(255,90,90,0.75)';
    ctx.beginPath();
    ctx.roundRect(x + barW + 2, pad.t + chartH - eh, barW, eh, [3, 3, 0, 0]);
    ctx.fill();
    // Label mês
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(m.label, x + barW + 1, H - 6);
  });

  // Legenda
  ctx.fillStyle = 'rgba(74,208,138,0.8)';
  ctx.fillRect(pad.l, pad.t, 8, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.font = '10px Arial, sans-serif';
  ctx.textAlign = 'left';
  ctx.fillText('Entradas', pad.l + 12, pad.t + 8);
  ctx.fillStyle = 'rgba(255,90,90,0.8)';
  ctx.fillRect(pad.l + 80, pad.t, 8, 8);
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('Saídas', pad.l + 92, pad.t + 8);
}
```

Chamar `_renderFinBarChart()` dentro de `renderCofreFin()`.

---

### 3.5 Calendário — Múltiplos Pontos por Categoria + Swipe

**Arquivo:** `js/app.js` — método `_renderCalendar()`

Substituir a lógica de `daysWithEvents.has(d)` por versão com pontos coloridos por categoria:

```js
// ANTES (busca só se tem evento):
const daysWithEvents = Agenda.getDaysWithEvents(this._agendaYear, this._agendaMonth);
// ...
${hasDot ? '<div class="cal-dot"></div>' : ''}

// DEPOIS (busca eventos com categorias):
const dayEvents = Agenda.getEventsByDay(this._agendaYear, this._agendaMonth);
// dayEvents = { "15": [{cat:'dax',...}, {cat:'ufpi',...}], "20": [{cat:'faith',...}] }

// Na geração do HTML de cada dia:
const evts = dayEvents[d] || [];
const dots = evts.slice(0, 3).map(e =>
  `<div class="cal-dot" style="background:${Agenda.catColor(e.cat)}"></div>`
).join('');
// Substituir ${hasDot ? '<div class="cal-dot"></div>' : ''} por:
${dots ? `<div class="cal-dots-row">${dots}</div>` : ''}
```

**Em `agenda.js`**, adicionar método:
```js
// Retorna objeto { dia: [eventos] } para o mês
static getEventsByDay(year, month) {
  const all = Store.get(K.agenda, []);
  const prefix = `${year}-${String(month).padStart(2,'0')}-`;
  const result = {};
  all.filter(e => e.date?.startsWith(prefix)).forEach(e => {
    const day = parseInt(e.date.split('-')[2]);
    if (!result[day]) result[day] = [];
    result[day].push(e);
  });
  return result;
}
```

**CSS:**
```css
.cal-dots-row {
  display: flex; gap: 2px; justify-content: center;
  margin-top: 2px;
}
.cal-dots-row .cal-dot {
  width: 4px; height: 4px; border-radius: 50%;
}
```

**Swipe para navegar meses:**
```js
// No setupListeners() ou dentro do _renderCalendar():
const calEl = document.getElementById('agenda-cal');
if (calEl && !calEl._swipeInit) {
  calEl._swipeInit = true;
  let startX = 0;
  calEl.addEventListener('touchstart', e => { startX = e.touches[0].clientX; }, { passive: true });
  calEl.addEventListener('touchend', e => {
    const dx = e.changedTouches[0].clientX - startX;
    if (Math.abs(dx) > 50) {
      dx < 0 ? this.agendaNextMonth() : this.agendaPrevMonth();
    }
  });
}
```

---

## BLOCO 4 — TIMES: DADOS COMPLETOS

### 4.1 Expandir card do time

**Arquivo:** `js/entertainment.js` — adicionar métodos:

```js
// Busca últimos N resultados do time
static async getTeamLastResults(espnId, league, n = 5) {
  const key = `ent_last_${espnId}`;
  const hit = scGet(key);
  if (hit) return hit;

  try {
    const d = await fetchJSON(`${ESPN_BASE}/${league}/teams/${espnId}/schedule`);
    if (!d) return [];
    const completed = (d.events || [])
      .filter(e => e.status?.type?.completed)
      .slice(-n)
      .map(e => {
        const comps = e.competitions?.[0];
        const home = comps?.competitors?.find(c => c.homeAway === 'home');
        const away = comps?.competitors?.find(c => c.homeAway === 'away');
        const isHome = home?.team?.id === espnId;
        const myScore = isHome ? parseInt(home?.score || 0) : parseInt(away?.score || 0);
        const oppScore = isHome ? parseInt(away?.score || 0) : parseInt(home?.score || 0);
        const opp = isHome ? away?.team?.displayName : home?.team?.displayName;
        let result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';
        return { result, myScore, oppScore, opp: opp?.slice(0, 12) || '?' };
      });
    scSet(key, completed);
    return completed;
  } catch { return []; }
}

// Busca posição na tabela
static async getTeamStanding(espnId, league) {
  const key = `ent_stand_${espnId}`;
  const hit = scGet(key);
  if (hit) return hit;

  try {
    const d = await fetchJSON(`${ESPN_BASE}/${league}/standings`);
    if (!d) return null;
    // Procura o time nas entradas da tabela
    const entries = d.standings?.entries || [];
    const entry = entries.find(e => e.team?.id === espnId);
    if (!entry) return null;
    const stats = {};
    (entry.stats || []).forEach(s => { stats[s.name] = s.value; });
    const result = {
      pos: entry.note?.rank || entries.indexOf(entry) + 1,
      pts: stats.points || stats.pts || 0,
      wins: stats.wins || 0,
      losses: stats.losses || 0,
      draws: stats.ties || stats.draws || 0
    };
    scSet(key, result);
    return result;
  } catch { return null; }
}
```

### 4.2 Card expandido no HTML (renderizado em `_renderTeamsList()`)

**Arquivo:** `js/app.js` — substituir HTML do `sport-team-card`:

```js
// Substituir o innerHTML do team card por versão expandida:
el.innerHTML = teams.map(t => `
  <div class="sport-team-card stc-v2">
    <div class="stc-hdr">
      <span class="stc-flag">${t.flag || '⚽'}</span>
      <div class="stc-info">
        <span class="stc-name">${t.name}</span>
        <span class="stc-league" id="stc-league-${t.id}">carregando...</span>
      </div>
      <div class="stc-actions">
        <button class="stc-btn-sm" onclick="orbit.sportViewTransfers('${t.tmId||''}','${t.name}')">Transf.</button>
        <button class="stc-del" onclick="orbit.sportRemoveTeam('${t.id}')">×</button>
      </div>
    </div>
    <!-- Últimos resultados -->
    <div class="stc-results" id="stc-results-${t.id}">
      <span style="color:var(--fg-4);font-size:11px">Carregando resultados...</span>
    </div>
    <!-- Próximo jogo -->
    <div class="stcg" id="stcg-${t.id}">
      <span style="color:var(--fg-4);font-size:12px">Buscando...</span>
    </div>
    <!-- Posição na tabela -->
    <div class="stc-standing" id="stc-stand-${t.id}"></div>
  </div>
`).join('');

// Carregar dados assíncronos para cada time
teams.forEach(t => {
  this._loadTeamGame(t);
  this._loadTeamResults(t);
  this._loadTeamStanding(t);
});
```

```js
// Novo método para carregar resultados:
async _loadTeamResults(team) {
  const el = document.getElementById(`stc-results-${team.id}`);
  if (!el) return;
  const results = await Entertainment.getTeamLastResults(team.espnId, team.espnLeague);
  if (!results.length) { el.innerHTML = ''; return; }
  const chips = results.map(r => {
    const cls = r.result === 'W' ? 'chip-win' : r.result === 'L' ? 'chip-loss' : 'chip-draw';
    return `<div class="stc-chip ${cls}" title="${r.opp}: ${r.myScore}×${r.oppScore}">${r.result}</div>`;
  }).join('');
  el.innerHTML = `<div class="stc-chips-row">${chips}</div>`;
}

// Novo método para posição na tabela:
async _loadTeamStanding(team) {
  const el = document.getElementById(`stc-stand-${team.id}`);
  if (!el) return;
  const s = await Entertainment.getTeamStanding(team.espnId, team.espnLeague);
  if (!s) { el.innerHTML = ''; return; }
  el.innerHTML = `
    <div class="stc-standing-row">
      <span class="stc-pos">${s.pos}º</span>
      <span class="stc-pts">${s.pts} pts</span>
      <span class="stc-wdl">${s.wins}V ${s.draws}E ${s.losses}D</span>
    </div>
  `;
}
```

**CSS para cards de times (`modules.css`):**
```css
.stc-v2 { padding: 14px 14px 10px; }
.stc-info { display:flex; flex-direction:column; flex:1; }
.stc-league { font-size: 10px; color: var(--fg-4); margin-top: 1px; }

.stc-chips-row { display:flex; gap:5px; margin: 8px 0 4px; }
.stc-chip {
  width: 26px; height: 26px; border-radius: 6px;
  display:flex; align-items:center; justify-content:center;
  font-size: 10px; font-weight: 700; font-family: Arial, sans-serif;
}
.chip-win  { background: rgba(74,208,138,0.2); color: #4ad08a; border: 1px solid rgba(74,208,138,0.3); }
.chip-draw { background: rgba(255,255,255,0.08); color: rgba(255,255,255,0.5); border: 1px solid rgba(255,255,255,0.12); }
.chip-loss { background: rgba(255,90,90,0.2); color: #ff6b6b; border: 1px solid rgba(255,90,90,0.3); }

.stc-standing-row {
  display:flex; align-items:center; gap:10px;
  padding: 6px 0 4px;
  font-size: 11px; color: var(--fg-3);
  border-top: 1px solid var(--line-1);
  margin-top: 6px;
}
.stc-pos { font-weight:700; color: var(--gold); font-size:13px; }
.stc-pts { font-weight:600; color: var(--fg-2); }
.stc-wdl { color: var(--fg-4); }
```

### 4.3 Contexto do time para a Sophy

**Arquivo:** `js/ai.js` — no método `buildSys()`, adicionar bloco de esportes:

```js
// Após agendaContext(), adicionar:
static sportsContext() {
  const teams = Store.get('orbit_teams', []);
  if (!teams.length) return '';
  // Dados em cache de sessão dos times
  let ctx = '\n\n## MEUS TIMES\n';
  teams.forEach(t => {
    const next = sessionStorage.getItem(`ent_next_${t.espnId}`);
    const results = sessionStorage.getItem(`ent_last_${t.espnId}`);
    const standing = sessionStorage.getItem(`ent_stand_${t.espnId}`);
    ctx += `\n**${t.name}**\n`;
    if (standing) {
      try {
        const s = JSON.parse(standing).data;
        ctx += `- Posição: ${s.pos}º, ${s.pts} pts (${s.wins}V ${s.draws}E ${s.losses}D)\n`;
      } catch {}
    }
    if (results) {
      try {
        const r = JSON.parse(results).data;
        const form = r.map(x => x.result).join('');
        ctx += `- Últimos 5: ${form}\n`;
      } catch {}
    }
    if (next) {
      try {
        const n = JSON.parse(next).data;
        ctx += `- Próximo jogo: ${n.home} × ${n.away}\n`;
      } catch {}
    }
  });
  return ctx;
}
```

Incluir `this.sportsContext()` no retorno de `buildSys()`.

---

## BLOCO 5 — WEB SEARCH APRIMORADA

### 5.1 Adicionar compound-beta ao select de modelos

**Arquivo:** `js/app.js` — na função `renderPanelTab('ai')`:

```js
// Adicionar ao select de modelos Groq:
<option value="compound-beta" ${cfg.groqModel==='compound-beta'?'selected':''}>
  ⚡ Compound Beta (web search nativa — experimental)
</option>
<option value="llama-3.3-70b-specdec" ${cfg.groqModel==='llama-3.3-70b-specdec'?'selected':''}>
  🚀 LLaMA 3.3 70B SpecDec (mais rápido)
</option>
<option value="deepseek-r1-distill-llama-70b" ${cfg.groqModel==='deepseek-r1-distill-llama-70b'?'selected':''}>
  🧠 DeepSeek R1 Distill 70B (raciocínio)
</option>
<option value="gemma2-9b-it" ${cfg.groqModel==='gemma2-9b-it'?'selected':''}>
  🪶 Gemma 2 9B (ultra leve)
</option>
```

### 5.2 Suporte ao compound-beta (tools nativos)

**Arquivo:** `js/ai.js` — no método `streamGroq()`:

```js
// Quando o modelo for compound-beta, ativar tools de busca nativa:
const isCompound = (c.groqModel || GROQ_MODEL) === 'compound-beta';
const body = {
  model: c.groqModel || GROQ_MODEL,
  messages,
  stream: true,
  temperature: 0.85,
  max_tokens: payload.max_tokens || this._autoMaxTokens(payload.messages)
};

// compound-beta suporta web_search como tool nativa
if (isCompound) {
  body.tools = [{ type: 'web_search' }];
  body.tool_choice = 'auto';
}
```

### 5.3 Melhorar `needsWeb()` — detectar mais padrões

**Arquivo:** `js/ai.js` — expandir a função:

```js
// Adicionar antes do return false:
// Perguntas sobre times e esportes (resultado recente)
if (/\b(jog(ou|aram|ando)|partida|placar|campeonato|tabela|classifica[cç]|gol|assist[eê]ncia|escala[cç]|elenco|contrat|reforo|transfer)\w*/.test(t)) return true;
// Clima e previsão (já tem API mas pode querer via chat)
if (/\b(chuva|calor|temperatura|clima|previsão|previsao|tempo hoje|vai chover)\w*/.test(t)) return true;
// Tecnologia / lançamentos
if (/\b(lançou|lancou|saiu|disponível|disponivel|novo (modelo|app|jogo|filme|série|serie)|update|atualiz)\w*/.test(t)) return true;
```

---

## BLOCO 6 — VISUAL REPAGINADO

### 6.1 Adjustes gerais de UI (`style.css`)

```css
/* ── Cards com mais profundidade ── */
.dash-card {
  /* Adicionar ao existente: */
  border: 1px solid rgba(255,255,255,0.09);
  box-shadow: inset 0 1px 0 rgba(255,255,255,0.04), 0 4px 24px rgba(0,0,0,0.3);
  border-radius: 16px;
}
.dash-card:hover {
  border-color: rgba(255,255,255,0.13);
}

/* ── Botões com feedback de toque ── */
.btn { 
  /* Adicionar ao existente: */
  transition: transform 0.1s ease, opacity 0.1s ease;
}
.btn:active { transform: scale(0.97); opacity: 0.9; }

/* ── Tipografia mais hierárquica ── */
.dc-title {
  /* Aumentar letter-spacing nos títulos uppercase */
  letter-spacing: 0.12em;
}

/* ── Balões da Sophy ── */
.msg-ai .bubble {
  /* Levemente diferente do fundo */
  background: var(--bg-3);
  border: 1px solid rgba(255,255,255,0.06);
}

/* ── Avatar da Sophy com pulso quando pensa ── */
.av.thinking .av-core {
  animation: avPulse 1.2s ease-in-out infinite;
}
@keyframes avPulse {
  0%,100% { opacity: 0.6; transform: scale(1); }
  50%      { opacity: 1;   transform: scale(1.1); }
}
```

### 6.2 Quick Actions no Dashboard

**Arquivo:** `index.html` — adicionar após o botão `dash-chat-btn`:
```html
<div class="dash-quick-actions">
  <button class="dqa-btn" onclick="orbit.openEvtModal()">
    <span class="dqa-icon">📅</span>
    <span class="dqa-label">Evento</span>
  </button>
  <button class="dqa-btn" onclick="orbit.openTxModal()">
    <span class="dqa-icon">💰</span>
    <span class="dqa-label">Gasto</span>
  </button>
  <button class="dqa-btn" onclick="orbit.switchTab('hub');setTimeout(()=>orbit.switchHub('habitos'),200)">
    <span class="dqa-icon">✅</span>
    <span class="dqa-label">Hábito</span>
  </button>
  <button class="dqa-btn" onclick="orbit.switchTab('academia');setTimeout(()=>orbit.switchAcad('pomo'),200)">
    <span class="dqa-icon">⏱️</span>
    <span class="dqa-label">Pomo</span>
  </button>
  <button class="dqa-btn" onclick="orbit.openChat()">
    <span class="dqa-icon">💬</span>
    <span class="dqa-label">Chat</span>
  </button>
</div>
```

**CSS:**
```css
.dash-quick-actions {
  display: flex; gap: 8px; padding: 0 16px 4px;
  overflow-x: auto; scrollbar-width: none;
}
.dash-quick-actions::-webkit-scrollbar { display: none; }
.dqa-btn {
  display: flex; flex-direction: column; align-items: center; gap: 4px;
  background: var(--bg-2); border: 1px solid var(--line-1);
  border-radius: 12px; padding: 10px 14px; min-width: 56px;
  cursor: pointer; transition: background 0.15s, transform 0.1s;
  flex-shrink: 0;
}
.dqa-btn:active { transform: scale(0.94); background: var(--bg-3); }
.dqa-icon { font-size: 18px; line-height: 1; }
.dqa-label { font-size: 9px; font-weight: 600; letter-spacing: 0.05em; color: var(--fg-3); text-transform: uppercase; }
```

### 6.3 Tema Dinâmico por Hora

**Arquivo:** `js/app.js` — adicionar no método `boot()`:

```js
// Aplica tema dinâmico por hora do dia
_applyDynamicTheme() {
  const h = AI.nowBR().getHours();
  const root = document.documentElement;
  if (h >= 0 && h < 5) {
    // Madrugada: ultra-escuro, tons de roxo frio
    root.style.setProperty('--aurora-1', 'rgba(80,40,120,0.12)');
    root.style.setProperty('--aurora-2', 'rgba(40,40,80,0.08)');
  } else if (h >= 5 && h < 12) {
    // Manhã: tom azulado
    root.style.setProperty('--aurora-1', 'rgba(40,80,160,0.15)');
    root.style.setProperty('--aurora-2', 'rgba(60,120,180,0.08)');
  } else if (h >= 18 && h < 23) {
    // Noite: tons mais quentes/âmbar
    root.style.setProperty('--aurora-1', 'rgba(160,80,40,0.12)');
    root.style.setProperty('--aurora-2', 'rgba(180,120,20,0.08)');
  }
  // 12h-18h: padrão (sem override)
}
```

Chamar `_applyDynamicTheme()` no `boot()` após `applyAccent()`.

### 6.4 Streak de Uso do App

**Arquivo:** `js/store.js` — adicionar chave:
```js
streak: 'orbit_streak',  // { lastOpen: 'YYYY-MM-DD', count: N }
```

**Arquivo:** `js/app.js` — adicionar método:
```js
_updateStreak() {
  const today = AI.todayStr();
  const data = Store.get(Store.K?.streak || 'orbit_streak', { lastOpen: '', count: 0 });
  const yesterday = (() => {
    const d = new Date(); d.setDate(d.getDate() - 1);
    return AI.todayStr(d);
  })();
  if (data.lastOpen === today) return data.count;
  if (data.lastOpen === yesterday) {
    data.count++;
  } else if (data.lastOpen !== today) {
    data.count = 1;
  }
  data.lastOpen = today;
  Store.set('orbit_streak', data);
  return data.count;
}
```

Mostrar no dashboard — adicionar no `dash-greet`:
```html
<div class="dash-streak" id="dash-streak" style="display:none">
  🔥 <span id="streak-count">0</span> dias seguidos
</div>
```

```js
// No renderDashboard():
const streak = this._updateStreak();
const streakEl = document.getElementById('dash-streak');
const streakCount = document.getElementById('streak-count');
if (streakEl && streak >= 2) {
  streakEl.style.display = 'flex';
  streakCount.textContent = streak;
}
```

**CSS:**
```css
.dash-streak {
  display: flex; align-items: center; gap: 4px;
  font-size: 11px; color: var(--gold);
  font-weight: 600; margin-top: 4px;
}
```

### 6.5 Indicador de Humor no Header do Chat

**Arquivo:** `index.html` — no `.hdr-status`, após `#hdr-st`:
```html
<span id="hdr-mood-badge" class="hdr-mood-badge" style="display:none"></span>
```

**Arquivo:** `js/app.js` — no `openChat()`:
```js
// Adicionar ao openChat():
const moodVal = Mood.today();
const moodBadge = document.getElementById('hdr-mood-badge');
if (moodBadge) {
  const emojis = ['','😞','😕','😐','🙂','😄'];
  if (moodVal) {
    moodBadge.textContent = emojis[moodVal];
    moodBadge.style.display = 'inline';
    moodBadge.title = 'Humor registrado hoje';
  } else {
    moodBadge.textContent = '❓';
    moodBadge.style.display = 'inline';
    moodBadge.title = 'Humor não registrado hoje';
    moodBadge.classList.add('pulse');
  }
}
```

**CSS:**
```css
.hdr-mood-badge {
  font-size: 14px; cursor: default;
  margin-left: 4px;
}
.hdr-mood-badge.pulse { animation: moodPulse 2s ease-in-out infinite; }
@keyframes moodPulse { 0%,100%{opacity:1} 50%{opacity:0.4} }
```

### 6.6 Botão "Resumo do Dia" da Sophy

**Arquivo:** `index.html` — no `dash-scroll`, antes do primeiro `dash-card`:
```html
<button class="dash-daily-brief" onclick="orbit.getDailyBrief()">
  <span>📋</span>
  <div class="ddb-text">
    <div class="ddb-title">Resumo do dia</div>
    <div class="ddb-sub">A Sophy prepara um briefing pra você</div>
  </div>
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M9 18l6-6-6-6"/></svg>
</button>
```

**Arquivo:** `js/app.js` — método:
```js
async getDailyBrief() {
  Loader.show('PREPARANDO BRIEFING', [
    'Verificando agenda',
    'Analisando hábitos',
    'Consultando finanças',
    'Sophy preparando resumo'
  ], 600);

  // Monta contexto do dia
  const agCtx = AI.agendaContext();
  const finCtx = (() => {
    const s = Finance.getSummary(new Date().getFullYear(), new Date().getMonth() + 1);
    return `\nSaldo atual: R$ ${(s.balance||0).toFixed(2)}, ${s.txs?.filter(t=>t.type==='expense').length||0} gastos no mês`;
  })();
  const habCtx = (() => {
    const habits = Habits.getAll();
    const done = habits.filter(h => Habits.isDoneToday(h.id)).length;
    return `\nHábitos: ${done}/${habits.length} feitos hoje`;
  })();

  const prompt = `O Pai acabou de abrir o app. Dê um briefing diário CURTO (máx 4 linhas) no teu estilo: o que tem na agenda hoje, como estão os hábitos, situação financeira resumida, e encerra com uma motivação ou versículo rápido. Sem formatação, papo de WhatsApp mesmo.\n${agCtx}${finCtx}${habCtx}`;

  this.openChat();
  await new Promise(r => setTimeout(r, 300));
  Loader.hide(100);
  await this.sendMsg(prompt, { silent: true }); // 'silent' não mostra a mensagem do usuário no chat
}
```

---

## BLOCO 7 — EXPORTAÇÃO DE DADOS

**Arquivo:** `js/app.js` — na aba `sys` do painel, adicionar:
```html
<div class="psec">
  <label class="plabel">BACKUP E EXPORTAÇÃO</label>
  <button class="btn btn-ghost" onclick="orbit.exportAllData()">📦 Exportar todos os dados</button>
  <p style="font-size:10px;color:var(--text-muted);margin-top:4px">Gera um JSON com agenda, finanças, hábitos, flashcards e memórias</p>
</div>
```

**Método:**
```js
exportAllData() {
  const data = {
    exportDate: new Date().toISOString(),
    version: '2.0',
    agenda:   Store.get(K.agenda, []),
    finance:  Store.get(K.fin_tx, []),
    habits:   Store.get(K.habits, []),
    flash:    Store.get(K.flash, []),
    kanban:   Store.get(K.kanban, {}),
    grades:   Store.get(K.grades, []),
    memories: Store.getEp(),
    nuclues:  Store.getNuc(),
    config:   (() => { // Remove chaves de API do export
      const c = Store.getCfg();
      return { ...c, apiKey: '***', groqKey: '***' };
    })()
  };

  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `orbit-backup-${AI.todayStr()}.json`;
  a.click();
  URL.revokeObjectURL(url);

  // Web Share API como alternativa
  if (navigator.share && navigator.canShare?.({ files: [new File([blob], a.download)] })) {
    navigator.share({
      files: [new File([blob], a.download, { type: 'application/json' })],
      title: 'Orbit Sophy — Backup'
    }).catch(() => {});
  }

  UI.toast('Backup gerado!', 'ok');
}
```

---

## BLOCO 8 — EXTRAS BÔNUS

### 8.1 Timestamp nos balões do chat (hover reveal)

**Arquivo:** `js/app.js` — no `_buildBubble()` ou onde monta o HTML da mensagem:
```js
// Adicionar ao HTML do balão:
`<span class="msg-time">${new Date(msg.ts || Date.now()).toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}</span>`
```

**CSS:**
```css
.msg-time {
  font-size: 9px; color: rgba(255,255,255,0.2);
  display: block; margin-top: 4px; text-align: right;
  opacity: 0; transition: opacity 0.2s;
}
.msg-wrap:hover .msg-time, .msg-wrap:active .msg-time { opacity: 1; }
```

### 8.2 Animação de "digitando" mais orgânica

**CSS** — substituir o indicador de loading da IA:
```css
/* Três pontos pulsantes orgânicos */
.typing-dots { display: flex; gap: 4px; padding: 4px 0; }
.typing-dots span {
  width: 6px; height: 6px; border-radius: 50%;
  background: var(--gold); opacity: 0.4;
  animation: typingBounce 1.2s ease-in-out infinite;
}
.typing-dots span:nth-child(2) { animation-delay: 0.2s; }
.typing-dots span:nth-child(3) { animation-delay: 0.4s; }
@keyframes typingBounce {
  0%,60%,100% { transform: translateY(0); opacity: 0.4; }
  30%          { transform: translateY(-6px); opacity: 1; }
}
```

Usar `<div class="typing-dots"><span></span><span></span><span></span></div>` como placeholder enquanto a IA não enviou o primeiro token.

### 8.3 Tela de boas-vindas para novos usuários (first-run)

**Arquivo:** `js/app.js` — no `unlockApp()`, verificar `_isFirstRun`:
```js
if (this._isFirstRun) {
  this._isFirstRun = false;
  // Mostrar loader com onboarding
  Loader.show('BEM-VINDO À OS', [
    'Orbit Sophy inicializada',
    'Sistema de identidade ativo',
    'Memória episódica preparada',
    'Prontos para começar'
  ], 800);
  setTimeout(() => {
    Loader.hide();
    // Abrir chat automaticamente com mensagem de boas-vindas
    setTimeout(() => {
      this.openChat();
      // A Sophy vai falar algo de boas-vindas automaticamente via buildSys()
    }, 500);
  }, 3500);
}
```

---

## CHECKLIST DE IMPLEMENTAÇÃO

Execute nesta ordem para evitar conflitos:

- [ ] **B1** — Fonte Arial (1 arquivo CSS + 1 arquivo HTML + strings no app.js)
- [ ] **B2** — Loader JS criado (`js/loader.js`) + HTML + CSS
- [ ] **B2.1** — Loader integrado no boot, webSearch e esportes
- [ ] **B3.1** — Donut finanças melhorado (animação + label central)
- [ ] **B3.2** — Line chart humor (canvas substituindo as barras)
- [ ] **B3.3** — Heatmap hábitos anual (novo container HTML + JS)
- [ ] **B3.4** — Bar chart mensal de finanças (novo canvas + método JS)
- [ ] **B3.5** — Calendário: pontos coloridos por categoria + swipe
- [ ] **B4.1** — Times: métodos `getTeamLastResults` e `getTeamStanding` no `entertainment.js`
- [ ] **B4.2** — Times: card expandido com chips e standing
- [ ] **B4.3** — Times: contexto para Sophy no `ai.js`
- [ ] **B5.1** — Modelos Groq novos no select
- [ ] **B5.2** — Suporte compound-beta (tools nativos)
- [ ] **B5.3** — `needsWeb()` expandido
- [ ] **B6.1** — CSS: cards, botões, balões
- [ ] **B6.2** — Quick Actions no dashboard
- [ ] **B6.3** — Tema dinâmico por hora
- [ ] **B6.4** — Streak de uso
- [ ] **B6.5** — Indicador de humor no header
- [ ] **B6.6** — Botão Resumo do Dia
- [ ] **B7** — Exportação de dados
- [ ] **B8.1** — Timestamp nos balões
- [ ] **B8.2** — Typing indicator orgânico
- [ ] **B8.3** — Tela de boas-vindas first-run

---

## OBSERVAÇÕES FINAIS

- **Teste mobile real** após cada bloco (Chrome DevTools → Redmi 11 Pro 5G: 393×873 viewport)
- **localStorage** é o único banco de dados — nunca deletar dados existentes em migrações
- **`window.orbit`** exposto globalmente — qualquer `onclick` no HTML usa `orbit.método()`
- **ES Modules** — qualquer novo arquivo JS precisa ser `import`ado no `app.js` ou onde for usado
- **APIs gratuitas em uso:**
  - Groq: `console.groq.com` (14.400 req/dia)
  - Gemini: `aistudio.google.com` (free tier)
  - ESPN: `site.api.espn.com` (pública, sem chave)
  - Open-Meteo: clima (pública, sem chave)
  - Jina AI: web search (pública, sem chave, ~200 req/dia anônimo)
  - DuckDuckGo: fallback de busca (pública)
  - AwesomeAPI: câmbio (pública)
  - RSS2JSON: notícias (free tier 10k req/mês)
