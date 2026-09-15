// Uzbek Latin <-> Cyrillic transliteration engine

const LAT_TO_CYR_COMPOUNDS = [
  { lat: 'sh', cyr: 'ш' },
  { lat: 'Sh', cyr: 'Ш' },
  { lat: 'SH', cyr: 'Ш' },
  { lat: 'ch', cyr: 'ч' },
  { lat: 'Ch', cyr: 'Ч' },
  { lat: 'CH', cyr: 'Ч' },
  { lat: "o'", cyr: 'ў' },
  { lat: "O'", cyr: 'Ў' },
  { lat: 'o‘', cyr: 'ў' },
  { lat: 'O‘', cyr: 'Ў' },
  { lat: 'o’', cyr: 'ў' },
  { lat: 'O’', cyr: 'Ў' },
  { lat: 'o`', cyr: 'ў' },
  { lat: 'O`', cyr: 'Ў' },
  { lat: "g'", cyr: 'ғ' },
  { lat: "G'", cyr: 'Ғ' },
  { lat: 'g‘', cyr: 'ғ' },
  { lat: 'G‘', cyr: 'Ғ' },
  { lat: 'g’', cyr: 'ғ' },
  { lat: 'G’', cyr: 'Ғ' },
  { lat: 'g`', cyr: 'ғ' },
  { lat: 'G`', cyr: 'Ғ' },
  { lat: 'yo', cyr: 'ё' },
  { lat: 'Yo', cyr: 'Ё' },
  { lat: 'YO', cyr: 'Ё' },
  { lat: 'yu', cyr: 'ю' },
  { lat: 'Yu', cyr: 'Ю' },
  { lat: 'YU', cyr: 'Ю' },
  { lat: 'ya', cyr: 'я' },
  { lat: 'Ya', cyr: 'Я' },
  { lat: 'YA', cyr: 'Я' },
  { lat: 'ye', cyr: 'е' },
  { lat: 'Ye', cyr: 'Е' },
  { lat: 'YE', cyr: 'Е' },
  { lat: 'ts', cyr: 'ц' },
  { lat: 'Ts', cyr: 'Ц' },
  { lat: 'TS', cyr: 'Ц' },
];

const LAT_TO_CYR_SINGLES = {
  a: 'а', A: 'А',
  b: 'б', B: 'Б',
  d: 'д', D: 'Д',
  e: 'е', E: 'Е',
  f: 'ф', F: 'Ф',
  g: 'г', G: 'Г',
  h: 'ҳ', H: 'Ҳ',
  i: 'и', I: 'И',
  j: 'ж', J: 'Ж',
  k: 'к', K: 'К',
  l: 'л', L: 'Л',
  m: 'м', M: 'М',
  n: 'н', N: 'Н',
  o: 'о', O: 'О',
  p: 'п', P: 'П',
  q: 'қ', Q: 'Қ',
  r: 'р', R: 'Р',
  s: 'с', S: 'С',
  t: 'т', T: 'Т',
  u: 'у', U: 'У',
  v: 'в', V: 'В',
  x: 'х', X: 'Х',
  y: 'й', Y: 'Й',
  z: 'з', Z: 'З',
  "'": 'ъ', "’": 'ъ', "‘": 'ъ', "`": 'ъ',
};

/**
 * Transliterates Uzbek Latin text into Uzbek Cyrillic.
 * Handles compound letters (sh, ch, o', g', yo, yu, ya) before single characters.
 */
export function uzLatinToCyrillic(text) {
  if (!text || typeof text !== 'string') return text;

  let result = text;
  // Replace compounds first
  for (const item of LAT_TO_CYR_COMPOUNDS) {
    result = result.split(item.lat).join(item.cyr);
  }

  // Replace single characters
  let output = '';
  for (let i = 0; i < result.length; i++) {
    const char = result[i];
    output += LAT_TO_CYR_SINGLES[char] !== undefined ? LAT_TO_CYR_SINGLES[char] : char;
  }

  return output;
}
