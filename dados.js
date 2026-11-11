// Dados da Vila dos Gatos: itens, peixes, relíquias, moradores, falas e missões.

export const ITENS = {
  // ferramentas e sementes
  vara: { nome: 'Vara de pescar', icone: '🎣', tipo: 'ferramenta', preco: 300, desc: 'Chegue perto da água e aperte A para pescar.' },
  isca: { nome: 'Isca especial', icone: '🪱', tipo: 'isca', preco: 60, desc: 'Gasta uma por pescaria. Os peixes mordem mais rápido e os raros aparecem mais.' },
  semente: { nome: 'Sementes de flor', icone: '🌱', tipo: 'semente', preco: 40, desc: 'Coloque na mão e aperte B para plantar uma flor onde você estiver.' },
  // peixes do lago
  lambari: { nome: 'Lambari', icone: '🐟', tipo: 'peixe', preco: 40, cor: '#b9c7d6', tam: 0.5, desc: 'Pequenino e apressado. Vive no lago da vila.' },
  tilapia: { nome: 'Tilápia', icone: '🐟', tipo: 'peixe', preco: 75, cor: '#8fb3a6', tam: 0.7, desc: 'Gordinha e tranquila.' },
  bagre: { nome: 'Bagre bigodudo', icone: '🐡', tipo: 'peixe', preco: 130, cor: '#7a6a58', tam: 0.85, desc: 'Tem bigodes maiores que os seus.' },
  carpa: { nome: 'Carpa dourada', icone: '🐠', tipo: 'peixe', preco: 260, cor: '#f6a623', tam: 0.9, desc: 'Dizem que dá sorte.' },
  pirarucu: { nome: 'Pirarucu filhote', icone: '🐋', tipo: 'peixe', preco: 650, cor: '#c0524a', tam: 1.3, desc: 'Um gigante do Norte, ainda bebê. Raríssimo!' },
  // peixes do mar
  sardinha: { nome: 'Sardinha', icone: '🐟', tipo: 'peixe', preco: 50, cor: '#9fb7d9', tam: 0.5, desc: 'A moeda da vila tem o nome dela.' },
  baiacu: { nome: 'Baiacu', icone: '🐡', tipo: 'peixe', preco: 160, cor: '#e8d27a', tam: 0.7, redondo: true, desc: 'Incha quando fica bravo.' },
  polvo: { nome: 'Polvo', icone: '🐙', tipo: 'peixe', preco: 320, cor: '#e07a9a', tam: 0.8, redondo: true, desc: 'Oito braços e nenhuma paciência.' },
  espada: { nome: 'Peixe-espada', icone: '🐟', tipo: 'peixe', preco: 380, cor: '#c9d6e6', tam: 1.4, desc: 'Comprido e prateado.' },
  tubarao: { nome: 'Tubarãozinho', icone: '🦈', tipo: 'peixe', preco: 900, cor: '#7f95a8', tam: 1.5, desc: 'Parece bravo, mas só quer carinho. Raríssimo!' },
  // tralhas
  bota: { nome: 'Bota velha', icone: '🥾', tipo: 'tralha', preco: 5, desc: 'Alguém vai sentir falta do outro pé.' },
  lata: { nome: 'Lata amassada', icone: '🥫', tipo: 'tralha', preco: 5, desc: 'Era de atum. Que desperdício.' },
  // coisas do chão
  maca: { nome: 'Maçã', icone: '🍎', tipo: 'fruta', preco: 30, desc: 'Docinha. Dá para comer (corre mais por um tempinho) ou vender.' },
  laranja: { nome: 'Laranja', icone: '🍊', tipo: 'fruta', preco: 30, desc: 'Suculenta. Dá para comer ou vender.' },
  coco: { nome: 'Coco', icone: '🥥', tipo: 'fruta', preco: 45, desc: 'Caiu de um coqueiro da praia.' },
  concha: { nome: 'Concha', icone: '🐚', tipo: 'achado', preco: 55, desc: 'Dá para ouvir o mar.' },
  estrela_mar: { nome: 'Estrela-do-mar', icone: '⭐', tipo: 'achado', preco: 90, desc: 'Macia e cor de laranja.' },
  fossil: { nome: 'Fóssil de espinha', icone: '🦴', tipo: 'achado', preco: 220, desc: 'Uma espinha de peixe muito, muito antiga.' },
  // comidas (efeitos)
  sushi: { nome: 'Sushi do Chef', icone: '🍣', tipo: 'comida', preco: 120, efeito: 'pesca', dur: 180, desc: 'Por 3 minutos os peixes mordem bem mais rápido.' },
  sopa: { nome: 'Sopa quentinha', icone: '🍲', tipo: 'comida', preco: 90, efeito: 'veloz', dur: 180, desc: 'Por 3 minutos você anda mais rápido.' },
  bolo: { nome: 'Bolo da sorte', icone: '🍰', tipo: 'comida', preco: 150, efeito: 'sorte', dur: 240, desc: 'Por 4 minutos você acha mais sardinhas e coisas raras.' },
  cafe: { nome: 'Cafezinho', icone: '☕', tipo: 'comida', preco: 50, efeito: 'veloz', dur: 90, desc: 'Um minuto e meio de pressa.' },
  vitamina: { nome: 'Vitamina da Dra. Mel', icone: '💊', tipo: 'comida', preco: 0, efeito: 'veloz', dur: 300, desc: 'Cinco minutos de energia.' },
  // chapéus e acessórios
  cartola: { nome: 'Cartola', icone: '🎩', tipo: 'chapeu', preco: 400, desc: 'Combina com o terno.' },
  palha: { nome: 'Chapéu de palha', icone: '👒', tipo: 'chapeu', preco: 250, desc: 'Para os dias de praia.' },
  boina: { nome: 'Boina de artista', icone: '🎨', tipo: 'chapeu', preco: 300, desc: 'Para pintar capas de livros.' },
  gorro: { nome: 'Gorro de lã', icone: '🧶', tipo: 'chapeu', preco: 220, desc: 'Com pompom.' },
  laco: { nome: 'Laço', icone: '🎀', tipo: 'chapeu', preco: 180, desc: 'Um charme.' },
  oculos: { nome: 'Óculos escuros', icone: '🕶️', tipo: 'chapeu', preco: 350, desc: 'Ninguém vai te reconhecer.' },
  coroa: { nome: 'Coroa dourada', icone: '👑', tipo: 'chapeu', preco: 1500, desc: 'Para quem manda na praça.' },
  flor_cabelo: { nome: 'Flor na orelha', icone: '🌸', tipo: 'chapeu', preco: 120, desc: 'Cheirosa.' },
};

// Relíquias lendárias — cada uma tem um poder de verdade (botão B com ela na mão)
export const RELIQUIAS = {
  luva_primavera: { nome: 'Luva da Primavera', icone: '🧤', espera: 20, desc: 'Um estalar de dedos e flores brotam em volta de você, com uma chuva de pétalas.' },
  carambola_raio: { nome: 'Carambola Relâmpago', icone: '⚡', espera: 45, desc: 'Uma mordida e você corre como um raio por 25 segundos.' },
  novelo_tempo: { nome: 'Novelo do Tempo', icone: '🧶', espera: 15, desc: 'Desenrole para o céu girar: o dia vira noite e a noite vira dia.' },
  capa_nuvem: { nome: 'Capa de Nuvem', icone: '☁️', espera: 4, desc: 'Um pulo altíssimo, planando devagar numa nuvenzinha.' },
  sino_fortuna: { nome: 'Sino da Fortuna', icone: '🔔', espera: 120, desc: 'Toque e chove sardinhas douradas. Corra para pegar!' },
  varinha_bolhas: { nome: 'Varinha de Bolhas', icone: '🫧', espera: 8, desc: 'Solta bolhas gigantes que levam os vizinhos para passear no ar.' },
  coroa_peixes: { nome: 'Coroa do Rei dos Peixes', icone: '🔱', espera: 30, desc: 'Com ela na mão os peixes mordem na hora. Perto da água, B faz o cardume saltar.' },
  lanterna_vagalumes: { nome: 'Lanterna de Vagalumes', icone: '🏮', espera: 40, desc: 'Vagalumes mostram no mapa todos os tesouros escondidos.' },
  flauta_vento: { nome: 'Flauta do Vento', icone: '🪈', espera: 25, desc: 'Um vendaval sacode todas as árvores por perto de uma vez.' },
  disco_dourado: { nome: 'Disco Dourado', icone: '📀', espera: 30, desc: 'Põe a vila inteira para dançar.' },
  biscoito_gigante: { nome: 'Biscoito Gigante', icone: '🍪', espera: 40, desc: 'Você fica enorme por 20 segundos. O chão treme!' },
  estrela_bolso: { nome: 'Estrela de Bolso', icone: '🌠', espera: 20, desc: 'Solta um show de fogos de artifício onde você estiver.' },
};
for (const [id, r] of Object.entries(RELIQUIAS)) ITENS[id] = { ...r, tipo: 'reliquia', preco: 0 };

export const PEIXES = {
  lago: [['lambari', 34], ['tilapia', 26], ['bagre', 16], ['carpa', 8], ['pirarucu', 2], ['bota', 7], ['lata', 7]],
  mar: [['sardinha', 34], ['baiacu', 20], ['polvo', 12], ['espada', 10], ['tubarao', 2], ['concha', 8], ['bota', 6], ['estrela_mar', 8]],
};
export const RAROS = new Set(['carpa', 'pirarucu', 'polvo', 'espada', 'tubarao']);

// ---------- moradores ----------
// pelo/roupa pintam o modelo do gatinho; chapeu usa as mesmas peças da loja
export const MORADORES = {
  // na rua
  pipoca: { nome: 'Pipoca', pelo: '#f6b26b', roupa: '#e2574c', calca: '#3d5a80', chapeu: 'laco', voz: 620, jeito: 'alegre', casa: [-6, 6] },
  mingau: { nome: 'Mingau', pelo: '#f3ede2', roupa: '#7fb7be', calca: '#56707a', chapeu: 'gorro', voz: 300, jeito: 'sono', casa: [8, -4] },
  faisca: { nome: 'Faísca', pelo: '#6b6b76', roupa: '#f2c14e', calca: '#2e2e3a', voz: 520, jeito: 'esporte', casa: [-12, 16] },
  jujuba: { nome: 'Dona Jujuba', pelo: '#d9c2a3', roupa: '#b086c9', calca: '#7a5a94', chapeu: 'palha', voz: 380, jeito: 'vovo', casa: [10, 12] },
  tofu: { nome: 'Tofu', pelo: '#fff7ec', roupa: '#8fd0a0', calca: '#5c8a68', chapeu: 'flor_cabelo', voz: 700, jeito: 'timido', casa: [20, 30] },
  // na praia
  capitao: { nome: 'Capitão Atum', pelo: '#8a9aa8', roupa: '#274c77', calca: '#f4f1de', chapeu: 'palha', voz: 240, jeito: 'capitao' },
  marola: { nome: 'Marola', pelo: '#f9d08b', roupa: '#ef8354', calca: '#4f9bb3', chapeu: 'oculos', voz: 560, jeito: 'surfista' },
  // nos comércios
  mimi: { nome: 'Prefeita Mimi', pelo: '#fbf3e4', roupa: '#c9485b', calca: '#7d2e3a', chapeu: 'coroa', voz: 480, jeito: 'prefeita' },
  cofrinho: { nome: 'Sr. Cofrinho', pelo: '#c9a37a', roupa: '#3f7d5c', calca: '#2b5740', chapeu: 'oculos', voz: 280, jeito: 'banco' },
  bigodes: { nome: 'Professor Bigodes', pelo: '#9a8c7c', roupa: '#8b5e3c', calca: '#5c3d27', chapeu: 'boina', voz: 320, jeito: 'museu' },
  frufru: { nome: 'Madame Fru-Fru', pelo: '#ffe9f0', roupa: '#e86a92', calca: '#a23e62', chapeu: 'laco', voz: 640, jeito: 'roupas' },
  chef: { nome: 'Chef Sardinha', pelo: '#f0a868', roupa: '#ffffff', calca: '#444a55', chapeu: 'chef', voz: 360, jeito: 'chef' },
  mel: { nome: 'Dra. Mel', modelo: 'doutora', voz: 540, jeito: 'medica' },
  tico: { nome: 'Seu Tico', pelo: '#7d6b5d', roupa: '#d98f4e', calca: '#6a4a2f', chapeu: 'palha', voz: 300, jeito: 'armazem' },
  cappuccina: { nome: 'Cappuccina', pelo: '#b98b66', roupa: '#6f4e37', calca: '#3e2c20', chapeu: 'boina', voz: 580, jeito: 'cafe' },
};

export const FALAS = {
  alegre: [
    'Oiê! Que dia lindo pra dar uma volta na praça, né?',
    'Eu contei as bandeirinhas da praça. São muitas. Perdi a conta três vezes!',
    'Sabia que se você sacudir as árvores caem frutas? Às vezes cai até sardinha!',
    'O chafariz é meu lugar favorito. Fico olhando a água pular.',
    'Se achar um brilhinho no chão, cava! Sempre tem alguma coisa boa.',
    'Ouvi dizer que tem coisas lendárias escondidas pela vila. Lendárias!',
  ],
  sono: [
    'Zzz... ah, oi. Eu não tava dormindo. Tava descansando os olhos.',
    'Você já tomou o cafezinho da Cappuccina? Eu tomo cinco. Não adianta.',
    'À noite a praça fica cheia de luzinhas. É bom pra cochilar.',
    'Pescar é ótimo. Você fica parado e ninguém reclama.',
    'Uma vez pesquei uma bota. Guardei. Vai que aparece a outra.',
  ],
  esporte: [
    'Vinte voltas na praça antes do almoço! Quer correr comigo?',
    'A sopa do Chef deixa as patas mais rápidas. Recomendo!',
    'O segredo da pesca é apertar na hora do "!" — nem antes, nem depois.',
    'Dizem que existe uma fruta que deixa a gente rápido como um raio. Eu PRECISO dela.',
    'Lá na praia tem peixe grande. Peixe GRANDE. Tipo, do meu tamanho.',
  ],
  vovo: [
    'Ah, meu netinho de terno! Tão elegante. Já comeu hoje?',
    'No meu tempo esta praça era só um matinho. A Prefeita Mimi caprichou.',
    'Plante flores, querido. A vila fica mais feliz com flores.',
    'O Professor Bigodes fica tão contente quando doam coisas ao museu...',
    'Guarde suas sardinhas no banco, meu bem. Elas rendem um pouquinho todo dia.',
    'Uma vez vi uma luva que fazia flores brotarem. Achei que era sonho.',
  ],
  timido: [
    'Ah... o-oi. Eu só tava olhando os peixinhos.',
    'O lago é calminho... gosto daqui.',
    'V-você viu? Às vezes aparece um brilho na grama. Eu tenho vergonha de cavar.',
    'Dizem que no fundo do lago tem tesouros que os peixes guardam...',
    'Seu terno é bonito... desculpa, falei alto demais.',
  ],
  capitao: [
    'Ahoy, marujo de gravata! O mar hoje está para peixe.',
    'Do píer se pesca melhor. Jogue a linha longe e espere o tranco.',
    'Já vi um tubarãozinho por aqui. Manso. Só queria um cafuné.',
    'O mar devolve coisas estranhas, garoto. Coroas, sinos... coisas com poder.',
    'As conchas aparecem de novo todo dia. O mar é generoso.',
  ],
  surfista: [
    'E aí, brother! Sol, areia e nenhuma preocupação.',
    'Sacode os coqueiros que cai coco. Coco vale uma graninha no Seu Tico.',
    'O farol acende sozinho de noite. Maneiro demais.',
    'Um dia eu pego uma onda. Hoje não. Hoje eu deito.',
  ],
};

export const DICAS_CAFE = [
  'Ouvi um freguês dizer que os peixes do lago engolem coisas brilhantes. Vai que você pesca uma lenda.',
  'Os brilhinhos no chão mudam de lugar todo dia. Vale dar a volta na vila toda manhã.',
  'Dizem que as árvores mais velhas guardam segredos nos galhos. Sacode todas.',
  'Na praia o mar traz relíquias com a maré. Pesque do píer e cave na areia.',
  'A Prefeita dá uma relíquia de presente pra quem ajuda bastante a vila.',
  'O Professor Bigodes recompensa quem enche o museu. Ouvi falar de algo... dourado.',
];

// ---------- missões da prefeitura (em ordem) ----------
export const MISSOES = [
  { id: 'visitar', titulo: 'Conheça a vila', texto: 'Entre em 4 lugares diferentes do quarteirão.', meta: 4, cont: 'visitas', premio: { moedas: 300, item: 'vara' }, fim: 'Agora você já conhece todo mundo! Tome esta vara de pescar de presente.' },
  { id: 'pescar', titulo: 'Pescador da praça', texto: 'Pesque 3 peixes no lago ou na praia.', meta: 3, cont: 'peixes', premio: { moedas: 400, item: 'semente', qtd: 5 }, fim: 'Que pescaria! Leve estas sementes para enfeitar a vila.' },
  { id: 'plantar', titulo: 'Vila florida', texto: 'Plante 5 flores em qualquer lugar.', meta: 5, cont: 'flores', premio: { moedas: 500 }, fim: 'A vila nunca esteve tão colorida!' },
  { id: 'museu', titulo: 'Amigo do museu', texto: 'Doe 3 coisas ao Professor Bigodes.', meta: 3, cont: 'doacoes', premio: { moedas: 600, item: 'bolo', qtd: 2 }, fim: 'O Professor não para de falar de você.' },
  { id: 'arvores', titulo: 'Colheita', texto: 'Sacuda 10 árvores.', meta: 10, cont: 'arvores', premio: { moedas: 500, item: 'isca', qtd: 5 }, fim: 'Frutas para a vila inteira!' },
  { id: 'reliquia', titulo: 'Caçador de lendas', texto: 'Encontre uma relíquia lendária (pescando, cavando brilhos ou sacudindo árvores).', meta: 1, cont: 'reliquias', premio: { moedas: 1000, item: 'estrela_bolso' }, fim: 'Uma lenda de verdade! Fique com esta Estrela de Bolso. Use na praça à noite.' },
  { id: 'festival', titulo: 'O grande festival', texto: 'Junte 5 relíquias diferentes.', meta: 5, cont: 'reliquias', premio: { moedas: 3000, item: 'coroa' }, fim: 'Você é o herói da Vila dos Gatos! Esta coroa é sua. Hoje tem festa na praça!' },
];

// lugares (interiores): nome na placa, dono, cores
export const LUGARES = {
  prefeitura: { nome: 'Prefeitura', emoji: '🏛️', dono: 'mimi' },
  banco: { nome: 'Banco', emoji: '🏦', dono: 'cofrinho' },
  museu: { nome: 'Museu', emoji: '🖼️', dono: 'bigodes' },
  roupas: { nome: 'Bigode & Laço', emoji: '🎩', dono: 'frufru' },
  restaurante: { nome: 'Sardinha Dourada', emoji: '🍣', dono: 'chef' },
  clinica: { nome: 'Clínica', emoji: '🩺', dono: 'mel' },
  armazem: { nome: 'Armazém', emoji: '🧺', dono: 'tico' },
  cafe: { nome: 'Café Ronrom', emoji: '☕', dono: 'cappuccina' },
  casa: { nome: 'Minha casa', emoji: '🏠', dono: null },
};
