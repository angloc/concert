---
type: reference
title: Film cast
description: "The API for drawing the people of the film: figures, poses, pairs, close-ups, expressions and light; read before staging a scene."
---

# CAST — the people of BIDE

Everything hangs off `BIDE.cast` (call it `C`). All calls take the painter `p` first and draw into the CURRENT layer.
The API below is stable; the drawing behind it keeps improving. All sizes are sheet pixels, all angles radians, y down.

- Give people their own layer: `p.layer('people',{every:1,depth:1})` (or `every:2` in holds). Figures read best with `depth` .8–1.
- Two figures that touch must share one display list: use `C.embrace / C.carry / C.group`.
- Relative heights: mother 1.00 · motherOld .92 · boy .64 · danny 1.10 · dannyOld 1.04 (`C.who[name].rel`). If mother is `h:500`, Danny is `h:550`.
- `face: 1` looks to picture right, `face: -1` mirrors the whole drawing to look left.
- Everything is deterministic. `t` defaults to `p.t` and drives breath, knitting, waving, cloth flutter.

## 1. `C.figure(p, who, pose)` → anchors

`who`: `'mother' | 'motherOld' | 'boy' | 'danny' | 'dannyOld'`

| pose field | meaning |
|---|---|
| `x, y` | ground point between the feet |
| `h` | standing height in px, 60 … 900 (it simplifies itself when small; below 46, or with `lite:true`, it is a few cheap marks: use that for crowds) |
| `view` | `'front' '34' 'side' '34back' 'back'`, or `yaw` in radians (0 front, 1.45 side, 3.14 back; any value, so a turn can be animated) |
| `face` | 1 / -1 |
| `lean` | whole body tips toward the facing side (.1 gentle, .3 strong) |
| `bend` | spine curl added to the character's own posture (.2 sad, .5 doubled over; negative lifts the chest) |
| `side` | sideways sway of spine + head in the picture |
| `crouch` | 0..1 lowers the hips |
| `twist` | turns the shoulders against the hips |
| `weight` | -1..1 which hip carries the weight when standing (default .7) |
| `shrug` | -1..1 shoulders up / down |
| `head` | `{turn, tilt, nod}`: turn + = further toward the facing side, - = back toward us; nod + = down |
| `armL, armR` | the CHARACTER's own left / right. `armNear, armFar` (nearer / farther from us) are usually easier and win over L/R |
| `legs` | string or object, table below |
| `expr` | expression, section 4 |
| `wind` | `[x,y]` sheet direction, strength about 0..1.2; moves hair, skirt, coat, scarf |
| `drag` | `[x,y]` extra hem/tail offset in body heights for follow-through (feed it a lagged velocity: `[-.1,0]`) |
| `light` | `{dir, warm, k, dim}` section 5 |
| `cap` | Danny: `true` (default) / `false` bare head; `capInHand:true` draws it in the near hand |
| `scarf` | Danny: `false` leaves it off. `scarfColor`, `tails:[[len,ox,id],…]` override |
| `rot`, `pivot` | rotate the whole figure about `pivot` (body heights, y down, default the ground point) |
| `noHead, noArmNear, noArmFar, noFeet` | leave parts out (doorway, behind a wall) |
| `rec` | shared display list from `C.group` |

Returned anchors (sheet px): `head neck chest pelvis handNear handFar handL handR shoulderNear shoulderFar elbowNear footNear footFar scarfEnd` + `T([x,y])` (body units → sheet). Tie the red thread to `handNear` or `scarfEnd`.

### Arms
Named gestures: `rest reach reachUp reachDown hug wave holdScarf tuckScarf knit overHeart pray windThread open carry holdCap pocket lap kneeHand ground back`

Also accepted:
- `[x, up]` or `[x, up, handPose]` — hand target in body heights: x toward the facing side, up from the ground (chest ≈ .72, hip ≈ .5)
- `{at:[X,Y], h:'onChair', elbow:-1}` — put the hand on an exact sheet point (chair back, rose, door)
- `['rest','overHeart',k]` — blend two gestures (both may be any form above)
- `{g:'windThread', add:[.02,.01]}` — gesture plus an offset

Hand poses: `rest reach holdFingers cradle pinch knit windThread onChair flatOnEarth open fist`, or `['rest','open',k]`.

### Legs
| `legs` | use |
|---|---|
| `'stand'` / `{kind:'stand', stance, gap, lead}` | weight on one hip |
| `{kind:'walk', phase, amp}` | phase 0..1 per two steps. each person has their own gait (`C.gait`) |
| `{kind:'run', phase}` | boy's run |
| `{kind:'kneel', k, one}` | k 0 upright on the knees … 1 back on the heels; `one:1` half kneel |
| `{kind:'kneelDown', k}` / `{kind:'sitDown', k, seat}` | keyed descents (use through `C.poses`) |
| `{kind:'sit', seat:.285}` | on a chair |
| `{kind:'sitGround', up}` | on the earth, far knee up |
| `{kind:'hang', k}` | carried child |
| `{kind:'feet', feet:[[x,y,ang],[x,y,ang]]}` | explicit feet (body heights) |

Planted feet: `phase = distanceTravelled / C.stride(who, 'walk', h)`.

```js
// young Danny walks away, scarf in the wind, looks back once
const d = 260*s.t, h = 420;
C.figure(p,'danny',{x:500+d,y:860,h,view:'side',legs:{kind:'walk',phase:d/C.stride('danny','walk',h)},
  wind:[-.5,0],light:L,...C.poses.lookBack(A.keys(s.t,[[2,0],[2.6,1],[3.4,1],[4,0]]))});
// old mother knitting by the fire
C.figure(p,'motherOld',{x:700,y:880,h:520,view:'34',legs:{kind:'sit'},armNear:'knit',armFar:'knit',expr:'tender',head:{nod:.25},light:{dir:2.7,warm:.95,k:.8,dim:.2}});
// hand on the chair back
C.figure(p,'dannyOld',{x:900,y:900,h:560,view:'34',armNear:{at:[820,560],h:'onChair'},expr:'ache',light:L});
// blend an expression and a gesture
C.figure(p,'mother',{x:640,y:900,h:540,view:'34',armNear:['tuckScarf','rest',k],expr:['proud','falter',k],light:L});
```

### `C.poses` — pose fragments, spread them in, each takes k 0..1
`kneelDown(k)` `pray(k)` `cheekToEarth(k)` `sitDown(k)` `asleepAtStone()` `lookBack(k)`

## 2. Pairs and special drawings

| call | what |
|---|---|
| `C.embrace(p,{a:'mother',b:'danny',x,y,h,k,face,expr:[ea,eb],light,wind,poseA,poseB})` | a stands left, b right; k 0 a step apart → 1 held. `h` = height of a |
| `C.carry(p,{x,y,h,yaw,lift,face,expr:[mother,boy],light,wind})` | mother carrying the boy; animate `yaw` 0..2π to turn them slowly; `lift` 0..1 overhead |
| `C.liftSpin(p,{x,y,h,k,…})` | caught → swung up → one full spin → settled on her shoulder, k 0..1 (about 2.2 s) |
| `C.holdClose(p,{x,y,h,face,turn,expr:[m,b],light,wind})` | CLOSE-UP: young mother, eyes closed, boy's cheek on her shoulder. x,y between her eyes, h her head height (300–480) |
| `C.hands(p,{x,y,h,k,angle,a,b,light})` → `{tipA,tipB,wristA,wristB}` | CLOSE-UP: two hands. k 0 clasped · .5 sliding · .9 fingertips · 1 apart · 1.3 falling back. `h` hand length 250–480. Run the thread from `tipA` to `tipB` |
| `C.sleepCurled(p,{x,y,w,face,wake,finger,light})` → `{finger,head,heart}` | she lies curled on her side; w = length px; `wake` 0→1 turns the face up and opens the eyes; `finger` 0→1 lifts the thread finger. Rotate with `p.push/rotate` if needed |
| `C.group(p, rec => {…})` | several figures with correct overlaps; pass `rec` in every pose |

## 3. Close-ups

`C.face(p, who, o)`: `x,y` = between the eyes, `h` = head height crown-to-chin (400–900), `view:'front'|'34'|'side'` (+ `turn`), `nod`, `tilt`, `face`, `expr`, any expression parameter directly (`mOpen:.3`), `light`, `wind`, `cap`, `bust:false` (head only), `bodyTurn`, `bodyLean`, `scarf:false`, `t`.

Lip sync: `mOpen: s.mouth*.6, mRound: s.round`. Praying lips: `mOpen:.12*Math.abs(Math.sin(t*5))`.

`C.hand(p,{who,x,y,h,pose,rot,mir,flip,roll,pitch,light,sleeve:false,armLen})`: x,y = wrist, h = wrist to fingertip (200–700), `rot` = direction the hand points (0 right), `mir:-1` mirrors, `flip:-1` other hand, `roll` degrees round the arm (0 back of hand, 90 thumb edge, 170 palm).

```js
C.face(p,'motherOld',{x:1000,y:470,h:640,view:'34',face:-1,expr:['tender','peace',k],tear:A.keys(s.t,[[6,0],[8.6,.8,'out']]),wet:.8,nod:.08,light:{dir:2.7,warm:.95,k:.85,dim:.25}});
C.face(p,'dannyOld',{x:900,y:430,h:620,view:'34',nod:.35,cap:false,expr:'prayer',mOpen:.1*Math.abs(Math.sin(p.t*4.5)),light:L});
```

## 4. Expressions
Presets: `neutral stillness tender proud holdingBack falter hope joy ache prayer wonder peace asleep`.
Use a name, a blend `['tender','falter',k]`, or `{base:'tender', open:.4, wet:.8}`.
Parameters: `open` lids 0..1.2 · `gx,gy` gaze -1..1 (gy + down) · `wet` · `smileEye` · `browIn` inner brow raise · `knit` · `brow` raise · `mOpen mRound mWide smile press` · `cheek` · `blush` · `tear` 0..1 along the cheek (null none) · `asym` · `nod tilt turn` offsets.

## 5. Light
`light:{dir, warm, k, dim}` — `dir` = angle toward the source in the picture (-PI/2 above, PI left, 0 right, 2.6 low left = firelight from the left) or `[x,y,z]`; `warm` 0 cold … 1 fire; `k` contrast 0..1; `dim` 0..1 sinks everything toward dark (night, firelight rooms); `shadow:'#hex'`, `rim` 0..1.

Dawn `{dir:-2.6,warm:.35,k:.45}` · noon gold `{dir:-.9,warm:.8,k:.6}` · fire `{dir:2.7,warm:1,k:.85,dim:.3}` · snow `{dir:-1.6,warm:.15,k:.3}` · dusk `{dir:-.3,warm:.6,k:.6,dim:.15}` · underground warm rings `{dir:-1.57,warm:.9,k:.7,dim:.35}`

Small print
- Never use `p.lift` on top of a figure: it lifts down to whatever lies underneath. Highlights are drawn.
- `bustLen` (default 1.5 head heights) sets how far the shoulders of a close-up run; keep it ≥ 1.1 and let the sheet edge or a mass hide the end. `bust:false` + your own body works well for lying heads.
- `wind` up to about ±1.0; change it through `A.keys` so cloth swings, and feed `drag` a lagged velocity when someone stops.
- `C.figure` costs about 7–12 ms, a close-up 12–18 ms, `lite:true` under 2 ms.
- A standing figure sways on its own hip: change `weight` (-1..1) slowly for a shift of weight, never snap it.

## 6. Test sheets
`castSheet` k 0–4 one character each, 5 line-up, 6 far figures · `castFaces` k 0–15 · `castHands` k 0–1 · `castWalk` k 0–5 · `castActing` k 0–1 · `castPairs` k 0–6 · `castMotion` k 0–6 (consecutive drawings) · `castBig` k 0–10
`node tools/shot.mjs --fn castPairs --k 0,1,2 --cols 3 --w 640 --out build/x.jpg`
