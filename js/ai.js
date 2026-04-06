/**
 * AI.JS - Gemini API & Infinite Memory Engine
 * Master Class Edition — Audited & Fixed
 */

import { Store, K, DEFAULT_PROMPT } from './store.js';

export class AI {
    static _stressHint = '';
    static _msgLenHint = '';

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

    static buildSys() {
        const c = Store.getCfg();
        const now = this.nowBR();
        const dtBR = now.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
        const hr = now.getHours();
        const dow = now.getDay();
        
        const tone = hr < 5 ? 'MADRUGADA' : hr < 12 ? 'MANHA' : hr < 18 ? 'TARDE' : hr < 22 ? 'NOITE' : 'NOITE ALTA';
        const sundayNote = (dow === 0 && hr >= 19) ? '\nDOMINGO A NOITE: Alinhamento semanal.' : '';
        
        const epArr = Store.getEp();
        const epBlock = epArr.length
            ? '\n\n## MEMORIA EPISODICA\n' + epArr.slice(-8).map((e, i) => `[${e.d}]: ${e.s}`).join('\n')
            : '';
        
        const sys = c.prompt || DEFAULT_PROMPT;
        return `${sys}\n\nCONTEXTO:\nAGORA: ${dtBR}\nCLIMA: ${tone}${sundayNote}${this.absenceNote()}${this._stressHint}\n\n${Store.getNuc()}${epBlock}${this.agendaContext()}`;
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
            { role: 'model', content: 'Contexto recebido.' },
            ...recent
        ];
    }

    static async streamRequest(payload, onDelta) {
        const c = Store.getCfg();
        if (!c.apiKey) throw new Error('API Key não configurada. Vá em Configurações → Sistema.');
        
        const model = c.model || 'gemini-2.5-flash-lite';
        const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:streamGenerateContent?alt=sse&key=${c.apiKey}`;

        // Build message parts — support text + optional image in last user message
        const contents = payload.messages.map((m, idx) => {
            const isLastUser = m.role === 'user' && idx === payload.messages.length - 1;
            const parts = [];

            // Add image if present in the message itself
            if (isLastUser && m.image) {
                parts.push({ inline_data: { mime_type: m.image.type, data: m.image.data } });
            }

            if (m.content) parts.push({ text: m.content });
            if (!parts.length) parts.push({ text: ' ' }); // Gemini requires at least one part

            const role = m.role === 'assistant' ? 'model' : 'user';
            return { role, parts };
        });

        // Merge consecutive same-role messages (Gemini API requirement)
        const mergedContents = [];
        for (const c of contents) {
            const prev = mergedContents[mergedContents.length - 1];
            if (prev && prev.role === c.role) {
                prev.parts.push(...c.parts);
            } else {
                mergedContents.push({ role: c.role, parts: [...c.parts] });
            }
        }

        // Must start with user role
        if (mergedContents.length && mergedContents[0].role !== 'user') {
            mergedContents.unshift({ role: 'user', parts: [{ text: ' ' }] });
        }

        const sysText = payload.system || this.buildSys();

        const body = {
            contents: mergedContents,
            system_instruction: { parts: [{ text: sysText }] },
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: payload.max_tokens || 2048,
                topP: 0.95
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            let msg = `Erro ${res.status}`;
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

        // Update last seen timestamp
        localStorage.setItem(K.last, Date.now().toString());
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
        } catch (e) {
            // Silent fail — summarization is background task
        }
    }
}
