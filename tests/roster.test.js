import test from 'node:test'
import assert from 'node:assert/strict'
import { Game } from '../src/game.js'
import { CHARACTERS, normalizeCharacters, loadCharacters, saveCharacters } from '../src/roster.js'
import { mirrorCharacterPose } from '../src/character-pose.js'

test('character selection recovers safely from missing, corrupt and obsolete storage', () => {
  for (const value of [null, '{broken', 'null', '{}', '"kai"']) {
    assert.deepEqual(loadCharacters({ getItem: () => value }), ['ruby', 'sky'])
  }
  assert.deepEqual(normalizeCharacters(['removed', 'volt']), ['ruby', 'volt'])
  assert.deepEqual(loadCharacters({ getItem() { throw new Error('Storage blocked') } }), ['ruby', 'sky'])
  let stored
  saveCharacters({ setItem: (_, value) => { stored = value } }, ['pineapple', 'kai'])
  assert.deepEqual(loadCharacters({ getItem: () => stored }), ['pineapple', 'kai'])
})

test('each side can use every character, including mirror matches, without changing physics', () => {
  const reference = new Game({ hazards: false })
  const mass = player => Object.values(player.parts).reduce((sum, body) => sum + body.getMass(), 0)
  for (const character of CHARACTERS) {
    const choice = [character.id, character.id]
    const game = new Game({ characters: choice, mode: 'bot', hazards: false })
    choice[0] = 'ruby'
    assert.deepEqual(game.characters, [character.id, character.id], 'match owns a copy of the selection')
    assert.equal(mass(game.player1), mass(reference.player1))
    assert.equal(mass(game.player2), mass(reference.player2))
    game.scorePoint(2, 'ground')
    game.newRound()
    assert.deepEqual(game.characters, [character.id, character.id], 'selection survives a new round')
  }
})

test('mirroring a sprite preserves the head and maps each hand back onto the opposite physical hand', () => {
  const parts = {
    characterId: 'pineapple', motion: { chest: 0.3, hair: 0.2 },
    Head: { position: [4, 3], angle: 0 },
    HandLeft: { position: [2, 2], angle: 0.6 },
    HandRight: { position: [5, 1], angle: -0.2 },
  }
  const mirrored = mirrorCharacterPose(parts)
  assert.deepEqual(mirrored.Head.position, parts.Head.position)
  assert.equal(8 - mirrored.HandLeft.position[0], parts.HandRight.position[0])
  assert.equal(mirrored.HandLeft.position[1], parts.HandRight.position[1])
  assert.equal(mirrored.HandLeft.angle, -parts.HandRight.angle)
  assert.equal(mirrored.motion.hair, -parts.motion.hair)
  assert.deepEqual(mirrorCharacterPose(mirrored), parts)
})
