/**
 * AI.JS - Groq (primário) + Gemini (fallback) + Context Engine
 * Session 2: AbortSignal, retry exponencial para 429
 */

import { Store, K, DEFAULT_PROMPT } from './store.js';

const GROQ_URL = 'https://api.groq.com/openai/v1/chat/completions';
const GROQ_MODEL = 'llama-3.3-70b-versatile';

export class AI {
    static _stressHint = '';
    static _faithVerse = null;

    static nowBR() {
        return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Fortaleza' }));
    }

    static dateStrBR(d) {
        const dt = d ? new Date(d) : this.nowBR();
        return dt.toLocaleDateString('pt-BR', { weekday: 'short', day: '2-digit', month: '2-digit' });
    }

    static absenceNote() {
        const last = parseInt(localStorage.getItem(K.last) || '0');
        if (!last) return '';
        const hrs = Math.floor((Date.now() - last) / 3600000);
        const days = Math.floor(hrs / 24);
        if (days >= 7) return `\nAUSENCIA (${days} dias): Mencione UMA vez com carinho genuino e leveza.`;
        if (days >= 2) return `\nAUSENCIA (${days} dias): Comenta com leveza, uma vez so.`;
        if (hrs >= 18) return `\nLonge quase um dia. Menciona se vier natural.`;
        return '';
    }

    static agendaContext() {
        const agenda = Store.get(K.agenda, []);
        const disc = Store.get(K.disc, []);
        const now = this.nowBR();
        const today = now.toISOString().slice(0, 10);
        const dow = now.getDay();

        const todayItems = agenda.filter(a => a.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const upcoming = agenda.filter(a => a.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 3);
        const todayDisc = disc.filter(d => d.days && d.days.indexOf(dow) >= 0);

        let ctx = '';
        if (todayItems.length || todayDisc.length) {
            ctx += '\n\n## AGENDA HOJE\n';
            todayDisc.forEach(d => { ctx += `- AULA: ${d.name}${d.professor ? ' / ' + d.professor : ''}\n`; });
            todayItems.forEach(a => { ctx += `- ${a.time ? a.time + ' ' : ''}${a.title}\n`; });
        }
        if (upcoming.length) {
            ctx += '\n## PROXIMOS\n';
            upcoming.forEach(a => { ctx += `- ${this.dateStrBR(a.date)}: ${a.title}\n`; });
        }
        return ctx;
    }

    static _detectTopics(msgs = []) {
        const lastUser = [...msgs].reverse().find(m => m.role === 'user');
        const txt = (lastUser?.content || '').toLowerCase();
        return {
            faith: /\b(fé|fe|deus|jesus|cristo|bíblia|biblia|oração|oracao|versículo|versiculo|salmo|evangelho|igreja|culto|espírito|espirito|graça|graca)\b/.test(txt),
            study: /\b(estudo|estudar|prova|concurso|vestibular|matéria|materia|resumo|revisão|revisao|questão|questao|exercício|exercicio|dificuldade|aprender)\b/.test(txt),
            finance: /\b(dinheiro|gasto|gastos|despesa|saldo|renda|sal[aá]rio|pagamento|d[ií]vida|custo|finan[cç]|budget|or[cç]amento)\b/.test(txt),
            health: /\b(h[aá]bito|treino|exerc[ií]cio|[aá]gua|sono|dormir|acordar|cansado|energia|sa[uú]de|peso|imc)\b/.test(txt),
            project: /\b(dax|nupieepro|projeto|freelance|cliente|site|design|entrega|prazo|orbit|kanban)\b/.test(txt),
        };
    }

    static _financeCtx() {
        try {
            const fin = JSON.parse(localStorage.getItem('orbit_finance') || '{"income":0,"expenses":0}');
            const bal = (fin.income || 0) - (fin.expenses || 0);
            const fmt = n => `R$ ${Math.abs(n).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}`;
            return `\n\n## FINANÇAS (mês atual)\nSaldo: ${fmt(bal)}${bal < 0 ? ' ⚠️ negativo' : ''} · Entradas: ${fmt(fin.income || 0)} · Saídas: ${fmt(fin.expenses || 0)}`;
        } catch (_) { return ''; }
    }

    static _habitsCtx() {
        try {
            const habits = JSON.parse(localStorage.getItem('orbit_habits') || '[]');
            if (!habits.length) return '';
            const today = this.nowBR().toISOString().slice(0, 10);
            const done = habits.filter(h => (h.done || []).includes(today));
            const pending = habits.filter(h => !(h.done || []).includes(today));
            let ctx = `\n\n## HÁBITOS HOJE\n${done.length}/${habits.length} concluídos`;
            if (done.length) ctx += `\nFeitos: ${done.map(h => h.name).join(', ')}`;
            if (pending.length) ctx += `\nPendentes: ${pending.map(h => h.name).join(', ')}`;
            return ctx;
        } catch (_) { return ''; }
    }

    static _projectCtx() {
        try {
            const kb = JSON.parse(localStorage.getItem('orbit_kanban') || '{}');
            const doing = (kb.doing || []).map(c => c.text).slice(0, 4);
            if (!doing.length) return '';
            return `\n\n## PROJETOS EM ANDAMENTO\n${doing.map(t => `- ${t}`).join('\n')}`;
        } catch (_) { return ''; }
    }

    static _weatherCtx() {
        try {
            const raw = sessionStorage.getItem('orbit_weather');
            if (!raw) return '';
            const data = JSON.parse(raw);
            const cur = data?.current;
            if (!cur) return '';
            const temp = Math.round(cur.temperature_2m ?? 0);
            const hum = cur.relativehumidity_2m ?? 0;
            const wind = Math.round(cur.windspeed_10m ?? 0);
            return `\nCLIMA TERESINA: ${temp}°C · Umidade ${hum}% · Vento ${wind}km/h`;
        } catch (_) { return ''; }
    }

    static buildSys(msgs = []) {
        const c = Store.getCfg();
        const now = this.nowBR();
        const dtBR = now.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
        const hr = now.getHours();
        const dow = now.getDay();

        const tone = hr < 5 ? 'MADRUGADA' : hr < 12 ? 'MANHA' : hr < 18 ? 'TARDE' : hr < 22 ? 'NOITE' : 'NOITE ALTA';
        const sundayNote = (dow === 0 && hr >= 19) ? '\nDOMINGO A NOITE: Alinhamento semanal.' : '';

        const epArr = Store.getEp();
        const epBlock = epArr.length
            ? '\n\n## MEMORIA EPISODICA\n' + epArr.slice(-8).map(e => `[${e.d}]: ${e.s}`).join('\n')
            : '';

        const topics = this._detectTopics(msgs);
        let contextExtra = '';
        if (topics.faith && this._faithVerse) {
            contextExtra += `\n\n## CONTEXTO DE FÉ\nVersículo do dia: "${this._faithVerse}"\nSe pertinente, mencione com naturalidade.`;
        }
        if (topics.study) {
            contextExtra += '\n\n## MODO ESTUDO\nO usuário está estudando. Seja didático, use exemplos concretos, estruture bem as explicações.';
        }
        if (topics.finance) contextExtra += this._financeCtx();
        if (topics.health) contextExtra += this._habitsCtx();
        if (topics.project) contextExtra += this._projectCtx();
        const wCtx = this._weatherCtx();
        if (wCtx) contextExtra += wCtx;

        const sys = c.prompt || DEFAULT_PROMPT;
        return `${sys}\n\nCONTEXTO:\nAGORA: ${dtBR}\nTOM: ${tone}${sundayNote}${this.absenceNote()}${this._stressHint}\n\n${Store.getNuc()}${epBlock}${this.agendaContext()}${contextExtra}`;
    }

    static getWindowedMsgs(msgs) {
        const w = Store.getCfg().msgWindow || 20;
        if (msgs.length <= w) return msgs;

        const older = msgs.slice(0, -w);
        const recent = msgs.slice(-w);

        const summary = older
            .map(m => {
                const who = m.role === 'user' ? 'JR' : 'Orbit';
                const txt = (m.content || '').replace(/\[BOOT[^\]]*\]/g, '').trim().slice(0, 80);
                return txt ? `${who}: ${txt}` : null;
            })
            .filter(Boolean)
            .join(' | ')
            .slice(0, 500);

        return [
            { role: 'user', content: `[CONTEXTO ANTERIOR: ${summary}]` },
            { role: 'assistant', content: 'Contexto recebido.' },
            ...recent
        ];
    }

    /* ── GROQ (primary — OpenAI-compatible SSE) ── */
    static async streamGroq(payload, onDelta) {
        const c = Store.getCfg();
        if (!c.groqKey) throw new Error('NO_GROQ_KEY');

        const signal = payload.signal;
        const sysText = payload.system || this.buildSys(payload.messages);
        const messages = [
            { role: 'system', content: sysText },
            ...payload.messages.map(m => ({
                role: m.role === 'assistant' ? 'assistant' : 'user',
                content: m.content || ''
            }))
        ];

        const res = await fetch(GROQ_URL, {
            method: 'POST',
            signal,
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${c.groqKey}`
            },
            body: JSON.stringify({
                model: c.groqModel || GROQ_MODEL,
                messages,
                stream: true,
                temperature: 0.9,
                max_tokens: payload.max_tokens || 2048
            })
        });

        if (!res.ok) {
            let msg = `Groq ${res.status}`;
            try { const j = await res.json(); msg = j.error?.message || msg; } catch (_) {}
            throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw || raw === '[DONE]') continue;
                try {
                    const ev = JSON.parse(raw);
                    const delta = ev.choices?.[0]?.delta?.content;
                    if (delta) onDelta(delta);
                } catch (_) {}
            }
        }
    }

    /* ── GEMINI (fallback — SSE streaming) ── */
    static async streamGemini(payload, onDelta) {
        const c = Store.getCfg();
        if (!c.apiKey) throw new Error('API Key Gemini não configurada. Vá em Configurações → IA.');

        const signal = payload.signal;
        const model = c.model || 'gemini-2.5-flash-lite';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${c.apiKey}`;

        const contents = payload.messages.map((m, idx) => {
            const isLastUser = m.role === 'user' && idx === payload.messages.length - 1;
            const parts = [];
            if (isLastUser && m.image) {
                parts.push({ inline_data: { mime_type: m.image.type, data: m.image.data } });
            }
            if (m.content) parts.push({ text: m.content });
            if (!parts.length) parts.push({ text: ' ' });
            const role = m.role === 'assistant' ? 'model' : 'user';
            return { role, parts };
        });

        // Merge consecutive same-role
        const merged = [];
        for (const item of contents) {
            const prev = merged[merged.length - 1];
            if (prev && prev.role === item.role) { prev.parts.push(...item.parts); }
            else { merged.push({ role: item.role, parts: [...item.parts] }); }
        }
        if (merged.length && merged[0].role !== 'user') {
            merged.unshift({ role: 'user', parts: [{ text: ' ' }] });
        }

        const sysText = payload.system || this.buildSys(payload.messages);

        const res = await fetch(url, {
            method: 'POST',
            signal,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                contents: merged,
                system_instruction: { parts: [{ text: sysText }] },
                generationConfig: {
                    temperature: 0.9,
                    maxOutputTokens: payload.max_tokens || 2048,
                    topP: 0.95
                }
            })
        });

        if (!res.ok) {
            let msg = `Gemini ${res.status}`;
            try { const j = await res.json(); msg = j.error?.message || msg; } catch (_) {}
            throw new Error(msg);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop() || '';

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw || raw === '[DONE]') continue;
                try {
                    const ev = JSON.parse(raw);
                    const delta = ev.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (delta) onDelta(delta);
                } catch (_) {}
            }
        }
    }

    /* ── PUBLIC: streamRequest — Groq com retry, fallback Gemini ── */
    static async streamRequest(payload, onDelta) {
        const c = Store.getCfg();

        if (c.groqKey) {
            for (let attempt = 0; attempt < 3; attempt++) {
                try {
                    await this.streamGroq(payload, onDelta);
                    localStorage.setItem(K.last, Date.now().toString());
                    return { provider: 'groq' };
                } catch (err) {
                    if (err.name === 'AbortError') throw err;

                    const isRateLimit = err.message.includes('429') || err.message.toLowerCase().includes('rate');
                    if (isRateLimit && attempt < 2) {
                        // Exponential backoff: 1s, 2s
                        await new Promise(r => setTimeout(r, Math.pow(2, attempt) * 1000));
                        continue;
                    }
                    if (err.message === 'NO_GROQ_KEY' || c.apiKey) break;
                    throw err;
                }
            }
        }

        await this.streamGemini(payload, onDelta);
        localStorage.setItem(K.last, Date.now().toString());
        return { provider: 'gemini' };
    }

    /* ── INTERNET: decide se a pergunta precisa de dado fresco ── */
    static needsWeb(text = '') {
        const t = text.toLowerCase();
        if (text.length > 600) return false; // texto longo colado ≠ pergunta de busca
        // Gatilhos explícitos de busca
        if (/\b(pesquis|procur(a|e)|busca na|na internet|na web|search|d(á|a) um google|me acha)\w*/.test(t)) return true;
        // Notícias / atualidade
        if (/\b(notícia|noticia|manchete|acontecendo no mundo|últimas|ultimas|aconteceu (hoje|ontem|agora)|tá rolando|ta rolando|que rolou)\w*/.test(t)) return true;
        // Fatos voláteis (preço, cotação, cripto)
        if (/\b(cotaç|cotac|dólar|dolar|euro|bitcoin|cripto|preço de|preco de|quanto custa|quanto tá|quanto ta|valor d(o|a) )\w*/.test(t)) return true;
        // Resultados / lançamentos / horários de eventos
        if (/\b(placar|quem ganhou|quem venceu|resultado d|que horas (é|e|começa|comeca)|quando (é|e|sai|vai sair|lança|lanca|estreia)|lançamento|lancamento)\w*/.test(t)) return true;
        // "quem é / o que é" sobre algo recente
        if (/\b(quem (é|e|foi)|o que (é|e|foi|houve|aconteceu))\b/.test(t) && /\b(202[4-9]|hoje|recent|agora|atual)\w*/.test(t)) return true;
        return false;
    }

    /* ── INTERNET: busca web (Jina → DuckDuckGo fallback) ── */
    static async webSearch(query, signal) {
        const q = (query || '').trim();
        if (!q) return '';

        // 1) Jina Reader Search — top resultados com snippet, sem chave
        try {
            const r = await fetch(`https://s.jina.ai/${encodeURIComponent(q)}`, {
                signal,
                headers: { 'Accept': 'text/plain', 'X-Respond-With': 'no-content' }
            });
            if (r.ok) {
                const txt = (await r.text()).trim();
                if (txt && txt.length > 40) return txt.slice(0, 3500);
            }
        } catch (_) { /* tenta fallback */ }

        // 2) DuckDuckGo Instant Answer (CORS-friendly)
        try {
            const r = await fetch(`https://api.duckduckgo.com/?q=${encodeURIComponent(q)}&format=json&no_html=1&skip_disambig=1`, { signal });
            if (r.ok) {
                const d = await r.json();
                let out = '';
                if (d.AbstractText) out += d.AbstractText + (d.AbstractURL ? ` (${d.AbstractURL})` : '') + '\n';
                if (d.Answer) out += d.Answer + '\n';
                const topics = (d.RelatedTopics || [])
                    .filter(x => x.Text)
                    .slice(0, 5)
                    .map(x => `- ${x.Text}`)
                    .join('\n');
                if (topics) out += topics;
                if (out.trim()) return out.trim().slice(0, 3000);
            }
        } catch (_) { /* sem rede */ }

        return '';
    }

    static async summarizeSession(msgs) {
        if (msgs.length < 10) return;
        const historyText = msgs
            .slice(-15)
            .map(m => `${m.role === 'user' ? 'JR' : 'Orbit'}: ${(m.content || '').slice(0, 200)}`)
            .join('\n');

        try {
            let summary = '';
            await this.streamRequest({
                system: 'Resuma esta conversa em ate 250 caracteres para memoria de longo prazo. Foque em fatos novos, sentimentos ou decisoes. Seja direto.',
                messages: [{ role: 'user', content: historyText }],
                max_tokens: 100
            }, (delta) => { summary += delta; });

            if (summary.trim()) {
                const ep = Store.getEp();
                ep.push({ d: this.dateStrBR(), s: summary.trim() });
                Store.saveEp(ep);
            }
        } catch (_) {}
    }
}
