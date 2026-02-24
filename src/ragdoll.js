import * as p2 from 'p2-es'

const BASE_SHOULDERS = 0.5
const BASE_UPPER_ARM_LENGTH = 0.4
const BASE_LOWER_ARM_LENGTH = 0.4
const BASE_UPPER_ARM_SIZE = 0.2
const BASE_LOWER_ARM_SIZE = 0.2
const BASE_NECK_LENGTH = 0.1
const BASE_HEAD_RADIUS = 0.25
const BASE_UPPER_BODY_LENGTH = 0.6
const BASE_PELVIS_LENGTH = 0.4
const BASE_UPPER_LEG_LENGTH = 0.5
const BASE_UPPER_LEG_SIZE = 0.2
const BASE_LOWER_LEG_SIZE = 0.2
const BASE_LOWER_LEG_LENGTH = 0.5
const BASE_WEIGHT_RADIUS = 0.05
const BASE_RAGDOLL_BOTTOM_OFFSET = 0.05

export const BODYPARTS = Math.pow(2, 2)
export const GROUND = Math.pow(2, 3)
export const OTHER = Math.pow(2, 4)

/**
 * Create a ragdoll and add it to the world. Returns refs to bodies for control.
 * @param {p2.World} world
 * @param {number} [groundY] - если задан, кукла смещается так, чтобы стояла на земле (низ на groundY)
 * @param {number} [offsetX] - смещение по X для размещения левого/правого игрока
 * @param {number} [scale=1] - масштаб размера игрока (0.5 = половина, 1.5 = полтора)
 * @returns {{ bodies: p2.Body[], pelvis: p2.Body, upperBody: p2.Body, head: p2.Body, lowerLeftArm: p2.Body, lowerRightArm: p2.Body }}
 */
export function createRagdoll(world, groundY, offsetX, scale = 1) {
  const k = scale
  const shouldersDistance = BASE_SHOULDERS * k
  const upperArmLength = BASE_UPPER_ARM_LENGTH * k
  const lowerArmLength = BASE_LOWER_ARM_LENGTH * k
  const upperArmSize = BASE_UPPER_ARM_SIZE * k
  const lowerArmSize = BASE_LOWER_ARM_SIZE * k
  const neckLength = BASE_NECK_LENGTH * k
  const headRadius = BASE_HEAD_RADIUS * k
  const upperBodyLength = BASE_UPPER_BODY_LENGTH * k
  const pelvisLength = BASE_PELVIS_LENGTH * k
  const upperLegLength = BASE_UPPER_LEG_LENGTH * k
  const upperLegSize = BASE_UPPER_LEG_SIZE * k
  const lowerLegSize = BASE_LOWER_LEG_SIZE * k
  const lowerLegLength = BASE_LOWER_LEG_LENGTH * k
  const weightRadius = BASE_WEIGHT_RADIUS * k
  const RAGDOLL_BOTTOM_OFFSET = BASE_RAGDOLL_BOTTOM_OFFSET * k

  const bodyPartShapes = []

  const headShape = new p2.Circle({ radius: headRadius })
  const upperArmShapeLeft = new p2.Box({ width: upperArmLength, height: upperArmSize })
  const upperArmShapeRight = new p2.Box({ width: upperArmLength, height: upperArmSize })
  const lowerArmShapeLeft = new p2.Box({ width: lowerArmLength, height: lowerArmSize })
  const lowerArmShapeRight = new p2.Box({ width: lowerArmLength, height: lowerArmSize })
  const upperBodyShape = new p2.Box({ width: shouldersDistance, height: upperBodyLength })
  const pelvisShape = new p2.Box({ width: shouldersDistance, height: pelvisLength })
  const upperLegShapeLeft = new p2.Box({ width: upperLegSize, height: upperLegLength })
  const upperLegShapeRight = new p2.Box({ width: upperLegSize, height: upperLegLength })
  const lowerLegShapeLeft = new p2.Box({ width: lowerLegSize, height: lowerLegLength })
  const lowerLegShapeRight = new p2.Box({ width: lowerLegSize, height: lowerLegLength })

  bodyPartShapes.push(
    headShape,
    upperArmShapeRight,
    upperArmShapeLeft,
    lowerArmShapeRight,
    lowerArmShapeLeft,
    upperBodyShape,
    pelvisShape,
    upperLegShapeRight,
    upperLegShapeLeft,
    lowerLegShapeRight,
    lowerLegShapeLeft
  )

  for (let i = 0; i < bodyPartShapes.length; i++) {
    const s = bodyPartShapes[i]
    s.collisionGroup = BODYPARTS
    s.collisionMask = GROUND | OTHER
  }

  // Lower legs
  const lowerLeftLeg = new p2.Body({
    mass: 1,
    position: [-shouldersDistance / 2, lowerLegLength / 2],
  })
  const lowerRightLeg = new p2.Body({
    mass: 1,
    position: [shouldersDistance / 2, lowerLegLength / 2],
  })
  lowerLeftLeg.addShape(lowerLegShapeLeft)
  lowerRightLeg.addShape(lowerLegShapeRight)
  world.addBody(lowerLeftLeg)
  world.addBody(lowerRightLeg)

  // Невидимые утяжелители внизу голеней — кукла приземляется на ноги
  const weightMass = 2.5
  const leftWeightShape = new p2.Circle({ radius: weightRadius })
  const rightWeightShape = new p2.Circle({ radius: weightRadius })
  leftWeightShape.collisionGroup = BODYPARTS
  rightWeightShape.collisionGroup = BODYPARTS
  leftWeightShape.collisionMask = GROUND | OTHER
  rightWeightShape.collisionMask = GROUND | OTHER

  const leftWeight = new p2.Body({
    mass: weightMass,
    position: [-shouldersDistance / 2, 0],
  })
  leftWeight.addShape(leftWeightShape)
  leftWeight.isWeight = true
  world.addBody(leftWeight)

  const rightWeight = new p2.Body({
    mass: weightMass,
    position: [shouldersDistance / 2, 0],
  })
  rightWeight.addShape(rightWeightShape)
  rightWeight.isWeight = true
  world.addBody(rightWeight)

  // Привязка утяжелителей к низу голеней
  const leftAnkle = new p2.RevoluteConstraint(leftWeight, lowerLeftLeg, {
    localPivotA: [0, 0],
    localPivotB: [0, -lowerLegLength / 2],
  })
  const rightAnkle = new p2.RevoluteConstraint(rightWeight, lowerRightLeg, {
    localPivotA: [0, 0],
    localPivotB: [0, -lowerLegLength / 2],
  })
  world.addConstraint(leftAnkle)
  world.addConstraint(rightAnkle)

  // Upper legs
  const upperLeftLeg = new p2.Body({
    mass: 1,
    position: [
      -shouldersDistance / 2,
      lowerLeftLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2,
    ],
  })
  const upperRightLeg = new p2.Body({
    mass: 1,
    position: [
      shouldersDistance / 2,
      lowerRightLeg.position[1] + lowerLegLength / 2 + upperLegLength / 2,
    ],
  })
  upperLeftLeg.addShape(upperLegShapeLeft)
  upperRightLeg.addShape(upperLegShapeRight)
  world.addBody(upperLeftLeg)
  world.addBody(upperRightLeg)

  // Pelvis (как в демо — без damping)
  const pelvis = new p2.Body({
    mass: 1,
    position: [0, upperLeftLeg.position[1] + upperLegLength / 2 + pelvisLength / 2],
  })
  pelvis.addShape(pelvisShape)
  world.addBody(pelvis)

  // Upper body (как в демо — без damping)
  const upperBody = new p2.Body({
    mass: 1,
    position: [0, pelvis.position[1] + pelvisLength / 2 + upperBodyLength / 2],
  })
  upperBody.addShape(upperBodyShape)
  world.addBody(upperBody)

  // Head
  const head = new p2.Body({
    mass: 1,
    position: [0, upperBody.position[1] + upperBodyLength / 2 + headRadius + neckLength],
  })
  head.addShape(headShape)
  world.addBody(head)

  // Upper arms (лёгкие)
  const upperLeftArm = new p2.Body({
    mass: 0.5,
    position: [
      -shouldersDistance / 2 - upperArmLength / 2,
      upperBody.position[1] + upperBodyLength / 2,
    ],
  })
  const upperRightArm = new p2.Body({
    mass: 0.5,
    position: [
      shouldersDistance / 2 + upperArmLength / 2,
      upperBody.position[1] + upperBodyLength / 2,
    ],
  })
  upperLeftArm.addShape(upperArmShapeLeft)
  upperRightArm.addShape(upperArmShapeRight)
  world.addBody(upperLeftArm)
  world.addBody(upperRightArm)

  // Lower arms (лёгкие)
  const lowerLeftArm = new p2.Body({
    mass: 0.5,
    position: [
      upperLeftArm.position[0] - lowerArmLength / 2 - upperArmLength / 2,
      upperLeftArm.position[1],
    ],
  })
  const lowerRightArm = new p2.Body({
    mass: 0.5,
    position: [
      upperRightArm.position[0] + lowerArmLength / 2 + upperArmLength / 2,
      upperRightArm.position[1],
    ],
  })
  lowerLeftArm.addShape(lowerArmShapeLeft)
  lowerRightArm.addShape(lowerArmShapeRight)
  world.addBody(lowerLeftArm)
  world.addBody(lowerRightArm)

  const bodies = [
    head,
    upperRightArm,
    upperLeftArm,
    lowerRightArm,
    lowerLeftArm,
    upperBody,
    pelvis,
    upperRightLeg,
    upperLeftLeg,
    lowerRightLeg,
    lowerLeftLeg,
  ]

  // Neck joint (только револьют, как в демо)
  const neckJoint = new p2.RevoluteConstraint(head, upperBody, {
    localPivotA: [0, -headRadius - neckLength / 2],
    localPivotB: [0, upperBodyLength / 2],
  })
  neckJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  world.addConstraint(neckJoint)

  // Knees
  const leftKneeJoint = new p2.RevoluteConstraint(lowerLeftLeg, upperLeftLeg, {
    localPivotA: [0, lowerLegLength / 2],
    localPivotB: [0, -upperLegLength / 2],
  })
  const rightKneeJoint = new p2.RevoluteConstraint(lowerRightLeg, upperRightLeg, {
    localPivotA: [0, lowerLegLength / 2],
    localPivotB: [0, -upperLegLength / 2],
  })
  leftKneeJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  rightKneeJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  world.addConstraint(leftKneeJoint)
  world.addConstraint(rightKneeJoint)

  // Hips
  const leftHipJoint = new p2.RevoluteConstraint(upperLeftLeg, pelvis, {
    localPivotA: [0, upperLegLength / 2],
    localPivotB: [-shouldersDistance / 2, -pelvisLength / 2],
  })
  const rightHipJoint = new p2.RevoluteConstraint(upperRightLeg, pelvis, {
    localPivotA: [0, upperLegLength / 2],
    localPivotB: [shouldersDistance / 2, -pelvisLength / 2],
  })
  leftHipJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  rightHipJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  world.addConstraint(leftHipJoint)
  world.addConstraint(rightHipJoint)

  // Spine (как в демо: только револьют, лимиты ±π/8)
  const spineJoint = new p2.RevoluteConstraint(pelvis, upperBody, {
    localPivotA: [0, pelvisLength / 2],
    localPivotB: [0, -upperBodyLength / 2],
  })
  spineJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  world.addConstraint(spineJoint)

  // Shoulders
  const leftShoulder = new p2.RevoluteConstraint(upperBody, upperLeftArm, {
    localPivotA: [-shouldersDistance / 2, upperBodyLength / 2],
    localPivotB: [upperArmLength / 2, 0],
  })
  const rightShoulder = new p2.RevoluteConstraint(upperBody, upperRightArm, {
    localPivotA: [shouldersDistance / 2, upperBodyLength / 2],
    localPivotB: [-upperArmLength / 2, 0],
  })
  leftShoulder.setLimits(-Math.PI / 3, Math.PI / 3)
  rightShoulder.setLimits(-Math.PI / 3, Math.PI / 3)
  world.addConstraint(leftShoulder)
  world.addConstraint(rightShoulder)

  // Elbows
  const leftElbowJoint = new p2.RevoluteConstraint(lowerLeftArm, upperLeftArm, {
    localPivotA: [lowerArmLength / 2, 0],
    localPivotB: [-upperArmLength / 2, 0],
  })
  const rightElbowJoint = new p2.RevoluteConstraint(lowerRightArm, upperRightArm, {
    localPivotA: [-lowerArmLength / 2, 0],
    localPivotB: [upperArmLength / 2, 0],
  })
  leftElbowJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  rightElbowJoint.setLimits(-Math.PI / 8, Math.PI / 8)
  world.addConstraint(leftElbowJoint)
  world.addConstraint(rightElbowJoint)

  const allBodies = [
    lowerLeftLeg,
    lowerRightLeg,
    leftWeight,
    rightWeight,
    upperLeftLeg,
    upperRightLeg,
    pelvis,
    upperBody,
    head,
    upperLeftArm,
    upperRightArm,
    lowerLeftArm,
    lowerRightArm,
  ]

  // Поставить куклу на землю: сместить все тела так, чтобы низ был на groundY
  if (typeof groundY === 'number') {
    const dy = groundY + RAGDOLL_BOTTOM_OFFSET
    for (const body of allBodies) {
      body.position[1] += dy
    }
  }

  // Смещение по X для левого/правого игрока
  if (typeof offsetX === 'number') {
    for (const body of allBodies) {
      body.position[0] += offsetX
    }
  }

  return { bodies, pelvis, upperBody, head, lowerRightArm, lowerLeftArm }
}
