/**
 * ENTERTAINMENT.JS — F1, Futebol, Boxe/MMA, PS5, Notícias
 */
import { Store } from './store.js';

const F1_BASE     = 'https://api.jolpi.ca/ergast/f1';
const ESPN_BASE   = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const ESPN_BOXING = 'https://site.api.espn.com/apis/site/v2/sports/boxing';
const ESPN_MMA    = 'https://site.api.espn.com/apis/site/v2/sports/mma';
const TM_BASE     = 'https://transfermarkt-api.fly.dev';
const RSS2JSON    = 'https://api.rss2json.com/v1/api.json';
const TTL         = 30 * 60 * 1000;
const TTL_NEWS    = 20 * 60 * 1000;

function _norm(s) {
    return (s || '').toString().toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function scGet(key, ttl = TTL) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        return Date.now() - ts < ttl ? data : null;
    } catch { return null; }
}

function scSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

/* Proxies CORS — alguns hosts (ESPN) podem bloquear fetch direto no celular */
const CORS_WRAPS = [
    u => u,
    u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
    u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
    u => `https://thingproxy.freeboard.io/fetch/${u}`
];

/* GET JSON resiliente: tenta direto e cai em proxies se falhar/vier vazio */
async function fetchJSON(url, timeout = 8000) {
    for (const wrap of CORS_WRAPS) {
        try {
            const r = await fetch(wrap(url), { signal: AbortSignal.timeout(timeout) });
            if (!r.ok) continue;
            const txt = await r.text();
            if (!txt) continue;
            try { return JSON.parse(txt); } catch { continue; }
        } catch { /* tenta próximo proxy */ }
    }
    return null;
}

export class Entertainment {
    /* ── F1 ─────────────────────────────────────────── */
    static async getF1NextRace() {
        const hit = scGet('ent_f1_next');
        if (hit) return hit;
        try {
            const d = await fetchJSON(`${F1_BASE}/current/next.json`, 7000);
            if (!d) return null;
            const race = d?.MRData?.RaceTable?.Races?.[0];
            if (!race) return null;
            const result = {
                name: race.raceName,
                circuit: race.Circuit?.circuitName,
                date: race.date,
                time: race.time || '00:00:00Z',
                round: parseInt(race.round),
                season: race.season,
                country: race.Circuit?.Location?.country
            };
            scSet('ent_f1_next', result);
            return result;
        } catch { return null; }
    }

    static async getF1Standings() {
        const hit = scGet('ent_f1_stand');
        if (hit) return hit;
        try {
            const d = await fetchJSON(`${F1_BASE}/current/driverStandings.json`, 7000);
            if (!d) return [];
            const list = (d?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || [])
                .slice(0, 5)
                .map(s => ({
                    pos: s.position || '?',
                    name: s.Driver?.familyName || s.Driver?.name || '?',
                    team: s.Constructors?.[0]?.name || '',
                    pts: s.points || 0
                }))
                .filter(s => s.name !== '?');
            scSet('ent_f1_stand', list);
            return list;
        } catch { return []; }
    }

    /* ── TEAMS (localStorage) ───────────────────────── */
    static getTeams() { return Store.get('orbit_teams', []); }
    static saveTeams(t) { Store.set('orbit_teams', t); }
    static removeTeam(id) { this.saveTeams(this.getTeams().filter(t => t.id !== id)); }

    /* ── ESPN: busca times na liga ──────────────────── */
    static async searchESPNTeam(query, league) {
        const cacheKey = `ent_espn_${league}`;
        let list = scGet(cacheKey);
        if (!list || !list.length) {
            const d = await fetchJSON(`${ESPN_BASE}/${league}/teams?limit=500`, 9000);
            list = d?.sports?.[0]?.leagues?.[0]?.teams || [];
            if (list.length) scSet(cacheKey, list);
        }
        const q = _norm(query).trim();
        if (!q) return [];
        const tokens = q.split(/\s+/).filter(Boolean);

        const matches = list.filter(t => {
            const names = [
                t.team?.displayName,
                t.team?.shortDisplayName,
                t.team?.name,
                t.team?.nickname,
                t.team?.abbreviation
            ].map(_norm).join(' ');
            return tokens.every(tok => names.includes(tok));
        });

        return matches.slice(0, 8).map(t => ({
            espnId: t.team.id,
            name: t.team.displayName
        }));
    }

    /* ── ESPN: próximo jogo do time ─────────────────── */
    static async getTeamNext(espnId, espnLeague) {
        if (!espnId || !espnLeague) return null;
        const key = `ent_next_${espnId}`;
        const hit = scGet(key);
        if (hit) return hit;
        try {
            const d = await fetchJSON(`${ESPN_BASE}/${espnLeague}/teams/${espnId}/schedule`, 9000);
            if (!d) return null;
            const now = Date.now();
            const upcoming = (d?.events || []).find(e => {
                const status = e.competitions?.[0]?.status?.type?.name || '';
                const dt = new Date(e.date).getTime();
                return status === 'STATUS_SCHEDULED' || status === 'STATUS_IN_PROGRESS' || (dt > now - 3 * 3600000);
            });
            if (!upcoming) return null;
            const comp = upcoming.competitions?.[0];
            const competitors = comp?.competitors || [];
            const home = competitors.find(c => c.homeAway === 'home');
            const away = competitors.find(c => c.homeAway === 'away');
            const result = {
                home: home?.team?.displayName || '?',
                homeScore: home?.score ?? null,
                away: away?.team?.displayName || '?',
                awayScore: away?.score ?? null,
                date: upcoming.date,
                status: comp?.status?.type?.shortDetail || '',
                live: comp?.status?.type?.name === 'STATUS_IN_PROGRESS'
            };
            scSet(key, result);
            return result;
        } catch { return null; }
    }

    /* ── ESPN: últimos resultados do time ───────────── */
    static async getTeamLastResults(espnId, espnLeague, n = 5) {
        if (!espnId || !espnLeague) return [];
        const key = `ent_last_${espnId}`;
        const hit = scGet(key);
        if (hit) return hit;
        try {
            const d = await fetchJSON(`${ESPN_BASE}/${espnLeague}/teams/${espnId}/schedule`, 9000);
            if (!d) return [];
            const completed = (d.events || [])
                .filter(e => e.competitions?.[0]?.status?.type?.completed)
                .slice(-n)
                .map(e => {
                    const comp = e.competitions?.[0];
                    const home = comp?.competitors?.find(c => c.homeAway === 'home');
                    const away = comp?.competitors?.find(c => c.homeAway === 'away');
                    const isHome = home?.team?.id === String(espnId);
                    const myScore = parseInt((isHome ? home : away)?.score || 0);
                    const oppScore = parseInt((isHome ? away : home)?.score || 0);
                    const opp = (isHome ? away : home)?.team?.displayName || '?';
                    const result = myScore > oppScore ? 'W' : myScore < oppScore ? 'L' : 'D';
                    return { result, myScore, oppScore, opp: opp.slice(0, 14) };
                })
                .reverse();
            scSet(key, completed);
            return completed;
        } catch { return []; }
    }

    /* ── ESPN: posição na tabela do time ────────────── */
    static async getTeamStanding(espnId, espnLeague) {
        if (!espnId || !espnLeague) return null;
        const key = `ent_stand_${espnId}`;
        const hit = scGet(key);
        if (hit) return hit;
        try {
            const d = await fetchJSON(`${ESPN_BASE}/${espnLeague}/standings`, 9000);
            const entries = d?.children?.[0]?.standings?.entries || d?.standings?.entries || [];
            const entry = entries.find(e => e.team?.id === String(espnId));
            if (!entry) return null;
            const stats = {};
            (entry.stats || []).forEach(s => { stats[s.name] = s.value; });
            const result = {
                pos: stats.rank ?? entries.indexOf(entry) + 1,
                pts: stats.points ?? 0,
                wins: stats.wins ?? 0,
                losses: stats.losses ?? 0,
                draws: stats.ties ?? 0
            };
            scSet(key, result);
            return result;
        } catch { return null; }
    }

    /* ── Transfermarkt: busca time ──────────────────── */
    static async searchTMTeam(query) {
        const q = encodeURIComponent(query);
        const urls = [
            `${TM_BASE}/clubs/search/${q}`,
            `${TM_BASE}/clubs/search?query=${q}`
        ];
        for (const u of urls) {
            try {
                const r = await fetch(u, { signal: AbortSignal.timeout(8000) });
                if (!r.ok) continue;
                const d = await r.json();
                const clubs = d?.results || d?.clubs || d?.items || [];
                if (!clubs.length) continue;
                return clubs.slice(0, 6).map(t => ({
                    tmId: String(t.id || t.club_id || t.clubID || ''),
                    name: t.name || t.club_name || t.title || '',
                    country: t.country?.name || t.country || ''
                })).filter(t => t.tmId && t.name);
            } catch { /* try next */ }
        }
        return [];
    }

    /* ── Transfermarkt: transferências ──────────────── */
    static async getTeamTransfers(tmId) {
        if (!tmId) return null;
        const key = `ent_tm_${tmId}`;
        const hit = scGet(key);
        if (hit) return hit;

        const season = this._currentTMSeason();
        const urls = [
            `${TM_BASE}/clubs/${tmId}/transfers?season_id=${season}`,
            `${TM_BASE}/clubs/${tmId}/transfers/${season}`,
            `${TM_BASE}/clubs/${tmId}/transfers`
        ];

        for (const u of urls) {
            try {
                const r = await fetch(u, { signal: AbortSignal.timeout(12000) });
                if (!r.ok) continue;
                const d = await r.json();
                const result = this._parseTransfers(d);
                if (result.arrivals.length || result.departures.length) {
                    scSet(key, result);
                    return result;
                }
            } catch { /* try next */ }
        }
        return null;
    }

    static _currentTMSeason() {
        const now = new Date();
        // Temporada europeia: Jul-Jun. Antes de jul → temporada anterior.
        return now.getMonth() >= 6 ? now.getFullYear() : now.getFullYear() - 1;
    }

    static _parseTransfers(d) {
        const buckets = d?.transfers || d || {};
        let arrivalsRaw = buckets?.arrivals || buckets?.in || buckets?.arriving || [];
        let departuresRaw = buckets?.departures || buckets?.out || buckets?.leaving || [];

        // Forma alternativa: lista única com "direction" ou "movement"
        if (!arrivalsRaw.length && !departuresRaw.length && Array.isArray(buckets)) {
            arrivalsRaw = buckets.filter(t => (t.direction || t.movement || '').toLowerCase().startsWith('in') || t.type === 'arrival');
            departuresRaw = buckets.filter(t => (t.direction || t.movement || '').toLowerCase().startsWith('out') || t.type === 'departure');
        }

        if (!Array.isArray(arrivalsRaw)) arrivalsRaw = [];
        if (!Array.isArray(departuresRaw)) departuresRaw = [];

        const norm = (t) => ({
            name: t.name || t.player_name || t.playerName || t.player?.name || '?',
            position: t.position || t.player?.position || t.role || '',
            from: t.from?.name || t.from_club_name || t.fromClubName || t.left_team?.name || t.club_from?.name || t.fromClub || '?',
            fromImg: t.from?.image || t.fromClubImage || t.from?.logo || '',
            to:   t.to?.name   || t.to_club_name   || t.toClubName   || t.joined_team?.name || t.club_to?.name   || t.toClub   || '?',
            toImg: t.to?.image || t.toClubImage || t.to?.logo || '',
            fee: t.fee || t.transfer_fee || t.transferFee || t.cost || '—',
            market_value: t.market_value || t.marketValue || t.value || '',
            date: t.date || t.transfer_date || t.transferDate || t.dateUnix || t.date_unix || null
        });

        return {
            arrivals:   arrivalsRaw.slice(0, 14).map(norm),
            departures: departuresRaw.slice(0, 14).map(norm)
        };
    }

    /* ── Mercado global: agrega transferências de clubes-top por liga ── */
    static _LEAGUE_CLUBS = {
        'bra.1': ['614', '1023', '199', '585', '221', '210', '6600', '330'],
        'eng.1': ['281', '985', '31', '11', '631', '148', '762'],
        'esp.1': ['418', '131', '13', '1043'],
        'ita.1': ['506', '46', '5', '6195'],
        'ger.1': ['27', '16', '41'],
        'fra.1': ['583', '591', '273']
    };

    static async getGlobalTransfers(league = 'all') {
        const key = `ent_global_tm_${league}`;
        const hit = scGet(key);
        if (hit) return hit;

        const entries = league === 'all'
            ? Object.entries(this._LEAGUE_CLUBS).flatMap(([lg, ids]) => ids.slice(0, 4).map(id => [lg, id]))
            : (this._LEAGUE_CLUBS[league] || []).map(id => [league, id]);

        const results = await Promise.allSettled(
            entries.map(([lg, id]) => this.getTeamTransfers(id).then(d => ({ lg, d })))
        );

        const all = [];
        for (const r of results) {
            if (r.status !== 'fulfilled' || !r.value.d) continue;
            const { lg, d } = r.value;
            for (const a of d.arrivals || []) all.push({ ...a, league: lg, direction: 'in' });
            for (const dep of d.departures || []) all.push({ ...dep, league: lg, direction: 'out' });
        }

        const seen = new Set();
        const uniq = all.filter(t => {
            const k = `${t.name}|${t.from}|${t.to}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });

        scSet(key, uniq);
        return uniq;
    }

    /* ── Transferências dos times que o usuário segue ── */
    static async getMyTeamsTransfers() {
        const teams = this.getTeams().filter(t => t.tmId);
        if (!teams.length) return [];

        const results = await Promise.allSettled(
            teams.map(t => this.getTeamTransfers(t.tmId).then(d => ({ t, d })))
        );

        const all = [];
        for (const r of results) {
            if (r.status !== 'fulfilled' || !r.value.d) continue;
            const { t, d } = r.value;
            for (const a of d.arrivals || []) all.push({ ...a, league: t.espnLeague || '', direction: 'in' });
            for (const dep of d.departures || []) all.push({ ...dep, league: t.espnLeague || '', direction: 'out' });
        }

        const seen = new Set();
        return all.filter(t => {
            const k = `${t.name}|${t.from}|${t.to}`;
            if (seen.has(k)) return false;
            seen.add(k);
            return true;
        });
    }

    /* ── Wikipedia URL fallback p/ transferências ──── */
    static transfermarktURL(tmId, teamName) {
        if (tmId) return `https://www.transfermarkt.com/club/transfers/verein/${tmId}`;
        return `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(teamName || '')}`;
    }

    /* ── NOTÍCIAS (PT-BR, multi-fonte + multi-proxy) ──── */
    static _newsFeeds(topic) {
        const T = {
            top:    'https://news.google.com/rss?hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            tech:   'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            world:  'https://news.google.com/rss/headlines/section/topic/WORLD?hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            sports: 'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            business:'https://news.google.com/rss/headlines/section/topic/BUSINESS?hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            ai:     'https://news.google.com/rss/search?q=intelig%C3%AAncia+artificial+OR+IA+OR+tecnologia+OR+programa%C3%A7%C3%A3o&hl=pt-BR&gl=BR&ceid=BR:pt-BR'
        };
        return T[topic] || T.top;
    }

    /* Busca um feed RSS tentando vários proxies (resiliência) */
    static async _fetchRSS(feedUrl, count = 10) {
        // 1) rss2json (JSON direto)
        try {
            const url = `${RSS2JSON}?rss_url=${encodeURIComponent(feedUrl)}&count=${count}`;
            const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
            if (r.ok) {
                const d = await r.json();
                if (d?.status === 'ok' && d.items?.length) {
                    return d.items.map(it => ({
                        title: it.title || '',
                        link: it.link || '#',
                        author: it.author || '',
                        pubDate: it.pubDate || ''
                    }));
                }
            }
        } catch { /* próximo */ }

        // 2) allorigins → XML cru, parse manual com DOMParser
        const proxies = [
            u => `https://corsproxy.io/?url=${encodeURIComponent(u)}`,
            u => `https://api.allorigins.win/raw?url=${encodeURIComponent(u)}`,
            u => `https://thingproxy.freeboard.io/fetch/${u}`,
            u => `https://api.codetabs.com/v1/proxy/?quest=${encodeURIComponent(u)}`
        ];
        for (const wrap of proxies) {
            try {
                const r = await fetch(wrap(feedUrl), { signal: AbortSignal.timeout(9000) });
                if (!r.ok) continue;
                const xml = await r.text();
                const items = this._parseRSSXml(xml).slice(0, count);
                if (items.length) return items;
            } catch { /* próximo proxy */ }
        }
        return [];
    }

    static _parseRSSXml(xml) {
        try {
            const doc = new DOMParser().parseFromString(xml, 'text/xml');
            const nodes = [...doc.querySelectorAll('item'), ...doc.querySelectorAll('entry')];
            return nodes.map(n => {
                const get = tag => n.querySelector(tag)?.textContent?.trim() || '';
                let link = get('link');
                if (!link) link = n.querySelector('link')?.getAttribute('href') || '#';
                return {
                    title: get('title'),
                    link,
                    author: get('source') || get('author') || '',
                    pubDate: get('pubDate') || get('published') || get('updated') || ''
                };
            }).filter(i => i.title);
        } catch { return []; }
    }

    /* Notícias gerais (top BR) — o que tá rolando de verdade */
    static async getNews(topic = 'top') {
        const ck = `ent_news_${topic}`;
        const hit = scGet(ck, TTL_NEWS);
        if (hit) return hit;

        const items = await this._fetchRSS(this._newsFeeds(topic), 12);
        if (!items.length) return [];

        const result = items.slice(0, 9).map(it => ({
            title: (it.title || '').replace(/ - [^-]+$/, '').trim(),
            url: it.link || '#',
            source: this._extractSource(it),
            time: it.pubDate ? this._relTime(it.pubDate) : ''
        })).filter(n => n.title);

        scSet(ck, result);
        return result;
    }

    /* Mantido por compatibilidade — agora mistura top + tech */
    static async getTechNews() {
        const ck = 'ent_news_mix';
        const hit = scGet(ck, TTL_NEWS);
        if (hit) return hit;

        const [top, tech] = await Promise.all([
            this.getNews('top').catch(() => []),
            this.getNews('tech').catch(() => [])
        ]);

        // Intercala top e tech, remove duplicados por título
        const seen = new Set();
        const mix = [];
        const maxLen = Math.max(top.length, tech.length);
        for (let i = 0; i < maxLen; i++) {
            for (const n of [top[i], tech[i]]) {
                if (!n) continue;
                const key = n.title.toLowerCase().slice(0, 40);
                if (seen.has(key)) continue;
                seen.add(key);
                mix.push(n);
            }
        }
        const result = mix.slice(0, 9);
        if (result.length) scSet(ck, result);
        return result;
    }

    static _relTime(pubDate) {
        try {
            const dt = new Date(pubDate);
            const mins = Math.round((Date.now() - dt) / 60000);
            if (mins < 1) return 'agora';
            if (mins < 60) return `${mins}min`;
            const hrs = Math.round(mins / 60);
            if (hrs < 24) return `${hrs}h`;
            return dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
        } catch { return ''; }
    }

    static _extractSource(item) {
        if (item.author) return item.author;
        const m = (item.title || '').match(/ - ([^-]+)$/);
        return m ? m[1].trim() : '';
    }

    /* ── BOXE/MMA: lutadores favoritos ──────────────── */
    static getFighters() { return Store.get('orbit_fighters', []); }
    static saveFighters(f) { Store.set('orbit_fighters', f); }

    static addFighter(name, sport) {
        const list = this.getFighters();
        const id = 'f' + Date.now();
        list.push({ id, name: name.trim(), sport: sport || 'boxing' });
        this.saveFighters(list);
        return id;
    }

    static removeFighter(id) {
        this.saveFighters(this.getFighters().filter(f => f.id !== id));
    }

    static _ymd(d) {
        return `${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    }

    static _parseCombatEvents(d) {
        return (d?.events || []).map(e => {
            const comp = e.competitions?.[0] || {};
            const competitors = comp.competitors || [];
            const fighters = competitors
                .map(c => c.athlete?.displayName || c.athlete?.name || c.displayName || '')
                .filter(Boolean);
            return {
                id: e.id,
                name: e.name || e.shortName || '',
                date: e.date,
                status: comp.status?.type?.shortDetail || '',
                live: comp.status?.type?.name === 'STATUS_IN_PROGRESS',
                completed: comp.status?.type?.completed === true,
                fighters,
                venue: comp.venue?.fullName || ''
            };
        });
    }

    /* sport: 'boxing' | 'ufc' | 'pfl' | 'bellator' */
    static async getCombatSchedule(sport) {
        const key = `ent_combat_${sport}`;
        const hit = scGet(key);
        if (hit) return hit;
        const base = sport === 'boxing' ? ESPN_BOXING : `${ESPN_MMA}/${sport}`;

        // Janela atual + próximos ~3 meses (scoreboard só traz a semana corrente)
        const now = new Date();
        const in90 = new Date(now.getTime() + 90 * 86400000);
        const urls = [
            `${base}/scoreboard`,
            `${base}/scoreboard?dates=${this._ymd(now)}-${this._ymd(in90)}`,
            `${base}/scoreboard?dates=${now.getFullYear()}`
        ];

        const byId = new Map();
        for (const u of urls) {
            const d = await fetchJSON(u, 8000);
            if (!d) continue;
            for (const ev of this._parseCombatEvents(d)) {
                if (ev.id && !byId.has(ev.id)) byId.set(ev.id, ev);
            }
        }

        const events = [...byId.values()];
        if (events.length) scSet(key, events);
        return events;
    }

    static async getFighterNextEvent(fighter) {
        const events = await this.getCombatSchedule(fighter.sport || 'boxing');
        const fn = _norm(fighter.name);
        const now = Date.now();
        const tokens = fn.split(/\s+/).filter(Boolean);

        const matches = events.filter(ev => {
            if (ev.completed) return false;
            const dt = new Date(ev.date).getTime();
            if (dt < now - 3 * 3600000) return false;
            const haystack = [_norm(ev.name), ...ev.fighters.map(_norm)].join(' ');
            return tokens.every(t => haystack.includes(t));
        });

        matches.sort((a, b) => new Date(a.date) - new Date(b.date));
        return matches[0] || null;
    }

    /* ── PS5 ────────────────────────────────────────── */
    static getPS5Games() { return Store.get('orbit_ps5', []); }
    static savePS5Games(g) { Store.set('orbit_ps5', g); }
    static addPS5Game(title, cover, status) {
        const games = this.getPS5Games();
        games.push({ id: Date.now().toString(), title, cover: cover || '🎮', status: status || 'wishlist' });
        this.savePS5Games(games);
    }
    static setPS5Status(id, status) {
        this.savePS5Games(this.getPS5Games().map(g => g.id === id ? { ...g, status } : g));
    }
    static removePS5Game(id) {
        this.savePS5Games(this.getPS5Games().filter(g => g.id !== id));
    }

    /* ── Formatadores ───────────────────────────────── */
    static formatRaceDate(dateStr, timeStr) {
        try {
            const dt = new Date(`${dateStr}T${timeStr}`);
            const now = new Date();
            const diff = Math.round((dt - now) / 86400000);
            const fmtDate = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short' });
            const fmtTime = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
            return { fmtDate, fmtTime, diff };
        } catch { return { fmtDate: dateStr, fmtTime: '', diff: 0 }; }
    }

    static formatGameDate(isoStr) {
        try {
            const dt = new Date(isoStr);
            const now = new Date();
            const diff = Math.round((dt - now) / 86400000);
            const fmtDate = dt.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', weekday: 'short', timeZone: 'America/Fortaleza' });
            const fmtTime = dt.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', timeZone: 'America/Fortaleza' });
            return { fmtDate, fmtTime, diff };
        } catch { return { fmtDate: isoStr, fmtTime: '', diff: 0 }; }
    }

    /* ── NOTÍCIAS DE FUTEBOL ────────────────────────── */
    static async getFootballNews(count = 12) {
        const ck = 'ent_news_futebol';
        const hit = scGet(ck, TTL_NEWS);
        if (hit) return hit;
        const feeds = [
            'https://news.google.com/rss/search?q=futebol+Brasil+OR+Flamengo+OR+Palmeiras+OR+Brasileir%C3%A3o+OR+Copa+do+Brasil&hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            'https://news.google.com/rss/headlines/section/topic/SPORTS?hl=pt-BR&gl=BR&ceid=BR:pt-BR'
        ];
        for (const feed of feeds) {
            const items = await this._fetchRSS(feed, count);
            const result = items.slice(0, count).map(it => ({
                title: (it.title || '').replace(/ - [^-]+$/, '').trim(),
                url: it.link || '#',
                source: this._extractSource(it),
                time: it.pubDate ? this._relTime(it.pubDate) : ''
            })).filter(n => n.title);
            if (result.length) { scSet(ck, result); return result; }
        }
        return [];
    }

    /* ── NOTÍCIAS DE TRANSFERÊNCIAS ─────────────────── */
    static async getTransferNews(count = 12) {
        const ck = 'ent_news_transfer';
        const hit = scGet(ck, TTL_NEWS);
        if (hit) return hit;
        const feed = 'https://news.google.com/rss/search?q=transfer%C3%AAncia+futebol+OR+contrata%C3%A7%C3%A3o+OR+refor%C3%A7o+OR+bomba+transfer&hl=pt-BR&gl=BR&ceid=BR:pt-BR';
        const items = await this._fetchRSS(feed, count);
        const result = items.slice(0, count).map(it => ({
            title: (it.title || '').replace(/ - [^-]+$/, '').trim(),
            url: it.link || '#',
            source: this._extractSource(it),
            time: it.pubDate ? this._relTime(it.pubDate) : ''
        })).filter(n => n.title);
        if (result.length) scSet(ck, result);
        return result;
    }

    /* ── ALERTAS: busca notícias de transferência para um time ── */
    static async checkTeamTransferNews(teamName) {
        if (!teamName) return [];
        const q = encodeURIComponent(`${teamName} transferência OR contratação OR reforço OR negociação OR assina`);
        const feed = `https://news.google.com/rss/search?q=${q}&hl=pt-BR&gl=BR&ceid=BR:pt-BR`;
        const items = await this._fetchRSS(feed, 8);
        return items.map(it => ({
            title: (it.title || '').replace(/ - [^-]+$/, '').trim(),
            url: it.link || '#',
            source: this._extractSource(it),
            time: it.pubDate ? this._relTime(it.pubDate) : '',
            pubDate: it.pubDate || ''
        })).filter(n => n.title);
    }

    /* ── ALERTAS: gerenciamento de times monitorados ── */
    static getTransferWatches() { return Store.get('orbit_transfer_watches', []); }
    static saveTransferWatches(list) { Store.set('orbit_transfer_watches', list); }

    static addTransferWatch(teamName) {
        const list = this.getTransferWatches();
        if (list.find(w => w.team.toLowerCase() === teamName.trim().toLowerCase())) return null;
        const id = 'tw' + Date.now();
        list.push({ id, team: teamName.trim(), lastSeen: new Date().toISOString(), lastTitle: '' });
        this.saveTransferWatches(list);
        return id;
    }

    static removeTransferWatch(id) {
        this.saveTransferWatches(this.getTransferWatches().filter(w => w.id !== id));
    }

    static updateWatchLastSeen(id, lastTitle) {
        const list = this.getTransferWatches();
        const w = list.find(x => x.id === id);
        if (w) { w.lastSeen = new Date().toISOString(); w.lastTitle = lastTitle; this.saveTransferWatches(list); }
    }

    /* ── TÓPICOS DE NOTÍCIAS personalizados ─────────── */
    static getNewsTopics() { return Store.get('orbit_news_topics', ['top', 'sports']); }
    static saveNewsTopics(topics) { Store.set('orbit_news_topics', topics); }
}
