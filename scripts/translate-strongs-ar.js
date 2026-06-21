#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.resolve(__dirname, '..');
const STRONGS_DIR = path.join(ROOT_DIR, 'components/data/strongs');
const LEXICON_FILE = path.join(STRONGS_DIR, 'generatedLexicon.json');
const OVERRIDES_FILE = path.join(STRONGS_DIR, 'arabicOverrides.json');

const OPENAI_API_KEY =
  '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';
const OPENAI_MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';
const BATCH_SIZE = Number(process.env.BATCH_SIZE || 40);
const LIMIT = Number(process.env.LIMIT || 0);
const DRY_RUN = process.argv.includes('--dry-run');

const readJsonFile = filePath => JSON.parse(fs.readFileSync(filePath, 'utf8'));

const writeJsonFile = (filePath, value) => {
  fs.writeFileSync(filePath, `${JSON.stringify(value, null, 2)}\n`);
};

const chunk = (items, size) => {
  const chunks = [];
  for (let index = 0; index < items.length; index += size) {
    chunks.push(items.slice(index, index + size));
  }
  return chunks;
};

const extractJsonObject = text => {
  try {
    return JSON.parse(text);
  } catch {
    const start = text.indexOf('{');
    const end = text.lastIndexOf('}');
    if (start === -1 || end === -1 || end <= start) {
      throw new Error(`Model response did not contain JSON: ${text}`);
    }
    return JSON.parse(text.slice(start, end + 1));
  }
};

const buildPrompt = entries =>
  [
    "Translate these Strong's lexicon definitions into clear Modern Standard Arabic.",
    'Return only a JSON object where every key is the same Strong ID and every value is one concise Arabic definition.',
    'Keep theological terms careful and neutral. Do not add verse commentary. Do not include Markdown.',
    '',
    JSON.stringify(entries, null, 2),
  ].join('\n');

const callOpenAI = async entries => {
  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: OPENAI_MODEL,
      input: buildPrompt(entries),
      temperature: 0.2,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`OpenAI request failed ${response.status}: ${errorText}`);
  }

  const payload = await response.json();
  const outputText =
    payload.output_text ||
    payload.output
      ?.flatMap(item => item.content || [])
      .map(content => content.text)
      .filter(Boolean)
      .join('\n');

  if (!outputText) {
    throw new Error(`OpenAI response had no text: ${JSON.stringify(payload)}`);
  }

  return extractJsonObject(outputText);
};

const compactEntry = entry => ({
  id: entry.id,
  original: entry.original,
  transliteration: entry.transliteration || '',
  pronunciation: entry.pronunciation || '',
  definitionEn: entry.definitionEn || '',
  kjvDefinition: entry.kjvDefinition || '',
});

const main = async () => {
  const lexicon = readJsonFile(LEXICON_FILE);
  const overrides = fs.existsSync(OVERRIDES_FILE)
    ? readJsonFile(OVERRIDES_FILE)
    : {};

  const missingEntries = Object.values(lexicon)
    .filter(entry => !overrides[entry.id] && !entry.definitionAr)
    .map(compactEntry);
  const targetEntries = LIMIT ? missingEntries.slice(0, LIMIT) : missingEntries;

  console.log(
    `Arabic overrides: ${Object.keys(overrides).length}. Missing: ${
      missingEntries.length
    }. This run: ${targetEntries.length}.`,
  );

  if (!targetEntries.length) {
    return;
  }

  if (DRY_RUN) {
    console.log(JSON.stringify(targetEntries.slice(0, BATCH_SIZE), null, 2));
    return;
  }

  if (!OPENAI_API_KEY) {
    throw new Error(
      'OPENAI_API_KEY is required. Example: OPENAI_API_KEY=... npm run strongs:translate-ar',
    );
  }

  for (const batch of chunk(targetEntries, BATCH_SIZE)) {
    const translated = await callOpenAI(batch);
    batch.forEach(entry => {
      const value = translated[entry.id];
      if (typeof value === 'string' && value.trim()) {
        overrides[entry.id] = value.trim();
      }
    });

    writeJsonFile(
      OVERRIDES_FILE,
      Object.fromEntries(Object.entries(overrides).sort()),
    );
    console.log(
      `Saved ${Object.keys(overrides).length} Arabic definitions. Last batch: ${
        batch[0].id
      }..${batch[batch.length - 1].id}`,
    );
  }
};

main().catch(error => {
  console.error(error);
  process.exit(1);
});
