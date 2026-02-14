const STORAGE_KEY = 'ragdoll-volley-settings'

const defaults = {
  gravityY: 6.5,
  headLiftForce: 50,
  ballGravity: 3.5,
  ballRestitution: 2,
  jumpImpulse: 40,
  moveForce: 40,
}

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

export function getSettings() {
  return current
}

export function setSettings(partial) {
  Object.assign(current, partial)
}

function slider(id, label, min, max, step, getValue, setValue) {
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
  valueEl.textContent = getValue()
  input.addEventListener('input', () => {
    const v = parseFloat(input.value)
    setValue(v)
    valueEl.textContent = typeof v === 'number' && v % 1 !== 0 ? v.toFixed(1) : v
  })
  wrap.appendChild(labelEl)
  wrap.appendChild(valueEl)
  wrap.appendChild(input)
  return wrap
}

function load() {
  loadFromStorage()
}

load()

export function initSettingsPanel() {

  const panel = document.createElement('aside')
  panel.className = 'settings-panel'
  panel.innerHTML = '<h3>Настройки</h3><p class="controls-hint">Управление: W — прыжок, A — влево, D — вправо, R — бросок мяча</p>'

  panel.appendChild(
    slider(
      'gravity',
      'Гравитация',
      2,
      25,
      0.5,
      () => current.gravityY,
      (v) => { current.gravityY = v }
    )
  )
  panel.appendChild(
    slider(
      'headLiftForce',
      'Сила подъёма головы',
      0,
      25,
      0.5,
      () => current.headLiftForce,
      (v) => { current.headLiftForce = v }
    )
  )
  panel.appendChild(
    slider(
      'ballGravity',
      'Гравитация мяча',
      0,
      25,
      0.5,
      () => current.ballGravity,
      (v) => { current.ballGravity = v }
    )
  )
  panel.appendChild(
    slider(
      'ballRestitution',
      'Прыгучесть мяча',
      0,
      100,
      0.05,
      () => current.ballRestitution,
      (v) => { current.ballRestitution = v }
    )
  )
  panel.appendChild(
    slider(
      'jump',
      'Сила прыжка',
      5,
      40,
      0.5,
      () => current.jumpImpulse,
      (v) => { current.jumpImpulse = v }
    )
  )
  panel.appendChild(
    slider(
      'move',
      'Сила движения',
      40,
      250,
      5,
      () => current.moveForce,
      (v) => { current.moveForce = v }
    )
  )

  const saveBtn = document.createElement('button')
  saveBtn.type = 'button'
  saveBtn.textContent = 'Сохранить настройки'
  saveBtn.className = 'settings-save'
  saveBtn.addEventListener('click', () => {
    save()
    saveBtn.textContent = 'Сохранено'
    setTimeout(() => { saveBtn.textContent = 'Сохранить настройки' }, 1500)
  })
  panel.appendChild(saveBtn)

  const restartBtn = document.createElement('button')
  restartBtn.type = 'button'
  restartBtn.textContent = 'Restart game'
  restartBtn.className = 'settings-save'
  restartBtn.addEventListener('click', () => location.reload())
  panel.appendChild(restartBtn)

  document.querySelector('#app').appendChild(panel)
}
