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

export class Entertainment {
    /* ── F1 ─────────────────────────────────────────── */
    static async getF1NextRace() {
        const hit = scGet('ent_f1_next');
        if (hit) return hit;
        try {
            const r = await fetch(`${F1_BASE}/current/next.json`, { signal: AbortSignal.timeout(6000) });
            if (!r.ok) return null;
            const d = await r.json();
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
            const r = await fetch(`${F1_BASE}/current/driverStandings.json`, { signal: AbortSignal.timeout(6000) });
            if (!r.ok) return [];
            const d = await r.json();
            const list = (d?.MRData?.StandingsTable?.StandingsLists?.[0]?.DriverStandings || []).slice(0, 5).map(s => ({
                pos: s.position,
                name: s.Driver.familyName,
                team: s.Constructors?.[0]?.name || '',
                pts: s.points
            }));
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
        if (!list) {
            try {
                const r = await fetch(`${ESPN_BASE}/${league}/teams?limit=200`, { signal: AbortSignal.timeout(8000) });
                if (!r.ok) return [];
                const d = await r.json();
                list = d?.sports?.[0]?.leagues?.[0]?.teams || [];
                scSet(cacheKey, list);
            } catch { return []; }
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
            const r = await fetch(`${ESPN_BASE}/${espnLeague}/teams/${espnId}/schedule`, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) return null;
            const d = await r.json();
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
        const buckets = d?.transfers || d;
        let arrivalsRaw = buckets?.arrivals || buckets?.in || buckets?.arriving || [];
        let departuresRaw = buckets?.departures || buckets?.out || buckets?.leaving || [];

        // Forma alternativa: lista única com "direction" ou "movement"
        if (!arrivalsRaw.length && !departuresRaw.length && Array.isArray(buckets)) {
            arrivalsRaw = buckets.filter(t => (t.direction || t.movement || '').toLowerCase().startsWith('in') || t.type === 'arrival');
            departuresRaw = buckets.filter(t => (t.direction || t.movement || '').toLowerCase().startsWith('out') || t.type === 'departure');
        }

        const norm = (t) => ({
            name: t.name || t.player_name || t.playerName || t.player?.name || '?',
            position: t.position || t.player?.position || t.role || '',
            from: t.from?.name || t.from_club_name || t.left_team?.name || t.club_from?.name || t.fromClub || '?',
            to:   t.to?.name   || t.to_club_name   || t.joined_team?.name || t.club_to?.name   || t.toClub   || '?',
            fee: t.fee || t.transfer_fee || t.transferFee || t.cost || '—',
            market_value: t.market_value || t.marketValue || t.value || ''
        });

        return {
            arrivals:   arrivalsRaw.slice(0, 14).map(norm),
            departures: departuresRaw.slice(0, 14).map(norm)
        };
    }

    /* ── Wikipedia URL fallback p/ transferências ──── */
    static transfermarktURL(tmId, teamName) {
        if (tmId) return `https://www.transfermarkt.com/club/transfers/verein/${tmId}`;
        return `https://www.transfermarkt.com/schnellsuche/ergebnis/schnellsuche?query=${encodeURIComponent(teamName || '')}`;
    }

    /* ── Notícias Tech (PT-BR via Google News) ──────── */
    static async getTechNews() {
        const hit = scGet('ent_news_ptbr', TTL_NEWS);
        if (hit) return hit;

        const feeds = [
            'https://news.google.com/rss/search?q=tecnologia+OR+intelig%C3%AAncia+artificial+OR+programa%C3%A7%C3%A3o&hl=pt-BR&gl=BR&ceid=BR:pt-BR',
            'https://news.google.com/rss/headlines/section/topic/TECHNOLOGY?hl=pt-BR&gl=BR&ceid=BR:pt-BR'
        ];

        for (const feed of feeds) {
            try {
                const url = `${RSS2JSON}?rss_url=${encodeURIComponent(feed)}&count=10`;
                const r = await fetch(url, { signal: AbortSignal.timeout(8000) });
                if (!r.ok) continue;
                const d = await r.json();
                const items = d?.items || [];
                if (!items.length) continue;

                const result = items.slice(0, 8).map(it => {
                    const link = this._cleanGoogleNewsLink(it.link);
                    const source = this._extractSource(it);
                    return {
                        title: (it.title || '').replace(/ - [^-]+$/, '').trim(),
                        url: link,
                        source,
                        time: it.pubDate ? new Date(it.pubDate).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
                    };
                }).filter(n => n.title);

                scSet('ent_news_ptbr', result);
                return result;
            } catch { /* try next feed */ }
        }
        return [];
    }

    static _cleanGoogleNewsLink(link) {
        if (!link) return '#';
        // Google News RSS retorna URL de redirect — usamos direto, abre certinho no navegador.
        return link;
    }

    static _extractSource(item) {
        // rss2json devolve source dentro de `author` ou no final do título "Notícia X - Fonte"
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

    /* sport: 'boxing' | 'ufc' | 'pfl' | 'bellator' */
    static async getCombatSchedule(sport) {
        const key = `ent_combat_${sport}`;
        const hit = scGet(key);
        if (hit) return hit;
        const base = sport === 'boxing' ? ESPN_BOXING : `${ESPN_MMA}/${sport}`;
        try {
            const r = await fetch(`${base}/scoreboard`, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) return [];
            const d = await r.json();
            const events = (d?.events || []).map(e => {
                const comp = e.competitions?.[0] || {};
                const competitors = comp.competitors || [];
                const fighters = competitors.map(c => c.athlete?.displayName || c.athlete?.name || c.displayName || '?').filter(Boolean);
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
            scSet(key, events);
            return events;
        } catch { return []; }
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
}
