/**
 * TOOLS.JS - Productivity & Utility Engines
 * Master Class Edition
 */

import { UI } from './ui.js';

/* [#57] Safe Calculator Engine */
export class Calculator {
    static run(expr) {
        try {
            const clean = expr.replace(/[^0-9+\-*/.() %^e,πpi√]/gi, '')
                              .replace(/π|pi/gi, '3.14159265358979')
                              .replace(/√\(([^)]+)\)/g, (_, x) => Math.sqrt(parseFloat(x)))
                              .replace(/\^/g, '**');
            
            /* eslint-disable no-new-func */
            const result = Function('"use strict";return (' + clean + ')')();
            if (!isFinite(result)) return 'Resultado inválido';
            return +result.toFixed(10) + '';
        } catch (e) {
            return 'Erro na expressão';
        }
    }
}

/* [#58] Unit Conversion Engine */
export class Converter {
    static UNITS = {
        comp: { m: 1, km: 0.001, cm: 100, mm: 1000, mi: 0.000621371, yd: 1.09361, ft: 3.28084, in: 39.3701 },
        mass: { kg: 1, g: 1000, mg: 1e6, lb: 2.20462, oz: 35.274, t: 0.001 },
        vol: { l: 1, ml: 1000, m3: 0.001, gal: 0.264172, pt: 2.11338, cup: 4.22675, floz: 33.814, tbsp: 67.628, tsp: 202.884 },
        area: { m2: 1, km2: 1e-6, cm2: 1e4, mm2: 1e6, ha: 1e-4, acre: 0.000247105, ft2: 10.7639, in2: 1550 },
        vel: { ms: 1, 'km/h': 3.6, 'mi/h': 2.23694, kt: 1.94384 },
        data: { b: 1, kb: 1 / 1024, mb: 1 / 1048576, gb: 1 / 1073741824, tb: 1 / 1099511627776 }
    };

    static convert(val, from, to) {
        if (['c', 'f', 'k'].includes(from) && ['c', 'f', 'k'].includes(to)) {
            let c;
            if (from === 'c') c = val; else if (from === 'f') c = (val - 32) * 5 / 9; else if (from === 'k') c = val - 273.15;
            if (to === 'c') return c; if (to === 'f') return c * 9 / 5 + 32; if (to === 'k') return c + 273.15;
        }

        let catF, catT;
        for (let cat in this.UNITS) { if (from in this.UNITS[cat]) catF = cat; if (to in this.UNITS[cat]) catT = cat; }
        
        if (!catF || !catT || catF !== catT) return 'Incompatível';
        const base = val / this.UNITS[catF][from];
        return base * this.UNITS[catT][to];
    }
}

/* [#93] Pomodoro Engine */
export class Pomodoro {
    static state = { running: false, iv: null, total: 25 * 60, elapsed: 0, mode: 'work' };
    static DURATIONS = { work: 25 * 60, short: 5 * 60, long: 15 * 60 };

    static start(onTick, onFinish) {
        if (this.state.running) return;
        this.state.running = true;
        this.state.iv = setInterval(() => {
            this.state.elapsed++;
            if (this.state.elapsed >= this.state.total) {
                this.stop();
                if (onFinish) onFinish();
            } else {
                if (onTick) onTick(this.state);
            }
        }, 1000);
    }

    static stop() {
        clearInterval(this.state.iv);
        this.state.running = false;
    }

    static reset(mode = 'work') {
        this.stop();
        this.state.mode = mode;
        this.state.total = this.DURATIONS[mode];
        this.state.elapsed = 0;
    }

    static format() {
        const rem = this.state.total - this.state.elapsed;
        const m = String(Math.floor(rem / 60)).padStart(2, '0');
        const s = String(rem % 60).padStart(2, '0');
        return `${m}:${s}`;
    }
}

/* JSON & Data Tools */
export class DataTools {
    static validateJSON(str) {
        try { return JSON.parse(str); } catch (e) { throw e; }
    }
    
    static jsonToCsv(obj) {
        if (!Array.isArray(obj)) obj = [obj];
        const keys = Object.keys(obj[0] || {});
        if (!keys.length) return '';
        const rows = [keys.join(',')];
        obj.forEach(row => { rows.push(keys.map(k => { const v = row[k] === undefined ? '' : String(row[k]); return v.includes(',') ? `"${v}"` : v; }).join(',')); });
        return rows.join('\n');
    }

    static csvToJson(csv) {
        const lines = csv.trim().split('\n');
        const keys = lines[0].split(',').map(k => k.trim());
        return lines.slice(1).map(l => { const vals = l.split(','); const obj = {}; keys.forEach((k, i) => { obj[k] = (vals[i] || '').trim(); }); return obj; });
    }
}
