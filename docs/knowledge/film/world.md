---
type: reference
title: Film world
description: The API for drawing land, weather, houses, growing things and the red thread; read before building a place or a scene.
---

# BIDE.world — land, weather, houses, growing things, wool

`const W = BIDE.world`. Everything is sheet space 1920×1080, deterministic in `t`, and draws straight on the painter `p`.
Look at any of it: `uv run concert-shot --fn worldSheet --k 5 --cols 1 --w 1200 --out build/x.jpg` (index at the bottom).

## Options every part understands
| option | meaning |
|---|---|
| `light` | mood name or light object: `dawn day summer gold rain dusk lowsun snow night storm`. Blend with `W.mixLight('day','storm',k)` and pass the result anywhere (for `sky` pass it as `mood`; while blending, hold the same clouds with `clouds: W.CLOUDS.day`) |
| `season` | 0 spring · .33 summer · .66 autumn · 1 winter, any value between |
| `colour` | 0 nearly grey … .5 the film's rationed colour (default) … 1 full colour (memory / love) |
| `t` | seconds; leave out to use `p.t` (song time held on twos) |
| `wind` | number (strength, negative blows left), or a gust function from `W.gusts(...)`. Same function on grass, tree, petals, smoke, wool and the cast keeps the scene in one wind |
| `d` | distance 0 near … 1 far (aerial perspective), `seed` |

**Gusts** `g = W.gusts({seed, every:2.7, speed:950, power:1, base:.16, dir:1})` → `g(t,x,y)` = bend (about 0…1.3, dips below 0 as it settles). Gusts arrive from one side, pass, settle with a rebound. `g.fronts(t)` gives the moving fronts. Use `g(t,x)` for skirts and hair.

## Places (whole compositions)
Each opens its own layers. Call with no `part` for the whole sheet, or `part:'back'`, then yours, then `part:'mid'`, your figures, then `part:'front'` (near grass drawn over feet). `layers:false` draws into the layer you opened. Back layers are cached (`still`): pass `still:false` when light, season or clouds change during the shot (`drift:8` moves the clouds).

| call | parts | scenes | anchors |
|---|---|---|---|
| `W.glen(p,{season,light,colour,wind,bend,callK,shadow,clouds})` | back mid front | s02 | `W.GLEN.road`, `.near` |
| `W.yard(p,{season,bloom 0..1,gate 0..1,swing,leaf,cottage,smoke,snow})` | back bush mid spray gate front | s03 s04 | `W.YARD.rose .bush .reach .gate .gap .road` |
| `W.meadow(p,{wind,light,colour,season})` (put `W.sky` + `W.hills` behind) | back mid front | s05 | child stands y≈860–940, between mid and front |
| `W.snowValley(p,{window 0..1,smoke,k})` | back mid front | s06 | `W.VALLEY.path` (lay the thread on it), `.window` |
| `W.thornHill(p,{season,light,shadow:x|[x..],shadowK,sunX,sunK,stone,roses 0..1,blossom,leaf,drift,snow})` | back mid front | s07 s12 s17 | `W.HILL.stand .tree .stone .path` |
| `W.doorway(p,{light,warm 0..1,wind})` (sky + hills behind) | back front | s01 | `W.DOOR {x0,x1,top,sill,cx}` |
| `W.interior(p,{fire 0..1,door 0..1,ruin 0..1,day 0..1,shaft,chair,light})` then `W.firelight(p,{x:446,y:640,k})` last | back fire chair shaft | s00 s08 s09 s11 | `W.ROOM.chair .lap .hearth .window .sill .door .threshold .out` |
| `W.roadHome(p,{season,light})` | back mid front | s10 | `W.ROAD.walk .pts .ruin` |
| `W.ruinYard(p,{door,light})` | back mid front | s11 s12 | `W.RUIN.path .door .stone .tree` |
| `W.graveside(p,{light,season,roses,blossom,leaf})` | back mid front | s12 s13 s15 s16 | `W.GRAVE.stone .kneel .tree .ground(x)` |
| `W.under(p,{grow,red,warm,roses,bed,sky})` + `W.warmth(p,{k})` (same layer, after `back`) + `W.treadRings(p,{x,k,power})` (own layer, after `roots`) | back roots above turf | s14 s15 | `W.UNDER.turf .bed .bedR .head .knees .grave .tree .roseRoot` |

`W.under` for actors: `part:'back'` → her in the bed → `part:'roots'` → `part:'above'` (stone and thorn trunk, same scale as `graveside`) → him → `part:'turf'` (grass over his knees).
`thornHill` shadows: `shadow` is the x of a cloud shadow on the land (sweep it −700 → 2600), it climbs the tree too; `shadowW` width, `shadowK` strength. Night: draw `W.stars` between `back` and `mid`.
If you hide the near grass for a figure, pass `avoid:(x,y)=>0..1`.

## Parts
**Sky, light** `sky(p,{mood,t,horizon,drift,clouds:true|false|n|[[x,y,w,h,seed]],seed,glowX})` · `cloudShadow(p,{x,w,y0,y1,k,light})` and `sunPatch(p,{x,y,rx,ry,k})` inside the land layer · `tide(p,{k 0..1})` a light edge sweeping the whole sheet (an `air`).
**Land** `hill(p,{pts,base,d,spurs,...})` · `hills(p,{preset:'west'|'high',dy})` · `fields` · `road(p,{pts,w:[far,near]})` · `lough` · `sheep(p,{at:[[x,y]]})` · `tinyHouse` · `farWall` · `wall(p,{line,h,size,moss,snow})` · `gate(p,{x,y,w,h,open})` · `pier` · `ground(p,{area:[x0,y0,x1,y1],dips,stones,tussocks})` gives any flat near ground a shape · `ruts(p,{pts,w})`.
**Growing** `grass(p,{line,h,n,depth,avoid(x,y)})` · `tall(p,{x,y,n,h,spread,lean})` one clump of standing hay with seed heads · `sward(p,{rg,depth})` short grass lying on a slope · `flowers` · `deadFlowers(p,{line,h,n})` · `thorn(p,{x,y,scale,season,blossom,leaf,flip})` · `stone(p,{x,y,scale,moss,tuft})` · `rosesOver(p,{x,y,scale,k})` same x,y,scale as the stone · `roseBush(p,{x,y,scale,w,h,bloom,season,hang})` (`hang:true` = canes falling over a wall top) returns `.heads` (positions of blooms) · `blooms(p,list,light,d)` small roses, list of `{x,y,r,seed,open,tilt,rot}`.
**The rose that comes apart** `rose(p,{x,y,r,apart 0..1,tilt 0 face-on..1.4 side,open,rot,shake,stem,stemTo,leaves,wind,t0,path})` ease `apart` yourself (about 2.6 s reads well); petals loosen, let go outer first, the heart last, and fall by themselves. If the rose moves while it falls apart pass `path: apart => [x,y]`, where the rose is at that value, so petals already loose keep their own flight. Returns `.loose`.
**Petals** `petals(p,{t,t0,n,from:[x,y]|fn(i),every,s,wind,floor,throw})` a handful; `petal(p,{x,y,s,rot,yaw})` one; `flutter(seed,age,{x,y,vx,vy,wind,floor})` the flight itself.
**Houses** `cottage(p,{x,y,scale,state:'lived'|'night'|'ruin',door,window,lit:0|1|'all',smoke})` returns `.door .win0 .win1` · `chair(p,{x,y,scale,face,light...})` returns `.seat .arm .top` · `fire(p,{x,y,w,h,k})` · `lamp(p,{x,y,k})` · `shaft(p,{pts,k})` · `smoke(p,{x,y,h,k,wind})`.
**Weather** `rain(p,{k,wind})` · `snow(p,{t,fall,depth:'far'|'near'|'all',wind})` (far behind the figure, near in front) · `snowGround` · `footprints(p,{pts,k})` · `stars(p,{n,area,k,way})` · `birds(p,{t,t0,x,y,n,dir,speed})`.
**The call** `callLines(p,{k 0..1.4,paths,n})`; pass `bend: W.callWind(k), callK:k` to `glen` so the grass bends and is combed, `callSky(p,{k})` before the lines so the clouds answer · `marchers(p,{k 0..1 along W.GLEN.road,n,road})`.

## The red thread
`W.thread(p, pts, opts)` draws wool along anchor points and returns `{start,end,track,path}`.
| opt | |
|---|---|
| `k0,k1` | drawn portion along its length: animate `k1` 0→1 to draw, 1→0 to un-draw, `k0` to unpick from the other end |
| `w` | 4 far/ground · 6 normal · 10–14 close |
| `hang` | sag between anchors (.05 taut … .3 loose) · `slack` wander · `meander` px on ground · `loops` n, `loopR` |
| `pull` | `{t0,amp,speed,from:0|1}` a ripple runs along it when it is pulled |
| `air` | px of travelling float (in wind, sky); add `free:true` for a loose far end |
| `ground` | 0..1 soft shadow under it · `fuzz`, `ply`, `raw:true` if pts is already a `woolPath` or `rope` |

`woolPath(pts,opts)` the strand only · `rope({id,n,len,t0,a(t),b(t)|null,ground(x),wind},t)` a real string for pulls, drops and dragging (deterministic, cached) → pass to `thread` with `raw:true` · `layOn([x,y],[x,y],ground(x))` lays it over land · `catches(p,pts,{})` a few blades over it · `ball(p,{x,y,r,roll,k,squash})` returns `.tail` (join your thread there); rolling without slipping = `roll += dx/r` · `windCurve(x,y,r,turns)` anchors for the loops that become a ball · `needles`, `knit(p,{x,y,w,rows})` · `spell('bide',x,y,s)` → `{main,dot}` anchor lists to `thread`.

```js
// the thread paying out between two hands, plucked at t=2.1
const s = W.rope({id:'s04', n:30, len:520, t0:0, a:t=>hand(t), b:t=>snag(t), wind:g}, s.t);
W.thread(p, s, {raw:true, w:7, pull:{t0:2.1, amp:14}});
```

## Cost
Whole places issue in about 2–10 ms, 170–290 masses, 500–1100 lines. Extra `grass` n=40 ≈ 60 lines. Put moving things in `every:2` layers and let `still` backs stay still.

## Picture index (`worldSheet --k`)
0 glen + call · 1 yard summer · 2 yard autumn · 3 meadow · 4 snow valley · 5 thorn hill, sun · 6 thorn hill, shadow · 7 doorway · 8 room by fire · 9 room in ruin · 10 under · 11 under, warm · 12 night · 13 road home · 14 ruin yard · 15 graveside · 16 graveside in colour · 17 thorn through the year · 18 roses · 19 wool · 20 cottages · 21 wall, gate, dead heads

Motion pages (k = seconds): `motionA` wind on tree, grass, hay · `motionB` the rose and petals · `motionC` fire, smoke, snow · `motionD` rope, ball, floating thread, spelling · `motionE` the call crossing the glen. Example: `uv run concert-shot --fn motionB --k 0.6,0.9,1.1,1.2,1.4,2 --cols 3 --w 600 --out build/m.jpg`
