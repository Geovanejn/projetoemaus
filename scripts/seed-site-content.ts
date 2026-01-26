import { storage } from "./storage";

const devotionalsData = [
  {
    title: "A Forca da Oracao",
    verse: "Orai sem cessar.",
    verseReference: "1 Tessalonicenses 5:17",
    content: `A oracao e a nossa linha direta com Deus. Atraves dela, podemos expressar nossas alegrias, tristezas, pedidos e agradecimentos ao nosso Pai celestial.

Quando oramos com fe, abrimos espaco para que Deus opere em nossas vidas de maneiras extraordinarias. A oracao nao muda apenas as circunstancias ao nosso redor, mas transforma nosso coracao e nos aproxima do Criador.

Paulo nos exorta a orar sem cessar - nao porque devemos estar de joelhos 24 horas por dia, mas porque devemos manter uma atitude de oracao constante, reconhecendo a presenca de Deus em todos os momentos.

**Por que devemos orar sem cessar?**

1. **A oracao nos aproxima de Deus** - Quando oramos, entramos na presenca do Altissimo. E um privilegio que nos foi dado atraves do sacrificio de Cristo na cruz.

2. **A oracao transforma nosso coracao** - Ao orar, nao apenas apresentamos nossos pedidos, mas tambem nos tornamos mais sensiveis a vontade de Deus para nossas vidas.

3. **A oracao nos fortalece** - Nas batalhas espirituais, a oracao e nossa arma mais poderosa.

**Aplicacao Pratica**

Hoje, separe momentos especificos para orar. Faca da oracao um habito constante em sua vida.`,
    summary: "A oracao e nossa conexao direta com Deus, transformando nossos coracoes e nos aproximando do Pai celestial.",
    imageUrl: "/attached_assets/stock_images/christian_prayer_spi_8aee0c57.jpg",
    author: "Secretaria de Espiritualidade",
  },
  {
    title: "Fe que Move Montanhas",
    verse: "Se tiverdes fe como um grao de mostarda, direis a este monte: Passa daqui para acola, e ele ha de passar.",
    verseReference: "Mateus 17:20",
    content: `A fe nao se mede por tamanho, mas pela sua genuinidade. Mesmo a menor fe verdadeira pode realizar grandes coisas quando depositada em Deus.

Jesus usou a imagem do grao de mostarda para nos ensinar que nao e a quantidade de fe que importa, mas a qualidade e o objeto dessa fe.

**O que a fe em Deus pode fazer?**

1. **Mover montanhas** - Os obstaculos que parecem impossiveis sao superados quando confiamos em Deus.

2. **Trazer paz** - A fe nos da seguranca mesmo em meio as tempestades.

3. **Transformar vidas** - Pela fe, somos justificados e recebemos a salvacao.

Jovens da UMP Emaus, sejamos um povo de fe, confiando no Senhor em todas as circunstancias.`,
    summary: "A fe genuina, mesmo pequena, pode realizar grandes coisas quando depositada em Deus.",
    imageUrl: "/attached_assets/stock_images/christian_youth_bibl_8f68a2af.jpg",
    author: "Diretoria UMP",
  },
  {
    title: "O Amor Incondicional de Deus",
    verse: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigenito.",
    verseReference: "Joao 3:16",
    content: `O amor de Deus e a essencia do Evangelho. Ele nos amou primeiro, mesmo quando eramos pecadores, e enviou Seu Filho para morrer por nos.

Este amor nao e condicional - nao depende de nossas acoes ou meritos. E um amor gracioso que nos alcanca onde estamos e nos transforma pelo poder do Espirito Santo.

**Caracteristicas do amor de Deus:**

1. **E incondicional** - Deus nos ama independente de quem somos ou do que fazemos.

2. **E sacrificial** - Deus deu o que tinha de mais precioso por nos.

3. **E transformador** - Quando compreendemos esse amor, somos mudados.

Quando compreendemos a profundidade do amor de Deus, somos motivados a amar os outros da mesma forma - incondicionalmente e sacrificialmente.`,
    summary: "O amor de Deus e incondicional, sacrificial e transformador.",
    imageUrl: "/attached_assets/stock_images/christian_prayer_spi_381f45cb.jpg",
    author: "Secretaria de Espiritualidade",
  },
  {
    title: "Confiando em Tempos Dificeis",
    verse: "Ainda que eu andasse pelo vale da sombra da morte, nao temeria mal algum.",
    verseReference: "Salmos 23:4",
    content: `Nos momentos mais sombrios de nossas vidas, podemos confiar que Deus esta conosco e nunca nos abandonara. Ele e o nosso pastor.

Davi, ao escrever este salmo, conhecia bem os vales escuros da vida. Ele enfrentou inimigos, traicoes e dificuldades. Mas sua confianca estava firmada no Senhor.

**Por que nao devemos temer?**

1. **Deus esta conosco** - Ele nunca nos deixa sozinhos.

2. **Ele nos guia** - Sua vara e cajado nos confortam.

3. **Ele prepara o caminho** - Mesmo nos momentos dificeis, Deus esta trabalhando.

Jovens, confiem no Senhor em todo tempo. Ele e fiel!`,
    summary: "Podemos confiar em Deus mesmo nos momentos mais dificeis, pois Ele nunca nos abandona.",
    imageUrl: "/attached_assets/stock_images/christian_prayer_spi_b3209276.jpg",
    author: "Diretoria UMP",
  },
  {
    title: "Servindo ao Proximo",
    verse: "Aquele que quiser ser o maior entre vos, sera vosso servo.",
    verseReference: "Mateus 20:26",
    content: `Jesus nos ensinou que a verdadeira grandeza esta em servir. O servico ao proximo e a expressao pratica do amor de Cristo em nossas vidas.

Em um mundo que busca poder e posicao, Jesus nos chama para um caminho diferente - o caminho da humildade e do servico.

**Como podemos servir?**

1. **Na igreja** - Usando nossos dons para edificar o corpo de Cristo.

2. **Na comunidade** - Sendo luz onde quer que estejamos.

3. **Em casa** - Demonstrando amor atraves de pequenos gestos.

Que a UMP Emaus seja conhecida pelo amor servical, refletindo Cristo em tudo o que fazemos.`,
    summary: "A verdadeira grandeza esta em servir ao proximo com amor e humildade.",
    imageUrl: "/attached_assets/stock_images/christian_youth_bibl_9076a952.jpg",
    author: "Secretaria Social",
  },
  {
    title: "A Paz que Excede Todo Entendimento",
    verse: "E a paz de Deus, que excede todo o entendimento, guardara os vossos coracoes.",
    verseReference: "Filipenses 4:7",
    content: `A paz que Deus oferece vai alem da compreensao humana. Ela guarda nosso coracao em meio as tempestades da vida e nos da serenidade.

Esta paz nao e a ausencia de problemas, mas a presenca de Deus em meio a eles. E uma paz que o mundo nao pode dar nem tirar.

**Como receber essa paz?**

1. **Pela oracao** - Levando nossas preocupacoes a Deus.

2. **Pela confianca** - Crendo que Deus esta no controle.

3. **Pela obediencia** - Seguindo os caminhos do Senhor.

Que essa paz inunde nossos coracoes hoje e sempre.`,
    summary: "A paz de Deus guarda nosso coracao e vai alem da compreensao humana.",
    imageUrl: "/attached_assets/stock_images/christian_youth_bibl_d0aeceb2.jpg",
    author: "Secretaria de Espiritualidade",
  },
];

const eventsData = [
  {
    title: "Culto Jovem",
    description: "Venha adorar a Deus conosco! Teremos louvor especial, pregacao edificante e comunhao fraterna. Convidamos todos os jovens a participarem deste momento de encontro com Deus.",
    imageUrl: "/attached_assets/stock_images/christian_church_you_a986eda5.jpg",
    startDate: "2025-12-15",
    time: "19:30",
    location: "Igreja Presbiteriana de Emaus",
  },
  {
    title: "Retiro Anual UMP",
    description: "Tres dias de imersao na Palavra de Deus, adoracao intensa e comunhao com os irmaos. Inscricoes abertas! Valor: R$ 150,00 (inclui hospedagem e alimentacao).",
    imageUrl: "/attached_assets/stock_images/christian_retreat_na_c9530bbb.jpg",
    startDate: "2025-12-20",
    endDate: "2025-12-22",
    time: "08:00",
    location: "Sitio Recanto da Paz - Jundiai/SP",
  },
  {
    title: "Celebracao de Natal",
    description: "Celebracao especial de Natal com amigo secreto, confraternizacao e ceia. Cada participante deve trazer um prato para compartilhar. Amigo secreto: valor de R$ 30,00.",
    imageUrl: "/attached_assets/stock_images/christmas_church_cel_ff49216a.jpg",
    startDate: "2025-12-25",
    time: "20:00",
    location: "Salao de Festas - Igreja Sede",
  },
  {
    title: "Ensaio do Louvor",
    description: "Preparacao das musicas para o culto de virada de ano. Todos os integrantes do ministerio de louvor devem comparecer. Ensaio aberto para novos talentos.",
    imageUrl: "/attached_assets/stock_images/christian_church_you_3185617e.jpg",
    startDate: "2025-12-28",
    time: "15:00",
    location: "Sala de Musica - Igreja Sede",
  },
  {
    title: "Culto de Virada de Ano",
    description: "Venha celebrar a entrada do novo ano em oracao, gratidao e adoracao. Sera um momento especial para agradecer pelas bencaos de 2025 e consagrar 2026 nas maos do Senhor.",
    imageUrl: "/attached_assets/stock_images/new_year_celebration_f0bb6709.jpg",
    startDate: "2025-12-31",
    time: "22:00",
    location: "Igreja Presbiteriana de Emaus",
  },
];

const instagramPostsData = [
  {
    caption: "Culto jovem ontem foi uma bencao! Deus esta agindo em nosso meio. #umpemaus #juventude",
    imageUrl: "/attached_assets/stock_images/christian_church_you_9f2da4a3.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-12-03T18:00:00Z",
  },
  {
    caption: "Estudo biblico sobre fe. Venha crescer conosco! #biblia #fe #umpemaus",
    imageUrl: "/attached_assets/stock_images/christian_youth_bibl_8f68a2af.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-12-02T15:00:00Z",
  },
  {
    caption: "Momento de oracao pela nossa cidade. Unidos em oracao! #oracao #umpemaus",
    imageUrl: "/attached_assets/stock_images/christian_prayer_spi_8aee0c57.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-12-01T20:00:00Z",
  },
  {
    caption: "Confraternizacao da juventude. Alegria em servir ao Senhor! #comunhao #umpemaus",
    imageUrl: "/attached_assets/stock_images/christian_church_you_a986eda5.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-11-30T19:00:00Z",
  },
  {
    caption: "Louvando ao Senhor de todo o coracao! #louvor #adoracao #umpemaus",
    imageUrl: "/attached_assets/stock_images/christian_church_you_3185617e.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-11-28T12:00:00Z",
  },
  {
    caption: "Jovens comprometidos com Cristo! #juventude #umpemaus #igreja",
    imageUrl: "/attached_assets/stock_images/christian_retreat_na_deb672ba.jpg",
    permalink: "https://instagram.com/umpemaus",
    postedAt: "2025-11-25T18:00:00Z",
  },
];

export async function seedSiteContent() {
  console.log("\n" + "=".repeat(50));
  console.log("INICIANDO SEED DO CONTEUDO DO SITE");
  console.log("=".repeat(50));

  console.log("\nLimpando dados existentes...");
  storage.clearAllDevotionals();
  storage.clearAllSiteEvents();
  storage.clearAllInstagramPosts();

  console.log("\nInserindo devocionais...");
  for (const devotional of devotionalsData) {
    const created = storage.createDevotional(devotional);
    console.log(`  Devocional criado: ${created.title}`);
  }

  console.log("\nInserindo eventos...");
  for (const event of eventsData) {
    const created = storage.createSiteEvent(event);
    console.log(`  Evento criado: ${created.title}`);
  }

  console.log("\nInserindo posts do Instagram...");
  for (const post of instagramPostsData) {
    const created = storage.createInstagramPost(post);
    console.log(`  Post criado: ${created.caption?.substring(0, 30)}...`);
  }

  console.log("\n" + "=".repeat(50));
  console.log("SEED DO CONTEUDO DO SITE CONCLUIDO!");
  console.log("=".repeat(50));
}

const isMainModule = process.argv[1]?.includes('seed-site-content');
if (isMainModule) {
  seedSiteContent()
    .then(() => process.exit(0))
    .catch((error) => {
      console.error("Erro no seed:", error);
      process.exit(1);
    });
}
