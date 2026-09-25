/** Cosmetic identities only: every character uses the same physics and controls. */
export const CHARACTERS = [
  { id: 'ruby', name: 'Руби', title: 'Неоновый закат', color: '#ff69c5', template: 0,
    image: new URL('./assets/player-magenta.png', import.meta.url).href, skin: '#dba080', shade: '#a96863', hair: true },
  { id: 'sky', name: 'Скай', title: 'Морской бриз', color: '#50e4ff', template: 1,
    image: new URL('./assets/player-cyan.png', import.meta.url).href, skin: '#dba98b', shade: '#a67670', wisps: true },
  { id: 'kai', name: 'Кай', title: 'Король прибоя', color: '#ffad55', template: 0,
    image: new URL('./assets/player-kai.png', import.meta.url).href, skin: '#c78a62', shade: '#905b46' },
  { id: 'luna', name: 'Луна', title: 'Лунная волна', color: '#ba99ff', template: 0,
    image: new URL('./assets/player-luna.png', import.meta.url).href, skin: '#865540', shade: '#57332d', hair: true },
  { id: 'volt', name: 'Вольт', title: 'Заряжен на победу', color: '#c2ff57', template: 0,
    image: new URL('./assets/player-volt.png', import.meta.url).href, skin: '#7b8790', shade: '#343c46' },
  { id: 'pineapple', name: 'Капитан Ананас', title: 'Тропический беспредел', color: '#ffd34d', template: 0,
    image: new URL('./assets/player-pineapple.png', import.meta.url).href, skin: '#efb944', shade: '#ac702c', wild: true },
]

export const DEFAULT_CHARACTERS = ['ruby', 'sky']
export const CHARACTERS_STORAGE_KEY = 'ragdoll-volley-characters'

export function getCharacter(id) {
  return CHARACTERS.find(character => character.id === id) ?? CHARACTERS[0]
}

/** Validate each side independently; duplicate choices are intentionally allowed. */
export function normalizeCharacters(value) {
  return DEFAULT_CHARACTERS.map((fallback, i) =>
    Array.isArray(value) && CHARACTERS.some(character => character.id === value[i]) ? value[i] : fallback)
}

export function loadCharacters(storage) {
  try { return normalizeCharacters(JSON.parse(storage.getItem(CHARACTERS_STORAGE_KEY))) }
  catch (_) { return [...DEFAULT_CHARACTERS] }
}

export function saveCharacters(storage, characters) {
  try { storage.setItem(CHARACTERS_STORAGE_KEY, JSON.stringify(normalizeCharacters(characters))) }
  catch (_) { /* Private browsing or a full storage quota must not block a match. */ }
}
