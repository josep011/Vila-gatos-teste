// Mapas de fora: a Vila (praça + quarteirão) e a Praia. Cada um é montado só quando o jogador chega.
import { THREE, M, MT, MB, curvar, malha, caixa, cil, esf, cone, grupo, fundir, gPrisma, gBox, gRBox, gCil, gEsf, gCone, gTor, gDisco,
  texGrama, texCaminho, texAreia, texAgua, texMadeira, texListras, texPraca, texPlaca, texEmoji, textura, rnd, pick } from './nucleo.js';
import { mergeGeometries } from './BufferGeometryUtils.js?v=202610220925';
import { LUGARES } from './dados.js';

// materiais que acendem à noite
export const LUZ = {
  janela: curvar(new THREE.MeshLambertMaterial({ color: '#bfe6f5', emissive: '#ffd58a', emissiveIntensity: 0 })),
  lampada: curvar(new THREE.MeshLambertMaterial({ color: '#fff7d6', emissive: '#ffd27a', emissiveIntensity: 0.15 })),
  brilho: new THREE.SpriteMaterial({ map: null, color: '#ffe2a0', transparent: true, opacity: 0, depthWrite: false, blending: THREE.AdditiveBlending }),
};
LUZ.janela.userData.fixo = LUZ.lampada.userData.fixo = LUZ.brilho.userData.fixo = true;
LUZ.brilho.map = textura(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); });
LUZ.brilho.map.userData.fixo = true;
export function acenderNoite(k) { LUZ.janela.emissiveIntensity = 0.95 * k; LUZ.lampada.emissiveIntensity = 0.15 + 1.1 * k; LUZ.brilho.opacity = 0.55 * k; }

function semente(s) { return () => { s |= 0; s = (s + 0x6d2b79f5) | 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

// faixa de chão com textura em escala do mundo
function chao(pai, x0, z0, x1, z1, tex, y = 0.03, esc = 5) {
  const w = Math.abs(x1 - x0), d = Math.abs(z1 - z0), g = new THREE.PlaneGeometry(w, d);
  const uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setXY(i, (uv.getX(i) * w + Math.min(x0, x1)) / esc, (uv.getY(i) * d - Math.min(z0, z1)) / esc);
  const m = new THREE.Mesh(g, tex); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; pai.add(m); return m;
}
function disco(pai, x, z, r, tex, y = 0.03, esc = 5) {
  const g = new THREE.CircleGeometry(r, 40); const uv = g.attributes.uv, p = g.attributes.position;
  if (esc) for (let i = 0; i < uv.count; i++) uv.setXY(i, (p.getX(i) + x) / esc, (p.getY(i) - z) / esc);
  const m = new THREE.Mesh(g, tex); m.rotation.x = -Math.PI / 2; m.position.set(x, y, z); m.receiveShadow = true; pai.add(m); return m;
}

// ---------- copas de árvore ----------
let gCopa = null, gCopaPinho = null, gPetalas = null, gCopaPalma = null;
function copa() {
  if (!gCopa) { const ps = [[0, 0, 0, 1.25], [0.75, -0.3, 0.2, 0.85], [-0.8, -0.25, -0.1, 0.9], [0.1, -0.3, 0.8, 0.8], [-0.1, 0.75, 0, 0.85]];
    gCopa = mergeGeometries(ps.map(([x, y, z, r]) => new THREE.SphereGeometry(r, 12, 9).translate(x, y, z))); gCopa.userData.fixo = true; }
  return gCopa;
}
function copaPinho() {
  if (!gCopaPinho) { gCopaPinho = mergeGeometries([[0, 1.5, 1.6], [0.9, 1.25, 1.4], [1.7, 0.95, 1.2]].map(([y, r, h]) => new THREE.ConeGeometry(r, h, 10).translate(0, y, 0))); gCopaPinho.userData.fixo = true; }
  return gCopaPinho;
}
function copaPalma() {
  if (!gCopaPalma) { const fs = []; for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const f = new THREE.SphereGeometry(1, 8, 6); f.scale(1.25, 0.1, 0.36); f.translate(1.1, 0, 0); f.rotateZ(-0.35); f.rotateY(a); fs.push(f); }
    gCopaPalma = mergeGeometries(fs); gCopaPalma.userData.fixo = true; }
  return gCopaPalma;
}
function petalas() {
  if (!gPetalas) { const ps = []; for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; ps.push(new THREE.SphereGeometry(0.11, 7, 5).scale(1, 0.45, 1).translate(Math.cos(a) * 0.13, 0, Math.sin(a) * 0.13)); }
    gPetalas = mergeGeometries(ps); gPetalas.userData.fixo = true; }
  return gPetalas;
}
const CORES_FLOR = ['#ff6b8b', '#ffd166', '#ffffff', '#c77dff', '#ff9f1c', '#4cc9f0', '#f72585'];

export function arvore(pai, x, z, tipo = 'comum', esc = 1) {
  const g = grupo(pai, x, 0, z); g.userData.vivo = true; g.scale.setScalar(esc);
  const frutas = [];
  if (tipo === 'palma') {
    const t = cil(g, 0.2, 0.3, 4.2, '#b08968', 0.25, 2.1, 0, 8); t.rotation.z = -0.12;
    malha(copaPalma(), M('#52b788'), 0.5, 4.25, 0, g);
    for (let i = 0; i < 3; i++) frutas.push(esf(g, 0.2, '#7a5230', 0.5 + Math.cos(i * 2.1) * 0.28, 3.95, Math.sin(i * 2.1) * 0.28, 8));
  } else if (tipo === 'pinho') {
    cil(g, 0.22, 0.28, 1.0, '#8d6748', 0, 0.5, 0, 8); malha(copaPinho(), M('#4a9e6b'), 0, 0.5, 0, g);
  } else {
    cil(g, 0.26, 0.36, 1.9, '#9c6b4a', 0, 0.95, 0, 8);
    malha(copa(), M(tipo === 'maca' ? '#5fbf5a' : tipo === 'laranja' ? '#4fb06a' : '#68c96a'), 0, 2.7, 0, g);
    if (tipo === 'maca' || tipo === 'laranja') for (const [fx, fy, fz] of [[0.9, 2.3, 0.75], [-0.75, 2.5, 0.8], [0.15, 3.2, 1.0]]) frutas.push(esf(g, 0.2, tipo === 'maca' ? '#e5383b' : '#ff9f1c', fx, fy, fz, 8));
  }
  return { g, x, z, tipo, frutas, tem: frutas.length > 0, sac: 0, fase: rnd(6), fruta: tipo === 'maca' ? 'maca' : tipo === 'laranja' ? 'laranja' : tipo === 'palma' ? 'coco' : null };
}

export function flor(pai, x, z, cor, esc = 1) {
  const g = grupo(pai, x, 0, z); g.scale.setScalar(esc);
  cil(g, 0.025, 0.025, 0.4, '#58a55c', 0, 0.2, 0, 5).castShadow = false; malha(petalas(), M(cor), 0, 0.42, 0, g).castShadow = false; esf(g, 0.06, '#ffd166', 0, 0.45, 0, 6).castShadow = false;
  return g;
}
// canteiros: muitas flores numa malha só
function flores(pai, pontos) {
  const n = pontos.length, d = new THREE.Object3D(), c = new THREE.Color();
  const caule = new THREE.InstancedMesh(gCil(0.025, 0.025, 0.4, 5), M('#58a55c'), n), pet = new THREE.InstancedMesh(petalas(), curvar(new THREE.MeshLambertMaterial({ color: '#fff' })), n), miolo = new THREE.InstancedMesh(gEsf(0.06, 6, 5), M('#ffd166'), n);
  pontos.forEach(([x, z, cor], i) => {
    const s = 0.8 + ((i * 37) % 10) / 20; d.scale.setScalar(s); d.rotation.y = i;
    d.position.set(x, 0.2 * s, z); d.updateMatrix(); caule.setMatrixAt(i, d.matrix);
    d.position.y = 0.42 * s; d.updateMatrix(); pet.setMatrixAt(i, d.matrix); pet.setColorAt(i, c.set(cor || CORES_FLOR[i % CORES_FLOR.length]));
    d.position.y = 0.45 * s; d.updateMatrix(); miolo.setMatrixAt(i, d.matrix);
  });
  for (const m of [caule, pet, miolo]) { m.receiveShadow = false; m.castShadow = false; pai.add(m); }
}

// ---------- prédio genérico (frente virada para +z) ----------
function predio(pai, o) {
  const { x, z, w, d, h = 4, cor, corTelhado, telhado = 'lado', id } = o;
  const g = grupo(pai, x, 0, z), L = LUGARES[id];
  const corBase = new THREE.Color(cor).multiplyScalar(0.82).getStyle();
  caixa(g, w + 0.25, 0.6, d + 0.25, corBase, 0, 0.3, 0, 0.1);
  caixa(g, w, h, d, cor, 0, h / 2, 0, 0.25);
  const fz = d / 2;
  // telhado
  if (telhado === 'lado') { const t = malha(gPrisma(d + 1.1, o.altTelhado || 2.2, w + 0.9), M(corTelhado), 0, h - 0.05, 0, g); t.rotation.y = Math.PI / 2; caixa(g, w + 1.0, 0.22, 0.4, '#fff6e0', 0, h + (o.altTelhado || 2.2) - 0.05, 0, 0.1); }
  else if (telhado === 'frente') { malha(gPrisma(w + 1.0, o.altTelhado || 2.4, d + 1.0), M(corTelhado), 0, h - 0.05, 0, g); }
  else if (telhado === 'quatro') { const t = malha(gCone(1, 1, 4), M(corTelhado), 0, h + (o.altTelhado || 2.2) / 2 - 0.05, 0, g); t.rotation.y = Math.PI / 4; t.scale.set((w + 1) * 0.72, o.altTelhado || 2.2, (d + 1) * 0.72); }
  else { caixa(g, w + 0.5, 0.45, d + 0.5, corTelhado, 0, h + 0.15, 0, 0.12); }
  // porta
  const px = o.portaX || 0, corPorta = o.corPorta || '#a8643c';
  caixa(g, 1.9, 2.55, 0.25, '#fff6e0', px, 1.3, fz, 0.12);
  caixa(g, 1.45, 2.15, 0.2, corPorta, px, 1.12, fz + 0.1, 0.2);
  esf(g, 0.09, '#f7c948', px + 0.45, 1.1, fz + 0.24, 8);
  malha(gDisco(0.28, 16), LUZ.janela, px, 1.72, fz + 0.21, g).castShadow = false;
  caixa(g, 2.5, 0.16, 1.1, '#e8dcc0', px, 0.08, fz + 0.6, 0.06);
  // janelas
  for (const jx of o.janelas || [-w / 2 + 1.6, w / 2 - 1.6]) {
    caixa(g, 1.55, 1.55, 0.2, '#fff6e0', jx, 2.0, fz, 0.1);
    malha(gBox(1.25, 1.25, 0.06), LUZ.janela, jx, 2.0, fz + 0.09, g).castShadow = false;
    caixa(g, 1.25, 0.07, 0.1, '#fff6e0', jx, 2.0, fz + 0.1); caixa(g, 0.07, 1.25, 0.1, '#fff6e0', jx, 2.0, fz + 0.1);
    if (o.floreira !== false) { caixa(g, 1.5, 0.28, 0.4, '#b5764a', jx, 1.12, fz + 0.24, 0.06); for (let i = -2; i <= 2; i++) esf(g, 0.15, CORES_FLOR[(i + 9 + Math.round(jx)) % CORES_FLOR.length], jx + i * 0.28, 1.34, fz + 0.26, 6).castShadow = false; }
  }
  // toldo listrado
  if (o.toldo) { const t = malha(gBox(o.toldoW || w - 0.6, 0.12, 1.5), MT(texListras(o.toldo, '#ffffff', 10)), 0, 3.05, fz + 0.65, g); t.rotation.x = 0.32; }
  // placa
  const placa = malha(gBox(3.6, 0.9, 0.12), MT(texPlaca(L.nome, L.emoji, '#fff6e0', o.corPlaca || '#6b4a2b')), px, o.placaY || (o.toldo ? 3.95 : 3.35), fz + (o.toldo ? 0.12 : 0.14), g); placa.castShadow = false;
  if (o.chamine) { caixa(g, 0.7, 1.6, 0.7, '#c9806a', w / 2 - 1.3, h + 1.2, -0.6, 0.08); caixa(g, 0.85, 0.2, 0.85, '#a8604c', w / 2 - 1.3, h + 2.0, -0.6, 0.05); }
  return { g, fz, porta: { x: x + px, z: z + fz + 1.0 } };
}

function poste(pai, x, z, col) {
  const g = grupo(pai, x, 0, z); cil(g, 0.09, 0.13, 3.1, '#4a5568', 0, 1.55, 0, 8); cil(g, 0.2, 0.2, 0.12, '#4a5568', 0, 0.06, 0, 10);
  cil(g, 0.26, 0.12, 0.14, '#4a5568', 0, 3.45, 0, 10); malha(gEsf(0.26, 12, 10), LUZ.lampada, 0, 3.2, 0, g).castShadow = false;
  const s = new THREE.Sprite(LUZ.brilho); s.scale.setScalar(3.2); s.position.set(0, 3.2, 0); s.userData.vivo = true; g.add(s);
  if (col) col.push({ x, z, r: 0.3 });
  return g;
}
function bancoPraca(pai, x, z, ry, col) {
  const g = grupo(pai, x, 0, z, ry), mad = MT(texMadeira());
  malha(gRBox(2.2, 0.14, 0.7, 0.05), mad, 0, 0.55, 0, g); const e = malha(gRBox(2.2, 0.6, 0.12, 0.05), mad, 0, 1.0, -0.32, g); e.rotation.x = -0.15;
  for (const sx of [-0.9, 0.9]) { caixa(g, 0.12, 0.55, 0.6, '#4a5568', sx, 0.27, 0); }
  if (col) col.push({ x, z, r: 0.95 });
  return g;
}
function bandeirinhas(pai, a, b, alt, n = 9) {
  const d = new THREE.Object3D(), cores = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff', '#ff924c'], c = new THREE.Color();
  const s = new THREE.Shape(); s.moveTo(-0.22, 0); s.lineTo(0.22, 0); s.lineTo(0, -0.5); s.closePath();
  const im = new THREE.InstancedMesh(new THREE.ShapeGeometry(s), curvar(new THREE.MeshLambertMaterial({ color: '#fff', side: THREE.DoubleSide })), n);
  const pts = [];
  for (let i = 0; i <= n + 1; i++) { const k = i / (n + 1); pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * k, alt - Math.sin(k * Math.PI) * 0.7, a[1] + (b[1] - a[1]) * k)); }
  for (let i = 1; i <= n; i++) { d.position.copy(pts[i]); d.rotation.set(0, Math.atan2(b[0] - a[0], b[1] - a[1]) + Math.PI / 2, 0); d.updateMatrix(); im.setMatrixAt(i - 1, d.matrix); im.setColorAt(i - 1, c.set(cores[(i + Math.round(a[0])) % cores.length])); }
  im.castShadow = false; pai.add(im);
  const fio = new THREE.Line(new THREE.BufferGeometry().setFromPoints(pts), curvar(new THREE.LineBasicMaterial({ color: '#7a6a58' }))); pai.add(fio);
}
function pedra(pai, x, z, r, cor = '#b8bcc4') { const p = malha(gEsf(1, 8, 6), M(cor), x, r * 0.3, z, pai); p.scale.set(r, r * 0.6, r * 0.85); p.rotation.y = x * 3; return p; }
function arbusto(pai, x, z, r = 0.7, cor = '#57b560') { const p = malha(gEsf(1, 10, 8), M(cor), x, r * 0.55, z, pai); p.scale.set(r, r * 0.75, r); return p; }
function caixote(pai, x, z, s = 0.8, y = 0) { const c = malha(gRBox(1, 1, 1, 0.06), MT(texMadeira('#d9a868', '#c4924f')), x, y + s / 2, z, pai); c.scale.setScalar(s); return c; }
function barril(pai, x, z) { const g = grupo(pai, x, 0, z); cil(g, 0.38, 0.38, 0.95, '#a8703f', 0, 0.48, 0, 12); for (const y of [0.2, 0.76]) cil(g, 0.4, 0.4, 0.08, '#5a5a66', 0, y, 0, 12); return g; }
function guardaSol(pai, x, z, cor, col) {
  const g = grupo(pai, x, 0, z); cil(g, 0.05, 0.05, 2.6, '#f4f1de', 0, 1.3, 0, 8);
  const t = malha(gCone(1.7, 0.7, 10), MT(texListras(cor, '#ffffff', 10)), 0, 2.75, 0, g); t.castShadow = true;
  if (col) col.push({ x, z, r: 0.25 }); return g;
}
function mesinha(pai, x, z, col) {
  const g = grupo(pai, x, 0, z); cil(g, 0.6, 0.6, 0.08, '#fff6e0', 0, 0.8, 0, 16); cil(g, 0.06, 0.06, 0.8, '#4a5568', 0, 0.4, 0, 8); cil(g, 0.3, 0.3, 0.05, '#4a5568', 0, 0.03, 0, 12);
  for (const sx of [-1, 1]) { cil(g, 0.26, 0.26, 0.07, '#e76f51', sx * 1.0, 0.5, 0, 12); cil(g, 0.04, 0.04, 0.5, '#4a5568', sx * 1.0, 0.25, 0, 6); }
  if (col) col.push({ x, z, r: 0.75 }); return g;
}

// =====================================================================================
//                                        VILA
// =====================================================================================
export function construirVila(ctx) {
  const raiz = new THREE.Group(), col = [], inter = [], arvores = [], vivos = [], R = semente(20261111);
  const estat = grupo(raiz);                 // tudo que é parado (vai ser fundido)
  // chão
  const grama = new THREE.Mesh(new THREE.PlaneGeometry(220, 220), MT(texGrama())); grama.rotation.x = -Math.PI / 2; grama.receiveShadow = true; raiz.add(grama);
  const cam = MT(texCaminho()); cam.map.wrapS = cam.map.wrapT = THREE.RepeatWrapping;
  const faixas = [
    [-19.5, -19.5, 19.5, -16.5], [-19.5, 16.5, 19.5, 19.5], [-19.5, -19.5, -16.5, 19.5], [16.5, -19.5, 19.5, 19.5],      // anel
    [-1.5, -16.5, 1.5, -11], [-1.5, 11, 1.5, 16.5], [-16.5, -1.5, -11, 1.5], [11, -1.5, 16.5, 1.5],                      // raios
    [-1.5, -24, 1.5, -19.5], [-22.5, -23.5, 22.5, -21], [-22.5, -24, -19.5, -19.5], [19.5, -24, 22.5, -19.5],            // norte
    [-28, -6.6, -19.5, -4.2], [-28, 10.3, -19.5, 12.7], [19.5, -6.6, 28, -4.2], [19.5, 10.3, 28, 12.7],                  // lados
    [-1.5, 19.5, 1.5, 41], [-16.5, 28.4, 16.5, 30.8], [19.5, 17, 26, 19.5], [23.5, 19.5, 26, 24.5],                       // sul + lago
  ];
  for (const [x0, z0, x1, z1] of faixas) chao(estat, x0, z0, x1, z1, cam);
  for (const [x, z] of [[-18, -18], [18, -18], [-18, 18], [18, 18]]) disco(estat, x, z, 2.4, cam, 0.032);
  // praça
  const pr = new THREE.Mesh(new THREE.CircleGeometry(12, 56), MT(texPraca())); pr.rotation.x = -Math.PI / 2; pr.position.y = 0.045; pr.receiveShadow = true; raiz.add(pr);
  malha(gTor(12, 0.16, 6, 56), M('#e8d2a6'), 0, 0.06, 0, estat).rotation.x = Math.PI / 2;

  // ---------- chafariz ----------
  const ch = grupo(estat, 0, 0, 0);
  cil(ch, 3.0, 3.2, 0.7, '#e9e4d8', 0, 0.35, 0, 28); malha(gTor(3.0, 0.2, 8, 28), M('#f7f3ea'), 0, 0.72, 0, ch).rotation.x = Math.PI / 2;
  cil(ch, 0.5, 0.75, 1.6, '#e9e4d8', 0, 1.1, 0, 14); cil(ch, 1.3, 0.5, 0.35, '#f7f3ea', 0, 2.0, 0, 20); cil(ch, 0.28, 0.4, 0.8, '#e9e4d8', 0, 2.5, 0, 12);
  // peixe dourado no topo
  const pf = grupo(ch, 0, 3.25, 0); pf.rotation.z = 0.9; const ou = M('#f7c948', { emissive: '#8a5a00', emissiveIntensity: 0.3 });
  malha(gEsf(0.4, 12, 10), ou, 0, 0, 0, pf).scale.set(1.5, 0.7, 0.45); const rb = malha(gCone(0.3, 0.4, 4), ou, -0.72, 0, 0, pf); rb.rotation.z = -Math.PI / 2; rb.scale.z = 0.3;
  const aguaCh = new THREE.Mesh(gDisco(2.85, 28), curvar(new THREE.MeshLambertMaterial({ map: texAgua(), transparent: true, opacity: 0.92 }))); aguaCh.rotation.x = -Math.PI / 2; aguaCh.position.y = 0.66; raiz.add(aguaCh);
  const aguaTopo = new THREE.Mesh(gDisco(1.2, 20), aguaCh.material); aguaTopo.rotation.x = -Math.PI / 2; aguaTopo.position.y = 2.16; raiz.add(aguaTopo);
  col.push({ x: 0, z: 0, r: 3.45 });

  // postes, bandeirinhas, bancos, canteiros
  const postes = [];
  for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2 + Math.PI / 8, x = Math.cos(a) * 11.2, z = Math.sin(a) * 11.2; poste(estat, x, z, col); postes.push([x, z]); }
  for (let i = 0; i < 8; i++) bandeirinhas(raiz, postes[i], postes[(i + 1) % 8], 3.35);
  for (let i = 0; i < 4; i++) { const a = (i / 4) * Math.PI * 2 + Math.PI / 4; bancoPraca(estat, Math.cos(a) * 7.6, Math.sin(a) * 7.6, -a + Math.PI / 2 + Math.PI, col); }
  const pf2 = [];
  for (let q = 0; q < 4; q++) for (let i = 0; i < 16; i++) { const a = (q / 4) * Math.PI * 2 + Math.PI / 4 + (R() - 0.5) * 0.75, r = 9.2 + R() * 1.3; pf2.push([Math.cos(a) * r, Math.sin(a) * r]); }
  for (let i = 0; i < 26; i++) { const a = (i / 26) * Math.PI * 2; pf2.push([Math.cos(a) * 3.9, Math.sin(a) * 3.9]); }
  // carrinho de sorvete e quadro de avisos
  const car = grupo(estat, 8.2, 0, -3.2, -0.5); caixa(car, 1.6, 0.9, 1.0, '#ffd6e0', 0, 0.85, 0, 0.12); for (const sx of [-0.6, 0.6]) cil(car, 0.3, 0.3, 0.1, '#4a5568', sx, 0.3, 0.5, 12).rotation.x = Math.PI / 2;
  cil(car, 0.04, 0.04, 1.6, '#f4f1de', 0, 2.0, 0, 6); malha(gCone(1.3, 0.55, 10), MT(texListras('#ff8fab', '#ffffff', 10)), 0, 2.95, 0, car);
  cone(car, 0.14, 0.3, '#e9c46a', 0.4, 1.45, 0, 8).rotation.x = Math.PI; esf(car, 0.17, '#ff8fab', 0.4, 1.68, 0, 8); esf(car, 0.17, '#bde0fe', -0.3, 1.42, 0.1, 8);
  col.push({ x: 8.2, z: -3.2, r: 1.1 });
  inter.push({ tipo: 'placa', x: 8.2, z: -3.2, r: 2.0, rotulo: 'Olhar', texto: 'Carrinho de sorvete da praça. Sabores de hoje: atum com creme, sardinha crocante e baunilha (para os chatos).' });
  const av = grupo(estat, -3.2, 0, 10.2); for (const sx of [-0.9, 0.9]) cil(av, 0.08, 0.08, 1.9, '#8d5a2b', sx, 0.95, 0, 6); caixa(av, 2.2, 1.3, 0.14, '#b5764a', 0, 1.5, 0, 0.05);
  [['#fff6e0', -0.6, 1.65], ['#ffd6e0', 0.1, 1.7], ['#caf0f8', 0.65, 1.45], ['#fdffb6', -0.35, 1.25]].forEach(([c, x, y]) => caixa(av, 0.5, 0.42, 0.03, c, x, y, 0.09));
  malha(gPrisma(2.6, 0.45, 0.5), M('#c9485b'), 0, 2.15, 0, av);
  col.push({ x: -3.2, z: 10.2, r: 1.0 });
  inter.push({ tipo: 'avisos', x: -3.2, z: 10.6, r: 1.9, rotulo: 'Ler avisos' });
  // balões
  const baloes = [];
  for (const [bx, bz] of [[5.4, 5.4], [-5.4, -5.4], [8.2, -3.2]]) for (let i = 0; i < 3; i++) {
    const b = grupo(raiz, bx + (i - 1) * 0.3, 2.6 + i * 0.35, bz); b.userData.vivo = true;
    const e = malha(gEsf(0.34, 12, 10), M(['#ff595e', '#ffca3a', '#1982c4', '#8ac926', '#c77dff'][(i + Math.round(bx)) % 5 < 0 ? 0 : (i + Math.abs(Math.round(bx))) % 5]), 0, 0, 0, b); e.scale.y = 1.2;
    const f = cil(b, 0.008, 0.008, 1.9, '#ffffff', 0, -1.2, 0, 4); f.castShadow = false;
    baloes.push({ b, x: b.position.x, y: b.position.y, z: bz, f: rnd(6) });
  }

  // ---------- prédios ----------
  const P = {};
  const faz = (o) => { const p = predio(estat, o); P[o.id] = p; col.push({ x0: o.x - o.w / 2 - 0.2, x1: o.x + o.w / 2 + 0.2, z0: o.z - o.d / 2 - 0.2, z1: o.z + o.d / 2 + 0.25 });
    inter.push({ tipo: 'porta', destino: o.id, x: p.porta.x, z: p.porta.z, r: 1.5, rotulo: 'Entrar', nome: LUGARES[o.id].nome }); return p; };
  // prefeitura
  { const p = faz({ id: 'prefeitura', x: 0, z: -28.5, w: 12, d: 7, h: 4.6, cor: '#fbe9c9', corTelhado: '#c9485b', telhado: 'lado', altTelhado: 2.0, janelas: [-4.4, 4.4], placaY: 3.9, corPlaca: '#8a2c3c' }), g = p.g;
    for (const sx of [-2.5, -1.25, 1.25, 2.5]) { cil(g, 0.24, 0.28, 3.6, '#fffaf0', sx, 1.9, 4.6, 12); caixa(g, 0.7, 0.2, 0.7, '#fffaf0', sx, 0.2, 4.6); caixa(g, 0.7, 0.2, 0.7, '#fffaf0', sx, 3.75, 4.6); }
    caixa(g, 6.4, 0.5, 1.9, '#fffaf0', 0, 4.1, 4.2, 0.08); malha(gPrisma(6.6, 1.3, 1.9), M('#c9485b'), 0, 4.35, 4.2, g);
    caixa(g, 2.6, 3.2, 2.6, '#fbe9c9', 0, 7.6, -0.6, 0.15); const tt = malha(gCone(1, 1, 4), M('#c9485b'), 0, 10.1, -0.6, g); tt.rotation.y = Math.PI / 4; tt.scale.set(2.3, 1.9, 2.3);
    const rel = malha(gDisco(0.95, 24), MT(textura(128, 128, (x) => { x.fillStyle = '#fffaf0'; x.beginPath(); x.arc(64, 64, 62, 0, 7); x.fill(); x.lineWidth = 6; x.strokeStyle = '#6b4a2b'; x.stroke(); x.fillStyle = '#6b4a2b'; for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; x.beginPath(); x.arc(64 + Math.cos(a) * 50, 64 + Math.sin(a) * 50, 4, 0, 7); x.fill(); } })), 0, 7.8, 0.74, g); rel.castShadow = false;
    const pg = grupo(g, 0, 7.8, 0.78); pg.userData.vivo = true; const ph = caixa(pg, 0.09, 0.5, 0.04, '#6b4a2b', 0, 0.22, 0); const pm = grupo(g, 0, 7.8, 0.8); pm.userData.vivo = true; caixa(pm, 0.06, 0.75, 0.04, '#c9485b', 0, 0.34, 0);
    vivos.push((dt, t, c) => { const h = c.hora(); pg.rotation.z = -(h % 12) / 12 * Math.PI * 2; pm.rotation.z = -(h % 1) * Math.PI * 2; });
    cil(g, 0.06, 0.06, 2.6, '#e8e8e8', 0, 12.2, -0.6, 6); const fl = grupo(g, 0, 12.9, -0.6); fl.userData.vivo = true; const fb = malha(new THREE.PlaneGeometry(1.5, 0.9, 8, 1), curvar(new THREE.MeshLambertMaterial({ color: '#ffca3a', side: THREE.DoubleSide })), 0.78, 0, 0, fl);
    const p0 = fb.geometry.attributes.position.array.slice(); vivos.push((dt, t) => { const a = fb.geometry.attributes.position; for (let i = 0; i < a.count; i++) a.setZ(i, Math.sin(p0[i * 3] * 3.5 - t * 5) * 0.12 * (p0[i * 3] + 0.75)); a.needsUpdate = true; });
    for (const sx of [-4.4, 4.4]) { arbusto(estat, sx, -24.4, 0.75); }
  }
  // banco
  { const p = faz({ id: 'banco', x: -21, z: -28.5, w: 8, d: 6.5, h: 4.2, cor: '#d8efe0', corTelhado: '#3f7d5c', telhado: 'plano', floreira: false, janelas: [-2.6, 2.6], corPlaca: '#2b5740' }), g = p.g;
    for (const sx of [-1.5, 1.5]) { cil(g, 0.26, 0.3, 3.4, '#fffaf0', sx, 1.8, 3.9, 12); }
    caixa(g, 4.4, 0.45, 1.6, '#fffaf0', 0, 3.75, 3.65, 0.08);
    const moe = cil(g, 1.1, 1.1, 0.22, M('#f7c948', { emissive: '#8a5a00', emissiveIntensity: 0.3 }), 0, 5.9, 0.5, 24); moe.rotation.x = Math.PI / 2; moe.userData.vivo = true; vivos.push((dt, t) => { moe.rotation.z = t * 0.8; });
    cil(g, 0.12, 0.12, 0.9, '#3f7d5c', 0, 4.9, 0.5, 8);
  }
  // museu
  { const p = faz({ id: 'museu', x: 21, z: -28.5, w: 9, d: 6.5, h: 4.4, cor: '#e9e2f5', corTelhado: '#7b6bb5', telhado: 'frente', altTelhado: 2.0, floreira: false, janelas: [-3.1, 3.1], corPlaca: '#4a3d85' }), g = p.g;
    for (const sx of [-1.7, 1.7]) cil(g, 0.26, 0.3, 3.6, '#fffaf0', sx, 1.9, 3.85, 12);
    for (const [sx, c] of [[-3.1, '#ff8fab'], [3.1, '#4cc9f0']]) { caixa(g, 0.9, 1.9, 0.06, c, sx, 3.9, 3.42); }
    esf(g, 0.5, M('#f7c948', { emissive: '#8a5a00', emissiveIntensity: 0.3 }), 0, 6.7, 3.3, 12);
  }
  // loja de roupas
  { const p = faz({ id: 'roupas', x: -28, z: -10.5, w: 7.6, d: 6, h: 4, cor: '#ffdbe7', corTelhado: '#e86a92', telhado: 'lado', toldo: '#e86a92', janelas: [-2.5, 2.5], floreira: false, corPlaca: '#a23e62' }), g = p.g;
    for (const [sx, c] of [[-2.5, '#4cc9f0'], [2.5, '#ffca3a']]) { cil(g, 0.05, 0.05, 0.5, '#888', sx, 1.6, 3.14, 6); caixa(g, 0.6, 0.5, 0.1, c, sx, 2.05, 3.14, 0.1); }
  }
  // café
  { const p = faz({ id: 'cafe', x: -28, z: 6.5, w: 7, d: 6, h: 3.8, cor: '#f1dcc4', corTelhado: '#8b5e3c', telhado: 'lado', toldo: '#8b5e3c', chamine: true, janelas: [-2.3, 2.3], corPlaca: '#5c3d27' });
    mesinha(estat, -23.2, 14.4, col); guardaSol(estat, -23.2, 14.4, '#8b5e3c', null); mesinha(estat, -31.5, 14.6, col); guardaSol(estat, -31.5, 14.6, '#e9c46a', null);
    const xic = grupo(p.g, 0, 6.1, 1.2); cil(xic, 0.7, 0.5, 0.8, '#ffffff', 0, 0, 0, 16); malha(gTor(0.3, 0.09, 8, 16), M('#ffffff'), 0.75, 0, 0, xic); cil(xic, 0.6, 0.6, 0.05, '#6f4e37', 0, 0.39, 0, 16);
  }
  // restaurante
  { const p = faz({ id: 'restaurante', x: 28, z: -10.5, w: 8, d: 6, h: 4, cor: '#fff1c9', corTelhado: '#e2711d', telhado: 'lado', toldo: '#e2711d', chamine: true, janelas: [-2.7, 2.7], corPlaca: '#9c4a0c' }), g = p.g;
    const pg = grupo(g, -1.5, 6.6, 1.6); const ou2 = M('#ffb703', { emissive: '#b86e00', emissiveIntensity: 0.35 });
    malha(gEsf(0.6, 12, 10), ou2, 0, 0, 0, pg).scale.set(1.6, 0.75, 0.4); const r2 = malha(gCone(0.5, 0.6, 4), ou2, -1.2, 0, 0, pg); r2.rotation.z = -Math.PI / 2; r2.scale.z = 0.3; esf(pg, 0.08, '#222', 0.55, 0.12, 0.2, 6);
    ctx.fumaca = { x: 28 + 8 / 2 - 1.3, y: 6.3, z: -10.5 - 0.6 };
  }
  // clínica
  { const p = faz({ id: 'clinica', x: 28, z: 6.5, w: 7, d: 6, h: 4, cor: '#f4fbff', corTelhado: '#56c1c7', telhado: 'plano', janelas: [-2.3, 2.3], corPlaca: '#1f7a80' }), g = p.g;
    const cz = grupo(g, 0, 5.4, 1.0); caixa(cz, 1.6, 0.5, 0.3, '#56c1c7', 0, 0, 0, 0.1); caixa(cz, 0.5, 1.6, 0.3, '#56c1c7', 0, 0, 0, 0.1); cil(g, 0.1, 0.1, 0.6, '#aaa', 0, 4.6, 1.0, 6);
  }
  // armazém
  { const p = faz({ id: 'armazem', x: -15, z: 24, w: 7.6, d: 6, h: 3.9, cor: '#f6d2a2', corTelhado: '#b5653a', telhado: 'frente', altTelhado: 2.4, janelas: [-2.5, 2.5], floreira: false, corPlaca: '#6a3a1a' });
    caixote(estat, -19.6, 27.8, 0.9); caixote(estat, -19.6, 27.8, 0.7, 0.9); caixote(estat, -20.6, 28.2, 0.8); barril(estat, -10.3, 27.7); barril(estat, -9.5, 28.1);
    col.push({ x: -20, z: 28, r: 1.0 }, { x: -9.9, z: 27.9, r: 0.8 });
  }
  // casa do jogador
  { const p = faz({ id: 'casa', x: 14, z: 24, w: 6.6, d: 5.6, h: 3.7, cor: '#dff3e3', corTelhado: '#5aa9e6', telhado: 'frente', altTelhado: 2.4, chamine: true, janelas: [-2.1, 2.1], corPlaca: '#2a6fa8', corPorta: '#5aa9e6' });
    const mb = grupo(estat, 17.6, 0, 28.3); cil(mb, 0.06, 0.06, 1.1, '#8d5a2b', 0, 0.55, 0, 6); caixa(mb, 0.5, 0.36, 0.7, '#e63946', 0, 1.2, 0, 0.12); col.push({ x: 17.6, z: 28.3, r: 0.3 });
    for (let i = 0; i < 5; i++) { caixa(estat, 0.14, 0.75, 0.14, '#fff6e0', 9.6 + i * 0.55, 0.38, 28.4, 0.03); } caixa(estat, 2.5, 0.1, 0.08, '#fff6e0', 10.7, 0.5, 28.4);
  }

  // ---------- lago ----------
  const LX = 31, LZ = 30, LR = 6.6;
  disco(estat, LX, LZ, LR + 1.0, MT(texAreia()), 0.028, 4);
  const lago = new THREE.Mesh(gDisco(LR, 40), curvar(new THREE.MeshLambertMaterial({ map: texAgua('#6cc8e6', '#b4f0fa'), transparent: true, opacity: 0.93 }))); lago.rotation.x = -Math.PI / 2; lago.position.set(LX, 0.06, LZ); lago.receiveShadow = true; raiz.add(lago);
  for (let i = 0; i < 9; i++) { if (i === 4 || i === 5) continue; const a = i * 0.72 + 0.4; pedra(estat, LX + Math.cos(a) * (LR + 0.5), LZ + Math.sin(a) * (LR + 0.5), 0.45 + (i % 3) * 0.18); }
  const vit = [];
  for (const [vx, vz] of [[2.2, 1.5], [-2.6, -1.2], [0.6, -3.4], [-1, 3]]) { const v = grupo(raiz, LX + vx, 0.09, LZ + vz); v.userData.vivo = true; const d2 = cil(v, 0.5, 0.5, 0.04, '#6ecb63', 0, 0, 0, 14); d2.castShadow = false; if ((vx > 0) === (vz > 0)) { malha(petalas(), M('#ffafcc'), 0, 0.08, 0, v).scale.setScalar(1.3); esf(v, 0.07, '#ffd166', 0, 0.1, 0, 6); } vit.push(v); }
  for (let i = 0; i < 8; i++) { const a = 2.2 + i * 0.16; const j = cil(estat, 0.03, 0.04, 1.3 + (i % 3) * 0.3, '#7cb86a', LX + Math.cos(a) * (LR - 0.3), 0.65, LZ + Math.sin(a) * (LR - 0.3), 5); j.castShadow = false; if (i % 2) cil(estat, 0.07, 0.07, 0.35, '#8d5a2b', j.position.x, 1.35, j.position.z, 6); }
  // píer do lago (entra na água pelo lado da vila)
  const pier = grupo(estat, 0, 0, 0), madP = MT(texMadeira());
  malha(gBox(2.2, 0.18, 5.4), madP, 24.8, 0.32, 25.6, pier).rotation.y = -0.82;
  for (const [ex, ez] of [[23.6, 23.2], [22.4, 24.4], [26.9, 26.4], [25.8, 27.6]]) cil(pier, 0.11, 0.11, 0.9, '#8d5a2b', ex, 0.3, ez, 6);
  // jogador pode andar sobre o píer (retângulo girado guardado como caixa simples perto do eixo)
  const ponte = { ax: 22.9, az: 23.7, bx: 26.7, bz: 27.5, larg: 1.0 };
  col.push({ x: LX, z: LZ, r: LR - 0.1, agua: true });

  // ---------- árvores ----------
  const livres = (x, z, r) => {
    if (Math.hypot(x, z) < 14) return false; if (Math.hypot(x - LX, z - LZ) < LR + 2.2) return false;
    for (const c of col) { if (c.r !== undefined) { if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false; } else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r + 2.6) return false; }
    for (const [x0, z0, x1, z1] of faixas) if (x > x0 - r && x < x1 + r && z > z0 - r && z < z1 + r) return false;
    for (const a of arvores) if (Math.hypot(x - a.x, z - a.z) < 3.4) return false;
    return true;
  };
  const fixas = [[-9, -22.9, 'maca'], [9, -22.9, 'laranja'], [-22, -1, 'maca'], [22, -1, 'laranja'], [-22, 17, 'comum'], [8, 22, 'maca'], [-7, 22, 'laranja'], [-34, -20, 'comum'], [34, -20, 'maca'],
    [-35, 0, 'laranja'], [35, 0, 'comum'], [6, 35, 'maca'], [-6, 35, 'laranja'], [23, 37, 'comum'], [36.5, 22, 'maca'], [-12, -13.5, 'comum'], [12, -13.5, 'comum'], [-12.6, 13.4, 'laranja'], [12.6, 13.4, 'maca']];
  for (const [x, z, t] of fixas) { const a = arvore(raiz, x, z, t, 0.92 + R() * 0.2); arvores.push(a); col.push({ x, z, r: 0.55 }); }
  // bosque (sudoeste) e cantos
  let tent = 0;
  while (arvores.length < 44 && tent++ < 900) {
    const bos = R() < 0.6, x = bos ? -37 + R() * 14 : -37 + R() * 74, z = bos ? 31 + R() * 7 : (R() < 0.5 ? -37 + R() * 4 : 20 + R() * 17);
    if (Math.abs(x) > 37.5 || Math.abs(z) > 37.5 || !livres(x, z, 1.3)) continue;
    const a = arvore(raiz, x, z, pick(['comum', 'pinho', 'maca', 'laranja', 'comum']), 0.9 + R() * 0.3); arvores.push(a); col.push({ x, z, r: 0.55 });
  }
  for (const a of arvores) if (a.fruta && ctx.semFrutas && ctx.semFrutas.has(arvores.indexOf(a))) { a.tem = false; a.frutas.forEach((f) => (f.visible = false)); }
  // cerca viva + arco da praia + árvores de fundo
  { const pts = []; for (let i = -39; i <= 39; i += 1.5) { pts.push([i, -39.5], [-39.5, i], [39.5, i]); if (Math.abs(i) > 2.8) pts.push([i, 39.5]); }
    const im = new THREE.InstancedMesh(gEsf(1, 9, 7), M('#4fae5c'), pts.length), d = new THREE.Object3D();
    pts.forEach(([x, z], i) => { d.position.set(x, 0.55, z); const s = 0.95 + ((i * 13) % 7) / 20; d.scale.set(s, s * 0.85, s); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); im.castShadow = true; im.receiveShadow = true; raiz.add(im);
    const fora = []; for (let i = 0; i < 70; i++) { const lado = i % 4, k = -46 + R() * 92, o = 43 + R() * 7; fora.push(lado === 0 ? [k, -o] : lado === 1 ? [-o, k] : lado === 2 ? [o, k] : [k, o + 2]); }
    const pts2 = fora.filter(([x, z]) => !(Math.abs(x) < 5 && z > 30));
    const tr = new THREE.InstancedMesh(gCil(0.3, 0.4, 2, 7), M('#9c6b4a'), pts2.length), cp = new THREE.InstancedMesh(copa(), M('#5cbd62'), pts2.length);
    pts2.forEach(([x, z], i) => { const s = 1 + ((i * 7) % 5) / 8; d.scale.setScalar(s); d.position.set(x, 1 * s, z); d.updateMatrix(); tr.setMatrixAt(i, d.matrix); d.position.y = 2.8 * s; d.updateMatrix(); cp.setMatrixAt(i, d.matrix); });
    raiz.add(tr, cp);
  }
  const arco = grupo(estat, 0, 0, 39.3); for (const sx of [-2.3, 2.3]) cil(arco, 0.2, 0.24, 3.4, '#8d5a2b', sx, 1.7, 0, 8);
  malha(gBox(5.6, 1.0, 0.16), MT(texPlaca('Praia', '🏖️', '#fff6e0', '#1f7a80')), 0, 3.6, 0, arco); col.push({ x: -2.3, z: 39.3, r: 0.35 }, { x: 2.3, z: 39.3, r: 0.35 });
  inter.push({ tipo: 'viagem', destino: 'praia', x: 0, z: 39.6, r: 1.7, rotulo: 'Ir à praia', auto: true });
  // flores espalhadas
  for (let i = 0; i < 70; i++) { const x = -37 + R() * 74, z = -37 + R() * 74; if (livres(x, z, 0.4)) pf2.push([x, z]); }
  flores(raiz, pf2);
  // arbustos de enfeite
  for (const [x, z] of [[-19.8, -15.2], [19.8, -15.2], [-19.8, 15.2], [3.4, 24], [-3.4, 24], [18.8, 20.6], [-24, 2.2], [24, 2.2]]) { arbusto(estat, x, z, 0.7 + R() * 0.3); col.push({ x, z, r: 0.6 }); }

  fundir(estat);

  // ---------- borboletas ----------
  const borbs = [];
  const gAsa = new THREE.ShapeGeometry((() => { const s = new THREE.Shape(); s.moveTo(0, 0); s.quadraticCurveTo(0.3, 0.32, 0.26, 0); s.quadraticCurveTo(0.24, -0.22, 0, 0); return s; })());
  for (let i = 0; i < 9; i++) {
    const b = grupo(raiz), m = curvar(new THREE.MeshBasicMaterial({ color: CORES_FLOR[i % CORES_FLOR.length], side: THREE.DoubleSide }));
    const a1 = new THREE.Mesh(gAsa, m), a2 = new THREE.Mesh(gAsa, m); a2.scale.x = -1; a1.rotation.x = a2.rotation.x = -Math.PI / 2; b.add(a1, a2);
    const c = pf2[Math.floor(R() * pf2.length)]; borbs.push({ b, a1, a2, cx: c[0], cz: c[1], f: R() * 10, r: 1.2 + R() * 2 });
  }

  const cx = { t: 0 };
  return {
    id: 'vila', nome: 'Vila dos Gatos', fora: true, raiz, colisores: col, interacoes: inter, arvores, pontes: [ponte],
    limites: { x0: -38.3, x1: 38.3, z0: -38.3, z1: 40.2 },
    aguas: [{ tipo: 'circ', x: LX, z: LZ, r: LR, local: 'lago' }],
    entradas: { inicio: { x: 0, z: 13.5, ry: Math.PI }, praia: { x: 0, z: 36.5, ry: Math.PI }, ...Object.fromEntries(Object.entries(P).map(([k, p]) => [k, { x: p.porta.x, z: p.porta.z + 0.6, ry: 0 }])) },
    npcs: ['pipoca', 'mingau', 'faisca', 'jujuba', 'tofu'],
    chafariz: { x: 0, y: 3.4, z: 0 },
    atualizar(dt, t, c) {
      aguaCh.material.map.offset.set(t * 0.02, t * 0.03); lago.material.map.offset.set(t * 0.012, -t * 0.016);
      for (const f of vivos) f(dt, t, c);
      for (const o of baloes) { o.b.position.y = o.y + Math.sin(t * 1.3 + o.f) * 0.12; o.b.position.x = o.x + Math.sin(t * 0.8 + o.f) * 0.1; o.b.rotation.z = Math.sin(t * 0.8 + o.f) * 0.08; }
      vit.forEach((v, i) => { v.position.y = 0.09 + Math.sin(t * 1.4 + i) * 0.012; v.rotation.y = Math.sin(t * 0.3 + i) * 0.4; });
      for (const o of borbs) { o.f += dt; const a = o.f * 0.7; o.b.position.set(o.cx + Math.cos(a) * o.r + Math.sin(a * 2.3) * 0.5, 0.9 + Math.sin(o.f * 2.1) * 0.35, o.cz + Math.sin(a * 1.3) * o.r); o.b.rotation.y = -a * 1.3;
        const w = Math.sin(o.f * 16) * 0.9; o.a1.rotation.y = w; o.a2.rotation.y = -w; }
    },
    mapa: {
      x0: -40, x1: 40, z0: -40, z1: 40, fundo: '#8fd46a',
      formas: [...faixas.map(([x0, z0, x1, z1]) => ({ t: 'r', x0, z0, x1, z1, c: '#ecd9a8' })), { t: 'c', x: 0, z: 0, r: 12, c: '#f4dcc0' }, { t: 'c', x: 0, z: 0, r: 3, c: '#6fd0e8' }, { t: 'c', x: LX, z: LZ, r: LR, c: '#6fd0e8' },
        ...[['prefeitura', 0, -28.5, 12, 7, '#c9485b'], ['banco', -21, -28.5, 8, 6.5, '#3f7d5c'], ['museu', 21, -28.5, 9, 6.5, '#7b6bb5'], ['roupas', -28, -10.5, 7.6, 6, '#e86a92'], ['cafe', -28, 6.5, 7, 6, '#8b5e3c'],
          ['restaurante', 28, -10.5, 8, 6, '#e2711d'], ['clinica', 28, 6.5, 7, 6, '#56c1c7'], ['armazem', -15, 24, 7.6, 6, '#b5653a'], ['casa', 14, 24, 6.6, 5.6, '#5aa9e6']].map(([id, x, z, w, d, c]) => ({ t: 'p', id, x0: x - w / 2, z0: z - d / 2, x1: x + w / 2, z1: z + d / 2, c, e: LUGARES[id].emoji, n: LUGARES[id].nome })),
        { t: 'e', x: 0, z: 38.5, e: '🏖️' }],
    },
  };
}

// =====================================================================================
//                                        PRAIA
// =====================================================================================
export function construirPraia(ctx) {
  const raiz = new THREE.Group(), col = [], inter = [], arvores = [], estat = grupo(raiz), R = semente(77);
  const ZM = 6;                                  // onde começa o mar
  const grama = new THREE.Mesh(new THREE.PlaneGeometry(220, 60), MT(texGrama())); grama.rotation.x = -Math.PI / 2; grama.position.z = -42; grama.receiveShadow = true; raiz.add(grama);
  const ta = texAreia(); chao(raiz, -110, -13, 110, 9, MT(ta), 0.02, 4);
  chao(raiz, -110, 4.2, 110, 9, curvar(new THREE.MeshLambertMaterial({ color: '#d9c48f', transparent: true, opacity: 0.55 })), 0.035, 4);
  const matMar = curvar(new THREE.MeshLambertMaterial({ map: texAgua('#3fb8d8', '#9be8f5'), transparent: true, opacity: 0.9 })); matMar.map = matMar.map.clone(); matMar.map.repeat.set(40, 30); matMar.map.needsUpdate = true;
  const mar = new THREE.Mesh(new THREE.PlaneGeometry(260, 160), matMar); mar.rotation.x = -Math.PI / 2; mar.position.set(0, 0.06, ZM + 80); raiz.add(mar);
  const espumas = []; for (let i = 0; i < 3; i++) { const e = new THREE.Mesh(new THREE.PlaneGeometry(240, 0.7), curvar(new THREE.MeshBasicMaterial({ color: '#ffffff', transparent: true, opacity: 0.7 }))); e.rotation.x = -Math.PI / 2; e.position.y = 0.075 + i * 0.004; raiz.add(e); espumas.push(e); }
  // caminho e arco de volta
  const cam = MT(texCaminho()); chao(estat, -1.5, -15, 1.5, -9, cam, 0.03);
  const arco = grupo(estat, 0, 0, -13.2); for (const sx of [-2.3, 2.3]) cil(arco, 0.2, 0.24, 3.4, '#8d5a2b', sx, 1.7, 0, 8);
  malha(gBox(5.6, 1.0, 0.16), MT(texPlaca('Vila', '🏡', '#fff6e0', '#2f7d3a')), 0, 3.6, 0, arco); col.push({ x: -2.3, z: -13.2, r: 0.35 }, { x: 2.3, z: -13.2, r: 0.35 });
  inter.push({ tipo: 'viagem', destino: 'vila', entrada: 'praia', x: 0, z: -13.6, r: 1.7, rotulo: 'Voltar à vila', auto: true });
  { const pts = []; for (let i = -40; i <= 40; i += 1.5) if (Math.abs(i) > 2.8) pts.push([i, -13.6]);
    const im = new THREE.InstancedMesh(gEsf(1, 9, 7), M('#4fae5c'), pts.length), d = new THREE.Object3D(); pts.forEach(([x, z], i) => { d.position.set(x, 0.55, z); d.scale.set(1, 0.85, 1); d.updateMatrix(); im.setMatrixAt(i, d.matrix); }); raiz.add(im);
    const n = 26, tr = new THREE.InstancedMesh(gCil(0.3, 0.4, 2, 7), M('#9c6b4a'), n), cp = new THREE.InstancedMesh(copa(), M('#5cbd62'), n);
    for (let i = 0; i < n; i++) { const x = -48 + i * 3.8 + R() * 2, z = -17 - R() * 6, s = 1 + R() * 0.5; d.scale.setScalar(s); d.position.set(x, s, z); d.updateMatrix(); tr.setMatrixAt(i, d.matrix); d.position.y = 2.8 * s; d.updateMatrix(); cp.setMatrixAt(i, d.matrix); } raiz.add(tr, cp); }
  // píer
  const PX = 10, madP = MT(texMadeira());
  malha(gBox(2.6, 0.2, 15), madP, PX, 0.5, 9.5, estat);
  for (let z = 3; z <= 16.5; z += 3.3) for (const sx of [-1.2, 1.2]) cil(estat, 0.13, 0.13, 1.6, '#8d5a2b', PX + sx, 0.3, z, 6);
  malha(gBox(2.6, 0.2, 1.6), madP, PX, 0.26, 1.4, estat).rotation.x = -0.3;
  poste(estat, PX - 1.05, 16.3, null);
  // farol na ilhota
  const il = grupo(estat, -19, 0, 15); pedra(il, 0, 0, 3.6, '#9aa0aa'); pedra(il, 2.2, 1.2, 1.8, '#a8aeb8'); pedra(il, -2.4, 0.6, 1.6, '#8e949e');
  cil(il, 0.95, 1.3, 5.2, '#ffffff', 0, 3.8, 0, 16); for (const y of [2.4, 4.4]) cil(il, 1.16 - (y - 2.4) * 0.065, 1.22 - (y - 2.4) * 0.065, 0.9, '#e63946', 0, y, 0, 16);
  cil(il, 1.25, 1.25, 0.18, '#4a5568', 0, 6.45, 0, 16); malha(gCil(0.7, 0.7, 0.9, 12), LUZ.lampada, 0, 7.0, 0, il); cone(il, 0.95, 0.8, '#e63946', 0, 7.85, 0, 12);
  const facho = new THREE.Sprite(LUZ.brilho); facho.scale.setScalar(7); facho.position.set(-19, 7, 15); raiz.add(facho);
  // barquinho
  const barco = grupo(raiz, 21, 0.1, 13); barco.userData.vivo = true; const bc = malha(gEsf(1, 12, 8), M('#e76f51'), 0, 0.1, 0, barco); bc.scale.set(1.9, 0.6, 0.9); caixa(barco, 2.6, 0.12, 1.2, '#f4f1de', 0, 0.42, 0, 0.05);
  cil(barco, 0.05, 0.05, 2.4, '#8d5a2b', 0, 1.6, 0, 6); const vela = malha(gPrisma(1.5, 1.9, 0.04), M('#ffffff'), 0.05, 0.9, 0, barco); vela.rotation.y = Math.PI / 2;
  // coqueiros
  for (const [x, z] of [[-24, -8], [-14, -10], [-6, -6.5], [6, -10], [17, -7], [25, -9.5], [-27, 0.5], [27, 1]]) { const a = arvore(raiz, x, z, 'palma', 0.95 + R() * 0.2); a.g.rotation.y = R() * 6; arvores.push(a); col.push({ x, z, r: 0.5 }); }
  // guarda-sol, toalha, castelo, pedras, boia
  guardaSol(estat, -10, -3, '#ef476f', col); caixa(estat, 1.3, 0.04, 2.4, '#4cc9f0', -8.3, 0.04, -2.4, 0.02).rotation.y = 0.2; caixa(estat, 1.3, 0.04, 2.4, '#ffd166', -11.9, 0.04, -2.2, 0.02).rotation.y = -0.15;
  const cs = grupo(estat, 3.5, 0, 1.2); cil(cs, 0.7, 0.85, 0.5, '#ecd59a', 0, 0.25, 0, 12); for (const [x, z] of [[-0.5, -0.5], [0.5, -0.5], [-0.5, 0.5], [0.5, 0.5]]) { cil(cs, 0.2, 0.24, 0.8, '#ecd59a', x, 0.4, z, 8); cone(cs, 0.24, 0.3, '#e2c888', x, 0.95, z, 8); }
  cil(cs, 0.02, 0.02, 0.5, '#8d5a2b', 0, 0.75, 0, 4); caixa(cs, 0.3, 0.18, 0.02, '#e63946', 0.16, 0.9, 0); col.push({ x: 3.5, z: 1.2, r: 1.0 });
  inter.push({ tipo: 'placa', x: 3.5, z: 1.2, r: 1.9, rotulo: 'Olhar', texto: 'Um castelo de areia caprichado. Tem até bandeirinha. Melhor não pisar.' });
  for (const [x, z, r] of [[-30, 3.5, 1.4], [-28.4, 4.6, 0.9], [29, 4, 1.3], [16, 3.6, 0.6]]) { pedra(estat, x, z, r, '#a8aeb8'); col.push({ x, z, r: r * 0.8 }); }
  const bo = grupo(raiz, 2, 0.1, 13); bo.userData.vivo = true; malha(gTor(0.5, 0.2, 8, 16), M('#ffffff'), 0, 0.1, 0, bo).rotation.x = Math.PI / 2; for (let i = 0; i < 4; i++) { const s = malha(gTor(0.5, 0.21, 8, 6, 0.5), M('#e63946'), 0, 0.1, 0, bo); s.rotation.set(Math.PI / 2, 0, i * Math.PI / 2); }
  // placa
  const pl = grupo(estat, -4, 0, -9.5); cil(pl, 0.08, 0.08, 1.4, '#8d5a2b', 0, 0.7, 0, 6); malha(gBox(2.4, 0.8, 0.1), MT(texPlaca('Píer →', '🎣', '#fff6e0', '#1f7a80')), 0, 1.6, 0, pl); col.push({ x: -4, z: -9.5, r: 0.3 });
  fundir(estat);
  // caranguejos
  const sir = [];
  for (let i = 0; i < 4; i++) { const g = grupo(raiz, -20 + i * 11 + R() * 3, 0, 2 + R() * 2); const c = malha(gEsf(0.22, 10, 8), M('#ef476f'), 0, 0.16, 0, g); c.scale.set(1.3, 0.7, 1);
    for (const sx of [-1, 1]) { esf(g, 0.09, '#ef476f', sx * 0.3, 0.2, 0.14, 6); cil(g, 0.015, 0.015, 0.12, '#ef476f', sx * 0.09, 0.32, 0.12, 4); esf(g, 0.035, '#222', sx * 0.09, 0.39, 0.12, 5); }
    sir.push({ g, x0: g.position.x, f: R() * 9 }); }
  col.push({ mar: true, z: ZM - 0.5, agua: true });
  return {
    id: 'praia', nome: 'Praia do Farol', fora: true, raiz, colisores: col, interacoes: inter, arvores,
    pontes: [{ ax: PX, az: 2.6, bx: PX, bz: 16.4, larg: 1.05 }], alturaPonte: 0.6,
    limites: { x0: -32, x1: 32, z0: -13.9, z1: 16.4 },
    aguas: [{ tipo: 'mar', z: ZM, local: 'mar' }],
    entradas: { vila: { x: 0, z: -10.5, ry: 0 } },
    npcs: ['capitao', 'marola'], npcPos: { capitao: [7, 0], marola: [-10, -0.5] },
    areia: true,
    atualizar(dt, t) {
      matMar.map.offset.set(t * 0.01, -t * 0.02);
      espumas.forEach((e, i) => { const k = (t * 0.25 + i / 3) % 1; e.position.z = ZM + 1.6 - Math.sin(k * Math.PI) * 2.4 + i * 0.5; e.material.opacity = 0.75 * Math.sin(k * Math.PI); });
      barco.position.y = 0.12 + Math.sin(t * 1.2) * 0.07; barco.rotation.z = Math.sin(t * 0.9) * 0.06; barco.rotation.x = Math.sin(t * 0.7) * 0.04;
      bo.position.y = 0.08 + Math.sin(t * 1.5 + 1) * 0.05; bo.rotation.z = Math.sin(t) * 0.1;
      for (const s of sir) { s.f += dt; s.g.position.x = s.x0 + Math.sin(s.f * 0.5) * 2.2; s.g.position.y = Math.abs(Math.sin(s.f * 9)) * 0.03; }
    },
    mapa: { x0: -34, x1: 34, z0: -34, z1: 34, fundo: '#f6e3b0',
      formas: [{ t: 'r', x0: -34, z0: -34, x1: 34, z1: -13.5, c: '#8fd46a' }, { t: 'r', x0: -34, z0: ZM, x1: 34, z1: 34, c: '#3fb8d8' }, { t: 'r', x0: PX - 1.3, z0: 2, x1: PX + 1.3, z1: 17, c: '#c9945a' }, { t: 'c', x: -19, z: 15, r: 3.4, c: '#9aa0aa' },
        { t: 'e', x: -19, z: 15, e: '🗼' }, { t: 'e', x: 0, z: -13, e: '🏡' }, { t: 'e', x: PX, z: 12, e: '🎣' }] },
  };
}
