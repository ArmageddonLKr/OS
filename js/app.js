/**
 * APP.JS - Main Controller & Entry Point
 * Master Class Edition
 */

import { Store, K, DEFAULT_PROMPT } from './store.js';
import { AI } from './ai.js';
import { UI, Orb, Icons } from './ui.js';
import { Calculator, Pomodoro, Converter, DataTools } from './tools.js';
import { Kanban, Flashcards, University, IdeaVault } from './study.js';
import { Faith } from './faith.js';

class App {
    constructor() {
        this.busy = false;
        this.pinBuffer = '';
        this.pinMode = 'enter';
        this.activeTab = 'id';
        this.pendingImage = null;
        this.init();
    }

    init() {
        document.addEventListener('DOMContentLoaded', () => {
            this.setupListeners();
            this.checkPin();
            this.initOrb();
            this.initPWA();
            this.updatePinDots();
            this.fixViewport();
            
            // Daily quota check
            const count = Store.get(K.req, { count: 0 }).count;
            if (count > 1400) UI.toast(`🔴 Cota crítica: ${count}/1500`, 'err');
        });
    }

    setupListeners() {
        // Send
        document.getElementById('sendbtn').addEventListener('click', () => this.handleSend());
        
        // Input
        const inp = document.getElementById('msginput');
        inp.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                this.handleSend();
            }
        });
        inp.addEventListener('input', () => {
            inp.style.height = 'auto';
            inp.style.height = (inp.scrollHeight) + 'px';
        });

        // Tabs
        document.querySelectorAll('.tab').forEach(t => {
            t.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab, e.target));
        });

        // PIN Keys
        document.querySelectorAll('.pin-key').forEach(btn => {
            btn.addEventListener('click', () => {
                if (btn.classList.contains('del')) this.pinDel();
                else if (btn.textContent) this.pinKey(btn.textContent);
            });
        });

        // File Selection
        document.getElementById('file-inp').addEventListener('change', (e) => this.onFileSelect(e));
    }

    onFileSelect(e) {
        const file = e.target.files[0];
        if (!file) return;
        if (!file.type.startsWith('image/')) return UI.toast('Apenas imagens!', 'err');
        
        const reader = new FileReader();
        reader.onload = (ev) => {
            this.pendingImage = {
                data: ev.target.result.split(',')[1],
                type: file.type,
                name: file.name
            };
            const bar = document.getElementById('attach-bar');
            bar.style.display = 'flex';
            bar.innerHTML = `<div class="attach-chip">🖼️ ${file.name.slice(0,10)}... <button onclick="orbit.removeAttach()">×</button></div>`;
            UI.toast('Imagem anexada!', 'ok');
        };
        reader.readAsDataURL(file);
    }

    removeAttach() {
        this.pendingImage = null;
        const bar = document.getElementById('attach-bar');
        bar.style.display = 'none';
        bar.innerHTML = '';
        document.getElementById('file-inp').value = '';
    }

    initOrb() {
        const orb = new Orb('bg-canvas');
        orb.draw();
    }

    checkPin() {
        const pin = Store.get(K.pin);
        if (!pin) {
            this.pinMode = 'set';
            const title = document.querySelector('.pin-title');
            if (title) title.textContent = 'CONFIGURAR ACESSO';
        }
    }

    pinKey(digit) {
        if (this.pinBuffer.length >= 4) return;
        this.pinBuffer += digit;
        this.updatePinDots();
        if (this.pinBuffer.length === 4) setTimeout(() => this.processPin(), 200);
    }

    pinDel() {
        this.pinBuffer = this.pinBuffer.slice(0, -1);
        this.updatePinDots();
    }

    updatePinDots(err = false) {
        const dots = document.querySelectorAll('.pin-dot');
        dots.forEach((d, i) => {
            d.className = `pin-dot${i < this.pinBuffer.length ? ' filled' : ''}${err ? ' err' : ''}`;
        });
    }

    processPin() {
        const stored = Store.get(K.pin);
        if (this.pinMode === 'enter') {
            if (this.pinBuffer === stored) {
                document.getElementById('pinscreen').classList.add('out');
                setTimeout(() => document.getElementById('pinscreen').style.display = 'none', 500);
            } else {
                this.updatePinDots(true);
                if (navigator.vibrate) navigator.vibrate(200);
                setTimeout(() => { this.pinBuffer = ''; this.updatePinDots(); }, 600);
            }
        } else if (this.pinMode === 'set') {
            Store.set(K.pin, this.pinBuffer);
            UI.toast('PIN Configurado!', 'ok');
            document.getElementById('pinscreen').classList.add('out');
            setTimeout(() => document.getElementById('pinscreen').style.display = 'none', 500);
        }
        this.pinBuffer = '';
    }

    async handleSend() {
        if (this.busy) return;
        const inp = document.getElementById('msginput');
        const text = inp.value.trim();
        if (!text && !this.pendingImage) return;

        // --- Commands Handler ---
        if (text.startsWith('!ideia ')) {
            IdeaVault.add(text.slice(7));
            UI.toast('Ideia salva no Baú!', 'ok');
            inp.value = ''; return;
        }
        if (text.startsWith('/esquece')) {
            Store.set('orbit_msgs', []);
            UI.toast('Sessão limpa!', 'ok');
            inp.value = ''; return;
        }
        if (text.startsWith('/resumo ')) {
            UI.toast('Resumindo...', 'ok');
            // Logic to send a special "Summarize this" prompt
        }

        const c = Store.getCfg();
        if (!c.apiKey) {
            UI.toast('Configure a API Key nas configurações', 'err');
            return;
        }

        this.busy = true;
        this.setUI(false);
        UI.addMsg('user', text, false, this.pendingImage);
        inp.value = '';
        inp.style.height = 'auto';

        try {
            const history = Store.get('orbit_msgs', []);
            const userMsg = { role: 'user', content: text };
            if (this.pendingImage) userMsg.image = this.pendingImage;
            
            history.push(userMsg);
            this.pendingImage = null; // Clear after sending
            
            let fullResponse = '';
            await AI.streamRequest({
                messages: AI.getWindowedMsgs(history)
            }, (delta) => {
                const sb = document.getElementById('sb');
                if (!sb) UI.addMsg('sophy', '', true);
                const bubble = document.getElementById('sb');
                if (bubble) {
                    bubble.__raw = (bubble.__raw || '') + delta;
                    bubble.innerHTML = bubble.__raw;
                }
                fullResponse += delta;
            });

            history.push({ role: 'assistant', content: fullResponse });
            Store.set('orbit_msgs', history.slice(-100));
            if (history.length % 12 === 0) AI.summarizeSession(history);
            
        } catch (err) {
            UI.toast(err.message, 'err');
        } finally {
            this.busy = false;
            this.setUI(true);
            const sb = document.getElementById('sb');
            if (sb) {
                sb.removeAttribute('id');
                const mb = sb.closest('.mbubble');
                if (mb) mb.innerHTML = UI.renderMd(fullResponse);
            }
        }
    }

    switchTab(tab, el) {
        this.activeTab = tab;
        document.querySelectorAll('.tab').forEach(t => t.classList.remove('on'));
        if (el) el.classList.add('on');
        this.renderTab(tab);
    }

    renderTab(tab) {
        const c = Store.getCfg();
        const body = document.getElementById('p-body');
        if (tab === 'id') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">Nome da IA</label><input type="text" id="s-name" value="${c.name}"></div>
                <div class="psec"><label class="plabel">Gemini Model</label>
                    <select id="s-model">
                        <option value="gemini-2.5-flash-lite" ${c.model.includes('lite')?'selected':''}>Gemini 2.5 Flash Lite (Grátis)</option>
                        <option value="gemini-2.5-flash" ${!c.model.includes('lite')?'selected':''}>Gemini 2.5 Flash (Performance)</option>
                    </select>
                </div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
            `;
        } else if (tab === 'mem') {
            const ep = Store.getEp();
            body.innerHTML = `
                <div class="psec"><label class="plabel">Núcleo Identidade</label><textarea id="s-nuc" rows="4">${Store.getNuc()}</textarea></div>
                <div class="ctx-list">
                    ${ep.map(e => `<div class="ctx-item"><strong>${e.d}:</strong> ${e.s}</div>`).join('')}
                </div>
                <button class="btn btn-danger" onclick="orbit.clearMem()">LIMPAR MEMÓRIA</button>
            `;
        } else if (tab === 'disc') {
            const d = University.get();
            body.innerHTML = `
                <div class="psec"><label class="plabel">NOVA DISCIPLINA (UFPI)</label>
                    <input type="text" id="dc-name" placeholder="Nome da Matéria">
                    <input type="text" id="dc-prof" placeholder="Professor">
                    <button class="btn btn-sm" onclick="orbit.addDisc()">ADICIONAR</button>
                </div>
                <div class="ctx-list">
                    ${d.map(i => `<div class="ctx-item"><strong>${i.name}</strong> - ${i.professor} <button class="btn-del" onclick="orbit.delDisc('${i.id}')">×</button></div>`).join('')}
                </div>
            `;
        } else if (tab === 'extras') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">ESTUDOS & PRODUTIVIDADE</label>
                    <button class="btn btn-primary" onclick="orbit.startFlashReview()">📚 REVISAR FLASHCARDS</button>
                    <div class="divider"></div>
                    <div class="kanban-section">${this.renderKanban()}</div>
                    <div class="divider"></div>
                    <label class="plabel">BAÚ DE IDEIAS</label>
                    <div class="ctx-list">${IdeaVault.get().slice().reverse().map(i => `<div class="ctx-item"><em>${i.date}</em><br>${i.text} <button class="btn-del" onclick="orbit.delIdea('${i.id}')">×</button></div>`).join('')}</div>
                </div>
            `;
        } else if (tab === 'fe') {
            const v = Faith.getVerseOfDay();
            body.innerHTML = `
                <div class="fe-card">
                    <div class="fe-verse-ref">${v.r}</div>
                    <div class="fe-verse-text">${v.t}</div>
                </div>
                <div class="divider"></div>
                <div class="psec">
                    <label class="plabel">DIÁRIO ESPIRITUAL</label>
                    <textarea id="fe-j-inp" placeholder="O que Deus falou com você hoje?"></textarea>
                    <button class="btn btn-sm" onclick="orbit.addFaithJournal()">REGISTRAR</button>
                </div>
                <div class="ctx-list">${Faith.getJournal().map(j => `<div class="ctx-item"><em>${j.date}</em><br>${j.text}</div>`).join('')}</div>
            `;
        } else if (tab === 'tools') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">CALCULADORA</label>
                    <input type="text" id="calc-inp" placeholder="2 + 2 * sin(pi/2)">
                    <div id="calc-res" class="tool-result">-</div>
                    <button class="btn btn-sm" onclick="orbit.runCalc()">CALCULAR</button>
                </div>
                <div class="divider"></div>
                <div class="psec"><label class="plabel">POMODORO 🍅</label>
                    <div class="pomo-display" id="pomo-time">25:00</div>
                    <div class="pomo-bar-bg"><div id="pomo-bar" class="pomo-bar"></div></div>
                    <div class="pomo-btns">
                        <button class="btn btn-sm" onclick="orbit.pomoToggle()" id="pomo-btn">INICIAR</button>
                        <button class="btn btn-sm btn-ghost" onclick="orbit.pomoReset()">RESET</button>
                    </div>
                </div>
            `;
        } else if (tab === 'sys') {
            body.innerHTML = `
                <div class="psec"><label class="plabel">API Key</label><input type="password" id="s-key" value="${c.apiKey}"></div>
                <button class="btn btn-primary" onclick="orbit.saveSettings()">SALVAR</button>
                <div class="divider"></div>
                <button class="btn btn-ghost" onclick="orbit.exportBkp()">EXPORTAR BACKUP (JSON)</button>
                <button class="btn btn-danger" onclick="orbit.resetAll()">RESET TOTAL</button>
            `;
        }
    }

    renderKanban() {
        const kb = Kanban.get();
        return `
            <div class="kanban-cols">
                ${['todo', 'doing', 'done'].map(c => `
                    <div class="kanban-col">
                        <div class="k-title">${c.toUpperCase()} (${kb[c]?.length || 0})</div>
                        <div class="k-list">
                            ${(kb[c] || []).map(item => `<div class="k-item" onclick="orbit.moveTask('${item.id}', '${c}')">${item.text}</div>`).join('')}
                        </div>
                        <div class="k-add"><input type="text" id="ki-${c}" placeholder="+" onkeydown="if(event.key==='Enter')orbit.addTask('${c}')"></div>
                    </div>
                `).join('')}
            </div>
        `;
    }

    // --- Action Methods ---
    addDisc() {
        const n = document.getElementById('dc-name').value;
        const p = document.getElementById('dc-prof').value;
        if (n) { University.add(n, p, '', []); this.renderTab('disc'); UI.toast('Adicionado!', 'ok'); }
    }
    delDisc(id) { University.remove(id); this.renderTab('disc'); }

    addTask(col) {
        const inp = document.getElementById(`ki-${col}`);
        if (inp.value) { Kanban.add(col, inp.value); inp.value = ''; this.renderTab('extras'); }
    }
    moveTask(id, col) {
        const next = { todo: 'doing', doing: 'done', done: 'todo' };
        Kanban.move(id, col, next[col]);
        this.renderTab('extras');
    }

    addFaithJournal() {
        const inp = document.getElementById('fe-j-inp');
        if (inp.value) { Faith.addJournal(inp.value); inp.value = ''; this.renderTab('fe'); UI.toast('Salvo ✓', 'ok'); }
    }

    delIdea(id) { IdeaVault.remove(id); this.renderTab('extras'); }

    startFlashReview() {
        const cards = Flashcards.get();
        if (!cards.length) return UI.toast('Nenhum flashcard!', 'err');
        UI.toast('Iniciando revisão...', 'ok');
    }

    runCalc() {
        const inp = document.getElementById('calc-inp');
        if (inp) {
            const res = Calculator.run(inp.value);
            document.getElementById('calc-res').textContent = res;
        }
    }

    pomoToggle() {
        if (Pomodoro.state.running) {
            Pomodoro.stop();
            document.getElementById('pomo-btn').textContent = 'INICIAR';
        } else {
            Pomodoro.start(
                (s) => {
                    const el = document.getElementById('pomo-time');
                    if (el) el.textContent = Pomodoro.format();
                    const bar = document.getElementById('pomo-bar');
                    if (bar) bar.style.width = `${(s.elapsed / s.total) * 100}%`;
                },
                () => {
                    UI.toast('Pomodoro Concluído! 🍅', 'ok');
                    if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
                    this.pomoReset();
                }
            );
            document.getElementById('pomo-btn').textContent = 'PAUSAR';
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
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const a = document.createElement('a'); 
        a.href = URL.createObjectURL(blob); 
        a.download = `orbit-backup-${new Date().toISOString().slice(0,10)}.json`;
        a.click();
    }

    saveSettings() {
        const c = Store.getCfg();
        c.name = document.getElementById('s-name')?.value || c.name;
        c.apiKey = document.getElementById('s-key')?.value || c.apiKey;
        c.model = document.getElementById('s-model')?.value || c.model;
        Store.saveCfg(c);
        UI.toast('Configurações salvas!', 'ok');
        this.closePanel();
    }

    clearMem() { if (confirm('Limpar memórias?')) { Store.saveEp([]); this.renderTab('mem'); } }

    resetAll() { if (confirm('Deseja apagar TUDO?')) { localStorage.clear(); location.reload(); } }

    openPanel() { this.renderTab(this.activeTab); document.getElementById('panel').classList.add('open'); }
    closePanel() { document.getElementById('panel').classList.remove('open'); }
    openCtx() { document.getElementById('ctx').classList.add('open'); }
    closeCtx() { document.getElementById('ctx').classList.remove('open'); }

    setUI(on) {
        document.getElementById('sendbtn').disabled = !on;
        document.getElementById('msginput').disabled = !on;
        UI.setStatus(on ? 'online' : 'respondendo...');
    }

    fixViewport() {
        if (!window.visualViewport) return;
        const chat = document.getElementById('chat');
        window.visualViewport.addEventListener('resize', () => {
            if (chat.style.display !== 'none') chat.style.height = `${window.visualViewport.height}px`;
        });
    }

    initPWA() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register('./sw.js').catch(() => {});
        }
    }
}

window.orbit = new App();
