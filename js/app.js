/**
 * APP.JS - Controller Principal
 * Orbit Sophy v2 — Navegação + Dashboard + Chat
 */

import { Store, K } from './store.js';
import { AI } from './ai.js';
import { UI, Orb, Icons } from './ui.js';
import { Calculator, Pomodoro } from './tools.js';
import { Kanban, Flashcards, University, IdeaVault } from './study.js';
import { Faith } from './faith.js';

/* ── Open-Meteo — Teresina, PI ── */
const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-5.0892&longitude=-42.8019&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=America/Fortaleza';

const WMO_ICONS = {
    0: ['☀️', 'Céu limpo'], 1: ['🌤️', 'Quase limpo'], 2: ['⛅', 'Parcialmente nublado'],
    3: ['☁️', 'Nublado'], 45: ['🌫️', 'Névoa'], 48: ['🌫️', 'Névoa gelada'],
    51: ['🌦️', 'Chuvisco'], 53: ['🌦️', 'Chuvisco'], 55: ['🌧️', 'Chuvisco intenso'],
    61: ['🌧️', 'Chuva leve'], 63: ['🌧️', 'Chuva moderada'], 65: ['🌧️', 'Chuva forte'],
    71: ['🌨️', 'Neve leve'], 73: ['🌨️', 'Neve'], 75: ['🌨️', 'Neve intensa'],
    80: ['🌦️', 'Chuva fina'], 81: ['🌧️', 'Chuva'], 82: ['⛈️', 'Chuva intensa'],
    95: ['⛈️', 'Tempestade'], 96: ['⛈️', 'Tempestade c/ granizo'], 99: ['⛈️', 'Tempestade forte']
};

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

class App {
    constructor() {
        this.busy = false;
        this.pinBuffer = '';
        this.pinMode = 'enter';
        this.activeTab = 'id';
        this.currentNavTab = 'orbit';
        this.pendingImage = null;
        this.fullResponse = '';
        this.chatOpen = false;

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.boot());
        } else {
            this.boot();
        }
    }

    boot() {
        this.initOrb();
        this.setupListeners();
        this.fixViewport();
        this.initPWA();
        this.handleDeepLinks();

        const pin = Store.get(K.pin);
        if (!pin) {
            this.pinMode = 'set';
            const title = document.querySelector('.pin-title');
            if (title) title.textContent = 'CRIAR ACESSO';
            const sub = document.querySelector('.pin-sub');
            if (sub) sub.textContent = 'ESCOLHA 4 DÍGITOS';
        }
        document.getElementById('pinscreen').style.display = 'flex';
    }

    /* ── DEEP LINKS ───────────────────────────────── */
    handleDeepLinks() {
        const p = new URLSearchParams(window.location.search);
        const m = p.get('m');
        const action = p.get('action');
        if (m === 'chat') this._pendingOpenChat = true;
        if (action === 'pomodoro') this._pendingPomodoro = true;
    }

    /* ── PIN ──────────────────────────────────────── */
    pinKey(digit) {
        if (!digit || this.pinBuffer.length >= 4) return;
        if (navigator.vibrate) navigator.vibrate(30);
        this.pinBuffer += digit;
        this.updatePinDots();
        if (this.pinBuffer.length === 4) {
            setTimeout(() => this.processPin(), 220);
        }
    }

    pinDel() {
        this.pinBuffer = this.pinBuffer.slice(0, -1);
        this.updatePinDots();
    }

    updatePinDots(err = false) {
        document.querySelectorAll('.pin-dot').forEach((d, i) => {
            d.classList.remove('filled', 'err');
            if (i < this.pinBuffer.length) d.classList.add('filled');
            if (err) d.classList.add('err');
        });
    }

    processPin() {
        const stored = Store.get(K.pin);
        if (this.pinMode === 'set') {
            Store.set(K.pin, this.pinBuffer);
            this.pinBuffer = '';
            this.updatePinDots();
            if (navigator.vibrate) navigator.vibrate(50);
            this.enterApp();
        } else {
            if (this.pinBuffer === stored) {
                this.pinBuffer = '';
                this.updatePinDots();
                if (navigator.vibrate) navigator.vibrate(50);
                this.enterApp();
            } else {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                this.updatePinDots(true);
                setTimeout(() => {
                    this.pinBuffer = '';
                    this.updatePinDots();
                }, 700);
            }
        }
    }

    enterApp() {
        const pin = document.getElementById('pinscreen');
        if (!pin) return;
        pin.style.opacity = '0';
        pin.style.transition = 'opacity 0.35s';
        setTimeout(() => {
            pin.style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            document.getElementById('app').style.flexDirection = 'column';
            this.loadDashboard();
            this.loadChat();
            if (this._pendingOpenChat) { this._pendingOpenChat = false; this.openChat(); }
            if (this._pendingPomodoro) { this._pendingPomodoro = false; this.openPanel(); setTimeout(() => this.switchTab('tools'), 300); }
        }, 350);
    }

    /* ── NAVIGATION ───────────────────────────────── */
    switchTab(tab) {
        // Close chat if switching away from orbit
        if (tab !== 'orbit' && this.chatOpen) this.closeChat(false);

        document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));

        const screen = document.getElementById(`tab-${tab}`);
        const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        if (screen) screen.classList.add('active');
        if (btn) btn.classList.add('active');

        this.currentNavTab = tab;

        if (navigator.vibrate) navigator.vibrate(20);
    }

    /* ── CHAT OPEN/CLOSE ──────────────────────────── */
    openChat() {
        const chat = document.getElementById('chat');
        const dash = document.getElementById('dashboard');
        if (!chat) return;

        chat.style.display = 'flex';
        dash.style.display = 'none';
        this.chatOpen = true;

        // Android back button support
        history.pushState({ chat: true }, '');

        // Focus input
        setTimeout(() => {
            const inp = document.getElementById('msginput');
            if (inp) inp.focus();
        }, 350);
    }

    closeChat(goBack = true) {
        const chat = document.getElementById('chat');
        const dash = document.getElementById('dashboard');
        if (!chat) return;

        chat.style.display = 'none';
        dash.style.display = 'flex';
        dash.style.flexDirection = 'column';
        this.chatOpen = false;

        if (goBack && window.history.state?.chat) history.back();
    }

    /* ── DASHBOARD ────────────────────────────────── */
    async loadDashboard() {
        this.renderGreeting();
        this.renderMonthLabel();
        this.renderAgendaCard();
        this.renderFinanceCard();
        this.renderHabitsCard();
        this.renderVerseCard();
        this.loadWeather();
        this.renderSportsCard();
    }

    renderGreeting() {
        const now = AI.nowBR();
        const hr = now.getHours();
        const dow = now.getDay();
        const day = now.getDate();
        const month = now.getMonth();

        let greet = hr < 5 ? 'Boa madrugada, Pai' : hr < 12 ? 'Bom dia, Pai' : hr < 18 ? 'Boa tarde, Pai' : 'Boa noite, Pai';

        // Special days
        if (month === 1 && day === 4) greet = '🎂 Aniversário da Orbit, Pai!';
        else if (month === 11 && day === 25) greet = '🎄 Feliz Natal, Pai';
        else if (month === 11 && day === 11) greet = '⚙️ Feliz dia do Engenheiro, Pai';

        const subMap = {
            0: dow === 0 && hr >= 19 ? 'Domingo à noite — hora de alinhar a semana.' : 'Que o Senhor descanse bem.',
            1: 'Segunda-feira — semana nova, propósito novo.',
            2: '', 3: '', 4: '',
            5: 'Sexta-feira — boa hora para revisar a semana.',
            6: ''
        };

        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });

        document.getElementById('greet-line').textContent = greet;
        document.getElementById('greet-sub').textContent = subMap[dow] || dateStr;

        // Update chat hint with greeting context
        const hint = document.getElementById('dcb-hint');
        if (hint) {
            const hints = ['Falar com a Orbit...', 'O que o Senhor precisa hoje?', 'Aqui estou, Pai.', 'Pronta para agir.'];
            hint.textContent = hints[Math.floor(Math.random() * hints.length)];
        }
    }

    renderMonthLabel() {
        const now = AI.nowBR();
        const label = `${MONTHS_PT[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
        const el = document.getElementById('dash-month-label');
        if (el) el.textContent = label;
    }

    renderAgendaCard() {
        const agenda = Store.get(K.agenda, []);
        const disc = Store.get(K.disc, []);
        const now = AI.nowBR();
        const today = now.toISOString().slice(0, 10);
        const dow = now.getDay();

        const todayItems = agenda.filter(a => a.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const todayDisc = disc.filter(d => d.days && d.days.includes(dow));

        const list = document.getElementById('dash-today-list');
        if (!list) return;

        const allItems = [
            ...todayDisc.map(d => ({ time: d.time || '', title: `📚 ${d.name}`, cat: 'aula' })),
            ...todayItems.map(a => ({ time: a.time || '', title: a.title, cat: a.cat }))
        ].sort((a, b) => a.time.localeCompare(b.time));

        if (!allItems.length) {
            list.innerHTML = '<div class="dash-empty">Nenhum compromisso hoje.</div>';
            return;
        }

        list.innerHTML = allItems.map(item => `
            <div class="dash-list-item">
                <span class="dli-time">${item.time || '--:--'}</span>
                <span class="dli-dot"></span>
                <span>${item.title}</span>
            </div>
        `).join('');
    }

    renderFinanceCard() {
        const fin = Store.get(K.finance, { income: 0, expenses: 0 });
        const balance = (fin.income || 0) - (fin.expenses || 0);
        const fmt = n => `R$ ${Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;

        const balEl = document.getElementById('dash-balance');
        if (balEl) {
            balEl.textContent = fmt(balance);
            balEl.className = `dfr-val ${balance >= 0 ? 'finance-color' : 'danger-color'}`;
        }
        const incEl = document.getElementById('dash-income');
        if (incEl) incEl.textContent = fmt(fin.income || 0);
        const expEl = document.getElementById('dash-expenses');
        if (expEl) expEl.textContent = fmt(fin.expenses || 0);
    }

    renderHabitsCard() {
        const habits = Store.get(K.habits, []);
        const list = document.getElementById('dash-habits-list');
        if (!list) return;

        if (!habits.length) {
            list.innerHTML = '<div class="dash-empty">Configure hábitos no Hub.</div>';
            return;
        }

        const today = AI.nowBR().toISOString().slice(0, 10);
        list.innerHTML = habits.map(h => {
            const done = (h.done || []).includes(today);
            return `<div class="habit-chip ${done ? 'done' : ''}" onclick="orbit.toggleHabit('${h.id}')">
                <span>${h.icon || '●'}</span>
                <span>${h.name}</span>
            </div>`;
        }).join('');
    }

    toggleHabit(id) {
        const habits = Store.get(K.habits, []);
        const today = AI.nowBR().toISOString().slice(0, 10);
        const h = habits.find(x => x.id === id);
        if (!h) return;
        h.done = h.done || [];
        if (h.done.includes(today)) {
            h.done = h.done.filter(d => d !== today);
        } else {
            h.done.push(today);
            if (navigator.vibrate) navigator.vibrate(30);
        }
        Store.set(K.habits, habits);
        this.renderHabitsCard();
    }

    renderVerseCard() {
        const v = Faith.getVerseOfDay();
        if (!v) return;
        const ref = document.getElementById('dash-verse-ref');
        const text = document.getElementById('dash-verse-text');
        if (ref) ref.textContent = v.r;
        if (text) text.textContent = `"${v.t}"`;
    }

    async loadWeather() {
        const cached = sessionStorage.getItem('orbit_weather');
        const cachedTime = parseInt(sessionStorage.getItem('orbit_weather_ts') || '0');
        const AGE = 30 * 60 * 1000; // 30 min cache

        let data;
        if (cached && Date.now() - cachedTime < AGE) {
            data = JSON.parse(cached);
        } else {
            try {
                const res = await fetch(WEATHER_URL);
                if (!res.ok) throw new Error('weather fetch failed');
                data = await res.json();
                sessionStorage.setItem('orbit_weather', JSON.stringify(data));
                sessionStorage.setItem('orbit_weather_ts', Date.now().toString());
            } catch (_) {
                document.getElementById('weather-temp').textContent = '--°';
                document.getElementById('weather-desc').textContent = 'Sem conexão';
                return;
            }
        }

        const cur = data?.current;
        if (!cur) return;

        const code = cur.weathercode ?? 0;
        const [icon, desc] = WMO_ICONS[code] || ['🌡️', 'Teresina'];
        const temp = Math.round(cur.temperature_2m ?? 0);

        document.getElementById('weather-icon').textContent = icon;
        document.getElementById('weather-temp').textContent = `${temp}°`;
        document.getElementById('weather-desc').textContent = desc;
    }

    renderSportsCard() {
        const el = document.getElementById('dash-sports-content');
        if (!el) return;
        // Static placeholder — TheSportsDB integration in Sessão 8
        el.innerHTML = `
            <div class="dash-list-item" style="gap:8px">
                <span>🏎️</span>
                <span style="font-size:13px;color:var(--text-sec)">Próxima corrida F1: carregando...</span>
            </div>
            <div class="dash-list-item" style="gap:8px">
                <span>⚽</span>
                <span style="font-size:13px;color:var(--text-sec)">Flamengo — próximo jogo: a confirmar</span>
            </div>
        `;
    }

    /* ── CHAT ─────────────────────────────────────── */
    loadChat() {
        const cfg = Store.getCfg();
        const hdrName = document.getElementById('hdr-name');
        if (hdrName) hdrName.textContent = cfg.name.toUpperCase();

        const history = Store.get('orbit_msgs', []);
        if (history.length > 0) {
            const empty = document.getElementById('empty');
            if (empty) empty.style.display = 'none';
            history.slice(-20).forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    UI.addMsg(m.role === 'user' ? 'user' : 'sophy', m.content || '', false, null, false);
                }
            });
            const msgs = document.getElementById('msgs');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
        UI.setStatus('online');
    }

    async handleSend() {
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        const text = inp.value.trim();
        if (!text && !this.pendingImage) return;

        // Quick commands
        if (text.startsWith('!ideia ')) {
            IdeaVault.add(text.slice(7));
            UI.toast('Ideia salva! 💡', 'ok');
            inp.value = '';
            return;
        }
        if (text === '/esquece') {
            Store.set('orbit_msgs', []);
            document.getElementById('msgs').innerHTML = '';
            document.getElementById('empty').style.display = 'flex';
            UI.toast('Sessão limpa.', 'ok');
            inp.value = '';
            return;
        }

        const cfg = Store.getCfg();
        if (!cfg.apiKey && !cfg.groqKey) {
            UI.toast('Configure a API Key em Configurações → IA', 'err');
            return;
        }

        this.busy = true;
        this.setUI(false);
        this.fullResponse = '';

        UI.addMsg('user', text, false, this.pendingImage);
        inp.value = '';
        inp.style.height = 'auto';

        const history = Store.get('orbit_msgs', []);
        const userMsg = { role: 'user', content: text };
        if (this.pendingImage) userMsg.image = this.pendingImage;
        history.push(userMsg);
        this.pendingImage = null;
        this.removeAttach();

        const sophyRow = UI.addMsg('sophy', '...', true);
        const bubble = sophyRow ? sophyRow.querySelector('.mbubble') : null;
        if (bubble) {
            bubble.innerHTML = '<div class="typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';
            bubble.id = 'sb';
        }

        try {
            await AI.streamRequest(
                { messages: AI.getWindowedMsgs(history) },
                (delta) => {
                    this.fullResponse += delta;
                    const sb = document.getElementById('sb');
                    if (sb) sb.innerHTML = this.fullResponse;
                    const msgs = document.getElementById('msgs');
                    if (msgs) msgs.scrollTop = msgs.scrollHeight;
                }
            );

            const sb = document.getElementById('sb');
            if (sb) {
                sb.removeAttribute('id');
                sb.innerHTML = UI.renderMd(this.fullResponse);
            }

            history.push({ role: 'assistant', content: this.fullResponse });
            Store.set('orbit_msgs', history.slice(-100));

            if (history.length % 12 === 0) AI.summarizeSession(history);

        } catch (err) {
            const sb = document.getElementById('sb');
            if (sb) sb.innerHTML = `<span class="merr">Erro: ${err.message}</span>`;
            UI.toast('Falha na requisição', 'err');
        } finally {
            this.busy = false;
            this.setUI(true);
        }
    }

    setUI(on) {
        const btn = document.getElementById('sendbtn');
        const inp = document.getElementById('msginput');
        if (btn) btn.disabled = !on;
        if (inp) inp.disabled = !on;
        UI.setStatus(on ? 'online' : 'respondendo...');
    }

    /* ── PANEL ────────────────────────────────────── */
    openPanel() {
        this.renderPanelTab(this.activeTab);
        document.getElementById('panel').classList.add('open');
    }

    closePanel() { document.getElementById('panel').classList.remove('open'); }
    openCtx() { document.getElementById('ctx').classList.add('open'); }
    closeCtx() { document.getElementById('ctx').classList.remove('open'); }

    switchPanelTab(tab, el) {
        this.activeTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
        if (el) el.classList.add('on');
        this.renderPanelTab(tab);
    }

    renderPanelTab(tab) {
        const cfg = Store.getCfg();
        const body = document.getElementById('p-body');
        if (!body) return;

        if (tab === 'id') {
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Nome da IA</label>
                  <input type="text" id="s-name" value="${cfg.name}">
                </div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
            `;
        } else if (tab === 'ai') {
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Groq API Key (primária — grátis)</label>
                  <input type="password" id="s-groq" value="${cfg.groqKey}" placeholder="gsk_...">
                  <p style="font-size:11px;color:var(--text-muted);margin-top:6px">LLaMA 3.3 70B · 14.400 req/dia · groq.com</p>
                </div>
                <div class="psec">
                  <label class="plabel">Modelo Groq</label>
                  <select id="s-groq-model">
                    <option value="llama-3.3-70b-versatile" ${cfg.groqModel==='llama-3.3-70b-versatile'?'selected':''}>LLaMA 3.3 70B Versatile</option>
                    <option value="llama-3.1-8b-instant" ${cfg.groqModel==='llama-3.1-8b-instant'?'selected':''}>LLaMA 3.1 8B Instant (mais rápido)</option>
                    <option value="mixtral-8x7b-32768" ${cfg.groqModel==='mixtral-8x7b-32768'?'selected':''}>Mixtral 8x7B</option>
                  </select>
                </div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <div class="psec">
                  <label class="plabel">Gemini API Key (fallback)</label>
                  <input type="password" id="s-key" value="${cfg.apiKey}" placeholder="AIza...">
                  <p style="font-size:11px;color:var(--text-muted);margin-top:6px">Gemini 2.5 Flash Lite · 1.500 req/dia</p>
                </div>
                <div class="psec">
                  <label class="plabel">Modelo Gemini</label>
                  <select id="s-model">
                    <option value="gemini-2.5-flash-lite" ${cfg.model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite (Grátis)</option>
                    <option value="gemini-2.5-flash" ${cfg.model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash</option>
                  </select>
                </div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
                <div class="psec" style="margin-top:16px">
                  <label class="plabel">STATUS</label>
                  <div id="ai-status" style="font-family:var(--fm);font-size:12px;color:var(--text-sec)">
                    ${cfg.groqKey ? '● Groq configurado (primário)' : '○ Groq não configurado'}
                    <br>
                    ${cfg.apiKey ? '● Gemini configurado (fallback)' : '○ Gemini não configurado'}
                  </div>
                </div>
            `;
        } else if (tab === 'mem') {
            const ep = Store.getEp();
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Núcleo de Identidade</label>
                  <textarea id="s-nuc" rows="6" style="font-size:12px">${Store.getNuc()}</textarea>
                  <button class="btn btn-primary" onclick="orbit.saveNuc()">SALVAR NÚCLEO</button>
                </div>
                <div class="psec">
                  <label class="plabel">Memórias Episódicas (${ep.length})</label>
                  <div>
                    ${ep.length ? ep.map(e => `<div class="ctx-item"><strong style="font-size:11px;color:var(--text-sec)">${e.d||''}:</strong> ${e.s}</div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">Nenhuma memória salva ainda.</p>'}
                  </div>
                </div>
                <button class="btn btn-danger" onclick="orbit.clearMem()">LIMPAR MEMÓRIAS</button>
            `;
        } else if (tab === 'disc') {
            const d = University.get();
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Nova Disciplina — UFPI</label>
                  <input type="text" id="dc-name" placeholder="Nome da Matéria">
                  <input type="text" id="dc-prof" placeholder="Professor" style="margin-top:8px">
                  <button class="btn btn-primary" onclick="orbit.addDisc()">ADICIONAR</button>
                </div>
                <div>
                  ${d.length ? d.map(i => `<div class="ctx-item"><strong>${i.name}</strong>${i.professor ? ' — ' + i.professor : ''} <button onclick="orbit.delDisc('${i.id}')" style="float:right;background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px">×</button></div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">Nenhuma disciplina cadastrada.</p>'}
                </div>
            `;
        } else if (tab === 'extras') {
            const ideas = IdeaVault.get().reverse();
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">KANBAN</label>
                  ${this.renderKanban()}
                </div>
                <div class="psec">
                  <label class="plabel">Baú de Ideias (${ideas.length})</label>
                  ${ideas.map(i => `<div class="ctx-item"><em style="font-size:11px;color:var(--text-muted)">${i.date}</em><br>${i.text} <button onclick="orbit.delIdea('${i.id}')" style="float:right;background:none;border:none;color:var(--danger);cursor:pointer">×</button></div>`).join('') || '<p style="color:var(--text-muted);font-size:13px">Use !ideia [texto] no chat.</p>'}
                </div>
            `;
        } else if (tab === 'fe') {
            const v = Faith.getVerseOfDay();
            const journal = Faith.getJournal();
            body.innerHTML = `
                <div class="ctx-item" style="margin-bottom:16px;border-color:rgba(201,152,42,.3);background:rgba(201,152,42,.04)">
                  <div style="font-family:var(--fm);font-size:10px;color:var(--gold);margin-bottom:8px;letter-spacing:1px">${v.r}</div>
                  <div style="font-size:14px;line-height:1.7;font-style:italic">"${v.t}"</div>
                </div>
                <div class="psec">
                  <label class="plabel">Diário Espiritual</label>
                  <textarea id="fe-j-inp" rows="3" placeholder="O que Deus falou com o Senhor hoje?"></textarea>
                  <button class="btn btn-primary" onclick="orbit.addFaithJournal()">REGISTRAR</button>
                </div>
                <div>
                  ${journal.map(j => `<div class="ctx-item"><em style="font-size:11px;color:var(--text-muted)">${j.date}</em><br>${j.text}</div>`).join('')}
                </div>
            `;
        } else if (tab === 'tools') {
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">CALCULADORA</label>
                  <input type="text" id="calc-inp" placeholder="Ex: 2 + 2 * 3.14">
                  <div id="calc-res" class="tool-result" style="margin-top:8px">—</div>
                  <button class="btn btn-primary" onclick="orbit.runCalc()">CALCULAR</button>
                </div>
                <div class="psec">
                  <label class="plabel">POMODORO 🍅</label>
                  <div style="font-family:var(--fm);font-size:40px;text-align:center;color:var(--white);padding:16px 0" id="pomo-time">25:00</div>
                  <div style="background:var(--raised);border-radius:6px;height:4px;overflow:hidden;margin-bottom:14px"><div id="pomo-bar" style="height:100%;width:0%;background:var(--white);transition:width 1s linear"></div></div>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" id="pomo-btn" onclick="orbit.pomoToggle()" style="margin-top:0">INICIAR</button>
                    <button class="btn btn-ghost" onclick="orbit.pomoReset()" style="margin-top:0">RESET</button>
                  </div>
                </div>
            `;
        } else if (tab === 'sys') {
            body.innerHTML = `
                <button class="btn btn-ghost" onclick="orbit.exportBkp()">EXPORTAR BACKUP JSON</button>
                <button class="btn btn-ghost" onclick="orbit.resetPin()">TROCAR PIN</button>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <div class="psec">
                  <label class="plabel">Prompt do Sistema</label>
                  <textarea id="s-prompt" rows="6" style="font-size:12px">${cfg.prompt || ''}</textarea>
                  <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR PROMPT</button>
                </div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <button class="btn btn-danger" onclick="orbit.resetAll()">RESET TOTAL</button>
            `;
        }
    }

    renderKanban() {
        const kb = Kanban.get();
        const cols = ['todo', 'doing', 'done'];
        const labels = { todo: 'FAZER', doing: 'FAZENDO', done: 'FEITO' };
        return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${cols.map(c => `
                <div>
                  <div style="font-family:var(--fm);font-size:9px;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">${labels[c]} (${(kb[c]||[]).length})</div>
                  ${(kb[c]||[]).map(item => `<div onclick="orbit.moveTask('${item.id}','${c}')" style="background:var(--overlay);border:1px solid var(--border);border-radius:8px;padding:7px 9px;font-size:12px;margin-bottom:5px;cursor:pointer;-webkit-tap-highlight-color:transparent">${item.text}</div>`).join('')}
                  <input type="text" id="ki-${c}" placeholder="+" style="font-size:12px;padding:6px 9px" onkeydown="if(event.key==='Enter')orbit.addTask('${c}')">
                </div>
            `).join('')}
        </div>`;
    }

    /* ── ACTIONS ──────────────────────────────────── */
    saveSettings() {
        const cfg = Store.getCfg();
        const fields = { 's-name': 'name', 's-key': 'apiKey', 's-groq': 'groqKey', 's-model': 'model', 's-groq-model': 'groqModel', 's-prompt': 'prompt' };
        Object.entries(fields).forEach(([id, key]) => {
            const el = document.getElementById(id);
            if (el && el.value.trim()) cfg[key] = el.value.trim();
        });
        Store.saveCfg(cfg);
        const hdrName = document.getElementById('hdr-name');
        if (hdrName) hdrName.textContent = cfg.name.toUpperCase();
        UI.toast('Configurações salvas!', 'ok');
        this.closePanel();
    }

    saveNuc() {
        const el = document.getElementById('s-nuc');
        if (el) { Store.saveNuc(el.value); UI.toast('Núcleo salvo!', 'ok'); }
    }

    clearMem() {
        if (!confirm('Limpar memórias episódicas?')) return;
        Store.saveEp([]);
        this.renderPanelTab('mem');
        UI.toast('Memórias limpas.', 'ok');
    }

    addDisc() {
        const n = document.getElementById('dc-name')?.value.trim();
        const p = document.getElementById('dc-prof')?.value.trim() || '';
        if (!n) return UI.toast('Preencha o nome!', 'err');
        University.add(n, p, '', []);
        this.renderPanelTab('disc');
        UI.toast('Disciplina adicionada!', 'ok');
    }

    delDisc(id) { University.remove(id); this.renderPanelTab('disc'); }

    addTask(col) {
        const inp = document.getElementById(`ki-${col}`);
        if (inp?.value.trim()) { Kanban.add(col, inp.value.trim()); this.renderPanelTab('extras'); }
    }

    moveTask(id, col) {
        const next = { todo: 'doing', doing: 'done', done: 'todo' };
        Kanban.move(id, col, next[col]);
        this.renderPanelTab('extras');
    }

    addFaithJournal() {
        const el = document.getElementById('fe-j-inp');
        if (el?.value.trim()) { Faith.addJournal(el.value.trim()); el.value = ''; this.renderPanelTab('fe'); UI.toast('Registrado! 🙏', 'ok'); }
    }

    delIdea(id) { IdeaVault.remove(id); this.renderPanelTab('extras'); }

    runCalc() {
        const val = document.getElementById('calc-inp')?.value;
        if (val) document.getElementById('calc-res').textContent = Calculator.run(val);
    }

    pomoToggle() {
        if (Pomodoro.state.running) {
            Pomodoro.stop();
            const btn = document.getElementById('pomo-btn');
            if (btn) btn.textContent = 'INICIAR';
        } else {
            Pomodoro.start(
                () => {
                    const el = document.getElementById('pomo-time');
                    if (el) el.textContent = Pomodoro.format();
                    const bar = document.getElementById('pomo-bar');
                    const s = Pomodoro.state;
                    if (bar) bar.style.width = `${(s.elapsed / s.total) * 100}%`;
                },
                () => {
                    UI.toast('Pomodoro completo! 🍅', 'ok');
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                    this.pomoReset();
                }
            );
            const btn = document.getElementById('pomo-btn');
            if (btn) btn.textContent = 'PAUSAR';
        }
    }

    pomoReset() {
        Pomodoro.reset();
        const el = document.getElementById('pomo-time');
        if (el) el.textContent = '25:00';
        const bar = document.getElementById('pomo-bar');
        if (bar) bar.style.width = '0%';
        const btn = document.getElementById('pomo-btn');
        if (btn) btn.textContent = 'INICIAR';
    }

    exportBkp() {
        const data = {
            config: { ...Store.getCfg(), apiKey: '', groqKey: '' },
            ep: Store.getEp(),
            nuc: Store.getNuc(),
            disc: University.get(),
            flash: Flashcards.get(),
            fe: Faith.getJournal(),
            ideas: IdeaVault.get()
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orbit-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        UI.toast('Backup exportado!', 'ok');
    }

    resetPin() {
        if (!confirm('Trocar o PIN? Você vai precisar criar um novo.')) return;
        localStorage.removeItem(K.pin);
        this.pinBuffer = '';
        this.pinMode = 'set';
        const title = document.querySelector('.pin-title');
        if (title) title.textContent = 'CRIAR NOVO PIN';
        this.closePanel();
        document.getElementById('app').style.display = 'none';
        document.getElementById('pinscreen').style.display = 'flex';
        document.getElementById('pinscreen').style.opacity = '1';
    }

    resetAll() {
        if (!confirm('Apagar TUDO? Esta ação é irreversível.')) return;
        localStorage.clear();
        location.reload();
    }

    /* ── FILE ATTACH ──────────────────────────────── */
    onFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return UI.toast('Apenas imagens!', 'err');
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.pendingImage = { data: ev.target.result.split(',')[1], type: file.type, name: file.name };
            const bar = document.getElementById('attach-bar');
            if (bar) {
                bar.style.display = 'flex';
                bar.innerHTML = `<div class="attach-chip">🖼️ ${file.name.slice(0, 18)} <button onclick="orbit.removeAttach()">×</button></div>`;
            }
            UI.toast('Imagem pronta!', 'ok');
        };
        reader.readAsDataURL(file);
    }

    removeAttach() {
        this.pendingImage = null;
        const bar = document.getElementById('attach-bar');
        if (bar) { bar.style.display = 'none'; bar.innerHTML = ''; }
        const inp = document.getElementById('file-inp');
        if (inp) inp.value = '';
    }

    /* ── SETUP LISTENERS ──────────────────────────── */
    setupListeners() {
        // Send button
        document.getElementById('sendbtn')?.addEventListener('click', () => this.handleSend());

        // Textarea
        const inp = document.getElementById('msginput');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
            });
            inp.addEventListener('input', () => {
                inp.style.height = 'auto';
                inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
            });
        }

        // Panel tabs
        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchPanelTab(tab, e.currentTarget);
            });
        });

        // PIN keys
        document.querySelectorAll('.pin-key').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('del')) this.pinDel();
                else if (!btn.classList.contains('empty')) this.pinKey(btn.textContent.trim());
            });
        });

        // File input
        document.getElementById('file-inp')?.addEventListener('change', (e) => this.onFileSelect(e));

        // Android back button
        window.addEventListener('popstate', (e) => {
            if (this.chatOpen) {
                this.closeChat(false);
            }
        });
    }

    /* ── UTILS ────────────────────────────────────── */
    fixViewport() {
        if (!window.visualViewport) return;
        window.visualViewport.addEventListener('resize', () => {
            const chat = document.getElementById('chat');
            if (chat && chat.style.display !== 'none') {
                chat.style.height = window.visualViewport.height + 'px';
            }
        });
    }

    initOrb() {
        const canvas = document.getElementById('bg-canvas');
        if (!canvas) return;
        try { new Orb('bg-canvas').draw(); } catch (_) {}
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
        if ('storage' in navigator && 'persist' in navigator.storage) {
            navigator.storage.persist().catch(() => {});
        }
    }
}

window.orbit = new App();
