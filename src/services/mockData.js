export const INITIAL_BOOKS = [
  {
    id: 'book-1',
    title: 'Receitas',
    subtitle: 'Meu livro de tradições culinárias',
    category: 'Gastronomia',
    coverColor: '#7A2E26',
    titleColor: '#F7EDE2',
    paperColor: '#F4EAE0',
    totalPages: 384,
    status: 'estante',
    createdAt: '2025-01-10T10:00:00Z',
    updatedAt: '2025-02-14T14:30:00Z',
    chapters: [
      {
        id: 'chap-1-1',
        title: 'Introdução aos Aromas da Infância',
        content: 'Ao abrir o caderno amarelado de receitas, o primeiro aroma que surge na memória não vem da tinta, mas da canela com açúcar tostada no forno a lenha nas tardes de outono.\n\nCozinhar, afinal, é uma forma silenciosa de costurar o tempo. Cada ingrediente carrega uma geografia particular, e cada receita transmitida através das gerações é um pacto de afeto entre quem preparou e quem saboreou.'
      },
      {
        id: 'chap-1-2',
        title: 'O Pão Rústico de Fermentação Lenta',
        content: 'Farinha, água, sal e paciência. Não há atalhos para a crosta estaladiça e o miolo aerado que se forma quando respeitamos os ciclos da levedura selvagem.\n\nSove com as palmas das mãos firmes, sinta a elasticidade do glúten se transformar em veludo vivo sob seus dedos.'
      }
    ]
  },
  {
    id: 'book-2',
    title: 'Cantos de Marés',
    subtitle: 'Um livro sobre memórias litorâneas e ventos',
    category: 'Poesia & Prosa',
    coverColor: '#1F3347',
    titleColor: '#E2EEF8',
    paperColor: '#F4EAE0',
    totalPages: 190,
    status: 'estante',
    createdAt: '2025-01-15T09:12:00Z',
    updatedAt: '2025-02-18T18:40:00Z',
    chapters: [
      {
        id: 'chap-2-1',
        title: 'O Farol Esquecido',
        content: 'A luz varre a baía com a precisão de um ponteiro que nunca se cansa de medir a solidão das pedras escarpadas.\n\nOs pescadores da vila contam que o velho faroleiro conhecia cada onda pelo som que ela produzia ao arrebentar contra os cascalhos molhados.'
      },
      {
        id: 'chap-2-2',
        title: 'Vozes da Ressaca',
        content: 'O mar devolve à areia o que a terra tentou esquecer: pedaços de madeira envernizada, conchas espirais e vestígios de cartas que nunca chegaram ao porto.'
      }
    ]
  },
  {
    id: 'book-3',
    title: 'Arquitetura da Luz',
    subtitle: 'A história da iluminação natural nos templos',
    category: 'Arte & Arquitetura',
    coverColor: '#9E6219',
    titleColor: '#FFF3DC',
    paperColor: '#F4EAE0',
    totalPages: 412,
    status: 'estante',
    createdAt: '2025-01-20T16:20:00Z',
    updatedAt: '2025-02-22T11:00:00Z',
    chapters: [
      {
        id: 'chap-3-1',
        title: 'A Geometria Sagrada dos Vitrais',
        content: 'Quando a luz solar atravessa o vidro cobalto e rubi das ogivas medievais, ela deixa de ser mera claridade física e converte-se em matéria teológica suspensa no ar.\n\nA poeira que dança nos feixes policromáticos desenha corredores invisíveis por onde o olhar ascende rumo à abóbada.'
      }
    ]
  },
  {
    id: 'book-4',
    title: 'Terras Altas',
    subtitle: 'Trata de uma expedição aos picos esquecidos',
    category: 'Viagens & Crônicas',
    coverColor: '#2B4436',
    titleColor: '#E9F5ED',
    paperColor: '#F4EAE0',
    totalPages: 260,
    status: 'estante',
    createdAt: '2025-02-01T08:00:00Z',
    updatedAt: '2025-02-25T15:10:00Z',
    chapters: [
      {
        id: 'chap-4-1',
        title: 'Além das Colinas Nevadas',
        content: 'O ar rarefeito torna cada respiração um esforço consciente. Acima dos três mil metros de altitude, a vegetação cede lugar a rochas musgosas e a um silêncio tão puro que se ouve o pulsar das próprias têmporas.'
      }
    ]
  },
  {
    id: 'book-5',
    title: 'Crônicas do Silêncio',
    subtitle: 'Cap. III: A Biblioteca Perdida',
    category: 'Ficção Literária',
    coverColor: '#215C50',
    titleColor: '#FFFFFF',
    paperColor: '#F4EAE0',
    totalPages: 82,
    status: 'estante',
    createdAt: '2025-02-05T12:00:00Z',
    updatedAt: '2025-02-28T19:00:00Z',
    chapters: [
      {
        id: 'chap-5-1',
        title: 'Cap. III: A Biblioteca Perdida',
        content: 'Ao abrir na trigésima oitava página, um fragmento de pergaminho solto deslizou sobre o tampo da escrivaninha. Era um mapa estelar com tintas vegetais desbotadas, indicando as constelações que outrora vigiavam o Vale das Névoas. O silêncio da abóbada era denso, quebrado unicamente pelo roçar metódico de seu polegar sobre a borda áspera das folhas costuradas.\n\nNão havia pressa naquele refúgio. O tempo desdobrava-se em camadas, como as folhas de guarda marmorizadas dos velhos compêndios. Sentou-se na cadeira estofada em veludo desgastado, acendeu a lamparina de latão ao lado do tinteiro e permitiu que a penumbra acolhesse seus pensamentos mais íntimos.\n\nAproximando a chama da margem inferior, vislumbrou anotações à pena em caligrafia miúda: coordenadas para a sala secreta das matrizes tipográficas. Seus olhos cintilaram com a certeza de que a jornada estava apenas começando.'
      }
    ]
  },
  // Livros guardados no Baú
  {
    id: 'book-6',
    title: 'Manuscritos de Outono',
    subtitle: 'Rascunhos antigos da juventude',
    category: 'Rascunhos',
    coverColor: '#5C4033',
    titleColor: '#F3E5AB',
    paperColor: '#F4EAE0',
    totalPages: 114,
    status: 'bau',
    createdAt: '2024-11-12T14:00:00Z',
    updatedAt: '2025-01-05T10:15:00Z',
    chapters: [
      {
        id: 'chap-6-1',
        title: 'Fragmentos Soltos',
        content: 'Primeiras ideias de contos escritos em cafeterias no centro da cidade, preservados no baú para revisão futura.'
      }
    ]
  },
  {
    id: 'book-7',
    title: 'Diário de Bordo 2024',
    subtitle: 'Anotações da viagem pela serra gaúcha',
    category: 'Memórias',
    coverColor: '#3D5A5B',
    titleColor: '#E2F1F1',
    paperColor: '#F4EAE0',
    totalPages: 96,
    status: 'bau',
    createdAt: '2024-12-01T17:30:00Z',
    updatedAt: '2025-01-08T11:45:00Z',
    chapters: [
      {
        id: 'chap-7-1',
        title: 'Pelas Estradas de Hortênsias',
        content: 'Caderno de bordo com quilometragens, restaurantes acolhedores e lembranças de dias chuvosos.'
      }
    ]
  }
];

export const INITIAL_USER = {
  name: 'Camila Duarte',
  email: 'camila.livros@gmail.com',
  avatarUrl: 'https://images.unsplash.com/photo-1544717305-2782549b5136?w=240&auto=format&fit=crop&q=80',
  storageUsedMb: 24.5,
  storageLimitGb: 1,
  readerTheme: 'light', // 'light' | 'dark'
  fontSize: 18,
  pagesRead: 1420
};
