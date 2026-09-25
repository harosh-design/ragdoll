import { MOVE, BALL } from './original.js'
import { NUMERIC_SETTINGS, ORIGINAL_DEFAULTS, normalizeSettings } from './settings-model.js'

export { ORIGINAL_DEFAULTS } from './settings-model.js'

const STORAGE_KEY = 'ragdoll-volley-settings'
const PRESETS_KEY = 'ragdoll-volley-presets'

let current = normalizeSettings()

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (raw) {
      const parsed = JSON.parse(raw)
      current = normalizeSettings(parsed)
    }
  } catch (_) {
    current = normalizeSettings()
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
  current = normalizeSettings(data)
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
      if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) throw new Error('Invalid format')
      current = normalizeSettings(parsed)
      save()
      location.reload()
    } catch (e) {
      alert('Invalid settings file: ' + (e.message || 'could not parse'))
    }
  }
  reader.readAsText(file, 'utf-8')
}

export function getSettings() {
  return { ...current }
}

export function setSettings(partial) {
  current = normalizeSettings({ ...current, ...partial })
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

  const arenaRow = document.createElement('div')
  arenaRow.className = 'setting-row'
  arenaRow.innerHTML = '<label for="arena">Игровое поле</label><select id="arena"><option value="side">Арена — строго сбоку</option><option value="beach">Неоновый пляж</option></select>'
  const arenaSelect = arenaRow.querySelector('select')
  arenaSelect.value = current.arena === 'beach' ? 'beach' : 'side'
  arenaSelect.addEventListener('change', () => { current.arena = arenaSelect.value; save(); onChange?.() })
  panel.appendChild(arenaRow)

  for (const [id, label, min, max, step] of NUMERIC_SETTINGS) {
    panel.appendChild(
      slider(id, label, min, max, step, () => current[id], (v) => { current[id] = v }, () => {
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
