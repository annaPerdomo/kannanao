import type { ReviewCardValue } from '@/components/ReviewCard';

export interface QuizletCard {
  front: string;
  back: string;
  image?: string;
}

export interface QuizletSet {
  title: string;
  url: string;
  cards: QuizletCard[];
}

export interface QuizletDraftCard extends ReviewCardValue {
  include: boolean;
  cardType: 'word' | 'phrase';
}

export interface QuizletImportSet {
  url: string;
  name: string;
  include: boolean;
  cards: QuizletDraftCard[];
}

export const QUIZLET_HASH_KEY = 'quizlet';
export const QUIZLET_QUEUE_KEY = 'tangodachi:quizlet-imports';
const MAX_CARDS = 1000;
const MAX_FIELD = 500;
const MAX_TITLE = 80;

const KANA_RUN = /^[\p{Script=Hiragana}\p{Script=Katakana}ー～〜・]+$/u;
const HAS_KANJI = /\p{Script=Han}/u;
const HAS_JAPANESE = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}]/u;
const WORD_WITH_READING = /^(.+?)[（(]([\p{Script=Hiragana}\p{Script=Katakana}ー]+)[)）]$/u;
const READING_WITH_WORD = /^([\p{Script=Hiragana}\p{Script=Katakana}ー]+)[（(](.+?)[)）]$/u;
const SENTENCE_MARK = /[。？！?!]/;

function clean(text: unknown, max = MAX_FIELD): string {
  return typeof text === 'string' ? text.replace(/\s+/g, ' ').trim().slice(0, max) : '';
}

export function cleanQuizletTitle(title: string): string {
  return clean(title.replace(/\s*(flash\s*cards)?\s*\|\s*Quizlet.*$/i, ''), MAX_TITLE);
}

function isQuizletUrl(value: string, requireSetPath: boolean): boolean {
  try {
    const url = new URL(value);
    const hostOk = url.hostname === 'quizlet.com' || url.hostname.endsWith('.quizlet.com');
    return url.protocol === 'https:' && hostOk && (!requireSetPath || /\/\d+/.test(url.pathname));
  } catch {
    return false;
  }
}

export function parseQuizletSet(raw: unknown): QuizletSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const { title, url, cards } = raw as Record<string, unknown>;
  if (typeof url !== 'string' || !isQuizletUrl(url, true) || !Array.isArray(cards)) return null;
  const parsed = cards.slice(0, MAX_CARDS).flatMap((card): QuizletCard[] => {
    if (!card || typeof card !== 'object') return [];
    const c = card as Record<string, unknown>;
    const front = clean(c.front);
    const back = clean(c.back);
    if (!front && !back) return [];
    const image = typeof c.image === 'string' && isQuizletUrl(c.image, false) ? c.image : undefined;
    return [{ front, back, ...(image ? { image } : {}) }];
  });
  if (parsed.length === 0) return null;
  return { title: cleanQuizletTitle(clean(title)) || 'Quizlet', url, cards: parsed };
}

function fromBase64Url(value: string): string {
  const b64 = value.replace(/-/g, '+').replace(/_/g, '/');
  const bytes = Uint8Array.from(atob(b64), (ch) => ch.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

export function toBase64Url(text: string): string {
  let binary = '';
  new TextEncoder().encode(text).forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export function decodeQuizletHash(hash: string): QuizletSet | null {
  const params = new URLSearchParams(hash.replace(/^#/, ''));
  const payload = params.get(QUIZLET_HASH_KEY);
  if (!payload) return null;
  try {
    return parseQuizletSet(JSON.parse(fromBase64Url(payload)));
  } catch {
    return null;
  }
}

const KANA_EDGES =
  /^([\p{Script=Hiragana}\p{Script=Katakana}ー]*)(.*?)([\p{Script=Hiragana}\p{Script=Katakana}ー]*)$/u;

function readingFits(word: string, reading: string): boolean {
  const [, lead, core, trail] = word.match(KANA_EDGES) ?? [];
  if (!core || !HAS_KANJI.test(core)) return false;
  const kanjiCount = [...core].filter((ch) => HAS_KANJI.test(ch)).length;
  return (
    reading.startsWith(lead) &&
    reading.endsWith(trail) &&
    reading.length - lead.length - trail.length >= kanjiCount
  );
}

function splitWordAndReading(front: string): { word: string; reading: string } {
  const parts = front.split(/[\s\u3000]+/);
  if (parts.length === 2) {
    const [a, b] = parts;
    if (KANA_RUN.test(a) && readingFits(b, a)) return { word: b, reading: a };
    if (KANA_RUN.test(b) && readingFits(a, b)) return { word: a, reading: b };
  }
  const paren = front.match(WORD_WITH_READING);
  if (paren && HAS_KANJI.test(paren[1])) return { word: paren[1].trim(), reading: paren[2] };
  const kanaFirst = front.match(READING_WITH_WORD);
  if (kanaFirst && HAS_KANJI.test(kanaFirst[2])) {
    return { word: kanaFirst[2].trim(), reading: kanaFirst[1] };
  }
  return { word: front, reading: '' };
}

export function mainViewModeFor(word: string, reading: string): 'kanji' | 'hiragana' {
  return reading.trim() && HAS_KANJI.test(word) ? 'kanji' : 'hiragana';
}

export function quizletCardToDraft(card: QuizletCard): QuizletDraftCard {
  const englishFront = !HAS_JAPANESE.test(card.front) && HAS_JAPANESE.test(card.back);
  const front = englishFront ? card.back : card.front;
  const back = englishFront ? card.front : card.back;
  const { word, reading } = splitWordAndReading(front);
  const phrase = SENTENCE_MARK.test(word) || /\s/.test(word) || word.length > 15;
  return {
    word,
    reading,
    meaning: back,
    exampleJp: '',
    exampleEn: '',
    imageQuery: '',
    imageUrl: card.image ?? null,
    jlptLevel: null,
    include: Boolean(word && back),
    cardType: phrase ? 'phrase' : 'word',
  };
}

export function toImportSet(set: QuizletSet): QuizletImportSet {
  return { url: set.url, name: set.title, include: true, cards: set.cards.map(quizletCardToDraft) };
}

export function keptCards(set: QuizletImportSet): QuizletDraftCard[] {
  return set.cards.filter((c) => c.include && c.word.trim());
}

export function isReadyToSave(set: QuizletImportSet): boolean {
  return set.include && keptCards(set).length > 0;
}

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

function parseStoredCard(raw: unknown): QuizletDraftCard | null {
  if (!raw || typeof raw !== 'object') return null;
  const c = raw as Record<string, unknown>;
  return {
    word: str(c.word),
    reading: str(c.reading),
    meaning: str(c.meaning),
    exampleJp: str(c.exampleJp),
    exampleEn: str(c.exampleEn),
    imageQuery: str(c.imageQuery),
    imageUrl: typeof c.imageUrl === 'string' ? c.imageUrl : null,
    jlptLevel: typeof c.jlptLevel === 'string' ? c.jlptLevel : null,
    include: c.include !== false,
    cardType: c.cardType === 'phrase' ? 'phrase' : 'word',
  };
}

function parseStoredSet(raw: unknown): QuizletImportSet | null {
  if (!raw || typeof raw !== 'object') return null;
  const s = raw as Record<string, unknown>;
  if (typeof s.url !== 'string' || !isQuizletUrl(s.url, true) || !Array.isArray(s.cards)) {
    return null;
  }
  const cards = s.cards.map(parseStoredCard).filter((c): c is QuizletDraftCard => c !== null);
  return { url: s.url, name: str(s.name), include: s.include !== false, cards };
}

/** Stores edited drafts, not raw sets: each bookmarklet send is a full page load. */
export function loadQuizletQueue(): QuizletImportSet[] {
  try {
    const raw = JSON.parse(localStorage.getItem(QUIZLET_QUEUE_KEY) ?? '[]') as unknown;
    if (!Array.isArray(raw)) return [];
    return raw.map(parseStoredSet).filter((s): s is QuizletImportSet => s !== null);
  } catch {
    return [];
  }
}

export function saveQuizletQueue(sets: QuizletImportSet[]): void {
  try {
    if (sets.length === 0) localStorage.removeItem(QUIZLET_QUEUE_KEY);
    else localStorage.setItem(QUIZLET_QUEUE_KEY, JSON.stringify(sets));
  } catch {
    // Private mode or full storage: the import still works for this tab.
  }
}

export function addToQueue(queue: QuizletImportSet[], set: QuizletImportSet): QuizletImportSet[] {
  return [...queue.filter((s) => s.url !== set.url), set];
}

interface BookmarkletMessages {
  notASet: string;
  failed: string;
}

// Must run on quizlet.com: Quizlet captchas server-side fetches, and its
// private webapi answers only the signed-in page.
export function buildQuizletBookmarklet(origin: string, messages: BookmarkletMessages): string {
  const s = JSON.stringify;
  const source = `(async()=>{
const m=/quizlet\\.com$/.test(location.hostname)&&location.pathname.match(/\\/(\\d{3,})(?:\\/|$)/);
if(!m){alert(${s(messages.notASet)});return;}
try{
let items=[],token='',page=1,total=Infinity;
while(items.length<total&&page<=5){
const r=await fetch('/webapi/3.4/studiable-item-documents?filters%5BstudiableContainerId%5D='+m[1]+'&filters%5BstudiableContainerType%5D=1&perPage=200&page='+page+(token?'&pagingToken='+encodeURIComponent(token):''),{credentials:'include'});
if(!r.ok)throw new Error('HTTP '+r.status);
const res=(await r.json()).responses[0];
const batch=(res.models&&res.models.studiableItem)||[];
items=items.concat(batch);
total=res.paging?res.paging.total:items.length;
token=res.paging&&res.paging.token;
if(!batch.length)break;
page++;
}
const side=(it,label,i)=>it.cardSides.find(x=>x.label===label)||it.cardSides[i]||{media:[]};
const text=x=>{const t=x.media.find(y=>y.type===1);return t?t.plainText:'';};
const img=x=>{const t=x.media.find(y=>y.type===2);return t?(t.url||(t.image&&t.image.url)||''):'';};
const cards=items.map(it=>{const f=side(it,'word',0),b=side(it,'definition',1);return{front:text(f),back:text(b),image:img(b)||img(f)};});
const json=JSON.stringify({title:document.title,url:location.origin+location.pathname,cards});
let bin='';new TextEncoder().encode(json).forEach(b=>{bin+=String.fromCharCode(b);});
const b64=btoa(bin).replace(/\\+/g,'-').replace(/\\//g,'_').replace(/=+$/,'');
location.href=${s(origin)}+'/materials?tab=quizlet#${QUIZLET_HASH_KEY}='+b64;
}catch(e){alert(${s(messages.failed)}+' ('+e.message+')');}
})();`;
  return `javascript:${encodeURIComponent(source.replace(/\n/g, ''))}`;
}
