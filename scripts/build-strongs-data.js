#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT_DIR = path.resolve(__dirname, '..');
const OUT_DIR = path.join(ROOT_DIR, 'components/data/strongs');
const MAPPINGS_OUT_DIR = path.join(OUT_DIR, 'mappings');
const STRONGS_HEBREW_URL =
  'https://raw.githubusercontent.com/openscriptures/strongs/master/hebrew/strongs-hebrew-dictionary.js';
const STRONGS_GREEK_URL =
  'https://raw.githubusercontent.com/openscriptures/strongs/master/greek/strongs-greek-dictionary.js';
const MORPHHB_WLC_API =
  'https://api.github.com/repos/openscriptures/morphhb/contents/wlc';
const MORPHHB_RAW_BASE =
  'https://raw.githubusercontent.com/openscriptures/morphhb/master/wlc';

const OSIS_BOOK_TO_LOCAL_ID = {
  Gen: '1',
  Exod: '2',
  Lev: '3',
  Num: '4',
  Deut: '5',
  Josh: '6',
  Judg: '7',
  Ruth: '8',
  '1Sam': '9',
  '2Sam': '10',
  '1Kgs': '11',
  '2Kgs': '12',
  '1Chr': '13',
  '2Chr': '14',
  Ezra: '15',
  Neh: '16',
  Esth: '17',
  Job: '18',
  Ps: '19',
  Prov: '20',
  Eccl: '21',
  Song: '22',
  Isa: '23',
  Jer: '24',
  Lam: '25',
  Ezek: '26',
  Dan: '27',
  Hos: '28',
  Joel: '29',
  Amos: '30',
  Obad: '31',
  Jonah: '32',
  Mic: '33',
  Nah: '34',
  Hab: '35',
  Zeph: '36',
  Hag: '37',
  Zech: '38',
  Mal: '39',
};

const ARABIC_DEFINITION_OVERRIDES = {
  H7225: 'الأول أو البداية، من جهة المكان أو الزمن أو الترتيب أو الرتبة.',
  H1254:
    'يخلق أو يكوّن. ويأتي أيضًا بمعان مرتبطة بالاختيار أو القطع بحسب السياق.',
  H430: 'الله أو الآلهة بحسب السياق، ويُستخدم خصوصًا عن الله العلي بصيغة الجمع.',
  H8064: 'السماء أو السماوات، وتشير إلى العلو أو المجال السماوي.',
  H776: 'الأرض أو اليابسة أو البلاد، بحسب السياق.',
  G3056: 'كلمة أو قول أو فكر مُعلن. وفي يوحنا تشير خصوصًا إلى التعبير الإلهي.',
  G1510: 'فعل الوجود: أكون أو أنا كائن، ويستخدم للتأكيد على الوجود.',
};

const NEW_TESTAMENT_SEED_MAPPINGS = {
  '43:1:1': [
    { strongId: 'G3056', displayWord: 'λόγος' },
    { strongId: 'G1510', displayWord: 'ἦν' },
  ],
};

const fetchText = async url => {
  const response = await fetch(url, { headers: { 'User-Agent': 'honara7ty' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.text();
};

const fetchJson = async url => {
  const response = await fetch(url, { headers: { 'User-Agent': 'honara7ty' } });
  if (!response.ok) {
    throw new Error(`Failed to fetch ${url}: ${response.status}`);
  }
  return response.json();
};

const loadDictionaryModule = async url => {
  const source = await fetchText(url);
  const sandbox = { module: { exports: {} }, exports: {} };
  vm.runInNewContext(source, sandbox, { filename: url });
  return sandbox.module.exports;
};

const normalizeStrongId = (id, testamentPrefix) => {
  const number = String(id).match(/\d+/)?.[0];
  if (!number) {
    return null;
  }
  return `${testamentPrefix}${Number(number)}`;
};

const stripXmlTags = value =>
  value
    .replace(/<[^>]+>/g, '')
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&amp;/g, '&')
    .trim();

const stripHebrewCantillation = value =>
  value
    .replace(/[֑-ֽ׃]/g, '')
    .replace(/[\/־]/g, '')
    .trim();

const buildLexicon = (hebrew, greek) => {
  const lexicon = {};

  const addEntry = (key, entry) => {
    const strongId = key.startsWith('H') || key.startsWith('G') ? key : null;
    if (!strongId || !entry) {
      return;
    }

    lexicon[strongId] = {
      id: strongId,
      original: entry.lemma ?? '',
      transliteration: entry.xlit ?? entry.translit,
      pronunciation: entry.pron,
      definitionAr: ARABIC_DEFINITION_OVERRIDES[strongId] ?? '',
      definitionEn: entry.strongs_def ?? '',
      kjvDefinition: entry.kjv_def,
    };
  };

  Object.entries(hebrew).forEach(([key, entry]) => addEntry(key, entry));
  Object.entries(greek).forEach(([key, entry]) => addEntry(key, entry));

  return lexicon;
};

const extractVerseMappingsFromBookXml = (xml, localBookId) => {
  const mappings = {};
  const versePattern = /<verse\s+osisID="([^"]+)">([\s\S]*?)<\/verse>/g;
  let verseMatch;

  while ((verseMatch = versePattern.exec(xml))) {
    const [, osisId, verseXml] = verseMatch;
    const [, chapter, verse] = osisId.match(/^[^.]+\.(\d+)\.(\d+)$/) ?? [];
    if (!chapter || !verse) {
      continue;
    }

    const refs = [];
    const wordPattern = /<w\b([^>]*)>([\s\S]*?)<\/w>/g;
    let wordMatch;
    while ((wordMatch = wordPattern.exec(verseXml))) {
      const [, attrs, content] = wordMatch;
      const lemma = attrs.match(/\blemma="([^"]+)"/)?.[1];
      if (!lemma) {
        continue;
      }

      const strongIds = [...lemma.matchAll(/\d+/g)]
        .map(match => normalizeStrongId(match[0], 'H'))
        .filter(Boolean);
      if (!strongIds.length) {
        continue;
      }

      const displayWord = stripHebrewCantillation(stripXmlTags(content));
      strongIds.forEach(strongId => {
        if (!refs.some(ref => ref.strongId === strongId)) {
          refs.push({ strongId, displayWord });
        }
      });
    }

    if (refs.length) {
      mappings[`${localBookId}:${chapter}:${verse}`] = refs;
    }
  }

  return mappings;
};

const buildOldTestamentMappings = async () => {
  const files = await fetchJson(MORPHHB_WLC_API);
  const xmlFiles = files
    .filter(file => file.type === 'file' && file.name.endsWith('.xml'))
    .filter(file => file.name !== 'VerseMap.xml');
  const mappings = {};

  for (const file of xmlFiles) {
    const osisBook = file.name.replace(/\.xml$/, '');
    const localBookId = OSIS_BOOK_TO_LOCAL_ID[osisBook];
    if (!localBookId) {
      continue;
    }
    const xml = await fetchText(`${MORPHHB_RAW_BASE}/${file.name}`);
    Object.assign(mappings, extractVerseMappingsFromBookXml(xml, localBookId));
  }

  return { ...mappings, ...NEW_TESTAMENT_SEED_MAPPINGS };
};

const writeJsonFile = (fileName, value) => {
  const target = path.join(OUT_DIR, fileName);
  fs.writeFileSync(target, `${JSON.stringify(value)}\n`);
};

const main = async () => {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.mkdirSync(MAPPINGS_OUT_DIR, { recursive: true });

  const [hebrew, greek] = await Promise.all([
    loadDictionaryModule(STRONGS_HEBREW_URL),
    loadDictionaryModule(STRONGS_GREEK_URL),
  ]);
  const lexicon = buildLexicon(hebrew, greek);
  const mappings = await buildOldTestamentMappings();

  writeJsonFile('generatedLexicon.json', lexicon);

  fs.readdirSync(MAPPINGS_OUT_DIR)
    .filter(file => file.endsWith('.json'))
    .forEach(file => fs.unlinkSync(path.join(MAPPINGS_OUT_DIR, file)));

  const mappingsByBook = {};
  Object.entries(mappings).forEach(([verseKey, refs]) => {
    const bookId = verseKey.split(':')[0];
    mappingsByBook[bookId] ??= {};
    mappingsByBook[bookId][verseKey] = refs;
  });

  Object.entries(mappingsByBook).forEach(([bookId, bookMappings]) => {
    fs.writeFileSync(
      path.join(MAPPINGS_OUT_DIR, `book${bookId}.json`),
      `${JSON.stringify(bookMappings)}\n`,
    );
  });

  console.log(
    `Generated ${Object.keys(lexicon).length} lexicon entries and ${
      Object.keys(mappings).length
    } verse mappings across ${Object.keys(mappingsByBook).length} books.`,
  );
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
