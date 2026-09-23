# Визуальные референсы Ragdoll Volley

Концепции созданы встроенным `image_gen`. Это игровые кадры для выбора направления графики, а не готовые фоны для прямой вставки. Во всех вариантах сохранены боковой ракурс, формат 16:9, два маленьких шарнирных персонажа, мяч и короткая центральная сетка. Такой стиль можно собрать в текущем Canvas 2D из градиентов, простых фигур и небольшого числа текстур.

| Сеттинг | Файл | Идея |
| --- | --- | --- |
| Пляж | [beach.png](beach.png) | Море, закат, песок и силуэты пальм |
| Спортзал | [gym.png](gym.png) | Тёплая деревянная стена, окна и паркет |
| Ночная крыша | [rooftop.png](rooftop.png) | Тёмный силуэт города и сдержанные неоновые акценты |
| Зимнее озеро | [winter-lake.png](winter-lake.png) | Снег, лёд, хвойные деревья и горы |

## Промпты

### Пляж

```text
Use case: stylized-concept
Asset type: feasible in-game visual reference for an existing browser-based 2D ragdoll volleyball game rendered with Canvas 2D.
Primary request: a polished playable screenshot in a sunny seaside setting.
Scene/backdrop: a simple flat beach court at late afternoon, broad horizontal bands of sea and sky, a few distant palm silhouettes and soft clouds, sand-colored ground at the bottom. Everything should be reproducible with gradients, basic shapes and a handful of 2D assets.
Subject: two small articulated ragdoll volleyball players, warm red on left and cool blue on right, with circular heads, small rectangular torsos, visible segment-like arms and legs with rounded joints. Each character is about 15% of image height and fully visible, positioned on opposite sides of a short thin central volleyball net. One small clear orange-yellow ball in play above the net.
Style/medium: clean, modern 2D arcade game art, simple vector-like shapes, restrained textures, polished but not cinematic.
Composition/framing: true side-on orthographic camera, wide 16:9 landscape game frame, full 32-by-18-like court visible; ground at 95% of frame height; net from ground to about one third of screen height; ample playable space above, no perspective or depth rotation.
Lighting/mood: bright and cheerful; readable contrast for gameplay.
Constraints: preserve straightforward gameplay composition, one ball, two players, one central net. Do not enlarge characters or add complex costumes. No words, score numbers, logos, watermark, 3D render, isometric camera, detailed crowd, or splash-screen layout.
```

### Общая часть промптов для остальных трёх вариантов

```text
Use case: stylized-concept
Asset type: realistic-to-implement visual reference, showing an actual playable frame of a browser Canvas 2D ragdoll volleyball game.
Keep this fixed composition: wide 16:9 frame, strictly side-on orthographic 2D view; full court with flat floor near 95% of frame height, centered short thin net rising to about one third of image height; two small articulated ragdoll players, red on the far-left side and blue on the far-right side, roughly 15% of frame height, each made of a circular head, small rectangular torso, separate stick-like limb pieces and round joints; one small high-contrast orange-yellow volleyball in the air. Generous empty gameplay space. Graphics must be feasible as a few layered 2D backgrounds, simple gradients, flat colored shapes and tiny texture accents. Keep silhouettes crisp and game readable. No scoreboard, no words, no logos, no watermark, no 3D, no perspective floor, no audience, no extra characters.
```

К этой общей части добавлен соответствующий блок:

### Спортзал

```text
Primary request: cozy retro school gym setting.
Scene/backdrop: flat warm timber wall panels, tall high windows suggested by simple rectangles, a few restrained horizontal wall stripes and soft wall-mounted light pools. A single narrow parquet-colored ground strip with painted line. No complex architecture.
Style/medium: charming polished 2D indie arcade art; subtle paper-like grain; clean geometry; warm mustard, cream, terracotta with the players still recognizably red and blue.
Lighting/mood: inviting, midday indoor light. The game court remains open and easy to read.
```

### Ночная крыша

```text
Primary request: neon city rooftop at night setting.
Scene/backdrop: broad dark violet night gradient, two or three layers of simple distant skyline silhouettes with sparse lit windows, a thin rooftop parapet and flat court surface at the bottom, a few small star dots. Keep city as a subdued backdrop.
Style/medium: modern minimal 2D arcade vector art with restrained magenta/cyan glow only around key edges; red and blue players stay distinct against background.
Lighting/mood: playful electric nighttime; high contrast; no photorealism or cinematic effects.
```

### Зимнее озеро

```text
Primary request: winter lakeside court setting.
Scene/backdrop: pale blue sky gradient, distant mountain shapes, a sparse row of stylized pine silhouettes, a flat snow-and-ice ground strip with subtle blue shadows; no detailed scenery.
Style/medium: polished minimal 2D arcade game art, clear geometric shapes and a few soft gradient accents; red and blue players remain uncostumed jointed puppets.
Lighting/mood: crisp bright winter daylight; light and cheerful, readable ball and net.
```
