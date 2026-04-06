/**
 * APP.JS - Main Controller & Entry Point
 * Master Class Edition — Bug Fix Complete
 */

import { Store, K } from './store.js';
import { AI } from './ai.js';
import { UI, Orb, Icons } from './ui.js';
import { Calculator, Pomodoro } from './tools.js';
import { Kanban, Flashcards, University, IdeaVault } from './study.js';
import { Faith } from './faith.js';

class App {
    constructor() {
        this.busy = false;
        this.pinBuffer = '';
        this.pinMode = 'enter';
        this.activeTab = 'id';
        this.pendingImage = null;
        this.fullResponse = '';

        // Wait for DOM to be ready
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

        const pin = Store.get(K.pin);
        if (!pin) {
            // First time — set up PIN
            this.pinMode = 'set';
            const title = document.querySelector('.pin-title');
            if (title) title.textContent = 'CRIAR ACESSO';
            const sub = document.querySelector('.pin-sub');
            if (sub) sub.textContent = 'ESCOLHA 4 DÍGITOS';
            this.showScreen('pinscreen');
        } else {
            this.showScreen('pinscreen');
        }
    }

    showScreen(id) {
        // Hide all screens first
        ['pinscreen', 'chat'].forEach(s => {
            const el = document.getElementById(s);
            if (el) el.style.display = 'none';
        });
        // Show the target
        const target = document.getElementById(id);
        if (target) target.style.display = 'flex';
    }

    setupListeners() {
        // Send button
        const sendBtn = document.getElementById('sendbtn');
        if (sendBtn) sendBtn.addEventListener('click', () => this.handleSend());

        // Input textarea
        const inp = document.getElementById('msginput');
        if (inp) {
            inp.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.handleSend();
                }
            });
            inp.addEventListener('input', () => {
                inp.style.height = 'auto';
                inp.style.height = inp.scrollHeight + 'px';
            });
        }

        // Panel tabs
        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', (e) => {
                const tab = e.currentTarget.dataset.tab;
                this.switchTab(tab, e.currentTarget);
            });
        });

        // PIN keys
        document.querySelectorAll('.pin-key').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('del')) this.pinDel();
                else if (btn.classList.contains('empty')) return;
                else this.pinKey(btn.textContent.trim());
            });
        });

        // File attachment
        const fileInp = document.getElementById('file-inp');
        if (fileInp) fileInp.addEventListener('change', (e) => this.onFileSelect(e));
    }

    // ─── PIN ─────────────────────────────────
    pinKey(digit) {
        if (!digit || this.pinBuffer.length >= 4) return;
        this.pinBuffer += digit;
        this.updatePinDots();
        if (this.pinBuffer.length === 4) {
            setTimeout(() => this.processPin(), 250);
        }
    }

    pinDel() {
        this.pinBuffer = this.pinBuffer.slice(0, -1);
        this.updatePinDots();
    }

    updatePinDots(err = false) {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((d, i) => {
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
            this.enterChat();
        } else {
            if (this.pinBuffer === stored) {
                this.pinBuffer = '';
                this.updatePinDots();
                this.enterChat();
            } else {
                this.updatePinDots(true);
                if (navigator.vibrate) navigator.vibrate(200);
                setTimeout(() => {
                    this.pinBuffer = '';
                    this.updatePinDots();
                }, 700);
            }
        }
    }

    enterChat() {
        const pin = document.getElementById('pinscreen');
        if (pin) {
            pin.style.opacity = '0';
            pin.style.transition = 'opacity 0.4s';
            setTimeout(() => {
                pin.style.display = 'none';
                pin.style.opacity = '';
                this.showScreen('chat');
                this.loadChat();
            }, 400);
        }
    }

    loadChat() {
        // Update header name
        const cfg = Store.getCfg();
        const hdrName = document.getElementById('hdr-name');
        if (hdrName) hdrName.textContent = cfg.name.toUpperCase();

        // Reload existing messages from storage
        const history = Store.get('orbit_msgs', []);
        if (history.length > 0) {
            const msgs = document.getElementById('msgs');
            const empty = document.getElementById('empty');
            if (empty) empty.style.display = 'none';
            // Show last 20 messages
            history.slice(-20).forEach(m => {
                if (m.role === 'user' || m.role === 'assistant') {
                    UI.addMsg(m.role === 'user' ? 'user' : 'sophy', m.content || '', false, null, false);
                }
            });
            if (msgs) msgs.scrollTop = msgs.scrollHeight;
        }

        UI.setStatus('online');
    }

    // ─── CHAT ─────────────────────────────────
    async handleSend() {
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        const text = inp.value.trim();
        if (!text && !this.pendingImage) return;

        // Commands
        if (text.startsWith('!ideia ')) {
            IdeaVault.add(text.slice(7));
            UI.toast('Ideia salva no Baú! 💡', 'ok');
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
        if (!cfg.apiKey) {
            UI.toast('Configure a API Key em Configurações → Sistema', 'err');
            return;
        }

        this.busy = true;
        this.setUI(false);
        this.fullResponse = '';

        // Add user message to UI
        UI.addMsg('user', text, false, this.pendingImage);
        inp.value = '';
        inp.style.height = 'auto';

        // Build history
        const history = Store.get('orbit_msgs', []);
        const userMsg = { role: 'user', content: text };
        if (this.pendingImage) userMsg.image = this.pendingImage;
        history.push(userMsg);
        this.pendingImage = null;
        this.removeAttach();

        // Add streaming bubble
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

            // Auto-summarize every 12 exchanges
            if (history.length % 12 === 0) {
                AI.summarizeSession(history);
            }

        } catch (err) {
            const sb = document.getElementById('sb');
            if (sb) sb.innerHTML = `<span style="color:#ff7070">Erro: ${err.message}</span>`;
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

    // ─── PANEL ────────────────────────────────
    openPanel() {
        this.renderTab(this.activeTab);
        document.getElementById('panel').classList.add('open');
    }
    closePanel() { document.getElementById('panel').classList.remove('open'); }
    openCtx() { document.getElementById('ctx').classList.add('open'); }
    closeCtx() { document.getElementById('ctx').classList.remove('open'); }

    switchTab(tab, el) {
        this.activeTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
        if (el) el.classList.add('on');
        this.renderTab(tab);
    }

    renderTab(tab) {
        const cfg = Store.getCfg();
        const body = document.getElementById('p-body');
        if (!body) return;

        if (tab === 'id') {
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Nome da IA</label>
                  <input type="text" id="s-name" value="${cfg.name}">
                </div>
                <div class="psec">
                  <label class="plabel">Modelo Gemini</label>
                  <select id="s-model">
                    <option value="gemini-2.5-flash-lite" ${cfg.model==='gemini-2.5-flash-lite'?'selected':''}>Gemini 2.5 Flash Lite (Grátis)</option>
                    <option value="gemini-2.5-flash" ${cfg.model==='gemini-2.5-flash'?'selected':''}>Gemini 2.5 Flash</option>
                  </select>
                </div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
            `;
        } else if (tab === 'mem') {
            const ep = Store.getEp();
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">Núcleo de Identidade</label>
                  <textarea id="s-nuc" rows="5">${Store.getNuc()}</textarea>
                  <button class="btn btn-primary" onclick="orbit.saveNuc()">SALVAR NÚCLEO</button>
                </div>
                <div class="psec">
                  <label class="plabel">Memórias Episódicas (${ep.length})</label>
                  <div class="ctx-list">
                    ${ep.length ? ep.map(e => `<div class="ctx-item"><strong>${e.d||''}:</strong> ${e.s}</div>`).join('') : '<p style="color:var(--dimtext);font-size:13px">Nenhuma memória salva ainda.</p>'}
                  </div>
                </div>
                <button class="btn btn-danger" onclick="orbit.clearMem()">LIMPAR MEMÓRIAS</button>
            `;
        } else if (tab === 'disc') {
            const d = University.get();
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">NOVA DISCIPLINA (UFPI)</label>
                  <input type="text" id="dc-name" placeholder="Nome da Matéria">
                  <input type="text" id="dc-prof" placeholder="Professor" style="margin-top:8px">
                  <button class="btn btn-primary" style="margin-top:8px" onclick="orbit.addDisc()">ADICIONAR</button>
                </div>
                <div class="ctx-list">
                  ${d.length ? d.map(i => `<div class="ctx-item"><strong>${i.name}</strong> — ${i.professor} <button onclick="orbit.delDisc('${i.id}')" style="float:right;background:none;border:none;color:#ff7070;cursor:pointer;font-size:16px">×</button></div>`).join('') : '<p style="color:var(--dimtext);font-size:13px">Nenhuma disciplina cadastrada.</p>'}
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
                  <label class="plabel">BAÚ DE IDEIAS (${ideas.length})</label>
                  ${ideas.map(i => `<div class="ctx-item"><em style="font-size:11px;color:var(--dimtext)">${i.date}</em><br>${i.text} <button onclick="orbit.delIdea('${i.id}')" style="float:right;background:none;border:none;color:#ff7070;cursor:pointer">×</button></div>`).join('') || '<p style="color:var(--dimtext);font-size:13px">Use !ideia [texto] no chat para salvar ideias rápidas.</p>'}
                </div>
            `;
        } else if (tab === 'fe') {
            const v = Faith.getVerseOfDay();
            const journal = Faith.getJournal();
            body.innerHTML = `
                <div class="ctx-item" style="margin-bottom:16px">
                  <div style="font-family:var(--fd);font-size:9px;letter-spacing:2px;color:var(--accent);margin-bottom:8px">${v.r}</div>
                  <div style="font-size:14px;line-height:1.6;font-style:italic">"${v.t}"</div>
                </div>
                <div class="psec">
                  <label class="plabel">DIÁRIO ESPIRITUAL</label>
                  <textarea id="fe-j-inp" rows="3" placeholder="O que Deus falou com você hoje?"></textarea>
                  <button class="btn btn-primary" onclick="orbit.addFaithJournal()">REGISTRAR</button>
                </div>
                <div class="ctx-list">
                  ${journal.map(j => `<div class="ctx-item"><em style="font-size:11px;color:var(--dimtext)">${j.date}</em><br>${j.text}</div>`).join('')}
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
                  <div style="font-family:var(--fd);font-size:36px;text-align:center;color:var(--accent);padding:16px 0" id="pomo-time">25:00</div>
                  <div style="background:var(--bg3);border-radius:6px;height:6px;overflow:hidden;margin-bottom:12px"><div id="pomo-bar" style="height:100%;width:0%;background:var(--primary);transition:width 1s linear"></div></div>
                  <div style="display:flex;gap:8px">
                    <button class="btn btn-primary" id="pomo-btn" onclick="orbit.pomoToggle()" style="margin-top:0">INICIAR</button>
                    <button class="btn btn-ghost" onclick="orbit.pomoReset()" style="margin-top:0">RESET</button>
                  </div>
                </div>
            `;
        } else if (tab === 'sys') {
            body.innerHTML = `
                <div class="psec">
                  <label class="plabel">API Key (Gemini)</label>
                  <input type="password" id="s-key" value="${cfg.apiKey}" placeholder="AIza...">
                </div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
                <div style="height:1px;background:var(--border);margin:20px 0"></div>
                <button class="btn btn-ghost" onclick="orbit.exportBkp()">EXPORTAR BACKUP JSON</button>
                <button class="btn btn-danger" onclick="orbit.resetPin()">TROCAR PIN</button>
                <button class="btn btn-danger" onclick="orbit.resetAll()">RESET TOTAL</button>
            `;
        }
    }

    renderKanban() {
        const kb = Kanban.get();
        const cols = ['todo', 'doing', 'done'];
        const labels = { todo: 'A FAZER', doing: 'FAZENDO', done: 'FEITO' };
        return `<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px">
            ${cols.map(c => `
                <div>
                  <div style="font-family:var(--fm);font-size:9px;letter-spacing:1px;color:var(--dimtext);margin-bottom:6px">${labels[c]} (${(kb[c]||[]).length})</div>
                  ${(kb[c]||[]).map(item => `<div onclick="orbit.moveTask('${item.id}','${c}')" style="background:var(--bg4);border:1px solid var(--border);border-radius:8px;padding:7px 9px;font-size:12px;margin-bottom:5px;cursor:pointer">${item.text}</div>`).join('')}
                  <input type="text" id="ki-${c}" placeholder="+" style="font-size:12px;padding:6px 9px" onkeydown="if(event.key==='Enter')orbit.addTask('${c}')">
                </div>
            `).join('')}
        </div>`;
    }

    // ─── ACTIONS ─────────────────────────────
    saveSettings() {
        const cfg = Store.getCfg();
        const name = document.getElementById('s-name');
        const key = document.getElementById('s-key');
        const model = document.getElementById('s-model');
        if (name) cfg.name = name.value.trim() || cfg.name;
        if (key) cfg.apiKey = key.value.trim() || cfg.apiKey;
        if (model) cfg.model = model.value;
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
        this.renderTab('mem');
        UI.toast('Memórias limpas.', 'ok');
    }

    addDisc() {
        const n = document.getElementById('dc-name')?.value.trim();
        const p = document.getElementById('dc-prof')?.value.trim() || '';
        if (!n) return UI.toast('Preencha o nome!', 'err');
        University.add(n, p, '', []);
        this.renderTab('disc');
        UI.toast('Disciplina adicionada!', 'ok');
    }
    delDisc(id) { University.remove(id); this.renderTab('disc'); }

    addTask(col) {
        const inp = document.getElementById(`ki-${col}`);
        if (inp?.value.trim()) { Kanban.add(col, inp.value.trim()); this.renderTab('extras'); }
    }
    moveTask(id, col) {
        const next = { todo: 'doing', doing: 'done', done: 'todo' };
        Kanban.move(id, col, next[col]);
        this.renderTab('extras');
    }

    addFaithJournal() {
        const el = document.getElementById('fe-j-inp');
        if (el?.value.trim()) { Faith.addJournal(el.value.trim()); el.value = ''; this.renderTab('fe'); UI.toast('Registrado! 🙏', 'ok'); }
    }

    delIdea(id) { IdeaVault.remove(id); this.renderTab('extras'); }

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
                (s) => {
                    const el = document.getElementById('pomo-time');
                    if (el) el.textContent = Pomodoro.format();
                    const bar = document.getElementById('pomo-bar');
                    if (bar) bar.style.width = `${(s.elapsed / s.total) * 100}%`;
                },
                () => {
                    UI.toast('Pomodoro completo! 🍅', 'ok');
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
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
        const data = { config: Store.getCfg(), ep: Store.getEp(), nuc: Store.getNuc(), disc: University.get(), flash: Flashcards.get(), fe: Faith.getJournal(), ideas: IdeaVault.get() };
        data.config.apiKey = ''; // Don't export API key
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `orbit-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
        URL.revokeObjectURL(a.href);
        UI.toast('Backup exportado!', 'ok');
    }

    resetPin() {
        if (!confirm('Trocar o PIN? Você vai precisar criar um novo.')) return;
        Store.set(K.pin, null);
        localStorage.removeItem(K.pin);
        this.pinBuffer = '';
        this.pinMode = 'set';
        const title = document.querySelector('.pin-title');
        if (title) title.textContent = 'CRIAR NOVO PIN';
        this.updatePinDots();
        this.closePanel();
        this.showScreen('pinscreen');
    }

    resetAll() {
        if (!confirm('Apagar TUDO? Esta ação é irreversível.')) return;
        localStorage.clear();
        location.reload();
    }

    onFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return UI.toast('Apenas imagens!', 'err');
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.pendingImage = { data: ev.target.result.split(',')[1], type: file.type, name: file.name };
            const bar = document.getElementById('attach-bar');
            if (bar) { bar.style.display = 'flex'; bar.innerHTML = `<div class="attach-chip">🖼️ ${file.name.slice(0,15)} <button onclick="orbit.removeAttach()">×</button></div>`; }
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
        const orb = new Orb('bg-canvas');
        orb.draw();
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
    }
}

window.orbit = new App();
