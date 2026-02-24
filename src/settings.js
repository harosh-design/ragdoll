const STORAGE_KEY = 'ragdoll-volley-settings'

const defaults = {
  gravityY: 6.5,
  headLiftForce: 50,
  throwSpeed: 14,
  ballGravity: 3.5,
  ballRestitution: 2,
  jumpImpulse: 40,
  downForce: 40,
  moveForce: 40,
  bounceDamping: 0.8,
  playerBounceStrength: 0.45,
  ballSize: 0.3,
  movementSpeed: 1.2,
  netHeight: 6,
  playerSize: 1,
  throwTorsoCoef: 1,
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
  panel.innerHTML = '<h3>Настройки</h3><p class="controls-hint">Игрок 1 (слева): W — прыжок, S — вниз, A/D — влево/вправо, R — бросок.<br>Игрок 2 (справа): ↑ — прыжок, ↓ — вниз, ←/→ — влево/вправо, Enter — бросок.</p>'

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
      'throwSpeed',
      'Сила броска (базовая)',
      1,
      40,
      1,
      () => current.throwSpeed,
      (v) => { current.throwSpeed = v }
    )
  )
  panel.appendChild(
    slider(
      'throwTorsoCoef',
      'Коэф. силы от туловища',
      0.2,
      3,
      0.1,
      () => current.throwTorsoCoef,
      (v) => { current.throwTorsoCoef = v }
    )
  )
  panel.appendChild(
    slider(
      'netHeight',
      'Высота сетки',
      2,
      18,
      0.5,
      () => current.netHeight,
      (v) => { current.netHeight = v }
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
      'bounceDamping',
      'Эластичность',
      0.1,
      1,
      0.05,
      () => current.bounceDamping,
      (v) => { current.bounceDamping = v }
    )
  )
  panel.appendChild(
    slider(
      'playerBounceStrength',
      'Отскок от игрока (0–1)',
      0,
      1,
      0.05,
      () => current.playerBounceStrength,
      (v) => { current.playerBounceStrength = v }
    )
  )
  panel.appendChild(
    slider(
      'ballSize',
      'Размер мяча',
      0.15,
      0.5,
      0.05,
      () => current.ballSize,
      (v) => { current.ballSize = v }
    )
  )
  panel.appendChild(
    slider(
      'playerSize',
      'Размер игрока',
      0.5,
      1.5,
      0.05,
      () => current.playerSize,
      (v) => { current.playerSize = v }
    )
  )
  panel.appendChild(
    slider(
      'movementSpeed',
      'Скорость движения',
      0.5,
      3,
      0.1,
      () => current.movementSpeed,
      (v) => { current.movementSpeed = v }
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
      'downForce',
      'Сила вниз',
      0,
      120,
      5,
      () => current.downForce,
      (v) => { current.downForce = v }
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
