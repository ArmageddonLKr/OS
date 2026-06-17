/**
 * APP.JS — Controller Principal Orbit Sophy
 * Sessions 1-10 integradas
 */

import { Store, K, DEFAULT_PROMPT } from './store.js';
import { AI } from './ai.js';
import { UI, Icons } from './ui.js';
import { Calculator, Converter, Pomodoro, DataTools } from './tools.js';
import { Kanban, Flashcards, University, IdeaVault, Grades } from './study.js';
import { Faith, VERSES, ACTS_PRAYERS } from './faith.js';
import { Agenda, EVT_CATS } from './agenda.js';
import { Finance, FIN_CATS } from './finance.js';
import { Habits, Mood } from './habits.js';
import { Vault } from './vault.js';
import { Entertainment } from './entertainment.js';
import { Loader } from './loader.js';

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
const ACCENTS = [
    { name: 'Prata',  v: '#d4d4d4' },
    { name: 'Âmbar',  v: '#d4af37' },
    { name: 'Azul',   v: '#5b9bd5' },
    { name: 'Violeta',v: '#9b7ede' },
    { name: 'Rosé',   v: '#d98ca0' },
    { name: 'Verde-água', v: '#5ec9b8' },
];

class App {
    constructor() {
        this.busy = false;
        this.pinBuffer = '';
        this.pinMode = 'enter';
        this._pinErrors = 0;
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
        this._finYear = new Date().getFullYear();
        this._finMonth = new Date().getMonth() + 1;

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

        // First-run flag
        this._isFirstRun = !Store.get(K.pin);

        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.boot());
        } else {
            this.boot();
        }
    }

    applyAccent() {
        const cfg = Store.getCfg();
        if (cfg.accent) {
            document.documentElement.style.setProperty('--gold', cfg.accent);
            document.documentElement.style.setProperty('--gold-hi', cfg.accent);
        }
    }

    _applyDynamicTheme() {
        const h = AI.nowBR().getHours();
        const a1 = document.querySelector('.aurora-orb.a1');
        const a2 = document.querySelector('.aurora-orb.a2');
        if (!a1 || !a2) return;
        if (h >= 0 && h < 5) {
            a1.style.background = 'radial-gradient(circle, rgba(120,70,180,0.12) 0%, transparent 65%)';
            a2.style.background = 'radial-gradient(circle, rgba(60,60,120,0.08) 0%, transparent 65%)';
        } else if (h >= 5 && h < 12) {
            a1.style.background = 'radial-gradient(circle, rgba(60,110,200,0.15) 0%, transparent 65%)';
            a2.style.background = 'radial-gradient(circle, rgba(80,150,210,0.08) 0%, transparent 65%)';
        } else if (h >= 18 && h < 23) {
            a1.style.background = 'radial-gradient(circle, rgba(200,110,50,0.12) 0%, transparent 65%)';
            a2.style.background = 'radial-gradient(circle, rgba(210,150,30,0.08) 0%, transparent 65%)';
        }
    }

    _initRipple() {
        document.addEventListener('click', e => {
            const btn = e.target.closest('.btn, .nav-btn, .inp-btn, .dqa-btn, .mf-btn, .ml-btn');
            if (!btn) return;
            const ripple = document.createElement('span');
            ripple.className = 'ripple-fx';
            const rect = btn.getBoundingClientRect();
            const size = Math.max(rect.width, rect.height) * 2;
            ripple.style.cssText = `width:${size}px;height:${size}px;left:${e.clientX - rect.left - size / 2}px;top:${e.clientY - rect.top - size / 2}px;`;
            btn.appendChild(ripple);
            ripple.addEventListener('animationend', () => ripple.remove());
        });
    }

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
                await this.loadDashboard();
                UI.toast('Dashboard atualizado!', 'ok', 1500);
            }
            indicator.style.height = '0';
            indicator.style.opacity = '0';
        });
    }

    setAccent(color) {
        const cfg = Store.getCfg();
        cfg.accent = color;
        Store.saveCfg(cfg);
        this.applyAccent();
        this.renderPanelTab('sys');
        if (navigator.vibrate) navigator.vibrate(15);
    }

    /* Migra o prompt antigo (formal) pra nova psique, se o usuário não customizou */
    _migrateConfig() {
        try {
            const raw = Store.get(K.cfg, {});
            // Assinaturas dos prompts-padrão antigos (formal + v1 da psique). Se bater, sobe pra versão atual.
            // Não toca se o usuário escreveu o próprio prompt.
            const oldSigs = ['Chama SEMPRE', 'JAMAIS "você"', 'Filha digital do JR', '(psique de verdade)', 'parceira de quebrada do JR', 'Esperta pra caramba', 'ciúme do tempo dele', 'AMA o JR'];
            if (raw && typeof raw.prompt === 'string' && oldSigs.some(s => raw.prompt.includes(s))) {
                raw.prompt = DEFAULT_PROMPT;
                Store.saveCfg(raw);
            }
        } catch (_) {}
    }

    boot() {
        this._migrateConfig();
        this.applyAccent();
        this._applyDynamicTheme();
        this.initOrb();
        this.setupListeners();
        this.setupVoice();
        this.fixViewport();
        this.initPWA();
        this.handleDeepLinks();
        this._initRipple();
        this._initPullToRefresh();

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
    /* ── HASH DO PIN (SHA-256 + salt) ── */
    async _hashPin(pin) {
        try {
            const encoder = new TextEncoder();
            const data = encoder.encode('orbit_s4lt_' + pin);
            const hash = await crypto.subtle.digest('SHA-256', data);
            return Array.from(new Uint8Array(hash))
                .map(b => b.toString(16).padStart(2, '0')).join('');
        } catch (_) {
            return String(pin);
        }
    }

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

    async processPin() {
        const stored = Store.get(K.pin);
        if (this.pinMode === 'set') {
            const hash = await this._hashPin(this.pinBuffer);
            Store.set(K.pin, hash);
            this.pinBuffer = '';
            this.updatePinDots();
            if (navigator.vibrate) navigator.vibrate(50);
            this.enterApp();
        } else {
            let isMatch = false;
            // Migração: PIN antigo em texto plano (4 dígitos)
            if (stored && stored.length === 4 && /^\d{4}$/.test(stored)) {
                isMatch = this.pinBuffer === stored;
                if (isMatch) {
                    // Migra para hash seguro
                    const hash = await this._hashPin(stored);
                    Store.set(K.pin, hash);
                }
            } else {
                const hash = await this._hashPin(this.pinBuffer);
                isMatch = hash === stored;
            }

            if (isMatch) {
                this.pinBuffer = '';
                this.updatePinDots();
                if (navigator.vibrate) navigator.vibrate(50);
                this.enterApp();
            } else {
                if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                this.updatePinDots(true);
                this._pinErrors = (this._pinErrors || 0) + 1;
                if (this._pinErrors >= 3) {
                    const btn = document.getElementById('pin-reset-btn');
                    if (btn) btn.style.display = 'block';
                }
                setTimeout(() => { this.pinBuffer = ''; this.updatePinDots(); }, 700);
            }
        }
    }

    enterApp() {
        const pin = document.getElementById('pinscreen');
        if (!pin) return;
        Loader.show('INICIALIZANDO OS', [
            'Verificando identidade',
            'Carregando dados',
            'Preparando interface'
        ], 320);
        pin.style.opacity = '0';
        pin.style.transition = 'opacity 0.35s';
        setTimeout(() => {
            pin.style.display = 'none';
            document.getElementById('app').style.display = 'flex';
            document.getElementById('app').style.flexDirection = 'column';
            this.loadDashboard();
            this.loadChat();
            Loader.hide(150);
            this.setupNetworkMonitor();
            this.setupConfirmDialog();
            if (this._pendingOpenChat) { this._pendingOpenChat = false; this.openChat(); }
            if (this._pendingPomodoro) { this._pendingPomodoro = false; this.switchTab('academia'); setTimeout(() => this.switchAcad('pomo'), 300); }
            if (this._pendingAgenda) { this._pendingAgenda = false; setTimeout(() => this.switchTab('agenda'), 300); }
            if (this._isFirstRun) {
                this._isFirstRun = false;
                const cfg = Store.getCfg();
                if (!cfg.groqKey && !cfg.apiKey) {
                    setTimeout(() => { this.activeTab = 'ai'; this.openPanel(); }, 800);
                } else {
                    Loader.show('BEM-VINDO À OS', [
                        'Orbit Sophy inicializada',
                        'Sistema de identidade ativo',
                        'Memória episódica preparada',
                        'Prontos para começar'
                    ], 800);
                    setTimeout(() => {
                        Loader.hide();
                        setTimeout(() => this.openChat(), 500);
                    }, 3500);
                }
            }
            // Pede permissão de notificação de forma não intrusiva (5s após entrar)
            setTimeout(() => this._requestNotifPermission(), 5000);
            // Agenda notificações do dia
            setTimeout(() => this._scheduleAgendaNotifications(), 2000);
            // Inicia polling de alertas de transferência
            setTimeout(() => this._startTransferAlerts(), 10000);
        }, 350);
    }

    /* ── DETECÇÃO DE REDE ── */
    setupNetworkMonitor() {
        if (this._networkMonitorSetup) return;
        this._networkMonitorSetup = true;

        const banner = document.createElement('div');
        banner.id = 'offline-banner';
        document.body.appendChild(banner);

        let hideTimer = null;

        const showOnline = () => {
            banner.innerHTML = '<span class="offline-dot"></span>Conexão restaurada';
            banner.className = 'online show';
            UI.setStatus('online');
            if (hideTimer) clearTimeout(hideTimer);
            hideTimer = setTimeout(() => banner.classList.remove('show'), 2800);
        };

        const showOffline = () => {
            banner.innerHTML = '<span class="offline-dot"></span>Sem conexão — dados em cache disponíveis';
            banner.className = 'offline show';
            UI.setStatus('offline', 'offline');
            if (hideTimer) { clearTimeout(hideTimer); hideTimer = null; }
        };

        if (!navigator.onLine) showOffline();

        window.addEventListener('offline', showOffline);
        window.addEventListener('online', showOnline);
    }

    /* ── DIALOG DE CONFIRMAÇÃO PERSONALIZADO ── */
    setupConfirmDialog() {
        if (document.getElementById('confirm-dialog')) return;
        const el = document.createElement('div');
        el.id = 'confirm-dialog';
        el.innerHTML = `
            <div class="confirm-sheet">
                <div class="confirm-title" id="cdlg-title">Confirmar</div>
                <div class="confirm-msg" id="cdlg-msg"></div>
                <div class="confirm-btns">
                    <button class="confirm-cancel" id="cdlg-cancel">Cancelar</button>
                    <button class="confirm-ok" id="cdlg-ok">Confirmar</button>
                </div>
            </div>`;
        document.body.appendChild(el);
        document.getElementById('cdlg-cancel').addEventListener('click', () => this._resolveConfirm(false));
        el.addEventListener('click', e => { if (e.target === el) this._resolveConfirm(false); });
    }

    _confirm(msg, opts = {}) {
        return new Promise(resolve => {
            this._resolveConfirm = (val) => {
                const dlg = document.getElementById('confirm-dialog');
                if (dlg) dlg.classList.remove('show');
                resolve(val);
            };
            const dlg = document.getElementById('confirm-dialog');
            if (!dlg) { resolve(window.confirm(msg)); return; }
            document.getElementById('cdlg-title').textContent = opts.title || 'Confirmar';
            document.getElementById('cdlg-msg').textContent = msg;
            const ok = document.getElementById('cdlg-ok');
            ok.textContent = opts.okLabel || 'Confirmar';
            ok.className = `confirm-ok${opts.danger ? ' danger' : ''}`;
            ok.onclick = () => this._resolveConfirm(true);
            dlg.classList.add('show');
        });
    }

    /* ── PERMISSÃO DE NOTIFICAÇÃO ── */
    async _requestNotifPermission() {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') return;
        if (Notification.permission === 'denied') return;
        // Só pede se o usuário ainda não decidiu
        try { await Notification.requestPermission(); } catch (_) {}
    }

    /* ── AGENDA: NOTIFICAÇÕES DO DIA ── */
    _scheduleAgendaNotifications() {
        if (!('Notification' in window) || Notification.permission !== 'granted') return;
        try {
            const now = AI.nowBR();
            const today = now.toISOString().slice(0, 10);
            const events = (Store.get(K.agenda, []) || []).filter(e => e.date === today && e.time);

            events.forEach(evt => {
                const [hh, mm] = (evt.time || '').split(':').map(Number);
                if (isNaN(hh)) return;
                const evtMs = new Date(now).setHours(hh, mm - 10, 0, 0); // avisa 10min antes
                const delay = evtMs - Date.now();
                if (delay < 0 || delay > 24 * 60 * 60 * 1000) return;
                setTimeout(() => {
                    try {
                        new Notification('OS — Agenda', {
                            body: `Em 10 min: ${evt.title} às ${evt.time}`,
                            icon: './icon-192.png',
                            badge: './icon-192.png',
                            tag: `evt-${evt.id}`,
                            silent: false
                        });
                    } catch (_) {}
                }, delay);
            });
        } catch (_) {}
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

        const moodVal = Mood.today();
        const moodBadge = document.getElementById('hdr-mood-badge');
        if (moodBadge) {
            const emojis = ['', '😞', '😕', '😐', '🙂', '😄'];
            moodBadge.classList.remove('pulse');
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
        // Carrega APIs em paralelo — não bloqueia o render
        Promise.all([
            this.loadWeather(),
            this.loadCambio(),
            this.renderSportsCard()
        ]).catch(() => {});
    }

    renderGreeting() {
        const now = AI.nowBR();
        const hr = now.getHours();
        const dow = now.getDay();
        const day = now.getDate();
        const month = now.getMonth();

        const _nm = Store.getCfg().userName || 'JR';
        let greet = hr < 5 ? `Boa madruga, ${_nm}` : hr < 12 ? `Bom dia, ${_nm}` : hr < 18 ? `Boa tarde, ${_nm}` : `Boa noite, ${_nm}`;
        if (month === 1 && day === 4) greet = `🎂 Aniversário da Orbit, ${_nm}!`;
        else if (month === 11 && day === 25) greet = `🎄 Feliz Natal, ${_nm}`;
        else if (month === 11 && day === 11) greet = `⚙️ Feliz dia do Engenheiro, ${_nm}`;

        const subMap = {
            0: dow === 0 && hr >= 19 ? 'Domingo à noite — bora alinhar a semana.' : 'Descansa que tu merece.',
            1: 'Segunda — semana nova, nova chance de fazer acontecer.',
            5: 'Sextou — bom momento pra fechar a semana.',
        };

        const dateStr = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long' });
        document.getElementById('greet-line').textContent = greet;
        document.getElementById('greet-sub').textContent = subMap[dow] || dateStr;

        const hint = document.getElementById('dcb-hint');
        if (hint) {
            const cfg = Store.getCfg();
            if (!cfg.groqKey && !cfg.apiKey) {
                hint.textContent = '⚠️ Configure a chave de IA em Config → IA';
                hint.style.color = 'var(--gold)';
            } else {
                const hints = ['Fala comigo...', 'E aí, no que cê tá?', 'Tô aqui, manda ver.', 'Bora resolver?', 'Desembucha 👀'];
                hint.textContent = hints[Math.floor(Math.random() * hints.length)];
                hint.style.color = '';
            }
        }

        const streak = this._updateStreak();
        const streakEl = document.getElementById('dash-streak');
        const streakCount = document.getElementById('streak-count');
        if (streakEl && streakCount && streak >= 2) {
            streakEl.style.display = 'flex';
            streakCount.textContent = streak;
        }
    }

    _updateStreak() {
        const today = AI.todayStr();
        const data = Store.get(K.streak, { lastOpen: '', count: 0 });
        const d = new Date();
        d.setDate(d.getDate() - 1);
        const yesterday = AI.todayStr(d);
        if (data.lastOpen === today) return data.count;
        if (data.lastOpen === yesterday) data.count++;
        else data.count = 1;
        data.lastOpen = today;
        Store.set(K.streak, data);
        return data.count;
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
            UI.countUp(balEl, s.balance, 600, fmt);
            balEl.className = `dfr-val ${s.balance >= 0 ? 'finance-color' : 'danger-color'}`;
        }
        const incEl = document.getElementById('dash-income');
        if (incEl) UI.countUp(incEl, s.income, 500, fmt);
        const expEl = document.getElementById('dash-expenses');
        if (expEl) UI.countUp(expEl, s.expenses, 500, fmt);
    }

    renderHabitsCard() {
        const habits = Habits.getAll();
        const list = document.getElementById('dash-habits-list');
        if (!list) return;
        if (!habits.length) {
            list.innerHTML = '<div class="dash-empty">Configure hábitos no Hub.</div>';
            return;
        }
        const today = Habits.today();
        list.innerHTML = habits.map(h => {
            const done = (h.done || []).includes(today);
            const streak = Habits.getStreak(h);
            return `<div class="habit-chip ${done ? 'done' : ''}" onclick="orbit.toggleHabit('${h.id}')">
                <span>${h.icon || '●'}</span><span>${h.name}</span>${streak > 1 ? `<span class="hab-streak">🔥${streak}</span>` : ''}
            </div>`;
        }).join('');
    }

    toggleHabit(id) {
        const today = Habits.today();
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

    async loadWeather(retry = 0) {
        const cached = sessionStorage.getItem('orbit_weather');
        const cachedTime = parseInt(sessionStorage.getItem('orbit_weather_ts') || '0');
        const AGE = 30 * 60 * 1000;
        let data;
        if (cached && Date.now() - cachedTime < AGE) {
            data = JSON.parse(cached);
        } else {
            try {
                const res = await fetch(WEATHER_URL, { signal: AbortSignal.timeout(6000) });
                if (!res.ok) throw new Error('status ' + res.status);
                data = await res.json();
                sessionStorage.setItem('orbit_weather', JSON.stringify(data));
                sessionStorage.setItem('orbit_weather_ts', Date.now().toString());
            } catch (err) {
                if (retry < 2 && navigator.onLine) {
                    await new Promise(r => setTimeout(r, (retry + 1) * 1500));
                    return this.loadWeather(retry + 1);
                }
                // Mostra dado em cache se disponível, senão placeholder
                if (cached) {
                    try { data = JSON.parse(cached); } catch (_) {}
                }
                if (!data) {
                    document.getElementById('weather-temp').textContent = '--°';
                    document.getElementById('weather-desc').textContent = navigator.onLine ? 'Erro de rede' : 'Offline';
                    return;
                }
            }
        }
        const cur = data?.current;
        if (!cur) return;
        const code = cur.weathercode ?? 0;
        const [icon, desc] = WMO_ICONS[code] || ['🌡️', 'Teresina'];
        const temp = Math.round(cur.temperature_2m ?? 0);
        const iconEl = document.getElementById('weather-icon');
        const tempEl = document.getElementById('weather-temp');
        const descEl = document.getElementById('weather-desc');
        if (iconEl) iconEl.textContent = icon;
        if (tempEl) tempEl.textContent = `${temp}°`;
        if (descEl) descEl.textContent = desc;
    }

    async loadCambio(retry = 0) {
        const cached = sessionStorage.getItem('orbit_cambio');
        const cachedTs = parseInt(sessionStorage.getItem('orbit_cambio_ts') || '0');
        let data;
        if (cached && Date.now() - cachedTs < 15 * 60 * 1000) {
            try { data = JSON.parse(cached); } catch (_) {}
        }
        if (!data) {
            try {
                const res = await fetch(CAMBIO_URL, { signal: AbortSignal.timeout(6000) });
                if (!res.ok) throw new Error('status ' + res.status);
                data = await res.json();
                sessionStorage.setItem('orbit_cambio', JSON.stringify(data));
                sessionStorage.setItem('orbit_cambio_ts', Date.now().toString());
            } catch (err) {
                if (retry < 2 && navigator.onLine) {
                    await new Promise(r => setTimeout(r, (retry + 1) * 1500));
                    return this.loadCambio(retry + 1);
                }
                // Tenta cache mais antigo
                if (cached) {
                    try { data = JSON.parse(cached); } catch (_) { return; }
                } else { return; }
            }
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
        el.innerHTML = UI.loading('Buscando dados esportivos...');

        const teams = Entertainment.getTeams();
        const firstTeam = teams[0] || null;

        const [f1, teamGame] = await Promise.all([
            Entertainment.getF1NextRace(),
            firstTeam ? Entertainment.getTeamNext(firstTeam.espnId, firstTeam.espnLeague) : Promise.resolve(null)
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
        if (firstTeam) {
            if (teamGame) {
                const score = (teamGame.homeScore !== null && teamGame.awayScore !== null)
                    ? ` ${teamGame.homeScore}–${teamGame.awayScore}` : '';
                html += `<div class="dash-list-item" style="gap:8px">
                    <span>${firstTeam.flag || '⚽'}</span>
                    <span style="font-size:13px;flex:1">${teamGame.home} ×${score} ${teamGame.away}</span>
                    ${teamGame.live ? '<span style="font-size:10px;color:var(--err)">AO VIVO</span>' : ''}
                </div>`;
            } else {
                html += `<div class="dash-list-item" style="gap:8px"><span>${firstTeam.flag || '⚽'}</span><span style="font-size:13px;color:var(--fg-4)">${firstTeam.name} — sem jogo</span></div>`;
            }
        } else {
            html += `<div class="dash-list-item" style="gap:8px"><span>⚽</span><span style="font-size:13px;color:var(--fg-4)">Adicione um time no Hub</span></div>`;
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

        const dayEvents = Agenda.getEventsByDay(this._agendaYear, this._agendaMonth);
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
            const evts = dayEvents[d] || [];
            const dots = evts.slice(0, 3).map(e => `<div class="cal-dot" style="background:${Agenda.catColor(e.cat)}"></div>`).join('');
            html += `<div class="cal-day${isToday ? ' today' : ''}${isSelected ? ' selected' : ''}" onclick="orbit.selectDay('${ds}')">
                <span class="cal-day-num">${d}</span>
                ${dots ? `<div class="cal-dots-row">${dots}</div>` : ''}
            </div>`;
        }

        const remaining = (7 - ((firstDay + daysInMonth) % 7)) % 7;
        for (let i = 1; i <= remaining; i++) {
            html += `<div class="cal-day other-month"><span class="cal-day-num">${i}</span></div>`;
        }

        html += '</div>';
        cal.innerHTML = html;
        this._initCalSwipe();
    }

    _initCalSwipe() {
        const calEl = document.getElementById('agenda-cal');
        if (!calEl || calEl._swipeInit) return;
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

    async deleteEvt() {
        if (!this._editingEvtId) return;
        const ok = await this._confirm('Excluir este evento permanentemente?', { title: 'Excluir Evento', okLabel: 'Excluir', danger: true });
        if (!ok) return;
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
        const s = Finance.getSummary(this._finYear, this._finMonth);
        const fmt = Finance.fmt;

        const balEl = document.getElementById('fin-balance');
        const incEl = document.getElementById('fin-income');
        const expEl = document.getElementById('fin-expenses');
        if (balEl) { balEl.textContent = fmt(s.balance); balEl.style.color = s.balance >= 0 ? 'var(--ok)' : 'var(--err)'; }
        if (incEl) incEl.textContent = fmt(s.income);
        if (expEl) expEl.textContent = fmt(s.expenses);

        const lbl = document.getElementById('fin-month-lbl');
        if (lbl) lbl.textContent = `${MONTHS_PT[this._finMonth - 1]} ${this._finYear}`;

        this._renderTxList();
        this.renderFinanceCard();
        this._renderFinChart(s);
        this._renderFinBarChart();
        this._renderParetoFin(s.txs);
        this._renderBudgets();
    }

    _renderBudgets() {
        const list = document.getElementById('fin-budgets-list');
        if (!list) return;
        const progress = Finance.getBudgetProgress(this._finYear, this._finMonth);
        if (!progress.length) {
            list.innerHTML = '<div class="fin-budgets-empty">Nenhuma meta definida ainda.</div>';
            return;
        }
        list.innerHTML = progress.map(p => {
            const over = p.spent > p.limit;
            return `<div class="fin-budget-row">
                <div class="fin-budget-top">
                    <span class="fin-budget-name">${p.icon} ${p.name}</span>
                    <span class="fin-budget-vals ${over ? 'fin-budget-over' : ''}">${Finance.fmt(p.spent)} / ${Finance.fmt(p.limit)}</span>
                    <button class="fin-budget-del" onclick="orbit.removeBudget('${p.id}')">×</button>
                </div>
                <div class="fin-budget-bar"><div class="fin-budget-fill ${over ? 'fin-budget-over' : ''}" style="width:${p.pct}%"></div></div>
            </div>`;
        }).join('');
    }

    toggleBudgetForm() {
        const form = document.getElementById('fin-budget-form');
        if (!form) return;
        const show = form.style.display === 'none';
        form.style.display = show ? 'flex' : 'none';
        if (show) {
            const sel = document.getElementById('budget-cat-sel');
            const existing = Object.keys(Finance.getBudgets());
            sel.innerHTML = FIN_CATS.filter(c => c.type === 'expense' && !existing.includes(c.id))
                .map(c => `<option value="${c.id}">${c.icon} ${c.name}</option>`).join('');
        }
    }

    saveBudget() {
        const catId = document.getElementById('budget-cat-sel')?.value;
        const amount = parseFloat(document.getElementById('budget-amount-inp')?.value);
        if (!catId || !amount || amount <= 0) return UI.toast('Escolha a categoria e um valor válido.', 'err');
        Finance.setBudget(catId, amount);
        document.getElementById('budget-amount-inp').value = '';
        document.getElementById('fin-budget-form').style.display = 'none';
        this._renderBudgets();
        UI.toast('Meta salva!', 'ok');
    }

    removeBudget(catId) {
        Finance.removeBudget(catId);
        this._renderBudgets();
    }

    finPrevMonth() {
        if (this._finMonth === 1) { this._finMonth = 12; this._finYear--; }
        else this._finMonth--;
        this.renderFinanceSec();
    }

    finNextMonth() {
        const now = new Date();
        if (this._finYear === now.getFullYear() && this._finMonth === now.getMonth() + 1) return;
        if (this._finMonth === 12) { this._finMonth = 1; this._finYear++; }
        else this._finMonth++;
        this.renderFinanceSec();
    }

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
        const slices = byCat.slice(0, 7);

        if (canvas._finChartRAF) cancelAnimationFrame(canvas._finChartRAF);
        let progress = 0;
        const animate = () => {
            ctx.clearRect(0, 0, W, H);
            progress = Math.min(progress + 0.06, 1);
            const ease = 1 - Math.pow(1 - progress, 3);

            let angle = -Math.PI / 2;
            slices.forEach((cat, i) => {
                const slice = (cat.total / total) * Math.PI * 2 * ease;
                ctx.beginPath();
                ctx.moveTo(cx, cy);
                ctx.arc(cx, cy, r, angle, angle + slice);
                ctx.closePath();
                ctx.fillStyle = COLORS[i % COLORS.length];
                ctx.fill();
                angle += slice;
            });

            ctx.beginPath();
            ctx.arc(cx, cy, r * 0.52, 0, Math.PI * 2);
            ctx.fillStyle = '#080808';
            ctx.fill();

            if (progress >= 0.95) {
                ctx.textAlign = 'center';
                ctx.fillStyle = 'rgba(255,255,255,0.9)';
                ctx.font = `700 13px Arial, sans-serif`;
                ctx.fillText(Finance.fmt(total), cx, cy + 5);
                ctx.fillStyle = 'rgba(255,255,255,0.4)';
                ctx.font = `10px Arial, sans-serif`;
                ctx.fillText('GASTOS', cx, cy - 9);
            }

            const lx = W * 0.56;
            ctx.textAlign = 'left';
            byCat.slice(0, Math.min(5, byCat.length)).forEach((cat, i) => {
                const y = 20 + i * 36;
                ctx.fillStyle = COLORS[i % COLORS.length];
                ctx.beginPath();
                ctx.arc(lx + 5, y - 3, 5, 0, Math.PI * 2);
                ctx.fill();
                ctx.fillStyle = 'rgba(255,255,255,0.5)';
                ctx.font = `10px Arial, sans-serif`;
                ctx.fillText(cat.name.slice(0, 11), lx + 14, y);
                ctx.fillStyle = 'rgba(255,255,255,0.85)';
                ctx.font = `600 12px Arial, sans-serif`;
                ctx.fillText(Finance.fmt(cat.total), lx + 14, y + 14);
                ctx.fillStyle = 'rgba(255,255,255,0.35)';
                ctx.font = `9px Arial, sans-serif`;
                ctx.fillText(`${Math.round((cat.total / total) * 100)}%`, lx + 14, y + 26);
            });

            if (progress < 1) canvas._finChartRAF = requestAnimationFrame(animate);
        };
        canvas._finChartRAF = requestAnimationFrame(animate);
    }

    _renderFinBarChart() {
        const canvas = document.getElementById('fin-bar-chart');
        if (!canvas) return;

        const months = [];
        for (let i = 5; i >= 0; i--) {
            const d = new Date();
            d.setMonth(d.getMonth() - i);
            const y = d.getFullYear(), m = d.getMonth() + 1;
            const txs = Finance.getMonth(y, m);
            months.push({
                label: MONTHS_PT[m - 1].slice(0, 3),
                income: txs.filter(t => t.type === 'income').reduce((a, b) => a + (b.amount || 0), 0),
                expense: txs.filter(t => t.type === 'expense').reduce((a, b) => a + (b.amount || 0), 0)
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
            const ih = (m.income / maxVal) * chartH;
            ctx.fillStyle = 'rgba(74,208,138,0.75)';
            ctx.beginPath();
            ctx.roundRect(x, pad.t + chartH - ih, barW, ih, [3, 3, 0, 0]);
            ctx.fill();
            const eh = (m.expense / maxVal) * chartH;
            ctx.fillStyle = 'rgba(255,90,90,0.75)';
            ctx.beginPath();
            ctx.roundRect(x + barW + 2, pad.t + chartH - eh, barW, eh, [3, 3, 0, 0]);
            ctx.fill();
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '9px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(m.label, x + barW + 1, H - 6);
        });

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

    _renderParetoFin(txs) {
        const canvas = document.getElementById('pareto-fin-chart');
        if (!canvas) return;

        const expenses = (txs || []).filter(t => t.type === 'expense');
        const insight = document.getElementById('pareto-fin-insight');
        if (expenses.length < 2) {
            canvas.style.display = 'none';
            if (insight) insight.innerHTML = '';
            return;
        }
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

        const COLORS = ['#d4af37', '#4a9eff', '#4ad08a', '#ff6b6b', '#a78bfa', '#f59e0b', '#06b6d4'];

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

            ctx.fillStyle = 'rgba(255,255,255,0.4)';
            ctx.font = '9px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(cat.name.slice(0, 6), x + barW / 2, H - 26);

            ctx.fillStyle = 'rgba(255,255,255,0.7)';
            ctx.font = '8px Arial, sans-serif';
            const pct = Math.round((cat.total / total) * 100);
            ctx.fillText(`${pct}%`, x + barW / 2, y - 4);
        });

        let cumPct = 0;
        const linePts = sorted.map((cat, i) => {
            cumPct += (cat.total / total) * 100;
            const x = pad.l + i * (barW + 4) + barW / 2;
            const y = pad.t + chartH - (Math.min(cumPct, 100) / 100) * chartH;
            return { x, y, pct: cumPct };
        });

        const p80idx = linePts.findIndex(p => p.pct >= 80);
        if (p80idx >= 0) {
            ctx.strokeStyle = 'rgba(212,175,55,0.4)';
            ctx.lineWidth = 1;
            ctx.setLineDash([3, 3]);
            ctx.beginPath();
            ctx.moveTo(linePts[p80idx].x, pad.t);
            ctx.lineTo(linePts[p80idx].x, pad.t + chartH);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        ctx.beginPath();
        ctx.moveTo(linePts[0].x, linePts[0].y);
        linePts.slice(1).forEach(p => ctx.lineTo(p.x, p.y));
        ctx.strokeStyle = 'rgba(255,255,255,0.7)';
        ctx.lineWidth = 2;
        ctx.stroke();

        linePts.forEach(p => {
            ctx.beginPath();
            ctx.arc(p.x, p.y, 3, 0, Math.PI * 2);
            ctx.fillStyle = '#fff';
            ctx.fill();
        });

        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.font = '9px Arial, sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('80%', W - pad.r, pad.t + chartH * 0.2 + 4);

        ctx.strokeStyle = 'rgba(255,255,255,0.15)';
        ctx.lineWidth = 1;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        const y80 = pad.t + chartH - (80 / 100) * chartH;
        ctx.moveTo(pad.l, y80);
        ctx.lineTo(W - pad.r, y80);
        ctx.stroke();
        ctx.setLineDash([]);

        if (insight && p80idx >= 0) {
            const topCats = sorted.slice(0, p80idx + 1).map(c => c.name).join(', ');
            const pctCats = Math.round(((p80idx + 1) / sorted.length) * 100);
            insight.innerHTML = `<span class="pi-highlight">${p80idx + 1} categoria${p80idx > 0 ? 's' : ''}</span> (${pctCats}% do total) concentram 80% dos seus gastos: <em>${topCats}</em>`;
        }
    }

    _renderParetoHab() {
        const canvas = document.getElementById('pareto-hab-chart');
        if (!canvas) return;
        const habits = Habits.getAll();
        if (!habits.length) { canvas.style.display = 'none'; return; }
        canvas.style.display = 'block';

        const rates = habits.map(h => {
            const last30 = Habits.getLast30(h);
            const done = last30.filter(d => d.done).length;
            return { name: h.icon + ' ' + h.name, rate: Math.round((done / 30) * 100) };
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

            const green = Math.round((h.rate / 100) * 160);
            ctx.fillStyle = `rgba(${80 - Math.round(h.rate * 0.3)},${100 + green},${80},0.8)`;
            ctx.beginPath();
            ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
            ctx.fill();

            ctx.fillStyle = 'rgba(255,255,255,0.6)';
            ctx.font = '8px Arial, sans-serif';
            ctx.textAlign = 'center';
            ctx.fillText(`${h.rate}%`, x + barW / 2, y - 3);

            ctx.save();
            ctx.translate(x + barW / 2, H - 4);
            ctx.rotate(-0.6);
            ctx.fillStyle = 'rgba(255,255,255,0.35)';
            ctx.font = '9px Arial, sans-serif';
            ctx.textAlign = 'right';
            ctx.fillText(h.name.slice(0, 10), 0, 0);
            ctx.restore();
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
        let txs = Finance.getMonth(this._finYear, this._finMonth);
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

    async _deleteTxPrompt(id) {
        const ok = await this._confirm('Excluir esta transação?', { title: 'Excluir Transação', okLabel: 'Excluir', danger: true });
        if (!ok) return;
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
        if (!this._editingVltId) return;
        const ok = await this._confirm('Excluir este acesso do cofre?', { title: 'Excluir Acesso', okLabel: 'Excluir', danger: true });
        if (!ok) return;
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
            const needed = (status === 'cursando' || status === 'final') ? Grades.neededGrade(g.notas, 7) : null;
            const neededHint = needed === null ? '' : needed > 10
                ? `<div class="ufpi-needed ufpi-needed-bad">precisa de ${needed} pra passar direto — só na final mesmo</div>`
                : `<div class="ufpi-needed">precisa tirar <strong>${needed}</strong> pra fechar com média 7</div>`;

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
                ${neededHint}
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
                        this._pomoBeep();
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

    _pomoBeep() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const freqs = [880, 1100, 1320];
            freqs.forEach((freq, i) => {
                const o = ctx.createOscillator();
                const g = ctx.createGain();
                o.connect(g); g.connect(ctx.destination);
                o.type = 'sine';
                o.frequency.value = freq;
                const t = ctx.currentTime + i * 0.22;
                g.gain.setValueAtTime(0.35, t);
                g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
                o.start(t); o.stop(t + 0.25);
            });
            setTimeout(() => ctx.close().catch(() => {}), 2000);
        } catch (_) {}
        if (navigator.vibrate) navigator.vibrate([200, 100, 200, 100, 400]);
        if ('Notification' in window && Notification.permission === 'granted') {
            try {
                new Notification('OS — Pomodoro 🍅', {
                    body: 'Sessão completa! Bora descansar um pouco.',
                    icon: './icon-192.png',
                    badge: './icon-192.png',
                    tag: 'pomo-done',
                    renotify: true,
                    silent: false
                });
            } catch (_) {}
        }
    }

    /* Feedback tátil categorizado */
    _haptic(type = 'light') {
        if (!navigator.vibrate) return;
        const patterns = {
            light:   [25],
            medium:  [40],
            heavy:   [70],
            success: [40, 30, 80],
            error:   [80, 60, 80],
            warning: [50, 50, 50],
            double:  [30, 50, 30]
        };
        navigator.vibrate(patterns[type] || patterns.light);
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

        const sections = ['kanban','habitos','tools','nupi','fe','esportes','mercado'];
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
        else if (sec === 'mercado') this.renderHubMercado();
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
        this._renderMood();
        this._renderHabitsHeatmap();
        const habits = Habits.getAll();
        const list = document.getElementById('hab-list');
        if (!list) return;

        const today = Habits.today();

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

        this._renderParetoHab();

        const ideasList = document.getElementById('ideas-list');
        if (ideasList && document.getElementById('hub-tools')?.style.display === '') {
            this._renderIdeasList();
        }
    }

    _renderHabitsHeatmap() {
        const container = document.getElementById('habits-heatmap-container');
        if (!container) return;
        const habits = Habits.getAll();
        if (!habits.length) { container.innerHTML = ''; return; }

        const today = new Date();
        const days = [];
        for (let i = 364; i >= 0; i--) {
            const d = new Date(today);
            d.setDate(d.getDate() - i);
            const ds = d.toISOString().slice(0, 10);
            const done = habits.filter(h => Habits.getDoneForDate(h.id, ds)).length;
            days.push({ ds, done, max: habits.length });
        }

        const COLS = Math.ceil(days.length / 7);
        const cellSize = Math.max(Math.floor((container.offsetWidth - 16) / COLS), 4);

        let html = `<div class="heatmap-grid" style="grid-template-columns:repeat(${COLS},${cellSize}px)">`;
        days.forEach(d => {
            const intensity = d.max ? Math.round((d.done / d.max) * 4) : 0;
            html += `<div class="hm-cell hm-i${intensity}" title="${d.ds}: ${d.done}/${d.max} hábitos"></div>`;
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

    _renderMood() {
        const picker = document.getElementById('mood-picker');
        const week = document.getElementById('mood-week');
        if (!picker || !week) return;
        const today = Mood.today();
        picker.querySelectorAll('.mood-emoji').forEach(btn => {
            btn.classList.toggle('active', parseInt(btn.dataset.v, 10) === today);
        });
        week.innerHTML = Mood.last7().map(d => {
            const h = d.value ? `${d.value * 20}%` : '4px';
            return `<div class="mood-bar-col" title="${d.date}">
                <div class="mood-bar ${d.value ? 'mood-v' + d.value : ''}" style="height:${h}"></div>
                <span class="mood-bar-day">${d.day}</span>
            </div>`;
        }).join('');
    }

    setMood(value) {
        Mood.setToday(value);
        this._renderMood();
        if (navigator.vibrate) navigator.vibrate(20);
        UI.toast(`Anotado: ${Mood.labelFor(value)}`, 'ok', 1600);
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
        Loader.show('CARREGANDO ESPORTES', [
            'Buscando dados dos times',
            'Carregando classificação',
            'Buscando próximos jogos'
        ], 450);
        // Times
        this._renderTeamsList();
        Entertainment.getTeams().forEach(t => {
            this._loadTeamGame(t);
            this._loadTeamResults(t);
            this._loadTeamStanding(t);
        });

        // Alertas de transferência
        this._renderTransferWatches();

        // Notícias — carrega aba ativa
        this._currentNewsTab = this._currentNewsTab || 'geral';
        document.querySelectorAll('.news-sub-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`ntab-${this._currentNewsTab}`)?.classList.add('active');
        this._renderNewsSkeleton();
        this._loadNewsForTab(this._currentNewsTab);

        // F1
        const f1Next = document.getElementById('f1-next-card');
        const f1Stand = document.getElementById('f1-standings');
        if (f1Next) f1Next.innerHTML = '<div style="color:var(--fg-4);font-size:13px">Carregando F1...</div>';
        if (f1Stand) f1Stand.innerHTML = '';

        const [race, standings] = await Promise.all([
            Entertainment.getF1NextRace(),
            Entertainment.getF1Standings()
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
                f1Next.innerHTML = '<div style="color:var(--fg-4);font-size:13px">Sem dados de corrida.</div>';
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

        this._renderFighters();
        this._renderPS5();
        Loader.hide(150);
    }

    /* ── BOXE / MMA — LUTADORES ─────────────────────── */
    _renderFighters() {
        const el = document.getElementById('fighter-list');
        if (!el) return;
        const fighters = Entertainment.getFighters();
        if (!fighters.length) {
            el.innerHTML = `<div class="fin-empty" style="padding:14px 0;text-align:center;line-height:1.8">
                Nenhum lutador ainda.<br><span style="font-size:12px;color:var(--fg-4)">Adicione um nome abaixo.</span>
            </div>`;
            return;
        }
        const sportLabel = { boxing: '🥊 Boxe', ufc: '🥋 UFC', pfl: '🥋 PFL', bellator: '🥋 Bellator' };
        el.innerHTML = fighters.map(f => `
            <div class="fighter-card">
                <div class="fc-hdr">
                    <span class="fc-sport">${sportLabel[f.sport] || '🥊'}</span>
                    <span class="fc-name">${(f.name || '').replace(/</g,'&lt;')}</span>
                    <button class="stc-del" onclick="orbit.removeFighter('${f.id}')">×</button>
                </div>
                <div class="fc-event" id="fce-${f.id}"><span style="color:var(--fg-4);font-size:12px">Buscando próxima luta...</span></div>
            </div>
        `).join('');

        fighters.forEach(f => this._loadFighterEvent(f));
    }

    async _loadFighterEvent(fighter) {
        const el = document.getElementById(`fce-${fighter.id}`);
        if (!el) return;
        const ev = await Entertainment.getFighterNextEvent(fighter);
        if (!ev) {
            el.innerHTML = '<span style="color:var(--fg-4);font-size:12px">Sem luta marcada nas próximas semanas.</span>';
            return;
        }
        const { fmtDate, fmtTime } = Entertainment.formatGameDate(ev.date);
        const tag = ev.live ? '🔴 AO VIVO' : `${fmtDate} · ${fmtTime}`;
        const card = ev.name || (ev.fighters || []).join(' vs ');
        el.innerHTML = `
            <div class="fc-event-title">${card.replace(/</g,'&lt;')}</div>
            <div class="fc-event-meta">${tag}${ev.venue ? ` · ${ev.venue}` : ''}</div>
        `;
    }

    addFighter() {
        const nameEl = document.getElementById('fighter-name-inp');
        const sportEl = document.getElementById('fighter-sport-sel');
        const name = nameEl?.value.trim();
        const sport = sportEl?.value || 'boxing';
        if (!name) return UI.toast('Digite o nome do lutador!', 'err');
        Entertainment.addFighter(name, sport);
        if (nameEl) nameEl.value = '';
        this._renderFighters();
        UI.toast('Lutador adicionado!', 'ok');
    }

    removeFighter(id) {
        Entertainment.removeFighter(id);
        this._renderFighters();
        if (navigator.vibrate) navigator.vibrate(30);
    }

    /* ── TIMES ──────────────────────────────────────── */
    _renderTeamsList() {
        const el = document.getElementById('sport-teams-list');
        if (!el) return;
        const teams = Entertainment.getTeams();
        if (!teams.length) {
            el.innerHTML = `<div class="fin-empty" style="padding:14px 0;text-align:center;line-height:1.8">
                Nenhum time ainda.<br><span style="font-size:12px;color:var(--fg-4)">Toque em + para buscar</span>
            </div>`;
            return;
        }
        el.innerHTML = teams.map(t => `
            <div class="sport-team-card">
                <div class="stc-hdr">
                    <span class="stc-flag">${t.flag || '⚽'}</span>
                    <span class="stc-name">${t.name}</span>
                    <div class="stc-actions">
                        <button class="stc-btn-sm" onclick="orbit.sportViewTransfers('${t.tmId || ''}', ${JSON.stringify(t.name).replace(/"/g,'&quot;')})">Transf.</button>
                        <button class="stc-del" onclick="orbit.sportRemoveTeam('${t.id}')">×</button>
                    </div>
                </div>
                <div class="stc-results" id="stc-results-${t.id}"></div>
                <div class="stcg" id="stcg-${t.id}"><span style="color:var(--fg-4);font-size:12px">Buscando...</span></div>
                <div class="stc-standing" id="stc-stand-${t.id}"></div>
            </div>
        `).join('');
    }

    async _loadTeamGame(team) {
        const el = document.getElementById(`stcg-${team.id}`);
        if (!el) return;
        const game = await Entertainment.getTeamNext(team.espnId, team.espnLeague);
        if (!game) {
            el.innerHTML = '<span style="color:var(--fg-4);font-size:12px">Próximo jogo não encontrado</span>';
            return;
        }
        const { fmtDate, fmtTime } = Entertainment.formatGameDate(game.date);
        const score = (game.homeScore !== null && game.awayScore !== null) ? `${game.homeScore}–${game.awayScore}` : '×';
        el.innerHTML = `
            <div class="stcg-teams">${game.home} <span class="stcg-score">${score}</span> ${game.away}</div>
            <div class="stcg-info">${game.live ? '🔴 AO VIVO' : `${fmtDate} · ${fmtTime}`}</div>
        `;
    }

    async _loadTeamResults(team) {
        const el = document.getElementById(`stc-results-${team.id}`);
        if (!el) return;
        const results = await Entertainment.getTeamLastResults(team.espnId, team.espnLeague);
        if (!results.length) { el.innerHTML = ''; return; }
        const cls = { W: 'chip-win', L: 'chip-loss', D: 'chip-draw' };
        el.innerHTML = `<div class="stc-chips-row">${results.map(r =>
            `<div class="stc-chip ${cls[r.result]}" title="${r.opp}: ${r.myScore}×${r.oppScore}">${r.result}</div>`
        ).join('')}</div>`;
    }

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

    sportShowAddModal() {
        const m = document.getElementById('sport-add-modal');
        if (m) { m.style.display = 'flex'; }
    }

    sportHideAddModal() {
        const m = document.getElementById('sport-add-modal');
        if (m) m.style.display = 'none';
        const r = document.getElementById('sport-search-results');
        if (r) r.innerHTML = '';
        const i = document.getElementById('sport-search-inp');
        if (i) i.value = '';
        this._sportSearchResults = null;
    }

    async sportSearchTeam() {
        const query = document.getElementById('sport-search-inp')?.value?.trim();
        const league = document.getElementById('sport-search-league')?.value;
        if (!query) return UI.toast('Digite o nome do time!', 'err');
        if (!league) return UI.toast('Selecione a liga!', 'err');

        const el = document.getElementById('sport-search-results');
        if (el) el.innerHTML = '<div style="color:var(--fg-4);font-size:13px;padding:10px 0">Buscando...</div>';

        const [espnResults, tmResults] = await Promise.all([
            Entertainment.searchESPNTeam(query, league),
            Entertainment.searchTMTeam(query)
        ]);

        if (!el) return;
        if (!espnResults.length) {
            el.innerHTML = '<div style="color:var(--fg-4);font-size:13px;padding:10px 0">Nenhum time encontrado. Tente outra liga.</div>';
            return;
        }

        this._sportSearchResults = espnResults.map(t => {
            const tmMatch = tmResults.find(tm =>
                tm.name.toLowerCase().includes(t.name.split(' ')[0].toLowerCase()) ||
                t.name.toLowerCase().includes(tm.name.split(' ')[0].toLowerCase())
            );
            return { ...t, tmId: tmMatch?.tmId || '', tmName: tmMatch?.name || '', league };
        });

        el.innerHTML = this._sportSearchResults.map((t, i) => `
            <div class="sport-result-item" onclick="orbit._sportSelectResult(${i})">
                <div class="sri-name">${t.name}</div>
                <div class="sri-sub" style="color:${t.tmId ? 'var(--ok)' : 'var(--fg-4)'}">
                    ${t.tmId ? `✓ Transferências TM: ${t.tmName}` : 'Transferências via link Transfermarkt'}
                </div>
            </div>
        `).join('');
    }

    _sportSelectResult(idx) {
        const t = this._sportSearchResults?.[idx];
        if (!t) return;
        const flagMap = {
            'bra': '🇧🇷', 'arg': '🇦🇷', 'esp': '🇪🇸', 'eng': '🏴󠁧󠁢󠁥󠁮󠁧󠁿',
            'ita': '🇮🇹', 'ger': '🇩🇪', 'fra': '🇫🇷', 'por': '🇵🇹',
            'conmebol': '🌎', 'uefa': '🌍', 'fifa': '🌍'
        };
        const flag = Object.entries(flagMap).find(([k]) => t.league.startsWith(k))?.[1] || '⚽';
        const team = { id: t.espnId, name: t.name, flag, espnId: t.espnId, espnLeague: t.league, tmId: t.tmId };
        const teams = Entertainment.getTeams().filter(x => x.id !== team.id);
        teams.push(team);
        Entertainment.saveTeams(teams);
        this.sportHideAddModal();
        this._renderTeamsList();
        this._loadTeamGame(team);
        this._loadTeamResults(team);
        this._loadTeamStanding(team);
        UI.toast(`${t.name} adicionado!`, 'ok');
    }

    sportRemoveTeam(id) {
        Entertainment.removeTeam(id);
        this._renderTeamsList();
        if (navigator.vibrate) navigator.vibrate(30);
    }

    async sportViewTransfers(tmId, teamName) {
        const ctx = document.getElementById('ctx');
        const ctxBody = document.getElementById('ctx-body');
        const dateEl = document.getElementById('ctx-date');
        const titleEl = document.querySelector('.ctx-title');
        if (!ctx || !ctxBody) return;

        if (titleEl) titleEl.textContent = 'TRANSFERÊNCIAS';
        if (dateEl) dateEl.textContent = (teamName || '').toUpperCase();
        ctxBody.innerHTML = '<div style="padding:20px 0;text-align:center;color:var(--fg-4);font-size:13px">Carregando Transfermarkt...</div>';
        ctx.style.display = 'flex';

        const data = tmId ? await Entertainment.getTeamTransfers(tmId) : null;
        const tmURL = Entertainment.transfermarktURL(tmId, teamName);

        const fallback = `<div style="padding:24px 16px;text-align:center">
            <div style="color:var(--fg-3);font-size:13px;line-height:1.6;margin-bottom:14px">
                Não consegui buscar as transferências automaticamente agora.<br>
                <span style="color:var(--fg-4);font-size:12px">A API pode estar fora do ar ou o time não tem cadastro.</span>
            </div>
            <a href="${tmURL}" target="_blank" rel="noopener" class="btn btn-primary" style="display:inline-block;text-decoration:none;padding:10px 18px">
                ABRIR NO TRANSFERMARKT
            </a>
        </div>`;

        if (!data || (!data.arrivals?.length && !data.departures?.length)) {
            ctxBody.innerHTML = fallback;
            return;
        }

        const renderTx = t => {
            const fee = t.fee || '—';
            const mv = t.market_value || '';
            return `<div style="padding:10px 0;border-bottom:1px solid var(--line-1)">
                <div style="font-size:13px;font-weight:600;color:var(--fg-1)">${t.name}</div>
                ${t.position ? `<div style="font-size:11px;color:var(--fg-4)">${t.position}</div>` : ''}
                <div style="font-size:12px;color:var(--fg-3);margin-top:2px">${t.from} → ${t.to}</div>
                <div style="font-size:12px;color:var(--gold);font-weight:600">${fee}${mv ? ` · VM: ${mv}` : ''}</div>
            </div>`;
        };

        const arrivals = data.arrivals || [];
        const departures = data.departures || [];

        ctxBody.innerHTML = `<div style="padding:0 16px 24px">
            ${arrivals.length ? `<div style="padding:12px 0 8px;color:var(--ok);font-size:11px;font-weight:700;letter-spacing:1px">CHEGADAS</div>${arrivals.map(renderTx).join('')}` : ''}
            ${departures.length ? `<div style="padding:12px 0 8px;color:var(--err);font-size:11px;font-weight:700;letter-spacing:1px">SAÍDAS</div>${departures.map(renderTx).join('')}` : ''}
            <div style="margin-top:14px;text-align:center">
                <a href="${tmURL}" target="_blank" rel="noopener" style="font-size:11px;color:var(--fg-4);text-decoration:underline">Ver mais no Transfermarkt</a>
            </div>
        </div>`;
    }

    /* ═══════════════════════════════════════════════
       HUB · MERCADO DE TRANSFERÊNCIAS (estilo EA FC)
       ═══════════════════════════════════════════════ */
    async renderHubMercado() {
        if (!this._mercadoFilter) this._mercadoFilter = 'global';
        if (!this._mercadoLeague) this._mercadoLeague = 'all';
        if (!this._mercadoSort) this._mercadoSort = 'date';
        this._mercadoPage = 1;
        await this._loadMercadoData();
    }

    async _loadMercadoData() {
        this._renderMercadoSkeleton();
        const data = this._mercadoFilter === 'mytime'
            ? await Entertainment.getMyTeamsTransfers()
            : await Entertainment.getGlobalTransfers(this._mercadoLeague);
        this._mercadoData = data || [];
        this._renderMercadoList();
    }

    _renderMercadoSkeleton() {
        const el = document.getElementById('mercado-list');
        if (!el) return;
        const btn = document.getElementById('mercado-load-more');
        if (btn) btn.style.display = 'none';
        el.innerHTML = [1,2,3,4,5,6].map(() => `
            <div class="mercado-sk-row">
                <div class="mercado-sk-circle"></div>
                <div class="mercado-sk-line" style="width:70%"></div>
                <div class="mercado-sk-line" style="width:60%"></div>
                <div class="mercado-sk-line" style="width:40px;margin-left:auto"></div>
            </div>
        `).join('');
    }

    mercadoFilter(f) {
        this._mercadoFilter = f;
        document.getElementById('mf-global')?.classList.toggle('active', f === 'global');
        document.getElementById('mf-mytime')?.classList.toggle('active', f === 'mytime');
        const leaguesEl = document.getElementById('mercado-leagues');
        if (leaguesEl) leaguesEl.style.display = f === 'mytime' ? 'none' : '';
        this.renderHubMercado();
    }

    mercadoLeague(lg) {
        this._mercadoLeague = lg;
        document.querySelectorAll('.ml-btn').forEach(b => b.classList.toggle('active', b.dataset.lg === lg));
        this.renderHubMercado();
    }

    mercadoSort(s) {
        this._mercadoSort = s;
        document.querySelectorAll('.ms-btn').forEach(b => b.classList.remove('active'));
        document.getElementById(`ms-${s}`)?.classList.add('active');
        this._mercadoPage = 1;
        this._renderMercadoList();
    }

    mercadoLoadMore() {
        this._mercadoPage++;
        this._renderMercadoList();
    }

    _renderMercadoList() {
        const el = document.getElementById('mercado-list');
        const btn = document.getElementById('mercado-load-more');
        if (!el) return;

        let list = this._mercadoLeague !== 'all' && this._mercadoFilter === 'mytime'
            ? this._mercadoData.filter(t => t.league === this._mercadoLeague)
            : this._mercadoData.slice();

        const sortFn = {
            date: (a, b) => this._dateMs(b.date) - this._dateMs(a.date),
            fee:  (a, b) => this._parseFee(b.fee) - this._parseFee(a.fee),
            name: (a, b) => (a.name || '').localeCompare(b.name || '')
        }[this._mercadoSort] || (() => 0);
        list = list.sort(sortFn);

        if (!list.length) {
            el.innerHTML = `<div style="padding:30px 16px;text-align:center;color:var(--fg-4);font-size:13px">
                Nenhuma transferência encontrada agora.
            </div>`;
            if (btn) btn.style.display = 'none';
            return;
        }

        const pageSize = 20;
        const visible = list.slice(0, this._mercadoPage * pageSize);
        this._mercadoVisible = visible;
        el.innerHTML = visible.map((t, i) => this._buildTransferCard(t, i)).join('');
        if (btn) btn.style.display = visible.length < list.length ? '' : 'none';
    }

    _buildTransferCard(t, i) {
        const dateStr = this._formatTransferDate(t.date);
        const feeInfo = this._formatFee(t.fee);
        const crest = (name) => name && name !== '?'
            ? `<div class="mc-crest-ph">${name.slice(0, 2).toUpperCase()}</div>`
            : `<div class="mc-crest-ph">?</div>`;
        const [first, ...rest] = (t.name || '?').split(' ');
        const last = rest.join(' ') || first;

        return `<div class="mercado-card" onclick="orbit.openTransferDetail(${i})">
            <div class="mc-date">${dateStr}</div>
            <div class="mc-player">
                <div class="mc-avatar">👤</div>
                <div class="mc-name-wrap">
                    <div class="mc-first">${rest.length ? first : ''}</div>
                    <div class="mc-last">${last}</div>
                    ${t.position ? `<div class="mc-pos">${t.position}</div>` : ''}
                </div>
            </div>
            <div class="mc-clubs">
                ${crest(t.from)}
                <span class="mc-arrow">→</span>
                ${crest(t.to)}
            </div>
            <div class="mc-fee ${feeInfo.cls}">${feeInfo.label}</div>
        </div>`;
    }

    openTransferDetail(i) {
        const t = this._mercadoVisible?.[i];
        if (!t) return;
        const feeInfo = this._formatFee(t.fee);
        const overlay = document.createElement('div');
        overlay.className = 'mercado-detail';
        overlay.onclick = (e) => { if (e.target === overlay) overlay.remove(); };
        overlay.innerHTML = `<div class="mercado-detail-content">
            <div class="md-player-row">
                <div class="md-avatar-lg">👤</div>
                <div class="md-player-info">
                    <h3>${t.name}</h3>
                    <p>${t.position || ''}${t.position ? ' · ' : ''}${this._formatTransferDate(t.date, true)}</p>
                </div>
            </div>
            <div class="md-transfer-visual">
                <div class="md-club"><div class="mc-crest-ph">${(t.from || '?').slice(0,2).toUpperCase()}</div><span class="md-club-name">${t.from || '?'}</span></div>
                <div class="md-arrow-big">→</div>
                <div class="md-club"><div class="mc-crest-ph">${(t.to || '?').slice(0,2).toUpperCase()}</div><span class="md-club-name">${t.to || '?'}</span></div>
            </div>
            <div class="md-fee-big ${feeInfo.cls}">${feeInfo.label}</div>
            <div class="md-fee-label">Valor da transferência</div>
        </div>`;
        document.body.appendChild(overlay);
    }

    _dateMs(d) {
        if (!d) return 0;
        if (typeof d === 'number') return d > 1e12 ? d : d * 1000;
        const parsed = Date.parse(d);
        return isNaN(parsed) ? 0 : parsed;
    }

    _formatTransferDate(d, full = false) {
        const ms = this._dateMs(d);
        if (!ms) return full ? '—' : '—\n—';
        const date = new Date(ms);
        if (full) return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
        const day = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }).replace('.', '');
        const year = date.getFullYear();
        return `${day}<span>${year}</span>`;
    }

    _parseFee(fee) {
        if (fee == null) return -1;
        if (typeof fee === 'number') return fee;
        const s = String(fee).toLowerCase();
        if (s.includes('loan') || s.includes('empr')) return -2;
        if (s.includes('free') || s.includes('livre') || s === '-' || s === '—') return -3;
        const m = s.match(/([\d.,]+)\s*(m|mil|k|bn|b)?/);
        if (!m) return -1;
        let n = parseFloat(m[1].replace(/\./g, '').replace(',', '.'));
        const unit = m[2];
        if (unit === 'm') n *= 1e6;
        else if (unit === 'k' || unit === 'mil') n *= 1e3;
        else if (unit === 'bn' || unit === 'b') n *= 1e9;
        return isNaN(n) ? -1 : n;
    }

    _formatFee(fee) {
        if (fee == null || fee === '—' || fee === '-') return { label: '—', cls: 'unknown' };
        const s = String(fee).toLowerCase();
        if (s.includes('loan') || s.includes('empr')) return { label: 'Empréstimo', cls: 'loan' };
        if (s.includes('free') || s.includes('livre')) return { label: 'Livre', cls: 'free' };
        return { label: String(fee), cls: '' };
    }

    /* ── NOTÍCIAS ──────────────────────────────────── */
    _renderNewsSkeleton() {
        const el = document.getElementById('sport-news-list');
        if (!el) return;
        el.innerHTML = [1,2,3,4].map(() => `
            <div class="skeleton-card" style="padding:12px;margin-bottom:6px">
                <div class="skeleton skeleton-line lg w80" style="margin-bottom:8px"></div>
                <div class="skeleton skeleton-line sm w40"></div>
            </div>
        `).join('');
    }

    reloadNews() {
        const tab = this._currentNewsTab || 'geral';
        try {
            sessionStorage.removeItem('ent_news_mix');
            sessionStorage.removeItem('ent_news_top');
            sessionStorage.removeItem('ent_news_tech');
            sessionStorage.removeItem('ent_news_futebol');
            sessionStorage.removeItem('ent_news_transfer');
        } catch (_) {}
        this._renderNewsSkeleton();
        this._loadNewsForTab(tab);
    }

    switchNewsTab(tab) {
        this._currentNewsTab = tab;
        document.querySelectorAll('.news-sub-tab').forEach(b => b.classList.remove('active'));
        document.getElementById(`ntab-${tab}`)?.classList.add('active');
        this._renderNewsSkeleton();
        this._loadNewsForTab(tab);
    }

    _loadNewsForTab(tab) {
        if (tab === 'futebol') {
            Entertainment.getFootballNews(12).then(news => this._renderNewsList(news));
        } else if (tab === 'transfer') {
            Entertainment.getTransferNews(12).then(news => this._renderNewsList(news, true));
        } else {
            Entertainment.getTechNews().then(news => this._renderNewsList(news));
        }
    }

    _renderNewsList(news, isTransfer = false) {
        const el = document.getElementById('sport-news-list');
        if (!el) return;
        if (!news.length) {
            el.innerHTML = `<div style="color:var(--fg-4);font-size:13px;padding:8px 0">Sem notícias agora.
                <button onclick="orbit.reloadNews()" style="margin-left:8px;background:var(--bg-4);border:1px solid var(--line-2);color:var(--fg-2);padding:4px 10px;border-radius:8px;font-size:12px;cursor:pointer">Tentar de novo</button></div>`;
            return;
        }
        el.innerHTML = news.map(n => {
            const meta = [n.source, n.time].filter(Boolean).join(' · ');
            const badge = isTransfer ? '<span class="transfer-badge">🔁</span> ' : '';
            return `<a class="news-item" href="${n.url}" target="_blank" rel="noopener">
                <div class="news-title">${badge}${(n.title || '').replace(/</g,'&lt;')}</div>
                <div class="news-meta">${meta.replace(/</g,'&lt;')}</div>
            </a>`;
        }).join('');
    }

    /* ── ALERTAS DE TRANSFERÊNCIA ──────────────────── */
    _renderTransferWatches() {
        const el = document.getElementById('transfer-watches-list');
        if (!el) return;
        const watches = Entertainment.getTransferWatches();
        if (!watches.length) {
            el.innerHTML = '<div style="padding:8px 16px;color:var(--fg-4);font-size:12px">Nenhum time monitorado ainda.</div>';
            return;
        }
        el.innerHTML = watches.map(w => `
            <div class="transfer-watch-card">
                <div class="twc-team">⚽ ${(w.team || '').replace(/</g,'&lt;')}</div>
                <div class="twc-last">${w.lastTitle ? w.lastTitle.slice(0, 60) + '...' : 'Aguardando novidades...'}</div>
                <button class="stc-del" onclick="orbit.removeTransferWatch('${w.id}')">×</button>
            </div>
        `).join('');
    }

    addTransferWatch() {
        const inp = document.getElementById('transfer-watch-inp');
        const name = inp?.value.trim();
        if (!name) return UI.toast('Digite o nome do time!', 'err');
        const id = Entertainment.addTransferWatch(name);
        if (!id) return UI.toast('Time já monitorado!', 'warn');
        if (inp) inp.value = '';
        this._renderTransferWatches();
        UI.toast(`Monitorando ${name}! 🔔`, 'ok');
        if (navigator.vibrate) navigator.vibrate([50, 30, 50]);
        this._checkTransferAlerts();
    }

    removeTransferWatch(id) {
        Entertainment.removeTransferWatch(id);
        this._renderTransferWatches();
        if (navigator.vibrate) navigator.vibrate(30);
    }

    _startTransferAlerts() {
        if (this._transferAlertInterval) clearInterval(this._transferAlertInterval);
        this._transferAlertInterval = setInterval(() => this._checkTransferAlerts(), 15 * 60 * 1000);
        setTimeout(() => this._checkTransferAlerts(), 8000);
    }

    async _checkTransferAlerts() {
        const watches = Entertainment.getTransferWatches();
        if (!watches.length) return;
        for (const watch of watches) {
            try {
                const news = await Entertainment.checkTeamTransferNews(watch.team);
                if (!news.length) continue;
                const latest = news[0];
                if (!latest.title || latest.title === watch.lastTitle) continue;
                Entertainment.updateWatchLastSeen(watch.id, latest.title);
                this._renderTransferWatches();
                if (Notification.permission === 'granted') {
                    try {
                        const sw = await navigator.serviceWorker.ready;
                        await sw.showNotification(`⚽ ${watch.team} — transferência!`, {
                            body: latest.title,
                            icon: './icon-192.png',
                            badge: './icon-192.png',
                            tag: `transfer-${watch.id}`,
                            renotify: true,
                            vibrate: [200, 100, 200, 100, 200],
                            data: { url: latest.url }
                        });
                    } catch (_) {
                        new Notification(`⚽ ${watch.team} — transferência!`, {
                            body: latest.title,
                            icon: './icon-192.png',
                            tag: `transfer-${watch.id}`
                        });
                    }
                }
            } catch (_) {}
        }
    }

    /* ── ORBIT PREFERÊNCIAS EVOLUTIVAS ─────────────── */
    _getOrbitPrefs() {
        return Store.get('orbit_prefs', { topics: [], lastUpdated: null });
    }

    _updateOrbitPrefs() {
        const history = Store.getCurMsgs();
        if (history.length < 6) return;

        const recentAssistant = history.slice(-16).filter(m => m.role === 'assistant').map(m => (m.content || '').toLowerCase()).join(' ');
        if (!recentAssistant.length) return;

        const topicMap = {
            'futebol': ['futebol', 'gol', 'flamengo', 'palmeiras', 'brasileirão', 'campeonato', 'bola', 'artilheiro'],
            'F1': ['fórmula 1', 'corrida', 'hamilton', 'verstappen', 'pit stop', 'grid', 'circuito'],
            'música': ['música', 'sertanejo', 'rap', 'playlist', 'beat', 'funk', 'letra'],
            'estudos': ['cálculo', 'equação', 'integral', 'derivada', 'física', 'estudo', 'prova'],
            'programação': ['código', 'javascript', 'html', 'css', 'github', 'api', 'pwa', 'deploy'],
            'finanças': ['dinheiro', 'investimento', 'gasto', 'financeiro', 'poupança', 'renda'],
            'fé': ['oração', 'deus', 'bíblia', 'versículo', 'cristão', 'jesus', 'graça'],
            'games': ['ps5', 'jogo', 'game', 'cyberpunk', 'missão', 'platina', 'spider-man'],
            'mma/boxe': ['ufc', 'luta', 'boxe', 'nocaute', 'ko', 'ring', 'whindersson'],
            'negócios': ['cliente', 'projeto', 'negócio', 'empresa', 'contrato', 'dax', 'nupieepro'],
            'design': ['adobe', 'figma', 'layout', 'tipografia', 'arte', 'identidade visual'],
            'tecnologia': ['inteligência artificial', 'ia', 'chatgpt', 'modelo', 'llm', 'openai']
        };

        const prefs = this._getOrbitPrefs();
        const detected = [];
        for (const [topic, keywords] of Object.entries(topicMap)) {
            if (keywords.some(kw => recentAssistant.includes(kw))) detected.push(topic);
        }

        if (!detected.length) return;

        const merged = [...new Set([...(prefs.topics || []), ...detected])].slice(-15);
        Store.set('orbit_prefs', { topics: merged, lastUpdated: new Date().toISOString() });
    }

    /* ── SYMBOL PICKER ─────────────────────────────── */
    _getSymbolCategories() {
        return [
            {
                label: '∫ Cálculo',
                syms: ['∫', '∬', '∭', '∮', '∂', '∇', 'Δ', 'δ', '∞', '→', '∑', '∏', 'lim', 'dx', 'dy', 'dt', 'du', 'dθ', '∂/∂x', 'd/dx', 'd²/dx²', 'ℝ', 'ℕ', 'ℤ', 'ℚ', 'ℂ', 'ε-δ', 'f\'(x)', 'f\'\'(x)', '|x|']
            },
            {
                label: '≠ Operadores',
                syms: ['±', '∓', '×', '÷', '≠', '≈', '≡', '≤', '≥', '≪', '≫', '∝', '∴', '∵', '√', '∛', '∜', '⊕', '⊗', '⌊x⌋', '⌈x⌉', '‖v‖', 'ℓ', '∠', '°', '′', '″']
            },
            {
                label: 'α Gregos',
                syms: ['α', 'β', 'γ', 'δ', 'ε', 'ζ', 'η', 'θ', 'ι', 'κ', 'λ', 'μ', 'ν', 'ξ', 'π', 'ρ', 'σ', 'τ', 'υ', 'φ', 'χ', 'ψ', 'ω', 'Γ', 'Δ', 'Θ', 'Λ', 'Ξ', 'Π', 'Σ', 'Φ', 'Ψ', 'Ω']
            },
            {
                label: '∩ Conjuntos',
                syms: ['∩', '∪', '⊂', '⊃', '⊆', '⊇', '⊄', '⊉', '∈', '∉', '∅', '\\', '×', 'ℙ(A)', 'card(A)', '#A', '∀', '∃', '∄', '¬', '∧', '∨', '⇒', '⇔', '⊢', '⊨']
            },
            {
                label: 'EDO',
                syms: ["y'", "y''", "y'''", 'dy/dx', 'd²y/dx²', 'y(0)=', "y'(0)=", 'e^{rx}', 'W(y₁,y₂)', 'y_h', 'y_p', 'y_g', 'λ₁', 'λ₂', 'r²+', 'c₁', 'c₂', 'sen(x)', 'cos(x)', 'e^x', 'cosh(x)', 'sinh(x)', 'P(x)', 'Q(x)', 'μ(x)']
            },
            {
                label: '🔥 Emojis',
                syms: ['🔥', '💀', '😂', '🤔', '👀', '💡', '🎯', '⚡', '🚀', '🏆', '✅', '❌', '🙏', '😤', '🤝', '🥲', '💪', '🎮', '⚽', '🏎️', '🥊', '😎', '🧠', '💯', '👏', '🫡', '😮', '🔑', '📚', '⚠️', '🎉', '👊', '🤯', '😅', '🫶', '✨']
            }
        ];
    }

    showSymbolPicker() {
        const existing = document.getElementById('symbol-picker');
        if (existing) {
            const isOpen = existing.classList.contains('open');
            existing.classList.toggle('open', !isOpen);
            document.getElementById('sym-btn')?.classList.toggle('active', !isOpen);
            return;
        }
        const cats = this._getSymbolCategories();
        const picker = document.createElement('div');
        picker.id = 'symbol-picker';
        picker.className = 'symbol-picker open';

        const tabsHtml = cats.map((c, i) =>
            `<button class="sym-cat-btn${i === 0 ? ' active' : ''}" onclick="orbit._symCat(${i})">${c.label}</button>`
        ).join('');

        const pagesHtml = cats.map((c, i) =>
            `<div class="sym-page${i === 0 ? ' active' : ''}" id="sym-page-${i}">${
                c.syms.map(s => `<button class="sym-btn" onclick="orbit._insertSymbol(${JSON.stringify(s)})">${s}</button>`).join('')
            }</div>`
        ).join('');

        picker.innerHTML = `
            <div class="sym-cats">${tabsHtml}</div>
            <div class="sym-grid">${pagesHtml}</div>
        `;

        const inpArea = document.querySelector('.inp-area');
        inpArea?.parentNode?.insertBefore(picker, inpArea);
        document.getElementById('sym-btn')?.classList.add('active');
    }

    hideSymbolPicker() {
        const el = document.getElementById('symbol-picker');
        if (el) el.classList.remove('open');
        document.getElementById('sym-btn')?.classList.remove('active');
    }

    _symCat(idx) {
        document.querySelectorAll('.sym-cat-btn').forEach((b, i) => b.classList.toggle('active', i === idx));
        document.querySelectorAll('.sym-page').forEach((p, i) => p.classList.toggle('active', i === idx));
    }

    _insertSymbol(sym) {
        const inp = document.getElementById('msginput');
        if (!inp) return;
        const start = inp.selectionStart ?? inp.value.length;
        const end = inp.selectionEnd ?? inp.value.length;
        inp.value = inp.value.slice(0, start) + sym + inp.value.slice(end);
        const pos = start + sym.length;
        inp.setSelectionRange(pos, pos);
        inp.focus();
        this.handleInput?.();
        if (navigator.vibrate) navigator.vibrate(15);
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

        this._renderChatFromCurrent();
        UI.setStatus('online');

        const today = AI.nowBR().toISOString().slice(0, 10);
        if (localStorage.getItem('orbit_daily_q') !== today) {
            localStorage.setItem('orbit_daily_q', today);
            setTimeout(() => this._askDailyQuestion(), 1800);
        }
    }

    _renderChatFromCurrent() {
        const msgsEl = document.getElementById('msgs');
        if (!msgsEl) return;
        // Limpa mas mantém o estado vazio
        const empty = document.getElementById('empty');
        msgsEl.innerHTML = '';
        if (empty) msgsEl.appendChild(empty);

        const history = Store.getCurMsgs();
        if (history.length) {
            if (empty) empty.style.display = 'none';
            history.slice(-20).forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    UI.addMsg(m.role === 'user' ? 'user' : 'sophy', m.content || '', false, null);
                }
            });
            requestAnimationFrame(() => { msgsEl.scrollTop = msgsEl.scrollHeight; });
        } else if (empty) {
            empty.style.display = 'flex';
        }
        this._updateConvTitle();
    }

    _updateConvTitle() {
        const conv = Store.getCurConv();
        const el = document.getElementById('hdr-conv-title');
        if (el) el.textContent = conv.title || 'Nova conversa';
    }

    /* ── CONVERSATION HISTORY ── */
    openConvList() {
        const m = document.getElementById('conv-modal');
        if (!m) return;
        this._renderConvList();
        m.style.display = 'flex';
    }

    closeConvList() {
        const m = document.getElementById('conv-modal');
        if (m) m.style.display = 'none';
    }

    _renderConvList() {
        const list = document.getElementById('conv-list');
        if (!list) return;
        const convs = [...Store.getConvs()].sort((a, b) => (b.ts || 0) - (a.ts || 0));
        const curId = Store.getCurConvId();

        list.innerHTML = convs.map(c => {
            const last = (c.msgs || []).slice(-1)[0];
            const snippet = last ? (last.content || '').replace(/\s+/g, ' ').trim().slice(0, 60) : 'Sem mensagens';
            const when = c.ts ? new Date(c.ts).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' }) : '';
            const active = c.id === curId ? ' conv-item-active' : '';
            return `<div class="conv-item${active}" data-id="${c.id}">
                <div class="conv-item-body" onclick="orbit.switchConv('${c.id}')">
                    <div class="conv-item-title">${(c.title || 'Sem título').replace(/</g,'&lt;')}</div>
                    <div class="conv-item-snippet">${snippet.replace(/</g,'&lt;')}</div>
                </div>
                <div class="conv-item-meta">
                    <span class="conv-item-date">${when}</span>
                    <button class="conv-item-del" onclick="event.stopPropagation();orbit.deleteConv('${c.id}')" title="Excluir">×</button>
                </div>
            </div>`;
        }).join('');

        if (!convs.length) {
            list.innerHTML = '<div style="padding:24px;text-align:center;color:var(--fg-4);font-size:13px">Nenhuma conversa ainda.</div>';
        }
    }

    newConv() {
        if (this.busy && this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; this.busy = false; }
        Store.newConv();
        this._renderChatFromCurrent();
        this.closeConvList();
        UI.toast('Nova conversa iniciada', 'ok');
        setTimeout(() => document.getElementById('msginput')?.focus(), 200);
    }

    switchConv(id) {
        if (id === Store.getCurConvId()) { this.closeConvList(); return; }
        if (this.busy && this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; this.busy = false; }
        Store.setCurConvId(id);
        this._renderChatFromCurrent();
        this.closeConvList();
        setTimeout(() => document.getElementById('msginput')?.focus(), 200);
    }

    async deleteConv(id) {
        const ok = await this._confirm('Apagar esta conversa?', { title: 'Apagar Conversa', okLabel: 'Apagar', danger: true });
        if (!ok) return;
        const wasActive = Store.getCurConvId() === id;
        if (wasActive && this.busy && this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; this.busy = false; }
        Store.removeConv(id);
        if (wasActive) this._renderChatFromCurrent();
        this._renderConvList();
        UI.toast('Conversa apagada', 'ok');
    }

    async _askDailyQuestion() {
        if (this.busy) return;
        const questions = [
            'E aí, como cê tá hoje de verdade?',
            'Qual a prioridade nº1 de hoje? Bora focar nela.',
            'Tem algo te pesando? Pode soltar aqui.',
            'O que tá te animando ultimamente?',
            'Dormiu bem? Como tá a energia hoje?',
            'Qual o maior perrengue da semana até agora?',
            'No que eu posso te ajudar agora?'
        ];
        const q = questions[Math.floor(Math.random() * questions.length)];
        UI.addMsg('sophy', q, false);
    }

    async handleSend(overrideText, opts = {}) {
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        const isOverride = typeof overrideText === 'string';
        const text = (isOverride ? overrideText : inp.value).trim();
        if (!text && !this.pendingImage) return;

        if (text === '/esquece') {
            Store.saveCurMsgs([]);
            this._renderChatFromCurrent();
            UI.toast('Sessão limpa.', 'ok');
            inp.value = '';
            inp.focus();
            return;
        }
        if (text.startsWith('!ideia ')) {
            IdeaVault.add(text.slice(7));
            UI.toast('Ideia salva! 💡', 'ok');
            inp.value = '';
            return;
        }

        const diagTriggers = ['diagnóstico', 'diagnostico', '/diag', 'análise geral', 'analise geral', 'status geral', 'relatório geral', 'relatorio geral', 'resumo completo'];
        if (!isOverride && diagTriggers.some(t => text.toLowerCase().includes(t))) {
            inp.value = '';
            inp.style.height = 'auto';
            await this._runDiagnostic();
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

        const cancelBtn = document.getElementById('cancel-btn');
        const sendBtn = document.getElementById('sendbtn');
        if (cancelBtn) cancelBtn.style.display = '';
        if (sendBtn) sendBtn.style.display = 'none';

        if (!opts.silent) UI.addMsg('user', text, false, this.pendingImage);
        if (!isOverride) {
            inp.value = '';
            inp.style.height = 'auto';
        }
        // Mantém o teclado aberto após o envio (mobile)
        this._keepKeyboard = true;
        try { inp.focus({ preventScroll: true }); } catch (_) { inp.focus(); }
        setTimeout(() => this._keepKeyboard = false, 400);

        // Conversa-alvo fixada no envio: a resposta sempre cai aqui, mesmo que troque de conversa
        const convId = Store.getCurConvId();
        const history = Store.getCurMsgs();
        const userMsg = { role: 'user', content: text };
        if (this.pendingImage) userMsg.image = this.pendingImage;
        history.push(userMsg);
        Store.saveMsgsToConv(convId, history);
        this._updateConvTitle();
        this.pendingImage = null;
        this.removeAttach();

        const sophyRow = UI.addMsg('sophy', '', true);
        const streamEl = sophyRow.querySelector('.m-content'); // referência direta ao nó (sem id global)
        if (streamEl) streamEl.innerHTML = '<div class="typing"><div class="tdot"></div><div class="tdot"></div><div class="tdot"></div></div>';

        const ctrl = new AbortController();
        this.abortCtrl = ctrl;
        let fullResponse = '';
        UI.setStatus('respondendo...');

        const onSameConv = () => Store.getCurConvId() === convId;

        try {
            let aiMessages = AI.getWindowedMsgs(history);
            const urlMatch = text.match(URL_RE);
            if (urlMatch) {
                try {
                    UI.setStatus('lendo URL...');
                    const jinaRes = await fetch(`https://r.jina.ai/${urlMatch[0]}`, {
                        signal: ctrl.signal,
                        headers: { 'Accept': 'text/plain', 'X-No-Cache': 'true' }
                    });
                    if (jinaRes.ok) {
                        const content = (await jinaRes.text()).slice(0, 3000).trim();
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
            } else if (AI.needsWeb(text)) {
                // Sem URL colada, mas a pergunta pede dado fresco → busca na web
                try {
                    UI.setStatus('buscando na web...');
                    Loader.show('BUSCANDO NA INTERNET', [
                        'Consultando fontes',
                        'Filtrando resultados',
                        'Preparando resposta'
                    ], 500);
                    const found = await AI.webSearch(text, ctrl.signal);
                    Loader.hide(80);
                    if (found) {
                        aiMessages = [...aiMessages];
                        const last = aiMessages[aiMessages.length - 1];
                        if (last?.role === 'user') {
                            const today = AI.nowBR().toLocaleDateString('pt-BR', { dateStyle: 'full' });
                            aiMessages[aiMessages.length - 1] = {
                                ...last,
                                content: last.content + `\n\n[BUSCA WEB — ${today}. Filtre o que é relevante, ignore ruído e responda do SEU jeito, citando fonte quando importar:\n${found}\nFIM DA BUSCA]`
                            };
                        }
                        UI.toast('Internet consultada 🌐', 'ok');
                    }
                } catch (_) { Loader.hide(0); }
                UI.setStatus('respondendo...');
            }

            const result = await AI.streamRequest(
                { messages: aiMessages, signal: ctrl.signal },
                (delta) => {
                    if (ctrl.signal.aborted) return; // ignora deltas tardios após cancelar/trocar
                    fullResponse += delta;
                    if (streamEl) streamEl.textContent = fullResponse;
                    if (onSameConv()) {
                        const msgs = document.getElementById('msgs');
                        if (msgs) msgs.scrollTop = msgs.scrollHeight;
                    }
                }
            );

            if (streamEl) streamEl.innerHTML = UI.renderMd(fullResponse);

            history.push({ role: 'assistant', content: fullResponse });
            Store.saveMsgsToConv(convId, history);
            if (onSameConv()) this._updateConvTitle();
            if (onSameConv()) this._addQuickReplies(sophyRow, fullResponse);

            if (history.length % 24 === 0) AI.summarizeSession(history);
            if (history.length % 8 === 0) this._updateOrbitPrefs();
            this._cacheResponse(text, fullResponse);
            if (result?.provider) this.updateQuota(result.provider);
            if (this._hf && fullResponse && onSameConv()) setTimeout(() => this.speak(fullResponse), 400);

        } catch (err) {
            if (err.name === 'AbortError') {
                if (streamEl) {
                    streamEl.innerHTML = fullResponse ? UI.renderMd(fullResponse) : '<em style="color:var(--fg-4)">Cancelado.</em>';
                }
                if (fullResponse) {
                    history.push({ role: 'assistant', content: fullResponse });
                    Store.saveMsgsToConv(convId, history);
                }
            } else if (!navigator.onLine || err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError') || err.message?.includes('Load failed')) {
                const cached = this._findCachedResponse(text);
                if (cached) {
                    if (streamEl) streamEl.innerHTML = UI.renderMd(cached.a) + '<div class="cache-badge">📦 cache · sem conexão</div>';
                    history.push({ role: 'assistant', content: cached.a });
                    Store.saveMsgsToConv(convId, history);
                } else if (streamEl) {
                    streamEl.innerHTML = UI.apiError('Sem conexão com a internet. Verifique sua rede e tente novamente.', () => {
                        streamEl.innerHTML = '';
                        // remove a resposta vazia do histórico e tenta novamente
                        history.pop();
                        Store.saveMsgsToConv(convId, history);
                    });
                }
                UI.toast('Sem conexão', 'warn', 4000);
            } else if (err.message?.includes('NO_GROQ_KEY') || err.message?.includes('API Key')) {
                if (streamEl) streamEl.innerHTML = UI.apiError('Chave de API não configurada. Vá em Configurações → IA para adicionar.', () => {
                    this.hideMsgCtx(); this.activeTab = 'ai'; this.openPanel();
                });
                UI.toast('Configure a API Key', 'warn', 5000);
            } else if (err.message?.includes('429') || err.message?.toLowerCase().includes('rate')) {
                if (streamEl) streamEl.innerHTML = UI.apiError('Limite de requisições atingido. Aguarde alguns segundos e tente de novo.', null);
                UI.toast('Limite de API — tente em breve', 'warn', 5000);
            } else {
                const friendly = err.message?.includes('401') ? 'Chave de API inválida. Verifique em Configurações → IA.'
                    : err.message?.includes('500') || err.message?.includes('502') ? 'Serviço temporariamente indisponível. Tente novamente.'
                    : 'Algo deu errado. Tente novamente em instantes.';
                if (streamEl) streamEl.innerHTML = UI.apiError(friendly, null);
                UI.toast('Falha na requisição', 'err');
            }
        } finally {
            if (this.abortCtrl === ctrl) this.abortCtrl = null;
            if (cancelBtn) cancelBtn.style.display = 'none';
            if (sendBtn) sendBtn.style.display = '';
            this.busy = false;
            UI.setStatus('online');
        }
    }

    cancelStream() {
        if (this.abortCtrl) { this.abortCtrl.abort(); this.abortCtrl = null; }
    }

    /* ── QUICK REPLIES ── */
    _addQuickReplies(row, responseText) {
        if (!row || !responseText || responseText.length < 12) return;
        const bubble = row.querySelector('.mbubble');
        if (!bubble) return;
        const wrap = document.createElement('div');
        wrap.className = 'quick-replies';
        wrap.innerHTML = `
            <button class="qr-chip" onclick="orbit._qrSave(this)">🧠 Guardar</button>
            <button class="qr-chip" onclick="orbit._qrMore(this)">🔁 Mais detalhes</button>
        `;
        bubble.appendChild(wrap);
    }

    _qrSave(btn) {
        const bubble = btn.closest('.mbubble');
        const txt = bubble?.querySelector('.m-content')?.innerText?.trim();
        if (!txt) return;
        const ep = Store.getEp();
        ep.push({ d: AI.dateStrBR(), s: txt.slice(0, 250) });
        Store.saveEp(ep);
        UI.toast('Guardado na memória 🧠', 'ok');
        btn.closest('.quick-replies')?.remove();
    }

    _qrMore(btn) {
        btn.closest('.quick-replies')?.remove();
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        if (!inp) return;
        inp.value = 'me dá mais detalhes sobre isso';
        this.handleSend();
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
        let val = inp.value;
        const MAX_CHARS = 4000;
        if (val.length > MAX_CHARS) {
            val = val.slice(0, MAX_CHARS);
            inp.value = val;
        }
        if (val === '/') this.showCmdPalette();
        else this.hideCmdPalette();
        inp.style.height = 'auto';
        inp.style.height = Math.min(inp.scrollHeight, 120) + 'px';
        this._updateCharIndicator(val, MAX_CHARS);
        this._updateInputModeTag(val);
    }

    _updateCharIndicator(val, max) {
        const ind = document.getElementById('char-indicator');
        const count = document.getElementById('char-count');
        const bar = document.getElementById('char-bar');
        if (!ind || !count || !bar) return;
        const len = val.length;
        if (len <= 100) { ind.style.display = 'none'; return; }
        ind.style.display = 'flex';
        count.textContent = len > 1000 ? (len / 1000).toFixed(1) + 'k' : String(len);
        const pct = Math.min(len / max, 1) * 100;
        bar.style.width = pct + '%';
        let color = 'var(--fg-3)';
        if (pct >= 90) color = '#e5484d';
        else if (pct >= 70) color = 'var(--gold)';
        bar.style.background = color;
        count.style.color = pct >= 90 ? '#e5484d' : (pct >= 70 ? 'var(--gold)' : 'var(--fg-4)');
    }

    _updateInputModeTag(val) {
        const tag = document.getElementById('inp-mode-tag');
        if (!tag) return;
        if (val.length > 15 && AI.needsWeb(val)) {
            tag.textContent = '🌐 Vai pesquisar na internet';
            tag.style.display = 'block';
        } else {
            tag.style.display = 'none';
        }
    }

    showCmdPalette() { const pal = document.getElementById('cmd-palette'); if (pal) pal.style.display = 'flex'; }
    hideCmdPalette() { const pal = document.getElementById('cmd-palette'); if (pal) pal.style.display = 'none'; }

    runCmd(cmd) {
        this.hideCmdPalette();
        const inp = document.getElementById('msginput');
        if (inp) { inp.value = ''; inp.style.height = 'auto'; }
        if (cmd === 'esquece') {
            Store.saveCurMsgs([]);
            this._renderChatFromCurrent();
            UI.toast('Sessão limpa.', 'ok');
            setTimeout(() => document.getElementById('msginput')?.focus(), 100);
        } else if (cmd === 'pinned') {
            this.showPinned();
        } else if (cmd === 'exportar') {
            this.exportChat();
        } else if (cmd === 'diag') {
            this._runDiagnostic();
        }
    }

    /* ── RESUMO DO DIA / DIAGNÓSTICO ── */
    async getDailyBrief() {
        if (this.busy) return;
        Loader.show('PREPARANDO BRIEFING', [
            'Verificando agenda',
            'Analisando hábitos',
            'Consultando finanças',
            'Sophy preparando resumo'
        ], 500);

        const agCtx = AI.agendaContext();
        const s = Finance.getSummary(new Date().getFullYear(), new Date().getMonth() + 1);
        const finCtx = `\nSaldo atual: ${Finance.fmt(s.balance)}${s.balance < 0 ? ' (negativo)' : ''}, ${s.txs.filter(t => t.type === 'expense').length} gastos no mês`;
        const habits = Habits.getAll();
        const today = Habits.today();
        const done = habits.filter(h => (h.done || []).includes(today)).length;
        const habCtx = `\nHábitos: ${done}/${habits.length} feitos hoje`;

        const prompt = `O Pai acabou de abrir o app. Dê um briefing diário CURTO (máx 4 linhas) no teu estilo: o que tem na agenda hoje, como estão os hábitos, situação financeira resumida, e encerra com uma motivação rápida. Sem formatação, papo de WhatsApp mesmo.\n${agCtx}${finCtx}${habCtx}`;

        this.openChat();
        await new Promise(r => setTimeout(r, 300));
        Loader.hide(100);
        await this.handleSend(prompt, { silent: true });
    }

    async _runDiagnostic() {
        if (this.busy) return;
        Loader.show('RODANDO DIAGNÓSTICO', [
            'Analisando finanças',
            'Verificando hábitos',
            'Consultando agenda',
            'Sophy preparando relatório'
        ], 500);

        const now = new Date();
        const y = now.getFullYear(), m = now.getMonth() + 1;

        const finSummary = Finance.getSummary(y, m);
        const byCat = Finance.byCategory((finSummary.txs || []).filter(t => t.type === 'expense'));
        const topExpense = byCat[0];
        const finHealth = finSummary.balance >= 0 ? 'positivo' : 'negativo';

        const habits = Habits.getAll();
        const today = Habits.today();
        const habitsDoneToday = habits.filter(h => (h.done || []).includes(today)).length;
        const habitsTotal = habits.length;
        const habitRate = habitsTotal > 0 ? Math.round((habitsDoneToday / habitsTotal) * 100) : 0;
        const streakMax = habits.length ? Math.max(...habits.map(h => Habits.getStreak(h))) : 0;

        const moodData = Mood.last7();
        const moodValues = moodData.filter(d => d.value);
        const moodAvg = moodValues.length ? moodValues.reduce((a, b) => a + b.value, 0) / moodValues.length : 0;
        const moodEmojis = ['', '😞', '😕', '😐', '🙂', '😄'];
        const moodLabel = moodEmojis[Math.round(moodAvg)] || '😐';

        const todayStr = AI.todayStr();
        const agenda = Store.get(K.agenda, []);
        const todayEvents = agenda.filter(e => e.date === todayStr);
        const upcoming = agenda.filter(e => e.date > todayStr).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);

        const streakData = Store.get('orbit_streak', { count: 0 });
        const disciplines = Store.get(K.disc, []);

        const diagPrompt = `DIAGNÓSTICO GERAL SOLICITADO — ${new Date().toLocaleString('pt-BR')}

Gera um RELATÓRIO DIAGNÓSTICO COMPLETO no teu estilo (papo real, não formal), com estas seções:

## 💰 FINANÇAS (${MONTHS_PT[m - 1]})
- Saldo: ${Finance.fmt(finSummary.balance)} (${finHealth})
- Entradas: ${Finance.fmt(finSummary.income)}
- Saídas: ${Finance.fmt(finSummary.expenses)}
- Maior gasto: ${topExpense ? `${topExpense.name} — ${Finance.fmt(topExpense.total)} (${Math.round((topExpense.total / (finSummary.expenses || 1)) * 100)}%)` : 'nenhum'}

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

Com base nesses dados, dá um diagnóstico honesto: o que tá bem, o que precisa de atenção, e 2-3 ações concretas pra melhorar. Seja direta, sem enrolação.`;

        this.openChat();
        await new Promise(r => setTimeout(r, 300));
        Loader.hide(100);
        await this.handleSend(diagPrompt, { silent: true });
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

    /* ── BUSCA GLOBAL NO APP ── */
    openAppSearch() {
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

        (Store.get(K.agenda, [])).forEach(e => {
            if (e.title?.toLowerCase().includes(ql))
                results.push({ icon: '📅', label: e.title, sub: e.date, action: `orbit.switchTab('agenda')` });
        });

        (Store.get(K.fin_tx, [])).forEach(t => {
            if (t.desc?.toLowerCase().includes(ql))
                results.push({ icon: t.type === 'income' ? '💚' : '🔴', label: t.desc, sub: `R$ ${t.amount}`, action: `orbit.switchTab('cofre')` });
        });

        (Habits.getAll()).forEach(h => {
            if (h.name?.toLowerCase().includes(ql))
                results.push({ icon: h.icon || '✅', label: h.name, sub: 'Hábito', action: `orbit.switchTab('hub');setTimeout(()=>orbit.switchHub('habitos'),200)` });
        });

        (Store.get(K.flash, [])).forEach(f => {
            if (f.front?.toLowerCase().includes(ql) || f.back?.toLowerCase().includes(ql))
                results.push({ icon: '🃏', label: f.front, sub: f.back?.slice(0, 40), action: `orbit.switchTab('academia')` });
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

    /* ── MODO FOCO ── */
    toggleFocusMode() {
        const isFocus = document.body.classList.toggle('focus-mode');
        UI.toast(isFocus ? '🎯 Modo foco ativado' : '📱 Modo normal', 'info', 1500);
    }

    scrollBottom() { const msgs = document.getElementById('msgs'); if (msgs) msgs.scrollTop = msgs.scrollHeight; }

    exportChat() {
        const rows = document.querySelectorAll('.msg-row');
        let out = `OS — Conversa exportada em ${new Date().toLocaleString('pt-BR')}\n${'='.repeat(50)}\n\n`;
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
            navigator.share({ title: 'OS', text: txt }).catch(() => {});
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
                <div class="psec"><label class="plabel">Nome da IA</label><input type="text" id="s-name" value="${cfg.name}">
                <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Ex: OS</p></div>
                <div class="psec"><label class="plabel">Seu nome na saudação</label><input type="text" id="s-username" value="${cfg.userName || 'JR'}">
                <p style="font-size:11px;color:var(--text-muted);margin-top:4px">Aparece no "Bom dia, ___" do dashboard</p></div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>`;
        } else if (tab === 'ai') {
            const groqOk = !!cfg.groqKey;
            const gemOk = !!cfg.apiKey;
            body.innerHTML = `
                <div class="psec" style="background:var(--overlay);border:1px solid var(--border);border-radius:10px;padding:12px;margin-bottom:12px">
                <div style="font-family:var(--fm);font-size:10px;letter-spacing:1px;color:var(--text-muted);margin-bottom:8px">STATUS DO SISTEMA</div>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px;margin-bottom:4px">
                    <span style="color:${groqOk?'var(--ok)':'var(--err)'}">●</span>
                    <span>Groq ${groqOk?'configurado — primário ativo':'não configurado'}</span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;font-size:13px">
                    <span style="color:${gemOk?'var(--ok)':'var(--fg-4)'}">●</span>
                    <span>Gemini ${gemOk?'configurado — fallback ativo':'não configurado (fallback)'}</span>
                </div>
                ${!groqOk&&!gemOk?'<div style="font-size:11px;color:var(--gold);margin-top:8px">⚠️ Nenhuma chave configurada. O chat não vai funcionar.</div>':''}</div>
                <div class="psec"><label class="plabel">Groq API Key <span style="color:var(--text-muted);font-size:10px">(primária · gratuita · 14.400 req/dia)</span></label>
                <input type="password" id="s-groq" value="${cfg.groqKey}" placeholder="gsk_...">
                <p style="font-size:10px;color:var(--text-muted);margin-top:4px">Crie em console.groq.com → API Keys</p></div>
                <div class="psec"><label class="plabel">Modelo Groq</label><select id="s-groq-model">
                    <option value="llama-3.3-70b-versatile" ${cfg.groqModel==='llama-3.3-70b-versatile'?'selected':''}>LLaMA 3.3 70B Versatile (recomendado)</option>
                    <option value="llama-3.1-8b-instant" ${cfg.groqModel==='llama-3.1-8b-instant'?'selected':''}>LLaMA 3.1 8B Instant (mais rápido)</option>
                    <option value="compound-beta" ${cfg.groqModel==='compound-beta'?'selected':''}>⚡ Compound Beta (web search nativa — experimental)</option>
                    <option value="llama-3.3-70b-specdec" ${cfg.groqModel==='llama-3.3-70b-specdec'?'selected':''}>🚀 LLaMA 3.3 70B SpecDec (mais rápido)</option>
                    <option value="deepseek-r1-distill-llama-70b" ${cfg.groqModel==='deepseek-r1-distill-llama-70b'?'selected':''}>🧠 DeepSeek R1 Distill 70B (raciocínio)</option>
                    <option value="gemma2-9b-it" ${cfg.groqModel==='gemma2-9b-it'?'selected':''}>🪶 Gemma 2 9B (ultra leve)</option>
                    <option value="mixtral-8x7b-32768" ${cfg.groqModel==='mixtral-8x7b-32768'?'selected':''}>Mixtral 8x7B</option>
                </select></div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
                <div class="psec"><label class="plabel">Gemini API Key <span style="color:var(--text-muted);font-size:10px">(fallback opcional)</span></label>
                <input type="password" id="s-key" value="${cfg.apiKey}" placeholder="AIza...">
                <p style="font-size:10px;color:var(--text-muted);margin-top:4px">Crie em aistudio.google.com → Get API key</p></div>
                <div class="psec"><label class="plabel">Modelo Gemini</label><select id="s-model">
                    <option value="gemini-2.5-flash-lite" ${cfg.model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite</option>
                    <option value="gemini-2.5-flash" ${cfg.model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash</option>
                </select></div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR CONFIGURAÇÕES</button>`;
        } else if (tab === 'mem') {
            const ep = Store.getEp();
            body.innerHTML = `
                <div class="psec"><label class="plabel">Núcleo de Identidade</label>
                <textarea id="s-nuc" rows="6" style="font-size:12px">${Store.getNuc()}</textarea>
                <button class="btn btn-primary" onclick="orbit.saveNuc()">SALVAR NÚCLEO</button></div>
                <div class="psec"><label class="plabel">Memórias Episódicas (${ep.length})</label>
                <div>${ep.length ? ep.map(e => `<div class="ctx-item"><strong style="font-size:11px;color:var(--text-sec)">${e.d||''}:</strong> ${e.s}</div>`).join('') : '<p style="color:var(--text-muted);font-size:13px">Nenhuma memória.</p>'}</div></div>
                <button class="btn btn-danger" onclick="orbit.clearMem()">LIMPAR MEMÓRIAS</button>
                ${(() => {
                    const prefs = this._getOrbitPrefs();
                    if (!prefs?.topics?.length) return '';
                    return `<div class="psec" style="margin-top:16px"><label class="plabel">🌟 Gostos que a Orbit desenvolveu</label>
                    <div style="display:flex;flex-wrap:wrap;gap:6px;margin-top:8px">
                        ${prefs.topics.map(t => `<span style="background:var(--bg-3);border:1px solid var(--line-2);border-radius:var(--r-pill);padding:4px 10px;font-size:11px;color:var(--fg-2)">${t}</span>`).join('')}
                    </div>
                    <p style="font-size:10px;color:var(--fg-4);margin-top:8px">Atualizado em ${prefs.lastUpdated ? new Date(prefs.lastUpdated).toLocaleDateString('pt-BR') : '—'}</p>
                    <button class="btn btn-ghost" style="margin-top:6px;font-size:11px;padding:6px 12px" onclick="localStorage.removeItem('orbit_prefs');orbit.renderPanelTab('ai');UI.toast('Preferências resetadas','ok')">RESETAR GOSTOS</button></div>`;
                })()}`;
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
                <div class="psec"><label class="plabel">Cor de Destaque</label>
                <div class="accent-picker">
                ${ACCENTS.map(a => `<button class="accent-swatch${(cfg.accent || '#d4d4d4') === a.v ? ' active' : ''}" style="background:${a.v}" title="${a.name}" onclick="orbit.setAccent('${a.v}')"></button>`).join('')}
                </div></div>
                <div style="height:1px;background:var(--border);margin:16px 0"></div>
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
        const fields = { 's-name': 'name', 's-username': 'userName', 's-key': 'apiKey', 's-groq': 'groqKey', 's-model': 'model', 's-groq-model': 'groqModel', 's-prompt': 'prompt' };
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

    async clearMem() {
        const ok = await this._confirm('Apagar todas as memórias episódicas? Isso não pode ser desfeito.', { title: 'Limpar Memórias', okLabel: 'Limpar', danger: true });
        if (!ok) return;
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
            finance_budgets: Finance.getBudgets(),
            agenda: Agenda.getEvents(),
            habits: Habits.getAll(),
            mood: Mood.getAll(),
            kanban: Kanban.get(),
            ps5: Entertainment.getPS5Games(),
            grades: Grades.get(),
            nupi_proj: Store.get('orbit_nupi_proj', []),
            nupi_tasks: Store.get('orbit_nupi_tasks', []),
            fe_prayers: Store.get('orbit_fe_prayers', []),
            vault_enc: localStorage.getItem('orbit_vault_data'),
            vault_chk: localStorage.getItem('orbit_vault_check'),
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
                const ok = await this._confirm(`Importar backup de ${file.name}? Os dados atuais serão substituídos.`, { title: 'Importar Backup', okLabel: 'Importar' });
                if (!ok) return;
                if (d.config) { const cfg = { ...Store.getCfg(), ...d.config }; Store.saveCfg(cfg); }
                if (d.nuc) Store.saveNuc(d.nuc);
                if (d.ep) Store.saveEp(d.ep);
                if (d.disc) Store.set('orbit_disc', d.disc);
                if (d.flash) Store.set('orbit_flash', d.flash);
                if (d.fe) Store.set('orbit_fe_journal', d.fe);
                if (d.ideas) Store.set('orbit_ideas', d.ideas);
                if (d.finance_tx) Store.set('orbit_finance_tx', d.finance_tx);
                if (d.finance_budgets) Store.set('orbit_finance_budgets', d.finance_budgets);
                if (d.agenda) Store.set('orbit_agenda_events', d.agenda);
                if (d.habits) Store.set('orbit_habits', d.habits);
                if (d.mood) Store.set('orbit_mood', d.mood);
                if (d.kanban) Store.set('orbit_kanban', d.kanban);
                if (d.ps5) Store.set('orbit_ps5', d.ps5);
                if (d.grades) Store.set('orbit_grades', d.grades);
                if (d.nupi_proj) Store.set('orbit_nupi_proj', d.nupi_proj);
                if (d.nupi_tasks) Store.set('orbit_nupi_tasks', d.nupi_tasks);
                if (d.fe_prayers) Store.set('orbit_fe_prayers', d.fe_prayers);
                if (d.vault_enc) localStorage.setItem('orbit_vault_data', d.vault_enc);
                if (d.vault_chk) localStorage.setItem('orbit_vault_check', d.vault_chk);
                UI.toast('Backup importado! Recarregando...', 'ok');
                setTimeout(() => location.reload(), 1200);
            } catch { UI.toast('Arquivo inválido ou corrompido.', 'err'); }
        };
        inp.click();
    }

    async pinReset() {
        const ok = await this._confirm('Redefinir o PIN? Seus dados permanecem. Só o código de acesso será apagado.', { title: 'Redefinir PIN', okLabel: 'Redefinir' });
        if (!ok) return;
        localStorage.removeItem('orbit_pin');
        location.reload();
    }

    async resetPin() {
        const ok = await this._confirm('Trocar o PIN? Você vai precisar criar um novo.', { title: 'Trocar PIN', okLabel: 'Trocar' });
        if (!ok) return;
        localStorage.removeItem(K.pin);
        this.pinBuffer = '';
        this.pinMode = 'set';
        document.querySelector('.pin-title').textContent = 'CRIAR NOVO PIN';
        this.closePanel();
        document.getElementById('app').style.display = 'none';
        document.getElementById('pinscreen').style.display = 'flex';
        document.getElementById('pinscreen').style.opacity = '1';
    }

    async resetAll() {
        const ok = await this._confirm('Apagar TUDO? Finanças, agenda, hábitos, memórias — esta ação é irreversível.', { title: 'Reset Total', okLabel: 'Apagar Tudo', danger: true });
        if (!ok) return;
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
        const sendBtn = document.getElementById('sendbtn');
        sendBtn?.addEventListener('click', () => this.handleSend());
        // Mobile: evita que o tap no botão tire o foco do textarea (mantém o teclado aberto)
        sendBtn?.addEventListener('mousedown', e => e.preventDefault());
        sendBtn?.addEventListener('pointerdown', e => e.preventDefault());

        // Mesma proteção para o botão de cancelar streaming
        const cancelBtn = document.getElementById('cancel-btn');
        cancelBtn?.addEventListener('mousedown', e => e.preventDefault());
        cancelBtn?.addEventListener('pointerdown', e => e.preventDefault());

        // Proteção também para os botões de anexar/câmera/voz (não roubam foco)
        document.querySelectorAll('.inp-area .inp-btn').forEach(b => {
            b.addEventListener('mousedown', e => e.preventDefault());
        });

        const inp = document.getElementById('msginput');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                    // Recoloca o foco no próximo tick (alguns Androids tiram durante o handler)
                    setTimeout(() => inp.focus(), 0);
                }
                if ((e.ctrlKey || e.metaKey) && e.key === '/') {
                    e.preventDefault();
                    this.showCmdPalette();
                }
                if (e.key === 'Escape') {
                    const pal = document.getElementById('cmd-palette');
                    if (pal && pal.style.display !== 'none') this.hideCmdPalette();
                    else if (this.abortCtrl) this.cancelStream();
                }
            });
            inp.addEventListener('input', () => this.handleInput());
            // Se o textarea perder foco logo após enviar (Android), retoma
            inp.addEventListener('blur', () => {
                if (this._keepKeyboard) {
                    this._keepKeyboard = false;
                    setTimeout(() => inp.focus(), 0);
                }
            });
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
            const picker = document.getElementById('symbol-picker');
            const symBtn = document.getElementById('sym-btn');
            if (picker && picker.classList.contains('open') && !picker.contains(e.target) && e.target !== symBtn && !symBtn?.contains(e.target)) {
                this.hideSymbolPicker();
            }
        });

        // Botão de hardware "voltar" no Android fecha chat/painel/modal aberto
        window.addEventListener('popstate', (e) => {
            if (this.chatOpen) { this.closeChat(false); return; }
            const panel = document.getElementById('panel');
            if (panel?.classList.contains('open')) { this.closePanel(); return; }
            const ctx = document.getElementById('ctx');
            if (ctx?.classList.contains('open')) { this.closeCtx(); return; }
        });
    }

    /* ── UTILS ── */
    fixViewport() {
        const update = () => {
            const vvh = window.visualViewport?.height ?? window.innerHeight;
            document.documentElement.style.setProperty('--vvh', `${vvh}px`);
            const msgs = document.getElementById('msgs');
            if (msgs) requestAnimationFrame(() => { msgs.scrollTop = msgs.scrollHeight; });
        };
        if (window.visualViewport) {
            window.visualViewport.addEventListener('resize', update);
            window.visualViewport.addEventListener('scroll', update);
        } else {
            window.addEventListener('resize', update);
        }
        update();
    }

    initOrb() {
        // Aurora CSS substitui o WebGL — nenhuma inicialização necessária
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').then(reg => {
                // Notifica o SW para pular o waiting se houver update
                reg.addEventListener('updatefound', () => {
                    const newSW = reg.installing;
                    if (!newSW) return;
                    newSW.addEventListener('statechange', () => {
                        if (newSW.state === 'installed' && navigator.serviceWorker.controller) {
                            newSW.postMessage({ type: 'SKIP_WAITING' });
                        }
                    });
                });
            }).catch(() => {});
            // Recarrega ao receber novo SW ativo
            let refreshing = false;
            navigator.serviceWorker.addEventListener('controllerchange', () => {
                if (!refreshing) { refreshing = true; location.reload(); }
            });
        }
        if ('storage' in navigator && 'persist' in navigator.storage) navigator.storage.persist().catch(() => {});
    }
}

window.orbit = new App();
