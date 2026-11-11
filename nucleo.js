// Núcleo da Vila dos Gatos: materiais (com o "mundo redondinho"), formas, texturas, partículas e sons.
import * as THREE from 'three';
import { RoundedBoxGeometry } from './RoundedBoxGeometry.js';
import { mergeGeometries } from './BufferGeometryUtils.js?v=202610220925';

export { THREE };
export const rnd = (a = 1, b) => (b === undefined ? Math.random() * a : a + Math.random() * (b - a));
export const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
export const clamp = (x, a, b) => Math.min(b, Math.max(a, x));
export const lerp = (a, b, k) => a + (b - a) * k;
export const sm = (x) => { x = clamp(x, 0, 1); return x * x * (3 - 2 * x); };

// ---------- curvatura: o chão "enrola" para longe da câmera ----------
export const U = { curva: { value: 0.0016 }, dist: { value: 20 } };
export function curvar(mat) {
  if (mat.userData.curvo) return mat;
  mat.userData.curvo = true;
  const antes = mat.onBeforeCompile;
  mat.onBeforeCompile = (sh, r) => {
    if (antes) antes(sh, r);
    sh.uniforms.uCurva = U.curva; sh.uniforms.uDist = U.dist;
    sh.vertexShader = 'uniform float uCurva;\nuniform float uDist;\n' + sh.vertexShader.replace('#include <project_vertex>',
      '#include <project_vertex>\n{ float dz = max(0.0, -mvPosition.z - uDist); mvPosition.y -= uCurva * dz * dz; gl_Position = projectionMatrix * mvPosition; }');
  };
  return mat;
}

// ---------- materiais em cache ----------
const cacheM = new Map();
export function M(cor, o = {}) {
  const chave = cor + '|' + JSON.stringify(o);
  let m = cacheM.get(chave);
  if (!m) {
    const { map, ...resto } = o;
    m = new THREE.MeshLambertMaterial({ color: cor, ...resto });
    curvar(m); m.userData.fixo = true; cacheM.set(chave, m);
  }
  return m;
}
export function MT(tex, o = {}) { const m = new THREE.MeshLambertMaterial({ map: tex, ...o }); return curvar(m); }
export function MB(cor, o = {}) { const m = new THREE.MeshBasicMaterial({ color: cor, ...o }); return curvar(m); }

// ---------- geometrias em cache ----------
const cacheG = new Map();
const G = (chave, f) => { let g = cacheG.get(chave); if (!g) { g = f(); g.userData.fixo = true; cacheG.set(chave, g); } return g; };
export const gBox = (w, h, d) => G(`b${w},${h},${d}`, () => new THREE.BoxGeometry(w, h, d));
export const gRBox = (w, h, d, r = 0.12, s = 3) => G(`r${w},${h},${d},${r},${s}`, () => new RoundedBoxGeometry(w, h, d, s, Math.min(r, w / 2 - 0.001, h / 2 - 0.001, d / 2 - 0.001)));
export const gCil = (r1, r2, h, s = 16) => G(`c${r1},${r2},${h},${s}`, () => new THREE.CylinderGeometry(r1, r2, h, s));
export const gEsf = (r, s = 16, t = 12) => G(`s${r},${s},${t}`, () => new THREE.SphereGeometry(r, s, t));
export const gCone = (r, h, s = 16) => G(`k${r},${h},${s}`, () => new THREE.ConeGeometry(r, h, s));
export const gTor = (r, t, a = 10, b = 24, arc = Math.PI * 2) => G(`t${r},${t},${a},${b},${arc}`, () => new THREE.TorusGeometry(r, t, a, b, arc));
export const gPlano = (w, h) => G(`p${w},${h}`, () => new THREE.PlaneGeometry(w, h));
export const gDisco = (r, s = 40) => G(`d${r},${s}`, () => new THREE.CircleGeometry(r, s));

export function malha(geo, mat, x = 0, y = 0, z = 0, pai) {
  const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.castShadow = true; m.receiveShadow = true;
  if (pai) pai.add(m); return m;
}
export const caixa = (pai, w, h, d, cor, x, y, z, r = 0) => malha(r ? gRBox(w, h, d, r) : gBox(w, h, d), typeof cor === 'object' ? cor : M(cor), x, y, z, pai);
export const cil = (pai, r1, r2, h, cor, x, y, z, s = 16) => malha(gCil(r1, r2, h, s), typeof cor === 'object' ? cor : M(cor), x, y, z, pai);
export const esf = (pai, r, cor, x, y, z, s = 16) => malha(gEsf(r, s, Math.max(8, Math.round(s * 0.75))), typeof cor === 'object' ? cor : M(cor), x, y, z, pai);
export const cone = (pai, r, h, cor, x, y, z, s = 16) => malha(gCone(r, h, s), typeof cor === 'object' ? cor : M(cor), x, y, z, pai);
export function grupo(pai, x = 0, y = 0, z = 0, ry = 0) { const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; if (pai) pai.add(g); return g; }

// prisma triangular (telhado de duas águas): largura w (x), altura h, profundidade d (z)
export function gPrisma(w, h, d) {
  return G(`pr${w},${h},${d}`, () => {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(w / 2, 0); s.lineTo(0, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: d, bevelEnabled: false }); g.translate(0, 0, -d / 2); return g;
  });
}

// funde as malhas paradas de um grupo (uma malha por material) — bem menos trabalho para o celular
export function fundir(grp) {
  grp.updateMatrixWorld(true);
  const inv = new THREE.Matrix4().copy(grp.matrixWorld).invert();
  const porMat = new Map(); const tirar = [];
  const vivoAcima = (o) => { for (let p = o; p && p !== grp; p = p.parent) if (p.userData.vivo) return true; return false; };
  grp.traverse((o) => {
    if (!o.isMesh || o.isInstancedMesh || o.isSkinnedMesh || Array.isArray(o.material) || vivoAcima(o) || !o.visible) return;
    let g = o.geometry.index ? o.geometry.toNonIndexed() : o.geometry.clone();
    for (const n of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(n)) g.deleteAttribute(n);
    if (!g.attributes.uv) g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
    if (!g.attributes.normal) g.computeVertexNormals();
    g.applyMatrix4(new THREE.Matrix4().multiplyMatrices(inv, o.matrixWorld));
    const k = o.material.uuid + (o.castShadow ? 's' : 'n');
    if (!porMat.has(k)) porMat.set(k, { mat: o.material, geos: [], sombra: o.castShadow });
    porMat.get(k).geos.push(g); tirar.push(o);
  });
  for (const o of tirar) o.parent.remove(o);
  for (const { mat, geos, sombra } of porMat.values()) {
    const g = mergeGeometries(geos, false); geos.forEach((x) => x.dispose());
    const m = new THREE.Mesh(g, mat); m.castShadow = sombra; m.receiveShadow = true; grp.add(m);
  }
  return grp;
}

// joga fora o que foi criado só para um mapa (o que é compartilhado fica)
export function descartar(obj) {
  obj.traverse((o) => {
    if (o.geometry && !o.geometry.userData.fixo) o.geometry.dispose();
    const ms = Array.isArray(o.material) ? o.material : o.material ? [o.material] : [];
    for (const m of ms) { if (m.userData.fixo) continue; if (m.map && !m.map.userData.fixo) m.map.dispose(); m.dispose(); }
  });
}

// ---------- texturas desenhadas ----------
export function tela(w, h, f) { const c = document.createElement('canvas'); c.width = w; c.height = h; f(c.getContext('2d'), w, h); return c; }
export function textura(w, h, f, rep) {
  const t = new THREE.CanvasTexture(tela(w, h, f)); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4;
  if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); }
  return t;
}
const cacheT = new Map();
export function T(nome, f) { let t = cacheT.get(nome); if (!t) { t = f(); t.userData.fixo = true; cacheT.set(nome, t); } return t; }

export const texGrama = () => T('grama', () => textura(256, 256, (x, w, h) => {
  x.fillStyle = '#8fd46a'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 90; i++) { x.fillStyle = pick(['#9bdc74', '#86cc62', '#a4e27c']); const px = rnd(w), py = rnd(h), r = rnd(5, 13);
    for (const [dx, dy] of [[0, 0], [w, 0], [-w, 0], [0, h], [0, -h]]) { x.beginPath(); x.arc(px + dx, py + dy, r, 0, 7); x.fill(); } }
  for (let i = 0; i < 30; i++) { const px = rnd(w), py = rnd(h); x.fillStyle = '#b6ec8b';
    for (let k = 0; k < 3; k++) { x.beginPath(); x.arc(px + Math.cos(k * 2.1) * 3.2, py + Math.sin(k * 2.1) * 3.2, 2.6, 0, 7); x.fill(); } }
}, [26, 26]));
export const texCaminho = () => T('caminho', () => textura(256, 256, (x, w, h) => {
  x.fillStyle = '#ecd9a8'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 70; i++) { x.fillStyle = pick(['#f3e3b8', '#e2cc96', '#f7ecc9', '#dcc48c']); x.beginPath(); x.ellipse(rnd(w), rnd(h), rnd(4, 11), rnd(3, 8), rnd(3), 0, 7); x.fill(); }
}, [1, 1]));
export const texAreia = () => T('areia', () => textura(256, 256, (x, w, h) => {
  x.fillStyle = '#f6e3b0'; x.fillRect(0, 0, w, h);
  for (let i = 0; i < 260; i++) { x.fillStyle = pick(['#fbeec4', '#ecd59a', '#fff5d6']); x.beginPath(); x.arc(rnd(w), rnd(h), rnd(1, 3.5), 0, 7); x.fill(); }
}, [16, 16]));
export const texAgua = (cor = '#6fd0e8', claro = '#a8ecf7') => T('agua' + cor, () => textura(256, 256, (x, w, h) => {
  x.fillStyle = cor; x.fillRect(0, 0, w, h); x.strokeStyle = claro; x.lineWidth = 4; x.lineCap = 'round';
  for (let i = 0; i < 26; i++) { const px = rnd(w), py = rnd(h), l = rnd(14, 34);
    for (const dx of [0, w, -w]) { x.beginPath(); x.moveTo(px + dx, py); x.quadraticCurveTo(px + dx + l / 2, py - 6, px + dx + l, py); x.stroke(); } }
}, [6, 6]));
export const texMadeira = (a = '#c9945a', b = '#b57f48') => T('mad' + a, () => textura(256, 256, (x, w, h) => {
  for (let i = 0; i < 8; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(0, i * 32, w, 32); x.fillStyle = 'rgba(90,50,20,.18)'; x.fillRect(0, i * 32, w, 2);
    x.fillRect(((i * 97) % 200) + 20, i * 32, 2, 32); }
}, [3, 3]));
export const texXadrez = (a, b, n = 8) => T('xad' + a + b + n, () => textura(256, 256, (x, w, h) => {
  const s = w / n; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) { x.fillStyle = (i + j) % 2 ? a : b; x.fillRect(i * s, j * s, s, s); }
}, [1, 1]));
export const texListras = (a, b, n = 12) => T('lis' + a + b + n, () => textura(256, 64, (x, w, h) => {
  const s = w / n; for (let i = 0; i < n; i++) { x.fillStyle = i % 2 ? a : b; x.fillRect(i * s, 0, s + 1, h); }
}, [1, 1]));
export const texPraca = () => T('praca', () => textura(1024, 1024, (x, w, h) => {
  x.fillStyle = '#f4e4c4'; x.fillRect(0, 0, w, h);
  const cx = w / 2, cy = h / 2, cores = ['#f7c6b0', '#fbe6b8', '#c9e8d2', '#f9d7a8', '#f2b9a6'];
  for (let anel = 9; anel >= 1; anel--) {
    const r0 = anel * 54, n = Math.max(8, Math.round(anel * 7));
    for (let i = 0; i < n; i++) { const a0 = (i / n) * Math.PI * 2 + anel * 0.3, a1 = a0 + (Math.PI * 2) / n - 0.035;
      x.fillStyle = cores[(i + anel) % cores.length]; x.beginPath(); x.arc(cx, cy, r0, a0, a1); x.arc(cx, cy, r0 - 48, a1, a0, true); x.closePath(); x.fill(); }
  }
  x.fillStyle = '#fff3d6'; x.beginPath(); x.arc(cx, cy, 6, 0, 7); x.fill();
}));

// placa com texto (e um desenho-emoji) para as fachadas
export function texPlaca(texto, emoji, fundo = '#fff6e0', cor = '#6b4a2b') {
  return textura(512, 128, (x, w, h) => {
    x.fillStyle = fundo; x.beginPath(); x.roundRect(4, 4, w - 8, h - 8, 34); x.fill();
    x.lineWidth = 8; x.strokeStyle = cor; x.stroke();
    x.fillStyle = cor; x.textAlign = 'center'; x.textBaseline = 'middle';
    let tam = 64; x.font = `900 ${tam}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`;
    const cheio = (emoji ? emoji + ' ' : '') + texto;
    while (x.measureText(cheio).width > w - 50 && tam > 24) { tam -= 4; x.font = `900 ${tam}px "Trebuchet MS", "Arial Rounded MT Bold", system-ui, sans-serif`; }
    x.fillText(cheio, w / 2, h / 2 + 4);
  });
}
export function texEmoji(e, tam = 128, fundo) {
  return textura(tam, tam, (x, w, h) => {
    if (fundo) { x.fillStyle = fundo; x.beginPath(); x.arc(w / 2, h / 2, w / 2 - 2, 0, 7); x.fill(); }
    x.font = `${tam * 0.7}px system-ui, "Apple Color Emoji", "Noto Color Emoji", sans-serif`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(e, w / 2, h / 2 + tam * 0.05);
  });
}

// ---------- partículas ----------
export class Particulas {
  constructor(cena, n = 900) {
    this.n = n; this.i = 0;
    this.pos = new Float32Array(n * 3); this.cor = new Float32Array(n * 4); this.tam = new Float32Array(n);
    this.vel = new Float32Array(n * 3); this.vida = new Float32Array(n); this.vidaMax = new Float32Array(n); this.grav = new Float32Array(n);
    this.tam0 = new Float32Array(n); this.arr = new Float32Array(n); this.modo = new Uint8Array(n);
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('cor', new THREE.BufferAttribute(this.cor, 4)); g.setAttribute('tam', new THREE.BufferAttribute(this.tam, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { esc: { value: 600 } },
      vertexShader: 'attribute vec4 cor; attribute float tam; varying vec4 vC; uniform float esc; void main(){ vC = cor; vec4 mv = modelViewMatrix * vec4(position,1.0); gl_PointSize = tam * esc / -mv.z; gl_Position = projectionMatrix * mv; }',
      fragmentShader: 'varying vec4 vC; void main(){ vec2 p = gl_PointCoord - 0.5; float d = length(p); if (d > 0.5) discard; float a = smoothstep(0.5, 0.32, d); gl_FragColor = vec4(vC.rgb + 0.25 * smoothstep(0.3, 0.0, d), vC.a * a); }',
    });
    this.pts = new THREE.Points(g, this.mat); this.pts.frustumCulled = false; this.pts.renderOrder = 5; cena.add(this.pts);
    this._c = new THREE.Color();
  }
  // modo 0 = encolhe e some; 1 = cresce e some (fumaça/bolha)
  um(x, y, z, vx, vy, vz, cor, tam, vida, grav = 0, arr = 0, modo = 0) {
    const i = this.i; this.i = (i + 1) % this.n;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.vel[i * 3] = vx; this.vel[i * 3 + 1] = vy; this.vel[i * 3 + 2] = vz;
    this._c.set(cor); this.cor[i * 4] = this._c.r; this.cor[i * 4 + 1] = this._c.g; this.cor[i * 4 + 2] = this._c.b; this.cor[i * 4 + 3] = 1;
    this.tam0[i] = tam; this.tam[i] = tam; this.vida[i] = vida; this.vidaMax[i] = vida; this.grav[i] = grav; this.arr[i] = arr; this.modo[i] = modo;
  }
  explosao(p, { n = 20, cores = ['#fff'], vel = 3, cima = 2, tam = 0.3, vida = 0.9, grav = 6, arr = 0.5, raio = 0, modo = 0 } = {}) {
    for (let k = 0; k < n; k++) {
      const a = rnd(Math.PI * 2), v = rnd(0.3, 1) * vel, r = rnd(raio);
      this.um(p.x + Math.cos(a) * r, p.y + rnd(0.2), p.z + Math.sin(a) * r, Math.cos(a) * v, rnd(0.4, 1) * cima + rnd(vel * 0.3), Math.sin(a) * v, pick(cores), tam * rnd(0.6, 1.3), vida * rnd(0.6, 1.2), grav, arr, modo);
    }
  }
  atualizar(dt) {
    const { n, pos, vel, vida, vidaMax, cor, tam, tam0, grav, arr, modo } = this;
    for (let i = 0; i < n; i++) {
      if (vida[i] <= 0) continue;
      vida[i] -= dt;
      if (vida[i] <= 0) { tam[i] = 0; cor[i * 4 + 3] = 0; continue; }
      const k = vida[i] / vidaMax[i], f = Math.exp(-arr[i] * dt);
      vel[i * 3] *= f; vel[i * 3 + 2] *= f; vel[i * 3 + 1] = vel[i * 3 + 1] * f - grav[i] * dt;
      pos[i * 3] += vel[i * 3] * dt; pos[i * 3 + 1] += vel[i * 3 + 1] * dt; pos[i * 3 + 2] += vel[i * 3 + 2] * dt;
      if (pos[i * 3 + 1] < 0.04 && grav[i] > 0) { pos[i * 3 + 1] = 0.04; vel[i * 3 + 1] *= -0.35; vel[i * 3] *= 0.6; vel[i * 3 + 2] *= 0.6; }
      if (modo[i] === 1) { tam[i] = tam0[i] * (1 + (1 - k) * 1.6); cor[i * 4 + 3] = Math.min(1, k * 1.6) * 0.75; }
      else { tam[i] = tam0[i] * Math.min(1, k * 2.5); cor[i * 4 + 3] = Math.min(1, k * 3); }
    }
    const g = this.pts.geometry; g.attributes.position.needsUpdate = true; g.attributes.cor.needsUpdate = true; g.attributes.tam.needsUpdate = true;
  }
  limpar() { this.vida.fill(0); this.tam.fill(0); this.cor.fill(0); }
}

// ---------- sons (tudo sintetizado, sem arquivos) ----------
export const som = (() => {
  let ac = null, mestre = null, ligado = true, musLigada = true, musTimer = null, passo = 0, modoNoite = false, festa = false;
  const iniciar = () => {
    if (ac) { if (ac.state === 'suspended') ac.resume(); return; }
    try { ac = new (window.AudioContext || window.webkitAudioContext)(); mestre = ac.createGain(); mestre.gain.value = 0.5; mestre.connect(ac.destination); tocarMusica(); } catch (e) { ac = null; }
  };
  function nota(freq, dur = 0.15, { tipo = 'sine', vol = 0.2, quando = 0, desliza = 0, ataque = 0.008 } = {}) {
    if (!ac || !ligado) return;
    const t = ac.currentTime + quando, o = ac.createOscillator(), g = ac.createGain();
    o.type = tipo; o.frequency.setValueAtTime(freq, t); if (desliza) o.frequency.exponentialRampToValueAtTime(Math.max(30, freq * desliza), t + dur);
    g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + ataque); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g); g.connect(mestre); o.start(t); o.stop(t + dur + 0.02);
  }
  function ruido(dur = 0.2, { vol = 0.2, freq = 1200, q = 1, quando = 0, desliza = 1 } = {}) {
    if (!ac || !ligado) return;
    const t = ac.currentTime + quando, b = ac.createBuffer(1, Math.ceil(ac.sampleRate * dur), ac.sampleRate), d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ac.createBufferSource(); s.buffer = b; const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.setValueAtTime(freq, t); f.Q.value = q;
    if (desliza !== 1) f.frequency.exponentialRampToValueAtTime(freq * desliza, t + dur);
    const g = ac.createGain(); g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    s.connect(f); f.connect(g); g.connect(mestre); s.start(t);
  }
  const ESC = [261.6, 293.7, 329.6, 392, 440, 523.3, 587.3, 659.3, 784, 880];
  const PROG = [[0, 2, 4, 7], [3, 5, 7, 9], [1, 3, 5, 8], [2, 4, 6, 9], [0, 3, 5, 7], [1, 4, 6, 8]];
  function tocarMusica() {
    clearInterval(musTimer);
    musTimer = setInterval(() => {
      if (!ac || !ligado || !musLigada || ac.state !== 'running') return;
      const comp = PROG[Math.floor(passo / 8) % PROG.length], i = passo % 8;
      const bpm = festa ? 0.6 : 1;
      if (i === 0) nota(ESC[comp[0]] / 2, 1.5, { tipo: 'triangle', vol: 0.09, ataque: 0.05 });
      const pad = festa ? [0, 2, 1, 3, 0, 3, 1, 2] : modoNoite ? [0, -1, 2, -1, 1, -1, 3, -1] : [0, 1, 2, -1, 3, 2, 1, -1];
      if (pad[i] >= 0) nota(ESC[comp[pad[i]]] * (modoNoite ? 0.5 : 1), 0.5 * bpm, { tipo: festa ? 'square' : 'triangle', vol: festa ? 0.05 : 0.075, ataque: 0.012 });
      if (!modoNoite && i % 4 === 2 && Math.random() < 0.5) nota(ESC[comp[pick([1, 2, 3])]] * 2, 0.35, { tipo: 'sine', vol: 0.04 });
      if (festa && i % 2 === 0) ruido(0.05, { vol: 0.08, freq: 6000 });
      passo++;
    }, 300);
  }
  return {
    iniciar,
    alternar() { ligado = !ligado; return ligado; },
    musica(l) { musLigada = l; }, noite(n) { modoNoite = n; }, festa(f) { festa = f; },
    blip(base = 420) { nota(base * rnd(0.9, 1.25), 0.06, { tipo: 'triangle', vol: 0.09 }); },
    passo() { ruido(0.05, { vol: 0.035, freq: 900, q: 0.7 }); },
    moeda() { nota(988, 0.08, { tipo: 'square', vol: 0.07 }); nota(1319, 0.3, { tipo: 'square', vol: 0.07, quando: 0.08 }); },
    pop() { nota(520, 0.12, { vol: 0.16, desliza: 2.2 }); },
    pegar() { nota(660, 0.08, { tipo: 'triangle', vol: 0.14 }); nota(880, 0.14, { tipo: 'triangle', vol: 0.14, quando: 0.07 }); },
    erro() { nota(200, 0.2, { tipo: 'square', vol: 0.06, desliza: 0.6 }); },
    porta() { nota(330, 0.1, { tipo: 'triangle', vol: 0.12 }); nota(494, 0.18, { tipo: 'triangle', vol: 0.12, quando: 0.1 }); },
    splash() { ruido(0.35, { vol: 0.2, freq: 1800, q: 0.6, desliza: 0.3 }); },
    fisgou() { nota(880, 0.07, { tipo: 'square', vol: 0.1 }); nota(880, 0.07, { tipo: 'square', vol: 0.1, quando: 0.1 }); },
    lancar() { ruido(0.25, { vol: 0.08, freq: 2500, q: 2, desliza: 2 }); },
    farfalhar() { ruido(0.5, { vol: 0.12, freq: 3200, q: 0.5 }); },
    cavar() { for (let i = 0; i < 4; i++) ruido(0.09, { vol: 0.11, freq: 500, q: 0.8, quando: i * 0.16 }); },
    vitoria() { [523, 659, 784, 1047].forEach((f, i) => nota(f, i === 3 ? 0.5 : 0.14, { tipo: 'triangle', vol: 0.15, quando: i * 0.12 })); },
    magia() { [659, 784, 988, 1175, 1568].forEach((f, i) => nota(f, 0.35, { tipo: 'sine', vol: 0.1, quando: i * 0.06 })); ruido(0.6, { vol: 0.05, freq: 5000, q: 3, desliza: 1.8 }); },
    trovao() { ruido(0.5, { vol: 0.2, freq: 300, q: 0.4, desliza: 0.4 }); nota(1200, 0.2, { tipo: 'sawtooth', vol: 0.06, desliza: 0.2 }); },
    fogo() { nota(300, 0.5, { tipo: 'sine', vol: 0.05, desliza: 4 }); ruido(0.5, { vol: 0.16, freq: 900, q: 0.4, quando: 0.5, desliza: 0.3 }); },
    sino() { nota(1568, 0.9, { tipo: 'sine', vol: 0.14 }); nota(2093, 0.7, { tipo: 'sine', vol: 0.07 }); },
    bolha() { nota(rnd(500, 900), 0.12, { vol: 0.08, desliza: 1.8 }); },
    vento() { ruido(1.6, { vol: 0.14, freq: 700, q: 0.8, desliza: 2.6 }); },
    grande() { nota(110, 0.5, { tipo: 'sawtooth', vol: 0.12, desliza: 2 }); },
    pisao() { ruido(0.18, { vol: 0.2, freq: 140, q: 0.6 }); },
    dormir() { [784, 659, 523, 392].forEach((f, i) => nota(f, 0.5, { tipo: 'sine', vol: 0.1, quando: i * 0.3 })); },
  };
})();
