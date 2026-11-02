/**
 * Turning text into the words a search can compare.
 *
 * Two passages can say the same thing and share no characters: one says
 * "migrations", the other "migrate". Comparing the raw strings finds neither
 * from the other, so everything here exists to reduce a word to the form it
 * shares with its relatives, and nothing else.
 *
 * This is deliberately the boring half. It is all local, it is all reversible
 * in the sense that nothing is thrown away that the index needs later, and it
 * has no idea what a highlight is.
 */

/**
 * A word starts with a letter or a digit and may carry the punctuation that
 * programmers write inside words, `pg_upgrade`, `sub-processor`, `c++`,
 * `3.11`. The trailing run is then trimmed, because the same characters are
 * usually just sentence punctuation.
 */
const WORD = /[\p{L}\p{N}][\p{L}\p{N}_+#.'’-]*/gu;
/** Trailing `+` and `#` are left alone, because `c++` and `c#` are the words. */
const TRAILING = /[_.'’-]+$/;
const APOSTROPHE = /['’]/g;
const DIACRITIC = /\p{Diacritic}/gu;
/** A compound is also its parts, if it was joined by one of these. */
const JOINERS = /[-_.]+/;

const NON_ASCII = /[^\u0000-\u007f]/;

/**
 * Case and accents folded away, so `Café`, `café` and `cafe` are one word.
 * Decomposing first is what lets the accent be dropped as its own character.
 *
 * Decomposing is also slow, and all but a little of what people highlight has
 * nothing in it to decompose, so the common case skips it.
 */
export function fold(text: string): string {
  if (!NON_ASCII.test(text)) return text.toLowerCase();
  return text.normalize('NFD').replace(DIACRITIC, '').toLowerCase();
}

/**
 * The words of a piece of text, in order, folded but not yet stemmed.
 *
 * A hyphenated or underscored compound is emitted whole and then in parts, so
 * that "sub-processor" answers a search for `processor` and `pg_upgrade`
 * answers one for `upgrade`, without losing the compound itself.
 */
export function words(text: string): string[] {
  const out: string[] = [];
  for (const match of fold(text).matchAll(WORD)) {
    const token = match[0].replace(TRAILING, '').replace(APOSTROPHE, '');
    if (!token) continue;
    out.push(token);
    if (JOINERS.test(token)) {
      for (const part of token.split(JOINERS)) if (part.length > 1) out.push(part);
    }
  }
  return out;
}

/**
 * Words that are never worth suggesting.
 *
 * These are *not* dropped from the search itself: a search for "to be or not
 * to be" should still work, and the ranking already discounts a word that
 * turns up everywhere. They are dropped only where the library works out which
 * words belong together, which is the one place they do damage, "the" next to
 * "database" would look like a discovery.
 *
 * The first group is the ordinary machinery of a sentence. The second is
 * vaguer and worth saying out loud: common verbs and placeholder nouns, which
 * a small library will happily correlate with anything. "Plan the cutover to
 * keep the downtime down" is enough for it to decide that `keep` means
 * `downtime`, and it is not wrong about the arithmetic; it is wrong that the
 * word is worth offering anyone. Being over-cautious here is cheap, because a
 * word on this list can still be searched for, and still matches exactly. All
 * it can never do is widen somebody else's search.
 */
const SENTENCE = [
  'a', 'about', 'after', 'again', 'all', 'also', 'am', 'an', 'and', 'any', 'are', 'as', 'at',
  'be', 'because', 'been', 'before', 'being', 'both', 'but', 'by', 'can', 'cannot', 'could',
  'did', 'do', 'does', 'doing', 'done', 'down', 'each', 'either', 'else', 'even', 'ever',
  'every', 'for', 'from', 'further', 'get', 'got', 'had', 'has', 'have', 'having', 'he', 'her',
  'here', 'hers', 'him', 'his', 'how', 'however', 'i', 'if', 'in', 'into', 'is', 'it', 'its',
  'just', 'like', 'make', 'many', 'may', 'me', 'might', 'more', 'most', 'much', 'must', 'my',
  'need', 'no', 'nor', 'not', 'now', 'of', 'off', 'on', 'once', 'one', 'only', 'or', 'other',
  'our', 'out', 'over', 'own', 'rather', 'really', 'same', 'see', 'she', 'should', 'since',
  'so', 'some', 'something', 'still', 'such', 'than', 'that', 'the', 'their', 'them', 'then',
  'there', 'these', 'they', 'thing', 'things', 'this', 'those', 'though', 'through', 'thus',
  'to', 'too', 'under', 'until', 'up', 'use', 'used', 'using', 'very', 'want', 'was', 'way',
  'we', 'well', 'were', 'what', 'when', 'where', 'whether', 'which', 'while', 'who', 'why',
  'will', 'with', 'within', 'would', 'you', 'your', 'yours',
];

/**
 * Stems, so the irregular forms have to be listed beside the regular ones:
 * `kept` does not reduce to `keep`, and nor does `took` to `take`.
 */
const VAGUE = [
  'add', 'allow', 'ask', 'becom', 'became', 'bring', 'brought', 'call', 'came', 'case',
  'come', 'consider', 'find', 'found', 'gave', 'give', 'given', 'go', 'gone', 'got',
  'happen', 'held', 'help', 'hold', 'keep', 'kept', 'knew', 'know', 'known', 'leav',
  'left', 'let', 'look', 'lose', 'lost', 'made', 'mean', 'meant', 'number', 'part',
  'point', 'put', 'reason', 'said', 'saw', 'say', 'see', 'seem', 'seen', 'take', 'taken',
  'tell', 'think', 'thought', 'time', 'told', 'took', 'tri', 'try', 'turn', 'went',
  'work', 'worth',
];

export const STOP = new Set([...SENTENCE, ...VAGUE]);

const VOWELS = 'aeiou';

function isVowel(word: string, at: number): boolean {
  const letter = word[at];
  if (!letter) return false;
  if (VOWELS.includes(letter)) return true;
  // A `y` is a vowel only when the letter before it is not: "sky" yes, "yes" no.
  return letter === 'y' && at > 0 && !VOWELS.includes(word[at - 1] ?? '');
}

/**
 * How many vowel-then-consonant runs a word has. Porter calls this the
 * measure, and it stands in for "is there enough word left to still be a
 * word": it is what stops `-ate` being stripped off `late`.
 */
function measure(word: string): number {
  let runs = 0;
  let seenVowel = false;
  for (let i = 0; i < word.length; i++) {
    if (isVowel(word, i)) {
      seenVowel = true;
    } else if (seenVowel) {
      runs += 1;
      seenVowel = false;
    }
  }
  return runs;
}

function hasVowel(word: string): boolean {
  for (let i = 0; i < word.length; i++) if (isVowel(word, i)) return true;
  return false;
}

function endsDoubleConsonant(word: string): boolean {
  const last = word.length - 1;
  return last > 0 && word[last] === word[last - 1] && !isVowel(word, last);
}

/** Consonant, vowel, consonant, and not the consonants that behave like vowels. */
function endsCvc(word: string): boolean {
  const last = word.length - 1;
  if (last < 2) return false;
  return (
    !isVowel(word, last) &&
    isVowel(word, last - 1) &&
    !isVowel(word, last - 2) &&
    !'wxy'.includes(word[last] ?? '')
  );
}

/**
 * `happy` and `happiness` have to meet in the middle, and they meet at `happi`.
 * Run before the suffix lists, because several of them are spelled for a word
 * this has already been through, `-ently` reaches `-entli` by this route.
 */
function yToI(word: string): string {
  if (word.length > 2 && word.endsWith('y') && hasVowel(word.slice(0, -1))) {
    return `${word.slice(0, -1)}i`;
  }
  return word;
}

function replaceEnd(word: string, suffix: string, with_: string): string {
  return word.slice(0, word.length - suffix.length) + with_;
}

/** Suffix pairs applied when there is at least one vowel-consonant run left. */
const DERIVED: ReadonlyArray<readonly [string, string]> = [
  ['ational', 'ate'], ['tional', 'tion'], ['ization', 'ize'], ['iveness', 'ive'],
  ['fulness', 'ful'], ['ousness', 'ous'], ['biliti', 'ble'], ['ation', 'ate'],
  ['alism', 'al'], ['aliti', 'al'], ['iviti', 'ive'], ['entli', 'ent'],
  ['ousli', 'ous'], ['enci', 'ence'], ['anci', 'ance'], ['izer', 'ize'],
  ['abli', 'able'], ['alli', 'al'], ['ator', 'ate'], ['eli', 'e'],
];

/** The same, one layer further in. */
const FURTHER: ReadonlyArray<readonly [string, string]> = [
  ['icate', 'ic'], ['ative', ''], ['alize', 'al'], ['iciti', 'ic'], ['ical', 'ic'],
  ['ful', ''], ['ness', ''],
];

/** Endings that come off entirely once there are two runs left to stand on. */
const ENDINGS = [
  'ement', 'ance', 'ence', 'able', 'ible', 'ment', 'ent', 'ant', 'ism', 'ate',
  'iti', 'ous', 'ive', 'ize', 'al', 'er', 'ic', 'ou',
];

/**
 * Reduces a word to the stem it shares with its relatives, so that a search
 * for `migrate` finds "migrations" and one for `upgraded` finds "upgrading".
 *
 * This is Porter's algorithm, trimmed: the steps that earn their keep on the
 * kind of text people highlight, in the order he put them. The output is not
 * a word and is never shown to anyone, `relates` becomes `relat`, which is
 * why the index keeps the spelling it actually saw alongside the stem.
 */
export function stem(word: string): string {
  const known = STEMMED.get(word);
  if (known !== undefined) return known;
  const found = reduce(word);
  // Clearing wholesale rather than evicting one at a time: this only happens
  // on a library with tens of thousands of distinct words, and the next pass
  // over the same text fills it straight back up.
  if (STEMMED.size >= STEM_CACHE) STEMMED.clear();
  STEMMED.set(word, found);
  return found;
}

/**
 * Indexing a library stems the same words over and over, a few thousand
 * highlights are a hundred thousand words and a few thousand distinct ones,
 * and this is most of the cost of building an index, so it is worth keeping.
 */
const STEMMED = new Map<string, string>();
const STEM_CACHE = 50_000;

function reduce(word: string): string {
  if (word.length < 4) return word;
  let out = word;

  // Plurals.
  if (out.endsWith('sses')) out = out.slice(0, -2);
  else if (out.endsWith('ies')) out = `${out.slice(0, -3)}i`;
  else if (out.endsWith('s') && !out.endsWith('ss') && !out.endsWith('us')) out = out.slice(0, -1);

  // Past and progressive.
  if (out.endsWith('eed')) {
    if (measure(out.slice(0, -1)) > 0) out = out.slice(0, -1);
  } else {
    const shorter = out.endsWith('ed')
      ? out.slice(0, -2)
      : out.endsWith('ing')
        ? out.slice(0, -3)
        : null;
    if (shorter !== null && hasVowel(shorter)) {
      out = shorter;
      // What the dropped ending was hiding: a silent `e`, or a consonant
      // doubled only to carry the ending in the first place.
      if (/(?:at|bl|iz)$/.test(out)) out += 'e';
      else if (endsDoubleConsonant(out) && !/[lsz]$/.test(out)) out = out.slice(0, -1);
      else if (measure(out) === 1 && endsCvc(out)) out += 'e';
    }
  }

  out = yToI(out);

  for (const [suffix, instead] of DERIVED) {
    if (out.endsWith(suffix) && measure(replaceEnd(out, suffix, '')) > 0) {
      out = replaceEnd(out, suffix, instead);
      break;
    }
  }
  for (const [suffix, instead] of FURTHER) {
    if (out.endsWith(suffix) && measure(replaceEnd(out, suffix, '')) > 0) {
      out = replaceEnd(out, suffix, instead);
      break;
    }
  }
  for (const suffix of ENDINGS) {
    if (out.endsWith(suffix) && measure(replaceEnd(out, suffix, '')) > 1) {
      out = replaceEnd(out, suffix, '');
      break;
    }
  }
  // `-ion` only where it leaves something that can take it.
  if (out.endsWith('ion') && measure(out.slice(0, -3)) > 1 && /[st]$/.test(out.slice(0, -3))) {
    out = out.slice(0, -3);
  }

  // A trailing `e`, and a doubled `l`, once there is enough word without them.
  if (out.endsWith('e')) {
    const without = out.slice(0, -1);
    const runs = measure(without);
    if (runs > 1 || (runs === 1 && !endsCvc(without))) out = without;
  }
  if (measure(out) > 1 && out.endsWith('ll')) out = out.slice(0, -1);

  // Again, because a suffix coming off can uncover a `y`: `deployment` only
  // becomes `deploy` above, and it has to end up where `deploy` itself does.
  return yToI(out);
}

/** The stems of a piece of text, in order, with the empty ones dropped. */
export function stems(text: string): string[] {
  return words(text).map(stem).filter(Boolean);
}
