# ORBIT SOPHY — UPGRADE PARTE 2
**Complemento do briefing anterior · Blocos B9 a B14**

> Este arquivo complementa o `ORBIT_SOPHY_UPGRADE.md` (Parte 1).
> Implementar APÓS todos os blocos B1–B8 estarem concluídos.

---

## REFERÊNCIA DA IMAGEM (EA FC 26 — Transfer History)

A tela de referência mostra:
- Lista cronológica de transferências (data | foto+nome+país | escudo origem → escudo destino | valor €)
- Filtros: "My Club" (times do usuário) / "All Clubs" (mercado global)
- Ordenação por colunas (data, nome, valor)
- Card selecionado com fundo levemente destacado
- Valores em formato europeu (€204.7M, €131.7M, etc.)
- Fotos dos jogadores (mini avatares circulares)

---

## BLOCO 9 — ABA GLOBAL DE TRANSFERÊNCIAS (estilo EA FC 26)

### Objetivo
Criar uma aba dedicada "Mercado" dentro do Hub > Esportes com visual inspirado na Transfer History do EA FC. Feed global das maiores transferências + filtro por times do usuário.

### 9.1 Nova sub-aba no HTML

**Arquivo:** `index.html` — na `mod-stab-row` do tab `hub-esportes`, adicionar:
```html
<!-- Adicionar ao mod-stab-row dos esportes -->
<button class="mod-stab" id="stab-mercado" onclick="orbit.switchHub('mercado')">🔁 Mercado</button>
```

**Nova seção HTML dentro de `#tab-hub`:**
```html
<!-- ── MERCADO DE TRANSFERÊNCIAS ─────────────── -->
<div id="hub-mercado" class="mod-section" style="display:none">

  <!-- Filtros de topo -->
  <div class="mercado-filters">
    <button class="mf-btn active" id="mf-global" onclick="orbit.mercadoFilter('global')">
      🌍 Mercado Global
    </button>
    <button class="mf-btn" id="mf-mytime" onclick="orbit.mercadoFilter('mytime')">
      ⭐ Meus Times
    </button>
  </div>

  <!-- Filtros de liga -->
  <div class="mercado-leagues" id="mercado-leagues">
    <button class="ml-btn active" data-lg="all" onclick="orbit.mercadoLeague('all')">Todas</button>
    <button class="ml-btn" data-lg="bra.1" onclick="orbit.mercadoLeague('bra.1')">🇧🇷 Brasileirão</button>
    <button class="ml-btn" data-lg="eng.1" onclick="orbit.mercadoLeague('eng.1')">🏴󠁧󠁢󠁥󠁮󠁧󠁿 Premier</button>
    <button class="ml-btn" data-lg="esp.1" onclick="orbit.mercadoLeague('esp.1')">🇪🇸 La Liga</button>
    <button class="ml-btn" data-lg="ita.1" onclick="orbit.mercadoLeague('ita.1')">🇮🇹 Serie A</button>
    <button class="ml-btn" data-lg="ger.1" onclick="orbit.mercadoLeague('ger.1')">🇩🇪 Bundesliga</button>
    <button class="ml-btn" data-lg="fra.1" onclick="orbit.mercadoLeague('fra.1')">🇫🇷 Ligue 1</button>
    <button class="ml-btn" data-lg="arg.1" onclick="orbit.mercadoLeague('arg.1')">🇦🇷 Argentina</button>
    <button class="ml-btn" data-lg="conmebol.libertadores" onclick="orbit.mercadoLeague('conmebol.libertadores')">🌎 Libertadores</button>
    <button class="ml-btn" data-lg="uefa.champions" onclick="orbit.mercadoLeague('uefa.champions')">🌍 Champions</button>
  </div>

  <!-- Ordenação -->
  <div class="mercado-sort-row">
    <span class="mercado-sort-label">Ordenar:</span>
    <button class="ms-btn active" id="ms-date" onclick="orbit.mercadoSort('date')">Data</button>
    <button class="ms-btn" id="ms-fee" onclick="orbit.mercadoSort('fee')">Valor</button>
    <button class="ms-btn" id="ms-name" onclick="orbit.mercadoSort('name')">Nome</button>
  </div>

  <!-- Header da tabela (estilo EA FC) -->
  <div class="mercado-table-hdr">
    <span class="mth-date">Data</span>
    <span class="mth-player">Jogador</span>
    <span class="mth-clubs">Transferência</span>
    <span class="mth-fee">Valor</span>
  </div>

  <!-- Lista de transferências -->
  <div id="mercado-list" class="mercado-list">
    <div class="mercado-skeleton">
      <!-- Skeletons renderizados via JS -->
    </div>
  </div>

  <!-- Botão carregar mais -->
  <button id="mercado-load-more" class="btn btn-ghost" style="margin:12px 16px;display:none"
    onclick="orbit.mercadoLoadMore()">
    Carregar mais
  </button>
</div>
```

### 9.2 CSS do Mercado

**Arquivo:** `css/modules.css` — adicionar:
```css
/* ════════════════════════════════════════
   MERCADO DE TRANSFERÊNCIAS (EA FC style)
   ════════════════════════════════════════ */

/* ── Filtros topo ── */
.mercado-filters {
  display: flex; gap: 8px;
  padding: 12px 14px 6px;
}
.mf-btn {
  flex: 1; padding: 9px 12px;
  border-radius: 10px;
  font-size: 12px; font-weight: 700; font-family: Arial, sans-serif;
  letter-spacing: 0.04em;
  background: var(--bg-2); border: 1px solid var(--line-1);
  color: var(--fg-3); cursor: pointer;
  transition: all 0.15s ease;
}
.mf-btn.active {
  background: rgba(212,175,55,0.15);
  border-color: rgba(212,175,55,0.4);
  color: var(--gold);
}

/* ── Ligas ── */
.mercado-leagues {
  display: flex; gap: 6px;
  padding: 6px 14px;
  overflow-x: auto; scrollbar-width: none;
}
.mercado-leagues::-webkit-scrollbar { display: none; }
.ml-btn {
  white-space: nowrap; padding: 5px 11px;
  border-radius: var(--r-pill);
  font-size: 11px; font-weight: 600; font-family: Arial, sans-serif;
  background: var(--bg-3); border: 1px solid var(--line-1);
  color: var(--fg-4); cursor: pointer; flex-shrink: 0;
  transition: all 0.15s;
}
.ml-btn.active {
  background: rgba(255,255,255,0.1);
  border-color: rgba(255,255,255,0.25);
  color: var(--fg-1);
}

/* ── Ordenação ── */
.mercado-sort-row {
  display: flex; align-items: center; gap: 6px;
  padding: 8px 14px 4px;
}
.mercado-sort-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.1em;
  color: var(--fg-4); text-transform: uppercase;
}
.ms-btn {
  padding: 4px 10px; border-radius: 6px;
  font-size: 10px; font-weight: 700; font-family: Arial, sans-serif;
  background: transparent; border: 1px solid var(--line-1);
  color: var(--fg-4); cursor: pointer; transition: all 0.15s;
}
.ms-btn.active { color: var(--gold); border-color: rgba(212,175,55,0.4); }

/* ── Header da tabela ── */
.mercado-table-hdr {
  display: grid;
  grid-template-columns: 44px 1fr 1fr 72px;
  padding: 6px 14px;
  font-size: 9px; font-weight: 700;
  letter-spacing: 0.12em; text-transform: uppercase;
  color: var(--fg-4); border-bottom: 1px solid var(--line-1);
}

/* ── Lista de transferências ── */
.mercado-list { padding: 0 0 80px; }

/* ── Card de transferência (EA FC style) ── */
.mercado-card {
  display: grid;
  grid-template-columns: 44px 1fr 1fr 72px;
  align-items: center;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
  cursor: pointer;
  transition: background 0.15s;
  gap: 6px;
}
.mercado-card:hover, .mercado-card.selected {
  background: rgba(255,255,255,0.04);
}
.mercado-card:active { background: rgba(255,255,255,0.07); }

/* Data */
.mc-date {
  font-size: 10px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--fg-4); text-align: center; line-height: 1.2;
}
.mc-date span { display: block; font-size: 9px; color: var(--fg-5); }

/* Jogador */
.mc-player {
  display: flex; align-items: center; gap: 8px; min-width: 0;
}
.mc-avatar {
  width: 32px; height: 32px; border-radius: 50%;
  background: var(--bg-3); border: 1px solid var(--line-1);
  overflow: hidden; flex-shrink: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 13px; /* fallback emoji */
}
.mc-avatar img { width: 100%; height: 100%; object-fit: cover; }
.mc-name-wrap { min-width: 0; }
.mc-first { font-size: 9px; color: var(--fg-4); }
.mc-last {
  font-size: 13px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--fg-1); white-space: nowrap;
  overflow: hidden; text-overflow: ellipsis;
}
.mc-pos {
  font-size: 9px; color: var(--fg-4);
  display: flex; align-items: center; gap: 3px;
}
.mc-flag { font-size: 10px; }

/* Clubes */
.mc-clubs {
  display: flex; align-items: center; gap: 6px;
}
.mc-crest {
  width: 22px; height: 22px; flex-shrink: 0;
  object-fit: contain; border-radius: 3px;
  background: rgba(255,255,255,0.05);
}
.mc-crest-ph {
  width: 22px; height: 22px; flex-shrink: 0;
  background: var(--bg-3); border-radius: 4px;
  display: flex; align-items: center; justify-content: center;
  font-size: 9px;
}
.mc-arrow {
  font-size: 11px; color: var(--fg-4); flex-shrink: 0;
}

/* Valor */
.mc-fee {
  text-align: right;
  font-size: 12px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--gold);
}
.mc-fee.free { color: var(--ok); font-size: 10px; }
.mc-fee.loan { color: #4a9eff; font-size: 10px; }
.mc-fee.unknown { color: var(--fg-4); font-size: 11px; }

/* Skeleton das transferências */
.mercado-sk-row {
  display: grid;
  grid-template-columns: 44px 1fr 1fr 72px;
  align-items: center; gap: 6px;
  padding: 10px 14px;
  border-bottom: 1px solid rgba(255,255,255,0.04);
}
.mercado-sk-circle {
  width: 32px; height: 32px; border-radius: 50%;
  background: rgba(255,255,255,0.07);
  animation: skeletonShimmer 1.6s infinite linear;
}
.mercado-sk-line {
  height: 11px; border-radius: 4px;
  background: rgba(255,255,255,0.07);
  animation: skeletonShimmer 1.6s infinite linear;
}

/* ── Detail panel (ao clicar no card) ── */
.mercado-detail {
  position: fixed; inset: 0; z-index: 400;
  background: rgba(0,0,0,0.85);
  display: flex; align-items: flex-end;
}
.mercado-detail-content {
  background: var(--bg-2);
  border-radius: 20px 20px 0 0;
  padding: 24px 20px 32px;
  width: 100%; max-height: 70vh;
  overflow-y: auto;
  animation: slideUp 0.3s cubic-bezier(0.34,1.56,0.64,1);
}
@keyframes slideUp {
  from { transform: translateY(100%); opacity: 0; }
  to   { transform: translateY(0);    opacity: 1; }
}
.md-player-row {
  display: flex; align-items: center; gap: 14px; margin-bottom: 20px;
}
.md-avatar-lg {
  width: 56px; height: 56px; border-radius: 50%;
  background: var(--bg-3); border: 2px solid var(--line-2);
  display: flex; align-items: center; justify-content: center;
  font-size: 22px; overflow: hidden;
}
.md-player-info h3 {
  font-size: 18px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--fg-1); margin: 0 0 2px;
}
.md-player-info p {
  font-size: 12px; color: var(--fg-4); margin: 0;
}
.md-transfer-visual {
  display: flex; align-items: center; gap: 14px;
  background: var(--bg-3); border-radius: 14px;
  padding: 16px; margin-bottom: 16px;
}
.md-club {
  flex: 1; display: flex; flex-direction: column;
  align-items: center; gap: 6px; text-align: center;
}
.md-club-crest {
  width: 40px; height: 40px; object-fit: contain;
}
.md-club-name {
  font-size: 11px; font-weight: 600; color: var(--fg-2);
}
.md-arrow-big { font-size: 22px; color: var(--fg-3); }
.md-fee-big {
  font-size: 28px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--gold); text-align: center; margin: 12px 0 4px;
}
.md-fee-label {
  font-size: 10px; font-weight: 700; letter-spacing: 0.12em;
  color: var(--fg-4); text-align: center; text-transform: uppercase;
}
```

### 9.3 JS — Métodos no `app.js`

```js
/* ──────────────────────────────────────
   MERCADO DE TRANSFERÊNCIAS
   ────────────────────────────────────── */

// Estado do mercado
_mercado = {
  filter: 'global',    // 'global' | 'mytime'
  league: 'all',
  sort:   'date',
  items:  [],          // todos os itens carregados
  page:   0
};

// Inicializar ao abrir a aba
async renderHubMercado() {
  if (!this._mercado.items.length) {
    this._renderMercadoSkeleton();
    await this._loadMercadoData();
  }
  this._renderMercadoList();
}

// Carregar dados de transferências
async _loadMercadoData() {
  const teams = Entertainment.getTeams();
  let transfers = [];

  if (this._mercado.filter === 'mytime' && teams.length) {
    // Busca transferências de cada time do usuário
    const promises = teams
      .filter(t => t.tmId)
      .map(t => Entertainment.getTeamTransfers(t.tmId).then(data => {
        if (!data) return [];
        return [
          ...(data.arrivals || []).map(tr => ({ ...tr, direction: 'in',  teamName: t.name, flag: t.flag })),
          ...(data.departures || []).map(tr => ({ ...tr, direction: 'out', teamName: t.name, flag: t.flag }))
        ];
      }));
    const results = await Promise.allSettled(promises);
    results.forEach(r => { if (r.status === 'fulfilled') transfers.push(...r.value); });
  } else {
    // Feed global: usa as notícias de transferência + dados dos times cadastrados
    const newsTransfers = await Entertainment.getGlobalTransfers();
    transfers = newsTransfers;
  }

  this._mercado.items = transfers;
  this._mercado.page = 0;
}

// Renderizar skeleton
_renderMercadoSkeleton() {
  const el = document.getElementById('mercado-list');
  if (!el) return;
  el.innerHTML = Array(8).fill(0).map(() => `
    <div class="mercado-sk-row">
      <div class="mercado-sk-line" style="width:30px;height:10px"></div>
      <div style="display:flex;align-items:center;gap:8px">
        <div class="mercado-sk-circle"></div>
        <div style="flex:1">
          <div class="mercado-sk-line" style="width:70%;margin-bottom:4px"></div>
          <div class="mercado-sk-line" style="width:40%"></div>
        </div>
      </div>
      <div style="display:flex;gap:6px;align-items:center">
        <div class="mercado-sk-line" style="width:24px;height:24px;border-radius:4px"></div>
        <div class="mercado-sk-line" style="width:16px;height:8px"></div>
        <div class="mercado-sk-line" style="width:24px;height:24px;border-radius:4px"></div>
      </div>
      <div class="mercado-sk-line" style="width:50px;margin-left:auto"></div>
    </div>
  `).join('');
}

// Renderizar lista principal
_renderMercadoList() {
  const el = document.getElementById('mercado-list');
  if (!el) return;

  let items = [...this._mercado.items];

  // Filtro de liga
  if (this._mercado.league !== 'all') {
    items = items.filter(t =>
      (t.league || '').toLowerCase().includes(this._mercado.league.split('.')[0])
    );
  }

  // Ordenação
  items.sort((a, b) => {
    if (this._mercado.sort === 'fee') {
      const fa = this._parseFee(a.fee), fb = this._parseFee(b.fee);
      return fb - fa;
    }
    if (this._mercado.sort === 'name') return (a.name || '').localeCompare(b.name || '');
    // date: mais recente primeiro
    return new Date(b.date || 0) - new Date(a.date || 0);
  });

  if (!items.length) {
    el.innerHTML = `<div style="padding:40px 20px;text-align:center;color:var(--fg-4);font-size:13px">
      Nenhuma transferência encontrada.<br>
      <span style="font-size:11px">Adicione times com ID Transfermarkt para ver dados.</span>
    </div>`;
    return;
  }

  const PAGE_SIZE = 20;
  const page = this._mercado.page;
  const visible = items.slice(0, (page + 1) * PAGE_SIZE);

  el.innerHTML = visible.map((t, i) => this._buildTransferCard(t, i)).join('');

  // Botão "Carregar mais"
  const btn = document.getElementById('mercado-load-more');
  if (btn) btn.style.display = visible.length < items.length ? 'block' : 'none';
}

// Constrói HTML do card (EA FC style)
_buildTransferCard(t, idx) {
  const dateStr = this._formatTransferDate(t.date || t.dateArival || '');
  const fee = this._formatFee(t.fee || t.transfer_fee || '—');
  const firstName = (t.name || '').split(' ').slice(0, -1).join(' ');
  const lastName = (t.name || '').split(' ').slice(-1)[0] || t.name;
  const fromCrest = t.from_club_logo || t.fromLogo || '';
  const toCrest = t.to_club_logo || t.toLogo || '';

  return `
    <div class="mercado-card" onclick="orbit.openTransferDetail(${idx})" id="mc-${idx}">
      <div class="mc-date">
        ${dateStr.day}<span>${dateStr.month}</span>
      </div>
      <div class="mc-player">
        <div class="mc-avatar">
          ${t.photo ? `<img src="${t.photo}" alt="${t.name}" loading="lazy" onerror="this.parentNode.textContent='⚽'">` : '⚽'}
        </div>
        <div class="mc-name-wrap">
          <div class="mc-first">${firstName || ''} <span class="mc-flag">${t.nationality_flag || ''}</span></div>
          <div class="mc-last">${lastName}</div>
          <div class="mc-pos">${t.position || ''}</div>
        </div>
      </div>
      <div class="mc-clubs">
        ${fromCrest
          ? `<img class="mc-crest" src="${fromCrest}" alt="${t.from}" loading="lazy" onerror="this.classList.add('mc-crest-ph')">`
          : `<div class="mc-crest-ph">⚽</div>`}
        <span class="mc-arrow">▶</span>
        ${toCrest
          ? `<img class="mc-crest" src="${toCrest}" alt="${t.to}" loading="lazy" onerror="this.classList.add('mc-crest-ph')">`
          : `<div class="mc-crest-ph">⚽</div>`}
      </div>
      <div class="mc-fee ${fee.cls}">${fee.text}</div>
    </div>
  `;
}

// Formata data da transferência
_formatTransferDate(raw) {
  if (!raw) return { day: '—', month: '' };
  try {
    const d = new Date(raw);
    return {
      day: String(d.getDate()).padStart(2, '0') + '/' + String(d.getMonth() + 1).padStart(2, '0'),
      month: d.getFullYear().toString().slice(2)
    };
  } catch { return { day: raw.slice(0, 5) || '—', month: '' }; }
}

// Formata valor da transferência
_formatFee(fee) {
  if (!fee || fee === '—' || fee === '-') return { text: '—', cls: 'unknown' };
  const lower = fee.toLowerCase();
  if (lower.includes('free') || lower === '0' || lower === '0 €') return { text: 'Free', cls: 'free' };
  if (lower.includes('loan') || lower.includes('emprést')) return { text: 'Empréstimo', cls: 'loan' };
  // Formatar valor numérico
  const num = parseFloat(fee.replace(/[^0-9.]/g, ''));
  if (isNaN(num)) return { text: fee, cls: 'unknown' };
  const fmt = num >= 1e6
    ? `€${(num / 1e6).toFixed(1)}M`
    : num >= 1e3
    ? `€${(num / 1e3).toFixed(0)}K`
    : `€${num.toFixed(0)}`;
  return { text: fmt, cls: '' };
}

// Extrai valor numérico do fee para ordenação
_parseFee(fee) {
  if (!fee) return 0;
  const lower = (fee || '').toLowerCase();
  if (lower.includes('free')) return 0;
  const num = parseFloat((fee || '').replace(/[^0-9.]/g, ''));
  return isNaN(num) ? 0 : num;
}

// Abrir painel de detalhe ao clicar
openTransferDetail(idx) {
  const items = this._mercado.items;
  const t = items[idx];
  if (!t) return;

  // Highlight card
  document.querySelectorAll('.mercado-card').forEach(c => c.classList.remove('selected'));
  document.getElementById(`mc-${idx}`)?.classList.add('selected');

  const fee = this._formatFee(t.fee || '—');
  const fromCrest = t.from_club_logo || '';
  const toCrest = t.to_club_logo || '';

  const detail = document.createElement('div');
  detail.className = 'mercado-detail';
  detail.innerHTML = `
    <div class="mercado-detail-content">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
        <span style="font-size:11px;font-weight:700;letter-spacing:2px;color:var(--fg-4)">TRANSFERÊNCIA</span>
        <button onclick="this.closest('.mercado-detail').remove()"
          style="background:none;border:none;color:var(--fg-3);font-size:24px;cursor:pointer;line-height:1">×</button>
      </div>
      <div class="md-player-row">
        <div class="md-avatar-lg">
          ${t.photo ? `<img src="${t.photo}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">` : '⚽'}
        </div>
        <div class="md-player-info">
          <h3>${t.name || '?'}</h3>
          <p>${t.position || ''} ${t.nationality_flag || ''} ${t.nationality || ''}</p>
        </div>
      </div>
      <div class="md-transfer-visual">
        <div class="md-club">
          ${fromCrest ? `<img class="md-club-crest" src="${fromCrest}" onerror="this.textContent='⚽'">` : '<div style="font-size:28px">⚽</div>'}
          <div class="md-club-name">${t.from || '?'}</div>
        </div>
        <div class="md-arrow-big">▶</div>
        <div class="md-club">
          ${toCrest ? `<img class="md-club-crest" src="${toCrest}" onerror="this.textContent='⚽'">` : '<div style="font-size:28px">⚽</div>'}
          <div class="md-club-name">${t.to || '?'}</div>
        </div>
      </div>
      <div class="md-fee-big">${fee.text}</div>
      <div class="md-fee-label">Valor da transferência</div>
      ${t.market_value ? `<div style="text-align:center;margin-top:6px;font-size:12px;color:var(--fg-4)">Valor de mercado: <strong style="color:var(--fg-2)">${t.market_value}</strong></div>` : ''}
      ${t.date ? `<div style="text-align:center;margin-top:8px;font-size:11px;color:var(--fg-4)">${this._formatTransferDate(t.date).day}</div>` : ''}
    </div>
  `;
  detail.addEventListener('click', e => { if (e.target === detail) detail.remove(); });
  document.body.appendChild(detail);
}

// Filtros e ordenação
mercadoFilter(f) {
  this._mercado.filter = f;
  document.getElementById('mf-global')?.classList.toggle('active', f === 'global');
  document.getElementById('mf-mytime')?.classList.toggle('active', f === 'mytime');
  this._mercado.items = [];
  this._renderMercadoSkeleton();
  this._loadMercadoData().then(() => this._renderMercadoList());
}

mercadoLeague(lg) {
  this._mercado.league = lg;
  document.querySelectorAll('.ml-btn').forEach(b => {
    b.classList.toggle('active', b.dataset.lg === lg);
  });
  this._renderMercadoList();
}

mercadoSort(s) {
  this._mercado.sort = s;
  document.querySelectorAll('.ms-btn').forEach(b => b.classList.remove('active'));
  document.getElementById(`ms-${s}`)?.classList.add('active');
  this._renderMercadoList();
}

mercadoLoadMore() {
  this._mercado.page++;
  this._renderMercadoList();
}
```

### 9.4 Método `getGlobalTransfers()` no `entertainment.js`

```js
// Feed global de transferências (maiores do momento, via RSS + TM)
static async getGlobalTransfers() {
  const ck = 'ent_global_transfers';
  const hit = scGet(ck, TTL_NEWS);
  if (hit) return hit;

  // Busca notícias de transferência e parseia
  const feed = 'https://news.google.com/rss/search?q=transfer+football+fee+million&hl=en&gl=US&ceid=US:en';
  try {
    const url = `${RSS2JSON}?rss_url=${encodeURIComponent(feed)}&api_key=&count=30`;
    const d = await fetchJSON(url, 8000);
    if (!d?.items?.length) return [];

    // Parseia notícias em formato de transferência (aproximado)
    const transfers = (d.items || []).slice(0, 25).map(item => {
      // Tenta extrair nome do jogador e valor do título
      const title = item.title || '';
      const feeMatch = title.match(/€([\d,.]+[MK]?)/i) || title.match(/([\d,.]+)\s*(million|M|m)/i);
      return {
        name: title.split(' ')[0] + ' ' + (title.split(' ')[1] || ''),
        from: '—', to: '—',
        fee: feeMatch ? feeMatch[0] : '—',
        date: item.pubDate || new Date().toISOString(),
        sourceTitle: title,
        sourceUrl: item.link || '',
        isNews: true  // flag: é notícia, não dado estruturado
      };
    }).filter(t => t.fee !== '—'); // só mostra os que têm valor

    scSet(ck, transfers);
    return transfers;
  } catch { return []; }
}
```

> **Nota sobre dados globais:** A API do Transfermarkt (`transfermarkt-api.fly.dev`) retorna transferências por clube, não globalmente. Para um feed global, a melhor opção 100% gratuita é combinar:
> 1. Transferências dos times do usuário (TM API por clube)
> 2. Feed RSS de notícias de transferência para o modo "Global"
> Para dados REAIS estilo EA FC, recomendar ao usuário adicionar seus times favoritos — o modo "Meus Times" vai ser rico desde que tenham `tmId`.

---

## BLOCO 10 — DIAGNÓSTICO GERAL

### Objetivo
Quando JR digitar "rodar diagnóstico", "diagnóstico geral", `/diag` ou similar no chat, a Sophy gera um relatório completo e visual de tudo no app.

### 10.1 Detecção no fluxo de envio

**Arquivo:** `js/app.js` — na função de `send()`, antes da chamada da IA, adicionar detecção:
```js
// Detectar comando de diagnóstico (antes de qualquer processamento)
const diagTriggers = [
  'diagnóstico', 'diagnostico', '/diag', 'rodar diagnóstico',
  'rodar diagnostico', 'análise geral', 'analise geral',
  'status geral', 'relatório geral', 'relatorio geral',
  'como estou', 'resumo completo'
];
const isDiag = diagTriggers.some(t => text.toLowerCase().includes(t));
if (isDiag) {
  await this._runDiagnostic();
  return; // não chama a IA normalmente
}
```

### 10.2 Método `_runDiagnostic()`

**Arquivo:** `js/app.js`:
```js
async _runDiagnostic() {
  Loader.show('RODANDO DIAGNÓSTICO', [
    'Analisando finanças',
    'Verificando hábitos',
    'Consultando agenda',
    'Calculando métricas',
    'Sophy preparando relatório'
  ], 700);

  // ── Coleta dados ────────────────────────────────
  const now = new Date();
  const y = now.getFullYear(), m = now.getMonth() + 1;

  // Finanças
  const finSummary = Finance.getSummary(y, m);
  const byCat = Finance.byCategory((finSummary.txs || []).filter(t => t.type === 'expense'));
  const topExpense = byCat[0];
  const finHealth = finSummary.balance >= 0 ? 'positivo' : 'negativo';

  // Hábitos
  const habits = Habits.getAll();
  const habitsDoneToday = habits.filter(h => Habits.isDoneToday(h.id)).length;
  const habitsTotal = habits.length;
  const habitRate = habitsTotal > 0 ? Math.round((habitsDoneToday / habitsTotal) * 100) : 0;
  const streakMax = Math.max(...habits.map(h => Habits.getStreak(h.id)), 0);

  // Humor
  const moodData = Mood.last7();
  const moodAvg = moodData.filter(d => d.value).reduce((a, b) => a + (b.value || 0), 0) /
                  (moodData.filter(d => d.value).length || 1);
  const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😄'];
  const moodLabel = moodEmojis[Math.round(moodAvg)] || '😐';

  // Agenda
  const todayStr = AI.todayStr();
  const todayEvents = (Store.get(K.agenda, [])).filter(e => e.date === todayStr);
  const upcoming = (Store.get(K.agenda, [])).filter(e => e.date > todayStr)
    .sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

  // Streak de uso
  const streakData = Store.get('orbit_streak', { count: 0 });

  // UFPI
  const disciplines = Store.get(K.disc, []);

  // Pomodoro (sessões hoje)
  const pomoSessions = this._pomoSessions || 0;

  // ── Monta prompt estruturado para a Sophy ──────
  const diagPrompt = `DIAGNÓSTICO GERAL SOLICITADO — ${new Date().toLocaleString('pt-BR')}

Gera um RELATÓRIO DIAGNÓSTICO COMPLETO no teu estilo (papo real, não formal), com estas seções:

## 💰 FINANÇAS (${MONTHS_PT[m-1]})
- Saldo: R$ ${(finSummary.balance || 0).toFixed(2)} (${finHealth})
- Entradas: R$ ${(finSummary.income || 0).toFixed(2)}
- Saídas: R$ ${(finSummary.expenses || 0).toFixed(2)}
- Maior gasto: ${topExpense ? `${topExpense.name} — R$ ${topExpense.total.toFixed(2)} (${Math.round((topExpense.total / (finSummary.expenses || 1)) * 100)}%)` : 'nenhum'}

## ✅ HÁBITOS (hoje)
- Concluídos: ${habitsDoneToday}/${habitsTotal} (${habitRate}%)
- Maior streak ativo: ${streakMax} dias
- Humor médio da semana: ${moodAvg.toFixed(1)}/5 ${moodLabel}

## 📅 AGENDA
- Hoje: ${todayEvents.length} evento(s)${todayEvents.length ? ': ' + todayEvents.map(e => e.title).join(', ') : ''}
- Próximos: ${upcoming.length ? upcoming.map(e => `${e.date}: ${e.title}`).join(', ') : 'nenhum'}

## 🎓 UFPI
- Disciplinas: ${disciplines.length}

## 📱 APP
- Streak de uso: ${streakData.count} dias seguidos
- Sessões Pomodoro hoje: ${pomoSessions}

Com base nesses dados, dá um diagnóstico honesto: o que tá bem, o que precisa de atenção, e 2-3 ações concretas pra melhorar. Seja direta, sem enrolação.`;

  await new Promise(r => setTimeout(r, 300));
  Loader.hide(100);

  // Enviar como mensagem da Sophy (não mostrar o prompt do usuário)
  await this.sendMsg(diagPrompt, { silent: true, fromDiag: true });
}
```

### 10.3 Adicionar ao sistema de comandos do chat

**Arquivo:** `index.html` — no `#cmd-palette`, adicionar:
```html
<button class="cmd-item" onclick="orbit.runCmd('diag')">
  <span class="cmd-icon">🔍</span>
  <div class="cmd-info">
    <div class="cmd-name">/diagnóstico</div>
    <div class="cmd-desc">Relatório completo de saúde do app</div>
  </div>
</button>
```

**Arquivo:** `js/app.js` — no `runCmd()`:
```js
case 'diag': this._runDiagnostic(); break;
```

---

## BLOCO 11 — TECLADO APRIMORADO (estilo Claude)

### 11.1 Contador de caracteres

**Arquivo:** `index.html` — dentro da `.inp-area`, adicionar antes do `<textarea>`:
```html
<div id="char-indicator" class="char-indicator" style="display:none">
  <span id="char-count">0</span>
  <div id="char-bar-wrap" class="char-bar-wrap">
    <div id="char-bar" class="char-bar"></div>
  </div>
</div>
```

**Arquivo:** `js/app.js` — no `setupListeners()`, no listener do `msginput`:
```js
const inp = document.getElementById('msginput');
const MAX_CHARS = 4000;

inp.addEventListener('input', () => {
  // Auto-resize existente (manter)
  inp.style.height = 'auto';
  inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';

  // Contador de caracteres
  const len = inp.value.length;
  const indicator = document.getElementById('char-indicator');
  const countEl = document.getElementById('char-count');
  const bar = document.getElementById('char-bar');

  if (len > 100) { // Mostrar só quando começar a digitar mais
    indicator.style.display = 'flex';
    const pct = Math.min((len / MAX_CHARS) * 100, 100);

    // Formato inteligente (1.2k em vez de 1234)
    countEl.textContent = len >= 1000 ? `${(len/1000).toFixed(1)}k` : len;
    bar.style.width = pct + '%';

    // Cores progressivas
    if (pct < 70) {
      bar.style.background = 'rgba(255,255,255,0.2)';
      countEl.style.color = 'var(--fg-4)';
    } else if (pct < 90) {
      bar.style.background = 'rgba(212,175,55,0.6)';
      countEl.style.color = 'var(--gold)';
    } else {
      bar.style.background = 'rgba(255,90,90,0.8)';
      countEl.style.color = 'var(--err)';
    }

    // Impede digitar além do limite
    if (len >= MAX_CHARS) {
      inp.value = inp.value.slice(0, MAX_CHARS);
    }
  } else {
    indicator.style.display = 'none';
  }
});
```

**CSS:**
```css
/* ── Indicador de caracteres ── */
.char-indicator {
  position: absolute; bottom: calc(100% + 4px); right: 16px;
  display: flex; align-items: center; gap: 6px;
  pointer-events: none;
}
#char-count {
  font-size: 10px; font-weight: 700; font-family: Arial, sans-serif;
  color: var(--fg-4); min-width: 24px; text-align: right;
  transition: color 0.2s;
}
.char-bar-wrap {
  width: 40px; height: 2px;
  background: rgba(255,255,255,0.08);
  border-radius: 2px; overflow: hidden;
}
.char-bar {
  height: 100%; width: 0%; border-radius: 2px;
  transition: width 0.15s ease, background 0.3s ease;
}

/* Posicionar inp-area como relative para o indicador funcionar */
.inp-area { position: relative; }
```

### 11.2 Atalhos de teclado aprimorados

**Arquivo:** `js/app.js` — expandir o listener de `keydown` do `msginput`:
```js
inp.addEventListener('keydown', e => {
  // Enter envia (já existe — manter)
  // Shift+Enter: nova linha (já existe — manter)

  // Ctrl+/ ou Cmd+/: abre palette de comandos
  if ((e.ctrlKey || e.metaKey) && e.key === '/') {
    e.preventDefault();
    this.showCmdPalette();
    return;
  }

  // Esc: fecha palette ou cancela stream
  if (e.key === 'Escape') {
    const palette = document.getElementById('cmd-palette');
    if (palette && palette.style.display !== 'none') {
      palette.style.display = 'none';
      return;
    }
    if (this.busy) this.cancelStream();
    return;
  }

  // @ na mensagem: abre quick context picker (futuro)
  // / no início: mostra palette de comandos
  if (e.key === '/' && inp.value === '') {
    e.preventDefault();
    inp.value = '/';
    this.showCmdPalette();
    return;
  }
});
```

### 11.3 Indicador de modo no input

**Arquivo:** `index.html` — adicionar dentro da `.inp-area` antes do textarea:
```html
<div id="inp-mode-tag" class="inp-mode-tag" style="display:none">
  <!-- Ex: "🌐 Web Search" ou "📎 Arquivo" quando modo especial ativo -->
</div>
```

**JS** — mostrar quando webSearch for detectado enquanto digita:
```js
// No input listener, após o contador:
const modeTag = document.getElementById('inp-mode-tag');
if (modeTag) {
  const needsSearch = AI.needsWeb(inp.value);
  modeTag.textContent = needsSearch ? '🌐 Vai pesquisar na internet' : '';
  modeTag.style.display = needsSearch && inp.value.length > 15 ? 'block' : 'none';
}
```

**CSS:**
```css
.inp-mode-tag {
  font-size: 10px; color: rgba(74,208,138,0.8);
  padding: 2px 8px 6px 16px;
  font-weight: 600; font-family: Arial, sans-serif;
}
```

---

## BLOCO 12 — DIAGRAMA DE PARETO

### Objetivo
Mostrar análise 80/20 visual para finanças (quais categorias concentram 80% dos gastos) e hábitos (quais hábitos têm maior impacto).

### 12.1 Pareto de Finanças

**Arquivo:** `index.html` — dentro de `<div id="cofre-fin">`, após os cards de saldo, adicionar:
```html
<div class="pareto-section">
  <div class="pareto-hdr">
    <span class="pareto-title">📊 Análise de Pareto — Gastos</span>
    <span class="pareto-sub">Quais 20% das categorias concentram 80% dos gastos</span>
  </div>
  <canvas id="pareto-fin-chart" style="width:100%;height:200px;display:block"></canvas>
  <div id="pareto-fin-insight" class="pareto-insight"></div>
</div>
```

**Método JS** — `_renderParetoFin()` em `app.js`:
```js
_renderParetoFin(txs) {
  const canvas = document.getElementById('pareto-fin-chart');
  if (!canvas) return;

  const expenses = (txs || []).filter(t => t.type === 'expense');
  if (expenses.length < 2) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';

  const byCat = Finance.byCategory(expenses);
  const total = byCat.reduce((a, b) => a + b.total, 0);
  if (!total) return;

  const sorted = [...byCat].sort((a, b) => b.total - a.total);
  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 320;
  const H = 200;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 8, r: 8, t: 16, b: 40 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const barW = (chartW / sorted.length) - 4;

  const COLORS = ['#d4af37','#4a9eff','#4ad08a','#ff6b6b','#a78bfa','#f59e0b','#06b6d4'];

  // Barras (eixo Y esquerdo = valor R$)
  const maxVal = sorted[0].total;
  sorted.forEach((cat, i) => {
    const x = pad.l + i * (barW + 4);
    const h = (cat.total / maxVal) * chartH;
    const y = pad.t + chartH - h;

    ctx.fillStyle = COLORS[i % COLORS.length];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, h, [4, 4, 0, 0]);
    ctx.fill();
    ctx.globalAlpha = 1;

    // Label categoria (abreviado, abaixo)
    ctx.fillStyle = 'rgba(255,255,255,0.4)';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(cat.name.slice(0, 6), x + barW/2, H - 26);

    // Valor acima da barra
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.font = '8px Arial, sans-serif';
    const pct = Math.round((cat.total / total) * 100);
    ctx.fillText(`${pct}%`, x + barW/2, y - 4);
  });

  // Linha de Pareto (eixo Y direito = % acumulado)
  let cumPct = 0;
  const linePts = sorted.map((cat, i) => {
    cumPct += (cat.total / total) * 100;
    const x = pad.l + i * (barW + 4) + barW / 2;
    const y = pad.t + chartH - (Math.min(cumPct, 100) / 100) * chartH;
    return { x, y, pct: cumPct };
  });

  // Área 80%
  const p80idx = linePts.findIndex(p => p.pct >= 80);
  if (p80idx >= 0) {
    // Linha tracejada vertical no ponto 80%
    ctx.strokeStyle = 'rgba(212,175,55,0.4)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.moveTo(linePts[p80idx].x, pad.t);
    ctx.lineTo(linePts[p80idx].x, pad.t + chartH);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  // Linha Pareto
  ctx.beginPath();
  ctx.moveTo(linePts[0].x, linePts[0].y);
  linePts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 2;
  ctx.stroke();

  // Pontos na linha
  linePts.forEach(p => {
    ctx.beginPath();
    ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();
  });

  // Legenda 80%
  ctx.fillStyle = 'rgba(255,255,255,0.25)';
  ctx.font = '9px Arial, sans-serif';
  ctx.textAlign = 'right';
  ctx.fillText('80%', W - pad.r, pad.t + chartH * 0.2 + 4);

  // Linha horizontal 80%
  ctx.strokeStyle = 'rgba(255,255,255,0.15)';
  ctx.lineWidth = 1;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  const y80 = pad.t + chartH - (80/100)*chartH;
  ctx.moveTo(pad.l, y80);
  ctx.lineTo(W - pad.r, y80);
  ctx.stroke();
  ctx.setLineDash([]);

  // Insight textual abaixo do gráfico
  const insight = document.getElementById('pareto-fin-insight');
  if (insight && p80idx >= 0) {
    const topCats = sorted.slice(0, p80idx + 1).map(c => c.name).join(', ');
    const pctCats = Math.round(((p80idx + 1) / sorted.length) * 100);
    insight.innerHTML = `<span class="pi-highlight">${p80idx + 1} categoria${p80idx > 0 ? 's' : ''}</span> (${pctCats}% do total) concentram 80% dos seus gastos: <em>${topCats}</em>`;
  }
}
```

### 12.2 Pareto de Hábitos

**Arquivo:** `index.html` — dentro de `<div id="hub-habitos">`, após o heatmap:
```html
<div class="pareto-section" style="margin-top:16px">
  <div class="pareto-hdr">
    <span class="pareto-title">📊 Consistência dos Hábitos</span>
    <span class="pareto-sub">Taxa de conclusão por hábito (últimos 30 dias)</span>
  </div>
  <canvas id="pareto-hab-chart" style="width:100%;height:160px;display:block"></canvas>
</div>
```

**Método JS** — `_renderParetoHab()` em `app.js`:
```js
_renderParetoHab() {
  const canvas = document.getElementById('pareto-hab-chart');
  if (!canvas) return;
  const habits = Habits.getAll();
  if (!habits.length) { canvas.style.display = 'none'; return; }
  canvas.style.display = 'block';

  // Calcula taxa de conclusão dos últimos 30 dias
  const today = new Date();
  const rates = habits.map(h => {
    let done = 0;
    for (let i = 0; i < 30; i++) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      if (Habits.getDoneForDate(h.id, d.toISOString().slice(0, 10))) done++;
    }
    return { name: h.icon + ' ' + h.name, rate: Math.round((done/30)*100) };
  }).sort((a, b) => b.rate - a.rate);

  const dpr = window.devicePixelRatio || 1;
  const W = canvas.offsetWidth || 300;
  const H = 160;
  canvas.width = W * dpr;
  canvas.height = H * dpr;
  canvas.style.height = H + 'px';
  const ctx = canvas.getContext('2d');
  ctx.scale(dpr, dpr);
  ctx.clearRect(0, 0, W, H);

  const pad = { l: 8, r: 8, t: 10, b: 36 };
  const chartW = W - pad.l - pad.r;
  const chartH = H - pad.t - pad.b;
  const barW = (chartW / rates.length) - 3;

  rates.forEach((h, i) => {
    const x = pad.l + i * (barW + 3);
    const barH = (h.rate / 100) * chartH;
    const y = pad.t + chartH - barH;

    // Cor baseada na taxa
    const green = Math.round((h.rate / 100) * 160);
    ctx.fillStyle = `rgba(${80 - Math.round(h.rate*0.3)},${100 + green},${80},0.8)`;
    ctx.beginPath();
    ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
    ctx.fill();

    // Percentual acima
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.font = '8px Arial, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(`${h.rate}%`, x + barW/2, y - 3);

    // Nome abaixo (rotacionado para não sobrepor)
    ctx.save();
    ctx.translate(x + barW/2, H - 4);
    ctx.rotate(-0.6);
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.font = '9px Arial, sans-serif';
    ctx.textAlign = 'right';
    ctx.fillText(h.name.slice(0, 10), 0, 0);
    ctx.restore();
  });
}
```

**CSS para Pareto:**
```css
/* ── Pareto ── */
.pareto-section {
  background: var(--bg-2); border-radius: 14px;
  border: 1px solid var(--line-1);
  margin: 0 14px 14px; overflow: hidden;
}
.pareto-hdr { padding: 12px 14px 6px; }
.pareto-title {
  display: block; font-size: 11px; font-weight: 700;
  letter-spacing: 0.08em; color: var(--fg-2);
  text-transform: uppercase;
}
.pareto-sub {
  display: block; font-size: 10px; color: var(--fg-4);
  margin-top: 2px;
}
.pareto-insight {
  font-size: 11px; color: var(--fg-3);
  padding: 8px 14px 12px; line-height: 1.5;
}
.pi-highlight { color: var(--gold); font-weight: 700; }
```

---

## BLOCO 13 — VISUAL DE PRIMEIRA LINHA

### 13.1 Ripple effect nos botões

**Arquivo:** `js/app.js` — adicionar função e aplicar globalmente:
```js
// Adicionar no boot():
_initRipple() {
  document.addEventListener('click', e => {
    const btn = e.target.closest('.btn, .nav-btn, .inp-btn, .dqa-btn, .mf-btn, .ml-btn');
    if (!btn) return;
    const ripple = document.createElement('span');
    ripple.className = 'ripple-fx';
    const rect = btn.getBoundingClientRect();
    const size = Math.max(rect.width, rect.height) * 2;
    ripple.style.cssText = `
      width:${size}px; height:${size}px;
      left:${e.clientX - rect.left - size/2}px;
      top:${e.clientY - rect.top - size/2}px;
    `;
    btn.appendChild(ripple);
    ripple.addEventListener('animationend', () => ripple.remove());
  });
}
```

**CSS:**
```css
/* Ripple */
.ripple-fx {
  position: absolute; border-radius: 50%; pointer-events: none;
  background: rgba(255,255,255,0.12);
  animation: rippleFx 0.5s ease-out forwards;
  transform: scale(0); z-index: 0;
}
@keyframes rippleFx {
  to { transform: scale(1); opacity: 0; }
}
/* Garantir que botões tenham overflow:hidden e position:relative */
.btn, .nav-btn, .dqa-btn, .mf-btn { position: relative; overflow: hidden; }
```

### 13.2 Transições suaves entre abas

**Arquivo:** `js/app.js` — no `switchTab()`, adicionar animação:
```js
switchTab(tab) {
  // Fade out atual
  const current = document.querySelector('.tab-screen.active');
  if (current) {
    current.style.opacity = '0';
    current.style.transform = 'translateY(4px)';
  }

  setTimeout(() => {
    // Troca ativa (lógica existente)
    document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
    const next = document.getElementById(`tab-${tab}`);
    if (next) {
      next.classList.add('active');
      // Fade in
      next.style.opacity = '0';
      next.style.transform = 'translateY(4px)';
      requestAnimationFrame(() => {
        next.style.transition = 'opacity 0.2s ease, transform 0.2s ease';
        next.style.opacity = '1';
        next.style.transform = 'translateY(0)';
        setTimeout(() => {
          next.style.transition = '';
          next.style.opacity = '';
          next.style.transform = '';
        }, 200);
      });
    }
    // Resto da lógica existente de switchTab...
  }, 80);
}
```

### 13.3 Skeleton shimmer mais sofisticado

**Arquivo:** `css/style.css` — substituir o shimmer atual:
```css
@keyframes skeletonShimmer {
  0%   { background-position: -300px 0; }
  100% { background-position: 300px 0; }
}
.skeleton {
  background: linear-gradient(
    90deg,
    rgba(255,255,255,0.04) 0%,
    rgba(255,255,255,0.10) 40%,
    rgba(255,255,255,0.04) 80%
  );
  background-size: 300px 100%;
  animation: skeletonShimmer 1.8s infinite ease-in-out;
}
```

### 13.4 Número animado (count-up)

**Arquivo:** `js/ui.js` — adicionar método:
```js
// Anima um elemento numérico de 0 até o valor alvo
static countUp(el, target, duration = 600, prefix = '', suffix = '') {
  if (!el) return;
  const start = Date.now();
  const from = parseFloat(el.textContent.replace(/[^0-9.-]/g, '')) || 0;
  const step = () => {
    const elapsed = Date.now() - start;
    const progress = Math.min(elapsed / duration, 1);
    const ease = 1 - Math.pow(1 - progress, 3);
    const current = from + (target - from) * ease;
    el.textContent = prefix + current.toFixed(target % 1 === 0 ? 0 : 2) + suffix;
    if (progress < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}
```

Usar nos valores do dashboard quando atualizar:
```js
// No renderDashboard(), ao setar saldo:
UI.countUp(document.getElementById('dash-balance'), finSummary.balance, 600, 'R$ ');
UI.countUp(document.getElementById('dash-income'), finSummary.income, 500, 'R$ ');
UI.countUp(document.getElementById('dash-expenses'), finSummary.expenses, 500, 'R$ ');
```

### 13.5 Pull-to-refresh visual

**Arquivo:** `js/app.js` — no `dash-scroll`:
```js
_initPullToRefresh() {
  const scroll = document.querySelector('.dash-scroll');
  if (!scroll) return;
  let startY = 0, pulling = false;
  const indicator = document.createElement('div');
  indicator.className = 'ptr-indicator';
  indicator.innerHTML = '↓ Atualizando...';
  scroll.prepend(indicator);

  scroll.addEventListener('touchstart', e => {
    if (scroll.scrollTop === 0) {
      startY = e.touches[0].clientY;
      pulling = true;
    }
  }, { passive: true });

  scroll.addEventListener('touchmove', e => {
    if (!pulling) return;
    const dy = e.touches[0].clientY - startY;
    if (dy > 10) {
      indicator.style.height = Math.min(dy * 0.4, 50) + 'px';
      indicator.style.opacity = Math.min(dy / 80, 1).toString();
    }
  }, { passive: true });

  scroll.addEventListener('touchend', async e => {
    if (!pulling) return;
    pulling = false;
    const dy = e.changedTouches[0].clientY - startY;
    if (dy > 80) {
      indicator.textContent = '↻ Recarregando...';
      await this.renderDashboard();
      UI.toast('Dashboard atualizado!', 'ok', 1500);
    }
    indicator.style.height = '0';
    indicator.style.opacity = '0';
  });
}
```

**CSS:**
```css
.ptr-indicator {
  overflow: hidden; height: 0; opacity: 0;
  display: flex; align-items: center; justify-content: center;
  font-size: 11px; color: var(--fg-4); font-weight: 600;
  font-family: Arial, sans-serif; letter-spacing: 0.08em;
  transition: height 0.1s, opacity 0.1s;
}
```

### 13.6 Toast aprimorado com posição e tipos

**Arquivo:** `js/ui.js` — substituir `toast()` por versão com ícone e suporte a mais tipos:
```js
static toast(msg, type = 'info', dur = 2800) {
  const el = document.getElementById('toast');
  if (!el) return;
  clearTimeout(el._t);

  const icons = { ok: '✓', err: '✕', info: 'ℹ', warn: '⚠' };
  el.innerHTML = `<span class="toast-icon">${icons[type] || 'ℹ'}</span><span>${msg}</span>`;
  el.className = `toast-visible toast-${type}`;

  el._t = setTimeout(() => {
    el.className = '';
    el.innerHTML = '';
  }, dur);
}
```

**CSS** (substituir estilos de toast):
```css
#toast {
  position: fixed; bottom: calc(80px + env(safe-area-inset-bottom, 0px));
  left: 50%; transform: translateX(-50%) translateY(20px);
  z-index: 9000; pointer-events: none;
  opacity: 0; transition: opacity 0.2s ease, transform 0.25s cubic-bezier(0.34,1.56,0.64,1);
  max-width: calc(100vw - 32px);
}
#toast.toast-visible {
  opacity: 1; transform: translateX(-50%) translateY(0);
  display: flex; align-items: center; gap: 8px;
  background: var(--bg-3); border-radius: 20px;
  padding: 10px 18px; border: 1px solid var(--line-2);
  backdrop-filter: blur(20px);
  font-size: 13px; font-family: Arial, sans-serif;
  font-weight: 500; color: var(--fg-1);
  box-shadow: 0 8px 32px rgba(0,0,0,0.5);
}
.toast-icon { font-size: 14px; }
#toast.toast-ok   .toast-icon { color: var(--ok); }
#toast.toast-err  .toast-icon { color: var(--err); }
#toast.toast-warn .toast-icon { color: var(--gold); }
#toast.toast-info .toast-icon { color: var(--fg-3); }
```

### 13.7 Card de saudação premium

**Arquivo:** `css/style.css` — aprimorar `.dash-greet`:
```css
.dash-greet {
  /* Adicionar ao existente: */
  background: linear-gradient(135deg,
    rgba(212,175,55,0.06) 0%,
    rgba(255,255,255,0.02) 60%,
    transparent 100%);
  border: 1px solid rgba(212,175,55,0.1);
  border-radius: 16px;
  margin: 12px 14px 8px;
  padding: 16px;
}
```

---

## BLOCO 14 — EXTRAS FINAIS DE PRIMEIRA LINHA

### 14.1 Pesquisa global dentro do app

**Arquivo:** `index.html` — adicionar botão de busca na navbar:
```html
<!-- Adaptar o nav-btn-cfg para ter busca antes -->
<button class="nav-btn" onclick="orbit.openAppSearch()">
  <svg class="nav-icon" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8">
    <circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/>
  </svg>
  <span class="nav-label">Buscar</span>
</button>
```

**Método** — busca em hábitos, eventos, flashcards, transações:
```js
openAppSearch() {
  // Bottom sheet com input de busca + resultados
  const bs = document.createElement('div');
  bs.className = 'bottom-sheet';
  bs.style.display = 'flex';
  bs.innerHTML = `
    <div class="bs-backdrop" onclick="this.closest('.bottom-sheet').remove()"></div>
    <div class="bs-content">
      <div class="bs-hdr">
        <div class="bs-title">BUSCAR NO APP</div>
        <button class="bs-close" onclick="this.closest('.bottom-sheet').remove()">×</button>
      </div>
      <input type="search" id="app-search-inp" placeholder="Eventos, hábitos, transações..."
        oninput="orbit._runAppSearch(this.value)" autocomplete="off"
        style="margin-bottom:12px" autofocus>
      <div id="app-search-results"></div>
    </div>
  `;
  document.body.appendChild(bs);
  setTimeout(() => document.getElementById('app-search-inp')?.focus(), 100);
}

_runAppSearch(q) {
  const el = document.getElementById('app-search-results');
  if (!el || !q || q.length < 2) { if (el) el.innerHTML = ''; return; }
  const results = [];
  const ql = q.toLowerCase();

  // Eventos
  (Store.get(K.agenda, [])).forEach(e => {
    if (e.title?.toLowerCase().includes(ql))
      results.push({ icon: '📅', label: e.title, sub: e.date, action: `orbit.switchTab('agenda')` });
  });

  // Transações
  (Store.get(K.fin_tx, [])).forEach(t => {
    if (t.desc?.toLowerCase().includes(ql))
      results.push({ icon: t.type==='income'?'💚':'🔴', label: t.desc, sub: `R$ ${t.amount}`, action: `orbit.switchTab('cofre')` });
  });

  // Hábitos
  (Habits.getAll()).forEach(h => {
    if (h.name?.toLowerCase().includes(ql))
      results.push({ icon: h.icon||'✅', label: h.name, sub: 'Hábito', action: `orbit.switchTab('hub');setTimeout(()=>orbit.switchHub('habitos'),200)` });
  });

  // Flashcards
  (Store.get(K.flash, [])).forEach(f => {
    if (f.front?.toLowerCase().includes(ql) || f.back?.toLowerCase().includes(ql))
      results.push({ icon: '🃏', label: f.front, sub: f.back?.slice(0,40), action: `orbit.switchTab('academia')` });
  });

  if (!results.length) {
    el.innerHTML = `<div style="color:var(--fg-4);font-size:13px;padding:8px 0">Nenhum resultado para "${q}"</div>`;
    return;
  }

  el.innerHTML = results.slice(0, 10).map(r => `
    <div class="search-result-item" onclick="${r.action};this.closest('.bottom-sheet').remove()">
      <span class="sri-icon">${r.icon}</span>
      <div class="sri-info">
        <div class="sri-label">${r.label}</div>
        ${r.sub ? `<div class="sri-sub">${r.sub}</div>` : ''}
      </div>
    </div>
  `).join('');
}
```

**CSS:**
```css
.search-result-item {
  display: flex; align-items: center; gap: 10px;
  padding: 10px 0; border-bottom: 1px solid var(--line-1);
  cursor: pointer; transition: opacity 0.15s;
}
.search-result-item:active { opacity: 0.6; }
.sri-icon { font-size: 18px; flex-shrink: 0; }
.sri-label { font-size: 13px; color: var(--fg-1); font-weight: 500; }
.sri-sub { font-size: 11px; color: var(--fg-4); margin-top: 1px; }
```

### 14.2 Modo Foco — Dashboard simplificado

**Arquivo:** `index.html` — botão no header do dashboard:
```html
<button class="dash-focus-btn" id="dash-focus-btn" onclick="orbit.toggleFocusMode()" title="Modo foco">
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
    <circle cx="12" cy="12" r="3"/><path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83"/>
  </svg>
</button>
```

```js
toggleFocusMode() {
  const isFocus = document.body.classList.toggle('focus-mode');
  UI.toast(isFocus ? '🎯 Modo foco ativado' : '📱 Modo normal', 'info', 1500);
  // No modo foco: esconde câmbio, esportes do dash, só mostra chat + agenda + hábitos
}
```

**CSS:**
```css
.focus-mode #dash-cambio-card { display: none; }
.focus-mode #dash-sports-content { display: none; }
.focus-mode .dash-quick-actions { display: none; }
.focus-mode .dash-greet { 
  border-color: rgba(212,175,55,0.2);
  background: linear-gradient(135deg, rgba(212,175,55,0.08), transparent);
}
```

---

## CHECKLIST PARTE 2

Implementar nesta ordem, após a Parte 1:

- [ ] **B9.1** — HTML da aba Mercado (sub-tab + seção completa)
- [ ] **B9.2** — CSS do Mercado (filtros, cards, detail panel)
- [ ] **B9.3** — JS: estado `_mercado`, `renderHubMercado()`, `_buildTransferCard()`, filtros
- [ ] **B9.3** — JS: `openTransferDetail()`, `mercadoFilter()`, `mercadoLeague()`, `mercadoSort()`
- [ ] **B9.4** — `getGlobalTransfers()` no `entertainment.js`
- [ ] **B9.4** — Integrar `switchHub('mercado')` no `switchHub()` existente do `app.js`
- [ ] **B10.1** — Detecção de `/diagnóstico` no fluxo de envio
- [ ] **B10.2** — Método `_runDiagnostic()` completo
- [ ] **B10.3** — Comando `/diagnóstico` no `cmd-palette`
- [ ] **B11.1** — HTML contador + CSS + JS listener do input
- [ ] **B11.2** — Atalhos de teclado expandidos
- [ ] **B11.3** — Tag de modo "🌐 Vai pesquisar"
- [ ] **B12.1** — HTML + canvas + método `_renderParetoFin()`
- [ ] **B12.2** — HTML + canvas + método `_renderParetoHab()`
- [ ] **B12** — CSS compartilhado do Pareto
- [ ] **B13.1** — Ripple effect global + CSS
- [ ] **B13.2** — Transições entre abas
- [ ] **B13.3** — Skeleton shimmer melhorado
- [ ] **B13.4** — `UI.countUp()` + aplicar no dashboard
- [ ] **B13.5** — Pull-to-refresh no dashboard
- [ ] **B13.6** — Toast aprimorado com ícones
- [ ] **B13.7** — Card de saudação premium (CSS)
- [ ] **B14.1** — Busca global (botão navbar + bottom sheet + `_runAppSearch()`)
- [ ] **B14.2** — Modo Foco (botão + toggle + CSS)

---

## NOTAS TÉCNICAS IMPORTANTES

### Sobre as transferências globais
A API `transfermarkt-api.fly.dev` é unofficial e pode ter instabilidade. O fallback via RSS já está implementado no projeto (`getTransferNews()`). O modo "Mercado Global" combina:
1. RSS do Google News filtrado por "transferência football fee"
2. Dados dos times cadastrados pelo usuário (mais confiáveis)

Para dados mais ricos, o usuário precisa cadastrar os times COM tmId (Transfermarkt ID) — o fluxo de busca já faz isso quando disponível.

### Sobre o `sendMsg()` com `silent: true`
O parâmetro `silent` precisa ser implementado no método de envio:
```js
// No método send() / sendMsg(), verificar:
if (opts?.silent) {
  // Não renderizar a mensagem do usuário na UI
  // Apenas processar e exibir resposta da Sophy
} else {
  // Comportamento normal
}
```

### Sobre `Habits.getDoneForDate()` e `Habits.getStreak()`
Verificar se esses métodos existem em `habits.js`. Se não:
```js
// habits.js — adicionar:
static getDoneForDate(habitId, dateStr) {
  const h = this.getAll().find(h => h.id === habitId);
  return h?.log?.includes(dateStr) || false;
}
static getStreak(habitId) {
  const h = this.getAll().find(h => h.id === habitId);
  return h?.streak || 0;
}
static isDoneToday(habitId) {
  return this.getDoneForDate(habitId, new Date().toISOString().slice(0,10));
}
```
