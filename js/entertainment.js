/**
 * ENTERTAINMENT.JS — F1, Futebol, PS5, Tech News
 */
import { Store } from './store.js';

const F1_BASE   = 'https://api.jolpi.ca/ergast/f1';
const ESPN_BASE = 'https://site.api.espn.com/apis/site/v2/sports/soccer';
const TM_BASE   = 'https://transfermarkt-api.fly.dev';
const HN_BASE   = 'https://hacker-news.firebaseio.com/v0';
const TTL       = 30 * 60 * 1000;
const TTL_NEWS  = 20 * 60 * 1000;

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
                const r = await fetch(`${ESPN_BASE}/${league}/teams`, { signal: AbortSignal.timeout(8000) });
                if (!r.ok) return [];
                const d = await r.json();
                list = d?.sports?.[0]?.leagues?.[0]?.teams || [];
                scSet(cacheKey, list);
            } catch { return []; }
        }
        const q = query.toLowerCase();
        return list
            .filter(t =>
                t.team?.displayName?.toLowerCase().includes(q) ||
                t.team?.shortDisplayName?.toLowerCase().includes(q) ||
                t.team?.name?.toLowerCase().includes(q)
            )
            .slice(0, 6)
            .map(t => ({ espnId: t.team.id, name: t.team.displayName }));
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
        try {
            const r = await fetch(`${TM_BASE}/clubs/search?query=${encodeURIComponent(query)}`, { signal: AbortSignal.timeout(8000) });
            if (!r.ok) return [];
            const d = await r.json();
            const clubs = d?.results || d?.clubs || [];
            return clubs.slice(0, 5).map(t => ({
                tmId: String(t.id),
                name: t.name,
                country: t.country?.name || ''
            }));
        } catch { return []; }
    }

    /* ── Transfermarkt: transferências ──────────────── */
    static async getTeamTransfers(tmId) {
        if (!tmId) return null;
        const key = `ent_tm_${tmId}`;
        const hit = scGet(key);
        if (hit) return hit;
        try {
            const r = await fetch(`${TM_BASE}/clubs/${tmId}/transfers`, { signal: AbortSignal.timeout(12000) });
            if (!r.ok) return null;
            const d = await r.json();
            const tx = d?.transfers || d;
            const result = {
                arrivals: (tx?.arrivals || []).slice(0, 12),
                departures: (tx?.departures || []).slice(0, 12)
            };
            scSet(key, result);
            return result;
        } catch { return null; }
    }

    /* ── HackerNews: notícias tech ──────────────────── */
    static async getTechNews() {
        const hit = scGet('ent_hn', TTL_NEWS);
        if (hit) return hit;
        try {
            const idsRes = await fetch(`${HN_BASE}/topstories.json`, { signal: AbortSignal.timeout(6000) });
            const ids = await idsRes.json();
            const top = ids.slice(0, 12);
            const stories = await Promise.all(
                top.map(id =>
                    fetch(`${HN_BASE}/item/${id}.json`, { signal: AbortSignal.timeout(5000) })
                        .then(r => r.json()).catch(() => null)
                )
            );
            const result = stories
                .filter(s => s && s.title && s.type === 'story')
                .slice(0, 8)
                .map(s => ({
                    title: s.title,
                    url: s.url || `https://news.ycombinator.com/item?id=${s.id}`,
                    score: s.score || 0,
                    by: s.by || '',
                    comments: s.descendants || 0,
                    time: s.time ? new Date(s.time * 1000).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' }) : ''
                }));
            scSet('ent_hn', result);
            return result;
        } catch { return []; }
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
