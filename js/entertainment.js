/**
 * ENTERTAINMENT.JS — F1, Futebol, PS5
 */
import { Store } from './store.js';

const F1_BASE = 'https://ergast.com/api/f1';
const FLAMENGO_ID = '133';
const TTL = 30 * 60 * 1000;

function scGet(key) {
    try {
        const raw = sessionStorage.getItem(key);
        if (!raw) return null;
        const { ts, data } = JSON.parse(raw);
        return Date.now() - ts < TTL ? data : null;
    } catch { return null; }
}

function scSet(key, data) {
    try { sessionStorage.setItem(key, JSON.stringify({ ts: Date.now(), data })); } catch {}
}

export class Entertainment {
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

    static async getFlamengoNext() {
        const hit = scGet('ent_fla_next');
        if (hit) return hit;
        try {
            const r = await fetch(
                `https://www.thesportsdb.com/api/v1/json/3/eventsnext.php?id=${FLAMENGO_ID}`,
                { signal: AbortSignal.timeout(6000) }
            );
            if (!r.ok) return null;
            const d = await r.json();
            const ev = d?.events?.[0] || null;
            scSet('ent_fla_next', ev);
            return ev;
        } catch { return null; }
    }

    static getPS5Games() {
        return Store.get('orbit_ps5', [
            { id: '1', title: 'Cyberpunk 2077',    status: 'jogando',   cover: '🌆' },
            { id: '2', title: 'Ghost of Tsushima', status: 'platinado', cover: '⛩️' },
            { id: '3', title: 'Spider-Man',        status: 'zerado',    cover: '🕷️' },
            { id: '4', title: 'Spider-Man 2',      status: 'wishlist',  cover: '🕸️' },
            { id: '5', title: 'Elden Ring',        status: 'wishlist',  cover: '⚔️' },
        ]);
    }

    static savePS5Games(games) { Store.set('orbit_ps5', games); }

    static addPS5Game(title, cover, status) {
        const games = this.getPS5Games();
        games.push({ id: Date.now().toString(), title, cover: cover || '🎮', status: status || 'wishlist' });
        this.savePS5Games(games);
    }

    static setPS5Status(id, status) {
        const games = this.getPS5Games().map(g => g.id === id ? { ...g, status } : g);
        this.savePS5Games(games);
    }

    static removePS5Game(id) {
        this.savePS5Games(this.getPS5Games().filter(g => g.id !== id));
    }

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
}
