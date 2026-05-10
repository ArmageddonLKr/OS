/**
 * VAULT.JS — Cofre de Acessos AES-256-GCM (SubtleCrypto)
 */
const K_VLT = 'orbit_vault_data';
const K_VLT_CHECK = 'orbit_vault_check';

export class Vault {
    static _key = null;

    static async _deriveKey(password, salt) {
        const enc = new TextEncoder();
        const keyMat = await crypto.subtle.importKey(
            'raw', enc.encode(password), 'PBKDF2', false, ['deriveKey']
        );
        return crypto.subtle.deriveKey(
            { name: 'PBKDF2', salt, iterations: 100000, hash: 'SHA-256' },
            keyMat,
            { name: 'AES-GCM', length: 256 },
            false,
            ['encrypt', 'decrypt']
        );
    }

    static async unlock(password) {
        if (!password) return false;
        const check = localStorage.getItem(K_VLT_CHECK);
        if (!check) {
            const salt = crypto.getRandomValues(new Uint8Array(16));
            const key = await this._deriveKey(password, salt);
            const iv = crypto.getRandomValues(new Uint8Array(12));
            const enc = await crypto.subtle.encrypt(
                { name: 'AES-GCM', iv }, key, new TextEncoder().encode('orbit_ok')
            );
            localStorage.setItem(K_VLT_CHECK, JSON.stringify({
                salt: Array.from(salt),
                iv: Array.from(iv),
                data: Array.from(new Uint8Array(enc))
            }));
            this._key = key;
            return true;
        }
        try {
            const cfg = JSON.parse(check);
            const salt = new Uint8Array(cfg.salt);
            const key = await this._deriveKey(password, salt);
            const dec = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(cfg.iv) },
                key,
                new Uint8Array(cfg.data)
            );
            if (new TextDecoder().decode(dec) !== 'orbit_ok') return false;
            this._key = key;
            return true;
        } catch { return false; }
    }

    static lock() { this._key = null; }
    static isSetup() { return !!localStorage.getItem(K_VLT_CHECK); }
    static isUnlocked() { return !!this._key; }

    static async getEntries() {
        if (!this._key) return null;
        const raw = localStorage.getItem(K_VLT);
        if (!raw) return [];
        try {
            const cfg = JSON.parse(raw);
            const dec = await crypto.subtle.decrypt(
                { name: 'AES-GCM', iv: new Uint8Array(cfg.iv) },
                this._key,
                new Uint8Array(cfg.data)
            );
            return JSON.parse(new TextDecoder().decode(dec));
        } catch { return []; }
    }

    static async saveEntries(entries) {
        if (!this._key) return;
        const iv = crypto.getRandomValues(new Uint8Array(12));
        const enc = await crypto.subtle.encrypt(
            { name: 'AES-GCM', iv },
            this._key,
            new TextEncoder().encode(JSON.stringify(entries))
        );
        localStorage.setItem(K_VLT, JSON.stringify({
            iv: Array.from(iv),
            data: Array.from(new Uint8Array(enc))
        }));
    }

    static async add(entry) {
        const entries = (await this.getEntries()) || [];
        entries.push({ id: Date.now().toString(), ...entry, ts: Date.now() });
        await this.saveEntries(entries);
    }

    static async update(id, changes) {
        const entries = (await this.getEntries()) || [];
        const idx = entries.findIndex(e => e.id === id);
        if (idx >= 0) { entries[idx] = { ...entries[idx], ...changes }; await this.saveEntries(entries); }
    }

    static async remove(id) {
        const entries = ((await this.getEntries()) || []).filter(e => e.id !== id);
        await this.saveEntries(entries);
    }

    static genPassword(length = 16) {
        const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
        const arr = new Uint8Array(length);
        crypto.getRandomValues(arr);
        return Array.from(arr).map(b => chars[b % chars.length]).join('');
    }

    static genQRDataURL(text) {
        return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(text)}`;
    }
}
