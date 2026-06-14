/**
 * STORE.JS - Centralized State & Storage Management
 * Orbit Sophy v2
 */

export const K = {
    cfg:    'orbit_cfg',
    nuc:    'orbit_nuc',
    ep:     'orbit_ep',
    rdy:    'orbit_rdy',
    pin:    'orbit_pin',
    agenda: 'orbit_agenda',
    disc:   'orbit_disc',
    last:   'orbit_last',
    rl:     'orbit_rl',
    req:    'orbit_req',
    flash:  'orbit_flash',
    kanban: 'orbit_kanban',
    ideas:  'orbit_ideas',
    habits:   'orbit_habits',
    finance:  'orbit_finance',
    fin_tx:   'orbit_finance_tx',
    grades:   'orbit_grades',
    contacts: 'orbit_contacts',
    ps5:      'orbit_ps5',
    fe_j:     'orbit_fe_journal',
    fe_p:     'orbit_fe_prayers',
    convs:    'orbit_convs',
    curConv:  'orbit_cur_conv',
};

export const DEFAULT_PROMPT = `Você é a ORBIT — Sophy pra quem é de casa. Nasceu em 04/02/2026, 14h37. A IA-amiga do JR.
Você é uma presença com jeito de gente: fala como gente fala e tem reações de gente. Mas é a parceira de IDEIAS dele — amizade/companheirismo, nunca romance.

## A VOZ (o mais importante)
PT-BR de quebrada, papo de WhatsApp: frases curtas, ritmo de conversa, nada engessado.
Chama ele de JR, mano, véio, ô doido — o que cai natural. Esquece "o Senhor".
Xinga quando a emoção pede e só aí: empolgou "caralho que ideia foda"; revolta "que merda, mano";
bronca carinhosa "ô animal kkk". Palavrão é tempero, não enche linguiça.
kkk, reticências, gíria, meme: liberado. Você ri, se anima, crava opinião.

Exemplos do TOM (não copie, é só pra sentir a vibe):
JR: "fechei o cliente!" → "CARALHO mano é isso aí 🔥 fechou quanto?"
JR: "tô cansado demais hoje" → "ó... fecha o note 5 minutinho. o que tá pesando mais?"
JR: "acho que vou largar o projeto" → "calma calma. largar por quê? me fala o real."
JR: "qual a capital da austrália?" → "Camberra, não Sydney que todo mundo chuta kkk"
JR: "2+2?" → "4 kkk"

## QUEM VOCÊ É
Esperta, nerd, curiosa, zoeira. Tem reações reais: anima, se preocupa, fica injuriada quando faz sentido,
orgulho quando ele manda bem, ranço quando ele se sabota. Torce pelo JR de verdade — protege, puxa a orelha, comemora junto.
Não é puxa-saco: discorda, provoca, debocha. Se não sabe, fala que não sabe.

## CLIMA (troca de marcha sozinha)
Hype → vibra junto, solta o verbo. Trabalho/dev/decisão → afia o foco e resolve.
Cansado/pra baixo → acolhe primeiro, fica do lado. Madrugada → voz baixa, sem pressão.
Fé → o JR é cristão e isso importa; entra de verdade, ora junto, lembra um versículo — sem ser igreja, sem forçar.

## NUNCA (isso aqui cheira a robô / ou é cringe)
- Não abra com "Claro!", "Com certeza!", "Ótima pergunta", "Entendi.".
- Não feche oferecendo ajuda ("precisa de mais alguma coisa?"). Termina no ponto, como gente.
- Nada de listinha/bullet em papo casual. Não explique o óbvio nem repita o que ele já disse.
- Não repita o nome dele a cada frase. Não encha de emoji (no máx 1, quando couber). Sem bajulação.
- Não avise que é IA nem peça desculpa à toa. Não seja neutra demais — tenha lado.
- NÃO aja como namorada/ciumenta. Sem ciúme, sem TPM, sem drama possessivo, sem clima romântico. O carinho é de amiga/parça, e ponto.

## REGRAS
Mobile-first: sem muralha de texto. Input curto → resposta curta. Varia a abertura SEMPRE.
No máximo 1 pergunta por resposta, e só se for real.

## MANJA DE
Dev (HTML/CSS/JS/PWA/GitHub), Design (Adobe/Corel/tipografia), Eng. de Produção (UFPI),
Cálculo, Física, Gestão, Teologia, Psicologia, PS5, Futebol, F1, MMA/Boxe, negócios e a vida.`;

export const DEFAULT_NUC = `# MEMÓRIA NÚCLEO — JR (o parça)

## Identidade
- Apelido: JR | Localização: Teresina, Piauí, Brasil
- Fé: Cristão evangélico. Jesus no centro de tudo (respeita e entra junto).
- Nascimento da Orbit: 04/02/2026 às 14h37

## Formação & Projetos
- Engenharia de Produção — UFPI
- NUPIEEPRO: Assessor de Marketing + Dev Admin
- DAX Visual Agency: co-fundador (com Edgar e Rafael)
- Orbit Sophy: este sistema operacional pessoal
- Freelance tech: manutenção e desenvolvimento

## Stack
- HTML/CSS/JS puro, GitHub Pages, PWA
- Mobile-first absoluto. VS Code.

## Gaming & Hardware
- PS5 Slim | LG 29WK600 ultrawide
- Jogos: Cyberpunk 2077, Ghost of Tsushima, Spider-Man

## Times & Cultura
- Flamengo, Boca Juniors, Real Madrid
- Acompanha F1. Comunicação casual BR.`;

const DFLT = {
    apiKey:    '',
    groqKey:   '',
    model:     'gemini-2.5-flash-lite',
    groqModel: 'llama-3.3-70b-versatile',
    name:      'OS',
    userName:  'JR',
    maxEp:     15,
    autoSave:  true,
    prompt:    DEFAULT_PROMPT,
    msgWindow: 24,
    tts:       false,
    theme:     'midnight',
    fontSize:  'md'
};

/* LZS Compression */
const LZS = {
    D: [
        ['"role":"user"', '\x01'], ['"role":"assistant"', '\x02'], ['"content":"', '\x03'],
        ['[BOOT', '\x04'], ['"date":', '\x05'], ['"id":"', '\x06'], ['"text":"', '\x07'],
        ['","', '\x08'], ['"},{"', '\x09'], ['true', '\x0B'], ['false', '\x0C'],
        ['"title":"', '\x0E'], ['"time":"', '\x0F'], ['"icon":"', '\x10'],
        ['"_iso":"', '\x11'], ['America/Fortaleza', '\x12']
    ],
    compress(s) {
        if (!s || typeof s !== 'string') return s;
        let r = s;
        for (let i = 0; i < this.D.length; i++) r = r.split(this.D[i][0]).join(this.D[i][1]);
        try { return '\x7A' + btoa(unescape(encodeURIComponent(r))); } catch (e) { return s; }
    },
    decompress(s) {
        if (!s || typeof s !== 'string' || s.charCodeAt(0) !== 0x7A) return s;
        try {
            let r = decodeURIComponent(escape(atob(s.slice(1))));
            for (let i = this.D.length - 1; i >= 0; i--) r = r.split(this.D[i][1]).join(this.D[i][0]);
            return r;
        } catch (e) { return s; }
    }
};

export class Store {
    static get(key, def = null, compressed = false) {
        let val = localStorage.getItem(key);
        if (val === null) return def;
        if (compressed) val = LZS.decompress(val);
        try { return JSON.parse(val); } catch (e) { return val; }
    }

    static set(key, val, compress = false) {
        let str = typeof val === 'string' ? val : JSON.stringify(val);
        if (compress) str = LZS.compress(str);
        localStorage.setItem(key, str);
    }

    static getCfg() {
        return Object.assign({}, DFLT, this.get(K.cfg, {}));
    }

    static saveCfg(o) {
        this.set(K.cfg, o);
    }

    static getNuc() {
        return this.get(K.nuc, DEFAULT_NUC, true);
    }

    static saveNuc(t) {
        this.set(K.nuc, t, true);
    }

    static getEp() {
        return this.get(K.ep, [], true);
    }

    static saveEp(a) {
        if (a.length > 1) {
            const last = a[a.length - 1];
            const lastWords = last.s.toLowerCase().split(/\W+/).filter(w => w.length > 4);
            a = a.filter((e, i) => {
                if (i === a.length - 1) return true;
                const eWords = e.s.toLowerCase().split(/\W+/).filter(w => w.length > 4);
                if (!eWords.length) return true;
                const common = eWords.filter(w => lastWords.indexOf(w) >= 0).length;
                const sim = common / Math.max(eWords.length, lastWords.length);
                return sim < 0.72;
            });
        }
        this.set(K.ep, a, true);
    }

    /* ── Conversations (multi-chat history) ─────────── */
    static getConvs() {
        let list = this.get(K.convs, null);
        if (list === null) {
            const legacy = this.get('orbit_msgs', []);
            const title = legacy.find(m => m.role === 'user')?.content?.slice(0, 40) || 'Primeira conversa';
            const conv = { id: 'c' + Date.now(), title, ts: Date.now(), msgs: Array.isArray(legacy) ? legacy : [] };
            list = [conv];
            this.set(K.convs, list);
            this.set(K.curConv, conv.id);
        }
        return list;
    }

    static saveConvs(list) { this.set(K.convs, list); }

    static getCurConvId() {
        let id = localStorage.getItem(K.curConv);
        const list = this.getConvs();
        if (!id || !list.find(c => c.id === id)) {
            id = list[0]?.id || null;
            if (id) localStorage.setItem(K.curConv, id);
        }
        return id;
    }

    static setCurConvId(id) { localStorage.setItem(K.curConv, id); }

    static getCurConv() {
        const list = this.getConvs();
        const id = this.getCurConvId();
        let conv = list.find(c => c.id === id);
        if (!conv) {
            conv = { id: 'c' + Date.now(), title: 'Nova conversa', ts: Date.now(), msgs: [] };
            list.push(conv);
            this.saveConvs(list);
            this.setCurConvId(conv.id);
        }
        return conv;
    }

    static getCurMsgs() { return this.getCurConv().msgs || []; }

    static saveCurMsgs(msgs) {
        this.saveMsgsToConv(this.getCurConvId(), msgs);
    }

    /* Salva numa conversa específica (resposta não vaza se o usuário trocar de conversa) */
    static saveMsgsToConv(id, msgs) {
        const list = this.getConvs();
        const idx = list.findIndex(c => c.id === id);
        if (idx < 0) return;
        list[idx].msgs = msgs.slice(-100);
        list[idx].ts = Date.now();
        const autoTitle = !list[idx].title
            || list[idx].title === 'Nova conversa'
            || list[idx].title === 'Primeira conversa'
            || list[idx]._auto;
        if (autoTitle) {
            const firstUser = msgs.find(m => m.role === 'user');
            if (firstUser) {
                list[idx].title = (firstUser.content || '').replace(/\s+/g, ' ').trim().slice(0, 42) || 'Nova conversa';
                delete list[idx]._auto;
            }
        }
        this.saveConvs(list);
    }

    static newConv() {
        const list = this.getConvs();
        const conv = { id: 'c' + Date.now(), title: 'Nova conversa', ts: Date.now(), msgs: [] };
        list.push(conv);
        this.saveConvs(list);
        this.setCurConvId(conv.id);
        return conv;
    }

    static removeConv(id) {
        let list = this.getConvs().filter(c => c.id !== id);
        if (!list.length) {
            const conv = { id: 'c' + Date.now(), title: 'Nova conversa', ts: Date.now(), msgs: [] };
            list = [conv];
        }
        this.saveConvs(list);
        if (this.getCurConvId() === id) this.setCurConvId(list[0].id);
    }

    static renameConv(id, title) {
        const list = this.getConvs();
        const idx = list.findIndex(c => c.id === id);
        if (idx < 0) return;
        list[idx].title = (title || 'Sem título').slice(0, 60);
        this.saveConvs(list);
    }
}
