/**
 * APP.JS — Controller Principal Orbit Sophy
 * Sessions 1-10 integradas
 */

import { Store, K } from './store.js';
import { AI } from './ai.js';
import { UI, Icons } from './ui.js';
import { Calculator, Converter, Pomodoro, DataTools } from './tools.js';
import { Kanban, Flashcards, University, IdeaVault, Grades } from './study.js';
import { Faith, VERSES, ACTS_PRAYERS } from './faith.js';
import { Agenda, EVT_CATS } from './agenda.js';
import { Finance, FIN_CATS } from './finance.js';
import { Habits } from './habits.js';
import { Vault } from './vault.js';
import { Entertainment } from './entertainment.js';

const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast?latitude=-5.0892&longitude=-42.8019&current=temperature_2m,weathercode,windspeed_10m,relativehumidity_2m&timezone=America/Fortaleza';
const CAMBIO_URL  = 'https://economia.awesomeapi.com.br/json/last/USD-BRL,EUR-BRL';

const WMO_ICONS = {
    0: ['☀️','Céu limpo'], 1: ['🌤️','Quase limpo'], 2: ['⛅','Parcialmente nublado'],
    3: ['☁️','Nublado'], 45: ['🌫️','Névoa'], 48: ['🌫️','Névoa gelada'],
    51: ['🌦️','Chuvisco'], 53: ['🌦️','Chuvisco'], 55: ['🌧️','Chuvisco intenso'],
    61: ['🌧️','Chuva leve'], 63: ['🌧️','Chuva moderada'], 65: ['🌧️','Chuva forte'],
    80: ['🌦️','Chuva fina'], 81: ['🌧️','Chuva'], 82: ['⛈️','Chuva intensa'],
    95: ['⛈️','Tempestade'], 99: ['⛈️','Tempestade forte']
};

const MONTHS_PT = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const DAYS_PT_SHORT = ['Dom','Seg','Ter','Qua','Qui','Sex','Sáb'];
const URL_RE = /https?:\/\/[^\s<>"']+/;

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
        this.abortCtrl = null;
        this._hf = false;
        this._sr = null;
        this.voiceActive = false;
        this._ctxMsgId = null;
        this._wakeLock = null;
        this._sharedContent = null;

        // Agenda state
        this._agendaYear = new Date().getFullYear();
        this._agendaMonth = new Date().getMonth() + 1;
        this._agendaSelectedDay = new Date().toISOString().slice(0, 10);
        this._editingEvtId = null;

        // Cofre state
        this._txFilter = 'all';
        this._editingVltId = null;
        this._currentCofreSec = 'fin';

        // Academia state
        this._cardQueue = [];
        this._cardFlipped = false;
        this._pomoSessions = 0;
        this._pomoWorkMin = 25;
        this._pomoBreakMin = 5;

        // Hub state
        this._currentHubSec = 'kanban';
        this._currentFeSec = 'journal';
        this._txType = 'expense';

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.boot());
        } else {
            this.boot();
        }
    }

    boot() {
        this.initOrb();
        this.setupListeners();
        this.setupVoice();
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

    /* ── DEEP LINKS ── */
    handleDeepLinks() {
        const p = new URLSearchParams(window.location.search);
        const m = p.get('m');
        const action = p.get('action');
        if (m === 'chat') this._pendingOpenChat = true;
        if (action === 'pomodoro') this._pendingPomodoro = true;
        if (action === 'agenda') this._pendingAgenda = true;

        const sharedText = p.get('text') || '';
        const sharedUrl = p.get('url') || '';
        const sharedTitle = p.get('title') || '';
        if (sharedText || sharedUrl || sharedTitle) {
            this._pendingOpenChat = true;
            this._sharedContent = [sharedTitle, sharedText, sharedUrl].filter(Boolean).join(' ').trim();
        }
    }

    /* ── PIN ── */
    pinKey(digit) {
        if (!digit || this.pinBuffer.length >= 4) return;
        if (navigator.vibrate) navigator.vibrate(30);
        this.pinBuffer += digit;
        this.updatePinDots();
        if (this.pinBuffer.length === 4) setTimeout(() => this.processPin(), 220);
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
                setTimeout(() => { this.pinBuffer = ''; this.updatePinDots(); }, 700);
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
            if (this._pendingPomodoro) { this._pendingPomodoro = false; this.switchTab('academia'); setTimeout(() => this.switchAcad('pomo'), 300); }
            if (this._pendingAgenda) { this._pendingAgenda = false; setTimeout(() => this.switchTab('agenda'), 300); }
        }, 350);
    }

    /* ── NAVIGATION ── */
    switchTab(tab) {
        if (tab !== 'orbit' && this.chatOpen) this.closeChat(false);
        document.querySelectorAll('.tab-screen').forEach(s => s.classList.remove('active'));
        document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
        const screen = document.getElementById(`tab-${tab}`);
        const btn = document.querySelector(`.nav-btn[data-tab="${tab}"]`);
        if (screen) screen.classList.add('active');
        if (btn) btn.classList.add('active');
        this.currentNavTab = tab;
        if (navigator.vibrate) navigator.vibrate(20);

        if (tab === 'agenda') this.renderAgendaTab();
        else if (tab === 'cofre') this.renderCofreTab();
        else if (tab === 'academia') this.renderAcademiaTab();
        else if (tab === 'hub') this.renderHubTab();
    }

    /* ── CHAT OPEN/CLOSE ── */
    openChat() {
        const chat = document.getElementById('chat');
        const dash = document.getElementById('dashboard');
        if (!chat) return;
        chat.style.display = 'flex';
        dash.style.display = 'none';
        this.chatOpen = true;
        history.pushState({ chat: true }, '');
        setTimeout(() => {
            const inp = document.getElementById('msginput');
            if (inp) {
                inp.focus();
                if (this._sharedContent) {
                    inp.value = this._sharedContent;
                    this._sharedContent = null;
                    this.handleInput();
                }
            }
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
        if (this.voiceActive) this.stopVoice();
        if (goBack && window.history.state?.chat) history.back();
    }

    /* ── DASHBOARD ── */
    async loadDashboard() {
        this.renderGreeting();
        this.renderMonthLabel();
        this.renderAgendaCard();
        this.renderFinanceCard();
        this.renderHabitsCard();
        this.renderVerseCard();
        this.loadWeather();
        this.loadCambio();
        this.renderSportsCard();
    }

    renderGreeting() {
        const now = AI.nowBR();
        const hr = now.getHours();
        const dow = now.getDay();
        const day = now.getDate();
        const month = now.getMonth();

        let greet = hr < 5 ? 'Boa madrugada, Pai' : hr < 12 ? 'Bom dia, Pai' : hr < 18 ? 'Boa tarde, Pai' : 'Boa noite, Pai';
        if (month === 1 && day === 4) greet = '🎂 Aniversário da Orbit, Pai!';
        else if (month === 11 && day === 25) greet = '🎄 Feliz Natal, Pai';
        else if (month === 11 && day === 11) greet = '⚙️ Feliz dia do Engenheiro, Pai';

        const subMap = {
            0: dow === 0 && hr >= 19 ? 'Domingo à noite — hora de alinhar a semana.' : 'Que o Senhor descanse bem.',
            1: 'Segunda-feira — semana nova, propósito novo.',
            5: 'Sexta-feira — boa hora para revisar a semana.',
        };

        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        document.getElementById('greet-line').textContent = greet;
        document.getElementById('greet-sub').textContent = subMap[dow] || dateStr;

        const hint = document.getElementById('dcb-hint');
        if (hint) {
            const hints = ['Falar com a Orbit...', 'O que o Senhor precisa hoje?', 'Aqui estou, Pai.', 'Pronta para agir.'];
            hint.textContent = hints[Math.floor(Math.random() * hints.length)];
        }
    }

    renderMonthLabel() {
        const now = AI.nowBR();
        const el = document.getElementById('dash-month-label');
        if (el) el.textContent = `${MONTHS_PT[now.getMonth()].toUpperCase()} ${now.getFullYear()}`;
    }

    renderAgendaCard() {
        const agenda = Store.get(K.agenda, []);
        const disc = Store.get(K.disc, []);
        const now = AI.nowBR();
        const today = now.toISOString().slice(0, 10);
        const dow = now.getDay();

        const todayEvts = Agenda.getForDate(today);
        const list = document.getElementById('dash-today-list');
        if (!list) return;

        if (!todayEvts.length) {
            list.innerHTML = '<div class="dash-empty">Nenhum compromisso hoje.</div>';
            return;
        }

        list.innerHTML = todayEvts.slice(0, 4).map(item => `
            <div class="dash-list-item">
                <span class="dli-time">${item.time || '--:--'}</span>
                <span class="dli-dot" style="background:${Agenda.catColor(item.cat)}"></span>
                <span>${item.title}</span>
            </div>
        `).join('');
    }

    renderFinanceCard() {
        const s = Finance.getSummary();
        const fmt = Finance.fmt;
        const balEl = document.getElementById('dash-balance');
        if (balEl) {
            balEl.textContent = fmt(s.balance);
            balEl.className = `dfr-val ${s.balance >= 0 ? 'finance-color' : 'danger-color'}`;
        }
        const incEl = document.getElementById('dash-income');
        if (incEl) incEl.textContent = fmt(s.income);
        const expEl = document.getElementById('dash-expenses');
        if (expEl) expEl.textContent = fmt(s.expenses);
    }

    renderHabitsCard() {
        const habits = Habits.getAll();
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
                <span>${h.icon || '●'}</span><span>${h.name}</span>
            </div>`;
        }).join('');
    }

    toggleHabit(id) {
        const today = AI.nowBR().toISOString().slice(0, 10);
        Habits.toggle(id, today);
        if (navigator.vibrate) navigator.vibrate(30);
        this.renderHabitsCard();
        if (this._currentHubSec === 'habitos') this.renderHubHabitos();
    }

    renderVerseCard() {
        const v = Faith.getVerseOfDay();
        if (!v) return;
        AI._faithVerse = v.t;
        const ref = document.getElementById('dash-verse-ref');
        const text = document.getElementById('dash-verse-text');
        if (ref) ref.textContent = v.r;
        if (text) text.textContent = `"${v.t}"`;
    }

    async loadWeather() {
        const cached = sessionStorage.getItem('orbit_weather');
        const cachedTime = parseInt(sessionStorage.getItem('orbit_weather_ts') || '0');
        const AGE = 30 * 60 * 1000;
        let data;
        if (cached && Date.now() - cachedTime < AGE) {
            data = JSON.parse(cached);
        } else {
            try {
                const res = await fetch(WEATHER_URL);
                if (!res.ok) throw new Error();
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

    async loadCambio() {
        const cached = sessionStorage.getItem('orbit_cambio');
        const cachedTs = parseInt(sessionStorage.getItem('orbit_cambio_ts') || '0');
        let data;
        if (cached && Date.now() - cachedTs < 15 * 60 * 1000) {
            data = JSON.parse(cached);
        } else {
            try {
                const res = await fetch(CAMBIO_URL);
                if (!res.ok) throw new Error();
                data = await res.json();
                sessionStorage.setItem('orbit_cambio', JSON.stringify(data));
                sessionStorage.setItem('orbit_cambio_ts', Date.now().toString());
            } catch (_) { return; }
        }
        const fmt = (obj) => {
            if (!obj) return null;
            const val = parseFloat(obj.bid).toFixed(2).replace('.', ',');
            const pct = parseFloat(obj.pctChange);
            return { val: `R$ ${val}`, pct, cls: pct >= 0 ? 'up' : 'dn', txt: `${pct >= 0 ? '+' : ''}${pct.toFixed(1)}%` };
        };
        const usd = fmt(data?.USDBRL);
        const eur = fmt(data?.EURBRL);
        const usdEl = document.getElementById('dash-usd');
        const eurEl = document.getElementById('dash-eur');
        if (usdEl && usd) usdEl.innerHTML = `<span class="ci-flag">🇺🇸</span><span class="ci-code">USD</span><span class="ci-val">${usd.val}</span><span class="ci-pct ${usd.cls}">${usd.txt}</span>`;
        if (eurEl && eur) eurEl.innerHTML = `<span class="ci-flag">🇪🇺</span><span class="ci-code">EUR</span><span class="ci-val">${eur.val}</span><span class="ci-pct ${eur.cls}">${eur.txt}</span>`;
    }

    async renderSportsCard() {
        const el = document.getElementById('dash-sports-content');
        if (!el) return;
        el.innerHTML = '<div class="dash-empty">Carregando...</div>';

        const [f1, fla] = await Promise.all([
            Entertainment.getF1NextRace(),
            Entertainment.getFlamengoNext()
        ]);

        let html = '';
        if (f1) {
            const { fmtDate, diff } = Entertainment.formatRaceDate(f1.date, f1.time);
            html += `<div class="dash-list-item" style="gap:8px">
                <span>🏎️</span>
                <span style="font-size:13px;flex:1">${f1.name}</span>
                <span style="font-family:var(--fm);font-size:11px;color:var(--gold)">${diff > 0 ? `${diff}d` : 'hoje'}</span>
            </div>`;
        } else {
            html += `<div class="dash-list-item" style="gap:8px"><span>🏎️</span><span style="font-size:13px;color:var(--fg-4)">F1 — sem dados</span></div>`;
        }
        if (fla) {
            html += `<div class="dash-list-item" style="gap:8px">
                <span>⚽</span>
                <span style="font-size:13px">${fla.strHomeTeam} × ${fla.strAwayTeam}</span>
            </div>`;
        } else {
            html += `<div class="dash-list-item" style="gap:8px"><span>⚽</span><span style="font-size:13px;color:var(--fg-4)">Flamengo — verificar</span></div>`;
        }
        el.innerHTML = html;
    }

    /* ═══════════════════════════════════════════════
       AGENDA TAB
       ═══════════════════════════════════════════════ */
    renderAgendaTab() {
        const now = new Date();
        if (!this._agendaYear) this._agendaYear = now.getFullYear();
        if (!this._agendaMonth) this._agendaMonth = now.getMonth() + 1;
        this._renderCalendar();
        this._renderDayEvents(this._agendaSelectedDay);
    }

    _renderCalendar() {
        const label = document.getElementById('agenda-month-label');
        if (label) label.textContent = `${MONTHS_PT[this._agendaMonth - 1]} ${this._agendaYear}`;

        const cal = document.getElementById('agenda-cal');
        if (!cal) return;

        const daysWithEvents = Agenda.getDaysWithEvents(this._agendaYear, this._agendaMonth);
        const today = new Date().toISOString().slice(0, 10);

        const firstDay = new Date(this._agendaYear, this._agendaMonth - 1, 1).getDay();
        const daysInMonth = new Date(this._agendaYear, this._agendaMonth, 0).getDate();
        const prevDays = new Date(this._agendaYear, this._agendaMonth - 1, 0).getDate();

        let html = '<div class="cal-dow-row">';
        ['D','S','T','Q','Q','S','S'].forEach(d => { html += `<div class="cal-dow">${d}</div>`; });
        html += '</div><div class="cal-grid">';

        for (let i = 0; i < firstDay; i++) {
            const d = prevDays - firstDay + 1 + i;
            html += `<div class="cal-day other-month"><span class="cal-day-num">${d}</span></div>`;
        }

        for (let d = 1; d <= daysInMonth; d++) {
            const ds = `${this._agendaYear}-${String(this._agendaMonth).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
            const isToday = ds === today;
            const isSelected = ds === this._agendaSelectedDay;
            const hasDot = daysWithEvents.has(d);
            html += `<div class="cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" onclick="orbit.selectDay('${ds}')">
                <span class="cal-day-num">${d}</span>
                ${hasDot ? '<div class="cal-dot"></div>' : ''}
            </div>`;
        }

        const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="cal-day-num">${i}</span></div>`;
        }

        html += '</div>';
        cal.innerHTML = html;
    }

    _renderDayEvents(dateStr) {
        const hdr = document.getElementById('agenda-day-hdr');
        const list = document.getElementById('agenda-day-events');
        if (!hdr || !list) return;

        const [y, m, d] = dateStr.split('-').map(Number);
        const dt = new Date(y, m - 1, d);
        hdr.textContent = dt.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' }).toUpperCase();

        const events = Agenda.getForDate(dateStr);
        if (!events.length) {
            list.innerHTML = '<div class="evt-empty">Nenhum evento neste dia.</div>';
            return;
        }

        list.innerHTML = events.map(e => `
            <div class="evt-item" onclick="orbit.openEvtModal('${dateStr}', '${e.id}')">
                <div class="evt-dot" style="background:${Agenda.catColor(e.cat)}"></div>
                <div class="evt-body">
                    <div class="evt-title">${e.title}</div>
                    <div class="evt-meta">${e.time || 'Dia todo'}${e.disc ? ' · Aula' : ''}</div>
                </div>
            </div>
        `).join('');
    }

    selectDay(dateStr) {
        this._agendaSelectedDay = dateStr;
        this._renderCalendar();
        this._renderDayEvents(dateStr);
    }

    agendaPrevMonth() {
        this._agendaMonth--;
        if (this._agendaMonth < 1) { this._agendaMonth = 12; this._agendaYear--; }
        this._renderCalendar();
    }

    agendaNextMonth() {
        this._agendaMonth++;
        if (this._agendaMonth > 12) { this._agendaMonth = 1; this._agendaYear++; }
        this._renderCalendar();
    }

    openEvtModal(dateStr, id) {
        const modal = document.getElementById('evt-modal');
        if (!modal) return;
        this._editingEvtId = id && !id.startsWith('disc_') ? id : null;

        const dateInp = document.getElementById('evt-date');
        const timeInp = document.getElementById('evt-time');
        const titleInp = document.getElementById('evt-title');
        const catInp = document.getElementById('evt-cat');
        const notesInp = document.getElementById('evt-notes');
        const delBtn = document.getElementById('evt-del-btn');
        const title = document.getElementById('evt-modal-title');

        dateInp.value = dateStr || this._agendaSelectedDay;
        timeInp.value = '';
        titleInp.value = '';
        catInp.value = 'personal';
        notesInp.value = '';
        const recInp = document.getElementById('evt-recurring');
        if (recInp) recInp.value = 'none';
        delBtn.style.display = 'none';
        title.textContent = 'NOVO EVENTO';

        if (this._editingEvtId) {
            const evt = Agenda.getEvents().find(e => e.id === this._editingEvtId);
            if (evt) {
                titleInp.value = evt.title || '';
                dateInp.value = evt.date || dateInp.value;
                timeInp.value = evt.time || '';
                catInp.value = evt.cat || 'personal';
                notesInp.value = evt.notes || '';
                if (recInp) recInp.value = evt.recurring || 'none';
                delBtn.style.display = '';
                title.textContent = 'EDITAR EVENTO';
            }
        }

        modal.style.display = 'flex';
    }

    closeEvtModal() {
        const modal = document.getElementById('evt-modal');
        if (modal) modal.style.display = 'none';
        this._editingEvtId = null;
    }

    saveEvt() {
        const title = document.getElementById('evt-title')?.value.trim();
        const date = document.getElementById('evt-date')?.value;
        const time = document.getElementById('evt-time')?.value;
        const cat = document.getElementById('evt-cat')?.value;
        const notes = document.getElementById('evt-notes')?.value.trim();
        const recurring = document.getElementById('evt-recurring')?.value || 'none';

        if (!title) return UI.toast('Preencha o título!', 'err');
        if (!date) return UI.toast('Escolha uma data!', 'err');

        if (this._editingEvtId) {
            Agenda.update(this._editingEvtId, { title, date, time, cat, notes, recurring });
            UI.toast('Evento atualizado!', 'ok');
        } else {
            Agenda.add({ title, date, time, cat, notes, recurring });
            UI.toast('Evento adicionado!', 'ok');
        }

        this.closeEvtModal();
        this.renderAgendaCard();
        if (date === this._agendaSelectedDay) this._renderDayEvents(date);
        this._renderCalendar();
    }

    deleteEvt() {
        if (!this._editingEvtId) return;
        if (!confirm('Excluir este evento?')) return;
        Agenda.remove(this._editingEvtId);
        UI.toast('Evento removido.', 'ok');
        this.closeEvtModal();
        this.renderAgendaCard();
        this._renderDayEvents(this._agendaSelectedDay);
        this._renderCalendar();
    }

    /* ═══════════════════════════════════════════════
       COFRE TAB
       ═══════════════════════════════════════════════ */
    renderCofreTab() {
        this.renderFinanceSec();
    }

    switchCofre(sec) {
        this._currentCofreSec = sec;
        document.querySelectorAll('#tab-cofre .mod-stab').forEach(b => b.classList.remove('active'));
        const btn = document.getElementById(`stab-${sec}`);
        if (btn) btn.classList.add('active');

        document.getElementById('cofre-fin').style.display = sec === 'fin' ? '' : 'none';
        document.getElementById('cofre-vault').style.display = sec === 'vault' ? '' : 'none';

        if (sec === 'fin') this.renderFinanceSec();
        else if (sec === 'vault') this.renderVaultSec();
    }

    renderFinanceSec() {
        const s = Finance.getSummary();
        const fmt = Finance.fmt;

        const balEl = document.getElementById('fin-balance');
        const incEl = document.getElementById('fin-income');
        const expEl = document.getElementById('fin-expenses');
        if (balEl) { balEl.textContent = fmt(s.balance); balEl.style.color = s.balance >= 0 ? 'var(--ok)' : 'var(--err)'; }
        if (incEl) incEl.textContent = fmt(s.income);
        if (expEl) expEl.textContent = fmt(s.expenses);

        this._renderTxList();
        this.renderFinanceCard();
        this._renderFinChart(s);
    }

    _renderFinChart(s) {
        const canvas = document.getElementById('fin-chart');
        if (!canvas) return;
        const byCat = Finance.byCategory((s.txs || []).filter(t => t.type === 'expense'));
        if (!byCat.length) { canvas.style.display = 'none'; return; }
        canvas.style.display = 'block';

        const dpr = window.devicePixelRatio || 1;
        const W = canvas.offsetWidth || 320;
        const H = 180;
        canvas.width = W * dpr;
        canvas.height = H * dpr;
        canvas.style.height = H + 'px';
        const ctx = canvas.getContext('2d');
        ctx.scale(dpr, dpr);
        ctx.clearRect(0, 0, W, H);

        const COLORS = ['#c9982a','#4a9eff','#4ad08a','#ff5a5a','#a78bfa','#f59e0b'];
        const cx = W * 0.27, cy = H / 2, r = Math.min(cy - 12, W * 0.22);
        const total = byCat.reduce((a, b) => a + b.total, 0);
        let angle = -Math.PI / 2;

        byCat.slice(0, 6).forEach((cat, i) => {
            const slice = (cat.total / total) * Math.PI * 2;
            ctx.beginPath();
            ctx.moveTo(cx, cy);
            ctx.arc(cx, cy, r, angle, angle + slice);
            ctx.closePath();
            ctx.fillStyle = COLORS[i % COLORS.length];
            ctx.fill();
            angle += slice;
        });

        ctx.beginPath();
        ctx.arc(cx, cy, r * 0.54, 0, Math.PI * 2);
        ctx.fillStyle = '#080808';
        ctx.fill();

        ctx.font = `600 11px 'Geist Variable', sans-serif`;
        ctx.textAlign = 'left';
        const lx = W * 0.54;
        byCat.slice(0, 5).forEach((cat, i) => {
            const y = 22 + i * 32;
            ctx.fillStyle = COLORS[i % COLORS.length];
            ctx.beginPath();
            ctx.roundRect(lx, y - 8, 8, 8, 2);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.55)';
            ctx.font = `10px 'Geist Variable', sans-serif`;
            ctx.fillText(cat.name.slice(0, 12), lx + 12, y);
            ctx.fillStyle = 'rgba(255,255,255,0.82)';
            ctx.font = `600 12px 'JetBrains Mono', monospace`;
            ctx.fillText(Finance.fmt(cat.total), lx + 12, y + 15);
        });
    }

    _setupSwipe(el, onDelete) {
        let startX = 0, startY = 0, dragging = false;
        const THRESHOLD = 72;
        el.addEventListener('touchstart', e => {
            startX = e.touches[0].clientX;
            startY = e.touches[0].clientY;
            dragging = false;
        }, { passive: true });
        el.addEventListener('touchmove', e => {
            const dx = e.touches[0].clientX - startX;
            const dy = Math.abs(e.touches[0].clientY - startY);
            if (!dragging && Math.abs(dx) > 8 && dy < 18) dragging = true;
            if (dragging && dx < 0) {
                el.style.transform = `translateX(${Math.max(dx, -THRESHOLD * 1.6)}px)`;
                el.style.transition = 'none';
            }
        }, { passive: true });
        el.addEventListener('touchend', e => {
            const dx = e.changedTouches[0].clientX - startX;
            el.style.transition = 'transform .25s ease';
            if (dragging && dx < -THRESHOLD) {
                el.style.transform = 'translateX(-110%)';
                el.style.opacity = '0';
                setTimeout(onDelete, 250);
            } else {
                el.style.transform = 'translateX(0)';
            }
        });
    }

    _renderTxList() {
        const list = document.getElementById('fin-tx-list');
        if (!list) return;
        const now = new Date();
        let txs = Finance.getMonth(now.getFullYear(), now.getMonth() + 1);
        if (this._txFilter !== 'all') txs = txs.filter(t => t.type === this._txFilter);

        if (!txs.length) {
            list.innerHTML = '<div class="fin-empty">Nenhuma transação encontrada.</div>';
            return;
        }

        list.innerHTML = '';
        txs.forEach(t => {
            const cat = Finance.catInfo(t.cat);
            const isIncome = t.type === 'income';
            const div = document.createElement('div');
            div.className = 'tx-item';
            div.innerHTML = `
                <div class="tx-icon">${cat.icon}</div>
                <div class="tx-body">
                    <div class="tx-desc">${t.desc || cat.name}</div>
                    <div class="tx-meta">${cat.name} · ${t.date || ''}</div>
                </div>
                <div class="tx-amount ${t.type}">${isIncome ? '+' : '-'}${Finance.fmt(t.amount)}</div>`;
            this._setupSwipe(div, () => { Finance.remove(t.id); this.renderFinanceSec(); UI.toast('Removido.', 'ok'); });
            list.appendChild(div);
        });
    }

    _deleteTxPrompt(id) {
        if (!confirm('Excluir esta transação?')) return;
        Finance.remove(id);
        this.renderFinanceSec();
        UI.toast('Removido.', 'ok');
    }

    filterTx(type) {
        this._txFilter = type;
        document.querySelectorAll('.fin-filter').forEach(b => b.classList.remove('active'));
        const id = type === 'all' ? 'ff-all' : type === 'income' ? 'ff-in' : 'ff-out';
        document.getElementById(id)?.classList.add('active');
        this._renderTxList();
    }

    openTxModal() {
        const modal = document.getElementById('tx-modal');
        if (!modal) return;
        this.setTxType('expense');
        const today = new Date().toISOString().slice(0, 10);
        document.getElementById('tx-date').value = today;
        document.getElementById('tx-amount').value = '';
        document.getElementById('tx-desc').value = '';

        const catSel = document.getElementById('tx-cat');
        if (catSel) {
            catSel.innerHTML = FIN_CATS.filter(c => c.type === 'expense').map(c =>
                `<option value="${c.id}">${c.icon} ${c.name}</option>`
            ).join('');
        }
        modal.style.display = 'flex';
    }

    closeTxModal() {
        const modal = document.getElementById('tx-modal');
        if (modal) modal.style.display = 'none';
    }

    setTxType(type) {
        this._txType = type;
        document.getElementById('tt-income')?.classList.toggle('active', type === 'income');
        document.getElementById('tt-expense')?.classList.toggle('active', type === 'expense');
        const catSel = document.getElementById('tx-cat');
        if (catSel) {
            catSel.innerHTML = FIN_CATS.filter(c => c.type === type).map(c =>
                `<option value="${c.id}">${c.icon} ${c.name}</option>`
            ).join('');
        }
    }

    saveTx() {
        const amount = parseFloat(document.getElementById('tx-amount')?.value);
        const desc = document.getElementById('tx-desc')?.value.trim();
        const cat = document.getElementById('tx-cat')?.value;
        const date = document.getElementById('tx-date')?.value;

        if (!amount || amount <= 0) return UI.toast('Informe o valor!', 'err');
        if (!date) return UI.toast('Informe a data!', 'err');

        Finance.add({ type: this._txType, amount, desc, cat, date });
        this.closeTxModal();
        this.renderFinanceSec();
        UI.toast('Transação salva!', 'ok');
    }

    /* ── VAULT ── */
    renderVaultSec() {
        const locked = document.getElementById('vault-locked');
        const open = document.getElementById('vault-open');
        if (Vault.isUnlocked()) {
            if (locked) locked.style.display = 'none';
            if (open) open.style.display = '';
            this._renderVaultList();
        } else {
            if (locked) locked.style.display = 'flex';
            if (open) open.style.display = 'none';
            const lt = document.getElementById('vault-lock-title');
            if (lt) lt.textContent = Vault.isSetup() ? 'COFRE TRANCADO' : 'CONFIGURAR COFRE';
            const ls = document.getElementById('vault-lock-sub');
            if (ls) ls.textContent = Vault.isSetup() ? 'Digite a senha para abrir' : 'AES-256-GCM · proteção local';
        }
    }

    async vaultUnlock() {
        const pass = document.getElementById('vault-pass')?.value;
        if (!pass) return UI.toast('Digite a senha!', 'err');
        UI.toast('Verificando...', 'ok');
        const ok = await Vault.unlock(pass);
        if (ok) {
            document.getElementById('vault-pass').value = '';
            this.renderVaultSec();
            UI.toast('Cofre aberto! 🔓', 'ok');
        } else {
            UI.toast('Senha incorreta!', 'err');
        }
    }

    vaultLock() {
        Vault.lock();
        this.renderVaultSec();
        UI.toast('Cofre trancado 🔐', 'ok');
    }

    async _renderVaultList() {
        const list = document.getElementById('vault-entries-list');
        if (!list) return;
        const entries = await Vault.getEntries();
        if (!entries || !entries.length) {
            list.innerHTML = '<div class="fin-empty" style="padding:24px">Nenhum acesso salvo. Toque + para adicionar.</div>';
            return;
        }
        list.innerHTML = entries.map(e => `
            <div class="vlt-item" onclick="orbit.openVaultEntryModal('${e.id}')">
                <div class="vlt-icon">${(e.site || '?').slice(0,2)}</div>
                <div class="vlt-body">
                    <div class="vlt-site">${e.site || ''}</div>
                    <div class="vlt-user">${e.user || ''}</div>
                </div>
                <button class="vlt-reveal" onclick="event.stopPropagation();orbit._revealPass('${e.id}',this)">Ver</button>
            </div>
        `).join('');
    }

    async _revealPass(id, btn) {
        const entries = await Vault.getEntries();
        const e = entries?.find(x => x.id === id);
        if (!e) return;
        if (btn.textContent === 'Ver') {
            btn.textContent = e.pass || '—';
            setTimeout(() => { btn.textContent = 'Ver'; }, 5000);
        } else {
            navigator.clipboard.writeText(e.pass || '').then(() => UI.toast('Copiado!', 'ok'));
        }
    }

    openVaultEntryModal(id) {
        const modal = document.getElementById('vault-modal');
        if (!modal) return;
        this._editingVltId = id || null;

        document.getElementById('vlt-site').value = '';
        document.getElementById('vlt-user').value = '';
        document.getElementById('vlt-pass').value = '';
        document.getElementById('vlt-notes').value = '';
        document.getElementById('vault-modal-title').textContent = id ? 'EDITAR ACESSO' : 'NOVO ACESSO';
        document.getElementById('vlt-del-btn').style.display = id ? '' : 'none';

        if (id) {
            Vault.getEntries().then(entries => {
                const e = entries?.find(x => x.id === id);
                if (e) {
                    document.getElementById('vlt-site').value = e.site || '';
                    document.getElementById('vlt-user').value = e.user || '';
                    document.getElementById('vlt-pass').value = e.pass || '';
                    document.getElementById('vlt-notes').value = e.notes || '';
                }
            });
        }

        modal.style.display = 'flex';
    }

    closeVaultModal() {
        const modal = document.getElementById('vault-modal');
        if (modal) modal.style.display = 'none';
        this._editingVltId = null;
    }

    genVaultPass() {
        const pass = Vault.genPassword(16);
        const inp = document.getElementById('vlt-pass');
        if (inp) inp.value = pass;
    }

    async saveVaultEntry() {
        const site = document.getElementById('vlt-site')?.value.trim();
        const user = document.getElementById('vlt-user')?.value.trim();
        const pass = document.getElementById('vlt-pass')?.value;
        const notes = document.getElementById('vlt-notes')?.value.trim();

        if (!site) return UI.toast('Informe o site/app!', 'err');

        if (this._editingVltId) {
            await Vault.update(this._editingVltId, { site, user, pass, notes });
            UI.toast('Atualizado!', 'ok');
        } else {
            await Vault.add({ site, user, pass, notes });
            UI.toast('Acesso salvo! 🔐', 'ok');
        }

        this.closeVaultModal();
        this._renderVaultList();
    }

    async deleteVaultEntry() {
        if (!this._editingVltId || !confirm('Excluir este acesso?')) return;
        await Vault.remove(this._editingVltId);
        UI.toast('Removido.', 'ok');
        this.closeVaultModal();
        this._renderVaultList();
    }

    /* ═══════════════════════════════════════════════
       ACADEMIA TAB
       ═══════════════════════════════════════════════ */
    renderAcademiaTab() {
        this._loadCardQueue();
        this._renderCardUI();
    }

    switchAcad(sec) {
        document.querySelectorAll('#tab-academia .mod-stab').forEach(b => b.classList.remove('active'));
        document.getElementById(`stab-${sec}`)?.classList.add('active');
        ['cards','ufpi','pomo'].forEach(s => {
            const el = document.getElementById(`acad-${s}`);
            if (el) el.style.display = s === sec ? '' : 'none';
        });
        if (sec === 'cards') this._renderCardUI();
        else if (sec === 'ufpi') this.renderUFPI();
        else if (sec === 'pomo') this.renderPomo();
    }

    _loadCardQueue() {
        const all = Flashcards.get();
        this._cardQueue = all.filter(c => c.box === 1).concat(
            all.filter(c => c.box === 2),
            all.filter(c => c.box === 3),
            all.filter(c => c.box === 4),
            all.filter(c => c.box === 5)
        ).slice(0, 20);
        this._cardFlipped = false;
    }

    _renderCardUI() {
        const counter = document.getElementById('card-count');
        const wrap = document.getElementById('card-wrap');
        const frontText = document.getElementById('card-front-text');
        const backText = document.getElementById('card-back-text');
        const actions = document.getElementById('card-actions');
        const hint = document.getElementById('card-flip-hint');

        if (!this._cardQueue.length) {
            if (counter) counter.textContent = 'Sem cards para revisar';
            if (frontText) frontText.textContent = 'Sem cards para revisar.\n\nAdicione novos cards abaixo.';
            if (backText) backText.textContent = '';
            if (actions) actions.style.display = 'none';
            if (hint) hint.style.display = 'none';
            if (wrap) wrap.classList.remove('flipped');
            return;
        }

        const card = this._cardQueue[0];
        if (counter) counter.textContent = `${this._cardQueue.length} CARDS PARA REVISAR`;
        if (frontText) frontText.textContent = card.f;
        if (backText) backText.textContent = card.b;
        if (actions) actions.style.display = 'none';
        if (hint) hint.style.display = 'flex';
        if (wrap) wrap.classList.remove('flipped');
        this._cardFlipped = false;
    }

    flipCard() {
        const wrap = document.getElementById('card-wrap');
        if (!wrap || !this._cardQueue.length) return;
        this._cardFlipped = !this._cardFlipped;
        wrap.classList.toggle('flipped', this._cardFlipped);

        const actions = document.getElementById('card-actions');
        const hint = document.getElementById('card-flip-hint');
        if (this._cardFlipped) {
            if (actions) actions.style.display = 'flex';
            if (hint) hint.style.display = 'none';
        }
    }

    rateCard(knew) {
        if (!this._cardQueue.length) return;
        const card = this._cardQueue[0];
        Flashcards.updateBox(card.id, knew);
        this._cardQueue.shift();
        this._renderCardUI();
        if (navigator.vibrate) navigator.vibrate(20);
    }

    addCard() {
        const f = document.getElementById('card-front-inp')?.value.trim();
        const b = document.getElementById('card-back-inp')?.value.trim();
        if (!f || !b) return UI.toast('Preencha frente e verso!', 'err');
        Flashcards.add([{ f, b }]);
        document.getElementById('card-front-inp').value = '';
        document.getElementById('card-back-inp').value = '';
        this._loadCardQueue();
        this._renderCardUI();
        UI.toast('Card adicionado!', 'ok');
    }

    renderUFPI() {
        const grades = Grades.sync();
        const cr = Grades.calcCR(grades);

        const crBar = document.getElementById('cr-bar');
        if (crBar) {
            crBar.innerHTML = `<div>
                <div class="cr-val">${cr !== null ? cr : '--'}</div>
                <div class="cr-label">Coeficiente de Rendimento</div>
            </div>`;
        }

        const list = document.getElementById('ufpi-grade-list');
        if (!list) return;

        if (!grades.length) {
            list.innerHTML = '<div style="padding:16px;color:var(--fg-4);font-size:13px">Adicione disciplinas nas configurações.</div>';
            return;
        }

        list.innerHTML = grades.map(g => {
            const media = Grades.calcMedia(g.notas);
            const status = Grades.statusFor(media, g.faltas, g.cargaHoraria);
            const statusMap = {
                aprovado: ['APROVADO', 'aprovado'], final: ['PROVA FINAL', 'final'],
                reprovado: ['REPROVADO', 'reprovado'], reprovado_faltas: ['REP. FALTAS', 'reprovado'],
                cursando: ['EM CURSO', 'cursando']
            };
            const [sLabel, sCls] = statusMap[status] || ['—', 'cursando'];
            const maxFaltas = Math.floor((g.cargaHoraria || 60) * 0.25);

            return `<div class="ufpi-disc">
                <div class="ufpi-disc-top">
                    <div class="ufpi-disc-name">${g.name}</div>
                    <span class="ufpi-status ufpi-${sCls}">${sLabel}</span>
                </div>
                <div class="ufpi-disc-row">
                    ${[0,1].map(i => `<input class="ufpi-nota" type="number" min="0" max="10" step="0.1" placeholder="N${i+1}" value="${g.notas[i] !== null ? g.notas[i] : ''}" onchange="orbit.updateNota('${g.discId}',${i},this.value)">`).join('')}
                    <div class="ufpi-faltas-ctrl">
                        <button class="ufpi-falta-btn" onclick="orbit.changeFaltas('${g.discId}',-1)">−</button>
                        <div>
                            <div class="ufpi-faltas-num ${g.faltas > maxFaltas ? 'danger-color' : ''}">${g.faltas}</div>
                            <div class="ufpi-faltas-label">faltas/${maxFaltas}</div>
                        </div>
                        <button class="ufpi-falta-btn" onclick="orbit.changeFaltas('${g.discId}',1)">+</button>
                    </div>
                </div>
            </div>`;
        }).join('');
    }

    updateNota(discId, idx, value) {
        const grades = Grades.get();
        const g = grades.find(x => x.discId === discId);
        if (!g) return;
        g.notas[idx] = value === '' ? null : parseFloat(value);
        Grades.save(grades);
        this.renderUFPI();
    }

    changeFaltas(discId, delta) {
        const grades = Grades.get();
        const g = grades.find(x => x.discId === discId);
        if (!g) return;
        g.faltas = Math.max(0, (g.faltas || 0) + delta);
        Grades.save(grades);
        this.renderUFPI();
    }

    addDiscFull() {
        const n = document.getElementById('ufpi-name-inp')?.value.trim();
        const p = document.getElementById('ufpi-prof-inp')?.value.trim() || '';
        if (!n) return UI.toast('Preencha o nome!', 'err');
        University.add(n, p, '', []);
        document.getElementById('ufpi-name-inp').value = '';
        document.getElementById('ufpi-prof-inp').value = '';
        this.renderUFPI();
        UI.toast('Disciplina adicionada!', 'ok');
    }

    renderPomo() {
        this._updatePomoDisplay();
        const dotsEl = document.getElementById('pomo-sessions');
        if (dotsEl) {
            dotsEl.innerHTML = Array.from({ length: this._pomoSessions }, () =>
                '<div class="pomo-session-dot"></div>'
            ).join('');
        }
    }

    _updatePomoDisplay() {
        const el = document.getElementById('pomo-time');
        if (el) el.textContent = Pomodoro.format();
        const bar = document.getElementById('pomo-bar');
        const s = Pomodoro.state;
        if (bar) bar.style.width = `${(s.elapsed / s.total) * 100}%`;
    }

    setPomoProfile(work, brk) {
        this._pomoWorkMin = work;
        this._pomoBreakMin = brk;
        Pomodoro.reset('work');
        Pomodoro.state.total = work * 60;
        Pomodoro.state.elapsed = 0;
        ['pp-1','pp-2','pp-3'].forEach(id => document.getElementById(id)?.classList.remove('active'));
        const map = { '25/5': 'pp-1', '50/10': 'pp-2', '90/20': 'pp-3' };
        const key = `${work}/${brk}`;
        document.getElementById(map[key])?.classList.add('active');
        const label = document.getElementById('pomo-mode-label');
        if (label) label.textContent = 'TRABALHO';
        const btn = document.getElementById('pomo-btn');
        if (btn) btn.textContent = 'INICIAR';
        this._updatePomoDisplay();
    }

    pomoToggle() {
        if (Pomodoro.state.running) {
            Pomodoro.stop();
            this.releaseWakeLock();
            const btn = document.getElementById('pomo-btn');
            if (btn) btn.textContent = 'INICIAR';
        } else {
            Pomodoro.start(
                () => this._updatePomoDisplay(),
                () => {
                    const s = Pomodoro.state;
                    if (s.mode === 'work') {
                        this._pomoSessions++;
                        UI.toast(`🍅 Pomodoro ${this._pomoSessions} completo!`, 'ok');
                        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
                        Pomodoro.reset('short');
                        Pomodoro.state.total = this._pomoBreakMin * 60;
                        const lbl = document.getElementById('pomo-mode-label');
                        if (lbl) lbl.textContent = 'PAUSA';
                        const btn = document.getElementById('pomo-btn');
                        if (btn) btn.textContent = 'INICIAR PAUSA';
                        this.renderPomo();
                    } else {
                        Pomodoro.reset('work');
                        Pomodoro.state.total = this._pomoWorkMin * 60;
                        const lbl = document.getElementById('pomo-mode-label');
                        if (lbl) lbl.textContent = 'TRABALHO';
                        const btn = document.getElementById('pomo-btn');
                        if (btn) btn.textContent = 'INICIAR';
                        this._updatePomoDisplay();
                        this.releaseWakeLock();
                    }
                }
            );
            this.requestWakeLock();
            const btn = document.getElementById('pomo-btn');
            if (btn) btn.textContent = 'PAUSAR';
        }
    }

    pomoReset() {
        Pomodoro.reset('work');
        Pomodoro.state.total = this._pomoWorkMin * 60;
        this.releaseWakeLock();
        const el = document.getElementById('pomo-time');
        if (el) el.textContent = `${String(this._pomoWorkMin).padStart(2,'0')}:00`;
        const bar = document.getElementById('pomo-bar');
        if (bar) bar.style.width = '0%';
        const btn = document.getElementById('pomo-btn');
        if (btn) btn.textContent = 'INICIAR';
        const lbl = document.getElementById('pomo-mode-label');
        if (lbl) lbl.textContent = 'TRABALHO';
    }

    /* ═══════════════════════════════════════════════
       HUB TAB
       ═══════════════════════════════════════════════ */
    renderHubTab() {
        this.renderHubKanban();
    }

    switchHub(sec) {
        this._currentHubSec = sec;
        document.querySelectorAll('#tab-hub .mod-stab').forEach(b => b.classList.remove('active'));
        document.getElementById(`stab-${sec}`)?.classList.add('active');

        const sections = ['kanban','habitos','tools','nupi','fe','esportes'];
        sections.forEach(s => {
            const el = document.getElementById(`hub-${s}`);
            if (el) el.style.display = s === sec ? '' : 'none';
        });

        if (sec === 'kanban') this.renderHubKanban();
        else if (sec === 'habitos') this.renderHubHabitos();
        else if (sec === 'tools') this.renderHubTools();
        else if (sec === 'nupi') this.renderHubNupi();
        else if (sec === 'fe') this.renderHubFe();
        else if (sec === 'esportes') this.renderHubEsportes();
    }

    renderHubNupi() {
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        const STATUS_COLORS = { ativo: 'nupi-status-ativo', pausado: 'nupi-status-pausado', concluido: 'nupi-status-concluido' };

        const projList = document.getElementById('nupi-proj-list');
        if (projList) {
            projList.innerHTML = !nupi.projects.length
                ? '<div class="fin-empty" style="padding:8px 0">Nenhum projeto cadastrado.</div>'
                : nupi.projects.map(p => `
                    <div class="nupi-proj-item">
                        <span class="nupi-proj-name">${p.name}</span>
                        <button class="nupi-proj-status ${STATUS_COLORS[p.status] || 'nupi-status-ativo'}" onclick="orbit.cycleNupiStatus('${p.id}')">${p.status}</button>
                        <button class="nupi-proj-del" onclick="orbit.delNupiProject('${p.id}')">×</button>
                    </div>`).join('');
        }

        const taskList = document.getElementById('nupi-tasks-list');
        if (taskList) {
            taskList.innerHTML = !nupi.tasks.length
                ? '<div class="fin-empty" style="padding:8px 0">Nenhuma demanda pendente.</div>'
                : nupi.tasks.map(t => `
                    <div class="nupi-task-item">
                        <div class="nupi-task-check ${t.done ? 'done' : ''}" onclick="orbit.toggleNupiTask('${t.id}')">${t.done ? '✓' : ''}</div>
                        <span class="nupi-task-text ${t.done ? 'done' : ''}">${t.text}</span>
                        <button class="nupi-task-del" onclick="orbit.delNupiTask('${t.id}')">×</button>
                    </div>`).join('');
        }

        const meetCard = document.getElementById('nupi-meeting-card');
        if (meetCard) {
            const today = new Date().toISOString().slice(0, 10);
            const events = Agenda.getForDate(today).filter(e => e.cat === 'nupi');
            meetCard.innerHTML = events.length
                ? events.map(e => `<div class="f1-next-name">${e.title}</div><div class="f1-next-circuit">${e.time || 'Dia todo'}</div>`).join('')
                : '<div style="font-size:13px;color:var(--fg-4)">Nenhuma reunião agendada hoje.</div>';
        }
    }

    addNupiProject() {
        const inp = document.getElementById('nupi-proj-inp');
        if (!inp?.value.trim()) return UI.toast('Informe o nome!', 'err');
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        nupi.projects.push({ id: Date.now().toString(), name: inp.value.trim(), status: 'ativo' });
        Store.set('orbit_nupi', nupi);
        inp.value = '';
        this.renderHubNupi();
        UI.toast('Projeto adicionado!', 'ok');
    }

    delNupiProject(id) {
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        nupi.projects = nupi.projects.filter(p => p.id !== id);
        Store.set('orbit_nupi', nupi);
        this.renderHubNupi();
    }

    cycleNupiStatus(id) {
        const statuses = ['ativo', 'pausado', 'concluido'];
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        const proj = nupi.projects.find(p => p.id === id);
        if (!proj) return;
        proj.status = statuses[(statuses.indexOf(proj.status) + 1) % statuses.length];
        Store.set('orbit_nupi', nupi);
        this.renderHubNupi();
    }

    addNupiTask() {
        const inp = document.getElementById('nupi-task-inp');
        if (!inp?.value.trim()) return UI.toast('Escreva a demanda!', 'err');
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        nupi.tasks.push({ id: Date.now().toString(), text: inp.value.trim(), done: false });
        Store.set('orbit_nupi', nupi);
        inp.value = '';
        this.renderHubNupi();
        UI.toast('Demanda adicionada!', 'ok');
    }

    toggleNupiTask(id) {
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        const task = nupi.tasks.find(t => t.id === id);
        if (task) { task.done = !task.done; if (navigator.vibrate) navigator.vibrate(30); }
        Store.set('orbit_nupi', nupi);
        this.renderHubNupi();
    }

    delNupiTask(id) {
        const nupi = Store.get('orbit_nupi', { projects: [], tasks: [] });
        nupi.tasks = nupi.tasks.filter(t => t.id !== id);
        Store.set('orbit_nupi', nupi);
        this.renderHubNupi();
    }

    renderHubKanban() {
        const board = document.getElementById('kanban-board');
        if (!board) return;
        const kb = Kanban.get();
        const cols = [
            { key: 'todo', label: 'FAZER', color: 'var(--fg-4)' },
            { key: 'doing', label: 'FAZENDO', color: 'var(--gold)' },
            { key: 'done', label: 'FEITO', color: 'var(--ok)' }
        ];
        const next = { todo: 'doing', doing: 'done', done: 'todo' };

        board.innerHTML = cols.map(col => {
            const cards = kb[col.key] || [];
            return `<div class="kanban-col">
                <div class="kanban-col-hdr">
                    <div class="kanban-col-label" style="color:${col.color}">${col.label}</div>
                    <div class="kanban-count">${cards.length}</div>
                </div>
                <div class="kanban-cards">
                    ${cards.map(c => `
                        <div class="kanban-card" onclick="orbit.moveTask('${c.id}','${col.key}')">
                            <span class="kanban-card-text">${c.text}</span>
                            <button class="kanban-card-del" onclick="event.stopPropagation();orbit.deleteKanbanCard('${c.id}','${col.key}')">×</button>
                        </div>
                    `).join('')}
                </div>
                <div class="kanban-add">
                    <input type="text" id="ki-${col.key}" placeholder="Nova tarefa..." onkeydown="if(event.key==='Enter')orbit.addTask('${col.key}')">
                </div>
            </div>`;
        }).join('');
    }

    deleteKanbanCard(id, col) {
        Kanban.remove(id, col);
        this.renderHubKanban();
    }

    renderHubHabitos() {
        const habits = Habits.getAll();
        const list = document.getElementById('hab-list');
        if (!list) return;

        const today = new Date().toISOString().slice(0, 10);

        if (!habits.length) {
            list.innerHTML = '<div style="padding:16px;color:var(--fg-4);font-size:13px">Nenhum hábito cadastrado ainda.</div>';
        } else {
            list.innerHTML = habits.map(h => {
                const done = (h.done || []).includes(today);
                const streak = Habits.getStreak(h);
                const last30 = Habits.getLast30(h);
                return `<div class="hab-item">
                    <div class="hab-item-top">
                        <span class="hab-icon">${h.icon}</span>
                        <span class="hab-name">${h.name}</span>
                        <span class="hab-streak">🔥 ${streak}</span>
                        <button class="hab-del" onclick="orbit.deleteHabit('${h.id}')">×</button>
                    </div>
                    <div class="hab-heatmap">
                        ${last30.map(day => `<div class="hab-heatmap-cell ${day.done ? 'done' : ''}" title="${day.date}"></div>`).join('')}
                    </div>
                    <button class="hab-toggle-btn ${done ? 'done' : ''}" onclick="orbit.toggleHabit('${h.id}')">
                        ${done ? '✓ Concluído hoje' : 'Marcar como feito'}
                    </button>
                </div>`;
            }).join('');
        }

        const ideasList = document.getElementById('ideas-list');
        if (ideasList && document.getElementById('hub-tools')?.style.display === '') {
            this._renderIdeasList();
        }
    }

    addHabit() {
        const icon = document.getElementById('hab-icon-inp')?.value.trim() || '●';
        const name = document.getElementById('hab-name-inp')?.value.trim();
        if (!name) return UI.toast('Informe o nome!', 'err');
        Habits.add(name, icon);
        document.getElementById('hab-icon-inp').value = '';
        document.getElementById('hab-name-inp').value = '';
        this.renderHubHabitos();
        UI.toast('Hábito adicionado!', 'ok');
    }

    deleteHabit(id) {
        Habits.remove(id);
        this.renderHubHabitos();
        this.renderHabitsCard();
        UI.toast('Removido.', 'ok');
    }

    renderHubTools() {
        this._renderIdeasList();
    }

    _renderIdeasList() {
        const list = document.getElementById('ideas-list');
        if (!list) return;
        const ideas = IdeaVault.get().reverse();
        list.innerHTML = ideas.map(i =>
            `<div class="idea-item-hub">
                <span style="flex:1">${i.text}</span>
                <button class="idea-del" onclick="orbit.deleteIdea('${i.id}')">×</button>
            </div>`
        ).join('') || '<div style="color:var(--fg-4);font-size:12px;padding:4px 0">Sem ideias ainda.</div>';
    }

    addIdeaFromHub() {
        const inp = document.getElementById('idea-inp');
        if (!inp?.value.trim()) return UI.toast('Escreva a ideia!', 'err');
        IdeaVault.add(inp.value.trim());
        inp.value = '';
        this._renderIdeasList();
        UI.toast('Ideia salva! 💡', 'ok');
    }

    deleteIdea(id) {
        IdeaVault.remove(id);
        this._renderIdeasList();
    }

    renderHubFe() {
        const v = Faith.getVerseOfDay();
        const banner = document.getElementById('fe-verse-banner');
        if (banner && v) {
            banner.innerHTML = `<div class="fe-verse-banner-ref">${v.r}</div>
                <div class="fe-verse-banner-text">"${v.t}"</div>`;
        }

        const streak = Faith.getStreak();
        const el = document.getElementById('fe-streak');
        if (el) el.textContent = streak;

        this.switchFeTab('journal');
    }

    switchFeTab(tab) {
        this._currentFeSec = tab;
        document.querySelectorAll('.fe-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`ft-${tab}`)?.classList.add('active');

        ['journal','prayer','plan','verses'].forEach(s => {
            const el = document.getElementById(`fe-${s}-sec`);
            if (el) el.style.display = s === tab ? '' : 'none';
        });

        if (tab === 'journal') this._renderFaithJournal();
        else if (tab === 'prayer') this._renderFaithPrayer();
        else if (tab === 'plan') this._renderFaithPlan();
        else if (tab === 'verses') this._renderFaithVerses();
    }

    _renderFaithJournal() {
        const list = document.getElementById('fe-journal-list');
        if (!list) return;
        const journal = Faith.getJournal();
        list.innerHTML = journal.slice(0, 10).map(j =>
            `<div class="fe-journal-item">
                <div class="fe-item-meta">${j.date}</div>
                <div class="fe-item-text">${j.text}</div>
            </div>`
        ).join('') || '<div style="padding:8px;color:var(--fg-4);font-size:13px">Nenhum registro ainda.</div>';
    }

    _renderFaithPrayer() {
        const list = document.getElementById('fe-prayer-list');
        if (!list) return;
        const prayers = Faith.getPrayers();
        list.innerHTML = prayers.slice(0, 20).map(p =>
            `<div class="fe-prayer-item ${p.answered ? 'fe-prayer-answered' : ''}">
                <div class="fe-item-meta">
                    <span class="fe-prayer-type fe-prayer-${p.type}">${ACTS_PRAYERS[p.type]?.label || p.type}</span>
                    ${p.date}
                    <button class="fe-prayer-check" onclick="orbit.togglePrayer('${p.id}')" title="Marcar como respondida">${p.answered ? '✓' : ''}</button>
                    <button class="fe-prayer-del" onclick="orbit.deletePrayer('${p.id}')">×</button>
                </div>
                <div class="fe-item-text">${p.text}</div>
            </div>`
        ).join('') || '<div style="padding:8px;color:var(--fg-4);font-size:13px">Nenhuma oração registrada.</div>';
    }

    addPrayer(type) {
        const prompt = ACTS_PRAYERS[type]?.prompt || '';
        const inp = document.getElementById('fe-prayer-inp');
        const sel = document.getElementById('fe-prayer-type');
        if (inp) inp.value = prompt;
        if (sel) sel.value = type;
        inp?.focus();
    }

    savePrayer() {
        const type = document.getElementById('fe-prayer-type')?.value;
        const text = document.getElementById('fe-prayer-inp')?.value.trim();
        if (!text) return UI.toast('Escreva sua oração!', 'err');
        Faith.addPrayer(type || 'S', text);
        document.getElementById('fe-prayer-inp').value = '';
        this._renderFaithPrayer();
        UI.toast('Oração registrada! 🙏', 'ok');
    }

    togglePrayer(id) {
        Faith.togglePrayerAnswered(id);
        this._renderFaithPrayer();
    }

    deletePrayer(id) {
        Faith.removePrayer(id);
        this._renderFaithPrayer();
    }

    _renderFaithPlan() {
        const plan = Faith.getReadingPlan();
        const progress = Faith.getReadingProgress();
        const list = document.getElementById('fe-reading-list');
        const streak = Faith.getStreak();
        const streakEl = document.getElementById('fe-streak');
        if (streakEl) streakEl.textContent = streak;

        if (!list) return;
        list.innerHTML = plan.map((item, idx) => {
            const isRead = progress.includes(idx);
            return `<div class="fe-plan-item ${isRead ? 'read' : ''}" onclick="orbit.markRead(${idx})">
                <div class="fe-plan-check">${isRead ? '✓' : ''}</div>
                <div class="fe-plan-body">
                    <div class="fe-plan-ref">${item.ref}</div>
                    <div class="fe-plan-topic">${item.topic}</div>
                </div>
            </div>`;
        }).join('');
    }

    markRead(idx) {
        Faith.markRead(idx);
        this._renderFaithPlan();
        UI.toast('Leitura marcada! 📖', 'ok');
    }

    _renderFaithVerses() {
        const list = document.getElementById('fe-verses-list');
        if (!list) return;
        list.innerHTML = VERSES.map(v =>
            `<div class="fe-verse-item">
                <div class="fe-verse-ref">${v.r}</div>
                <div class="fe-verse-text">"${v.t}"</div>
            </div>`
        ).join('');
    }

    addFaithJournal() {
        const el = document.getElementById('fe-journal-inp');
        if (!el?.value.trim()) return UI.toast('Escreva algo!', 'err');
        Faith.addJournal(el.value.trim());
        el.value = '';
        this._renderFaithJournal();
        UI.toast('Registrado! 🙏', 'ok');
    }

    async renderHubEsportes() {
        const f1Next = document.getElementById('f1-next-card');
        const f1Stand = document.getElementById('f1-standings');
        const flaCard = document.getElementById('fla-card');
        const ps5List = document.getElementById('ps5-list');

        if (f1Next) f1Next.innerHTML = '<div style="color:var(--fg-4);font-size:13px">Carregando F1...</div>';
        if (f1Stand) f1Stand.innerHTML = '';

        const [race, standings, fla] = await Promise.all([
            Entertainment.getF1NextRace(),
            Entertainment.getF1Standings(),
            Entertainment.getFlamengoNext()
        ]);

        if (f1Next) {
            if (race) {
                const { fmtDate, fmtTime, diff } = Entertainment.formatRaceDate(race.date, race.time);
                f1Next.innerHTML = `
                    <div class="f1-next-name">${race.name}</div>
                    <div class="f1-next-circuit">${race.circuit} · ${race.country || ''}</div>
                    <div class="f1-countdown">${diff > 0 ? `em ${diff} dias` : diff === 0 ? 'HOJE!' : 'Em andamento'}</div>
                    <div class="f1-countdown-label">${fmtDate} · ${fmtTime} (Fortaleza)</div>`;
            } else {
                f1Next.innerHTML = '<div style="color:var(--fg-4);font-size:13px">Sem dados de corrida. Sem conexão?</div>';
            }
        }

        if (f1Stand) {
            if (standings.length) {
                f1Stand.innerHTML = standings.map(s => `
                    <div class="f1-row">
                        <div class="f1-pos">${s.pos}</div>
                        <div class="f1-name">${s.name}</div>
                        <div class="f1-team">${s.team}</div>
                        <div class="f1-pts">${s.pts}pts</div>
                    </div>`).join('');
            } else {
                f1Stand.innerHTML = '<div style="padding:12px;color:var(--fg-4);font-size:13px">Dados indisponíveis.</div>';
            }
        }

        if (flaCard) {
            if (fla) {
                const gameDate = fla.dateEvent ? new Date(fla.dateEvent).toLocaleDateString('pt-BR', { day:'2-digit', month:'short' }) : '';
                flaCard.innerHTML = `
                    <div class="fla-match">
                        <div class="fla-teams">${fla.strHomeTeam} × ${fla.strAwayTeam}</div>
                        <div class="fla-info">${fla.strLeague || ''} · ${gameDate}</div>
                    </div>`;
            } else {
                flaCard.innerHTML = '<div style="color:var(--fg-4);font-size:13px">Próximo jogo não disponível.</div>';
            }
        }

        if (ps5List) this._renderPS5();
    }

    _renderPS5() {
        const list = document.getElementById('ps5-list');
        if (!list) return;
        const games = Entertainment.getPS5Games();
        const statusCycle = { jogando: 'zerado', zerado: 'platinado', platinado: 'wishlist', wishlist: 'jogando' };

        list.innerHTML = games.map(g => `
            <div class="ps5-item">
                <div class="ps5-cover">${g.cover}</div>
                <div class="ps5-title">${g.title}</div>
                <span class="ps5-status ps5-${g.status}" onclick="orbit.cyclePS5('${g.id}')">${g.status}</span>
                <button class="ps5-del" onclick="orbit.removePS5('${g.id}')">×</button>
            </div>`
        ).join('');
    }

    cyclePS5(id) {
        const games = Entertainment.getPS5Games();
        const g = games.find(x => x.id === id);
        if (!g) return;
        const statusCycle = { jogando: 'zerado', zerado: 'platinado', platinado: 'wishlist', wishlist: 'jogando' };
        Entertainment.setPS5Status(id, statusCycle[g.status] || 'wishlist');
        this._renderPS5();
    }

    removePS5(id) {
        Entertainment.removePS5Game(id);
        this._renderPS5();
    }

    addPS5Game() {
        const cover = document.getElementById('ps5-icon-inp')?.value.trim() || '🎮';
        const title = document.getElementById('ps5-title-inp')?.value.trim();
        if (!title) return UI.toast('Informe o título!', 'err');
        Entertainment.addPS5Game(title, cover, 'wishlist');
        document.getElementById('ps5-icon-inp').value = '';
        document.getElementById('ps5-title-inp').value = '';
        this._renderPS5();
        UI.toast('Jogo adicionado!', 'ok');
    }

    /* ═══════════════════════════════════════════════
       TOOLS HUB
       ═══════════════════════════════════════════════ */
    runCalc() {
        const val = document.getElementById('calc-inp')?.value;
        if (val) document.getElementById('calc-res').textContent = Calculator.run(val);
    }

    runConv() {
        const val = parseFloat(document.getElementById('conv-val')?.value);
        const from = document.getElementById('conv-from')?.value.trim().toLowerCase();
        const to = document.getElementById('conv-to')?.value.trim().toLowerCase();
        if (!val || !from || !to) return UI.toast('Preencha todos os campos!', 'err');
        const result = Converter.convert(val, from, to);
        const el = document.getElementById('conv-res');
        if (el) el.textContent = typeof result === 'number' ? `${val} ${from} = ${+result.toFixed(6)} ${to}` : result;
    }

    genPass() {
        const len = parseInt(document.getElementById('pass-len')?.value || '16');
        const pass = Vault.genPassword(len);
        const el = document.getElementById('pass-res');
        if (el) el.textContent = pass;
    }

    copyToolResult(id) {
        const el = document.getElementById(id);
        const txt = el?.textContent || '';
        if (txt === '—' || !txt) return;
        navigator.clipboard.writeText(txt).then(() => UI.toast('Copiado!', 'ok'));
    }

    jsonToCsv() {
        const inp = document.getElementById('data-inp')?.value.trim();
        const res = document.getElementById('data-res');
        if (!inp || !res) return;
        try {
            const json = DataTools.validateJSON(inp);
            res.textContent = DataTools.jsonToCsv(json);
            UI.toast('Convertido!', 'ok');
        } catch (e) { UI.toast('JSON inválido!', 'err'); res.textContent = e.message; }
    }

    csvToJson() {
        const inp = document.getElementById('data-inp')?.value.trim();
        const res = document.getElementById('data-res');
        if (!inp || !res) return;
        try {
            const json = DataTools.csvToJson(inp);
            res.textContent = JSON.stringify(json, null, 2);
            UI.toast('Convertido!', 'ok');
        } catch (e) { UI.toast('CSV inválido!', 'err'); res.textContent = e.message; }
    }

    /* ═══════════════════════════════════════════════
       CHAT
       ═══════════════════════════════════════════════ */
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
                    UI.addMsg(m.role === 'user' ? 'user' : 'sophy', m.content || '', false, null);
                }
            });
            const msgs = document.getElementById('msgs');
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }
        UI.setStatus('online');

        const today = AI.nowBR().toISOString().slice(0, 10);
        if (localStorage.getItem('orbit_daily_q') !== today) {
            localStorage.setItem('orbit_daily_q', today);
            setTimeout(() => this._askDailyQuestion(), 1800);
        }
    }

    async _askDailyQuestion() {
        if (this.busy) return;
        const questions = [
            'Como está o coração do Pai hoje?',
            'Qual é a maior prioridade de hoje para o Senhor?',
            'Tem algo pesando que o Senhor queira falar?',
            'O que está te animando ultimamente?',
            'O Senhor dormiu bem? Como está a energia hoje?',
            'Qual o maior desafio dessa semana até agora?',
            'Em que posso ajudar o Senhor hoje, Pai?'
        ];
        const q = questions[Math.floor(Math.random() * questions.length)];
        UI.addMsg('sophy', q, false);
    }

    async handleSend() {
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        const text = inp.value.trim();
        if (!text && !this.pendingImage) return;

        if (text === '/esquece') {
            Store.set('orbit_msgs', []);
            document.getElementById('msgs').innerHTML = '';
            document.getElementById('empty').style.display = 'flex';
            UI.toast('Sessão limpa.', 'ok');
            inp.value = '';
            return;
        }
        if (text.startsWith('!ideia ')) {
            IdeaVault.add(text.slice(7));
            UI.toast('Ideia salva! 💡', 'ok');
            inp.value = '';
            return;
        }

        if (/\b(guarda|salva|anota|registra)\s+(isso|aquilo|esse|essa|aquele|aquela)\b/i.test(text)) {
            const rows = [...document.querySelectorAll('.msg-row.sophy')];
            const lastRow = rows[rows.length - 1];
            const txt = lastRow?.querySelector('.m-content')?.innerText?.trim();
            if (txt) {
                const ep = Store.getEp();
                ep.push({ d: AI.dateStrBR(), s: txt.slice(0, 250) });
                Store.saveEp(ep);
                UI.addMsg('sophy', 'Guardado na memória! 🧠', false);
            } else {
                UI.toast('Nenhuma mensagem para guardar.', 'err');
            }
            inp.value = '';
            return;
        }

        const cfg = Store.getCfg();
        if (!cfg.apiKey && !cfg.groqKey) {
            UI.toast('Configure a API Key em Configurações → IA', 'err');
            return;
        }

        this.busy = true;
        this.hideCmdPalette();
        this.fullResponse = '';

        const cancelBtn = document.getElementById('cancel-btn');
        const sendBtn = document.getElementById('sendbtn');
        if (cancelBtn) cancelBtn.style.display = '';
        if (sendBtn) sendBtn.style.display = 'none';

        UI.addMsg('user', text, false, this.pendingImage);
        inp.value = '';
        inp.style.height = 'auto';

        const history = Store.get('orbit_msgs', []);
        const userMsg = { role: 'user', content: text };
        if (this.pendingImage) userMsg.image = this.pendingImage;
        history.push(userMsg);
        this.pendingImage = null;
        this.removeAttach();

        const sophyRow = UI.addMsg('sophy', '', true);
        const sb = document.getElementById('sb');
        if (sb) sb.innerHTML = '<div class="typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';

        this.abortCtrl = new AbortController();
        UI.setStatus('respondendo...');

        try {
            let aiMessages = AI.getWindowedMsgs(history);
            const urlMatch = text.match(URL_RE);
            if (urlMatch) {
                try {
                    UI.setStatus('lendo URL...');
                    const jinaRes = await fetch(`https://r.jina.ai/${urlMatch[0]}`, {
                        signal: this.abortCtrl.signal,
                        headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' }
                    });
                    if (jinaRes.ok) {
                        const content = (await jinaRes.text()).slice(0, 3500).trim();
                        if (content) {
                            aiMessages = [...aiMessages];
                            const last = aiMessages[aiMessages.length - 1];
                            if (last?.role === 'user') {
                                aiMessages[aiMessages.length - 1] = {
                                    ...last,
                                    content: last.content + `\n\n[CONTEÚDO DA URL:\n${content}\nFIM]`
                                };
                            }
                            UI.toast('URL lida!', 'ok');
                        }
                    }
                } catch (_) {}
                UI.setStatus('respondendo...');
            }

            const result = await AI.streamRequest(
                { messages: aiMessages, signal: this.abortCtrl.signal },
                (delta) => {
                    this.fullResponse += delta;
                    const el = document.getElementById('sb');
                    if (el) el.innerHTML = this.fullResponse;
                    const msgs = document.getElementById('msgs');
                    if (msgs) msgs.scrollTop = msgs.scrollHeight;
                }
            );

            const finalEl = document.getElementById('sb');
            if (finalEl) {
                finalEl.removeAttribute('id');
                finalEl.innerHTML = UI.renderMd(this.fullResponse);
            }

            history.push({ role: 'assistant', content: this.fullResponse });
            Store.set('orbit_msgs', history.slice(-100));

            if (history.length % 12 === 0) AI.summarizeSession(history);
            this._cacheResponse(text, this.fullResponse);
            if (result?.provider) this.updateQuota(result.provider);
            if (this._hf && this.fullResponse) setTimeout(() => this.speak(this.fullResponse), 400);

        } catch (err) {
            const finalEl = document.getElementById('sb');
            if (err.name === 'AbortError') {
                if (finalEl) {
                    finalEl.removeAttribute('id');
                    finalEl.innerHTML = this.fullResponse ? UI.renderMd(this.fullResponse) : '<em style="color:var(--fg-4)">Cancelado.</em>';
                }
            } else if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
                const cached = this._findCachedResponse(text);
                if (finalEl) finalEl.removeAttribute('id');
                if (cached) {
                    if (finalEl) finalEl.innerHTML = UI.renderMd(cached.a) + '<div class="cache-badge">📦 resposta em cache (offline)</div>';
                    history.push({ role: 'assistant', content: cached.a });
                    Store.set('orbit_msgs', history.slice(-100));
                } else {
                    if (finalEl) finalEl.innerHTML = '<span class="merr">Sem conexão. Sem cache para esta pergunta.</span>';
                }
                UI.toast('Offline — usando cache', 'err');
            } else {
                if (finalEl) {
                    finalEl.removeAttribute('id');
                    finalEl.innerHTML = `<span class="merr">Erro: ${err.message}</span>`;
                }
                UI.toast('Falha na requisição', 'err');
            }
        } finally {
            this.abortCtrl = null;
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = '';
            this.busy = false;
            UI.setStatus('online');
        }
    }

    cancelStream() {
        if (this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; }
    }

    /* ── VOICE ── */
    setupVoice() {
        const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
        if (!SR) return;
        this._sr = new SR();
        this._sr.lang = 'pt-BR';
        this._sr.continuous = false;
        this._sr.interimResults = true;

        this._sr.onresult = (e) => {
            const transcript = Array.from(e.results).map(r => r[0].transcript).join('');
            const inp = document.getElementById('msginput');
            if (inp) inp.value = transcript;
            const vtxt = document.querySelector('.voice-txt');
            if (vtxt) vtxt.textContent = transcript || 'Ouvindo...';
            if (e.results[e.results.length - 1].isFinal) {
                this.stopVoice();
                if (this._hf) setTimeout(() => this.handleSend(), 300);
            }
        };

        this._sr.onend = () => this.stopVoice();
        this._sr.onerror = () => this.stopVoice();
    }

    toggleVoice() { if (this.voiceActive) this.stopVoice(); else this.startVoice(); }

    startVoice() {
        if (!this._sr) { UI.toast('Reconhecimento de voz não disponível.', 'err'); return; }
        const vb = document.getElementById('voice-bar');
        const vbtn = document.getElementById('voice-btn');
        if (vb) vb.style.display = 'flex';
        if (vbtn) vbtn.classList.add('recording');
        this.voiceActive = true;
        this.requestWakeLock();
        try { this._sr.start(); } catch (_) {}
    }

    stopVoice() {
        const vb = document.getElementById('voice-bar');
        const vbtn = document.getElementById('voice-btn');
        if (vb) vb.style.display = 'none';
        if (vbtn) vbtn.classList.remove('recording');
        this.voiceActive = false;
        this.releaseWakeLock();
        try { if (this._sr) this._sr.stop(); } catch (_) {}
    }

    async requestWakeLock() {
        if (!('wakeLock' in navigator)) return;
        try { this._wakeLock = await navigator.wakeLock.request('screen'); } catch (_) {}
    }

    releaseWakeLock() {
        if (this._wakeLock) { this._wakeLock.release().catch(() => {}); this._wakeLock = null; }
    }

    speak(text) {
        if (!window.speechSynthesis) return;
        speechSynthesis.cancel();
        const clean = text.replace(/<[^>]+>/g, '').replace(/[#*`_]/g, '').slice(0, 1200);
        const utt = new SpeechSynthesisUtterance(clean);
        utt.lang = 'pt-BR';
        utt.rate = 1.05;
        const voices = speechSynthesis.getVoices();
        const ptVoice = voices.find(v => v.lang.startsWith('pt'));
        if (ptVoice) utt.voice = ptVoice;
        speechSynthesis.speak(utt);
    }

    toggleHF() {
        this._hf = !this._hf;
        const btn = document.getElementById('btn-hf');
        if (btn) btn.classList.toggle('hf-active', this._hf);
        UI.toast(this._hf ? 'Mãos livres ativado 🎧' : 'Mãos livres desativado', 'ok');
    }

    /* ── COMMANDS PALETTE ── */
    handleInput() {
        const inp = document.getElementById('msginput');
        if (!inp) return;
        const val = inp.value;
        if (val === '/') this.showCmdPalette();
        else this.hideCmdPalette();
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
    }

    showCmdPalette() { const pal = document.getElementById('cmd-palette'); if (pal) pal.style.display = 'flex'; }
    hideCmdPalette() { const pal = document.getElementById('cmd-palette'); if (pal) pal.style.display = 'none'; }

    runCmd(cmd) {
        this.hideCmdPalette();
        const inp = document.getElementById('msginput');
        if (inp) { inp.value = ''; inp.style.height = 'auto'; }
        if (cmd === 'esquece') {
            Store.set('orbit_msgs', []);
            document.getElementById('msgs').innerHTML = '';
            document.getElementById('empty').style.display = 'flex';
            UI.toast('Sessão limpa.', 'ok');
        } else if (cmd === 'pinned') {
            this.showPinned();
        } else if (cmd === 'exportar') {
            this.exportChat();
        }
    }

    /* ── SEARCH ── */
    openSearch() {
        const bar = document.getElementById('hdr-search');
        if (bar) { bar.style.display = 'flex'; setTimeout(() => document.getElementById('search-inp')?.focus(), 100); }
    }

    closeSearch() {
        const bar = document.getElementById('hdr-search');
        if (bar) bar.style.display = 'none';
        const sinp = document.getElementById('search-inp');
        if (sinp) sinp.value = '';
        document.querySelectorAll('.msg-row').forEach(r => r.classList.remove('search-match', 'search-hidden'));
    }

    runSearch(query) {
        const q = (query || '').trim().toLowerCase();
        document.querySelectorAll('.msg-row').forEach(row => {
            if (!q) { row.classList.remove('search-match', 'search-hidden'); return; }
            const txt = (row.querySelector('.m-content')?.innerText || '').toLowerCase();
            if (txt.includes(q)) { row.classList.add('search-match'); row.classList.remove('search-hidden'); }
            else { row.classList.add('search-hidden'); row.classList.remove('search-match'); }
        });
        document.querySelector('.msg-row.search-match')?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    scrollBottom() { const msgs = document.getElementById('msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight; }

    exportChat() {
        const rows = document.querySelectorAll('.msg-row');
        let out = `ORBIT SOPHY — Conversa exportada em ${new Date().toLocaleString('pt-BR')}\n${'='.repeat(50)}\n\n`;
        rows.forEach(row => {
            const isUser = row.classList.contains('user');
            const txt = row.querySelector('.m-content')?.innerText || '';
            out += `${isUser ? 'VOCÊ' : 'ORBIT'}: ${txt}\n\n`;
        });
        const blob = new Blob([out], { type: 'text/plain;charset=utf-8' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orbit-chat-${new Date().toISOString().slice(0,10)}.txt`;
        a.click();
        URL.revokeObjectURL(a.href);
        UI.toast('Conversa exportada!', 'ok');
    }

    /* ── QUOTA ── */
    updateQuota(provider) {
        const key = `orbit_quota_${provider}_${new Date().toISOString().slice(0,10)}`;
        const count = parseInt(localStorage.getItem(key) || '0') + 1;
        localStorage.setItem(key, count.toString());
        const limits = { groq: 14400, gemini: 1500 };
        const limit = limits[provider] || 1000;
        const pct = Math.min(100, (count / limit) * 100);
        const bar = document.getElementById('quota-bar');
        if (!bar) return;
        if (pct < 50) { bar.style.display = 'none'; return; }
        const label = provider === 'groq' ? 'Groq' : 'Gemini';
        const cls = pct >= 85 ? 'quota-warn' : 'quota-ok';
        bar.style.display = 'flex';
        bar.className = `quota-bar ${cls}`;
        bar.innerHTML = `<span>${label}: ${count}/${limit} req hoje</span><div class="quota-track"><div class="quota-fill" style="width:${pct}%"></div></div>`;
    }

    /* ── MESSAGE CONTEXT MENU ── */
    showMsgCtx(msgId, x, y) {
        this._ctxMsgId = msgId;
        const ctx = document.getElementById('msg-ctx');
        if (!ctx) return;
        ctx.style.display = 'block';
        const cw = window.innerWidth, ch = window.innerHeight;
        let left = x, top = y;
        if (left + 180 > cw) left = cw - 185;
        if (top + 200 > ch) top = ch - 205;
        if (left < 8) left = 8;
        if (top < 8) top = 8;
        ctx.style.left = left + 'px';
        ctx.style.top = top + 'px';
        if (navigator.vibrate) navigator.vibrate(30);
    }

    hideMsgCtx() { const ctx = document.getElementById('msg-ctx'); if (ctx) ctx.style.display = 'none'; this._ctxMsgId = null; }

    copyMsg() {
        const row = document.querySelector(`[data-msgid="${this._ctxMsgId}"]`);
        if (!row) return this.hideMsgCtx();
        const txt = row.querySelector('.m-content')?.innerText || '';
        navigator.clipboard.writeText(txt).then(() => UI.toast('Copiado!', 'ok')).catch(() => UI.toast('Erro ao copiar', 'err'));
        this.hideMsgCtx();
    }

    deleteMsg() {
        const row = document.querySelector(`[data-msgid="${this._ctxMsgId}"]`);
        if (row) { row.style.opacity = '0'; row.style.transition = 'opacity 0.2s'; setTimeout(() => row.remove(), 200); }
        this.hideMsgCtx();
    }

    pinMsg() {
        const row = document.querySelector(`[data-msgid="${this._ctxMsgId}"]`);
        if (!row) return this.hideMsgCtx();
        const txt = row.querySelector('.m-content')?.innerText || '';
        const pins = JSON.parse(localStorage.getItem('orbit_pins') || '[]');
        pins.push({ id: this._ctxMsgId, text: txt.slice(0, 300), ts: Date.now() });
        localStorage.setItem('orbit_pins', JSON.stringify(pins.slice(-20)));
        row.querySelector('.mbubble')?.classList.add('pinned');
        UI.toast('Mensagem fixada 📌', 'ok');
        this.hideMsgCtx();
    }

    speakMsg() {
        const row = document.querySelector(`[data-msgid="${this._ctxMsgId}"]`);
        if (!row) return this.hideMsgCtx();
        const txt = row.querySelector('.m-content')?.innerText || '';
        this.speak(txt);
        this.hideMsgCtx();
    }

    shareMsg() {
        const row = document.querySelector(`[data-msgid="${this._ctxMsgId}"]`);
        if (!row) return this.hideMsgCtx();
        const txt = row.querySelector('.m-content')?.innerText || '';
        this.hideMsgCtx();
        if (navigator.share) {
            navigator.share({ title: 'Orbit Sophy', text: txt }).catch(() => {});
        } else {
            navigator.clipboard.writeText(txt).then(() => UI.toast('Copiado!', 'ok')).catch(() => {});
        }
    }

    _cacheResponse(question, answer) {
        try {
            const cache = JSON.parse(localStorage.getItem('orbit_resp_cache') || '[]');
            cache.push({ q: question.slice(0, 120), a: answer.slice(0, 600), ts: Date.now() });
            localStorage.setItem('orbit_resp_cache', JSON.stringify(cache.slice(-15)));
        } catch (_) {}
    }

    _findCachedResponse(question) {
        try {
            const cache = JSON.parse(localStorage.getItem('orbit_resp_cache') || '[]');
            if (!cache.length) return null;
            const qWords = question.toLowerCase().split(/\s+/).filter(w => w.length > 3);
            let best = null, bestScore = 0;
            for (const entry of cache) {
                const score = qWords.filter(w => entry.q.toLowerCase().includes(w)).length;
                if (score > bestScore && score >= 2) { bestScore = score; best = entry; }
            }
            return best;
        } catch (_) { return null; }
    }

    showPinned() {
        const pins = JSON.parse(localStorage.getItem('orbit_pins') || '[]');
        if (!pins.length) { UI.toast('Nenhuma mensagem fixada.', 'ok'); return; }
        const content = pins.map((p, i) => `${i + 1}. ${p.text}`).join('\n\n');
        document.getElementById('empty')?.style && (document.getElementById('empty').style.display = 'none');
        UI.addMsg('sophy', `**📌 Mensagens Fixadas (${pins.length}):**\n\n${content}`, false);
    }

    /* ── PANEL ── */
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
                <div class="psec"><label class="plabel">Nome da IA</label><input type="text" id="s-name" value="${cfg.name}"></div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>`;
        } else if (tab === 'ai') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">Groq API Key (primária)</label><input type="password" id="s-groq" value="${cfg.groqKey}" placeholder="gsk_...">
                <p style="font-size:11px;color:var(--text-muted);margin-top:6px">LLaMA 3.3 70B · 14.400 req/dia</p></div>
                <div class="psec"><label class="plabel">Modelo Groq</label><select id="s-groq-model">
                    <option value="llama-3.3-70b-versatile" ${cfg.groqModel==='llama-3.3-70b-versatile'?'selected':''}>LLaMA 3.3 70B Versatile</option>
                    <option value="llama-3.1-8b-instant" ${cfg.groqModel==='llama-3.1-8b-instant'?'selected':''}>LLaMA 3.1 8B Instant</option>
                    <option value="mixtral-8x7b-32768" ${cfg.groqModel==='mixtral-8x7b-32768'?'selected':''}>Mixtral 8x7B</option>
                </select></div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <div class="psec"><label class="plabel">Gemini API Key (fallback)</label><input type="password" id="s-key" value="${cfg.apiKey}" placeholder="AIza..."></div>
                <div class="psec"><label class="plabel">Modelo Gemini</label><select id="s-model">
                    <option value="gemini-2.5-flash-lite" ${cfg.model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite</option>
                    <option value="gemini-2.5-flash" ${cfg.model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash</option>
                </select></div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
                <div class="psec" style="margin-top:16px"><label class="plabel">STATUS</label>
                <div style="font-family:var(--fm);font-size:12px;color:var(--text-sec)">
                    ${cfg.groqKey ? '● Groq configurado' : '○ Groq não configurado'}<br>
                    ${cfg.apiKey ? '● Gemini configurado' : '○ Gemini não configurado'}
                </div></div>`;
        } else if (tab === 'mem') {
            const ep = Store.getEp();
            body.innerHTML = `
                <div class="psec"><label class="plabel">Núcleo de Identidade</label>
                <textarea id="s-nuc" rows="6" style="font-size:12px">${Store.getNuc()}</textarea>
                <button class="btn btn-primary" onclick="orbit.saveNuc()">SALVAR NÚCLEO</button></div>
                <div class="psec"><label class="plabel">Memórias Episódicas (${ep.length})</label>
                <div>${ep.length ? ep.map(e => `<div class="ctx-item"><strong style="font-size:11px;color:var(--text-sec)">${e.d||''}:</strong> ${e.s}</div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">Nenhuma memória.</p>'}</div></div>
                <button class="btn btn-danger" onclick="orbit.clearMem()">LIMPAR MEMÓRIAS</button>`;
        } else if (tab === 'disc') {
            const d = University.get();
            body.innerHTML = `
                <div class="psec"><label class="plabel">Nova Disciplina — UFPI</label>
                <input type="text" id="dc-name" placeholder="Nome da Matéria">
                <input type="text" id="dc-prof" placeholder="Professor" style="margin-top:8px">
                <button class="btn btn-primary" onclick="orbit.addDisc()">ADICIONAR</button></div>
                <div>${d.length ? d.map(i => `<div class="ctx-item"><strong>${i.name}</strong>${i.professor ? ' — ' + i.professor : ''} <button onclick="orbit.delDisc('${i.id}')" style="float:right;background:none;border:none;color:var(--danger);cursor:pointer;font-size:18px">×</button></div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">Nenhuma disciplina.</p>'}</div>`;
        } else if (tab === 'extras') {
            const ideas = IdeaVault.get().reverse();
            body.innerHTML = `
                <div class="psec"><label class="plabel">KANBAN</label>${this.renderKanban()}</div>
                <div class="psec"><label class="plabel">Baú de Ideias (${ideas.length})</label>
                ${ideas.map(i => `<div class="ctx-item"><em style="font-size:11px;color:var(--text-muted)">${i.date}</em><br>${i.text} <button onclick="orbit.delIdea('${i.id}')" style="float:right;background:none;border:none;color:var(--danger);cursor:pointer">×</button></div>`).join('') || '<p style="color:var(--text-muted);font-size:13px">Use !ideia [texto] no chat.</p>'}</div>`;
        } else if (tab === 'fe') {
            const v = Faith.getVerseOfDay();
            const journal = Faith.getJournal();
            body.innerHTML = `
                <div class="ctx-item" style="margin-bottom:16px;border-color:rgba(201,152,42,.3);background:rgba(201,152,42,.04)">
                    <div style="font-family:var(--fm);font-size:10px;color:var(--gold);margin-bottom:8px;letter-spacing:1px">${v.r}</div>
                    <div style="font-size:14px;line-height:1.7;font-style:italic">"${v.t}"</div>
                </div>
                <div class="psec"><label class="plabel">Diário Espiritual</label>
                <textarea id="fe-j-inp" rows="3" placeholder="O que Deus falou com o Senhor hoje?"></textarea>
                <button class="btn btn-primary" onclick="orbit.addFaithJournalPanel()">REGISTRAR</button></div>
                <div>${journal.slice(0,5).map(j => `<div class="ctx-item"><em style="font-size:11px;color:var(--text-muted)">${j.date}</em><br>${j.text}</div>`).join('')}</div>`;
        } else if (tab === 'tools') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">CALCULADORA</label>
                <input type="text" id="calc-inp" placeholder="Ex: 2 + 2 * 3.14">
                <div id="calc-res" class="tool-result" style="margin-top:8px">—</div>
                <button class="btn btn-primary" onclick="orbit.runCalc()">CALCULAR</button></div>
                <div class="psec"><label class="plabel">POMODORO 🍅</label>
                <div style="font-family:var(--fm);font-size:40px;text-align:center;color:var(--white);padding:16px 0" id="pomo-time">${String(this._pomoWorkMin).padStart(2,'0')}:00</div>
                <div style="background:var(--raised);border-radius:6px;height:4px;overflow:hidden;margin-bottom:14px"><div id="pomo-bar" style="height:100%;width:0%;background:var(--white);transition:width 1s linear"></div></div>
                <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" id="pomo-btn" onclick="orbit.pomoToggle()" style="margin-top:0">INICIAR</button>
                    <button class="btn btn-ghost" onclick="orbit.pomoReset()" style="margin-top:0">RESET</button>
                </div></div>`;
        } else if (tab === 'sys') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">Backup de Dados</label>
                <p style="font-size:11px;color:var(--text-muted);margin-bottom:10px">Exporta tudo: finanças, agenda, hábitos, cards, fé, PS5, kanban.</p>
                <div style="display:flex;gap:8px">
                <button class="btn btn-ghost" style="margin:0;flex:1" onclick="orbit.exportBkp()">EXPORTAR</button>
                <button class="btn btn-ghost" style="margin:0;flex:1" onclick="orbit.importBkp()">IMPORTAR</button>
                </div></div>
                <button class="btn btn-ghost" onclick="orbit.resetPin()">TROCAR PIN</button>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <div class="psec"><label class="plabel">Prompt do Sistema</label>
                <textarea id="s-prompt" rows="6" style="font-size:12px">${cfg.prompt || ''}</textarea>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR PROMPT</button></div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <button class="btn btn-danger" onclick="orbit.resetAll()">RESET TOTAL</button>`;
        }
    }

    renderKanban() {
        const kb = Kanban.get();
        const cols = ['todo', 'doing', 'done'];
        const labels = { todo: 'FAZER', doing: 'FAZENDO', done: 'FEITO' };
        return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${cols.map(c => `<div>
                <div style="font-family:var(--fm);font-size:9px;letter-spacing:1px;color:var(--text-muted);margin-bottom:6px">${labels[c]} (${(kb[c]||[]).length})</div>
                ${(kb[c]||[]).map(item => `<div onclick="orbit.moveTask('${item.id}','${c}')" style="background:var(--overlay);border:1px solid var(--border);border-radius:8px;padding:7px 9px;font-size:12px;margin-bottom:5px;cursor:pointer">${item.text}</div>`).join('')}
                <input type="text" id="ki-${c}" placeholder="+" style="font-size:12px;padding:6px 9px" onkeydown="if(event.key==='Enter')orbit.addTask('${c}')">
            </div>`).join('')}
        </div>`;
    }

    /* ── ACTIONS ── */
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
        if (inp?.value.trim()) { Kanban.add(col, inp.value.trim()); this.renderHubKanban(); this.renderPanelTab('extras'); }
    }

    moveTask(id, col) {
        const next = { todo: 'doing', doing: 'done', done: 'todo' };
        Kanban.move(id, col, next[col]);
        this.renderHubKanban();
        if (this.activeTab === 'extras') this.renderPanelTab('extras');
    }

    addFaithJournalPanel() {
        const el = document.getElementById('fe-j-inp');
        if (el?.value.trim()) { Faith.addJournal(el.value.trim()); el.value = ''; this.renderPanelTab('fe'); UI.toast('Registrado! 🙏', 'ok'); }
    }

    delIdea(id) { IdeaVault.remove(id); this.renderPanelTab('extras'); }

    exportBkp() {
        const data = {
            config: { ...Store.getCfg(), apiKey: '', groqKey: '' },
            ep: Store.getEp(), nuc: Store.getNuc(),
            disc: University.get(), flash: Flashcards.get(),
            fe: Faith.getJournal(), ideas: IdeaVault.get(),
            finance_tx: Finance.getAll(),
            agenda: Agenda.getEvents(),
            habits: Habits.getAll(),
            kanban: Kanban.get(),
            ps5: Entertainment.getPS5Games(),
            grades: Grades.get(),
            nupi_proj: Store.get('orbit_nupi_proj', []),
            nupi_tasks: Store.get('orbit_nupi_tasks', []),
            fe_prayers: Store.get('orbit_fe_prayers', []),
        };
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orbit-backup-${new Date().toISOString().slice(0, 10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        UI.toast('Backup completo exportado!', 'ok');
    }

    importBkp() {
        const inp = document.createElement('input');
        inp.type = 'file';
        inp.accept = '.json';
        inp.onchange = async (e) => {
            const file = e.target.files[0];
            if (!file) return;
            try {
                const text = await file.text();
                const d = JSON.parse(text);
                if (!confirm(`Importar backup de ${file.name}?\nDados atuais serão substituídos.`)) return;
                if (d.config) { const cfg = { ...Store.getCfg(), ...d.config }; Store.saveCfg(cfg); }
                if (d.nuc) Store.saveNuc(d.nuc);
                if (d.ep) Store.saveEp(d.ep);
                if (d.disc) Store.set('orbit_disc', d.disc);
                if (d.flash) Store.set('orbit_flash', d.flash);
                if (d.fe) Store.set('orbit_fe_journal', d.fe);
                if (d.ideas) Store.set('orbit_ideas', d.ideas);
                if (d.finance_tx) Store.set('orbit_finance_tx', d.finance_tx);
                if (d.agenda) Store.set('orbit_agenda_events', d.agenda);
                if (d.habits) Store.set('orbit_habits', d.habits);
                if (d.kanban) Store.set('orbit_kanban', d.kanban);
                if (d.ps5) Store.set('orbit_ps5', d.ps5);
                if (d.grades) Store.set('orbit_grades', d.grades);
                if (d.nupi_proj) Store.set('orbit_nupi_proj', d.nupi_proj);
                if (d.nupi_tasks) Store.set('orbit_nupi_tasks', d.nupi_tasks);
                if (d.fe_prayers) Store.set('orbit_fe_prayers', d.fe_prayers);
                UI.toast('Backup importado! Recarregando...', 'ok');
                setTimeout(() => location.reload(), 1200);
            } catch { UI.toast('Arquivo inválido.', 'err'); }
        };
        inp.click();
    }

    resetPin() {
        if (!confirm('Trocar o PIN? Você vai precisar criar um novo.')) return;
        localStorage.removeItem(K.pin);
        this.pinBuffer = '';
        this.pinMode = 'set';
        document.querySelector('.pin-title').textContent = 'CRIAR NOVO PIN';
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

    /* ── FILE ATTACH ── */
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

    /* ── SETUP LISTENERS ── */
    setupListeners() {
        document.getElementById('sendbtn')?.addEventListener('click', () => this.handleSend());

        const inp = document.getElementById('msginput');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); this.handleSend(); }
                if (e.key === 'Escape') this.hideCmdPalette();
            });
            inp.addEventListener('input', () => this.handleInput());
        }

        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', (e) => this.switchPanelTab(e.currentTarget.dataset.tab, e.currentTarget));
        });

        document.querySelectorAll('.pin-key').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('del')) this.pinDel();
                else if (!btn.classList.contains('empty')) this.pinKey(btn.textContent.trim());
            });
        });

        document.getElementById('file-inp')?.addEventListener('change', (e) => this.onFileSelect(e));
        document.getElementById('cam-inp')?.addEventListener('change', (e) => this.onFileSelect(e));

        window.addEventListener('popstate', () => { if (this.chatOpen) this.closeChat(false); });

        const msgs = document.getElementById('msgs');
        if (msgs) {
            msgs.addEventListener('scroll', () => {
                const btn = document.getElementById('scroll-btn');
                if (!btn) return;
                const atBottom = msgs.scrollHeight - msgs.scrollTop - msgs.clientHeight < 80;
                btn.style.display = atBottom ? 'none' : 'flex';
            });
        }

        document.addEventListener('pointerdown', (e) => {
            const ctx = document.getElementById('msg-ctx');
            if (ctx && ctx.style.display !== 'none' && !ctx.contains(e.target)) this.hideMsgCtx();
            const pal = document.getElementById('cmd-palette');
            const textarea = document.getElementById('msginput');
            if (pal && pal.style.display !== 'none' && !pal.contains(e.target) && e.target !== textarea) this.hideCmdPalette();
        });
    }

    /* ── UTILS ── */
    fixViewport() {
        if (!window.visualViewport) return;
        window.visualViewport.addEventListener('resize', () => {
            const chat = document.getElementById('chat');
            if (chat && chat.style.display !== 'none') chat.style.height = window.visualViewport.height + 'px';
        });
    }

    initOrb() {
        // Aurora CSS substitui o WebGL — nenhuma inicialização necessária
    }

    initPWA() {
        if ('serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js').catch(() => {});
        if ('storage' in navigator && 'persist' in navigator.storage) navigator.storage.persist().catch(() => {});
    }
}

window.orbit = new App();
