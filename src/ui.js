import './ui.css'
import { CHARACTERS, getCharacter, loadCharacters, saveCharacters } from './roster.js'

// Menus and match overlays, built in the DOM on top of the canvas. main.js owns
// the phase and the clock; this module shows the phase and turns clicks and keys
// into requests to change it.

const MATCH_KEY = 'ragdoll-volley-match'
const MODE_KEY = 'ragdoll-volley-mode'
/** First-to targets offered on the title screen; 0 is an endless match. */
const MATCH_LENGTHS = [5, 11, 21, 0]
const DEFAULT_MATCH_LENGTH = 11

export const COUNTDOWN_STEPS = 3
export const COUNTDOWN_STEP_S = 0.6

/** The screen each phase shows; countdown and play have none. */
const SCREEN_OF_PHASE = { title: 'title', paused: 'pause', over: 'over' }

const PLAYER_KEYS = {
  1: [['←', '→'], ['↑'], ['↓'], ['Space']],
  2: [['A', 'D'], ['W'], ['S'], ['R']],
}
const ACTIONS = ['Move', 'Jump', 'Drop', 'Serve']

const POINT_REASONS = {
  ground: 'Ball down',
  touches: 'Four touches in a row',
  serve: 'Serve clock ran out',
}

const playerName = (id, mode) => mode === 'bot' ? (id === 2 ? 'Bot' : 'You') : `Player ${id}`

function playerCard(id) {
  const rows = PLAYER_KEYS[id]
    .map((keys, i) => `<div><dt>${keys.map((k) => `<kbd>${k}</kbd>`).join('')}</dt><dd>${ACTIONS[i]}</dd></div>`)
    .join('')
  return `
    <div class="player" data-player="${id}">
      <h3><span data-player-name="${id}">${playerName(id)}</span> <small>· ${id === 1 ? 'Left' : 'Right'} side</small></h3>
      <dl class="keys">${rows}</dl>
      ${id === 2 ? '<p class="bot-note" hidden>Computer opponent<br><span>Moves, jumps and serves automatically.</span></p>' : ''}
    </div>`
}

const RULES = `
  <ul class="rules">
    <li>Keep the ball off your sand</li>
    <li>Max three touches in a row</li>
    <li>Serve within six seconds</li>
    <li><kbd>Esc</kbd> or <kbd>P</kbd> pauses</li>
  </ul>`

const SCORE = `
  <p class="score-line">
    <span data-player="1" data-score="p1">0</span><span class="score-colon">:</span><span data-player="2" data-score="p2">0</span>
  </p>`

const MATCH_OPTIONS = MATCH_LENGTHS.map((n) => `
  <label class="choice-option">
    <input type="radio" name="points" value="${n}"${n ? '' : ' aria-label="Endless"'}>
    <span>${n || '∞'}</span>
  </label>`).join('')

function characterPicker(id) {
  return `<section class="character-player" data-picker="${id}" data-player="${id}" aria-labelledby="character-player-${id}">
    <h3 id="character-player-${id}"><span data-player-name="${id}">${playerName(id)}</span><small> · ${id === 1 ? 'Слева' : 'Справа'}</small></h3>
    <div class="character-preview">
      <div class="character-portrait"><img data-portrait alt=""></div>
      <div class="character-bio"><span class="character-tag"></span><h4 data-character-name></h4><p data-character-title></p></div>
    </div>
    <div class="character-roster" role="radiogroup" aria-label="Персонаж игрока ${id}">
      ${CHARACTERS.map(character => `<label class="character-option" style="--skin-color:${character.color}">
        <input type="radio" name="character-${id}" value="${character.id}" aria-label="${character.name}">
        <span><img src="${character.image}" alt="" loading="lazy"><b>${character.name}</b></span>
      </label>`).join('')}
    </div>
  </section>`
}

const TEMPLATE = `
  <button class="hud-pause" type="button" data-action="pause" aria-label="Pause" title="Pause (Esc)" hidden>
    <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="5" width="4.5" height="14" rx="1.5"/><rect x="13.5" y="5" width="4.5" height="14" rx="1.5"/></svg>
  </button>

  <div class="countdown" aria-hidden="true" hidden>
    <span class="countdown-number"></span>
    <span class="countdown-note"></span>
  </div>

  <div class="banner" role="status">
    <strong class="banner-title"></strong>
    <span class="banner-note"></span>
  </div>

  <section class="screen screen-title" data-screen="title" aria-labelledby="ui-title" hidden>
    <div class="title-layout">
      <header class="logo">
        <h1 id="ui-title"><span class="logo-top">Ragdoll</span> <span class="logo-bottom">Volley</span></h1>
        <p class="logo-tag">Neon Beach</p>
      </header>
      <div class="card title-menu">
        <div class="mode-choice" role="radiogroup" aria-labelledby="ui-mode" lang="ru">
          <span class="choice-label" id="ui-mode">Режим игры</span>
          <div class="choice-options">
            <label class="choice-option"><input type="radio" name="mode" value="bot"><span>Против бота</span></label>
            <label class="choice-option"><input type="radio" name="mode" value="humans"><span>Только люди</span></label>
          </div>
        </div>
        <div class="choice" role="radiogroup" aria-labelledby="ui-length">
          <span class="choice-label" id="ui-length">First to</span>
          <div class="choice-options">${MATCH_OPTIONS}</div>
        </div>
        <div class="button-row">
          <button class="button button-primary" type="button" data-action="play" data-autofocus>Play</button>
          <button class="button" type="button" data-action="settings">Settings</button>
        </div>
      </div>
      ${playerCard(1)}
      ${playerCard(2)}
    </div>
    <footer class="title-footer">${RULES}</footer>
  </section>

  <section class="screen screen-characters" data-screen="characters" role="dialog" aria-labelledby="ui-characters" lang="ru" hidden>
    <div class="card character-select">
      <header class="character-select-header"><p class="eyebrow">Neon Beach · Состав матча</p><h2 class="card-title" id="ui-characters">Выберите персонажей</h2><p>Каждому — свой стиль. Все играют на равных.</p></header>
      <div class="character-lineup">${characterPicker(1)}${characterPicker(2)}</div>
      <div class="character-select-footer"><button class="button" type="button" data-action="back">Назад</button><p>Выбор сохраняется автоматически</p><button class="button button-primary" type="button" data-action="start" data-autofocus>Начать матч</button></div>
    </div>
  </section>

  <section class="screen" data-screen="pause" role="dialog" aria-labelledby="ui-paused" hidden>
    <div class="card card-narrow">
      <h2 class="card-title" id="ui-paused">Paused</h2>
      ${SCORE}
      <p class="match-note"></p>
      <div class="button-stack">
        <button class="button button-primary" type="button" data-action="resume" data-autofocus>Resume</button>
        <button class="button" type="button" data-action="restart">Restart match</button>
        <div class="button-pair">
          <button class="button" type="button" data-action="controls">Controls</button>
          <button class="button" type="button" data-action="settings">Settings</button>
        </div>
        <button class="button" type="button" data-action="menu">Main menu</button>
      </div>
    </div>
  </section>

  <section class="screen" data-screen="controls" role="dialog" aria-labelledby="ui-controls" hidden>
    <div class="card card-wide">
      <h2 class="card-title" id="ui-controls">Controls</h2>
      <div class="players">${playerCard(1)}${playerCard(2)}</div>
      ${RULES}
      <button class="button button-primary" type="button" data-action="back" data-autofocus>Back</button>
    </div>
  </section>

  <section class="screen" data-screen="over" role="dialog" aria-labelledby="ui-winner" hidden>
    <div class="card card-narrow">
      <p class="eyebrow">Match over</p>
      <h2 class="winner" id="ui-winner"></h2>
      ${SCORE}
      <p class="match-note"></p>
      <div class="button-stack">
        <button class="button button-primary" type="button" data-action="rematch" data-autofocus>Rematch</button>
        <button class="button" type="button" data-action="menu">Main menu</button>
      </div>
    </div>
  </section>
`

function loadMatchLength() {
  try {
    const raw = localStorage.getItem(MATCH_KEY)
    if (raw !== null && MATCH_LENGTHS.includes(Number(raw))) return Number(raw)
  } catch (_) {}
  return DEFAULT_MATCH_LENGTH
}

function saveMatchLength(n) {
  try {
    localStorage.setItem(MATCH_KEY, String(n))
  } catch (_) {}
}

/** Restart an element's CSS animation. */
function replay(el) {
  el.style.animation = 'none'
  void el.offsetWidth
  el.style.animation = ''
}

/**
 * @param {object} options
 * @param {{ isOpen(): boolean, open(): void, close(): void }} options.settings
 * @param {() => void} options.onPlay
 * @param {() => void} options.onPause
 * @param {() => void} options.onResume
 * @param {() => void} options.onRestart
 * @param {() => void} options.onMainMenu
 */
export function initMenus({ settings, onPlay, onPause, onResume, onRestart, onMainMenu }) {
  const root = document.createElement('div')
  root.className = 'ui'
  root.lang = 'en'
  root.innerHTML = TEMPLATE
  root.style.setProperty('--tick', `${COUNTDOWN_STEP_S}s`)
  document.body.appendChild(root)

  const screens = {}
  for (const el of root.querySelectorAll('[data-screen]')) screens[el.dataset.screen] = el
  const pauseButton = root.querySelector('.hud-pause')
  const countdown = root.querySelector('.countdown')
  const countdownNumber = countdown.querySelector('.countdown-number')
  const countdownNote = countdown.querySelector('.countdown-note')
  const banner = root.querySelector('.banner')
  const bannerTitle = banner.querySelector('.banner-title')
  const bannerNote = banner.querySelector('.banner-note')

  let phase = null
  /** A screen opened on top of the phase's own: the controls, from the pause menu. */
  let overlay = null
  let overlayOpener = null
  let settingsOpener = null
  let shownCount = null
  let shownPoint = null
  let mode = 'bot'
  try {
    const saved = localStorage.getItem(MODE_KEY)
    if (saved === 'bot' || saved === 'humans') mode = saved
  } catch (_) {}

  function updateMode() {
    for (const el of root.querySelectorAll('[data-player-name]')) {
      const id = Number(el.dataset.playerName)
      el.textContent = el.closest('[data-picker]')
        ? (mode === 'bot' ? (id === 2 ? 'Бот' : 'Вы') : `Игрок ${id}`)
        : playerName(id, mode)
    }
    for (const card of root.querySelectorAll('.player[data-player="2"]')) {
      card.querySelector('.keys').hidden = mode === 'bot'
      card.querySelector('.bot-note').hidden = mode !== 'bot'
    }
  }
  for (const input of root.querySelectorAll('input[name="mode"]')) {
    input.checked = input.value === mode
    input.addEventListener('change', () => {
      mode = input.value
      try { localStorage.setItem(MODE_KEY, mode) } catch (_) {}
      updateMode()
    })
  }
  updateMode()

  let characters
  try { characters = loadCharacters(localStorage) }
  catch (_) { characters = loadCharacters(null) }

  function updateCharacters() {
    for (const picker of root.querySelectorAll('[data-picker]')) {
      const side = Number(picker.dataset.picker) - 1
      const character = getCharacter(characters[side])
      picker.style.setProperty('--skin-color', character.color)
      const portrait = picker.querySelector('[data-portrait]')
      portrait.src = character.image
      portrait.alt = character.name
      portrait.classList.toggle('is-mirrored', character.template !== side)
      picker.querySelector('[data-character-name]').textContent = character.name
      picker.querySelector('[data-character-title]').textContent = character.title
      picker.querySelector('.character-tag').textContent = character.wild ? 'Дикий выбор' : 'На площадку'
      for (const input of picker.querySelectorAll('input')) input.checked = input.value === character.id
    }
  }
  for (const input of root.querySelectorAll('.character-roster input')) {
    input.addEventListener('change', () => {
      const side = Number(input.closest('[data-picker]').dataset.picker) - 1
      characters[side] = input.value
      try { saveCharacters(localStorage, characters) } catch (_) {}
      updateCharacters()
    })
  }
  updateCharacters()

  let pointsToWin = loadMatchLength()
  for (const input of root.querySelectorAll('input[name="points"]')) {
    input.checked = Number(input.value) === pointsToWin
    input.addEventListener('change', () => {
      pointsToWin = Number(input.value)
      saveMatchLength(pointsToWin)
    })
  }

  function showScreen(focus) {
    const name = overlay ?? SCREEN_OF_PHASE[phase]
    for (const [key, el] of Object.entries(screens)) el.hidden = key !== name
    if (name) {
      (focus ?? screens[name].querySelector('[data-autofocus]')).focus({ preventScroll: true })
    } else if (root.contains(document.activeElement)) {
      // Nothing may keep focus in play, or space would press it instead of serving.
      document.activeElement.blur()
    }
  }

  function openOverlay(name, opener) {
    overlayOpener = opener
    overlay = name
    showScreen()
  }

  function closeOverlay() {
    overlay = null
    showScreen(overlayOpener)
    overlayOpener = null
  }

  function closeSettings() {
    settings.close()
    const screen = root.querySelector('.screen:not([hidden])')
    if (screen) (screen.contains(settingsOpener) ? settingsOpener : screen.querySelector('[data-autofocus]')).focus()
    settingsOpener = null
  }

  /** Up and down step through a menu's buttons, like a game pad would. */
  function moveFocus(step) {
    const screen = root.querySelector('.screen:not([hidden])')
    if (!screen) return false
    const items = [...screen.querySelectorAll('button, input:checked')]
    const index = items.indexOf(document.activeElement)
    // Leave the arrows alone anywhere else, such as on the settings sliders.
    if (index < 0 && document.activeElement !== document.body) return false
    const next = index < 0 ? (step > 0 ? 0 : items.length - 1) : (index + step + items.length) % items.length
    items[next].focus()
    return true
  }

  const actions = {
    play: (button) => openOverlay('characters', button),
    start: onPlay,
    pause: onPause,
    resume: onResume,
    restart: onRestart,
    rematch: onRestart,
    menu: onMainMenu,
    // The opener gets focus back afterwards. It is passed in, because Safari
    // does not focus a button when it is clicked.
    controls: (button) => openOverlay('controls', button),
    back: closeOverlay,
    settings: (button) => {
      settingsOpener = button
      settings.open()
    },
  }

  root.addEventListener('click', (e) => {
    const target = e.target.closest('[data-action]')
    if (target) actions[target.dataset.action](target)
  })

  window.addEventListener('keydown', (e) => {
    // Leave shortcuts such as Cmd+P to the browser.
    if (e.metaKey || e.ctrlKey || e.altKey) return
    if (e.code === 'Escape' || e.code === 'KeyP') {
      if (e.repeat) return
      if (e.code === 'Escape' && settings.isOpen()) closeSettings()
      else if (e.code === 'Escape' && overlay) closeOverlay()
      else if (phase === 'countdown' || phase === 'playing') onPause()
      else if (phase === 'paused') onResume()
    } else if (e.code === 'ArrowDown' || e.code === 'ArrowUp') {
      // Native radio navigation lets each player browse their roster with arrows.
      if (e.target.matches('.character-roster input')) return
      if (moveFocus(e.code === 'ArrowDown' ? 1 : -1)) e.preventDefault()
    }
  })

  countdownNumber.addEventListener('animationend', () => {
    if (shownCount === 0) countdown.hidden = true
  })

  function fillMatch(game) {
    for (const el of root.querySelectorAll('[data-score]')) el.textContent = game.score[el.dataset.score]
    for (const el of root.querySelectorAll('.match-note')) {
      const length = game.pointsToWin ? `First to ${game.pointsToWin}` : 'Endless match'
      el.textContent = `${game.mode === 'bot' ? 'You vs Bot' : '2 players'} · ${length}`
    }
    const winner = screens.over.querySelector('.winner')
    winner.textContent = game.winner ? `${playerName(game.winner, mode)} ${game.mode === 'bot' && game.winner === 1 ? 'win' : 'wins'}` : ''
    winner.dataset.player = game.winner
  }

  const menus = {
    get characters() {
      return [...characters]
    },
    get mode() {
      return mode
    },
    get pointsToWin() {
      return pointsToWin
    },

    /** @param {'title'|'countdown'|'playing'|'paused'|'over'} next */
    setPhase(next, game) {
      const previous = phase
      phase = next
      overlay = null
      root.dataset.phase = next
      pauseButton.hidden = next !== 'countdown' && next !== 'playing'
      if (next === 'countdown') shownCount = null
      if (next === 'playing' && previous === 'countdown') menus.count(0)
      else if (next !== 'playing') countdown.hidden = true
      if (next === 'title' || next === 'over') menus.showPoint(null)
      if (next === 'paused' || next === 'over') fillMatch(game)
      showScreen()
    },

    /** Show 3, 2, 1 and then Go! (n = 0); the note names the server. */
    count(n, server = 0) {
      if (n === shownCount) return
      shownCount = n
      countdown.hidden = false
      countdown.classList.toggle('is-go', n === 0)
      countdownNumber.textContent = n || 'Go!'
      countdownNote.textContent = n && server ? `${playerName(server, mode)} ${mode === 'bot' && server === 1 ? 'serve' : 'serves'}` : ''
      countdownNote.dataset.player = server
      replay(countdownNumber)
    },

    /** The banner for the point being replayed, or null to put it away. */
    showPoint(point) {
      if (point === shownPoint) return
      shownPoint = point
      banner.classList.toggle('is-visible', Boolean(point))
      if (!point) return
      countdown.hidden = true
      banner.dataset.player = point.winner
      bannerTitle.textContent = `${playerName(point.winner, mode)} ${mode === 'bot' && point.winner === 1 ? 'score' : 'scores'}`
      bannerNote.textContent = POINT_REASONS[point.reason] ?? ''
    },
  }

  return menus
}
