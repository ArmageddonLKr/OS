/**
 * LOADER.JS — Tela de carregamento com etapas sequenciais
 */
export class Loader {
    static _timers = [];

    static show(title, steps = [], stepDelay = 600) {
        const el = document.getElementById('os-loader');
        const titleEl = document.getElementById('osl-title');
        const stepsEl = document.getElementById('osl-steps');
        const bar = document.getElementById('osl-bar');
        if (!el) return;

        this._timers.forEach(clearTimeout);
        this._timers = [];

        titleEl.textContent = title || 'Carregando...';
        stepsEl.innerHTML = steps.map((s, i) => `
            <div class="osl-step" id="osl-step-${i}">
                <div class="osl-step-dot"></div>
                <span>${s}</span>
                <span class="osl-step-check">✓</span>
            </div>
        `).join('');
        bar.style.width = '0%';
        el.style.opacity = '';
        el.style.display = 'flex';

        steps.forEach((_, i) => {
            this._timers.push(setTimeout(() => {
                if (i > 0) {
                    document.getElementById(`osl-step-${i - 1}`)?.classList.remove('active');
                    document.getElementById(`osl-step-${i - 1}`)?.classList.add('done');
                }
                document.getElementById(`osl-step-${i}`)?.classList.add('active');
                bar.style.width = `${Math.round(((i + 1) / steps.length) * 85)}%`;
            }, i * stepDelay));
        });
    }

    static hide(delay = 300) {
        const el = document.getElementById('os-loader');
        const bar = document.getElementById('osl-bar');
        const stepsEl = document.getElementById('osl-steps');
        if (!el || el.style.display === 'none') return;

        stepsEl?.querySelectorAll('.osl-step').forEach(s => {
            s.classList.remove('active');
            s.classList.add('done');
        });
        if (bar) bar.style.width = '100%';

        this._timers.push(setTimeout(() => {
            el.style.transition = 'opacity 0.3s ease';
            el.style.opacity = '0';
            this._timers.push(setTimeout(() => {
                el.style.display = 'none';
                el.style.opacity = '';
                el.style.transition = '';
            }, 300));
        }, delay));
    }
}
