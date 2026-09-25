import magentaUrl from './assets/player-magenta.png'
import cyanUrl from './assets/player-cyan.png'
import { CHARACTERS, getCharacter } from './roster.js'

// Bind-pose coordinates in the original 1024 × 1536 RGBA illustrations.
// Masks separate overlapping cutout pieces; their bone endpoints are shared by
// the renderer so skin stays connected while the physics skeleton bends.
const polygon = (points) => `M${points.map(p => p.join(',')).join(' L')} Z`
const region = (points, from, to, width = 0.09) => ({ mask: polygon(points), from, to, width })

const TEMPLATES = [
  {
    url: magentaUrl, rim: '#ff4ab5', skin: '#dba080', shade: '#a96863',
    head: region([[453,30],[609,30],[644,182],[602,249],[559,283],[478,273],[443,207]], [532,163], [530,263], 0.085),
    hair: region([[502,27],[457,17],[404,40],[351,148],[285,216],[286,311],[335,374],[351,325],[411,297],[454,250],[489,164]], [480,72], [382,298], 0.085),
    torso: region([[474,244],[561,244],[585,283],[644,303],[648,348],[630,412],[631,466],[615,532],[631,616],[414,617],[431,534],[420,477],[409,415],[395,340],[399,304],[461,281]], [525,335], [524,601], 0.091),
    pelvis: region([[414,579],[631,579],[661,640],[684,729],[614,744],[540,767],[518,768],[447,746],[364,729],[393,639]], [524,601], [524,728], 0.091),
    upperLeft: region([[399,298],[442,303],[419,410],[344,560],[280,544],[305,463],[339,373],[350,328]], [391,337], [310,522], 0.086),
    upperRight: region([[633,297],[678,311],[700,352],[732,446],[769,533],[714,562],[645,423],[634,363]], [655,337], [736,522], 0.086),
    lowerLeft: region([[300,493],[356,523],[298,612],[250,710],[195,692],[239,589]], [310,522], [222,691], 0.083),
    lowerRight: region([[705,520],[759,492],[806,588],[850,694],[797,713],[747,608]], [736,522], [822,691], 0.083),
    handLeft: region([[191,679],[247,696],[231,781],[201,849],[157,854],[148,795],[172,734]], [222,691], [181,823], 0.072),
    handRight: region([[799,694],[851,678],[879,746],[900,844],[857,862],[818,801]], [822,691], [863,823], 0.072),
    thighLeft: region([[365,716],[515,751],[501,845],[463,1049],[367,1049],[348,838]], [428,735], [418,1027], 0.08),
    thighRight: region([[520,752],[681,716],[700,838],[677,1048],[582,1049],[538,846]], [614,735], [624,1027], 0.08),
    shinLeft: region([[372,1009],[471,1014],[448,1122],[414,1244],[403,1403],[339,1404],[337,1240],[334,1137]], [418,1027], [371,1384], 0.074),
    shinRight: region([[573,1013],[677,1010],[708,1137],[710,1251],[705,1406],[642,1407],[625,1245],[602,1134]], [624,1027], [668,1384], 0.074),
    footLeft: region([[340,1354],[406,1354],[415,1431],[409,1492],[320,1497],[312,1441]], [371,1384], [369,1464], 0.079),
    footRight: region([[640,1354],[704,1354],[728,1446],[727,1494],[638,1494],[630,1440]], [668,1384], [679,1464], 0.079),
  },
  {
    url: cyanUrl, rim: '#33dcff', skin: '#dba98b', shade: '#a67670',
    head: region([[403,69],[451,55],[477,16],[562,10],[598,62],[592,193],[549,261],[451,273],[402,223],[397,131]], [487,158], [502,260], 0.085),
    hair: null,
    torso: region([[458,239],[535,239],[558,279],[622,291],[650,332],[625,405],[613,463],[595,514],[611,604],[393,604],[413,530],[406,471],[389,414],[374,335],[386,295],[444,278]], [506,330], [504,590], 0.092),
    pelvis: region([[394,568],[601,568],[627,627],[652,697],[565,725],[509,760],[490,759],[433,724],[356,698],[371,633]], [504,590], [504,720], 0.092),
    upperLeft: region([[374,288],[420,292],[398,384],[340,516],[317,551],[260,531],[299,432],[324,343],[342,306]], [371,329], [289,518], 0.086),
    upperRight: region([[612,290],[662,302],[685,345],[704,425],[752,524],[696,546],[650,449],[628,386]], [642,329], [720,513], 0.086),
    lowerLeft: region([[275,491],[329,518],[273,605],[229,687],[179,672],[217,572]], [289,518], [203,659], 0.083),
    lowerRight: region([[695,514],[747,488],[786,566],[829,673],[779,690],[736,602]], [720,513], [799,659], 0.083),
    handLeft: region([[177,647],[229,664],[222,726],[194,814],[149,825],[138,760],[156,699]], [203,659], [173,793], 0.072),
    handRight: region([[774,665],[824,645],[853,702],[877,794],[851,823],[811,802],[792,724]], [799,659], [839,793], 0.072),
    thighLeft: region([[354,693],[497,750],[477,865],[439,1028],[351,1027],[331,867],[339,762]], [420,717], [394,1006], 0.08),
    thighRight: region([[505,750],[649,693],[670,783],[670,875],[658,1025],[566,1027],[534,871]], [589,717], [607,1006], 0.08),
    shinLeft: region([[351,982],[442,985],[425,1096],[391,1226],[377,1369],[313,1370],[316,1225],[310,1138]], [394,1006], [346,1346], 0.074),
    shinRight: region([[563,985],[657,982],[691,1090],[704,1205],[702,1367],[636,1369],[625,1240],[593,1117]], [607,1006], [668,1346], 0.074),
    footLeft: region([[316,1320],[378,1320],[383,1391],[364,1437],[279,1437],[279,1381]], [346,1346], [325,1408], 0.079),
    footRight: region([[635,1320],[700,1320],[728,1390],[729,1437],[643,1437],[630,1388]], [668,1346], [686,1408], 0.079),
  },
]

export const CHARACTER_ART = Object.fromEntries(CHARACTERS.map(character => {
  const template = TEMPLATES[character.template]
  const art = Object.fromEntries(Object.entries(template).map(([key, value]) =>
    [key, value?.mask ? { ...value } : value]))
  Object.assign(art, { url: character.image, skin: character.skin, shade: character.shade,
    rim: character.color, template: character.template, wisps: character.wisps })
  if (!character.hair) art.hair = null
  if (character.id === 'kai' || character.id === 'volt') {
    art.head = region([[401,0],[665,0],[665,210],[576,274],[475,274],[414,217]], [529,147], [529,260], 0.085)
    art.softMotion = character.id === 'volt' ? 0 : 0.25
  }
  if (character.id === 'luna') {
    art.hair = region([[507,0],[447,0],[400,37],[353,127],[251,201],[214,293],[261,350],[351,399],[406,329],[457,253],[490,157]], [480,72], [355,311], 0.085)
  }
  if (character.wild) {
    art.head = region([[400,0],[662,0],[662,260],[586,316],[478,326],[424,268]], [529,208], [530,315], 0.105)
    art.torso = { ...art.torso, from: [525,369] }
    art.softMotion = 0.25
  }
  return [character.id, art]
}))

/** Cutouts are cached only for characters actually shown on court. */
export function getCharacterArt(id) {
  const art = CHARACTER_ART[getCharacter(id).id]
  if (!art.image) prepareArt(art)
  return art
}

function prepareArt(art) {
  art.image = new Image()
  // Prepare head and hair cutouts and continuous limb textures once.
  // Runtime rendering deforms these cached transparent surfaces.
  art.image.onload = () => {
    for (const [name, part] of Object.entries(art)) {
      if (!part?.mask) continue
      const numbers = part.mask.match(/-?\d+(?:\.\d+)?/g).map(Number)
      const xs = numbers.filter((_, i) => i % 2 === 0)
      const ys = numbers.filter((_, i) => i % 2 !== 0)
      const x = Math.floor(Math.min(...xs)) - 2, y = Math.floor(Math.min(...ys)) - 2
      const width = Math.ceil(Math.max(...xs)) - x + 2, height = Math.ceil(Math.max(...ys)) - y + 2
      part.origin = [x, y]
      part.bounds = { width, height }
      if (name !== 'head' && name !== 'hair') continue
      const canvas = document.createElement('canvas')
      canvas.width = width; canvas.height = height
      const ctx = canvas.getContext('2d')
      ctx.translate(-x, -y)
      ctx.clip(new Path2D(part.mask))
      ctx.drawImage(art.image, 0, 0)
      if (name === 'head') {
        const fade = ctx.createLinearGradient(0, part.to[1] - 23, 0, part.to[1] + 16)
        fade.addColorStop(0, '#fff')
        fade.addColorStop(1, 'rgba(255,255,255,0)')
        ctx.globalCompositeOperation = 'destination-in'
        ctx.fillStyle = fade
        ctx.fillRect(x, y, width, height)
      }
      part.surface = canvas
      part.origin = [x, y]

    }
    // Continuous texture regions for the deforming torso and limbs. A socket
    // overlap stays beneath the torso when a shoulder or hip bends sharply.
    const groups = {
      core: ['torso', 'pelvis'],
      armLeft: ['upperLeft', 'lowerLeft', 'handLeft'],
      armRight: ['upperRight', 'lowerRight', 'handRight'],
      legLeft: ['thighLeft', 'shinLeft', 'footLeft'],
      legRight: ['thighRight', 'shinRight', 'footRight'],
    }
    for (const [name, names] of Object.entries(groups)) {
      const pieces = names.map(key => art[key])
      const x = Math.min(...pieces.map(p => p.origin[0])) - 50
      const y = Math.min(...pieces.map(p => p.origin[1])) - 70
      const width = Math.max(...pieces.map(p => p.origin[0] + p.bounds.width)) - x + 50
      const height = Math.max(...pieces.map(p => p.origin[1] + p.bounds.height)) - y + 30
      const surface = document.createElement('canvas')
      surface.width = width; surface.height = height
      const ctx = surface.getContext('2d')
      ctx.translate(-x, -y)
      const mask = new Path2D(pieces.map(p => p.mask).join(' '))
      if (name.startsWith('leg') || name.startsWith('arm')) {
        const [sx, sy] = pieces[0].from
        const radius = name.startsWith('leg') ? 68 : 44
        mask.moveTo(sx + radius, sy)
        mask.arc(sx, sy, radius, 0, Math.PI * 2)
      }
      ctx.clip(mask)
      ctx.drawImage(art.image, 0, 0)
      art[name] = { surface, origin: [x, y] }
    }
    art.ready = true
  }
  art.image.src = art.url
}
