// Peças pequenas: chapéus, peixes, relíquias e a vara de pescar.
import { THREE, M, MB, caixa, cil, esf, cone, grupo, malha, gTor, gCil, gEsf, gRBox, curvar } from './nucleo.js';
import { ITENS } from './dados.js';

const ouro = () => M('#f7c948', { emissive: '#8a5a00', emissiveIntensity: 0.35 });

function gEstrela(pontas = 5, R = 0.5, r = 0.22, esp = 0.14) {
  const s = new THREE.Shape();
  for (let i = 0; i < pontas * 2; i++) { const a = (i / (pontas * 2)) * Math.PI * 2 + Math.PI / 2, rr = i % 2 ? r : R; i ? s.lineTo(Math.cos(a) * rr, Math.sin(a) * rr) : s.moveTo(Math.cos(a) * rr, Math.sin(a) * rr); }
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: esp, bevelEnabled: true, bevelSize: 0.03, bevelThickness: 0.03, bevelSegments: 2 }); g.translate(0, 0, -esp / 2); return g;
}
function gRaio() {
  const s = new THREE.Shape(); [[0.05, 0.5], [-0.22, -0.02], [-0.02, -0.02], [-0.12, -0.5], [0.24, 0.1], [0.04, 0.1], [0.2, 0.5]].forEach(([x, y], i) => (i ? s.lineTo(x, y) : s.moveTo(x, y))); s.closePath();
  const g = new THREE.ExtrudeGeometry(s, { depth: 0.08, bevelEnabled: false }); g.translate(0, 0, -0.04); return g;
}

// ---------- chapéus (unidade = raio da cabeça; origem = topo da cabeça) ----------
export function chapeu(id) {
  const g = new THREE.Group();
  switch (id) {
    case 'cartola': cil(g, 0.8, 0.8, 0.07, '#1c1f2e', 0, 0.02, 0, 24); cil(g, 0.5, 0.46, 0.8, '#1c1f2e', 0, 0.44, 0, 24); cil(g, 0.51, 0.49, 0.16, '#c9485b', 0, 0.16, 0, 24); break;
    case 'palha': { const a = cil(g, 1.15, 1.2, 0.06, '#e9c46a', 0, 0.0, 0, 24); a.rotation.x = -0.06; cil(g, 0.5, 0.58, 0.42, '#e9c46a', 0, 0.2, 0, 24); cil(g, 0.59, 0.59, 0.12, '#e76f51', 0, 0.1, 0, 24); break; }
    case 'boina': { const b = esf(g, 0.72, '#b23a48', 0.12, 0.06, 0, 20); b.scale.set(1, 0.38, 1); b.rotation.z = -0.2; cil(g, 0.04, 0.04, 0.16, '#b23a48', 0.12, 0.32, 0, 8); break; }
    case 'gorro': { const b = esf(g, 0.66, '#5fa8d3', 0, -0.12, 0, 20); b.scale.set(1, 1.05, 1); malha(gTor(0.62, 0.13, 10, 24), M('#f4f1de'), 0, -0.02, 0, g).rotation.x = Math.PI / 2; esf(g, 0.2, '#f4f1de', 0, 0.62, 0, 12); break; }
    case 'laco': { const m = M('#ff6b8b'); const a = malha(gEsf(0.3, 12, 10), m, -0.28, 0.14, 0.1, g); a.scale.set(1.1, 0.8, 0.5); const b = malha(gEsf(0.3, 12, 10), m, 0.28, 0.14, 0.1, g); b.scale.set(1.1, 0.8, 0.5); esf(g, 0.14, '#e0486c', 0, 0.14, 0.12, 10); break; }
    case 'oculos': { const m = M('#20232e'); for (const sx of [-1, 1]) malha(gRBox(0.5, 0.34, 0.08, 0.1), m, sx * 0.36, -0.86, 0.98, g); caixa(g, 0.3, 0.07, 0.06, '#20232e', 0, -0.8, 0.98);
      for (const sx of [-1, 1]) { const h = caixa(g, 0.06, 0.06, 0.9, '#20232e', sx * 0.62, -0.8, 0.55); h.rotation.y = sx * 0.25; } break; }
    case 'coroa': { const o = ouro(); cil(g, 0.5, 0.46, 0.3, o, 0, 0.14, 0, 20);
      for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; cone(g, 0.11, 0.3, o, Math.cos(a) * 0.45, 0.42, Math.sin(a) * 0.45, 8); esf(g, 0.07, ['#e63946', '#4cc9f0', '#80ed99'][i % 3], Math.cos(a) * 0.49, 0.16, Math.sin(a) * 0.49, 8); } break; }
    case 'flor_cabelo': { const f = grupo(g, 0.62, -0.02, 0.3); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const p = esf(f, 0.13, '#ffafcc', Math.cos(a) * 0.15, Math.sin(a) * 0.15, 0, 8); p.scale.z = 0.5; } esf(f, 0.09, '#ffd166', 0, 0, 0.05, 8); break; }
    case 'chef': cil(g, 0.5, 0.5, 0.45, '#ffffff', 0, 0.2, 0, 20); for (let i = 0; i < 6; i++) { const a = (i / 6) * Math.PI * 2; esf(g, 0.3, '#ffffff', Math.cos(a) * 0.3, 0.55, Math.sin(a) * 0.3, 10); } esf(g, 0.34, '#ffffff', 0, 0.66, 0, 10); break;
  }
  g.traverse((o) => { if (o.isMesh) o.receiveShadow = false; });
  return g;
}

// ---------- peixes ----------
export function peixe(id) {
  const d = ITENS[id] || {}, g = new THREE.Group(), cor = d.cor || '#9fb7d9', s = (d.tam || 0.6) * 0.7;
  if (id === 'polvo') {
    esf(g, 0.36, cor, 0, 0.1, 0, 14).scale.set(1, 1.15, 1);
    for (let i = 0; i < 7; i++) { const a = (i / 7) * Math.PI * 2; const t = cil(g, 0.07, 0.03, 0.42, cor, Math.cos(a) * 0.24, -0.28, Math.sin(a) * 0.24, 8); t.rotation.z = -Math.cos(a) * 0.5; t.rotation.x = Math.sin(a) * 0.5; }
    for (const sx of [-1, 1]) esf(g, 0.05, '#222', sx * 0.13, 0.14, 0.32, 8);
  } else if (d.tipo === 'peixe') {
    const b = esf(g, 0.4, cor, 0, 0, 0, 16); b.scale.set(d.redondo ? 1 : 1.5, d.redondo ? 0.95 : 0.62, d.redondo ? 0.8 : 0.36);
    const cl = new THREE.Color(cor).multiplyScalar(0.8).getStyle();
    const c = cone(g, 0.26, 0.36, cl, d.redondo ? -0.5 : -0.72, 0, 0, 4); c.rotation.z = -Math.PI / 2; c.scale.z = 0.25;
    const f = cone(g, 0.14, id === 'tubarao' ? 0.4 : 0.2, cl, 0, 0.3, 0, 4); f.scale.z = 0.25;
    for (const sz of [-1, 1]) { esf(g, 0.045, '#1b1b1b', d.redondo ? 0.26 : 0.42, 0.06, sz * (d.redondo ? 0.27 : 0.11), 8); }
    if (id === 'espada') { const e = cone(g, 0.04, 0.6, '#eef2f7', 0.85, 0, 0, 6); e.rotation.z = -Math.PI / 2; }
  } else if (id === 'bota') { caixa(g, 0.3, 0.42, 0.26, '#7a5230', 0, 0.1, 0, 0.08); caixa(g, 0.46, 0.2, 0.26, '#6b4526', 0.1, -0.16, 0, 0.08); }
  else if (id === 'lata') { cil(g, 0.16, 0.14, 0.36, '#b8c4ce', 0, 0, 0, 12).rotation.z = 0.3; }
  else if (id === 'concha') { const c = esf(g, 0.3, '#ffd6e0', 0, 0, 0, 12); c.scale.set(1, 0.42, 0.9); for (let i = -2; i <= 2; i++) { const r = esf(g, 0.3, '#ffb3c6', 0, 0.02, 0, 8); r.scale.set(0.09, 0.44, 0.88); r.rotation.y = i * 0.32; } esf(g, 0.1, '#fff0f3', 0, 0.02, -0.26, 8); }
  else if (id === 'estrela_mar') { malha(gEstrela(5, 0.34, 0.15, 0.1), M('#ff9f45'), 0, 0, 0, g).rotation.x = -Math.PI / 2; }
  else if (id === 'fossil') { cil(g, 0.035, 0.035, 0.7, '#e8e0cf', 0, 0, 0, 8).rotation.z = Math.PI / 2; for (let i = -2; i <= 2; i++) cil(g, 0.025, 0.025, 0.36 - Math.abs(i) * 0.06, '#e8e0cf', i * 0.13, 0, 0, 6); esf(g, 0.11, '#e8e0cf', 0.4, 0, 0, 8); }
  else if (id === 'maca') { esf(g, 0.24, '#e5383b', 0, 0, 0, 12); cil(g, 0.02, 0.02, 0.14, '#6b4226', 0, 0.26, 0, 6); }
  else if (id === 'laranja') { esf(g, 0.24, '#ff9f1c', 0, 0, 0, 12); }
  else if (id === 'coco') { esf(g, 0.27, '#7a5230', 0, 0, 0, 12); }
  else { esf(g, 0.22, '#ffd166', 0, 0, 0, 12); }
  g.scale.setScalar(d.tipo === 'peixe' ? s * 1.5 : 1);
  return g;
}

// ---------- relíquias ----------
export function reliquia(id) {
  const g = new THREE.Group(), o = ouro();
  switch (id) {
    case 'luva_primavera': { const v = M('#6ecb63'), e = M('#3fa34d');
      malha(gRBox(0.42, 0.44, 0.2, 0.09), v, 0, 0, 0, g); malha(gRBox(0.46, 0.16, 0.24, 0.07), e, 0, -0.26, 0, g);
      for (let i = 0; i < 4; i++) cil(g, 0.055, 0.05, 0.3, v, -0.15 + i * 0.1, 0.34 - Math.abs(i - 1.5) * 0.03, 0, 8);
      cil(g, 0.055, 0.05, 0.24, v, 0.26, 0.04, 0, 8).rotation.z = -0.9;
      const f = grupo(g, 0, 0.02, 0.12); for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; esf(f, 0.06, '#ffafcc', Math.cos(a) * 0.08, Math.sin(a) * 0.08, 0, 8); } esf(f, 0.05, '#ffd166', 0, 0, 0.03, 8); break; }
    case 'carambola_raio': { const am = M('#ffd60a', { emissive: '#ffb703', emissiveIntensity: 0.5 });
      for (let i = 0; i < 5; i++) { const a = (i / 5) * Math.PI * 2; const l = malha(gEsf(0.16, 10, 8), am, Math.cos(a) * 0.11, 0, Math.sin(a) * 0.11, g); l.scale.set(1, 2.1, 0.7); l.rotation.y = -a; }
      cil(g, 0.02, 0.02, 0.1, '#588157', 0, 0.36, 0, 6); malha(gRaio(), M('#fff3b0', { emissive: '#ffffff', emissiveIntensity: 0.8 }), 0.3, 0.12, 0, g).scale.setScalar(0.5); break; }
    case 'novelo_tempo': { esf(g, 0.3, '#9d4edd', 0, 0, 0, 16);
      for (let i = 0; i < 5; i++) { const t = malha(gTor(0.3, 0.025, 6, 24), M('#c77dff'), 0, 0, 0, g); t.rotation.set(i * 0.7, i * 1.1, i * 0.4); }
      cil(g, 0.2, 0.2, 0.03, '#fff6e0', 0, 0, 0.29, 20).rotation.x = Math.PI / 2; caixa(g, 0.025, 0.15, 0.02, '#3c096c', 0, 0.06, 0.31); const p = caixa(g, 0.025, 0.1, 0.02, '#3c096c', 0.04, 0, 0.31); p.rotation.z = -1.2; break; }
    case 'capa_nuvem': { const b = M('#ffffff', { emissive: '#bde0fe', emissiveIntensity: 0.35 });
      [[0, 0, 0, 0.26], [-0.26, -0.04, 0, 0.2], [0.26, -0.04, 0, 0.21], [0.1, 0.14, 0, 0.19], [-0.12, 0.12, 0.02, 0.17]].forEach(([x, y, z, r]) => malha(gEsf(r, 12, 10), b, x, y, z, g)); break; }
    case 'sino_fortuna': { cil(g, 0.1, 0.3, 0.38, o, 0, 0, 0, 20); malha(gEsf(0.11, 12, 8), o, 0, 0.2, 0, g); malha(gTor(0.3, 0.035, 8, 24), o, 0, -0.19, 0, g).rotation.x = Math.PI / 2;
      esf(g, 0.07, '#b5651d', 0, -0.24, 0, 8); malha(gTor(0.07, 0.02, 6, 16), M('#e63946'), 0, 0.33, 0, g); break; }
    case 'varinha_bolhas': { cil(g, 0.03, 0.03, 0.6, '#ff8fab', 0, -0.15, 0, 8); malha(gTor(0.16, 0.03, 8, 24), M('#ff8fab'), 0, 0.3, 0, g);
      const bol = new THREE.Mesh(gEsf(0.14, 14, 10), curvar(new THREE.MeshLambertMaterial({ color: '#bde0fe', transparent: true, opacity: 0.6, emissive: '#8ecae6', emissiveIntensity: 0.4 }))); bol.position.set(0, 0.3, 0); g.add(bol); break; }
    case 'coroa_peixes': { const az = M('#48cae4', { emissive: '#0077b6', emissiveIntensity: 0.4 }); cil(g, 0.26, 0.24, 0.16, az, 0, -0.1, 0, 20);
      for (const [x, h] of [[-0.18, 0.3], [0, 0.44], [0.18, 0.3]]) cone(g, 0.07, h, az, x, 0.02 + h / 2, 0, 8);
      esf(g, 0.06, '#f7c948', 0, -0.1, 0.25, 8); break; }
    case 'lanterna_vagalumes': { cil(g, 0.2, 0.2, 0.34, M('#ef476f', { emissive: '#ffd166', emissiveIntensity: 0.55 }), 0, 0, 0, 16).scale.set(1, 1, 1);
      cil(g, 0.13, 0.15, 0.06, '#3a3a3a', 0, 0.2, 0, 12); cil(g, 0.15, 0.13, 0.06, '#3a3a3a', 0, -0.2, 0, 12); malha(gTor(0.08, 0.015, 6, 16, Math.PI), M('#3a3a3a'), 0, 0.23, 0, g);
      esf(g, 0.05, M('#fffb9e', { emissive: '#fffb9e', emissiveIntensity: 1 }), 0.27, 0.1, 0.05, 8); esf(g, 0.04, M('#fffb9e', { emissive: '#fffb9e', emissiveIntensity: 1 }), -0.25, -0.05, 0.1, 8); break; }
    case 'flauta_vento': { const f = cil(g, 0.045, 0.045, 0.7, '#d4a373', 0, 0, 0, 10); f.rotation.z = Math.PI / 2 - 0.3;
      for (let i = 0; i < 4; i++) esf(g, 0.022, '#6b4226', -0.2 + i * 0.12, 0.045 - (-0.2 + i * 0.12) * 0.3 + 0.03, 0.03, 6);
      const s = malha(gTor(0.2, 0.02, 6, 20, Math.PI * 1.4), M('#caf0f8', { emissive: '#caf0f8', emissiveIntensity: 0.6 }), 0.32, 0.22, 0, g); s.rotation.z = 0.6; break; }
    case 'disco_dourado': { const d = cil(g, 0.32, 0.32, 0.03, o, 0, 0, 0, 28); d.rotation.x = Math.PI / 2; cil(g, 0.1, 0.1, 0.04, '#e63946', 0, 0, 0, 16).rotation.x = Math.PI / 2; cil(g, 0.02, 0.02, 0.05, '#222', 0, 0, 0, 8).rotation.x = Math.PI / 2;
      malha(gTor(0.2, 0.008, 4, 24), M('#c99700'), 0, 0, 0.018, g); malha(gTor(0.26, 0.008, 4, 24), M('#c99700'), 0, 0, 0.018, g); break; }
    case 'biscoito_gigante': { const b = cil(g, 0.32, 0.3, 0.1, '#d9a066', 0, 0, 0, 20); b.rotation.x = Math.PI / 2;
      [[0.1, 0.12], [-0.14, 0.05], [0.02, -0.14], [-0.08, -0.2], [0.17, -0.08], [-0.02, 0.2]].forEach(([x, y]) => esf(g, 0.045, '#5a3418', x, y, 0.05, 6)); break; }
    case 'estrela_bolso': malha(gEstrela(5, 0.34, 0.15, 0.12), M('#ffe66d', { emissive: '#ffd60a', emissiveIntensity: 0.9 }), 0, 0, 0, g); break;
  }
  g.traverse((x) => { if (x.isMesh) x.receiveShadow = false; });
  return g;
}

// modelo 3D de qualquer item (para mostrar acima da cabeça, no museu, etc.)
export function modeloItem(id) {
  const d = ITENS[id]; if (!d) return new THREE.Group();
  if (d.tipo === 'reliquia') return reliquia(id);
  if (d.tipo === 'chapeu') { const g = new THREE.Group(); const c = chapeu(id); c.scale.setScalar(0.42); c.position.y = id === 'oculos' ? 0.35 : -0.1; if (id === 'oculos') c.position.z = -0.4; g.add(c); return g; }
  if (id === 'vara') return vara();
  if (d.tipo === 'comida' || d.tipo === 'semente' || d.tipo === 'isca') { const g = new THREE.Group(); esf(g, 0.2, d.tipo === 'semente' ? '#80b918' : d.tipo === 'isca' ? '#e5989b' : '#ffcb77', 0, 0, 0, 12); return g; }
  return peixe(id);
}

export function vara() {
  const g = new THREE.Group();
  const h = cil(g, 0.035, 0.05, 0.5, '#8d5a2b', 0, 0.25, 0, 8); h.castShadow = false;
  cil(g, 0.012, 0.03, 1.9, '#e9c46a', 0, 1.45, 0, 8).castShadow = false;
  cil(g, 0.07, 0.07, 0.06, '#e63946', 0.06, 0.5, 0, 12).rotation.z = Math.PI / 2;
  return g;      // ponta em y = 2.4
}
export const PONTA_VARA = 2.4;

export function boia() {
  const g = new THREE.Group();
  const a = malha(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), MB('#e63946'), 0, 0, 0, g); a.castShadow = false;
  const b = malha(new THREE.SphereGeometry(0.13, 12, 8, 0, Math.PI * 2, Math.PI / 2, Math.PI / 2), MB('#ffffff'), 0, 0, 0, g); b.castShadow = false;
  cil(g, 0.012, 0.012, 0.16, '#222', 0, 0.18, 0, 6).castShadow = false;
  return g;
}
