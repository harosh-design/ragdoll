import { MOVE, BALL, GRAVITY_Y, TIME_STEP } from './original.js'

const STORAGE_KEY = 'ragdoll-volley-settings'
const PRESETS_KEY = 'ragdoll-volley-presets'

/**
 * Defaults are the original game's own values (see original.js). Anything moved
 * off a default is a deliberate departure from the Flash game — as is
 * playerScale, whose 1 is the original's doll; this project plays them bigger.
 */
const defaults = {
  gravityY: GRAVITY_Y,
  timeStep: TIME_STEP,
  playerScale: 1.15,
  turnImpulse: MOVE.turnImpulse,
  jumpImpulse: MOVE.jumpImpulse,
  jumpBodyImpulse: MOVE.jumpBodyImpulse,
  downImpulse: MOVE.downImpulse,
  ballMaxVX: BALL.maxVX,
  ballMaxVY: BALL.maxVY,
  ballTouchImpulse: 1,
  diskSize: 15,
}

export const ORIGINAL_DEFAULTS = { ...defaults }

let current = { ...defaults }

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      current = { ...defaults, ...parsed }
    }
  } catch (_) {
    current = { ...defaults }
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(current))
  } catch (_) {}
}

function getPresets() {
  try {
    const raw = localStorage.getItem(PRESETS_KEY)
    if (raw) return JSON.parse(raw)
  } catch (_) {}
  return {}
}

function savePresets(presets) {
  try {
    localStorage.setItem(PRESETS_KEY, JSON.stringify(presets))
  } catch (_) {}
}

function saveAsPreset(name) {
  const presets = getPresets()
  presets[name] = { ...current }
  savePresets(presets)
}

function loadPreset(name) {
  const presets = getPresets()
  const data = presets[name]
  if (!data) return
  Object.assign(current, data)
  save()
  location.reload()
}

const SETTINGS_FILE_NAME = 'ragdoll-volley-settings.json'

export function exportSettingsToFile() {
  const text = JSON.stringify(current, null, 2)
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = SETTINGS_FILE_NAME
  a.click()
  URL.revokeObjectURL(url)
}

export function importSettingsFromFile(file) {
  const reader = new FileReader()
  reader.onload = () => {
    try {
      const parsed = JSON.parse(reader.result)
      if (typeof parsed !== 'object' || parsed === null) throw new Error('Invalid format')
      Object.assign(current, { ...defaults, ...parsed })
      save()
      location.reload()
    } catch (e) {
      alert('Invalid settings file: ' + (e.message || 'could not parse'))
    }
  }
  reader.readAsText(file, 'utf-8')
}

export function getSettings() {
  return current
}

export function setSettings(partial) {
  Object.assign(current, partial)
}

/** Push tunable values back into the shared physics constants. */
export function applyTuning(s) {
  MOVE.turnImpulse = s.turnImpulse
  MOVE.jumpImpulse = s.jumpImpulse
  MOVE.jumpBodyImpulse = s.jumpBodyImpulse
  MOVE.downImpulse = s.downImpulse
  BALL.maxVX = s.ballMaxVX
  BALL.maxVY = s.ballMaxVY
}

function slider(id, label, min, max, step, getValue, setValue, onChange) {
  const wrap = document.createElement('div')
  wrap.className = 'setting-row'
  const labelEl = document.createElement('label')
  labelEl.htmlFor = id
  labelEl.textContent = label
  const valueEl = document.createElement('span')
  valueEl.className = 'setting-value'
  const input = document.createElement('input')
  input.type = 'range'
  input.id = id
  input.min = min
  input.max = max
  input.step = step || (max - min < 5 ? 0.1 : 1)
  input.value = getValue()
  const show = (v) => { valueEl.textContent = Number.isInteger(v) ? v : Number(v).toFixed(3).replace(/0+$/, '').replace(/\.$/, '') }
  show(getValue())
  input.addEventListener('input', () => {
    const v = parseFloat(input.value)
    setValue(v)
    show(v)
    onChange?.()
  })
  wrap.appendChild(labelEl)
  wrap.appendChild(valueEl)
  wrap.appendChild(input)
  return wrap
}

loadFromStorage()

/**
 * Builds the panel and its gear toggle. Returns open/close controls; Escape is
 * handled by the menus, which also decide whether it should pause the game.
 */
export function initSettingsPanel(onChange, onRestart = () => location.reload()) {
  const panel = document.createElement('aside')
  panel.className = 'settings-panel closed'
  panel.tabIndex = -1
  panel.setAttribute('aria-hidden', 'true')
  panel.innerHTML =
    '<h3>Настройки</h3>' +
    '<p class="controls-hint">Игрок 1 (слева): ← → — движение, ↑ — прыжок, ↓ — вниз, пробел — подача.<br>' +
    'В режиме «Только люди» игрок 2 (справа): A/D — движение, W — прыжок, S — вниз, R — подача. В режиме «Против бота» им управляет компьютер.<br>' +
    'Значения по умолчанию взяты из оригинальной флеш-игры.</p>'

  const rows = [
    ['gravityY', 'Гравитация (перезапуск)', 2, 25, 0.5, 'gravityY'],
    ['timeStep', 'Шаг физики (перезапуск)', 0.01, 0.06, 0.001, 'timeStep'],
    ['playerScale', 'Размер игроков (перезапуск)', 0.8, 1.5, 0.05, 'playerScale'],
    ['turnImpulse', 'Импульс движения', 0, 12, 0.5, 'turnImpulse'],
    ['jumpImpulse', 'Импульс прыжка', 0, 12, 0.5, 'jumpImpulse'],
    ['jumpBodyImpulse', 'Импульс прыжка (корпус)', 0, 30, 0.5, 'jumpBodyImpulse'],
    ['downImpulse', 'Импульс вниз', 0, 6, 0.25, 'downImpulse'],
    ['ballMaxVX', 'Предел скорости мяча по X', 5, 40, 1, 'ballMaxVX'],
    ['ballMaxVY', 'Предел скорости мяча по Y', 5, 40, 1, 'ballMaxVY'],
    ['ballTouchImpulse', 'Подброс мяча при касании', 0, 4, 0.1, 'ballTouchImpulse'],
    ['diskSize', 'Размер диска', 5, 40, 1, 'diskSize'],
  ]
  for (const [id, label, min, max, step, key] of rows) {
    panel.appendChild(
      slider(id, label, min, max, step, () => current[key], (v) => { current[key] = v }, () => {
        applyTuning(current)
        onChange?.()
      })
    )
  }

  const button = (text, handler) => {
    const b = document.createElement('button')
    b.type = 'button'
    b.textContent = text
    b.className = 'settings-save'
    b.addEventListener('click', handler)
    return b
  }

  const resetBtn = button('Вернуть оригинальные значения', () => {
    Object.assign(current, ORIGINAL_DEFAULTS)
    save()
    location.reload()
  })
  panel.appendChild(resetBtn)

  const saveBtn = button('Сохранить настройки', () => {
    save()
    saveBtn.textContent = 'Сохранено'
    setTimeout(() => { saveBtn.textContent = 'Сохранить настройки' }, 1500)
  })
  panel.appendChild(saveBtn)

  const fileRow = document.createElement('div')
  fileRow.className = 'setting-row'
  fileRow.style.marginTop = '8px'
  fileRow.style.flexWrap = 'wrap'
  fileRow.style.gap = '8px'
  const importInput = document.createElement('input')
  importInput.type = 'file'
  importInput.accept = '.json,.txt,application/json,text/plain'
  importInput.style.display = 'none'
  importInput.addEventListener('change', () => {
    const file = importInput.files?.[0]
    if (file) {
      importSettingsFromFile(file)
      importInput.value = ''
    }
  })
  fileRow.appendChild(button('Export to file', () => exportSettingsToFile()))
  fileRow.appendChild(button('Import from file', () => importInput.click()))
  panel.appendChild(fileRow)
  panel.appendChild(importInput)

  const presetRow = document.createElement('div')
  presetRow.className = 'setting-row'
  presetRow.style.marginTop = '12px'
  presetRow.style.flexWrap = 'wrap'
  const saveBallzBtn = button('Сохранить как пресет Ballz', () => {
    saveAsPreset('Ballz')
    saveBallzBtn.textContent = 'Сохранено в Ballz'
    setTimeout(() => { saveBallzBtn.textContent = 'Сохранить как пресет Ballz' }, 1500)
  })
  presetRow.appendChild(saveBallzBtn)
  presetRow.appendChild(button('Вернуть пресет Ballz', () => loadPreset('Ballz')))
  panel.appendChild(presetRow)

  panel.appendChild(button('Restart game', () => {
    setPanelOpen(false)
    onRestart()
  }))

  const app = document.querySelector('#app')
  app.appendChild(panel)

  function setPanelOpen(open) {
    const closed = !open
    panel.classList.toggle('closed', closed)
    panel.setAttribute('aria-hidden', String(closed))
  }

  const toggleBtn = document.createElement('button')
  toggleBtn.type = 'button'
  toggleBtn.className = 'settings-toggle'
  toggleBtn.setAttribute('aria-label', 'Открыть настройки')
  toggleBtn.textContent = '⚙'
  toggleBtn.addEventListener('click', () => setPanelOpen(panel.classList.contains('closed')))
  app.appendChild(toggleBtn)

  return {
    isOpen: () => !panel.classList.contains('closed'),
    open() {
      setPanelOpen(true)
      panel.focus({ preventScroll: true })
    },
    close: () => setPanelOpen(false),
  }
}
