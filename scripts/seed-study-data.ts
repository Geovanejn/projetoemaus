import { storage } from "../server/storage";

const faithStudy = {
  title: "O Que É a Fé?",
  description: "Estudo bíblico sobre o significado e a importância da fé cristã baseado em Hebreus 11:1",
  weekNumber: 49,
  year: 2024,
  lessons: [
    {
      title: "O Que É a Fé?",
      type: "study",
      description: "Estudo completo sobre a fé cristã",
      xpReward: 50,
      estimatedMinutes: 15,
      units: [
        {
          type: "verse",
          stage: "estude",
          content: {
            title: "Versículo Base",
            body: "Ora, a fé é a certeza de coisas que se esperam, a convicção de fatos que se não veem.",
            highlight: "Hebreus 11:1 (ARA)"
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "O Que É a Fé?",
            body: "A fé é a confiança firme no caráter de Deus e na veracidade de Sua Palavra. Não depende de emoções, mas de uma certeza interior gerada pelo Espírito Santo. Crer é caminhar \"por fé, e não pelo que vemos\" (2 Coríntios 5:7), confiando que Deus cumprirá Suas promessas mesmo antes de enxergar resultados concretos."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "A Fé Tem um Fundamento: Deus",
            body: "A verdadeira fé se apoia totalmente no Deus vivo. Ela é construída sobre Seu caráter imutável e Suas promessas confiáveis. Deus é o fundamento seguro que sustenta nossa esperança, pois Ele não falha. Por isso, a fé torna-se estável e firme, capaz de resistir às incertezas e aos temores que surgem na caminhada cristã."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "A Fé Tem um Objeto: Cristo",
            body: "A fé cristã tem foco claro: Jesus Cristo. Crer é confiar plenamente em Sua obra, Seu amor e Seu senhorio. Ele é o caminho, a verdade e a vida (João 14:6), e somente n'Ele encontramos perdão e reconciliação. Ter fé significa descansar em Cristo, sabendo que somente Ele pode sustentar, transformar e conduzir nossas vidas."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "A Fé Produz Obras e Frutos",
            body: "A fé verdadeira se manifesta em atitudes e mudança de vida. Não é apenas uma crença interna, mas algo que produz frutos visíveis na prática diária (Tiago 2:17). Ela nos leva a obedecer, amar, servir e buscar santidade. As obras não produzem salvação, mas revelam que a fé é viva, autêntica e operante no coração do cristão."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "A Fé Cresce e se Fortalece",
            body: "A fé se desenvolve quando é exercitada. Ela cresce pela Palavra de Deus (Romanos 10:17), pela oração, pela comunhão e pelas próprias lutas, que nos ensinam a depender mais do Senhor. Cada experiência vivida aprofunda nossa confiança. Com o tempo, a fé madura se torna mais firme, resistente e segura, mesmo em dias difíceis."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "Conclusão",
            body: "A fé é um dom de Deus que nos liga a Cristo e sustenta nossa caminhada. Ela nos capacita a enxergar além das circunstâncias e descansar nas promessas do Senhor. Pela fé encontramos paz, direção e esperança. Viver pela fé é confiar no que Deus disse, não no que sentimos, perseverando com confiança naquele que é fiel."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "medite",
          content: {
            title: "Aplicação na Vida Pessoal",
            body: "A fé não é apenas um conceito teológico, mas uma realidade prática que deve transformar nosso dia a dia. Quando enfrentamos problemas financeiros, a fé nos leva a confiar na provisão de Deus. Quando a saúde falha, a fé nos sustenta na esperança do Senhor. Quando relacionamentos se quebram, a fé nos aponta para o Deus que restaura. Pratique a fé começando com pequenos passos: ore antes de tomar decisões, busque a Palavra quando estiver ansioso, e escolha confiar mesmo quando não entender o caminho."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "medite",
          content: {
            title: "Aplicação na Comunidade",
            body: "A fé também se expressa em comunidade. Quando você compartilha seu testemunho com outros irmãos, fortalece a fé deles e a sua própria. Quando ora por alguém que está passando por dificuldades, você exercita a fé intercessória. Quando serve na igreja com dedicação, demonstra que crê no propósito de Deus para o Corpo de Cristo. Nesta semana, comprometa-se a encorajar pelo menos uma pessoa com uma palavra de fé, lembrando-a das promessas de Deus."
          },
          xpValue: 3
        },
        {
          type: "reflection",
          stage: "medite",
          content: {
            title: "Reflexão Pessoal",
            body: "Reflita sobre como a fé tem influenciado suas decisões diárias. Em quais áreas da sua vida você tem confiado mais em suas próprias forças do que em Deus? Pense em uma situação recente onde você poderia ter exercitado mais fé. O que te impediu? O medo? A dúvida? A pressa? Escreva em seu coração um compromisso de confiar mais no Senhor nesta área específica.",
            reflectionPrompt: "Em que área da minha vida preciso exercitar mais a fé em Deus?"
          },
          xpValue: 5
        },
        {
          type: "meditation",
          stage: "medite",
          content: {
            title: "Oração",
            body: "Senhor, agradeço por me conceder o dom da fé. Confesso que muitas vezes tenho duvidado das Tuas promessas e confiado mais em mim mesmo. Ajuda-me a crer firmemente em Ti, mesmo quando as circunstâncias parecem contrárias. Que minha fé não esteja fundamentada em minhas emoções, mas em Teu caráter imutável. Aumenta minha fé, Senhor, para que eu possa viver de maneira que Te glorifique. Que eu seja capaz de confiar em Ti nas pequenas e grandes decisões. Em nome de Jesus, amém.",
            meditationDuration: 120
          },
          xpValue: 5
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "Segundo Hebreus 11:1, a fé é:",
            options: [
              "A certeza de coisas que se esperam, a convicção de fatos que se não veem",
              "Um sentimento de paz interior que vem e vai",
              "A capacidade de fazer milagres e maravilhas",
              "Uma teoria sobre a existência de Deus"
            ],
            correctIndex: 0,
            explanationCorrect: "Excelente! Hebreus 11:1 define a fé como a certeza de coisas que se esperam e a convicção de fatos que se não veem.",
            explanationIncorrect: "A resposta correta é a primeira opção. Hebreus 11:1 define a fé como a certeza de coisas que se esperam e a convicção de fatos que se não veem."
          },
          xpValue: 5
        },
        {
          type: "true_false",
          stage: "responda",
          content: {
            statement: "A fé verdadeira depende das emoções e sentimentos do cristão.",
            isTrue: false,
            explanationCorrect: "Correto! A fé não depende de emoções, mas de uma certeza interior gerada pelo Espírito Santo.",
            explanationIncorrect: "A afirmação é falsa. A fé não depende de emoções, mas de uma certeza interior gerada pelo Espírito Santo, fundamentada no caráter de Deus."
          },
          xpValue: 5
        },
        {
          type: "fill_blank",
          stage: "responda",
          content: {
            question: "Jesus disse: Eu sou o ___, a verdade e a vida.",
            correctAnswer: "caminho",
            explanationCorrect: "Perfeito! Em João 14:6, Jesus se apresenta como o único caminho ao Pai.",
            explanationIncorrect: "A resposta correta é 'caminho'. Em João 14:6, Jesus diz: 'Eu sou o caminho, a verdade e a vida.'",
            hint: "Leia João 14:6"
          },
          xpValue: 5
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "De acordo com o estudo, em que a fé cristã está fundamentada?",
            options: [
              "Nas experiências pessoais do cristão",
              "No caráter imutável de Deus e Suas promessas confiáveis",
              "Na opinião dos líderes religiosos",
              "Nas tradições da igreja"
            ],
            correctIndex: 1,
            explanationCorrect: "Isso mesmo! A verdadeira fé se apoia no Deus vivo, em Seu caráter imutável e Suas promessas confiáveis.",
            explanationIncorrect: "A resposta correta é que a fé está fundamentada no caráter imutável de Deus e Suas promessas confiáveis."
          },
          xpValue: 5
        },
        {
          type: "fill_blank",
          stage: "responda",
          content: {
            question: "A fé cresce pela Palavra de Deus, conforme Romanos 10:17, que diz: A fé vem pelo ouvir, e o ouvir pela ___ de Cristo.",
            correctAnswer: "palavra",
            explanationCorrect: "Correto! Romanos 10:17 nos ensina que a fé vem pelo ouvir a Palavra de Cristo.",
            explanationIncorrect: "A resposta é 'palavra'. Romanos 10:17 diz: 'A fé vem pelo ouvir, e o ouvir pela palavra de Cristo.'",
            hint: "Complete com o que ouvimos de Cristo"
          },
          xpValue: 5
        },
        {
          type: "true_false",
          stage: "responda",
          content: {
            statement: "Segundo Tiago 2:17, a fé sem obras é morta.",
            isTrue: true,
            explanationCorrect: "Exato! Tiago 2:17 nos ensina que a fé verdadeira se manifesta em obras e frutos visíveis.",
            explanationIncorrect: "A afirmação é verdadeira. Tiago 2:17 declara que a fé sem obras é morta, pois a fé verdadeira produz frutos."
          },
          xpValue: 5
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "Qual é o objeto principal da fé cristã, segundo o estudo?",
            options: [
              "A igreja e suas doutrinas",
              "Os anjos e seres celestiais",
              "Jesus Cristo",
              "Os profetas do Antigo Testamento"
            ],
            correctIndex: 2,
            explanationCorrect: "Perfeito! A fé cristã tem foco claro: Jesus Cristo. Crer é confiar plenamente em Sua obra, Seu amor e Seu senhorio.",
            explanationIncorrect: "A resposta correta é Jesus Cristo. A fé cristã tem foco claro: Jesus Cristo é o caminho, a verdade e a vida."
          },
          xpValue: 5
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "Como a fé cristã se desenvolve e fortalece?",
            options: [
              "Apenas através de experiências sobrenaturais",
              "Pela Palavra de Deus, oração, comunhão e pelas lutas",
              "Automaticamente com o passar do tempo",
              "Somente através do estudo teológico formal"
            ],
            correctIndex: 1,
            explanationCorrect: "Correto! A fé cresce pela Palavra de Deus, pela oração, pela comunhão e pelas próprias lutas que nos ensinam a depender mais do Senhor.",
            explanationIncorrect: "A resposta correta é: pela Palavra de Deus, oração, comunhão e pelas lutas. Cada experiência vivida aprofunda nossa confiança no Senhor."
          },
          xpValue: 5
        }
      ]
    },
    {
      title: "O Poder da Oração",
      type: "study",
      description: "Entendendo a importância e os princípios da oração cristã",
      xpReward: 45,
      estimatedMinutes: 12,
      units: [
        {
          type: "verse",
          stage: "estude",
          content: {
            title: "Versículo Base",
            body: "E tudo o que pedirdes em oração, crendo, o recebereis.",
            highlight: "Mateus 21:22 (ARA)"
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "O Que É Oração?",
            body: "A oração é a comunicação direta entre o ser humano e Deus. É um privilégio concedido a todo cristão, permitindo que nos aproximemos do trono da graça com confiança. Através da oração, expressamos gratidão, confessamos pecados, fazemos pedidos e simplesmente desfrutamos da presença de Deus."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "Por Que Devemos Orar?",
            body: "Jesus nos ensinou a importância da oração através de Seu próprio exemplo. Ele frequentemente se retirava para lugares solitários para orar ao Pai. A oração fortalece nossa fé, nos dá paz em meio às tribulações e nos aproxima do coração de Deus. É através da oração que alinhamos nossa vontade à vontade divina."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "Como Devemos Orar?",
            body: "Não existe fórmula mágica para a oração. Deus deseja que nos aproximemos dEle com sinceridade e humildade. O modelo da oração do Pai Nosso nos ensina a começar adorando a Deus, buscar Sua vontade, pedir nossas necessidades diárias, confessar pecados e pedir proteção contra o mal."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "medite",
          content: {
            title: "Aplicação Prática",
            body: "Reserve um momento específico do seu dia para orar. Pode ser pela manhã ao acordar, à noite antes de dormir, ou durante o intervalo do trabalho. O importante é criar o hábito de conversar com Deus regularmente. Comece com poucos minutos e vá aumentando conforme sentir necessidade."
          },
          xpValue: 3
        },
        {
          type: "reflection",
          stage: "medite",
          content: {
            title: "Reflexão Pessoal",
            body: "Pense em como tem sido sua vida de oração. Você ora regularmente ou apenas em momentos de desespero? Reflita sobre áreas da sua vida onde você precisa buscar mais a direção de Deus através da oração.",
            reflectionPrompt: "Como posso melhorar minha vida de oração?"
          },
          xpValue: 5
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "Segundo Mateus 21:22, o que é necessário para que nossas orações sejam respondidas?",
            options: [
              "Usar palavras bonitas e elaboradas",
              "Crer e ter fé",
              "Orar em público para todos verem",
              "Jejuar por 40 dias"
            ],
            correctIndex: 1,
            explanationCorrect: "Excelente! A fé é fundamental na oração. Jesus disse que se pedirmos crendo, receberemos.",
            explanationIncorrect: "A resposta correta é 'crer e ter fé'. Mateus 21:22 enfatiza a importância da fé na oração."
          },
          xpValue: 5
        },
        {
          type: "true_false",
          stage: "responda",
          content: {
            statement: "Jesus se retirava para lugares solitários para orar ao Pai.",
            isTrue: true,
            explanationCorrect: "Correto! Os evangelhos registram várias ocasiões em que Jesus buscou lugares tranquilos para orar.",
            explanationIncorrect: "A afirmação é verdadeira. Os evangelhos mostram Jesus frequentemente se retirando para orar em lugares solitários."
          },
          xpValue: 5
        },
        {
          type: "fill_blank",
          stage: "responda",
          content: {
            question: "O modelo de oração ensinado por Jesus é conhecido como a oração do ___.",
            correctAnswer: "Pai Nosso",
            explanationCorrect: "Correto! O Pai Nosso é o modelo de oração ensinado por Jesus aos seus discípulos.",
            explanationIncorrect: "A resposta é 'Pai Nosso'. Esta é a oração modelo ensinada por Jesus em Mateus 6:9-13.",
            hint: "Começa com 'Pai...'"
          },
          xpValue: 5
        }
      ]
    },
    {
      title: "Amor ao Próximo",
      type: "study",
      description: "O mandamento do amor que transforma relações",
      xpReward: 40,
      estimatedMinutes: 10,
      units: [
        {
          type: "verse",
          stage: "estude",
          content: {
            title: "Versículo Base",
            body: "Amarás o teu próximo como a ti mesmo.",
            highlight: "Marcos 12:31 (ARA)"
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "O Grande Mandamento",
            body: "Quando perguntaram a Jesus qual era o maior mandamento, Ele respondeu com dois: amar a Deus sobre todas as coisas e amar o próximo como a si mesmo. Estes dois mandamentos resumem toda a lei e os profetas. O amor não é apenas um sentimento, mas uma escolha diária de agir em benefício do outro."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "estude",
          content: {
            title: "Quem É o Meu Próximo?",
            body: "Na parábola do Bom Samaritano, Jesus expandiu nossa compreensão de 'próximo'. Não se trata apenas de familiares ou amigos, mas de qualquer pessoa que cruze nosso caminho e precise de ajuda. O amor cristão transcende barreiras culturais, sociais e religiosas."
          },
          xpValue: 3
        },
        {
          type: "text",
          stage: "medite",
          content: {
            title: "Amor em Ação",
            body: "O amor verdadeiro se manifesta em atitudes concretas. Pode ser um sorriso, uma palavra de encorajamento, ajuda financeira, ou simplesmente estar presente para ouvir. Pense em alguém ao seu redor que precisa de amor e planeje uma forma de demonstrar esse amor esta semana."
          },
          xpValue: 3
        },
        {
          type: "multiple_choice",
          stage: "responda",
          content: {
            question: "Na parábola do Bom Samaritano, quem demonstrou verdadeiro amor ao próximo?",
            options: [
              "O sacerdote",
              "O levita",
              "O samaritano",
              "O hospedeiro"
            ],
            correctIndex: 2,
            explanationCorrect: "Correto! O samaritano foi quem parou para ajudar o homem ferido, demonstrando amor prático.",
            explanationIncorrect: "A resposta correta é o samaritano. Ele foi o único que parou para ajudar o homem ferido na estrada."
          },
          xpValue: 5
        },
        {
          type: "true_false",
          stage: "responda",
          content: {
            statement: "O amor ao próximo deve ser limitado apenas aos nossos familiares e amigos.",
            isTrue: false,
            explanationCorrect: "Correto! O amor cristão deve se estender a todas as pessoas, sem distinção.",
            explanationIncorrect: "A afirmação é falsa. Jesus ensinou que devemos amar a todos, inclusive nossos inimigos."
          },
          xpValue: 5
        }
      ]
    }
  ]
};

const bibleVerses = [
  { reference: "Salmos 23:1", text: "O Senhor é o meu pastor; nada me faltará.", book: "Salmos", chapter: 23, verse: 1, reflection: "Deus cuida de todas as nossas necessidades como um bom pastor cuida de suas ovelhas." },
  { reference: "Provérbios 3:5-6", text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento. Reconhece-o em todos os teus caminhos, e ele endireitará as tuas veredas.", book: "Provérbios", chapter: 3, verse: 5, reflection: "A verdadeira sabedoria vem de confiar completamente em Deus." },
  { reference: "Isaías 41:10", text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus; eu te fortaleço, e te ajudo, e te sustento com a minha destra fiel.", book: "Isaías", chapter: 41, verse: 10, reflection: "Deus promete estar conosco em todos os momentos." },
  { reference: "Jeremias 29:11", text: "Porque eu bem sei os pensamentos que tenho a vosso respeito, diz o Senhor; pensamentos de paz e não de mal, para vos dar o fim que esperais.", book: "Jeremias", chapter: 29, verse: 11, reflection: "Deus tem planos maravilhosos para cada um de nós." },
  { reference: "Filipenses 4:13", text: "Posso todas as coisas naquele que me fortalece.", book: "Filipenses", chapter: 4, verse: 13, reflection: "Nossa força vem de Cristo que habita em nós." },
  { reference: "Romanos 8:28", text: "E sabemos que todas as coisas contribuem juntamente para o bem daqueles que amam a Deus, daqueles que são chamados por seu decreto.", book: "Romanos", chapter: 8, verse: 28, reflection: "Deus trabalha em todas as circunstâncias para nosso bem." },
  { reference: "Mateus 11:28", text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", book: "Mateus", chapter: 11, verse: 28, reflection: "Jesus oferece descanso para nossas almas cansadas." },
  { reference: "João 3:16", text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", book: "João", chapter: 3, verse: 16, reflection: "O amor de Deus é infinito e nos oferece vida eterna." },
  { reference: "Salmos 46:1", text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", book: "Salmos", chapter: 46, verse: 1, reflection: "Em tempos de dificuldade, Deus é nosso refúgio seguro." },
  { reference: "2 Timóteo 1:7", text: "Porque Deus não nos deu o espírito de temor, mas de fortaleza, e de amor, e de moderação.", book: "2 Timóteo", chapter: 1, verse: 7, reflection: "O Espírito de Deus nos capacita com poder, amor e domínio próprio." },
  { reference: "Josué 1:9", text: "Não to mandei eu? Esforça-te e tem bom ânimo; não pasmes, nem te espantes, porque o Senhor, teu Deus, é contigo, por onde quer que andares.", book: "Josué", chapter: 1, verse: 9, reflection: "Coragem vem da certeza de que Deus está conosco." },
  { reference: "Salmos 27:1", text: "O Senhor é a minha luz e a minha salvação; a quem temerei? O Senhor é a força da minha vida; de quem me recearei?", book: "Salmos", chapter: 27, verse: 1, reflection: "Com Deus ao nosso lado, não há razão para temer." },
  { reference: "1 Pedro 5:7", text: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", book: "1 Pedro", chapter: 5, verse: 7, reflection: "Podemos entregar todas as nossas preocupações a Deus." },
  { reference: "Efésios 2:8-9", text: "Porque pela graça sois salvos, por meio da fé; e isto não vem de vós; é dom de Deus. Não vem das obras, para que ninguém se glorie.", book: "Efésios", chapter: 2, verse: 8, reflection: "A salvação é um presente gratuito de Deus." },
  { reference: "Hebreus 13:5", text: "Não te deixarei, nem te desampararei.", book: "Hebreus", chapter: 13, verse: 5, reflection: "A promessa de Deus é permanecer conosco sempre." },
  { reference: "Salmos 121:1-2", text: "Elevo os meus olhos para os montes: de onde me virá o socorro? O meu socorro vem do Senhor, que fez o céu e a terra.", book: "Salmos", chapter: 121, verse: 1, reflection: "Nosso socorro vem do Criador de todas as coisas." },
  { reference: "Isaías 40:31", text: "Mas os que esperam no Senhor renovarão as suas forças, subirão com asas como águias; correrão e não se cansarão; caminharão e não se fatigarão.", book: "Isaías", chapter: 40, verse: 31, reflection: "Esperar no Senhor renova nossas forças." },
  { reference: "Gálatas 5:22-23", text: "Mas o fruto do Espírito é: amor, gozo, paz, longanimidade, benignidade, bondade, fé, mansidão, temperança.", book: "Gálatas", chapter: 5, verse: 22, reflection: "O Espírito Santo produz frutos em nossa vida." },
  { reference: "Tiago 1:2-3", text: "Meus irmãos, tende grande gozo quando cairdes em várias tentações, sabendo que a prova da vossa fé produz a paciência.", book: "Tiago", chapter: 1, verse: 2, reflection: "As provações fortalecem nossa fé e produzem perseverança." },
  { reference: "1 Coríntios 10:13", text: "Não veio sobre vós tentação, senão humana; mas fiel é Deus, que vos não deixará tentar acima do que podeis; antes, com a tentação dará também o escape, para que a possais suportar.", book: "1 Coríntios", chapter: 10, verse: 13, reflection: "Deus sempre provê uma saída em meio às tentações." }
];

const dailyMissions = [
  { type: "complete_lesson", title: "Complete uma lição", description: "Termine uma lição de estudo bíblico", icon: "book", xpReward: 20 },
  { type: "read_verses", title: "Leia 3 versículos", description: "Leia versículos bíblicos para edificação", icon: "book-open", xpReward: 15 },
  { type: "perfect_lesson", title: "Lição perfeita", description: "Complete uma lição sem errar nenhuma pergunta", icon: "star", xpReward: 30 },
  { type: "maintain_streak", title: "Mantenha a ofensiva", description: "Estude pelo menos uma lição hoje", icon: "flame", xpReward: 10 },
  { type: "study_time", title: "10 minutos de estudo", description: "Dedique 10 minutos aos estudos bíblicos", icon: "clock", xpReward: 15 }
];

const achievements = [
  // Conquistas de Streak (Sequencia)
  { code: "streak_3", name: "Iniciante Dedicado", description: "Mantenha uma sequencia de 3 dias de estudo", icon: "flame", xpReward: 10, category: "streak", requirement: { days: 3 } },
  { code: "streak_7", name: "Semana Perfeita", description: "Mantenha uma sequencia de 7 dias de estudo", icon: "flame", xpReward: 25, category: "streak", requirement: { days: 7 } },
  { code: "streak_14", name: "Duas Semanas de Fe", description: "Mantenha uma sequencia de 14 dias de estudo", icon: "flame", xpReward: 50, category: "streak", requirement: { days: 14 } },
  { code: "streak_30", name: "Mes de Fe", description: "Mantenha uma sequencia de 30 dias de estudo", icon: "flame", xpReward: 100, category: "streak", requirement: { days: 30 } },
  { code: "streak_100", name: "Centuriao da Fe", description: "Mantenha uma sequencia de 100 dias de estudo", icon: "crown", xpReward: 500, category: "streak", requirement: { days: 100 } },
  
  // Conquistas de Licoes
  { code: "first_lesson", name: "Primeiro Passo", description: "Complete sua primeira licao", icon: "book", xpReward: 5, category: "lessons", requirement: { lessons: 1 } },
  { code: "lessons_5", name: "Estudante Aplicado", description: "Complete 5 licoes", icon: "book-open", xpReward: 20, category: "lessons", requirement: { lessons: 5 } },
  { code: "lessons_10", name: "Discipulo Dedicado", description: "Complete 10 licoes", icon: "graduation-cap", xpReward: 50, category: "lessons", requirement: { lessons: 10 } },
  { code: "lessons_25", name: "Estudioso da Palavra", description: "Complete 25 licoes", icon: "trophy", xpReward: 100, category: "lessons", requirement: { lessons: 25 } },
  { code: "lessons_50", name: "Mestre da Palavra", description: "Complete 50 licoes", icon: "crown", xpReward: 250, category: "lessons", requirement: { lessons: 50 } },
  
  // Conquistas de Perfeicao
  { code: "perfect_lesson", name: "Perfeito!", description: "Complete uma licao sem errar nenhuma pergunta", icon: "star", xpReward: 15, category: "lessons", requirement: { perfectLessons: 1 } },
  { code: "perfect_5", name: "Excelencia Biblica", description: "Complete 5 licoes perfeitas", icon: "stars", xpReward: 50, category: "lessons", requirement: { perfectLessons: 5 } },
  { code: "perfect_10", name: "Estudante Exemplar", description: "Complete 10 licoes perfeitas", icon: "award", xpReward: 100, category: "lessons", requirement: { perfectLessons: 10 } },
  
  // Conquistas de XP
  { code: "xp_100", name: "Primeira Centena", description: "Acumule 100 XP", icon: "zap", xpReward: 10, category: "xp", requirement: { xp: 100 } },
  { code: "xp_500", name: "Meio Milhar", description: "Acumule 500 XP", icon: "zap", xpReward: 25, category: "xp", requirement: { xp: 500 } },
  { code: "xp_1000", name: "Mil Pontos de Fe", description: "Acumule 1000 XP", icon: "zap", xpReward: 50, category: "xp", requirement: { xp: 1000 } },
  { code: "xp_5000", name: "Guerreiro da Fe", description: "Acumule 5000 XP", icon: "shield", xpReward: 150, category: "xp", requirement: { xp: 5000 } },
  { code: "xp_10000", name: "Campeo da Fe", description: "Acumule 10000 XP", icon: "medal", xpReward: 300, category: "xp", requirement: { xp: 10000 } },
  
  // Conquistas de Versiculos
  { code: "verse_reader_1", name: "Leitor de Versiculos", description: "Leia seu primeiro versiculo", icon: "book-open", xpReward: 5, category: "special", requirement: { verses: 1 } },
  { code: "verse_reader_10", name: "Amante da Palavra", description: "Leia 10 versiculos", icon: "book-heart", xpReward: 25, category: "special", requirement: { verses: 10 } },
  { code: "verse_reader_50", name: "Devorador de Escrituras", description: "Leia 50 versiculos", icon: "book-marked", xpReward: 75, category: "special", requirement: { verses: 50 } },
  
  // Conquistas Especiais
  { code: "early_bird", name: "Madrugador", description: "Estude antes das 7h da manha", icon: "sunrise", xpReward: 15, category: "special", requirement: { studyBefore: "07:00" } },
  { code: "night_owl", name: "Coruja Noturna", description: "Estude depois das 22h", icon: "moon", xpReward: 15, category: "special", requirement: { studyAfter: "22:00" } },
  { code: "weekend_warrior", name: "Guerreiro do Fim de Semana", description: "Estude no sabado e domingo", icon: "calendar", xpReward: 20, category: "special", requirement: { weekendStudy: true } },
  { code: "meditation_master", name: "Mestre da Meditacao", description: "Complete 10 sessoes de meditacao", icon: "heart", xpReward: 50, category: "special", requirement: { meditations: 10 } },
  { code: "first_ranking", name: "Top 10", description: "Entre no top 10 do ranking semanal", icon: "trophy", xpReward: 100, category: "special", requirement: { rankingTop: 10 } },
  { code: "champion", name: "Campeao Semanal", description: "Fique em primeiro lugar no ranking semanal", icon: "crown", xpReward: 200, category: "special", requirement: { rankingTop: 1 } },
  
  // Conquistas de Nivel (alinhadas com titulos do jogador)
  { code: "level_5", name: "Aprendiz das Escrituras", description: "Alcance o nivel 5", icon: "trending-up", xpReward: 25, category: "xp", requirement: { level: 5 } },
  { code: "level_10", name: "Estudante Dedicado", description: "Alcance o nivel 10", icon: "trending-up", xpReward: 50, category: "xp", requirement: { level: 10 } },
  { code: "level_20", name: "Discipulo Fiel", description: "Alcance o nivel 20", icon: "book-open", xpReward: 100, category: "xp", requirement: { level: 20 } },
  { code: "level_40", name: "Mestre dos Estudos", description: "Alcance o nivel 40", icon: "award", xpReward: 200, category: "xp", requirement: { level: 40 } },
  { code: "level_60", name: "Sabio Biblico", description: "Alcance o nivel 60", icon: "star", xpReward: 350, category: "xp", requirement: { level: 60 } },
  { code: "level_80", name: "Guardiao da Palavra", description: "Alcance o nivel 80", icon: "shield", xpReward: 500, category: "xp", requirement: { level: 80 } },
  { code: "level_100", name: "Supremo Conhecedor", description: "Alcance o nivel 100", icon: "crown", xpReward: 1000, category: "xp", requirement: { level: 100 } },
  
  // Conquistas de Missoes
  { code: "mission_first", name: "Primeira Missao", description: "Complete sua primeira missao diaria", icon: "target", xpReward: 5, category: "special", requirement: { missions: 1 } },
  { code: "mission_all_day", name: "Dia Perfeito", description: "Complete todas as missoes de um dia", icon: "check-circle", xpReward: 30, category: "special", requirement: { allMissionsDay: true } },
  { code: "mission_week", name: "Semana de Missoes", description: "Complete todas as missoes por 7 dias seguidos", icon: "calendar-check", xpReward: 100, category: "special", requirement: { allMissionsWeek: true } }
];

export async function seedStudyData() {
  try {
    console.log("Limpando dados de estudo existentes...");
    
    const existingWeeks = storage.getAllStudyWeeks();
    for (const week of existingWeeks) {
      const lessons = storage.getLessonsForWeek(week.id);
      for (const lesson of lessons) {
        const units = storage.getUnitsForLesson(lesson.id);
        for (const unit of units) {
          storage.deleteStudyUnit(unit.id);
        }
        storage.deleteStudyLesson(lesson.id);
      }
      storage.deleteStudyWeek(week.id);
    }
    
    console.log("Inserindo novos dados de estudo...");
    
    const week = storage.createStudyWeek({
      weekNumber: faithStudy.weekNumber,
      year: faithStudy.year,
      title: faithStudy.title,
      description: faithStudy.description
    });
    
    console.log(`Semana criada: ${week.title} (ID: ${week.id})`);
    
    for (let i = 0; i < faithStudy.lessons.length; i++) {
      const lessonData = faithStudy.lessons[i];
      
      const lesson = storage.createStudyLesson({
        studyWeekId: week.id,
        orderIndex: i,
        title: lessonData.title,
        type: lessonData.type,
        description: lessonData.description,
        xpReward: lessonData.xpReward,
        estimatedMinutes: lessonData.estimatedMinutes,
        isLocked: false
      });
      
      console.log(`  Lição criada: ${lesson.title} (ID: ${lesson.id})`);
      
      for (let j = 0; j < lessonData.units.length; j++) {
        const unitData = lessonData.units[j];
        
        const unit = storage.createStudyUnit({
          lessonId: lesson.id,
          orderIndex: j,
          type: unitData.type,
          content: unitData.content,
          xpValue: unitData.xpValue,
          stage: unitData.stage
        });
        
        console.log(`    Unidade criada: ${unitData.type} - ${unitData.stage} (ID: ${unit.id})`);
      }
    }
    
    console.log("\nDados de estudo inseridos com sucesso!");
    return { success: true, weekId: week.id };
  } catch (error) {
    console.error("Erro ao inserir dados de estudo:", error);
    throw error;
  }
}

export async function seedBibleVerses() {
  try {
    console.log("\nLimpando versículos existentes...");
    storage.clearAllBibleVerses();
    
    console.log("Inserindo versículos bíblicos...");
    for (const verse of bibleVerses) {
      storage.createBibleVerse(verse.reference, verse.text, verse.reflection, "geral");
      console.log(`  Versículo inserido: ${verse.reference}`);
    }
    
    console.log(`\n${bibleVerses.length} versículos inseridos com sucesso!`);
    return { success: true, count: bibleVerses.length };
  } catch (error) {
    console.error("Erro ao inserir versículos:", error);
    throw error;
  }
}

export async function seedDailyMissions() {
  try {
    console.log("\nLimpando missões diárias existentes...");
    storage.clearAllDailyMissions();
    
    console.log("Inserindo missões diárias...");
    for (const mission of dailyMissions) {
      storage.createDailyMission(mission);
      console.log(`  Missão inserida: ${mission.title}`);
    }
    
    console.log(`\n${dailyMissions.length} missões inseridas com sucesso!`);
    return { success: true, count: dailyMissions.length };
  } catch (error) {
    console.error("Erro ao inserir missões:", error);
    throw error;
  }
}

export async function seedAchievements() {
  try {
    console.log("\nLimpando conquistas existentes...");
    storage.clearAllAchievements();
    
    console.log("Inserindo conquistas...");
    for (const achievement of achievements) {
      storage.createAchievement({
        code: achievement.code,
        name: achievement.name,
        description: achievement.description,
        icon: achievement.icon,
        xpReward: achievement.xpReward,
        category: achievement.category,
        requirement: achievement.requirement,
        isSecret: false
      });
      console.log(`  Conquista inserida: ${achievement.name}`);
    }
    
    console.log(`\n${achievements.length} conquistas inseridas com sucesso!`);
    return { success: true, count: achievements.length };
  } catch (error) {
    console.error("Erro ao inserir conquistas:", error);
    throw error;
  }
}

export async function clearAllStudyProgress() {
  try {
    console.log("\nLimpando todo o progresso de estudo dos usuários...");
    storage.clearAllStudyProgress();
    console.log("Progresso limpo com sucesso!");
    return { success: true };
  } catch (error) {
    console.error("Erro ao limpar progresso:", error);
    throw error;
  }
}

export async function seedAllData() {
  console.log("=".repeat(50));
  console.log("INICIANDO SEED COMPLETO DO SISTEMA DEOGLORY");
  console.log("=".repeat(50));
  
  await clearAllStudyProgress();
  await seedStudyData();
  await seedBibleVerses();
  await seedDailyMissions();
  await seedAchievements();
  
  console.log("\n" + "=".repeat(50));
  console.log("SEED COMPLETO FINALIZADO COM SUCESSO!");
  console.log("=".repeat(50));
}

const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  seedAllData()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}
