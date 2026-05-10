/**
 * UI.JS - Rendering & Interface Logic
 * Session 2: highlight.js, data-msgid, long press ctx menu
 */

export const Icons = {
    user: `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    orb: `<div class="av-mini"><div class="av-core"></div></div>`,
    del: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 6L6 18M6 6l12 12"/></svg>`,
    copy: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>`
};

export class UI {
    static toast(m, t) {
        const el = document.getElementById('toast');
        if (!el) return;
        el.textContent = m;
        el.className = `toast ${t || ''} show`;
        setTimeout(() => el.classList.remove('show'), 3000);
    }

    static setStatus(s) {
        const el = document.getElementById('hdr-st');
        if (el) el.textContent = s;
    }

    static addMsg(role, text, isStatic = false, image = null) {
        const msgs = document.getElementById('msgs');
        const empty = document.getElementById('empty');
        if (empty) empty.style.display = 'none';

        const msgId = `m${Date.now()}${Math.random().toString(36).slice(2,5)}`;
        const row = document.createElement('div');
        row.className = `msg-row ${role}`;
        row.dataset.msgid = msgId;

        const imgHtml = image
            ? `<img src="data:${image.type};base64,${image.data}" class="msg-img">`
            : '';

        row.innerHTML = `
            <div class="msg-av">${role === 'user' ? Icons.user : Icons.orb}</div>
            <div class="mbubble">
                ${imgHtml}
                <div class="m-content"${isStatic ? ' id="sb"' : ''}>${isStatic ? '' : this.renderMd(text)}</div>
            </div>
        `;

        // Long press → context menu (500ms)
        let pressTimer;
        const onDown = (e) => {
            pressTimer = setTimeout(() => {
                if (window.orbit) orbit.showMsgCtx(msgId, e.clientX, e.clientY);
            }, 500);
        };
        const onUp = () => clearTimeout(pressTimer);
        row.addEventListener('pointerdown', onDown);
        row.addEventListener('pointerup', onUp);
        row.addEventListener('pointercancel', onUp);
        row.addEventListener('pointermove', onUp);

        msgs.appendChild(row);
        msgs.scrollTop = msgs.scrollHeight;
        return row;
    }

    static renderMd(t) {
        if (!t) return '';

        // Step 1: extract fenced code blocks before any escaping
        const blocks = [];
        t = t.replace(/```(\w*)\n?([\s\S]*?)```/g, (_, lang, code) => {
            const i = blocks.length;
            blocks.push({ lang: (lang || '').trim(), code: code.trim() });
            return `\x00BLK${i}\x00`;
        });

        // Step 2: HTML-escape the non-code text
        t = t
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;');

        // Step 3: inline markdown + structure
        t = t
            .replace(/^### (.+)$/gim, '<h3>$1</h3>')
            .replace(/^## (.+)$/gim, '<h2>$1</h2>')
            .replace(/^# (.+)$/gim, '<h1>$1</h1>')
            .replace(/\*\*([^*\n]+)\*\*/gim, '<strong>$1</strong>')
            .replace(/\*([^*\n]+)\*/gim, '<em>$1</em>')
            .replace(/`([^`]+)`/gim, '<code class="ic">$1</code>')
            .replace(/^[-*] (.+)$/gim, '<ul><li>$1</li></ul>')
            .replace(/<\/ul>\n?<ul>/gim, '')
            .replace(/\n/gim, '<br>');

        // Step 4: restore code blocks with optional hljs highlighting
        t = t.replace(/\x00BLK(\d+)\x00/g, (_, i) => {
            const { lang, code } = blocks[+i];
            let hl;
            try {
                if (window.hljs) {
                    hl = (lang && hljs.getLanguage(lang))
                        ? hljs.highlight(code, { language: lang }).value
                        : hljs.highlightAuto(code).value;
                } else {
                    hl = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
                }
            } catch (_) {
                hl = code.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
            }
            const langLabel = lang ? `<span class="code-lang">${lang}</span>` : '';
            return `<div class="code-wrap">${langLabel}<button class="copy-btn" onclick="UI.copyCode(this)">${Icons.copy}</button><pre><code class="hljs">${hl}</code></pre></div>`;
        });

        return t;
    }

    static copyCode(btn) {
        const code = btn.nextElementSibling.innerText;
        navigator.clipboard.writeText(code).catch(() => {});
        UI.toast('Copiado!', 'ok');
    }

    static removeThinking() {
        const th = document.getElementById('thinking');
        if (th) th.remove();
    }
}

export class Orb {
    constructor(canvasId) {
        this.canvas = document.getElementById(canvasId);
        this.gl = this.canvas.getContext('webgl');
        if (!this.gl) return;
        this.startTime = Date.now();
        this.resize();
        window.addEventListener('resize', () => this.resize());
        this.initShaders();
    }

    resize() {
        this.W = this.canvas.width = window.innerWidth;
        this.H = this.canvas.height = window.innerHeight;
        if (this.gl) this.gl.viewport(0, 0, this.W, this.H);
    }

    initShaders() {
        const vs = `attribute vec2 position; void main() { gl_Position = vec4(position, 0.0, 1.0); }`;
        const fs = `
            precision highp float;
            uniform float time;
            uniform vec2 resolution;
            void main() {
                vec2 uv = gl_FragCoord.xy / resolution.xy;
                uv -= 0.5;
                uv.x *= resolution.x / resolution.y;
                float d = length(uv);
                float m = 0.0;
                for(float i=0.0; i<4.0; i++) {
                    float t = time * (0.2 + i * 0.1);
                    vec2 p = uv + vec2(sin(t), cos(t)) * 0.3;
                    m += 0.05 / length(p);
                }
                vec3 col = mix(vec3(0.42, 0.12, 0.94), vec3(0.72, 0.63, 1.0), m * 0.5 + 0.5 * sin(time * 0.5));
                gl_FragColor = vec4(col * m * (1.0 - d * 0.8) * 0.15, 1.0);
            }
        `;
        this.program = this.createProgram(vs, fs);
        this.posLoc = this.gl.getAttribLocation(this.program, 'position');
        this.timeLoc = this.gl.getUniformLocation(this.program, 'time');
        this.resLoc = this.gl.getUniformLocation(this.program, 'resolution');
        const buffer = this.gl.createBuffer();
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, buffer);
        this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), this.gl.STATIC_DRAW);
    }

    createProgram(v, f) {
        const vs = this.gl.createShader(this.gl.VERTEX_SHADER); this.gl.shaderSource(vs, v); this.gl.compileShader(vs);
        const fs = this.gl.createShader(this.gl.FRAGMENT_SHADER); this.gl.shaderSource(fs, f); this.gl.compileShader(fs);
        const p = this.gl.createProgram(); this.gl.attachShader(p, vs); this.gl.attachShader(p, fs); this.gl.linkProgram(p);
        return p;
    }

    draw() {
        if (!this.gl) return;
        this.gl.useProgram(this.program);
        this.gl.enableVertexAttribArray(this.posLoc);
        this.gl.vertexAttribPointer(this.posLoc, 2, this.gl.FLOAT, false, 0, 0);
        this.gl.uniform1f(this.timeLoc, (Date.now() - this.startTime) / 1000);
        this.gl.uniform2f(this.resLoc, this.W, this.H);
        this.gl.drawArrays(this.gl.TRIANGLES, 0, 6);
        requestAnimationFrame(() => this.draw());
    }
}
