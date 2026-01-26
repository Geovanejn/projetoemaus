const BIBLE_API_BASE = "https://www.abibliadigital.com.br/api";
const VERSION = "ra";

function getAuthHeaders(): Record<string, string> {
  const token = process.env.BIBLE_API_TOKEN;
  if (token) {
    return { Authorization: `Bearer ${token}` };
  }
  return {};
}

interface BibleVerse {
  book: {
    abbrev: { pt: string; en: string };
    name: string;
    author: string;
    group: string;
    version: string;
  };
  chapter: number | { number: number; verses: number };
  number: number;
  text: string;
}

interface BibleChapter {
  book: {
    abbrev: { pt: string; en: string };
    name: string;
  };
  chapter: {
    number: number;
    verses: number;
  };
  verses: Array<{
    number: number;
    text: string;
  }>;
}

const recoveryVerseReferences = [
  { book: "sl", chapter: 23, verse: 1 },
  { book: "sl", chapter: 23, verse: 4 },
  { book: "sl", chapter: 46, verse: 1 },
  { book: "sl", chapter: 91, verse: 1 },
  { book: "sl", chapter: 91, verse: 2 },
  { book: "sl", chapter: 27, verse: 1 },
  { book: "sl", chapter: 34, verse: 18 },
  { book: "sl", chapter: 55, verse: 22 },
  { book: "sl", chapter: 121, verse: 1 },
  { book: "sl", chapter: 121, verse: 2 },
  { book: "is", chapter: 41, verse: 10 },
  { book: "is", chapter: 40, verse: 31 },
  { book: "is", chapter: 43, verse: 1 },
  { book: "is", chapter: 43, verse: 2 },
  { book: "jr", chapter: 29, verse: 11 },
  { book: "mt", chapter: 11, verse: 28 },
  { book: "mt", chapter: 6, verse: 34 },
  { book: "jo", chapter: 14, verse: 27 },
  { book: "jo", chapter: 16, verse: 33 },
  { book: "rm", chapter: 8, verse: 28 },
  { book: "rm", chapter: 8, verse: 38 },
  { book: "rm", chapter: 8, verse: 39 },
  { book: "fp", chapter: 4, verse: 6 },
  { book: "fp", chapter: 4, verse: 7 },
  { book: "fp", chapter: 4, verse: 13 },
  { book: "1pe", chapter: 5, verse: 7 },
  { book: "2co", chapter: 1, verse: 3 },
  { book: "2co", chapter: 1, verse: 4 },
  { book: "2co", chapter: 4, verse: 16 },
  { book: "2co", chapter: 4, verse: 17 },
  { book: "hb", chapter: 13, verse: 5 },
  { book: "hb", chapter: 13, verse: 6 },
  { book: "tg", chapter: 1, verse: 2 },
  { book: "tg", chapter: 1, verse: 3 },
  { book: "ap", chapter: 21, verse: 4 },
];

const dailyVerseReferences = [
  { book: "sl", chapter: 1, verse: 1 },
  { book: "sl", chapter: 1, verse: 2 },
  { book: "sl", chapter: 19, verse: 1 },
  { book: "sl", chapter: 37, verse: 4 },
  { book: "sl", chapter: 37, verse: 5 },
  { book: "sl", chapter: 100, verse: 4 },
  { book: "sl", chapter: 103, verse: 1 },
  { book: "sl", chapter: 118, verse: 24 },
  { book: "sl", chapter: 119, verse: 105 },
  { book: "sl", chapter: 139, verse: 14 },
  { book: "sl", chapter: 145, verse: 18 },
  { book: "sl", chapter: 150, verse: 6 },
  { book: "pv", chapter: 3, verse: 5 },
  { book: "pv", chapter: 3, verse: 6 },
  { book: "pv", chapter: 16, verse: 3 },
  { book: "pv", chapter: 22, verse: 6 },
  { book: "ec", chapter: 3, verse: 1 },
  { book: "is", chapter: 26, verse: 3 },
  { book: "is", chapter: 40, verse: 29 },
  { book: "is", chapter: 55, verse: 8 },
  { book: "jr", chapter: 33, verse: 3 },
  { book: "lm", chapter: 3, verse: 22 },
  { book: "lm", chapter: 3, verse: 23 },
  { book: "mt", chapter: 5, verse: 14 },
  { book: "mt", chapter: 5, verse: 16 },
  { book: "mt", chapter: 6, verse: 33 },
  { book: "mt", chapter: 7, verse: 7 },
  { book: "mt", chapter: 22, verse: 37 },
  { book: "mt", chapter: 28, verse: 19 },
  { book: "mt", chapter: 28, verse: 20 },
  { book: "jo", chapter: 3, verse: 16 },
  { book: "jo", chapter: 8, verse: 32 },
  { book: "jo", chapter: 10, verse: 10 },
  { book: "jo", chapter: 13, verse: 34 },
  { book: "jo", chapter: 15, verse: 5 },
  { book: "rm", chapter: 5, verse: 8 },
  { book: "rm", chapter: 12, verse: 2 },
  { book: "rm", chapter: 12, verse: 12 },
  { book: "1co", chapter: 10, verse: 31 },
  { book: "1co", chapter: 13, verse: 4 },
  { book: "1co", chapter: 13, verse: 13 },
  { book: "1co", chapter: 16, verse: 14 },
  { book: "2co", chapter: 5, verse: 17 },
  { book: "gl", chapter: 5, verse: 22 },
  { book: "gl", chapter: 6, verse: 9 },
  { book: "ef", chapter: 2, verse: 8 },
  { book: "ef", chapter: 4, verse: 32 },
  { book: "fp", chapter: 1, verse: 6 },
  { book: "fp", chapter: 2, verse: 3 },
  { book: "fp", chapter: 3, verse: 13 },
  { book: "fp", chapter: 3, verse: 14 },
  { book: "cl", chapter: 3, verse: 23 },
  { book: "1ts", chapter: 5, verse: 16 },
  { book: "1ts", chapter: 5, verse: 17 },
  { book: "1ts", chapter: 5, verse: 18 },
  { book: "2tm", chapter: 1, verse: 7 },
  { book: "hb", chapter: 11, verse: 1 },
  { book: "hb", chapter: 12, verse: 1 },
  { book: "hb", chapter: 12, verse: 2 },
  { book: "tg", chapter: 1, verse: 5 },
  { book: "tg", chapter: 1, verse: 22 },
  { book: "1pe", chapter: 3, verse: 15 },
  { book: "1jo", chapter: 4, verse: 8 },
  { book: "1jo", chapter: 4, verse: 19 },
];

const bookNames: Record<string, string> = {
  gn: "Gênesis",
  ex: "Êxodo",
  lv: "Levítico",
  nm: "Números",
  dt: "Deuteronômio",
  js: "Josué",
  jz: "Juízes",
  rt: "Rute",
  "1sm": "1 Samuel",
  "2sm": "2 Samuel",
  "1rs": "1 Reis",
  "2rs": "2 Reis",
  "1cr": "1 Crônicas",
  "2cr": "2 Crônicas",
  ed: "Esdras",
  ne: "Neemias",
  et: "Ester",
  job: "Jó",
  sl: "Salmos",
  pv: "Provérbios",
  ec: "Eclesiastes",
  ct: "Cânticos",
  is: "Isaías",
  jr: "Jeremias",
  lm: "Lamentações",
  ez: "Ezequiel",
  dn: "Daniel",
  os: "Oséias",
  jl: "Joel",
  am: "Amós",
  ob: "Obadias",
  jn: "Jonas",
  mq: "Miquéias",
  na: "Naum",
  hc: "Habacuque",
  sf: "Sofonias",
  ag: "Ageu",
  zc: "Zacarias",
  ml: "Malaquias",
  mt: "Mateus",
  mc: "Marcos",
  lc: "Lucas",
  jo: "João",
  at: "Atos",
  rm: "Romanos",
  "1co": "1 Coríntios",
  "2co": "2 Coríntios",
  gl: "Gálatas",
  ef: "Efésios",
  fp: "Filipenses",
  cl: "Colossenses",
  "1ts": "1 Tessalonicenses",
  "2ts": "2 Tessalonicenses",
  "1tm": "1 Timóteo",
  "2tm": "2 Timóteo",
  tt: "Tito",
  fm: "Filemom",
  hb: "Hebreus",
  tg: "Tiago",
  "1pe": "1 Pedro",
  "2pe": "2 Pedro",
  "1jo": "1 João",
  "2jo": "2 João",
  "3jo": "3 João",
  jd: "Judas",
  ap: "Apocalipse",
};

// Fallback verses for when the API is unavailable
const fallbackVerses: Array<{ text: string; book: string; chapter: number; verse: number }> = [
  { text: "O Senhor é o meu pastor; nada me faltará.", book: "sl", chapter: 23, verse: 1 },
  { text: "Ainda que eu ande pelo vale da sombra da morte, não temerei mal algum, porque tu estás comigo.", book: "sl", chapter: 23, verse: 4 },
  { text: "Deus é o nosso refúgio e fortaleza, socorro bem presente na angústia.", book: "sl", chapter: 46, verse: 1 },
  { text: "Confia no Senhor de todo o teu coração e não te estribes no teu próprio entendimento.", book: "pv", chapter: 3, verse: 5 },
  { text: "Porque Deus amou o mundo de tal maneira que deu o seu Filho unigênito, para que todo aquele que nele crê não pereça, mas tenha a vida eterna.", book: "jo", chapter: 3, verse: 16 },
  { text: "E conhecereis a verdade, e a verdade vos libertará.", book: "jo", chapter: 8, verse: 32 },
  { text: "Não temas, porque eu sou contigo; não te assombres, porque eu sou o teu Deus.", book: "is", chapter: 41, verse: 10 },
  { text: "Eu é que sei os planos que tenho para vocês, diz o Senhor, planos de fazê-los prosperar e não de causar dano, planos de dar a vocês esperança e um futuro.", book: "jr", chapter: 29, verse: 11 },
  { text: "Vinde a mim, todos os que estais cansados e oprimidos, e eu vos aliviarei.", book: "mt", chapter: 11, verse: 28 },
  { text: "Sabemos que todas as coisas cooperam para o bem daqueles que amam a Deus.", book: "rm", chapter: 8, verse: 28 },
  { text: "Tudo posso naquele que me fortalece.", book: "fp", chapter: 4, verse: 13 },
  { text: "Não andeis ansiosos de coisa alguma; em tudo, porém, sejam conhecidas, diante de Deus, as vossas petições, pela oração e pela súplica, com ações de graças.", book: "fp", chapter: 4, verse: 6 },
  { text: "A paz de Deus, que excede todo entendimento, guardará os vossos corações e as vossas mentes em Cristo Jesus.", book: "fp", chapter: 4, verse: 7 },
  { text: "Lançando sobre ele toda a vossa ansiedade, porque ele tem cuidado de vós.", book: "1pe", chapter: 5, verse: 7 },
  { text: "Ora, a fé é a certeza de coisas que se esperam, a convicção de fatos que se não veem.", book: "hb", chapter: 11, verse: 1 },
];

const reflections: Record<string, string> = {
  sl_23_1: "Deus cuida de nós como um pastor cuida de suas ovelhas, suprindo todas as nossas necessidades.",
  sl_23_4: "Mesmo nos momentos mais difíceis, Deus está conosco e nos protege.",
  sl_46_1: "Deus é nossa fortaleza, podemos confiar nEle em qualquer tribulação.",
  sl_91_1: "Habitar na presença de Deus nos traz segurança e paz.",
  sl_91_2: "Declarar nossa confiança em Deus fortalece nossa fé.",
  sl_27_1: "Com Deus ao nosso lado, não precisamos temer ninguém.",
  sl_34_18: "Deus está perto daqueles que passam por dificuldades.",
  sl_55_22: "Podemos entregar todas as nossas preocupações a Deus.",
  sl_121_1: "Nossa ajuda vem do Senhor, criador de todas as coisas.",
  sl_121_2: "O Deus que criou o universo é o mesmo que nos ajuda.",
  is_41_10: "Deus nos fortalece e nos sustenta em todas as situações.",
  is_40_31: "Esperar no Senhor renova nossas forças.",
  is_43_1: "Deus nos conhece pelo nome e nos chama para Si.",
  is_43_2: "Deus promete estar conosco nas dificuldades.",
  jr_29_11: "Deus tem planos de esperança e futuro para nós.",
  mt_11_28: "Jesus oferece descanso para os cansados e sobrecarregados.",
  mt_6_34: "Não devemos nos preocupar com o amanhã, cada dia tem suas próprias lutas.",
  jo_14_27: "A paz de Cristo é diferente da paz do mundo.",
  jo_16_33: "Em Cristo temos paz, mesmo em meio às tribulações.",
  rm_8_28: "Deus faz todas as coisas cooperarem para o bem dos que O amam.",
  rm_8_38: "Nada pode nos separar do amor de Deus.",
  rm_8_39: "O amor de Deus em Cristo é inabalável.",
  fp_4_6: "A oração é o antídoto para a ansiedade.",
  fp_4_7: "A paz de Deus guarda nossos corações e mentes.",
  fp_4_13: "Em Cristo, temos força para enfrentar qualquer situação.",
  "1pe_5_7": "Deus se importa conosco e quer carregar nossos fardos.",
  "2co_1_3": "Deus é a fonte de toda consolação.",
  "2co_1_4": "Deus nos consola para que possamos consolar outros.",
  "2co_4_16": "Mesmo quando o corpo enfraquece, nosso interior é renovado.",
  "2co_4_17": "As aflições presentes são leves comparadas à glória futura.",
  hb_13_5: "Deus nunca nos abandona.",
  hb_13_6: "Com Deus ao nosso lado, podemos ter coragem.",
  tg_1_2: "As provações podem ser fonte de alegria quando confiamos em Deus.",
  tg_1_3: "As provações desenvolvem nossa perseverança.",
  ap_21_4: "Um dia, Deus enxugará toda lágrima.",
};

function getChapterNumber(chapter: number | { number: number; verses: number }): number {
  if (typeof chapter === 'number') {
    return chapter;
  }
  return chapter.number;
}

async function fetchVerse(book: string, chapter: number, verse: number): Promise<BibleVerse | null> {
  try {
    const response = await fetch(`${BIBLE_API_BASE}/verses/${VERSION}/${book}/${chapter}/${verse}`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      // Only log warning for unexpected errors (not 500 which is common for this API)
      if (response.status !== 500) {
        console.warn(`[BibleAPI] Verse fetch returned ${response.status}`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    // Silently fail - fallback will be used
    return null;
  }
}

async function fetchRandomVerse(): Promise<BibleVerse | null> {
  try {
    const response = await fetch(`${BIBLE_API_BASE}/verses/${VERSION}/random`, {
      headers: getAuthHeaders(),
      signal: AbortSignal.timeout(5000)
    });
    if (!response.ok) {
      // Only log warning for unexpected errors
      if (response.status !== 500) {
        console.warn(`[BibleAPI] Random verse fetch returned ${response.status}`);
      }
      return null;
    }
    return await response.json();
  } catch (error) {
    // Silently fail - fallback will be used
    return null;
  }
}

function getLocalFallbackVerse(): { verse: string; reference: string } {
  const today = new Date();
  const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
  const verseIndex = dayOfYear % fallbackVerses.length;
  const fallback = fallbackVerses[verseIndex];
  const bookName = bookNames[fallback.book] || fallback.book;
  return {
    verse: fallback.text,
    reference: `${bookName} ${fallback.chapter}:${fallback.verse} (ARA)`
  };
}

export async function getDailyVerse(): Promise<{ verse: string; reference: string } | null> {
  try {
    const today = new Date();
    const dayOfYear = Math.floor((today.getTime() - new Date(today.getFullYear(), 0, 0).getTime()) / 86400000);
    const verseIndex = dayOfYear % dailyVerseReferences.length;
    const ref = dailyVerseReferences[verseIndex];
    
    const verseData = await fetchVerse(ref.book, ref.chapter, ref.verse);
    if (!verseData) {
      const randomVerse = await fetchRandomVerse();
      if (randomVerse) {
        const bookName = randomVerse.book?.name || bookNames[randomVerse.book?.abbrev?.pt] || "Bíblia";
        const chapterNum = getChapterNumber(randomVerse.chapter);
        return {
          verse: randomVerse.text,
          reference: `${bookName} ${chapterNum}:${randomVerse.number} (ARA)`
        };
      }
      // Use local fallback when external API is unavailable (silent - this is expected)
      return getLocalFallbackVerse();
    }
    
    const bookName = bookNames[ref.book] || verseData.book?.name || ref.book;
    return {
      verse: verseData.text,
      reference: `${bookName} ${ref.chapter}:${ref.verse} (ARA)`
    };
  } catch (error) {
    console.error("[BibleAPI] Error getting daily verse:", error);
    // Use local fallback on any error
    return getLocalFallbackVerse();
  }
}

export async function getRecoveryVerses(count: number = 5): Promise<Array<{ verse: string; reference: string; reflection: string }> | null> {
  try {
    const shuffled = [...recoveryVerseReferences].sort(() => Math.random() - 0.5);
    const selected = shuffled.slice(0, count);
    
    const verses: Array<{ verse: string; reference: string; reflection: string }> = [];
    
    for (const ref of selected) {
      const verseData = await fetchVerse(ref.book, ref.chapter, ref.verse);
      if (verseData) {
        const bookName = bookNames[ref.book] || verseData.book?.name || ref.book;
        const reflectionKey = `${ref.book}_${ref.chapter}_${ref.verse}`;
        const reflection = reflections[reflectionKey] || "Medite neste versículo e deixe que a Palavra de Deus traga paz ao seu coração.";
        
        verses.push({
          verse: verseData.text,
          reference: `${bookName} ${ref.chapter}:${ref.verse} (ARA)`,
          reflection
        });
      }
    }
    
    return verses.length > 0 ? verses : null;
  } catch (error) {
    console.error("[BibleAPI] Error getting recovery verses:", error);
    return null;
  }
}

export async function getVerseByReference(book: string, chapter: number, verse: number): Promise<{ text: string; reference: string } | null> {
  try {
    const verseData = await fetchVerse(book, chapter, verse);
    if (!verseData) return null;
    
    const bookName = bookNames[book] || verseData.book?.name || book;
    return {
      text: verseData.text,
      reference: `${bookName} ${chapter}:${verse} (ARA)`
    };
  } catch (error) {
    console.error("[BibleAPI] Error getting verse by reference:", error);
    return null;
  }
}

export function isBibleAPIConfigured(): boolean {
  return true;
}
