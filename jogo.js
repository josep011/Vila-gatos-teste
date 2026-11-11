// Vila dos Gatos — jogo principal: jogador, moradores, conversas, lojas, pesca, relíquias, missões e minimapa.
import { THREE, U, curvar, M, malha, grupo, gEsf, gTor, gDisco, gCil, gBox, descartar, Particulas, som, rnd, pick, clamp, lerp, sm, esf, cil } from './nucleo.js';
import { GLTFLoader } from './GLTFLoader.js';
import { criarGato } from './gato.js';
import { construirVila, construirPraia, acenderNoite, flor } from './mundo.js';
import { construirInterior } from './interiores.js';
import { chapeu, modeloItem, vara, boia, PONTA_VARA, peixe } from './pecas.js';
import { ITENS, RELIQUIAS, PEIXES, RAROS, MORADORES, FALAS, DICAS_CAFE, MISSOES, LUGARES } from './dados.js';

const $ = (id) => document.getElementById(id);
const celular = matchMedia('(pointer: coarse)').matches;
const CHAVE = 'vila-dos-gatos-v1';

// =====================================================================================
// estado salvo
// =====================================================================================
const NOVO = () => ({ moedas: 500, banco: 0, inv: {}, mao: null, chapeu: null, museu: [], missao: 0, base: 0, cont: { peixes: 0, flores: 0, doacoes: 0, arvores: 0 }, visitados: [], relVistas: [],
  flores: [], dia: 1, hora: 8, vitamina: 0, presentes: {}, semFrutas: {}, brilhos: {}, conchas: null, efeitos: {}, intro: false, primeiroBrilho: false, som: true, festa: false });
let estado = NOVO(), temSalvo = false;
try { const s = JSON.parse(localStorage.getItem(CHAVE) || 'null'); if (s && s.cont) { estado = { ...NOVO(), ...s, cont: { ...NOVO().cont, ...s.cont } }; temSalvo = true; } } catch (e) { /* sem armazenamento: joga sem salvar */ }
function salvar() { try { localStorage.setItem(CHAVE, JSON.stringify(estado)); } catch (e) { /* tudo bem */ } }

// =====================================================================================
// renderizador, cena, luzes
// =====================================================================================
const renderer = new THREE.WebGLRenderer({ canvas: $('tela'), antialias: true, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio || 1, celular ? 1.6 : 2));
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const cena = new THREE.Scene(); cena.background = new THREE.Color('#9fe0ff'); cena.fog = new THREE.Fog('#9fe0ff', 60, 150);
const camera = new THREE.PerspectiveCamera(40, 1, 1, 400);
const hemi = new THREE.HemisphereLight('#ffffff', '#b9e89a', 1.5); cena.add(hemi);
const sol = new THREE.DirectionalLight('#fff4dc', 1.7); sol.castShadow = true;
sol.shadow.mapSize.setScalar(celular ? 1024 : 2048); sol.shadow.camera.near = 1; sol.shadow.camera.far = 70; sol.shadow.bias = -0.0006; sol.shadow.normalBias = 0.03;
{ const c = sol.shadow.camera; c.left = -24; c.right = 24; c.top = 24; c.bottom = -24; c.updateProjectionMatrix(); }
cena.add(sol, sol.target);
const fx = new Particulas(cena, 1200);
function ajustar() { const w = innerWidth, h = innerHeight; renderer.setSize(w, h, false); camera.aspect = w / h; camera.fov = w < h ? 40 : 30; camera.updateProjectionMatrix(); fx.mat.uniforms.esc.value = h * renderer.getPixelRatio() * 0.9; }
addEventListener('resize', ajustar); ajustar();

// =====================================================================================
// modelos dos gatos (os mesmos do Nosso Museu e do Quarto)
// =====================================================================================
const MODELOS = {};
async function carregar() {
  const L = new GLTFLoader(), prog = { terno: 0, doutora: 0 }, tam = { terno: 1105896, doutora: 2874004 };
  const barra = () => { $('barra').style.width = Math.min(97, 4 + 93 * (prog.terno + prog.doutora) / (tam.terno + tam.doutora)) + '%'; };
  const [a, b] = await Promise.all([
    L.loadAsync('./gatinho_terno_leve.glb', (e) => { prog.terno = e.loaded; barra(); }),
    L.loadAsync('./gatinha_doutora.glb', (e) => { prog.doutora = e.loaded; barra(); }),
  ]);
  MODELOS.terno = medir(a); MODELOS.doutora = medir(b);
}
function medir(gltf) {
  gltf.scene.updateMatrixWorld(true);
  const bb = new THREE.Box3().setFromObject(gltf.scene), cab = gltf.scene.getObjectByName('cabeca');
  let hm = null; cab.traverse((o) => { if (o.isMesh && /^tinta cabe/.test(o.material.name)) hm = o; });
  const hb = new THREE.Box3().setFromObject(hm || cab), topo = cab.worldToLocal(new THREE.Vector3((hb.min.x + hb.max.x) / 2, hb.max.y, (hb.min.z + hb.max.z) / 2));
  return { gltf, alt: bb.max.y - bb.min.y, minY: bb.min.y, cab: { y: topo.y, z: topo.z, r: (hb.max.x - hb.min.x) / 2 } };
}
const ALT = 1.55;
// repinta a pelagem cinza da cabeça com a cor do morador (a máscara branca do rosto continua clara)
const pelagens = new Map();
function pelagem(mapa, cor) {
  let t = pelagens.get(cor); if (t) return t;
  const c = document.createElement('canvas'); c.width = 512; c.height = 256; const x = c.getContext('2d', { willReadFrequently: true }); x.drawImage(mapa.image, 0, 0, 512, 256);
  const d = x.getImageData(0, 0, 512, 256), p = d.data, k = new THREE.Color(cor), b = [k.r * 255, k.g * 255, k.b * 255].map((v) => Math.pow(v / 255, 1 / 2.2) * 255);
  for (let i = 0; i < p.length; i += 4) { const L = (p[i] + p[i + 1] + p[i + 2]) / 765, w = Math.min(1, Math.max(0, (L - 0.62) / 0.26)), det = L / (0.56 + 0.38 * w), f = Math.min(1.12, Math.max(0.86, det));
    for (let j = 0; j < 3; j++) p[i + j] = Math.min(255, (b[j] + (250 - b[j]) * w * 0.9) * f); }
  x.putImageData(d, 0, 0);
  t = new THREE.CanvasTexture(c); t.flipY = mapa.flipY; t.colorSpace = mapa.colorSpace; t.wrapS = mapa.wrapS; t.wrapT = mapa.wrapT; t.userData.fixo = true; pelagens.set(cor, t); return t;
}
function pintar(mat, def) {
  const m = mat.clone(); curvar(m); const n = mat.name || '';
  if (/^desenho/.test(n) || !def || def.modelo) return m;
  const escuro = (c, k) => new THREE.Color(c).multiplyScalar(k);
  if (/interior da orelha/.test(n)) return m;
  if (/^tinta cabe/.test(n) && m.map) { m.map = pelagem(m.map, def.pelo); m.color.set('#ffffff'); }
  else if (/cabe|orelha|pesco|tronco|pata|cauda/.test(n)) m.color.set(def.pelo);
  else if (/lapela|punho/.test(n)) m.color.copy(escuro(def.roupa, 0.8));
  else if (/palet|bra[cç]o|manga/.test(n)) m.color.set(def.roupa);
  else if (/barra/.test(n)) m.color.copy(escuro(def.calca, 0.8));
  else if (/cal[cç]a|coxa|canela/.test(n)) m.color.set(def.calca);
  else if (/gravata/.test(n)) m.color.copy(escuro(def.roupa, 0.55));
  return m;
}
function criarPersonagem(def) {
  const md = MODELOS[def && def.modelo === 'doutora' ? 'doutora' : 'terno'], gato = criarGato(md.gltf), esc = ALT / md.alt;
  gato.modelo.traverse((o) => { if (o.isMesh) { const des = /^desenho/.test(o.material.name || ''); o.material = pintar(o.material, def); o.castShadow = !des; o.receiveShadow = false; } });
  const interno = new THREE.Group(); interno.scale.setScalar(esc); interno.position.y = -md.minY * esc; interno.add(gato.modelo);
  const g = new THREE.Group(); g.add(interno);
  const p = { g, gato, md, esc, modoAnim: 'parado', gestoAte: 0, chapeu: null, no: (n) => gato.modelo.getObjectByName(n) };
  if (def && def.chapeu) vestir(p, def.chapeu);
  return p;
}
function vestir(p, id) {
  const cab = p.no('cabeca'); if (p.chapeu) { cab.remove(p.chapeu); p.chapeu = null; }
  if (!id) return;
  const c = chapeu(id); c.scale.setScalar(p.md.cab.r); c.position.set(0, p.md.cab.y - p.md.cab.r * 0.12, p.md.cab.z); cab.add(c); p.chapeu = c;
}
let tempo = 0;
function gesto(p, nome, dur) { const d = p.gato.acao(nome, dur); p.modoAnim = 'gesto'; p.gestoAte = tempo + d; return d; }
function mover(p, modo) {       // 'parado' | 'andar' | 'correr'
  if (p.modoAnim === 'gesto') { if (modo === 'parado' && tempo < p.gestoAte) return; p.modoAnim = 'parado'; if (modo === 'parado') return; }
  if (p.modoAnim === modo) return;
  if (modo === 'parado') p.gato.parar(0.22); else p.gato.acao(modo);
  p.modoAnim = modo;
}

// =====================================================================================
// jogador
// =====================================================================================
const eu = { x: 0, z: 13, y: 0, vy: 0, yaw: Math.PI, pers: null, noAr: false, esc: 1, escAlvo: 1, passoT: 0 };
let area = null, ocupado = false, emTransicao = true, npcs = [], drops = [], brilhos = [], tarefas = [], anims = [], tremor = 0;
const depois = (s, f) => tarefas.push({ t: tempo + s, f, area: area && area.id });
const animar = (dur, f, fim) => anims.push({ t0: tempo, dur, f, fim, area: area && area.id });

// =====================================================================================
// entrada
// =====================================================================================
const teclas = new Set(), joy = { x: 0, y: 0, id: null };
addEventListener('keydown', (e) => {
  if (e.repeat) return; const k = e.key.toLowerCase(); teclas.add(k); som.iniciar();
  if (k === ' ' || k === 'e' || k === 'enter') { e.preventDefault(); apertarA(); }
  else if (k === 'q' || k === 'x' || k === 'f') apertarB();
  else if (k === 'i' || k === 'tab') { e.preventDefault(); painelAberto ? fecharPainel(-1) : abrirMochila(); }
  else if (k === 'm') { painelAberto ? fecharPainel(-1) : abrirMapa(); }
  else if (k === 'escape' && painelAberto) fecharPainel(-1);
  else if (dlg.opcoes && (k === 'arrowup' || k === 'w')) focoOpcao(-1);
  else if (dlg.opcoes && (k === 'arrowdown' || k === 's')) focoOpcao(1);
});
addEventListener('keyup', (e) => teclas.delete(e.key.toLowerCase()));
addEventListener('blur', () => teclas.clear());
{ const j = $('joy'), p = $('joyP');
  const mexe = (e) => { const r = j.getBoundingClientRect(), dx = e.clientX - (r.left + r.width / 2), dy = e.clientY - (r.top + r.height / 2), l = Math.hypot(dx, dy), m = r.width / 2 - 12, k = l > m ? m / l : 1;
    joy.x = (dx * k) / m; joy.y = (dy * k) / m; p.style.transform = `translate(${dx * k}px, ${dy * k}px)`; };
  j.addEventListener('pointerdown', (e) => { joy.id = e.pointerId; j.setPointerCapture(e.pointerId); mexe(e); som.iniciar(); });
  j.addEventListener('pointermove', (e) => { if (e.pointerId === joy.id) mexe(e); });
  const solta = (e) => { if (e.pointerId !== joy.id) return; joy.id = null; joy.x = joy.y = 0; p.style.transform = ''; };
  j.addEventListener('pointerup', solta); j.addEventListener('pointercancel', solta);
}
$('btnA').addEventListener('pointerdown', (e) => { e.preventDefault(); som.iniciar(); apertarA(); });
$('btnB').addEventListener('pointerdown', (e) => { e.preventDefault(); som.iniciar(); apertarB(); });
$('btnMochila').addEventListener('click', () => abrirMochila());
$('btnSom').addEventListener('click', () => { som.iniciar(); estado.som = som.alternar(); $('btnSom').textContent = estado.som ? '🔊' : '🔇'; salvar(); });
$('mapa').addEventListener('click', () => abrirMapa());
$('missaoChip').addEventListener('click', () => { const m = MISSOES[estado.missao]; if (m) toast(`📋 ${m.titulo}: ${m.texto}`); });
$('dCaixa').addEventListener('pointerdown', () => { som.iniciar(); avancarDialogo(); });
$('cartao').addEventListener('pointerdown', () => fecharCartao());

// =====================================================================================
// HUD, avisos, cartão
// =====================================================================================
function toast(t) { const d = document.createElement('div'); d.className = 'toast'; d.textContent = t; const c = $('toasts'); c.appendChild(d); while (c.children.length > 3) c.firstChild.remove(); setTimeout(() => d.remove(), 3000); }
function hud() {
  $('moedas').textContent = estado.moedas.toLocaleString('pt-BR'); $('dia').textContent = 'Dia ' + estado.dia;
  const it = estado.mao && ITENS[estado.mao]; $('bIcone').textContent = it ? it.icone : '✋'; $('bRot').textContent = it ? (it.tipo === 'reliquia' ? 'poder' : it.tipo === 'semente' ? 'plantar' : 'usar') : 'mão';
  const m = MISSOES[estado.missao], c = $('missaoChip');
  if (!m) c.innerHTML = '<i>🏆</i><span>Herói da Vila dos Gatos</span>';
  else { const p = progresso(m); c.innerHTML = p >= m.meta ? `<i>✅</i><span><b>${m.titulo}</b> — volte à Prefeita!</span>` : `<i>📋</i><span><b>${m.titulo}</b> ${Math.min(p, m.meta)}/${m.meta}</span>`; }
}
function progresso(m) { return m.cont === 'visitas' ? estado.visitados.length : m.cont === 'reliquias' ? estado.relVistas.length : estado.cont[m.cont] - estado.base; }
let missaoAvisada = -1;
function checarMissao() { const m = MISSOES[estado.missao]; hud(); if (m && progresso(m) >= m.meta && missaoAvisada !== estado.missao) { missaoAvisada = estado.missao; toast('✅ Missão cumprida! Fale com a Prefeita Mimi.'); som.vitoria(); } }
let cartaoRes = null, cartaoObj = null;
function fecharCartao() { if (!cartaoRes) return; $('cartao').classList.remove('on'); if (cartaoObj) { cena.remove(cartaoObj); cartaoObj = null; } const r = cartaoRes; cartaoRes = null; r(); }
// mostra o que o jogador ganhou: ergue o item acima da cabeça
function mostrarAchado(id, tag = 'Você conseguiu') {
  const it = ITENS[id]; eu.pers.gato.humor('feliz'); gesto(eu.pers, 'erguer', 600);
  const m = modeloItem(id); m.scale.multiplyScalar(1.25); cartaoObj = m; cena.add(m);
  $('cTag').textContent = (it.tipo === 'reliquia' ? '✨ RELÍQUIA LENDÁRIA ✨' : tag).toUpperCase(); $('cNome').textContent = `${it.icone} ${it.nome}`; $('cDesc').textContent = it.desc || ''; $('cartao').classList.add('on');
  if (it.tipo === 'reliquia') { som.magia(); fx.explosao({ x: eu.x, y: 2.4 * eu.esc, z: eu.z }, { n: 50, cores: ['#ffe66d', '#ffffff', '#ffafcc', '#bde0fe'], vel: 4, cima: 3, tam: 0.35, vida: 1.4, grav: 3 }); }
  else som.vitoria();
  return new Promise((r) => { cartaoRes = () => { eu.pers.gato.parar(0.25); eu.pers.modoAnim = 'parado'; eu.pers.gato.humor('normal'); r(); }; setTimeout(() => { if (cartaoRes) fecharCartao(); }, it.tipo === 'reliquia' ? 6000 : 3200); });
}

// =====================================================================================
// inventário
// =====================================================================================
const tem = (id) => estado.inv[id] || 0;
function dar(id, q = 1) { estado.inv[id] = tem(id) + q; if (ITENS[id].tipo === 'reliquia' && !estado.relVistas.includes(id)) estado.relVistas.push(id); checarMissao(); salvar(); }
function tirar(id, q = 1) { estado.inv[id] = tem(id) - q; if (estado.inv[id] <= 0) { delete estado.inv[id]; if (estado.mao === id) estado.mao = null; } hud(); salvar(); }
function ganhar(v) { estado.moedas += v; hud(); }
function reliquiaNova() { const f = Object.keys(RELIQUIAS).filter((r) => !estado.relVistas.includes(r)); return f.length ? pick(f) : null; }
const sorte = () => (estado.efeitos.sorte > 0 ? 1.7 : 1);

// =====================================================================================
// diálogos (com letrinhas aparecendo) e painéis
// =====================================================================================
const dlg = { ativo: false, texto: '', i: 0, res: null, opcoes: null, foco: 0, voz: 420, quem: null };
function abrirDialogo(nome, texto, opcoes, voz, quem) {
  dlg.ativo = true; dlg.texto = texto; dlg.i = 0; dlg.opcoes = opcoes || null; dlg.foco = 0; dlg.voz = voz || 420; dlg.quem = quem || null;
  $('dNome').textContent = nome || ''; $('dNome').style.display = nome ? '' : 'none'; $('dTexto').textContent = ''; $('dOpcoes').innerHTML = ''; $('dSeta').style.display = 'none'; $('dialogo').classList.add('on');
  if (quem) quem.pers.gato.humor('falando');
  return new Promise((r) => { dlg.res = r; });
}
const falar = (nome, texto, voz, quem) => abrirDialogo(nome, texto, null, voz, quem);
const perguntar = (nome, texto, opcoes, voz, quem) => abrirDialogo(nome, texto, opcoes, voz, quem);
function fimDaEscrita() {
  dlg.i = dlg.texto.length; $('dTexto').textContent = dlg.texto; if (dlg.quem) dlg.quem.pers.gato.humor('normal');
  if (dlg.opcoes) { const c = $('dOpcoes'); dlg.opcoes.forEach((o, i) => { const b = document.createElement('button'); b.textContent = o; if (i === 0) b.className = 'foco'; b.addEventListener('pointerdown', (e) => { e.stopPropagation(); escolherOpcao(i); }); c.appendChild(b); }); }
  else $('dSeta').style.display = '';
}
function focoOpcao(d) { if (dlg.i < dlg.texto.length) return; dlg.foco = (dlg.foco + d + dlg.opcoes.length) % dlg.opcoes.length; [...$('dOpcoes').children].forEach((b, i) => b.classList.toggle('foco', i === dlg.foco)); som.blip(500); }
function escolherOpcao(i) { if (!dlg.ativo) return; som.pop(); fecharDialogo(i); }
function fecharDialogo(v) { dlg.ativo = false; $('dialogo').classList.remove('on'); const r = dlg.res; dlg.res = null; dlg.opcoes = null; if (r) r(v); }
function avancarDialogo() { if (!dlg.ativo) return; if (dlg.i < dlg.texto.length) fimDaEscrita(); else if (dlg.opcoes) escolherOpcao(dlg.foco); else { som.blip(360); fecharDialogo(); } }
function escrever(dt) {
  if (!dlg.ativo || dlg.i >= dlg.texto.length) return;
  const antes = Math.floor(dlg.i); dlg.i = Math.min(dlg.texto.length, dlg.i + dt * 48); const agora = Math.floor(dlg.i);
  if (agora !== antes) { $('dTexto').textContent = dlg.texto.slice(0, agora); if (agora % 3 === 0 && /\S/.test(dlg.texto[agora - 1] || '')) som.blip(dlg.voz); if (dlg.i >= dlg.texto.length) fimDaEscrita(); }
}
let painelAberto = false, painelRes = null;
function abrirPainel(titulo, moedas = true) { painelAberto = true; $('pTitulo').textContent = titulo; $('pMoedas').style.display = moedas ? '' : 'none'; $('pMoedas').textContent = '🐟 ' + estado.moedas.toLocaleString('pt-BR'); $('pCorpo').innerHTML = ''; $('painel').classList.add('on'); return $('pCorpo'); }
function fecharPainel(v) { if (!painelAberto) return; painelAberto = false; $('painel').classList.remove('on'); const r = painelRes; painelRes = null; if (r) r(v); }
$('pFechar').addEventListener('click', () => { som.pop(); fecharPainel(-1); });
$('painel').addEventListener('pointerdown', (e) => { if (e.target === $('painel')) fecharPainel(-1); });
// lista para escolher (lojas, doações...): devolve o índice ou -1
function lista(titulo, itens, vazio = 'Nada por aqui.') {
  const c = abrirPainel(titulo);
  if (!itens.length) c.innerHTML = `<p style="text-align:center;font-weight:700;opacity:.7;padding:18px">${vazio}</p>`;
  itens.forEach((it, i) => { const b = document.createElement('button'); b.className = 'linha'; if (it.off) b.disabled = true;
    b.innerHTML = `<span class="ic">${it.icone}</span><span class="tx"><b></b><span></span></span><span class="dr"></span>`; b.querySelector('b').textContent = it.nome; b.querySelector('.tx span').textContent = it.desc || ''; b.querySelector('.dr').textContent = it.direita || '';
    b.addEventListener('click', () => { som.pop(); fecharPainel(i); }); c.appendChild(b); });
  return new Promise((r) => { painelRes = r; });
}
function abrirMochila() {
  if (dlg.ativo || emTransicao || pesca) return; som.pop();
  const c = abrirPainel('🎒 Mochila'); let sel = null;
  const desenhar = () => {
    $('pMoedas').textContent = '🐟 ' + estado.moedas.toLocaleString('pt-BR');
    const ids = Object.keys(estado.inv).sort((a, b) => (ITENS[a].tipo === 'reliquia' ? 0 : 1) - (ITENS[b].tipo === 'reliquia' ? 0 : 1));
    c.innerHTML = ids.length ? '<div id="grade"></div><div id="detalhe"></div>' : '<p style="text-align:center;font-weight:700;opacity:.7;padding:22px">Sua mochila está vazia.<br>Sacuda árvores, pesque e cave os brilhinhos do chão!</p>';
    if (!ids.length) return; if (!ids.includes(sel)) sel = ids[0];
    const g = c.querySelector('#grade');
    for (const id of ids) { const it = ITENS[id], s = document.createElement('button'); s.className = 'slot' + (id === sel ? ' sel' : '') + (it.tipo === 'reliquia' ? ' rel' : '');
      s.innerHTML = it.icone + (tem(id) > 1 ? `<em>${tem(id)}</em>` : '') + (estado.mao === id ? '<u>✋</u>' : estado.chapeu === id ? '<u>✔️</u>' : ''); s.addEventListener('click', () => { sel = id; som.blip(500); desenhar(); }); g.appendChild(s); }
    const it = ITENS[sel], d = c.querySelector('#detalhe'); d.innerHTML = '<b></b><p></p><div></div>'; d.querySelector('b').textContent = `${it.icone} ${it.nome}`; d.querySelector('p').textContent = (it.desc || '') + (it.preco ? `  (vale ${it.preco} 🐟)` : '');
    const bt = (t, f, b) => { const x = document.createElement('button'); x.className = 'pilula' + (b ? ' b' : ''); x.textContent = t; x.addEventListener('click', f); d.querySelector('div').appendChild(x); };
    if (['reliquia', 'semente', 'ferramenta'].includes(it.tipo)) bt(estado.mao === sel ? 'Tirar da mão' : 'Pôr na mão (B)', () => { estado.mao = estado.mao === sel ? null : sel; som.pegar(); hud(); salvar(); desenhar(); });
    if (it.tipo === 'chapeu') bt(estado.chapeu === sel ? 'Tirar' : 'Vestir', () => { estado.chapeu = estado.chapeu === sel ? null : sel; vestir(eu.pers, estado.chapeu); som.pegar(); salvar(); desenhar(); });
    if (it.tipo === 'comida' || it.tipo === 'fruta') bt('Comer', () => { fecharPainel(-1); comer(sel); });
  };
  desenhar();
}
function abrirMapa() {
  if (dlg.ativo || emTransicao) return; som.pop();
  const c = abrirPainel('🗺️ ' + area.nome, false); const cv = document.createElement('canvas'); cv.id = 'mapaG'; cv.width = cv.height = 640; c.appendChild(cv); desenharMapa(cv, true);
  const p = document.createElement('p'); p.style.cssText = 'font-size:12.5px;font-weight:700;text-align:center;margin:9px 0 2px;opacity:.8'; p.textContent = '🔺 você   🟡 vizinhos   ✨ tesouros (com a Lanterna de Vagalumes)'; c.appendChild(p);
}

// =====================================================================================
// mapas: montar um de cada vez
// =====================================================================================
function livre(x, z, r = 0.6) {
  const L = area.limites; if (x < L.x0 + r || x > L.x1 - r || z < L.z0 + r || z > L.z1 - r) return false;
  for (const c of area.colisores) { if (c.mar) { if (z > c.z - r) return false; } else if (c.r !== undefined) { if (Math.hypot(x - c.x, z - c.z) < c.r + r) return false; } else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) return false; }
  return true;
}
function pontoLivre(r = 0.8, tent = 60) { const L = area.limites; for (let i = 0; i < tent; i++) { const x = rnd(L.x0 + 2, L.x1 - 2), z = rnd(L.z0 + 2, L.z1 - 2); if (livre(x, z, r) && Math.hypot(x - eu.x, z - eu.z) > 5 && (area.id !== 'vila' || Math.hypot(x, z) > 13)) return [x, z]; } return null; }
function iris(abrindo, dur = 0.45) {
  const el = $('transicao'); el.style.display = 'block';
  return new Promise((res) => { const t0 = performance.now(), R = Math.hypot(innerWidth, innerHeight) * 0.6;
    const f = (now) => { const k = clamp((now - t0) / (dur * 1000), 0, 1), e = abrindo ? sm(k) : 1 - sm(k), r = e * R;
      el.style.background = `radial-gradient(circle at 50% 55%, transparent ${r}px, #2f6b3a ${r + 2}px)`; if (k < 1) requestAnimationFrame(f); else { if (abrindo) el.style.display = 'none'; res(); } };
    requestAnimationFrame(f); });
}
function limparArea() {
  if (!area) return;
  for (const n of npcs) { cena.remove(n.pers.g); descartar(n.pers.g); if (n.bolhaM) cena.remove(n.bolhaM); }
  for (const d of drops) cena.remove(d.m);
  for (const b of brilhos) cena.remove(b.s);
  for (const b of bolhas) cena.remove(b.m);
  npcs = []; drops = []; brilhos = []; bolhas.length = 0;
  tarefas = tarefas.filter((t) => !t.area); anims = anims.filter((a) => !a.area);
  cena.remove(area.raiz); descartar(area.raiz); fx.limpar(); area = null;
}
async function irPara(id, entrada, semIris) {
  emTransicao = true; if (!semIris) { som.porta(); await iris(false); }
  cancelarPesca(true); limparArea();
  const ctx = { estado, semFrutas: new Set(estado.semFrutas[id] || []) };
  area = id === 'vila' ? construirVila(ctx) : id === 'praia' ? construirPraia(ctx) : construirInterior(id, ctx);
  area.ctx = ctx; cena.add(area.raiz);
  const e = area.entradas[entrada] || area.entradas.inicio || area.entradas.porta || Object.values(area.entradas)[0];
  eu.x = e.x; eu.z = e.z; eu.yaw = e.ry; eu.y = 0; eu.vy = 0; eu.noAr = false;
  U.curva.value = area.fora ? 0.0022 : 0;
  if (area.fora) {
    for (const nid of area.npcs) { const d = MORADORES[nid], pos = (area.npcPos && area.npcPos[nid]) || d.casa; criarNpc(nid, pos[0], pos[1], rnd(6), false); }
    for (const f of estado.flores) if (f.a === id) area.raiz.add(flor(null, f.x, f.z, f.c));
    if (!estado.brilhos[id]) { estado.brilhos[id] = []; const n = id === 'vila' ? 5 : 3; for (let i = 0; i < n; i++) { const p = pontoLivre(1); if (p) estado.brilhos[id].push(p); }
      if (id === 'vila' && !estado.primeiroBrilho) estado.brilhos.vila.push([4.5, 15.5]); }
    for (const [x, z] of estado.brilhos[id]) criarBrilho(x, z);
    if (id === 'praia') { if (!estado.conchas) { estado.conchas = []; for (let i = 0; i < 6; i++) estado.conchas.push([rnd(-28, 28), rnd(-3, 3.6), Math.random() < 0.3 ? 'estrela_mar' : 'concha']); }
      estado.conchas.forEach((c, i) => { if (c && livre(c[0], c[1], 0.3)) soltar(c[2], c[0], c[1], { fixo: i }); }); }
  } else {
    for (const n of area.npcsFixos) criarNpc(n.id, n.x, n.z, n.ry, true);
    if (LUGARES[id] && id !== 'casa' && !estado.visitados.includes(id)) { estado.visitados.push(id); checarMissao(); }
  }
  luzes(true); camSeguir(true); salvar();
  if (!semIris) await iris(true);
  const b = $('local'); b.textContent = area.nome; b.classList.remove('on'); void b.offsetWidth; b.classList.add('on');
  emTransicao = false;
}

// =====================================================================================
// moradores
// =====================================================================================
function criarNpc(id, x, z, ry, fixo) {
  const def = MORADORES[id], pers = criarPersonagem(def); pers.g.position.set(x, 0, z); pers.g.rotation.y = ry; cena.add(pers.g);
  const n = { id, def, pers, x, z, yaw: ry, yaw0: ry, fixo, casa: [x, z], estado: 'parado', t: rnd(1, 4), alvo: null, perto: false, iFala: Math.floor(rnd(20)), efeito: null, y: 0 };
  npcs.push(n); return n;
}
const virar = (de, para, k) => { let d = para - de; while (d > Math.PI) d -= Math.PI * 2; while (d < -Math.PI) d += Math.PI * 2; return de + d * k; };
function atualizarNpcs(dt) {
  for (const n of npcs) {
    const d = Math.hypot(n.x - eu.x, n.z - eu.z), p = n.pers;
    p.g.visible = d < 34; if (!p.g.visible) continue;
    if (n.efeito) {
      const e = n.efeito; e.t -= dt;
      if (e.tipo === 'bolha') { const k = sm(Math.min(1, (e.dur - e.t) / 0.8)) * sm(Math.min(1, e.t / 0.6)); n.y = 2.3 * k + Math.sin(tempo * 2) * 0.12 * k; n.yaw += dt * 0.9; if (n.bolhaM) { n.bolhaM.position.set(n.x, n.y + 0.85, n.z); n.bolhaM.scale.setScalar(1.45 + Math.sin(tempo * 5) * 0.04); } }
      if (e.tipo === 'danca' && tempo > p.gestoAte - 0.1) gesto(p, pick(['dancar', 'dancar', 'girar', 'comemorar']));
      if (e.t <= 0) { if (e.tipo === 'bolha') { n.y = 0; if (n.bolhaM) { cena.remove(n.bolhaM); n.bolhaM = null; } fx.explosao({ x: n.x, y: 1.2, z: n.z }, { n: 16, cores: ['#bde0fe', '#ffffff'], vel: 3, cima: 1, tam: 0.25, vida: 0.6, grav: 1 }); som.pop(); p.gato.humor('feliz'); gesto(p, 'comemorar'); depois(2, () => p.gato.humor('normal')); }
        else p.gato.humor('normal'); n.efeito = null; n.t = 1.5; n.estado = 'parado'; }
    } else if (n === dlg.quem || n.conversando) {
      n.yaw = virar(n.yaw, Math.atan2(eu.x - n.x, eu.z - n.z), 1 - Math.exp(-8 * dt)); mover(p, 'parado');
    } else if (n.fixo) {
      const alvo = d < 6 ? Math.atan2(eu.x - n.x, eu.z - n.z) : n.yaw0; n.yaw = virar(n.yaw, alvo, 1 - Math.exp(-4 * dt));
      n.t -= dt; if (n.t <= 0) { n.t = rnd(5, 11); gesto(p, pick(['olhar', 'pensar', 'balancar', 'espreguicar', 'acenar'])); }
    } else {
      const eraPerto = n.perto; n.perto = d < 3.4 && !eu.noAr;
      if (n.perto) { if (!eraPerto) { mover(p, 'parado'); n.estado = 'parado'; if (Math.random() < 0.7) { gesto(p, 'acenar'); p.gato.humor('feliz'); depois(2.3, () => { if (!n.efeito && n !== dlg.quem) p.gato.humor('normal'); }); } }
        n.yaw = virar(n.yaw, Math.atan2(eu.x - n.x, eu.z - n.z), 1 - Math.exp(-6 * dt)); n.t = Math.max(n.t, 1.2); }
      else if (n.estado === 'parado') {
        n.t -= dt;
        if (n.t <= 0) {
          if (Math.random() < 0.35) { gesto(p, pick(['olhar', 'espreguicar', 'pensar', 'balancar', 'pulinhos', n.def.jeito === 'esporte' ? 'marchar' : 'olhar', n.def.jeito === 'sono' ? 'espreguicar' : 'olhar'])); n.t = rnd(3, 5); }
          else for (let i = 0; i < 8; i++) { const a = rnd(Math.PI * 2), r = rnd(2, 6.5), x = n.casa[0] + Math.cos(a) * r, z = n.casa[1] + Math.sin(a) * r; if (livre(x, z, 0.7) && caminhoLivre(n.x, n.z, x, z)) { n.alvo = [x, z]; n.estado = 'andando'; break; } n.t = 1; }
        }
      } else if (n.estado === 'andando') {
        const dx = n.alvo[0] - n.x, dz = n.alvo[1] - n.z, l = Math.hypot(dx, dz), v = n.def.jeito === 'esporte' ? 3.4 : n.def.jeito === 'sono' || n.def.jeito === 'vovo' ? 1.3 : 1.9;
        if (l < 0.2) { n.estado = 'parado'; n.t = rnd(2, 6); mover(p, 'parado'); }
        else { n.x += (dx / l) * v * dt; n.z += (dz / l) * v * dt; n.yaw = virar(n.yaw, Math.atan2(dx, dz), 1 - Math.exp(-7 * dt)); mover(p, v > 3 ? 'correr' : 'andar'); }
      }
    }
    p.g.position.set(n.x, n.y, n.z); p.g.rotation.y = n.yaw; p.gato.atualizar(dt);
  }
}
function caminhoLivre(x0, z0, x1, z1) { const n = Math.ceil(Math.hypot(x1 - x0, z1 - z0) / 0.8); for (let i = 1; i <= n; i++) if (!livre(lerp(x0, x1, i / n), lerp(z0, z1, i / n), 0.6)) return false; return true; }
const emVolta = (r) => npcs.filter((n) => Math.hypot(n.x - eu.x, n.z - eu.z) < r);

// ---------- conversas ----------
async function cenaJogo(f) { if (ocupado) return; ocupado = true; mover(eu.pers, 'parado'); try { await f(); } catch (e) { console.error(e); } finally { ocupado = false; hud(); salvar(); } }
async function conversar(n) {
  const d = n.def, diz = (t) => falar(d.nome, t, d.voz, n), pede = (t, o) => perguntar(d.nome, t, o, d.voz, n);
  n.conversando = true; eu.yaw = Math.atan2(n.x - eu.x, n.z - eu.z);
  try {
    switch (d.jeito) {
      case 'prefeita': await papoPrefeita(diz, pede, n); break;
      case 'banco': await papoBanco(diz, pede); break;
      case 'museu': await papoMuseu(diz, pede, n); break;
      case 'roupas': await papoRoupas(diz, pede); break;
      case 'chef': await papoLoja(diz, pede, 'Bem-vindo ao Sardinha Dourada! O peixe é fresco e o Chef é modesto. O que vai ser?', ['sushi', 'sopa', 'bolo'], (i) => ITENS[i].tipo === 'peixe', 1.25, 'Eu pago 25% a mais por peixe fresco!'); break;
      case 'armazem': await papoLoja(diz, pede, 'Opa! No Armazém do Tico tem de tudo um pouco. E eu compro o que você achar por aí.', [...(tem('vara') ? [] : ['vara']), 'isca', 'semente'], (i) => ITENS[i].preco > 0 && !['ferramenta', 'chapeu'].includes(ITENS[i].tipo), 1, 'Compro frutas, conchas, peixes, botas... menos relíquias, essas não têm preço.'); break;
      case 'cafe': await papoCafe(diz, pede); break;
      case 'medica': await papoMedica(diz, pede, n); break;
      default: await papoMorador(diz, n);
    }
  } finally { n.conversando = false; n.pers.gato.humor('normal'); }
}
async function papoMorador(diz, n) {
  const falas = FALAS[n.def.jeito]; await diz(falas[n.iFala++ % falas.length]);
  if (estado.presentes[n.id] !== estado.dia && Math.random() < 0.45) {
    estado.presentes[n.id] = estado.dia; const item = pick(['maca', 'laranja', 'semente', 'isca', 'cafe']);
    await diz('Ah, toma! Guardei isso pra você.'); gesto(n.pers, 'comemorar'); dar(item); await mostrarAchado(item, 'Presente de ' + n.def.nome);
  }
}
async function papoPrefeita(diz, pede, n) {
  if (!estado.intro) { estado.intro = true; await diz('Ora, ora! Você deve ser o novo morador de terno. Eu sou a Prefeita Mimi. Bem-vindo à Vila dos Gatos!'); await diz('Aqui em volta da praça tem de tudo: banco, museu, loja de roupas, restaurante, clínica, café e o armazém. E a praia fica passando o arco, lá no sul.'); }
  const m = MISSOES[estado.missao];
  if (!m) { await diz('Nosso herói! A vila está linda graças a você. Aproveite, pesque, dance, solte fogos. Você merece.'); return; }
  if (progresso(m) >= m.meta) {
    gesto(n.pers, 'palmas'); n.pers.gato.humor('feliz'); await diz(m.fim);
    if (m.premio.moedas) { ganhar(m.premio.moedas); som.moeda(); toast(`+${m.premio.moedas} 🐟`); }
    if (m.premio.item) { dar(m.premio.item, m.premio.qtd || 1); await mostrarAchado(m.premio.item, 'Presente da Prefeita'); }
    estado.missao++; estado.base = 0; const prox = MISSOES[estado.missao];
    if (prox) { if (!['visitas', 'reliquias'].includes(prox.cont)) estado.base = estado.cont[prox.cont]; hud(); await diz(`Tenho mais um pedido: "${prox.titulo}". ${prox.texto}`); checarMissao(); }
    else { hud(); await diz('E com isso... declaro aberto o Grande Festival da Vila dos Gatos!'); estado.festa = true; depois(0.5, () => festival()); }
    return;
  }
  const o = await pede(`Sua missão agora: "${m.titulo}". ${m.texto} (${Math.min(progresso(m), m.meta)}/${m.meta})`, ['Pode deixar!', 'Me conta sobre a vila', 'E as relíquias?']);
  if (o === 1) await diz('A praça é o coração da vila. De noite os postes acendem e fica uma belezura. Ah, e todo dia aparecem brilhinhos novos no chão. Cave todos!');
  if (o === 2) await diz('Dizem que existem doze relíquias lendárias escondidas: no fundo do lago, no mar, enterradas, nos galhos... Cada uma tem um poder. Coloque na mão pela mochila e aperte B!');
}
async function valor(pede, texto, max) {
  const ops = [100, 500, 1000].filter((v) => v <= max), o = await pede(texto, [...ops.map((v) => v + ' 🐟'), `Tudo (${max} 🐟)`, 'Deixa pra lá']);
  return o < ops.length ? ops[o] : o === ops.length ? max : 0;
}
async function papoBanco(diz, pede) {
  for (;;) {
    const o = await pede(`Banco da Vila, às ordens. Na conta: ${estado.banco} 🐟. No bolso: ${estado.moedas} 🐟. A conta rende 3% por dia.`, ['Depositar', 'Sacar', 'Só olhando']);
    if (o === 0) { if (!estado.moedas) { await diz('Seu bolso está vazio. Acontece com os melhores gatos.'); continue; } const v = await valor(pede, 'Quanto quer depositar?', estado.moedas); if (v) { estado.moedas -= v; estado.banco += v; som.moeda(); hud(); await diz(`Depositado! ${v} sardinhas bem guardadinhas no cofre.`); } }
    else if (o === 1) { if (!estado.banco) { await diz('A conta está zerada. Mas o cofre continua lindo, não acha?'); continue; } const v = await valor(pede, 'Quanto quer sacar?', estado.banco); if (v) { estado.banco -= v; estado.moedas += v; som.moeda(); hud(); await diz(`Aqui estão suas ${v} sardinhas. Gaste com juízo.`); } }
    else { await diz('Volte sempre. O cofre sente sua falta.'); return; }
  }
}
async function papoMuseu(diz, pede, n) {
  const o = await pede(`Bem-vindo ao museu! Já temos ${estado.museu.length} de 25 peças em exposição. Tem algo para doar?`, ['Quero doar', 'O que você aceita?', 'Só visitando']);
  if (o === 1) { await diz('Peixes de todas as espécies, conchas, estrelas-do-mar, fósseis e — sonho meu — relíquias lendárias! Cada peça vai para um pedestal com plaquinha.'); return; }
  if (o !== 0) return;
  const ok = (id) => ['peixe', 'reliquia'].includes(ITENS[id].tipo) || ['concha', 'estrela_mar', 'fossil'].includes(id);
  const ids = Object.keys(estado.inv).filter((id) => ok(id) && !estado.museu.includes(id));
  const i = await lista('Doar ao museu', ids.map((id) => ({ icone: ITENS[id].icone, nome: ITENS[id].nome, desc: ITENS[id].tipo === 'reliquia' ? 'Você pode usar o poder antes de doar. Doando, ela fica no pedestal.' : ITENS[id].desc, direita: 'doar' })), 'Você não tem nada novo para o museu. Pesque espécies diferentes!');
  if (i < 0) return;
  const id = ids[i]; tirar(id); estado.museu.push(id); estado.cont.doacoes++; gesto(n.pers, 'comemorar'); n.pers.gato.humor('feliz'); ganhar(120); som.vitoria();
  await diz(`Magnífico! Um(a) ${ITENS[id].nome} para a coleção! Tome 120 sardinhas de gratidão. Saia e entre de novo para ver no pedestal.`);
  if (estado.museu.length === 6 && !estado.relVistas.includes('sino_fortuna')) { await diz('Seis peças! Você merece algo especial. Encontrei isto no porão do museu. É dourado e faz um barulho... próspero.'); dar('sino_fortuna'); await mostrarAchado('sino_fortuna'); }
  checarMissao();
}
async function papoRoupas(diz, pede) {
  const o = await pede('Bonjour, querido! Esse terno é um arraso, mas falta um toque final. Um chapéu, talvez?', ['Ver chapéus', 'Tirar o que estou usando', 'Só olhando']);
  if (o === 1) { estado.chapeu = null; vestir(eu.pers, null); await diz('Prontinho. Cabeça livre, leve e solta.'); return; }
  if (o !== 0) return;
  for (;;) {
    const ids = Object.keys(ITENS).filter((id) => ITENS[id].tipo === 'chapeu');
    const i = await lista('🎩 Bigode & Laço', ids.map((id) => ({ icone: ITENS[id].icone, nome: ITENS[id].nome, desc: ITENS[id].desc, direita: tem(id) ? (estado.chapeu === id ? 'usando' : 'vestir') : ITENS[id].preco + ' 🐟', off: !tem(id) && estado.moedas < ITENS[id].preco })));
    if (i < 0) break; const id = ids[i];
    if (!tem(id)) { estado.moedas -= ITENS[id].preco; dar(id); som.moeda(); }
    estado.chapeu = id; vestir(eu.pers, id); hud(); gesto(eu.pers, 'girar'); await diz('Magnifique! Ficou a sua cara.');
  }
}
async function comprar(titulo, ids) {
  for (;;) {
    const i = await lista(titulo, ids.map((id) => ({ icone: ITENS[id].icone, nome: ITENS[id].nome, desc: ITENS[id].desc, direita: ITENS[id].preco + ' 🐟', off: estado.moedas < ITENS[id].preco || (id === 'vara' && tem('vara')) })));
    if (i < 0) return; const id = ids[i]; estado.moedas -= ITENS[id].preco; dar(id); som.moeda(); hud(); toast(`Comprou ${ITENS[id].icone} ${ITENS[id].nome}`);
  }
}
async function vender(titulo, filtro, mult) {
  for (;;) {
    const ids = Object.keys(estado.inv).filter(filtro);
    const total = ids.reduce((s, id) => s + Math.round(ITENS[id].preco * mult) * tem(id), 0);
    const itens = ids.map((id) => ({ icone: ITENS[id].icone, nome: `${ITENS[id].nome} ×${tem(id)}`, desc: 'Vender um', direita: '+' + Math.round(ITENS[id].preco * mult) + ' 🐟' }));
    if (ids.length > 1) itens.unshift({ icone: '💰', nome: 'Vender tudo', desc: 'Tudo o que está na lista', direita: '+' + total + ' 🐟' });
    const i = await lista(titulo, itens, 'Você não tem nada para vender agora.');
    if (i < 0) return;
    if (ids.length > 1 && i === 0) { for (const id of ids) tirar(id, tem(id)); ganhar(total); som.moeda(); toast(`+${total} 🐟`); return; }
    const id = ids[ids.length > 1 ? i - 1 : i]; tirar(id); ganhar(Math.round(ITENS[id].preco * mult)); som.moeda();
  }
}
async function papoLoja(diz, pede, oi, ids, filtro, mult, fraseVenda) {
  const o = await pede(oi, ['Comprar', 'Vender', 'Só olhando']);
  if (o === 0) await comprar('Comprar', ids); else if (o === 1) { await diz(fraseVenda); await vender('Vender', filtro, mult); }
  await diz('Volte sempre!');
}
async function papoCafe(diz, pede) {
  const o = await pede('Bem-vindo ao Café Ronrom! Um cafezinho pra acordar o bigode ou uma fofoca fresquinha?', ['Um cafezinho (50 🐟)', 'Conta a fofoca', 'Só o cheirinho']);
  if (o === 0) { if (estado.moedas < 50) return diz('Ih, faltou sardinha. Fica pra próxima, tá?'); estado.moedas -= 50; hud(); som.moeda(); await diz('Saindo um cafezinho no capricho!'); await comer('cafe', true); }
  else if (o === 1) await diz(pick(DICAS_CAFE));
}
async function papoMedica(diz, pede, n) {
  const o = await pede('Olá! Sou a Dra. Mel. Deixa eu ver... bigodes alinhados, cauda balançando. Tudo ótimo! Precisa de alguma coisa?', ['Uma vitamina, por favor', 'Estou meio tonto', 'Só uma visita']);
  if (o === 0) { if (estado.vitamina === estado.dia) return diz('Já tomou a de hoje! Uma por dia, senão o gato vira foguete.'); estado.vitamina = estado.dia; n.pers.gato.humor('feliz'); await diz('Aqui está: vitamina de atum com mel. De graça, uma por dia.'); await comer('vitamina', true); }
  else if (o === 1) { gesto(n.pers, 'carinho_ele'); await diz('Prontinho, um cafuné medicinal. É o tratamento mais eficaz que a ciência felina conhece.'); eu.pers.gato.humor('apaixonada'); depois(2.5, () => eu.pers.gato.humor('normal')); }
  else await diz('Visitas fazem bem à saúde. Volte sempre!');
}
async function comer(id, gratis) {
  const it = ITENS[id]; if (!gratis) { if (!tem(id)) return; tirar(id); }
  gesto(eu.pers, 'comer'); som.pegar(); const ef = it.efeito || 'veloz', dur = it.dur || 45;
  estado.efeitos[ef] = Math.max(estado.efeitos[ef] || 0, dur);
  toast(`${it.icone} ${ef === 'veloz' ? 'Patas ligeiras' : ef === 'pesca' ? 'Sorte de pescador' : 'Sorte grande'} por ${dur >= 60 ? Math.round(dur / 60) + ' min' : dur + ' s'}!`);
  fx.explosao({ x: eu.x, y: 1.6, z: eu.z }, { n: 12, cores: ['#ffd166', '#ffffff'], vel: 1.5, cima: 2, tam: 0.22, vida: 0.8, grav: 2 });
}

// =====================================================================================
// coisas pelo chão: itens soltos, brilhos, árvores, flores
// =====================================================================================
function soltar(id, x, z, o = {}) {
  const moeda = id === 'moeda', m = moeda ? new THREE.Group() : modeloItem(id);
  if (moeda) { const c = malha(gCil(0.26, 0.26, 0.07, 14), M('#f7c948', { emissive: '#c98a00', emissiveIntensity: 0.5 }), 0, 0, 0, m); c.rotation.x = Math.PI / 2; }
  else m.scale.multiplyScalar(0.8);
  m.traverse((q) => { if (q.isMesh) q.castShadow = true; });
  const de = o.de || { x, y: 0.3, z }; m.position.set(de.x, de.y, de.z); cena.add(m);
  const d = { m, id, valor: o.valor || 0, x, z, de, t: 0, dur: o.dur || 0, alt: o.alt ?? 1.6, chao: !o.dur, vida: o.vida || 1e9, fixo: o.fixo, atraso: o.atraso || 0, yChao: moeda ? 0.32 : 0.28 };
  if (d.chao) m.position.set(x, d.yChao, z); if (d.atraso) m.visible = false;
  drops.push(d); return d;
}
function atualizarDrops(dt) {
  for (let i = drops.length - 1; i >= 0; i--) {
    const d = drops[i];
    if (d.atraso > 0) { d.atraso -= dt; if (d.atraso <= 0) d.m.visible = true; continue; }
    if (!d.chao) { d.t += dt; const k = Math.min(1, d.t / d.dur); d.m.position.set(lerp(d.de.x, d.x, k), lerp(d.de.y, d.yChao, k * k) + Math.sin(k * Math.PI) * d.alt, lerp(d.de.z, d.z, k)); d.m.rotation.y += dt * 8;
      if (k >= 1) { d.chao = true; d.t = 0; fx.explosao({ x: d.x, y: 0.1, z: d.z }, { n: 5, cores: [area.areia ? '#f6e3b0' : '#b6ec8b'], vel: 1.4, cima: 1.2, tam: 0.16, vida: 0.4 }); } continue; }
    d.t += dt; d.vida -= dt; d.m.rotation.y += dt * (d.id === 'moeda' ? 4 : 1.2); d.m.position.y = d.yChao + Math.abs(Math.sin(d.t * 3)) * 0.08;
    if (d.vida < 3) d.m.visible = Math.floor(d.vida * 8) % 2 === 0;
    const pega = Math.hypot(d.x - eu.x, d.z - eu.z) < 1.0 * Math.max(1, eu.esc * 0.8) && eu.y < 1.2 && d.t > 0.25 && !ocupado;
    if (pega || d.vida <= 0) {
      if (pega) { if (d.id === 'moeda') { ganhar(d.valor); som.moeda(); toast(`+${d.valor} 🐟`); } else { dar(d.id); som.pegar(); toast(`+1 ${ITENS[d.id].icone} ${ITENS[d.id].nome}`); if (d.fixo !== undefined && estado.conchas) estado.conchas[d.fixo] = null; }
        fx.explosao({ x: d.x, y: 0.6, z: d.z }, { n: 8, cores: ['#ffe66d', '#ffffff'], vel: 1.6, cima: 2, tam: 0.2, vida: 0.5, grav: 3 }); }
      cena.remove(d.m); drops.splice(i, 1);
    }
  }
}
function criarBrilho(x, z) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: brilhoTex(), color: '#fff3a0', transparent: true, depthWrite: false })); s.position.set(x, 0.25, z); s.scale.setScalar(0.9); cena.add(s); brilhos.push({ x, z, s, f: rnd(6) }); }
let _bt = null; function brilhoTex() { if (!_bt) { const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d'); x.fillStyle = '#fff'; x.beginPath(); for (let i = 0; i < 8; i++) { const a = (i / 8) * Math.PI * 2, r = i % 2 ? 7 : 30; x.lineTo(32 + Math.cos(a) * r, 32 + Math.sin(a) * r); } x.fill(); _bt = new THREE.CanvasTexture(c); _bt.userData.fixo = true; } return _bt; }
function atualizarBrilhos(dt) { for (const b of brilhos) { b.f += dt; const k = 0.75 + Math.sin(b.f * 5) * 0.3; b.s.scale.setScalar(k); b.s.material.rotation = b.f * 1.5; b.s.position.y = 0.3 + Math.sin(b.f * 2) * 0.08; if (Math.random() < dt * 5) fx.um(b.x + rnd(-0.4, 0.4), 0.2, b.z + rnd(-0.4, 0.4), 0, rnd(0.8, 1.6), 0, pick(['#fff3a0', '#ffffff']), 0.14, 0.9, -0.2, 0.5); } }
async function cavar(b) {
  eu.yaw = Math.atan2(b.x - eu.x, b.z - eu.z); gesto(eu.pers, 'cavar'); som.cavar();
  for (let i = 0; i < 5; i++) depois(i * 0.25, () => fx.explosao({ x: b.x, y: 0.1, z: b.z }, { n: 7, cores: area.areia ? ['#f6e3b0', '#e2c888'] : ['#a97c50', '#8fd46a'], vel: 2.2, cima: 2.6, tam: 0.2, vida: 0.6 }));
  await new Promise((r) => depois(1.45, r));
  cena.remove(b.s); brilhos.splice(brilhos.indexOf(b), 1); estado.brilhos[area.id] = estado.brilhos[area.id].filter(([x, z]) => x !== b.x || z !== b.z);
  const rel = reliquiaNova(), r = Math.random();
  if (rel && (!estado.primeiroBrilho || r < 0.2 * sorte())) { estado.primeiroBrilho = true; dar(rel); await mostrarAchado(rel); if (estado.relVistas.length === 1) await falar(null, 'Uma relíquia lendária! Abra a mochila 🎒, toque nela e escolha "Pôr na mão". Depois é só apertar B para usar o poder.'); }
  else if (r < 0.55) { const v = Math.round(rnd(80, 260) * sorte() / 10) * 10; ganhar(v); som.moeda(); toast(`Você desenterrou ${v} 🐟!`); fx.explosao({ x: b.x, y: 0.4, z: b.z }, { n: 16, cores: ['#f7c948', '#ffe66d'], vel: 2.4, cima: 3.4, tam: 0.24, vida: 0.9 }); }
  else { const id = r < 0.72 ? 'fossil' : r < 0.86 ? (area.areia ? 'estrela_mar' : 'semente') : 'bolo'; dar(id); await mostrarAchado(id, 'Você desenterrou'); }
}
function sacudir(a, deLonge) {
  if (a.sac > 0) return; a.sac = 1; som.farfalhar(); estado.cont.arvores++; checarMissao();
  const palma = a.tipo === 'palma', topo = { x: a.x, y: palma ? 4 : 2.8, z: a.z };
  fx.explosao(topo, { n: 14, cores: a.tipo === 'pinho' ? ['#4a9e6b'] : ['#68c96a', '#8fd46a', '#b6ec8b'], vel: 2.2, cima: 0.6, tam: 0.26, vida: 1.5, grav: 1.6, arr: 2, raio: 1 });
  const cai = (id, o = {}) => { const ang = deLonge ? rnd(Math.PI * 2) : Math.atan2(eu.z - a.z, eu.x - a.x) + rnd(-1.1, 1.1), r = rnd(1.3, 2.1); soltar(id, a.x + Math.cos(ang) * r, a.z + Math.sin(ang) * r, { de: { x: a.x + Math.cos(ang) * 0.8, y: topo.y - 0.4, z: a.z + Math.sin(ang) * 0.8 }, dur: 0.55, alt: 0.5, atraso: 0.25 + rnd(0.2), ...o }); };
  if (a.tem) { a.tem = false; a.frutas.forEach((f) => (f.visible = false)); for (let i = 0; i < 3; i++) cai(a.fruta); const i = area.arvores.indexOf(a); (estado.semFrutas[area.id] = estado.semFrutas[area.id] || []).push(i); }
  else { const r = Math.random(), rel = reliquiaNova(); if (rel && r < 0.035 * sorte()) depois(0.5, () => cenaJogo(async () => { dar(rel); await mostrarAchado(rel); })); else if (r < 0.3 * sorte()) cai('moeda', { valor: Math.round(rnd(20, 70) / 10) * 10, vida: 40 }); }
}
function atualizarArvores(dt) {
  for (const a of area.arvores) { if (Math.abs(a.x - eu.x) > 30 || Math.abs(a.z - eu.z) > 26) continue;
    const vento = Math.sin(tempo * 0.9 + a.fase) * 0.02; if (a.sac > 0) { a.sac = Math.max(0, a.sac - dt * 1.1); a.g.rotation.z = vento + Math.sin(a.sac * 34) * 0.085 * a.sac; a.g.rotation.x = Math.cos(a.sac * 29) * 0.05 * a.sac; } else { a.g.rotation.z = vento; a.g.rotation.x = 0; } }
}
function plantar() {
  if (!area.fora) return toast('Flores gostam de sol. Plante lá fora!');
  const x = eu.x + Math.sin(eu.yaw) * 0.9, z = eu.z + Math.cos(eu.yaw) * 0.9;
  if (!livre(x, z, 0.3)) return toast('Aqui não dá para plantar.');
  tirar('semente'); const c = pick(['#ff6b8b', '#ffd166', '#ffffff', '#c77dff', '#ff9f1c', '#4cc9f0', '#f72585']);
  estado.flores.push({ a: area.id, x: +x.toFixed(2), z: +z.toFixed(2), c }); if (estado.flores.length > 150) estado.flores.shift();
  brotar(x, z, c); gesto(eu.pers, 'cavar', 0.8); som.pop(); estado.cont.flores++; checarMissao();
}
function brotar(x, z, c, atraso = 0) { const f = flor(area.raiz, x, z, c, 0.001), tot = 0.7 + atraso; animar(tot, (k) => { const e = clamp((k * tot - atraso) / 0.7, 0, 1), u = e - 1; f.scale.setScalar(Math.max(0.001, 1 + 2.7 * u * u * u + 1.7 * u * u)); }, () => f.scale.setScalar(1)); return f; }

// =====================================================================================
// pesca
// =====================================================================================
let pesca = null; const varaM = vara(), boiaM = boia(); varaM.rotation.order = 'YXZ'; varaM.visible = boiaM.visible = false; cena.add(varaM, boiaM);
const linha = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()]), new THREE.LineBasicMaterial({ color: '#ffffff' })); linha.visible = false; linha.frustumCulled = false; cena.add(linha);
function aguaPerto() {
  const naPonte = sobrePonte(eu.x, eu.z);
  for (const a of area.aguas) {
    if (a.tipo === 'circ') { const dx = eu.x - a.x, dz = eu.z - a.z, d = Math.hypot(dx, dz) || 1; if (d > a.r + 2.4) continue;
      if (d > a.r - 0.4) { const rr = Math.max(0, a.r - 2.0); return { x: a.x + (dx / d) * rr, z: a.z + (dz / d) * rr, local: a.local }; }
      const k = Math.min(3.2, d * 0.8); return { x: eu.x - (dx / d) * k, z: eu.z - (dz / d) * k, local: a.local }; }
    if (a.tipo === 'mar') { if (eu.z < a.z - 2.6) continue;
      if (naPonte && eu.z > a.z + 0.5) { if (eu.z > 14.6 && Math.abs(Math.sin(eu.yaw)) < 0.75) return { x: eu.x, z: eu.z + 3.6, local: a.local }; const s = Math.sin(eu.yaw) >= 0 ? 1 : -1; return { x: eu.x + s * 3.6, z: eu.z + 0.4, local: a.local }; }
      let x = eu.x; const p = area.pontes[0]; if (p && Math.abs(x - p.ax) < 2.4) x = p.ax + (x < p.ax ? -2.6 : 2.6); return { x, z: a.z + 2.6, local: a.local }; }
  }
  return null;
}
function comecarPesca(alvo) {
  if (pesca || ocupado) return; mover(eu.pers, 'parado');
  eu.yaw = Math.atan2(alvo.x - eu.x, alvo.z - eu.z); eu.pers.gato.acao('pescar'); eu.pers.modoAnim = 'gesto'; eu.pers.gestoAte = 1e9;
  const comIsca = tem('isca') > 0; if (comIsca) tirar('isca');
  const rapido = estado.efeitos.pesca > 0 || estado.mao === 'coroa_peixes';
  pesca = { alvo, t: 0, fase: 'lancando', espera: rapido ? rnd(0.7, 1.6) : comIsca ? rnd(1.4, 3) : rnd(2.6, 6.2), janela: 0, belisca: rnd(0.8, 2), isca: comIsca, raro: (comIsca ? 1.8 : 1) * (estado.mao === 'coroa_peixes' ? 2.5 : 1) * sorte() };
  varaM.visible = true; som.lancar();
}
function cancelarPesca(silencio) {
  if (!pesca) return; pesca = null; varaM.visible = boiaM.visible = linha.visible = false; $('exclama').style.display = 'none';
  if (eu.pers) { eu.pers.gato.parar(0.25); eu.pers.modoAnim = 'parado'; eu.pers.gestoAte = 0; }
  if (!silencio) som.pop();
}
function sortearPeixe(local, raro) {
  const tab = PEIXES[local].map(([id, p]) => [id, RAROS.has(id) ? p * raro : p]), tot = tab.reduce((s, [, p]) => s + p, 0); let r = Math.random() * tot;
  for (const [id, p] of tab) { r -= p; if (r <= 0) return id; } return tab[0][0];
}
function apertarPesca() {
  const p = pesca; if (!p) return;
  if (p.fase === 'lancando') return;
  if (p.fase === 'esperando') { toast('Puxou cedo demais... o peixe fugiu.'); som.erro(); cancelarPesca(true); return; }
  if (p.fase === 'fisgou') {
    p.fase = 'puxando'; $('exclama').style.display = 'none'; eu.pers.gato.acao('puxar'); som.splash();
    fx.explosao({ x: p.alvo.x, y: 0.2, z: p.alvo.z }, { n: 22, cores: ['#ffffff', '#bde0fe', '#8ecae6'], vel: 2.6, cima: 4, tam: 0.24, vida: 0.8, grav: 9 });
    const rel = reliquiaNova(), id = rel && Math.random() < 0.075 * p.raro ? rel : sortearPeixe(p.alvo.local, p.raro);
    const m = modeloItem(id); m.position.set(p.alvo.x, 0.2, p.alvo.z); cena.add(m); boiaM.visible = false; linha.visible = false;
    const de = { x: p.alvo.x, z: p.alvo.z };
    animar(0.6, (k) => { m.position.set(lerp(de.x, eu.x, k), 0.2 + Math.sin(k * Math.PI) * 3 + k * 2.2, lerp(de.z, eu.z, k)); m.rotation.z = k * 9; }, () => {
      cena.remove(m); pesca = null; varaM.visible = false;
      cenaJogo(async () => { dar(id); if (ITENS[id].tipo === 'peixe') { estado.cont.peixes++; checarMissao(); } await mostrarAchado(id, ITENS[id].tipo === 'tralha' ? 'Você pescou... isso' : 'Você pescou'); });
    });
  }
}
const _v = new THREE.Vector3(), _v2 = new THREE.Vector3();
function atualizarPesca(dt) {
  const p = pesca; if (!p) return; p.t += dt;
  if (p.fase !== 'puxando' && (Math.abs(joy.x) + Math.abs(joy.y) > 0.5 || ['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].some((k) => teclas.has(k))) && p.t > 0.9) { cancelarPesca(); return; }
  // vara na mão
  const mao = eu.pers.no('antebraco_dir'); mao.getWorldPosition(_v); varaM.position.copy(_v); varaM.position.y -= 0.12 * eu.esc; varaM.scale.setScalar(eu.esc);
  const t = p.t, inc = t < 0.4 ? lerp(0.2, -0.95, sm(t / 0.4)) : lerp(-0.95, 0.85, sm((t - 0.4) / 0.28));
  varaM.rotation.set(inc + (p.fase === 'puxando' ? -1.1 * sm(Math.min(1, (p.tp = (p.tp || 0) + dt) / 0.3)) : Math.sin(t * 1.8) * 0.03), eu.yaw, 0);
  varaM.updateMatrixWorld(true); const ponta = varaM.localToWorld(_v2.set(0, PONTA_VARA, 0));
  if (p.fase === 'lancando') {
    if (t > 0.55) { boiaM.visible = true; linha.visible = true; const k = Math.min(1, (t - 0.55) / 0.5); boiaM.position.set(lerp(ponta.x, p.alvo.x, k), lerp(ponta.y, 0.1, k) + Math.sin(k * Math.PI) * 1.6, lerp(ponta.z, p.alvo.z, k));
      if (k >= 1) { p.fase = 'esperando'; p.t0 = t; som.splash(); fx.explosao({ x: p.alvo.x, y: 0.15, z: p.alvo.z }, { n: 10, cores: ['#ffffff', '#bde0fe'], vel: 1.5, cima: 2.2, tam: 0.18, vida: 0.5, grav: 8 }); } }
  } else if (p.fase === 'esperando') {
    const e = t - p.t0; let dy = Math.sin(t * 2.4) * 0.03;
    p.belisca -= dt; if (p.belisca < 0.25 && p.belisca > 0) dy -= Math.sin((0.25 - p.belisca) / 0.25 * Math.PI) * 0.09; if (p.belisca <= 0) { p.belisca = rnd(0.9, 2.2); som.bolha(); }
    boiaM.position.set(p.alvo.x, 0.1 + dy, p.alvo.z);
    if (e > p.espera) { p.fase = 'fisgou'; p.janela = 1.0; som.fisgou(); $('exclama').style.display = 'block'; fx.explosao({ x: p.alvo.x, y: 0.15, z: p.alvo.z }, { n: 12, cores: ['#ffffff'], vel: 1.8, cima: 2.6, tam: 0.18, vida: 0.5, grav: 8 }); }
  } else if (p.fase === 'fisgou') {
    p.janela -= dt; boiaM.position.set(p.alvo.x + rnd(-0.03, 0.03), -0.06 + Math.sin(t * 30) * 0.03, p.alvo.z);
    if (p.janela <= 0) { toast('Ah! Escapou...'); som.erro(); cancelarPesca(true); return; }
    _v.set(eu.x, 2.3 * eu.esc, eu.z).project(camera); const ex = $('exclama'); ex.style.left = ((_v.x + 1) / 2) * innerWidth + 'px'; ex.style.top = ((1 - _v.y) / 2) * innerHeight + 'px';
  }
  if (linha.visible) { const a = linha.geometry.attributes.position, b = boiaM.position; a.setXYZ(0, ponta.x, ponta.y, ponta.z); a.setXYZ(1, (ponta.x + b.x) / 2, (ponta.y + b.y) / 2 - 0.5, (ponta.z + b.z) / 2); a.setXYZ(2, b.x, b.y + 0.1, b.z); a.needsUpdate = true; }
}

// =====================================================================================
// relíquias: os poderes
// =====================================================================================
const espera = {}, bolhas = [];
const CONF = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#c77dff', '#ff924c', '#ffffff'];
function anel(x, z, cor, raio = 6, dur = 0.8) { const m = new THREE.Mesh(gTor(1, 0.06, 6, 40), curvar(new THREE.MeshBasicMaterial({ color: cor, transparent: true }))); m.rotation.x = Math.PI / 2; m.position.set(x, 0.15, z); cena.add(m);
  anims.push({ t0: tempo, dur, f: (k) => { const e = 1 - (1 - k) * (1 - k); m.scale.setScalar(0.3 + e * raio); m.material.opacity = 1 - k; }, fim: () => { cena.remove(m); m.material.dispose(); } }); }
function clarao(f = 0.8) { const c = $('clarao'); c.style.transition = 'none'; c.style.opacity = f; requestAnimationFrame(() => { c.style.transition = 'opacity .5s'; c.style.opacity = 0; }); }
function fogos(x, z, n = 7) {
  for (let i = 0; i < n; i++) depois(i * 0.45 + rnd(0.2), () => {
    const fx0 = x + rnd(-7, 7), fz = z + rnd(-6, 3), alt = rnd(8, 12), cores = [pick(CONF), pick(CONF), '#ffffff']; som.fogo();
    for (let k = 0; k < 14; k++) depois(k * 0.035, () => fx.um(fx0, 0.5 + (alt - 0.5) * (k / 14), fz, rnd(-0.2, 0.2), 1, rnd(-0.2, 0.2), '#fff3b0', 0.2, 0.35, 0, 0));
    depois(0.5, () => { for (let k = 0; k < 80; k++) { const a = rnd(Math.PI * 2), b = Math.acos(rnd(-1, 1)), v = rnd(3.5, 6); fx.um(fx0, alt, fz, Math.sin(b) * Math.cos(a) * v, Math.cos(b) * v, Math.sin(b) * Math.sin(a) * v, pick(cores), rnd(0.25, 0.42), rnd(1.1, 1.8), 2.2, 1.3); } });
  });
}
function festival() { toast('🎉 Grande Festival da Vila dos Gatos!'); usarDisco(18); fogos(eu.x, eu.z - 3, 14); }
function usarDisco(dur = 12) {
  som.festa(true); estado.efeitos.festa = dur; for (const n of npcs) { n.efeito = { tipo: 'danca', t: dur, dur }; n.pers.gato.humor('feliz'); gesto(n.pers, 'dancar'); }
  eu.pers.gato.humor('feliz');
  for (let i = 0; i < dur * 2; i++) depois(i * 0.5, () => { const a = rnd(Math.PI * 2), r = rnd(1, 7); fx.explosao({ x: eu.x + Math.cos(a) * r, y: rnd(3, 5), z: eu.z + Math.sin(a) * r }, { n: 14, cores: CONF, vel: 2, cima: 1, tam: 0.24, vida: 2, grav: 2, arr: 1.5 }); });
  depois(dur, () => { som.festa(false); eu.pers.gato.humor('normal'); });
}
const PODERES = {
  luva_primavera() {
    som.magia(); anel(eu.x, eu.z, '#ffafcc', 6); anel(eu.x, eu.z, '#80ed99', 4, 1.0);
    if (area.fora) for (let i = 0; i < 16; i++) { const a = (i / 16) * Math.PI * 2 + rnd(0.3), r = rnd(1.4, 4.6), x = eu.x + Math.cos(a) * r, z = eu.z + Math.sin(a) * r; if (livre(x, z, 0.2)) brotar(x, z, pick(['#ff6b8b', '#ffd166', '#ffffff', '#c77dff', '#ff9f1c', '#f72585']), r * 0.12); }
    for (let i = 0; i < 4; i++) depois(i * 0.2, () => fx.explosao({ x: eu.x, y: 2.6, z: eu.z }, { n: 22, cores: ['#ffafcc', '#ffc8dd', '#ffffff', '#ffd6a5'], vel: 4.5, cima: 2, tam: 0.26, vida: 2.2, grav: 1.2, arr: 1.6, raio: 1 }));
    for (const n of emVolta(8)) { n.pers.gato.humor('apaixonada'); depois(4, () => { if (!n.efeito) n.pers.gato.humor('normal'); }); }
  },
  carambola_raio() {
    gesto(eu.pers, 'comer'); depois(0.7, () => { som.trovao(); clarao(0.75); estado.efeitos.raio = 25; anel(eu.x, eu.z, '#ffe66d', 5, 0.5); fx.explosao({ x: eu.x, y: 1, z: eu.z }, { n: 40, cores: ['#ffe66d', '#ffffff', '#ffd60a'], vel: 7, cima: 3, tam: 0.26, vida: 0.5, grav: 0, arr: 3 }); });
  },
  novelo_tempo() {
    som.magia(); const h0 = estado.hora; animar(2.4, (k) => { estado.hora = (h0 + 12 * sm(k)) % 24; const a = k * 22; for (let i = 0; i < 2; i++) fx.um(eu.x + Math.cos(a + i * Math.PI) * (0.6 + k * 2.2), 0.3 + k * 4, eu.z + Math.sin(a + i * Math.PI) * (0.6 + k * 2.2), 0, 0.4, 0, pick(['#c77dff', '#9d4edd', '#ffffff']), 0.26, 0.9, 0, 0); }, () => { estado.hora = (h0 + 12) % 24; toast(noiteK() > 0.5 ? '🌙 Anoiteceu num piscar de olhos.' : '☀️ Amanheceu num piscar de olhos.'); });
  },
  capa_nuvem() {
    if (eu.noAr) return false; eu.vy = 12.5; eu.noAr = true; eu.planando = true; som.vento(); gesto(eu.pers, 'comemorar', 4);
    fx.explosao({ x: eu.x, y: 0.3, z: eu.z }, { n: 18, cores: ['#ffffff', '#e8f4ff'], vel: 2.4, cima: 0.6, tam: 0.6, vida: 0.9, grav: 0, arr: 2, modo: 1 });
  },
  sino_fortuna() {
    som.sino(); depois(0.3, () => som.sino()); gesto(eu.pers, 'usar');
    for (let i = 0; i < 24; i++) { const a = rnd(Math.PI * 2), r = rnd(1.5, 7), x = eu.x + Math.cos(a) * r, z = eu.z + Math.sin(a) * r; if (!livre(x, z, 0.4)) continue;
      soltar('moeda', x, z, { de: { x: x + rnd(-1, 1), y: 11, z: z + rnd(-1, 1) }, dur: 0.9, alt: 0, atraso: i * 0.11, valor: Math.round(rnd(20, 60) * sorte() / 10) * 10, vida: 26 }); }
    fx.explosao({ x: eu.x, y: 3, z: eu.z }, { n: 30, cores: ['#f7c948', '#ffe66d', '#ffffff'], vel: 3, cima: 4, tam: 0.24, vida: 1.2, grav: 4 });
  },
  varinha_bolhas() {
    gesto(eu.pers, 'usar');
    for (let i = 0; i < 7; i++) depois(0.3 + i * 0.14, () => { som.bolha(); const m = new THREE.Mesh(gEsf(0.5, 16, 12), curvar(new THREE.MeshLambertMaterial({ color: '#d8f3ff', transparent: true, opacity: 0.45, emissive: '#8ecae6', emissiveIntensity: 0.5, depthWrite: false })));
      const a = eu.yaw + rnd(-0.7, 0.7); m.position.set(eu.x + Math.sin(eu.yaw) * 0.8, 1.6 * eu.esc, eu.z + Math.cos(eu.yaw) * 0.8); m.scale.setScalar(0.2); cena.add(m);
      bolhas.push({ m, vx: Math.sin(a) * rnd(1.6, 2.8), vz: Math.cos(a) * rnd(1.6, 2.8), t: 0, vida: rnd(4.5, 6.5), f: rnd(6), s: rnd(0.8, 1.3) }); });
  },
  coroa_peixes() {
    const a = aguaPerto(); if (!a) { toast('🔱 Chegue perto da água para chamar o cardume.'); return false; }
    som.magia(); gesto(eu.pers, 'usar'); anel(a.x, a.z, '#48cae4', 5);
    const ids = PEIXES[a.local].map(([id]) => id).filter((id) => ITENS[id].tipo === 'peixe');
    for (let i = 0; i < 9; i++) depois(0.3 + i * 0.3, () => { const m = peixe(pick(ids)), x0 = a.x + rnd(-2.5, 2.5), z0 = a.z + rnd(-1.5, 2.5), dx = rnd(-2, 2), alt = rnd(2, 3.6); m.position.set(x0, 0, z0); cena.add(m); som.splash();
      fx.explosao({ x: x0, y: 0.2, z: z0 }, { n: 10, cores: ['#ffffff', '#bde0fe'], vel: 1.8, cima: 3, tam: 0.2, vida: 0.6, grav: 8 });
      animar(1.0, (k) => { m.position.set(x0 + dx * k, Math.sin(k * Math.PI) * alt, z0); m.rotation.z = (0.5 - k) * 2.4 * Math.sign(dx || 1); m.rotation.y = dx < 0 ? Math.PI : 0; }, () => { cena.remove(m); fx.explosao({ x: x0 + dx, y: 0.2, z: z0 }, { n: 8, cores: ['#ffffff', '#bde0fe'], vel: 1.5, cima: 2.4, tam: 0.18, vida: 0.5, grav: 8 }); }); });
    depois(3.2, () => { const id = sortearPeixe(a.local, 2); soltar(id, eu.x + Math.sin(eu.yaw) * 1.3, eu.z + Math.cos(eu.yaw) * 1.3, { de: { x: a.x, y: 0.2, z: a.z }, dur: 0.8, alt: 3 }); estado.cont.peixes++; checarMissao(); });
  },
  lanterna_vagalumes() {
    som.magia(); gesto(eu.pers, 'usar'); estado.efeitos.vagalumes = 40;
    if (area.fora && brilhos.length < 6) { const p = pontoLivre(1); if (p) { estado.brilhos[area.id].push(p); criarBrilho(p[0], p[1]); } }
    toast(area.fora ? `🏮 ${brilhos.length} tesouro(s) escondido(s) por aqui. Olhe o mapa!` : '🏮 Os vagalumes dançam em volta de você.');
  },
  flauta_vento() {
    som.vento(); gesto(eu.pers, 'usar'); anel(eu.x, eu.z, '#caf0f8', 12, 1.2);
    for (let i = 0; i < 60; i++) depois(i * 0.02, () => { const a = rnd(Math.PI * 2), r = rnd(1, 9); fx.um(eu.x + Math.cos(a) * r, rnd(0.3, 3), eu.z + Math.sin(a) * r, -Math.sin(a) * 6, rnd(0.5, 2), Math.cos(a) * 6, pick(['#b6ec8b', '#68c96a', '#ffffff', '#caf0f8']), 0.24, 1.3, 0.5, 0.8); });
    area.arvores.forEach((a) => { const d = Math.hypot(a.x - eu.x, a.z - eu.z); if (d < 15) depois(0.2 + d * 0.06, () => sacudir(a, true)); });
    for (const n of emVolta(9)) { n.efeito = { tipo: 'tonta', t: 3, dur: 3 }; n.pers.gato.humor('tonta'); gesto(n.pers, 'girar'); }
  },
  disco_dourado() { som.magia(); usarDisco(12); },
  biscoito_gigante() { gesto(eu.pers, 'comer'); depois(0.8, () => { som.grande(); estado.efeitos.gigante = 20; eu.escAlvo = 2.4; anel(eu.x, eu.z, '#d9a066', 6); for (const n of emVolta(9)) { n.pers.gato.humor('surpresa'); gesto(n.pers, 'susto'); depois(3, () => { if (!n.efeito) n.pers.gato.humor('normal'); }); } }); },
  estrela_bolso() { gesto(eu.pers, 'usar'); som.magia(); fogos(eu.x, eu.z - 2, 9); for (const n of emVolta(14)) depois(1.2, () => { n.pers.gato.humor('feliz'); gesto(n.pers, 'palmas'); depois(4, () => { if (!n.efeito) n.pers.gato.humor('normal'); }); }); },
};
function atualizarBolhas(dt) {
  for (let i = bolhas.length - 1; i >= 0; i--) {
    const b = bolhas[i]; b.t += dt; const k = Math.min(1, b.t / 0.5); b.m.scale.setScalar(b.s * (0.2 + 0.8 * k) * (1 + Math.sin(b.t * 6 + b.f) * 0.05));
    b.vx *= Math.exp(-0.5 * dt); b.vz *= Math.exp(-0.5 * dt); b.m.position.x += (b.vx + Math.sin(b.t * 2 + b.f) * 0.5) * dt; b.m.position.z += (b.vz + Math.cos(b.t * 1.7 + b.f) * 0.5) * dt; b.m.position.y += (0.35 + Math.sin(b.t * 3 + b.f) * 0.3) * dt;
    let estourou = b.t > b.vida;
    for (const n of npcs) if (!n.efeito && !n.fixo && Math.hypot(n.x - b.m.position.x, n.z - b.m.position.z) < 1.0 && b.m.position.y < 3) {
      n.efeito = { tipo: 'bolha', t: 5, dur: 5 }; n.pers.gato.humor('surpresa'); gesto(n.pers, 'susto'); depois(1.2, () => { if (n.efeito) { n.pers.gato.humor('feliz'); gesto(n.pers, 'balancar', 3.4); } });
      n.bolhaM = b.m; b.m.material.opacity = 0.38; bolhas.splice(i, 1); som.bolha(); estourou = null; break; }
    if (estourou) { fx.explosao(b.m.position, { n: 8, cores: ['#d8f3ff', '#ffffff'], vel: 2, cima: 0.5, tam: 0.16, vida: 0.4, grav: 1 }); cena.remove(b.m); b.m.material.dispose(); bolhas.splice(i, 1); som.bolha(); }
  }
}

// =====================================================================================
// botões A e B
// =====================================================================================
let alvoA = null;
function acharAlvo() {
  if (ocupado || pesca || emTransicao || eu.noAr) return null;
  let melhor = null, md = 1e9; const tenta = (o, d, bonus = 0) => { if (d - bonus < md) { md = d - bonus; melhor = o; } };
  for (const n of npcs) { if (n.efeito) continue; const d = Math.hypot(n.x - eu.x, n.z - eu.z); if (d < (n.fixo ? 2.9 : 2.3)) tenta({ tipo: 'npc', n, rotulo: 'Falar' }, d, 0.6); }
  for (const i of area.interacoes) { if (i.auto) continue; const d = Math.hypot(i.x - eu.x, i.z - eu.z); if (d < i.r) tenta(i, d, i.prio || 0); }
  for (const b of brilhos) { const d = Math.hypot(b.x - eu.x, b.z - eu.z); if (d < 1.5) tenta({ tipo: 'brilho', b, rotulo: 'Cavar' }, d, 0.5); }
  for (const a of area.arvores) { const d = Math.hypot(a.x - eu.x, a.z - eu.z); if (d < 1.75 * Math.max(1, eu.esc * 0.7)) tenta({ tipo: 'arvore', a, rotulo: 'Sacudir' }, d); }
  if (!melhor && tem('vara')) { const a = aguaPerto(); if (a) melhor = { tipo: 'pesca', a, rotulo: 'Pescar' }; }
  return melhor;
}
function apertarA() {
  if (!eu.pers) return;
  if (dlg.ativo) return avancarDialogo();
  if (painelAberto) return;
  if (cartaoRes) return fecharCartao();
  if (pesca) return apertarPesca();
  if (ocupado || emTransicao) return;
  const a = alvoA = acharAlvo();
  if (!a) { if (!eu.noAr) { if (!tem('vara') && aguaPerto()) toast('Você precisa de uma vara de pescar. A Prefeita ou o Seu Tico podem ajudar.'); else { gesto(eu.pers, 'pular'); som.pop(); } } return; }
  switch (a.tipo) {
    case 'npc': cenaJogo(() => conversar(a.n)); break;
    case 'porta': irPara(a.destino, 'porta'); break;
    case 'placa': cenaJogo(() => falar(null, a.texto)); break;
    case 'avisos': cenaJogo(async () => { const m = MISSOES[estado.missao]; await falar('Quadro de avisos', m ? `Pedido da Prefeita: "${m.titulo}". ${m.texto}` : 'A Prefeita agradece ao herói de terno por tudo!'); await falar('Quadro de avisos', pick(['Procura-se: a outra bota. Tratar com Mingau.', 'Aula de dança na praça toda noite. Traga seu disco dourado.', 'Achou um brilho no chão? Cave! Achado não é roubado.', 'Vende-se: nada. Mas o Seu Tico compra tudo.'])); }); break;
    case 'brilho': cenaJogo(() => cavar(a.b)); break;
    case 'arvore': eu.yaw = Math.atan2(a.a.x - eu.x, a.a.z - eu.z); gesto(eu.pers, 'sacudir_arvore'); depois(0.2, () => sacudir(a.a)); break;
    case 'cama': cenaJogo(dormir); break;
    case 'pesca': comecarPesca(a.a); break;
  }
}
function apertarB() {
  if (!eu.pers || dlg.ativo || painelAberto || cartaoRes || ocupado || emTransicao) return;
  if (pesca) return cancelarPesca();
  const id = estado.mao;
  if (!id || !tem(id)) return toast('Sua mão está vazia. Abra a mochila 🎒 e ponha algo na mão.');
  const it = ITENS[id];
  if (it.tipo === 'semente') return plantar();
  if (id === 'vara') { const a = aguaPerto(); return a ? comecarPesca(a) : toast('Chegue perto da água para pescar.'); }
  if (it.tipo === 'reliquia') {
    if ((espera[id] || 0) > tempo) { som.erro(); return toast(`${it.icone} Recarregando... ${Math.ceil(espera[id] - tempo)} s`); }
    if (PODERES[id]() === false) return; espera[id] = tempo + it.espera; espera['_' + id] = it.espera;
  }
}
async function dormir() {
  const o = await perguntar(null, 'Sua caminha quentinha. Dormir até amanhã de manhã?', ['Dormir 😴', 'Ainda não']); if (o !== 0) return;
  som.dormir(); emTransicao = true; await iris(false, 0.8); novoDia(); estado.hora = 7; luzes(true); await new Promise((r) => setTimeout(r, 700)); await iris(true, 0.8); emTransicao = false;
  eu.pers.gato.humor('feliz'); gesto(eu.pers, 'espreguicar'); toast(`☀️ Bom dia! Dia ${estado.dia} na Vila dos Gatos.`); depois(3, () => eu.pers.gato.humor('normal'));
}
function novoDia() {
  estado.dia++; if (estado.banco > 0) { const j = Math.min(600, Math.round(estado.banco * 0.03)); if (j) { estado.banco += j; toast(`🏦 Sua conta rendeu ${j} 🐟.`); } }
  estado.semFrutas = {}; estado.brilhos = {}; estado.conchas = null;
  if (area && area.fora) { for (const a of area.arvores) if (a.fruta) { a.tem = true; a.frutas.forEach((f) => (f.visible = true)); } for (const b of brilhos) cena.remove(b.s); brilhos = []; estado.brilhos[area.id] = []; for (let i = 0; i < (area.id === 'vila' ? 5 : 3); i++) { const p = pontoLivre(1); if (p) { estado.brilhos[area.id].push(p); criarBrilho(p[0], p[1]); } } }
  hud(); salvar();
}

// =====================================================================================
// movimento e colisão
// =====================================================================================
function sobrePonte(x, z) { for (const p of area.pontes) { const dx = p.bx - p.ax, dz = p.bz - p.az, l2 = dx * dx + dz * dz, k = clamp(((x - p.ax) * dx + (z - p.az) * dz) / l2, 0, 1); if (Math.hypot(x - (p.ax + dx * k), z - (p.az + dz * k)) < p.larg) return p; } return null; }
function naAgua(x, z) { for (const c of area.colisores) if (c.agua) { if (c.mar ? z > c.z : Math.hypot(x - c.x, z - c.z) < c.r) return true; } return false; }
function resolver(x, z, r, ponte) {
  for (let it = 0; it < 2; it++) for (const c of area.colisores) {
    if (c.agua && ponte) continue;
    if (c.mar) { if (z > c.z - r) z = c.z - r; }
    else if (c.r !== undefined) { const dx = x - c.x, dz = z - c.z, d = Math.hypot(dx, dz), m = c.r + r; if (d < m) { if (d < 1e-4) { x += m; } else { x = c.x + (dx / d) * m; z = c.z + (dz / d) * m; } } }
    else if (x > c.x0 - r && x < c.x1 + r && z > c.z0 - r && z < c.z1 + r) { const a = x - (c.x0 - r), b = c.x1 + r - x, e = z - (c.z0 - r), f = c.z1 + r - z, m = Math.min(a, b, e, f); if (m === a) x = c.x0 - r; else if (m === b) x = c.x1 + r; else if (m === e) z = c.z0 - r; else z = c.z1 + r; }
  }
  const L = area.limites; return [clamp(x, L.x0, L.x1), clamp(z, L.z0, L.z1)];
}
function moverJogador(dt) {
  const p = eu.pers; let mx = joy.x, mz = joy.y;
  if (teclas.has('a') || teclas.has('arrowleft')) mx -= 1; if (teclas.has('d') || teclas.has('arrowright')) mx += 1; if (teclas.has('w') || teclas.has('arrowup')) mz -= 1; if (teclas.has('s') || teclas.has('arrowdown')) mz += 1;
  if (dlg.ativo && dlg.opcoes) mz = 0;
  let l = Math.hypot(mx, mz); const livreP = !ocupado && !pesca && !emTransicao && !dlg.ativo && !painelAberto && !cartaoRes;
  if (!livreP || l < 0.18) l = 0; else if (l > 1) { mx /= l; mz /= l; l = 1; }
  const andando = l > 0 && (l < 0.6 || teclas.has('shift'));
  let v = l === 0 ? 0 : andando ? 2.6 : 5.6; if (estado.efeitos.veloz > 0) v *= 1.3; if (estado.efeitos.raio > 0) v *= 2.1; if (eu.esc > 1.3) v *= 1.25;
  if (l > 0) {
    const antes = sobrePonte(eu.x, eu.z), nx = eu.x + (mx / l) * v * dt, nz = eu.z + (mz / l) * v * dt; let pos;
    const tenta = (x, z) => { const pt = sobrePonte(x, z); if (antes && !pt && naAgua(x, z)) return null; return resolver(x, z, 0.45 * Math.max(1, eu.esc * 0.6), !!pt || eu.y > 1.5); };
    pos = tenta(nx, nz) || tenta(nx, eu.z) || tenta(eu.x, nz) || [eu.x, eu.z];
    if (eu.y <= 1.5 && !sobrePonte(pos[0], pos[1]) && naAgua(pos[0], pos[1])) pos = [eu.x, eu.z];
    for (const n of npcs) { const dx = pos[0] - n.x, dz = pos[1] - n.z, d = Math.hypot(dx, dz); if (d < 0.8 && d > 1e-3 && n.y < 1 && eu.y < 1) { const q = resolver(n.x + (dx / d) * 0.8, n.z + (dz / d) * 0.8, 0.45, !!sobrePonte(pos[0], pos[1])); if (!naAgua(q[0], q[1]) || sobrePonte(q[0], q[1])) pos = q; } }
    eu.x = pos[0]; eu.z = pos[1]; eu.yaw = virar(eu.yaw, Math.atan2(mx, mz), 1 - Math.exp(-14 * dt));
    if (!eu.noAr) { mover(p, andando ? 'andar' : 'correr'); eu.passoT -= dt * (andando ? 1 : 1.5); if (eu.passoT <= 0) { eu.passoT = 0.3; som.passo();
      if (!andando) fx.um(eu.x - Math.sin(eu.yaw) * 0.3, 0.08 + chaoY(), eu.z - Math.cos(eu.yaw) * 0.3, rnd(-0.3, 0.3), 0.5, rnd(-0.3, 0.3), area.areia ? '#f6e3b0' : area.fora ? '#e8f5d8' : '#ffffff', 0.3 * eu.esc, 0.45, 0, 1, 1);
      if (eu.esc > 1.6) { tremor = 0.35; som.pisao(); fx.explosao({ x: eu.x, y: 0.1, z: eu.z }, { n: 10, cores: ['#e8dcc0', '#ffffff'], vel: 3, cima: 1, tam: 0.4, vida: 0.6, grav: 1, modo: 1 }); for (const a of area.arvores) if (Math.hypot(a.x - eu.x, a.z - eu.z) < 3.2) sacudir(a, true); } } }
    if (estado.efeitos.raio > 0 && Math.random() < dt * 40) fx.um(eu.x + rnd(-0.3, 0.3), rnd(0.3, 1.6), eu.z + rnd(-0.3, 0.3), 0, rnd(0, 1), 0, pick(['#ffe66d', '#ffffff', '#ffd60a']), 0.24, 0.4, 0, 0);
  } else if (!eu.noAr) mover(p, 'parado');
  // pulo da Capa de Nuvem
  if (eu.noAr) { eu.vy -= (eu.vy > 0 ? 16 : 3.2) * dt; if (eu.vy < -2.6) eu.vy = -2.6; eu.y += eu.vy * dt;
    if (Math.random() < dt * 22) fx.um(eu.x + rnd(-0.5, 0.5), eu.y + 0.1, eu.z + rnd(-0.5, 0.5), 0, -0.3, 0, '#ffffff', rnd(0.4, 0.7), 0.8, 0, 0, 1);
    if (eu.y <= chaoY() && eu.vy < 0) { if (naAgua(eu.x, eu.z) && !sobrePonte(eu.x, eu.z)) { eu.vy = 6; som.splash(); fx.explosao({ x: eu.x, y: 0.2, z: eu.z }, { n: 20, cores: ['#ffffff', '#bde0fe'], vel: 3, cima: 4, tam: 0.24, vida: 0.7, grav: 9 }); }
      else { eu.noAr = false; eu.y = chaoY(); eu.planando = false; p.gato.parar(0.2); p.modoAnim = 'parado'; fx.explosao({ x: eu.x, y: 0.2, z: eu.z }, { n: 14, cores: ['#ffffff'], vel: 2.5, cima: 0.5, tam: 0.5, vida: 0.6, grav: 0, arr: 2, modo: 1 }); som.pop(); } } }
  else eu.y = lerp(eu.y, chaoY(), 1 - Math.exp(-14 * dt));
  eu.esc = lerp(eu.esc, eu.escAlvo, 1 - Math.exp(-5 * dt));
  p.g.position.set(eu.x, eu.y, eu.z); p.g.rotation.y = eu.yaw; p.g.scale.setScalar(eu.esc); p.gato.atualizar(dt);
  if (cartaoObj) { cartaoObj.position.set(eu.x, eu.y + 2.75 * eu.esc, eu.z); cartaoObj.rotation.y += dt * 1.6; }
  // passagens automáticas (arcos e capachos)
  if (livreP && !eu.noAr) for (const i of area.interacoes) if (i.auto && Math.hypot(i.x - eu.x, i.z - eu.z) < i.r) { irPara(i.destino, i.entrada || area.id); break; }
}
const chaoY = () => (area.alturaPonte && sobrePonte(eu.x, eu.z) && eu.z > 2.6 ? area.alturaPonte : area.id === 'vila' && sobrePonte(eu.x, eu.z) ? 0.4 : 0);

// =====================================================================================
// dia e noite, câmera
// =====================================================================================
const C = (h) => new THREE.Color(h), CEU = { dia: C('#9fe0ff'), tarde: C('#ffc9a0'), noite: C('#6f82d6') }, _c = new THREE.Color();
function noiteK() { const h = estado.hora; return h < 5 ? 1 : h < 7 ? 1 - (h - 5) / 2 : h < 17.5 ? 0 : h < 19.5 ? (h - 17.5) / 2 : 1; }
function tardeK() { const h = estado.hora; return Math.max(0, 1 - Math.abs(h - 18) / 1.6, 1 - Math.abs(h - 6) / 1.3); }
function luzes() {
  if (!area) return; const n = noiteK(), t = tardeK();
  if (area.fora) {
    _c.copy(CEU.dia).lerp(CEU.noite, n).lerp(CEU.tarde, t * 0.75); cena.background.copy(_c); cena.fog.color.copy(_c); cena.fog.near = 55; cena.fog.far = 150;
    hemi.color.set('#ffffff').lerp(C('#c9d2ff'), n * 0.75).lerp(C('#ffd9b8'), t * 0.5); hemi.groundColor.set('#c7ecaa').lerp(C('#a9c4e8'), n * 0.6); hemi.intensity = lerp(1.55, 1.5, n);
    sol.color.set('#fff1d6').lerp(C('#d3dcff'), n).lerp(C('#ffb07a'), t * 0.7); sol.intensity = lerp(1.75, 1.0, n);
    if (estado.efeitos.festa > 0) { _c.setHSL((tempo * 0.5) % 1, 0.7, 0.75); hemi.color.lerp(_c, 0.45); }
    acenderNoite(n);
  } else { cena.background.set(area.fundo); cena.fog.color.set(area.fundo); cena.fog.near = 80; cena.fog.far = 200; hemi.color.set('#fff8ee'); hemi.groundColor.set('#ffe8cc'); hemi.intensity = 1.6; sol.color.set('#fff4e0'); sol.intensity = 1.25; acenderNoite(0.4); }
  som.noite(n > 0.6);
  $('iconeHora').textContent = n > 0.6 ? '🌙' : t > 0.4 ? '🌇' : '☀️';
  const h = Math.floor(estado.hora), m = Math.floor((estado.hora % 1) * 6) * 10; $('hora').textContent = String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}
const camPos = new THREE.Vector3(), camAlvo = new THREE.Vector3();
function camSeguir(jah, dt = 0.016) {
  const ret = innerWidth < innerHeight, g = Math.max(1, eu.esc * 0.75);
  let ax, ay, az, ox, oy, oz;
  if (area.fora) { ax = eu.x; ay = 1.1 + eu.y * 0.6; az = eu.z; ox = 0; oy = (ret ? 19 : 16) * g; oz = (ret ? 19.5 : 18) * g; }
  else { const k = ret ? 1.0 : 0.5; ax = clamp(eu.x * (ret ? 0.85 : 0.5), -area.W / 2 + 2, area.W / 2 - 2); ay = 1.0; az = eu.z * 0.45 + (ret ? 0.6 : 0); ox = 0; oy = (ret ? 15 : 11.5) * g; oz = (ret ? 16.5 : 13.5) * g; }
  const k = jah ? 1 : 1 - Math.exp(-6 * dt);
  camAlvo.x += (ax - camAlvo.x) * k; camAlvo.y += (ay - camAlvo.y) * k; camAlvo.z += (az - camAlvo.z) * k;
  camPos.set(camAlvo.x + ox, camAlvo.y + oy, camAlvo.z + oz);
  camera.position.copy(camPos); if (tremor > 0.001) { camera.position.x += rnd(-1, 1) * tremor; camera.position.y += rnd(-1, 1) * tremor; tremor *= Math.exp(-9 * dt); }
  camera.lookAt(camAlvo); U.dist.value = Math.hypot(oy, oz) + 2;
  sol.position.set(eu.x + 9, 22, eu.z + 7); sol.target.position.set(eu.x, 0, eu.z - 2);
}

// =====================================================================================
// minimapa
// =====================================================================================
function desenharMapa(cv, grande) {
  const x = cv.getContext('2d'), S = cv.width, m = area.mapa, sx = (v) => ((v - m.x0) / (m.x1 - m.x0)) * S, sz = (v) => ((v - m.z0) / (m.z1 - m.z0)) * S, e = S / (m.x1 - m.x0);
  x.fillStyle = m.fundo; x.fillRect(0, 0, S, S); x.textAlign = 'center'; x.textBaseline = 'middle';
  for (const f of m.formas) {
    if (f.t === 'r') { x.fillStyle = f.c; x.fillRect(sx(f.x0), sz(f.z0), (f.x1 - f.x0) * e, (f.z1 - f.z0) * e); }
    else if (f.t === 'c') { x.fillStyle = f.c; x.beginPath(); x.arc(sx(f.x), sz(f.z), f.r * e, 0, 7); x.fill(); }
    else if (f.t === 'p') { x.fillStyle = f.c; x.beginPath(); x.roundRect(sx(f.x0), sz(f.z0), (f.x1 - f.x0) * e, (f.z1 - f.z0) * e, 4 * (S / 248)); x.fill(); x.strokeStyle = '#fff'; x.lineWidth = S / 124; x.stroke();
      x.font = `${(grande ? 4.2 : 5) * e}px system-ui`; x.fillText(f.e, (sx(f.x0) + sx(f.x1)) / 2, (sz(f.z0) + sz(f.z1)) / 2 + e * 0.3);
      if (grande) { x.font = `800 ${2.3 * e}px system-ui`; x.lineWidth = 3; x.strokeStyle = '#fff'; x.fillStyle = '#5a3d22'; const ty = sz(f.z1) + 1.8 * e; x.strokeText(f.n, (sx(f.x0) + sx(f.x1)) / 2, ty); x.fillText(f.n, (sx(f.x0) + sx(f.x1)) / 2, ty); } }
    else if (f.t === 'e') { x.font = `${5 * e}px system-ui`; x.fillText(f.e, sx(f.x), sz(f.z)); }
  }
  if (estado.efeitos.vagalumes > 0 || grande && estado.efeitos.vagalumes > 0) for (const b of brilhos) { x.font = `${4.5 * e}px system-ui`; x.fillText('✨', sx(b.x), sz(b.z)); }
  for (const n of npcs) { x.fillStyle = '#ffd60a'; x.strokeStyle = '#7a5a00'; x.lineWidth = S / 180; x.beginPath(); x.arc(sx(n.x), sz(n.z), 1.3 * e, 0, 7); x.fill(); x.stroke(); }
  x.save(); x.translate(sx(eu.x), sz(eu.z)); x.rotate(-eu.yaw + Math.PI); const t = Math.max(2.3 * e, S / 26); x.fillStyle = '#ff3b5c'; x.strokeStyle = '#fff'; x.lineWidth = S / 110; x.beginPath(); x.moveTo(0, -t); x.lineTo(t * 0.75, t * 0.8); x.lineTo(0, t * 0.4); x.lineTo(-t * 0.75, t * 0.8); x.closePath(); x.fill(); x.stroke(); x.restore();
}

// =====================================================================================
// laço principal
// =====================================================================================
let ultimo = performance.now(), tMapa = 0, tSalvar = 0, tChips = 0;
// se o aparelho estiver sofrendo, alivia sozinho: menos pixels, depois sem sombras
const folga = { soma: 0, n: 0, nivel: 0 };
function medirFolga(dtReal) {
  if (document.hidden || emTransicao) return; folga.soma += dtReal; folga.n++;
  if (folga.n < 150) return; const media = folga.soma / folga.n; folga.soma = 0; folga.n = 0;
  if (media > 1 / 27 && folga.nivel < 3) { folga.nivel++;
    if (folga.nivel === 1) renderer.setPixelRatio(Math.min(devicePixelRatio || 1, 1.25));
    else if (folga.nivel === 2) renderer.setPixelRatio(1);
    else { renderer.shadowMap.enabled = false; sol.castShadow = false; cena.traverse((o) => { if (o.material) [].concat(o.material).forEach((m) => (m.needsUpdate = true)); }); }
    ajustar(); }
}
function quadro(agora) {
  requestAnimationFrame(quadro);
  const dtReal = (agora - ultimo) / 1000, dt = Math.min(0.05, dtReal); ultimo = agora; if (!window.VILA_TESTE) medirFolga(dtReal); if (!area || !eu.pers) return; tempo += dt;
  // relógio
  const h0 = estado.hora; estado.hora += dt / 30; if (estado.hora >= 24) { estado.hora -= 24; novoDia(); toast(`🌙 Meia-noite. Começou o dia ${estado.dia}.`); }
  if (Math.floor(h0 * 6) !== Math.floor(estado.hora * 6) || estado.efeitos.festa > 0) luzes();
  for (const k of Object.keys(estado.efeitos)) if (estado.efeitos[k] > 0) { estado.efeitos[k] -= dt; if (estado.efeitos[k] <= 0) { estado.efeitos[k] = 0; if (k === 'gigante') { eu.escAlvo = 1; som.pop(); } if (k === 'festa') luzes(); } }
  for (let i = tarefas.length - 1; i >= 0; i--) if (tarefas[i].t <= tempo) { const f = tarefas[i].f; tarefas.splice(i, 1); f(); }
  for (let i = anims.length - 1; i >= 0; i--) { const a = anims[i], k = Math.min(1, (tempo - a.t0) / a.dur); a.f(k); if (k >= 1) { anims.splice(i, 1); if (a.fim) a.fim(); } }
  escrever(dt); moverJogador(dt);
  if (!area) return;
  atualizarNpcs(dt); atualizarPesca(dt); atualizarDrops(dt); atualizarBrilhos(dt); atualizarBolhas(dt); atualizarArvores(dt);
  area.atualizar(dt, tempo, { hora: () => estado.hora });
  // enfeites com partículas
  if (area.chafariz && Math.hypot(eu.x, eu.z) < 30) for (let i = 0; i < 3; i++) { const a = rnd(Math.PI * 2), v = rnd(0.9, 1.5); fx.um(0, area.chafariz.y, 0, Math.cos(a) * v, rnd(2.6, 3.6), Math.sin(a) * v, pick(['#ffffff', '#d4f4ff', '#a8ecf7']), 0.17, 1.0, 9, 0); }
  if (area.ctx.fumaca && Math.random() < dt * 5) { const f = area.ctx.fumaca; fx.um(f.x, f.y, f.z, rnd(-0.1, 0.3), rnd(0.8, 1.2), rnd(-0.1, 0.1), '#ffffff', 0.5, 2.4, -0.1, 0.3, 1); }
  if (area.ctx.vapor && Math.random() < dt * 4) { const f = area.ctx.vapor; fx.um(f.x, f.y, f.z, rnd(-0.1, 0.1), rnd(0.5, 0.8), rnd(-0.1, 0.1), '#ffffff', 0.28, 1.3, 0, 0.3, 1); }
  if (estado.efeitos.vagalumes > 0 && Math.random() < dt * 14) fx.um(eu.x + rnd(-3.5, 3.5), rnd(0.5, 2.6), eu.z + rnd(-3.5, 3.5), rnd(-0.5, 0.5), rnd(-0.2, 0.4), rnd(-0.5, 0.5), '#f6ff8a', 0.2, 1.6, 0, 0.5);
  if (area.fora && noiteK() > 0.7 && Math.random() < dt * 3) fx.um(eu.x + rnd(-12, 12), rnd(0.5, 2.2), eu.z + rnd(-10, 6), rnd(-0.3, 0.3), rnd(-0.1, 0.3), rnd(-0.3, 0.3), '#f6ff8a', 0.15, 2.2, 0, 0.4);
  fx.atualizar(dt); camSeguir(false, dt);
  // botão A mostra o que dá para fazer
  alvoA = acharAlvo(); $('aRot').innerHTML = dlg.ativo ? 'OK' : pesca ? (pesca.fase === 'fisgou' ? 'PUXA!' : 'Pescando<small>mexa p/ sair</small>') : alvoA ? alvoA.rotulo + (alvoA.nome ? `<small>${alvoA.nome}</small>` : '') : 'Pular';
  $('btnA').style.background = pesca && pesca.fase === 'fisgou' ? '#ff7f9d' : alvoA || dlg.ativo ? '#ffc93c' : '#ffe9a8';
  const id = estado.mao, esp = id && espera[id] > tempo ? (espera[id] - tempo) / espera['_' + id] : 0; $('btnB').querySelector('.tempo').style.setProperty('--p', esp * 100 + '%');
  tMapa -= dt; if (tMapa <= 0) { tMapa = 0.12; desenharMapa($('mapa'), false); }
  tChips -= dt; if (tChips <= 0) { tChips = 0.5; const nomes = { veloz: '👟', pesca: '🎣', sorte: '🍀', raio: '⚡', gigante: '🍪', vagalumes: '🏮', festa: '🎉' }; $('efeitos').innerHTML = Object.entries(estado.efeitos).filter(([, v]) => v > 0).map(([k, v]) => `<div class="chip"><i>${nomes[k] || '✨'}</i>${Math.ceil(v)}s</div>`).join(''); }
  tSalvar -= dt; if (tSalvar <= 0) { tSalvar = 20; salvar(); }
  renderer.render(cena, camera);
}

// =====================================================================================
// começo
// =====================================================================================
async function iniciar(zerar) {
  if (zerar) { estado = NOVO(); salvar(); }
  estado.efeitos = { ...estado.efeitos, gigante: 0, festa: 0, raio: 0 };
  eu.pers = criarPersonagem(null); cena.add(eu.pers.g); vestir(eu.pers, estado.chapeu);
  await irPara('vila', 'inicio', true); hud(); luzes(); $('btnSom').textContent = estado.som ? '🔊' : '🔇'; if (!estado.som) som.alternar();
  requestAnimationFrame(quadro);
}
function entrar() {
  som.iniciar(); $('inicio').classList.add('some'); iris(true, 0.7);
  if (!estado.intro) depois(0.9, () => cenaJogo(async () => {
    gesto(eu.pers, 'acenar'); await falar(null, 'Bem-vindo à Vila dos Gatos! Você acabou de se mudar, de terno e tudo.');
    await falar(null, celular ? 'Ande com o controle da esquerda. O botão amarelo (A) fala, entra e pega. O azul (B) usa o que estiver na sua mão.' : 'Ande com WASD ou as setas. Espaço (A) fala, entra e pega. Q (B) usa o que estiver na mão. I abre a mochila e M o mapa.');
    await falar(null, 'A Prefeita Mimi está te esperando na Prefeitura 🏛️, o prédio grande ao norte da praça. E fique de olho nos brilhinhos do chão!');
  }));
}
carregar().then(() => iniciar(false)).then(() => {
  $('barra').style.width = '100%'; $('msgIni').textContent = temSalvo ? `Dia ${estado.dia} · ${estado.moedas} 🐟 · ${estado.relVistas.length}/12 relíquias` : 'Uma vila inteirinha de gatos te espera.';
  $('barraFora').classList.add('some'); $('jogar').style.display = 'inline-block'; $('jogar').textContent = temSalvo ? 'Continuar' : 'Jogar';
  if (temSalvo) $('novo').style.display = 'block';
  $('jogar').addEventListener('click', entrar);
  $('novo').addEventListener('click', async () => { if ($('novo').dataset.ok !== '1') { $('novo').dataset.ok = '1'; $('novo').textContent = 'Toque de novo para apagar tudo e recomeçar'; return; } estado = NOVO(); salvar(); vestir(eu.pers, null); await irPara('vila', 'inicio', true); hud(); entrar(); });
}).catch((e) => { console.error(e); $('msgIni').textContent = 'Não consegui abrir a vila. Confira se todos os arquivos foram enviados (inclusive three.module.js e os dois .glb).'; });

window.VILA = { get estado() { return estado; }, get tempo() { return tempo; }, dlg, get pesca() { return pesca; }, get ocupado() { return ocupado; }, vestir: (id) => vestir(eu.pers, id), luzes, get painel() { return painelAberto; }, fecharPainel, get cartao() { return !!cartaoRes; }, eu, irPara, dar, ganhar, PODERES, get area() { return area; }, get npcs() { return npcs; }, hud, apertarA, apertarB, salvar, novoDia };
