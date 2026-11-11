// Interiores: cada cômodo é montado sozinho quando o jogador entra (e jogado fora quando sai).
import { THREE, M, MT, MB, curvar, malha, caixa, cil, esf, cone, grupo, fundir, gPrisma, gBox, gRBox, gCil, gEsf, gTor, gDisco, gPlano,
  texMadeira, texXadrez, texListras, texPlaca, texEmoji, textura, rnd, pick } from './nucleo.js';
import { LUZ } from './mundo.js';
import { chapeu, peixe, modeloItem } from './pecas.js';
import { ITENS, RELIQUIAS, LUGARES } from './dados.js';

const CFG = {
  prefeitura: { W: 15, D: 10, parede: '#f9e3c2', rodape: '#c9485b', piso: () => texXadrez('#f6ead4', '#e9d5b0', 8), fundo: '#f2dcc0' },
  banco: { W: 13, D: 9, parede: '#d5eadc', rodape: '#3f7d5c', piso: () => texXadrez('#eef5ee', '#cfe3d4', 8), fundo: '#cfe5d6' },
  museu: { W: 17, D: 11, parede: '#e6e0f3', rodape: '#7b6bb5', piso: () => texXadrez('#f4f0fa', '#ddd5ee', 10), fundo: '#ddd6ee' },
  roupas: { W: 13, D: 9, parede: '#ffe0ea', rodape: '#e86a92', piso: () => texMadeira('#f0d2b0', '#e6c49c'), fundo: '#fbd5e1' },
  restaurante: { W: 14, D: 10, parede: '#fff0c8', rodape: '#e2711d', piso: () => texXadrez('#fff8e7', '#f7d9a8', 8), fundo: '#fbe6b8' },
  clinica: { W: 12, D: 9, parede: '#eefaff', rodape: '#56c1c7', piso: () => texXadrez('#ffffff', '#d7f0f2', 8), fundo: '#dff3f5' },
  armazem: { W: 13, D: 9, parede: '#f3d8b0', rodape: '#b5653a', piso: () => texMadeira('#d8ab78', '#c99a66'), fundo: '#ecd0a6' },
  cafe: { W: 12, D: 9, parede: '#f2e2cf', rodape: '#8b5e3c', piso: () => texMadeira('#c99a6e', '#b98859'), fundo: '#ead7c0' },
  casa: { W: 11, D: 8.5, parede: '#e2f3e5', rodape: '#5aa9e6', piso: () => texMadeira('#e3c08f', '#d6b07d'), fundo: '#d5ecd9' },
};

// ---------- móveis ----------
function balcao(g, col, x, z, w, cor, tampo = '#fff6e0') {
  caixa(g, w, 1.0, 0.95, cor, x, 0.5, z, 0.1); caixa(g, w + 0.2, 0.14, 1.15, tampo, x, 1.05, z, 0.05);
  col.push({ x0: x - w / 2 - 0.1, x1: x + w / 2 + 0.1, z0: z - 0.6, z1: z + 0.6 });
}
function estante(g, col, x, z, w, h, cores, ry = 0, fundoCor = '#b5764a') {
  const e = grupo(g, x, 0, z, ry); caixa(e, w, h, 0.6, fundoCor, 0, h / 2, 0, 0.05);
  const n = Math.max(2, Math.round(h / 0.75));
  for (let i = 0; i < n; i++) { const y = 0.25 + i * ((h - 0.3) / n); caixa(e, w - 0.15, 0.06, 0.62, '#e8c9a0', 0, y, 0.04);
    let px = -w / 2 + 0.25; while (px < w / 2 - 0.25) { const lw = 0.14 + ((px * 7 + i * 3) % 3 + 3) % 3 * 0.07, lh = 0.36 + (((px * 13 + i) % 4) + 4) % 4 * 0.06; caixa(e, lw, lh, 0.34, cores[Math.abs(Math.round(px * 9 + i * 5)) % cores.length], px + lw / 2, y + 0.03 + lh / 2, 0.14, 0.02); px += lw + 0.035; } }
  const horiz = Math.abs(Math.sin(ry)) < 0.5;
  col.push(horiz ? { x0: x - w / 2, x1: x + w / 2, z0: z - 0.4, z1: z + 0.4 } : { x0: x - 0.4, x1: x + 0.4, z0: z - w / 2, z1: z + w / 2 });
  return e;
}
function mesa(g, col, x, z, r = 0.8, cor = '#fff6e0', toalha) {
  cil(g, r, r, 0.09, cor, x, 0.82, z, 20); cil(g, 0.09, 0.14, 0.8, '#8d5a2b', x, 0.4, z, 8); cil(g, 0.4, 0.45, 0.06, '#8d5a2b', x, 0.03, z, 12);
  if (toalha) cil(g, r * 0.6, r * 0.6, 0.02, toalha, x, 0.875, z, 16);
  col.push({ x, z, r: r + 0.1 });
}
function banqueta(g, x, z, cor = '#e76f51') { cil(g, 0.32, 0.32, 0.12, cor, x, 0.55, z, 14); cil(g, 0.05, 0.05, 0.5, '#6b6b76', x, 0.27, z, 6); cil(g, 0.24, 0.26, 0.05, '#6b6b76', x, 0.03, z, 10); }
function planta(g, col, x, z, s = 1) { const p = grupo(g, x, 0, z); p.scale.setScalar(s); cil(p, 0.34, 0.26, 0.55, '#e07a5f', 0, 0.28, 0, 12); for (const [a, b, c, r] of [[0, 1.0, 0, 0.42], [0.28, 0.8, 0.1, 0.3], [-0.26, 0.85, -0.05, 0.32], [0.05, 1.35, 0, 0.28]]) esf(p, r, '#57b560', a, b, c, 10); if (col) col.push({ x, z, r: 0.4 * s }); }
function tapete(g, x, z, w, d, cor, cor2) { caixa(g, w, 0.04, d, cor, x, 0.03, z, 0.02).castShadow = false; if (cor2) caixa(g, w - 0.6, 0.045, d - 0.6, cor2, x, 0.035, z, 0.02).castShadow = false; }
function tapeteRedondo(g, x, z, r, cor, cor2) { cil(g, r, r, 0.04, cor, x, 0.03, z, 28).castShadow = false; if (cor2) cil(g, r * 0.7, r * 0.7, 0.045, cor2, x, 0.035, z, 28).castShadow = false; }
function quadro(g, x, y, z, w, h, semente = 1, moldura = '#b5764a') {
  caixa(g, w + 0.2, h + 0.2, 0.1, moldura, x, y, z, 0.03);
  const t = textura(128, 128, (c) => { const cs = ['#ff8fab', '#ffd166', '#4cc9f0', '#80ed99', '#c77dff', '#fff6e0', '#ff9f1c']; c.fillStyle = cs[semente % cs.length]; c.fillRect(0, 0, 128, 128);
    let s = semente * 9301 + 49297; const r = () => ((s = (s * 9301 + 49297) % 233280) / 233280);
    for (let i = 0; i < 7; i++) { c.fillStyle = cs[Math.floor(r() * cs.length)]; c.beginPath(); c.arc(r() * 128, r() * 128, 10 + r() * 34, 0, 7); c.fill(); } });
  malha(gPlano(1, 1), MT(t), x, y, z + 0.06, g).scale.set(w, h, 1);
}
function janela(g, x, y, z, w = 1.8, h = 1.5) {
  caixa(g, w + 0.25, h + 0.25, 0.12, '#fff6e0', x, y, z, 0.05);
  malha(gPlano(1, 1), curvar(new THREE.MeshBasicMaterial({ color: '#bfe9ff' })), x, y, z + 0.07, g).scale.set(w, h, 1);
  caixa(g, w, 0.07, 0.04, '#fff6e0', x, y, z + 0.09); caixa(g, 0.07, h, 0.04, '#fff6e0', x, y, z + 0.09);
  for (const sx of [-1, 1]) caixa(g, 0.35, h + 0.3, 0.08, '#ffd6a5', x + sx * (w / 2 + 0.05), y, z + 0.12, 0.04);
}
function luminaria() { /* a câmera olha de cima: luminária pendurada taparia a vista */ }
function pedestal(g, col, x, z, alt = 0.9) { caixa(g, 0.8, alt, 0.8, '#fffaf0', x, alt / 2, z, 0.06); caixa(g, 0.9, 0.1, 0.9, '#e9c46a', x, alt, z, 0.03); col.push({ x, z, r: 0.5 }); }
function cadeira(g, x, z, ry, cor = '#e9c46a') { const c = grupo(g, x, 0, z, ry); caixa(c, 0.6, 0.1, 0.6, cor, 0, 0.5, 0, 0.04); caixa(c, 0.6, 0.7, 0.1, cor, 0, 0.9, -0.26, 0.04); for (const [a, b] of [[-0.24, -0.24], [0.24, -0.24], [-0.24, 0.24], [0.24, 0.24]]) cil(c, 0.04, 0.04, 0.5, '#8d5a2b', a, 0.25, b, 6); }
function sofa(g, col, x, z, w, cor, ry = 0) { const s = grupo(g, x, 0, z, ry); caixa(s, w, 0.5, 0.9, cor, 0, 0.35, 0, 0.14); caixa(s, w, 0.8, 0.3, cor, 0, 0.75, -0.35, 0.12); for (const sx of [-1, 1]) caixa(s, 0.3, 0.7, 0.9, cor, sx * (w / 2 - 0.1), 0.5, 0, 0.12);
  const h = Math.abs(Math.sin(ry)) < 0.5; col.push(h ? { x0: x - w / 2, x1: x + w / 2, z0: z - 0.5, z1: z + 0.5 } : { x0: x - 0.5, x1: x + 0.5, z0: z - w / 2, z1: z + w / 2 }); }

export function construirInterior(id, ctx) {
  const c = CFG[id], { W, D } = c, H = 4.4, raiz = new THREE.Group(), g = grupo(raiz), col = [], inter = [], vivos = [], npcs = [];
  // piso, paredes, rodapé
  const tp = c.piso().clone(); tp.wrapS = tp.wrapT = THREE.RepeatWrapping; tp.repeat.set(W / 4, D / 4); tp.needsUpdate = true;
  const piso = new THREE.Mesh(new THREE.PlaneGeometry(W, D), MT(tp)); piso.rotation.x = -Math.PI / 2; piso.receiveShadow = true; raiz.add(piso);
  caixa(g, W + 0.6, H, 0.3, c.parede, 0, H / 2, -D / 2 - 0.15); caixa(g, 0.3, H, D, c.parede, -W / 2 - 0.15, H / 2, 0); caixa(g, 0.3, H, D, c.parede, W / 2 + 0.15, H / 2, 0);
  caixa(g, W, 0.35, 0.1, c.rodape, 0, 0.18, -D / 2 + 0.05); caixa(g, 0.1, 0.35, D, c.rodape, -W / 2 + 0.05, 0.18, 0); caixa(g, 0.1, 0.35, D, c.rodape, W / 2 - 0.05, 0.18, 0);
  caixa(g, W, 0.14, 0.1, c.rodape, 0, H - 0.5, -D / 2 + 0.05);
  // beirada da frente e capacho de saída
  caixa(g, W + 0.6, 0.3, 0.3, c.rodape, 0, -0.16, D / 2 + 0.15);
  caixa(g, 2.2, 0.05, 1.1, '#c9485b', 0, 0.03, D / 2 - 0.6, 0.02).castShadow = false; caixa(g, 1.8, 0.055, 0.7, '#f4a9a8', 0, 0.035, D / 2 - 0.6, 0.02).castShadow = false;
  inter.push({ tipo: 'viagem', destino: 'vila', entrada: id, x: 0, z: D / 2 - 0.25, r: 0.9, rotulo: 'Sair', auto: true });
  const zF = -D / 2 + 0.06;        // encostado na parede do fundo
  const dono = LUGARES[id].dono;

  switch (id) {
    case 'prefeitura': {
      balcao(g, col, 0, -2.2, 5, '#c9485b'); npcs.push({ id: dono, x: 0, z: -3.4, ry: 0 });
      caixa(g, 0.5, 0.36, 0.3, '#f7c948', -1.6, 1.3, -2.2, 0.05); esf(g, 0.12, '#f7c948', 1.5, 1.24, -2.1, 10); cil(g, 0.14, 0.16, 0.06, '#8d5a2b', 1.5, 1.15, -2.1, 10);
      janela(g, -5, 2.5, zF); janela(g, 5, 2.5, zF);
      malha(gBox(3.2, 1.9, 0.08), MT(textura(256, 152, (x) => { x.fillStyle = '#fff6e0'; x.fillRect(0, 0, 256, 152); x.fillStyle = '#8fd46a'; x.fillRect(10, 10, 236, 132); x.fillStyle = '#f4dcc0'; x.beginPath(); x.arc(128, 76, 32, 0, 7); x.fill(); x.fillStyle = '#6fd0e8'; x.beginPath(); x.arc(128, 76, 8, 0, 7); x.fill(); x.beginPath(); x.arc(212, 118, 16, 0, 7); x.fill();
        x.fillStyle = '#c9485b'; x.fillRect(112, 14, 32, 16); x.fillStyle = '#e86a92'; x.fillRect(22, 40, 20, 16); x.fillStyle = '#e2711d'; x.fillRect(214, 40, 20, 16); })), 0, 2.8, zF + 0.02, g);
      for (const sx of [-1, 1]) { cil(g, 0.06, 0.06, 3, '#e9c46a', sx * 3.4, 1.5, -4.2, 6); const b = caixa(g, 0.9, 1.3, 0.05, sx < 0 ? '#ffca3a' : '#c9485b', sx * 3.4 + 0.5, 2.3, -4.2); cil(g, 0.3, 0.34, 0.1, '#e9c46a', sx * 3.4, 0.05, -4.2, 10); col.push({ x: sx * 3.4, z: -4.2, r: 0.4 }); }
      tapete(g, 0, 1.2, 3, 5.6, '#c9485b', '#e98a98'); planta(g, col, -6.4, -4.0, 1.2); planta(g, col, 6.4, -4.0, 1.2);
      sofa(g, col, -6.3, 1.2, 3, '#e9c46a', Math.PI / 2); sofa(g, col, 6.3, 1.2, 3, '#e9c46a', -Math.PI / 2);
      luminaria(g, -3.5, 0); luminaria(g, 3.5, 0);
      inter.push({ tipo: 'placa', x: 0, z: -4.6, r: 0, rotulo: '' });
      break;
    }
    case 'banco': {
      balcao(g, col, 0, -1.8, 6, '#3f7d5c'); npcs.push({ id: dono, x: 0, z: -3.0, ry: 0 });
      for (const sx of [-2.9, 2.9]) { caixa(g, 0.1, 1.3, 0.9, '#fff6e0', sx, 1.7, -1.8, 0.03); } caixa(g, 5.9, 0.1, 0.1, '#e9c46a', 0, 2.35, -1.4);
      // cofre
      const cf = grupo(g, 4.2, 0, zF + 0.1); cil(cf, 1.3, 1.3, 0.3, '#9aa5b1', 0, 1.7, 0, 28).rotation.x = Math.PI / 2; cil(cf, 1.05, 1.05, 0.36, '#c5ced8', 0, 1.7, 0.02, 28).rotation.x = Math.PI / 2;
      const vol = grupo(cf, 0, 1.7, 0.24); vol.userData.vivo = true; malha(gTor(0.4, 0.06, 8, 20), M('#5c6773'), 0, 0, 0, vol); for (let i = 0; i < 3; i++) { const r = caixa(vol, 0.84, 0.07, 0.07, '#5c6773', 0, 0, 0); r.rotation.z = i * Math.PI / 3; } vivos.push((dt, t) => { vol.rotation.z = Math.sin(t * 0.5) * 1.5; });
      janela(g, -4.2, 2.5, zF);
      // pilhas de moedas e sacos
      for (const [x, z, n] of [[-5.6, -3.6, 5], [-5.0, -3.9, 3], [-5.9, -3.0, 2]]) for (let i = 0; i < n; i++) cil(g, 0.28, 0.28, 0.1, M('#f7c948', { emissive: '#8a5a00', emissiveIntensity: 0.3 }), x, 0.06 + i * 0.11, z, 14);
      const sc = esf(g, 0.5, '#d9c2a3', -4.6, 0.42, -3.2, 12); sc.scale.y = 0.9; cil(g, 0.16, 0.26, 0.26, '#d9c2a3', -4.6, 0.92, -3.2, 10); col.push({ x: -5.2, z: -3.4, r: 1.1 });
      tapete(g, 0, 1.4, 2.6, 4.4, '#3f7d5c', '#7fb69a'); planta(g, col, 5.6, 2.4, 1.1); planta(g, col, -5.6, 2.4, 1.1);
      for (const sx of [-1, 1]) { cil(g, 0.07, 0.07, 1.0, '#e9c46a', sx * 1.9, 0.5, 0.2, 8); cil(g, 0.22, 0.24, 0.06, '#e9c46a', sx * 1.9, 0.03, 0.2, 10); esf(g, 0.11, '#e9c46a', sx * 1.9, 1.05, 0.2, 8); col.push({ x: sx * 1.9, z: 0.2, r: 0.25 }); }
      luminaria(g, 0, 0.5);
      break;
    }
    case 'museu': {
      npcs.push({ id: dono, x: 3.4, z: 1.6, ry: -0.4 });
      const doados = new Set(ctx.estado.museu || []);
      const expor = (itemId, x, z, vidro) => {
        pedestal(g, col, x, z);
        if (doados.has(itemId)) {
          const m = modeloItem(itemId); m.position.set(x, 1.5, z); m.userData.vivo = true; m.scale.multiplyScalar(ITENS[itemId].tipo === 'peixe' ? 0.7 : 1.05); raiz.add(m);
          vivos.push((dt, t) => { m.rotation.y = t * 0.7 + x; m.position.y = 1.5 + Math.sin(t * 1.6 + x) * 0.06; });
          if (vidro) { const v = new THREE.Mesh(gBox(0.78, 0.9, 0.78), curvar(new THREE.MeshLambertMaterial({ color: '#bfe9ff', transparent: true, opacity: 0.28, depthWrite: false }))); v.position.set(x, 1.5, z); raiz.add(v); }
          inter.push({ tipo: 'placa', x, z: z + 0.5, r: 1.15, rotulo: 'Ver', texto: `${ITENS[itemId].icone} ${ITENS[itemId].nome} — ${ITENS[itemId].desc}`, prio: -1 });
        } else {
          const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: texEmoji('?', 64), color: '#b8a9d9' })); s.scale.setScalar(0.5); s.position.set(x, 1.4, z); raiz.add(s);
          inter.push({ tipo: 'placa', x, z: z + 0.5, r: 1.15, rotulo: 'Ver', texto: 'Um pedestal vazio. A plaquinha diz: "' + (ITENS[itemId].tipo === 'reliquia' ? 'Relíquia lendária ainda não encontrada' : 'Espécie ainda não doada') + '".', prio: -1 });
        }
      };
      Object.keys(RELIQUIAS).forEach((r, i) => expor(r, -7.15 + i * 1.3, -4.2, false));
      const peixes = ['lambari', 'tilapia', 'bagre', 'carpa', 'pirarucu', 'sardinha', 'baiacu', 'polvo', 'espada', 'tubarao'];
      peixes.forEach((p, i) => expor(p, (i < 5 ? -1 : 1) * (2.4 + (i % 5) * 1.25), -0.9, true));
      ['concha', 'estrela_mar', 'fossil'].forEach((p, i) => expor(p, -7.2, 1.2 + i * 1.3, false));
      caixa(g, 16.6, 0.5, 0.06, '#7b6bb5', 0, 3.55, zF + 0.02); malha(gBox(5, 0.7, 0.08), MT(texPlaca('Relíquias lendárias', '✨', '#fff6e0', '#4a3d85')), 0, 3.55, zF + 0.06, g);
      tapete(g, 0, 2.8, 3, 4.6, '#7b6bb5', '#b3a7dd'); planta(g, col, 7.6, 4.2, 1.2); sofa(g, col, 6.0, 2.2, 2.6, '#b3a7dd', 0);
      luminaria(g, -4, 1); luminaria(g, 4, 1);
      break;
    }
    case 'roupas': {
      balcao(g, col, 3.6, -2.0, 3.4, '#e86a92'); npcs.push({ id: dono, x: 3.6, z: -3.2, ry: 0 });
      caixa(g, 0.6, 0.42, 0.4, '#fff6e0', 4.7, 1.33, -2.0, 0.05);
      // prateleira de chapéus
      const ids = ['cartola', 'palha', 'boina', 'gorro', 'coroa'];
      caixa(g, 6.4, 0.12, 0.7, '#fff6e0', -2.6, 2.3, zF + 0.4, 0.04); caixa(g, 6.4, 0.12, 0.7, '#fff6e0', -2.6, 1.1, zF + 0.4, 0.04); col.push({ x0: -5.9, x1: 0.7, z0: -4.6, z1: -3.5 });
      ids.forEach((h, i) => { const x = -5.2 + i * 1.3; esf(g, 0.3, '#f4e4d4', x, 1.5, zF + 0.4, 12); const ch = chapeu(h); ch.scale.setScalar(0.3); ch.position.set(x, 1.78, zF + 0.4); g.add(ch); });
      ['laco', 'oculos', 'flor_cabelo'].forEach((h, i) => { const x = -4.6 + i * 1.9; esf(g, 0.3, '#f4e4d4', x, 2.7, zF + 0.4, 12); const ch = chapeu(h); ch.scale.setScalar(0.3); ch.position.set(x, 2.98, zF + 0.4); g.add(ch); });
      // arara de roupas
      for (const ax of [-3.6, 0.2]) { const a = grupo(g, ax, 0, 0.6); cil(a, 0.04, 0.04, 2.6, '#aaa', 0, 1.8, 0, 6).rotation.z = Math.PI / 2; for (const sx of [-1.3, 1.3]) { cil(a, 0.04, 0.04, 1.8, '#aaa', sx, 0.9, 0, 6); cil(a, 0.25, 0.25, 0.05, '#aaa', sx, 0.03, 0, 8); }
        ['#4cc9f0', '#ffca3a', '#ff6b8b', '#80ed99', '#c77dff', '#ff9f1c'].forEach((cc, i) => { const r = caixa(a, 0.1, 0.8, 0.62, cc, -1.0 + i * 0.4, 1.3, 0, 0.04); r.rotation.y = 0.15; }); col.push({ x0: ax - 1.5, x1: ax + 1.5, z0: 0.2, z1: 1.0 }); }
      // espelho e provador
      caixa(g, 1.3, 2.4, 0.1, '#e9c46a', 5.6, 1.5, zF + 0.05, 0.1); malha(gPlano(1.05, 2.15), curvar(new THREE.MeshBasicMaterial({ color: '#d8f3ff' })), 5.6, 1.5, zF + 0.12, g);
      tapeteRedondo(g, 0, 2.6, 1.5, '#e86a92', '#ffc2d4'); planta(g, col, 5.8, 3.3); janela(g, 2.3, 2.9, zF, 1.5, 1.2); luminaria(g, -2, 1); luminaria(g, 3, 1);
      break;
    }
    case 'restaurante': {
      balcao(g, col, -3.2, -2.2, 5.2, '#e2711d'); npcs.push({ id: dono, x: -3.2, z: -3.4, ry: 0 });
      // cozinha ao fundo
      caixa(g, 2.2, 1.0, 0.9, '#d0d5db', -5.2, 0.5, zF + 0.5, 0.05); for (const sx of [-0.5, 0.5]) cil(g, 0.3, 0.3, 0.04, '#333', -5.2 + sx, 1.02, zF + 0.5, 12);
      const pan = grupo(g, -5.7, 1.05, zF + 0.5); cil(pan, 0.3, 0.26, 0.3, '#777f8a', 0, 0.15, 0, 14); ctx.vapor = { x: -5.7, y: 1.5, z: zF + 0.5 };
      caixa(g, 1.4, 2.6, 0.8, '#e8ecef', -2.8, 1.3, zF + 0.45, 0.08); caixa(g, 0.06, 0.8, 0.06, '#9aa5b1', -2.3, 1.7, zF + 0.9);
      // pratos no balcão
      for (const [x, cc] of [[-4.6, '#ff8fab'], [-3.2, '#ffd166'], [-1.8, '#80ed99']]) { cil(g, 0.32, 0.26, 0.05, '#ffffff', x, 1.15, -2.0, 14); esf(g, 0.16, cc, x, 1.26, -2.0, 8).scale.y = 0.6; }
      // mesas
      for (const [x, z] of [[2.6, -2.6], [5.0, 0.2], [1.8, 1.4], [-4.6, 1.6]]) { mesa(g, col, x, z, 0.85, '#fff6e0', '#e2711d'); banqueta(g, x - 1.25, z, '#e9c46a'); banqueta(g, x + 1.25, z, '#e9c46a'); cil(g, 0.05, 0.07, 0.2, '#80ed99', x, 0.98, z, 8); esf(g, 0.1, '#ff6b8b', x, 1.14, z, 6); }
      janela(g, 3.6, 2.6, zF); quadro(g, 0.6, 2.8, zF, 1.2, 0.9, 3); quadro(g, 6.0, 2.8, zF, 0.9, 1.1, 5);
      malha(gBox(2.6, 1.2, 0.08), MT(textura(256, 128, (x) => { x.fillStyle = '#2f3b33'; x.fillRect(0, 0, 256, 128); x.fillStyle = '#fff6e0'; x.font = '900 22px system-ui'; x.fillText('CARDÁPIO', 70, 30); x.font = '16px system-ui'; ['Sushi do Chef .... 120', 'Sopa quentinha .... 90', 'Bolo da sorte .... 150'].forEach((t, i) => x.fillText(t, 22, 60 + i * 24)); })), -5.6, 3.1, zF + 0.02, g);
      luminaria(g, 2.6, -2.6); luminaria(g, 5.0, 0.2); luminaria(g, -4.6, 1.6); planta(g, col, 6.2, 3.8); tapete(g, 0, 3.4, 2.6, 2.6, '#e2711d', '#f2b27a');
      break;
    }
    case 'clinica': {
      balcao(g, col, -2.6, -1.8, 3.6, '#56c1c7'); npcs.push({ id: dono, x: -2.6, z: -3.0, ry: 0 });
      caixa(g, 0.5, 0.3, 0.36, '#ffffff', -1.6, 1.27, -1.8, 0.05); cil(g, 0.08, 0.08, 0.28, '#ff8fab', -3.6, 1.26, -1.8, 8);
      // maca
      const mc = grupo(g, 3.4, 0, -2.6); caixa(mc, 1.3, 0.2, 2.6, '#ffffff', 0, 0.8, 0, 0.08); caixa(mc, 1.1, 0.16, 0.6, '#bde0fe', 0, 0.95, -0.9, 0.08); for (const [a, b] of [[-0.55, -1.1], [0.55, -1.1], [-0.55, 1.1], [0.55, 1.1]]) cil(mc, 0.05, 0.05, 0.75, '#9aa5b1', a, 0.38, b, 6); col.push({ x0: 2.7, x1: 4.1, z0: -4.0, z1: -1.2 });
      inter.push({ tipo: 'placa', x: 3.4, z: -1.0, r: 1.3, rotulo: 'Olhar', texto: 'Uma maca fofinha. Tem cheiro de lavanda e de biscoito de consulta.', prio: -1 });
      // armário de remédios
      estante(g, col, 5.2, 1.0, 2.4, 2.4, ['#ff8fab', '#bde0fe', '#fdffb6', '#caffbf', '#ffffff'], -Math.PI / 2, '#ffffff');
      // balança e cartaz
      caixa(g, 0.7, 0.1, 0.7, '#9aa5b1', 1.0, 0.05, -3.6, 0.03); cil(g, 0.04, 0.04, 1.4, '#9aa5b1', 1.0, 0.7, -3.9, 6); cil(g, 0.22, 0.22, 0.06, '#ffffff', 1.0, 1.45, -3.86, 14).rotation.x = Math.PI / 2;
      malha(gBox(1.3, 1.7, 0.06), MT(textura(128, 168, (x) => { x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 168); x.fillStyle = '#333'; x.font = '900 40px system-ui'; x.textAlign = 'center'; ['M', 'I A', 'U M I', 'a u m i a u'].forEach((t, i) => { x.font = `900 ${40 - i * 9}px system-ui`; x.fillText(t, 64, 44 + i * 36); }); })), -0.2, 2.7, zF + 0.02, g);
      janela(g, -4.2, 2.6, zF, 1.6, 1.3); const cz = grupo(g, 3.4, 3.0, zF + 0.04); caixa(cz, 1.0, 0.32, 0.08, '#56c1c7', 0, 0, 0, 0.04); caixa(cz, 0.32, 1.0, 0.08, '#56c1c7', 0, 0, 0, 0.04);
      for (const x of [-4.8, -3.6]) cadeira(g, x, 2.2, Math.PI, '#bde0fe'); col.push({ x0: -5.2, x1: -3.2, z0: 1.9, z1: 2.6 });
      tapeteRedondo(g, 0, 2.4, 1.4, '#56c1c7', '#bfe9ec'); planta(g, col, -5.2, -3.9); luminaria(g, 0, 0);
      break;
    }
    case 'armazem': {
      balcao(g, col, 2.8, -1.9, 4.4, '#b5653a'); npcs.push({ id: dono, x: 2.8, z: -3.1, ry: 0 });
      caixa(g, 0.7, 0.5, 0.5, '#4a5568', 4.3, 1.37, -1.9, 0.05); const vr = cil(g, 0.02, 0.03, 2.2, '#e9c46a', 0.4, 1.4, zF + 0.5, 6); vr.rotation.z = 0.12; const vr2 = cil(g, 0.02, 0.03, 2.2, '#e9c46a', 0.8, 1.4, zF + 0.5, 6); vr2.rotation.z = -0.1;
      estante(g, col, -3.6, zF + 0.4, 4.6, 2.8, ['#e63946', '#ffca3a', '#8ac926', '#1982c4', '#f4a261', '#ffffff']);
      estante(g, col, -6.0, 0.8, 3.2, 2.2, ['#f4a261', '#e9c46a', '#2a9d8f', '#e76f51'], Math.PI / 2);
      // cestos de frutas
      for (const [x, z, cc] of [[-2.8, 1.2, '#e5383b'], [-1.5, 1.2, '#ff9f1c'], [-2.15, 2.2, '#8ac926']]) { cil(g, 0.5, 0.4, 0.5, '#c9945a', x, 0.25, z, 12); for (let i = 0; i < 6; i++) esf(g, 0.16, cc, x + Math.cos(i * 1.1) * 0.24, 0.55 + (i % 2) * 0.1, z + Math.sin(i * 1.1) * 0.24, 6); col.push({ x, z, r: 0.5 }); }
      // sacos e caixotes
      for (const [x, z] of [[5.6, 1.0], [5.6, 2.0]]) { const c2 = malha(gRBox(1, 1, 1, 0.06), MT(texMadeira('#d9a868', '#c4924f')), x, 0.45, z, g); c2.scale.setScalar(0.9); col.push({ x, z, r: 0.6 }); }
      const sc = esf(g, 0.5, '#e8dcc0', 5.4, 0.4, 3.2, 10); sc.scale.y = 0.85; col.push({ x: 5.4, z: 3.2, r: 0.5 });
      janela(g, 3.2, 2.7, zF, 1.6, 1.2); tapete(g, 0.6, 2.6, 2.6, 2.6, '#b5653a', '#e0a070'); luminaria(g, -2, 1); luminaria(g, 3, 1);
      break;
    }
    case 'cafe': {
      balcao(g, col, -2.4, -1.9, 5.0, '#6f4e37'); npcs.push({ id: dono, x: -2.4, z: -3.1, ry: 0 });
      // máquina e vitrine de doces
      caixa(g, 0.9, 0.9, 0.6, '#c0392b', -4.2, 1.55, -1.9, 0.08); cil(g, 0.08, 0.08, 0.2, '#ddd', -4.2, 1.2, -1.6, 8); ctx.vapor = { x: -4.2, y: 2.1, z: -1.9 };
      const vt = new THREE.Mesh(gRBox(1.8, 0.7, 0.7, 0.08), curvar(new THREE.MeshLambertMaterial({ color: '#d8f3ff', transparent: true, opacity: 0.35, depthWrite: false }))); vt.position.set(-1.6, 1.48, -1.9); raiz.add(vt);
      for (const [x, cc] of [[-2.2, '#ff8fab'], [-1.6, '#ffd166'], [-1.0, '#b08968']]) { cil(g, 0.2, 0.2, 0.22, cc, x, 1.24, -1.9, 12); esf(g, 0.06, '#e63946', x, 1.4, -1.9, 6); }
      estante(g, col, -2.4, zF + 0.4, 5.0, 2.9, ['#ffffff', '#f2e2cf', '#6f4e37', '#e9c46a', '#b08968'], 0, '#8b5e3c');
      for (const [x, z] of [[2.6, -2.4], [4.2, 0.6], [1.6, 2.0]]) { mesa(g, col, x, z, 0.7, '#f2e2cf'); banqueta(g, x - 1.1, z, '#8b5e3c'); banqueta(g, x + 1.1, z, '#8b5e3c'); cil(g, 0.1, 0.08, 0.14, '#ffffff', x, 0.95, z, 10); }
      sofa(g, col, 5.0, -3.6, 2.2, '#b08968', 0);
      janela(g, 2.8, 2.7, zF, 1.8, 1.4); quadro(g, 5.0, 2.8, zF, 0.9, 0.9, 6, '#6f4e37');
      tapeteRedondo(g, 0, 3.0, 1.2, '#8b5e3c', '#d7b899'); planta(g, col, -5.2, 2.8); luminaria(g, 2.6, -2.4); luminaria(g, 4.2, 0.6); luminaria(g, -2, 0.5);
      break;
    }
    case 'casa': {
      // cama
      const cm = grupo(g, -3.6, 0, -2.6); caixa(cm, 2.2, 0.5, 3.0, '#b5764a', 0, 0.3, 0, 0.1); caixa(cm, 2.0, 0.3, 2.8, '#ffffff', 0, 0.62, 0, 0.12); caixa(cm, 2.05, 0.2, 1.8, '#5aa9e6', 0, 0.76, 0.5, 0.1); caixa(cm, 1.3, 0.24, 0.6, '#fdffb6', 0, 0.84, -0.95, 0.12); caixa(cm, 2.3, 1.3, 0.2, '#b5764a', 0, 0.75, -1.5, 0.1);
      col.push({ x0: -4.8, x1: -2.4, z0: -4.25, z1: -1.0 }); inter.push({ tipo: 'cama', x: -3.6, z: -0.6, r: 1.5, rotulo: 'Dormir' });
      // escrivaninha com computador
      const es = grupo(g, 3.4, 0, zF + 0.6); caixa(es, 2.6, 0.12, 1.0, '#d9a868', 0, 0.95, 0, 0.04); for (const [a, b] of [[-1.2, -0.4], [1.2, -0.4], [-1.2, 0.4], [1.2, 0.4]]) caixa(es, 0.1, 0.9, 0.1, '#b5764a', a, 0.45, b);
      caixa(es, 1.1, 0.75, 0.08, '#2d3142', 0, 1.55, -0.2, 0.05); malha(gPlano(0.98, 0.62), curvar(new THREE.MeshBasicMaterial({ map: textura(128, 80, (x) => { x.fillStyle = '#bde0fe'; x.fillRect(0, 0, 128, 80); x.fillStyle = '#8fd46a'; x.fillRect(0, 52, 128, 28); x.font = '34px system-ui'; x.fillText('🐱', 44, 50); }) })), 0, 1.55, -0.15, es);
      caixa(es, 0.2, 0.2, 0.1, '#2d3142', 0, 1.1, -0.2); caixa(es, 0.8, 0.04, 0.3, '#e8ecef', 0, 1.03, 0.2, 0.01); cadeira(g, 3.4, -2.3, Math.PI, '#5aa9e6');
      col.push({ x0: 2.0, x1: 4.8, z0: -4.25, z1: -2.0 }); inter.push({ tipo: 'placa', x: 3.4, z: -1.8, r: 1.3, rotulo: 'Olhar', texto: 'Seu computador. No fundo de tela, um gatinho de terno muito bonito.' });
      estante(g, col, 0, zF + 0.4, 2.4, 2.6, ['#e63946', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93', '#f4a261']);
      inter.push({ tipo: 'placa', x: 0, z: -2.9, r: 1.2, rotulo: 'Olhar', texto: 'Sua estante de clássicos: Dom Casmurro, Brás Cubas, Alice... todos com orelha de gato marcando a página.' });
      janela(g, -3.6, 2.9, zF, 1.6, 1.2); quadro(g, 1.9, 3.1, zF, 0.8, 0.8, 2);
      tapeteRedondo(g, 0, 0.8, 1.9, '#5aa9e6', '#bde0fe'); mesa(g, col, 3.6, 1.6, 0.7, '#fff6e0'); cil(g, 0.12, 0.09, 0.24, '#e07a5f', 3.6, 1.0, 1.6, 10); esf(g, 0.14, '#ff6b8b', 3.6, 1.24, 1.6, 6);
      planta(g, col, -4.6, 2.6, 1.1); sofa(g, col, -2.2, 2.9, 2.4, '#ffd6a5', Math.PI);
      // lâmpada de cordinha, como no Quarto
      cil(g, 0.015, 0.015, 0.7, '#555', 0, 4.05, 0.8, 4).castShadow = false; malha(gEsf(0.2, 12, 10), M('#fff1c1', { emissive: '#ffd27a', emissiveIntensity: 0.9 }), 0, 3.6, 0.8, g).castShadow = false; cil(g, 0.008, 0.008, 0.9, '#888', 0.25, 3.2, 0.8, 4).castShadow = false; esf(g, 0.04, '#e63946', 0.25, 2.74, 0.8, 6);
      break;
    }
  }
  fundir(g);
  return {
    id, nome: LUGARES[id].nome, fora: false, raiz, colisores: col, interacoes: inter.filter((i) => i.rotulo !== ''), arvores: [], pontes: [],
    limites: { x0: -W / 2 + 0.45, x1: W / 2 - 0.45, z0: -D / 2 + 0.5, z1: D / 2 - 0.1 }, aguas: [],
    entradas: { porta: { x: 0, z: D / 2 - 1.9, ry: Math.PI } }, npcsFixos: npcs, fundo: c.fundo, W, D,
    atualizar(dt, t) { for (const f of vivos) f(dt, t); },
    mapa: { x0: -W / 2 - 1, x1: W / 2 + 1, z0: -W / 2 - 1, z1: W / 2 + 1, fundo: c.fundo, formas: [{ t: 'r', x0: -W / 2, z0: -D / 2, x1: W / 2, z1: D / 2, c: '#fff6e0' }, { t: 'e', x: 0, z: D / 2 - 0.4, e: '🚪' }] },
  };
}
