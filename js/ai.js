/**
 * AI.JS - Gemini API & Infinite Memory Engine
 * Master Class Edition
 */

import { Store, K, DEFAULT_PROMPT } from './store.js';

export class AI {
    static _stressHint = '';
    static _msgLenHint = '';
    static _rlIv = null;
    static _rlUntil = parseInt(localStorage.getItem(K.rl) || '0');

    static nowBR() {
        return new Date(new Date().toLocaleString('en-US', { timeZone: 'America/Fortaleza' }));
    }

    static dateStrBR(d) {
        const dt = d ? new Date(d) : this.nowBR();
        return dt.toLocaleDateString('pt-BR', { timeZone: 'America/Fortaleza', weekday: 'short', day: '2-digit', month: '2-digit' });
    }

    static absenceNote() {
        const last = parseInt(localStorage.getItem(K.last) || '0');
        if (!last) return '';
        const diff = Date.now() - last;
        const hrs = Math.floor(diff / 3600000);
        const days = Math.floor(hrs / 24);
        if (days >= 7) return `\nAUSENCIA (${days} dias): Mencione UMA vez com carinho genuino e leveza. Sem drama, sem cobranca. Depois segue normalmente.`;
        if (days >= 2) return `\nAUSENCIA (${days} dias): Comenta com leveza, uma vez so. Nada de melodrama.`;
        if (hrs >= 18) return `\nLonge quase um dia. Ela percebe — menciona se vier natural, nao obrigatoriamente.`;
        return '';
    }

    static agendaContext() {
        const agenda = Store.get(K.agenda, []);
        const disc = Store.get(K.disc, []);
        const now = this.nowBR();
        const today = now.toISOString().slice(0, 10);
        const dow = now.getDay();
        const dowNames = ['Domingo', 'Segunda', 'Terca', 'Quarta', 'Quinta', 'Sexta', 'Sabado'];
        
        const todayItems = agenda.filter(a => a.date === today).sort((a, b) => (a.time || '').localeCompare(b.time || ''));
        const upcoming = agenda.filter(a => a.date > today).sort((a, b) => a.date.localeCompare(b.date)).slice(0, 5);
        const todayDisc = disc.filter(d => d.days && d.days.indexOf(dow) >= 0);
        
        let ctx = '';
        if (todayItems.length || todayDisc.length) {
            ctx += '\n\n## AGENDA DE HOJE\n';
            todayDisc.forEach(d => { ctx += `- DISCIPLINA: ${d.name}${d.professor ? ' - ' + d.professor : ''}${d.time ? ' as ' + d.time : ''}\n`; });
            todayItems.forEach(a => { ctx += `- ${a.time ? a.time + ' ' : ''}${a.title}\n`; });
        }
        if (upcoming.length) {
            ctx += '\n## PROXIMOS COMPROMISSOS\n';
            upcoming.forEach(a => { ctx += `- ${this.dateStrBR(a.date)}: ${a.title}${a.time ? ' as ' + a.time : ''}\n`; });
        }
        return ctx;
    }

    static buildSys() {
        const c = Store.getCfg();
        const now = this.nowBR();
        const dtBR = now.toLocaleString('pt-BR', { dateStyle: 'full', timeStyle: 'short' });
        const hr = now.getHours();
        const dow = now.getDay();
        
        const tone = hr < 5 ? 'MADRUGADA - bronca carinhosa' : hr < 12 ? 'MANHA - energia alta' : hr < 18 ? 'TARDE - foco' : hr < 22 ? 'NOITE - suave' : 'NOITE ALTA - aconchegante';
        const sundayNote = (dow === 0 && hr >= 19) ? '\nDOMINGO A NOITE: Alinhamento semanal. Ajuda o Pai a entrar blindado na semana.' : '';
        
        const epArr = Store.getEp();
        const epBlock = epArr.length ? '\n\n## MEMORIA EPISODICA (Contexto anterior)\n' + epArr.slice(-8).map((e, i) => `[S${i + 1} - ${e.d}]: ${e.s}`).join('\n') : '';
        
        return `${c.prompt}\n\nCONTEXTO DINAMICO:\nAGORA: ${dtBR}\nCLIMA: ${tone}${sundayNote}${this.absenceNote()}${this._stressHint}${this._msgLenHint}\n\n${Store.getNuc()}${epBlock}${this.agendaContext()}`;
    }

    static getWindowedMsgs(m) {
        const w = Store.getCfg().msgWindow || 20;
        if (m.length <= w) return m;

        /* Infinite Memory Logic: Hierarchical Summary */
        const older = m.slice(0, -w);
        const recent = m.slice(-w);
        
        // Simple condensation for now, to be upgraded to AI-driven summarization in Phase 1
        const summary = older.map(msg => {
            const who = msg.role === 'user' ? 'JR' : 'Orbit';
            const txt = msg.content.replace(/\[BOOT[^\]]*\]/g, '').trim().slice(0, 80);
            return txt ? `${who}: ${txt}` : null;
        }).filter(Boolean).join(' | ').slice(0, 600);

        return [
            { role: 'user', content: `[RESUMO DO PASSADO: ${summary}]` },
            { role: 'assistant', content: 'Entendido, mantendo esse contexto na memoria.' },
            ...recent
        ];
    }

    static async streamRequest(payload, onDelta) {
        const c = Store.getCfg();
        const model = c.model || 'gemini-2.5-flash-lite';
        
        const contents = payload.messages.map((m, idx) => {
            const parts = [{ text: m.content }];
            if (payload.image && m.role === 'user' && idx === payload.messages.length - 1) {
                parts.unshift({ inline_data: { mime_type: payload.image.mimeType, data: payload.image.data } });
            }
            return { role: m.role === 'assistant' ? 'model' : 'user', parts };
        });

        const body = {
            contents,
            system_instruction: params.system ? { parts: [{ text: params.system }] } : { parts: [{ text: this.buildSys() }] },
            generationConfig: {
                temperature: 0.9,
                maxOutputTokens: params.max_tokens || 2048,
                topP: 0.95
            }
        };

        const res = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body)
        });

        if (!res.ok) {
            const errBody = await res.json().catch(() => ({}));
            throw new Error(errBody.error?.message || `Erro ${res.status}`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split('\n');
            buffer = lines.pop();

            for (const line of lines) {
                if (!line.startsWith('data: ')) continue;
                const raw = line.slice(6).trim();
                if (!raw || raw === '[DONE]') continue;
                try {
                    const ev = JSON.parse(raw);
                    const delta = ev.candidates?.[0]?.content?.parts?.[0]?.text;
                    if (delta) onDelta(delta);
                } catch (e) {}
            }
        }
    }

    static async summarizeSession(msgs) {
        if (msgs.length < 10) return;
        const c = Store.getCfg();
        const historyText = msgs.slice(-15).map(m => `${m.role === 'user' ? 'JR' : 'Orbit'}: ${m.content}`).join('\n');
        
        const prompt = `Como Orbit Sophy, resuma os pontos cruciais desta conversa em ate 300 caracteres para sua memoria de longo prazo. Foque em fatos novos, sentimentos do Pai ou decisoes tomadas. Seja direta e carinhosa.`;
        
        try {
            let summary = '';
            await this.streamRequest({
                system: prompt,
                messages: [{ role: 'user', content: historyText }],
                max_tokens: 150
            }, (delta) => { summary += delta; });
            
            if (summary) {
                const ep = Store.getEp();
                ep.push({ d: this.dateStrBR(), s: summary });
                Store.saveEp(ep);
            }
        } catch (e) {
            console.error('Erro na sumarizacao:', e);
        }
    }
}
