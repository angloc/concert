// engine.js - soft pastel, coloured pencil and graphite on toothy paper, sheet after sheet. WebGL2 + Canvas2D, no libraries, no images.
//
// How a layer is drawn: masses and shades go flat into a small underpainting (colour) and a direction map (stroke angle, size, length).
// The GPU rubs in a smudged base, then lays thousands of strokes from broad to fine (side of the pastel, pastel hatching, coloured pencil
// hatching, cross-hatching, fine pencil where there is detail). Every stroke takes its colour from the underpainting under its centre, follows
// the direction map, stops near edges and deposits pigment through the paper tooth. Kneaded-eraser lifts come next, drawn lines last.
// Time: a stroke survives from drawing to drawing until what it depicts changes or its slow refresh comes up, at most once per `every`.
//
// For whoever draws with it
// - Order inside a layer is respected: a mass (alpha >= .6) covers lines and lifts called before it, so back-to-front limb, outline, limb, outline works.
// - `every` sets boil: how often strokes, lines and p.rnd change. Motion is never held back: a layer whose calls change is redrawn every drawing,
//   an unchanged layer costs nothing. `still:true` skips even reading the calls (do not use it for anything that moves or fades).
// - shade() only darkens or lightens what the same layer has painted; in a layer with no mass it becomes a glaze over everything below.
// - lift() goes to bare paper through this layer and the ones below. Layer `alpha` thins pigment through the tooth instead of fading.
// - Lengths in st (w, soft, gap, len of hatch) scale with the transform; pencil/pastel stroke size does not. soft is the blur radius in px.
// - Give direction: dir along the form, around:[x,y] for round things, to:[x,y] for radiating ones. Small or tender shapes: size .5-.7, len .5-.7.
//   vary .2-.3 calm (faces, walls), .35 normal, .5-.7 foliage and ground. Two or three large masses with soft shades beat many small ones.
// - depth 0 far: broader, softer, more paper. 1 near: crisp, full detail pencil. Figures .85-1, skies 0-.2.
window.BIDE = window.BIDE || {};
(function () {
  'use strict';
  const B = window.BIDE; B.test = B.test || {}; B.engine = B.engine || {};
  const LW = 1920, LH = 1080, SW = 240, SH = 135, TX = 8, TY = 4, TAU = Math.PI * 2;

  /* ---------------------------------------------------------------- GLSL */
  const HEAD = `#version 300 es
precision highp float;precision highp int;precision highp sampler2D;
const vec2 L=vec2(${LW}.,${LH}.);
uvec3 pcg(uvec3 v){v=v*1664525u+1013904223u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;v^=v>>16u;v.x+=v.y*v.z;v.y+=v.z*v.x;v.z+=v.x*v.y;return v;}
vec3 h3(uvec3 v){return vec3(pcg(v))*(1./4294967296.);}
`;
  const QUAD_VS = HEAD + `out vec2 vUv;void main(){vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));vUv=p;gl_Position=vec4(p*2.-1.,0.,1.);}`;

  const NOISE_FS = HEAD + `in vec2 vUv;out vec4 o;
float r(vec2 i,vec2 per,float s){i=mod(i,per);return h3(uvec3(uint(i.x),uint(i.y),uint(s*71.))).x;}
float tn(vec2 p,vec2 per,float s){vec2 i=floor(p),f=p-i;f=f*f*f*(f*(f*6.-15.)+10.);return mix(mix(r(i,per,s),r(i+vec2(1,0),per,s),f.x),mix(r(i+vec2(0,1),per,s),r(i+vec2(1,1),per,s),f.x),f.y);}
float fb(vec2 uv,vec2 per,float s,float g){float a=1.,t=0.,n=0.;for(int k=0;k<4;k++){t+=a*tn(uv*per,per,s+float(k)*3.1);n+=a;a*=g;per*=2.;}t/=n;return clamp(.5+(t-.5)*1.75,0.,1.);}
void main(){o=vec4(fb(vUv,vec2(7.),1.,.5),fb(vUv,vec2(11.),2.,.55),fb(vUv,vec2(5.,44.),3.,.6),fb(vUv,vec2(48.),4.,.7));}`;

  // paper: r = coarse pastel tooth (equalised), g = finer pencil grain (equalised), b = slow mottling, a = fibres
  const TOOTH_FS = HEAD + `in vec2 vUv;out vec4 o;uniform float uS;
float r(vec2 i,float s){return h3(uvec3(uint(int(i.x)+4096),uint(int(i.y)+4096),uint(s*71.))).x;}
float vn(vec2 p,float s){vec2 i=floor(p),f=p-i;f=f*f*(3.-2.*f);return mix(mix(r(i,s),r(i+vec2(1,0),s),f.x),mix(r(i+vec2(0,1),s),r(i+vec2(1,1),s),f.x),f.y);}
mat2 rot(float a){float c=cos(a),s=sin(a);return mat2(c,-s,s,c);}
float eq(float z){return 1./(1.+exp(-1.702*z));}
void main(){vec2 q=gl_FragCoord.xy/uS;float px=1./uS;
 vec2 wq=q+(vec2(vn(q/41.,9.),vn(q/41.,10.))-.5)*9.;
 float a=vn(rot(.5)*q/max(2.35,px*1.4),1.),b=vn(rot(1.3)*q/max(1.45,px),2.),c=vn(rot(.2)*wq/4.6,3.),d=vn(rot(-.12)*wq/vec2(9.5,2.7),4.);
 float z=((a-.5)*1.+(b-.5)*1.+(c-.5)*.3+(d-.5)*.42)/(sqrt(1.+1.+.09+.176)*.2145);
 float e=vn(rot(.9)*q/max(1.75,px*1.2),5.),f=vn(rot(2.1)*q/max(1.15,px),6.),g=vn(rot(.4)*wq/vec2(6.,2.4),7.);
 float y=((e-.5)+(f-.5)*.9+(g-.5)*.4)/(sqrt(1.+.81+.16)*.2145);
 float m=vn(q/230.,11.)*.5+vn(q/96.,12.)*.3+vn(q/37.,13.)*.2;
 float fib=0.;for(int k=0;k<3;k++){float an=float(k)*1.17+.35;vec2 u=rot(an)*(q+(vec2(vn(q/60.,20.+float(k)),vn(q/60.,30.+float(k)))-.5)*38.);vec2 cell=floor(u/vec2(46.,17.));vec3 rr=h3(uvec3(uint(int(cell.x)+900),uint(int(cell.y)+900),uint(40+k)));vec2 loc=u-(cell+.5)*vec2(46.,17.);if(rr.x<.22){float ly=loc.y-(rr.y-.5)*9.-sin(loc.x*.13+rr.z*6.)*1.6;fib=max(fib,(1.-smoothstep(.35,1.15,abs(ly)))*(1.-smoothstep(10.+rr.z*8.,18.+rr.z*4.,abs(loc.x)))*(.4+.6*rr.z));}}
 o=vec4(eq(z),eq(y),clamp(.5+(m-.5)*1.7,0.,1.),fib);}`;

  const PAPER_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uT;uniform vec3 uPaper;uniform float uS;
void main(){vec4 t=texelFetch(uT,ivec2(gl_FragCoord.xy),0);float sh=(t.r-.5)*.05+(t.g-.5)*.026+(t.b-.5)*.02;
 vec3 c=uPaper*(1.+sh);c+=vec3(.006,.001,-.006)*(t.b-.5);c=mix(c,c*vec3(.94,.91,.87),t.a*.42);
 vec2 q=gl_FragCoord.xy/uS;vec2 ed=min(q,L-q);float e=min(ed.x,ed.y);c*=1.-.045*exp(-e/26.)*(.5+t.b);
 o=vec4(c,1.);}`;

  const STATE_FS = HEAD + `in vec2 vUv;uniform sampler2D uU,uPrev,uOld;uniform float uDraw,uFresh;layout(location=0)out vec4 o0;layout(location=1)out vec4 o1;
void main(){vec4 u=textureLod(uU,vUv,2.);ivec2 p=ivec2(gl_FragCoord.xy);vec4 q=texelFetch(uPrev,p,0);vec4 d=abs(u-q);float m=max(max(d.r,d.g),max(d.b,d.a));
 vec2 hl=vec2(floor(uDraw/256.),mod(uDraw,256.))/255.;o1=u;
 o0=uFresh>.5?vec4(0.):(m>.03?vec4(hl,0.,1.):texelFetch(uOld,p,0));}`;

  const COMMON = `
vec3 toLab(vec3 c){c=pow(max(c,0.),vec3(2.2));float l=.4122214708*c.r+.5363325363*c.g+.0514459929*c.b,m=.2119034982*c.r+.6806995451*c.g+.1073969566*c.b,s=.0883024619*c.r+.2817188376*c.g+.6299787005*c.b;vec3 q=pow(vec3(l,m,s),vec3(1./3.));
 return vec3(.2104542553*q.x+.7936177850*q.y-.0040720468*q.z,1.9779984951*q.x-2.4285922050*q.y+.4505937099*q.z,.0259040371*q.x+.7827717662*q.y-.8086757660*q.z);}
vec3 fromLab(vec3 c){float l=c.x+.3963377774*c.y+.2158037573*c.z,m=c.x-.1055613458*c.y-.0638541728*c.z,s=c.x-.0894841775*c.y-1.2914855480*c.z;l=l*l*l;m=m*m*m;s=s*s*s;
 return pow(clamp(vec3(4.0767416621*l-3.3077115913*m+.2309699292*s,-1.2684380046*l+2.6097574011*m-.3413193965*s,-.0041960863*l-.7034186147*m+1.7076147010*s),0.,1.),vec3(1./2.2));}
`;

  // smudged base: the finger-rubbed first lay-in
  const BASE_FS = HEAD + COMMON + `in vec2 vUv;out vec4 o;uniform sampler2D uU,uD,uT,uN;uniform vec4 uB;uniform vec2 uPos0;uniform vec2 uPos1;uniform vec4 uPaper;
void main(){vec2 q=mix(uPos0,uPos1,vUv);vec4 n1=texture(uN,q/700.+uB.zw),n2=texture(uN,q/170.+uB.wz);vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);
 float dk=smoothstep(.02,.12,length(textureLod(uU,q/L,0.)-textureLod(uU,q/L,2.6)));vec2 w=((n1.rg-.5)*10.+(n2.ga-.5)*4.5)*(1.-.5*dk)+(vec2(tt.r,tt.g)-.5)*3.6;vec2 uv=(q+w)/L;
 vec2 dr=textureLod(uD,q/L,0.).rg*2.-1.;float th=.5*atan(dr.y,dr.x);vec2 dv=vec2(cos(th),sin(th));
 float rub=texture(uN,vec2(dot(q,dv)/1500.,dot(q,vec2(-dv.y,dv.x))/300.)+uB.zw).b;
 vec4 u0=textureLod(uU,uv,0.);vec4 u2=(textureLod(uU,uv-dv*8./L,uB.x)+textureLod(uU,uv+dv*8./L,uB.x)+textureLod(uU,uv,uB.x))/3.;
 float det=max(length(u0-u2),dk*.1);vec4 u=mix(u2,u0,smoothstep(.02,.10,det)*.94);
 float dc=texture(uD,uv).a;float soft=textureLod(uU,uv,2.3).a;float cov=min(u.a,smoothstep(.22,.86,soft+(n2.b-.5)*.55+(tt.r-.5)*.25))*dc;if(cov<.004){o=vec4(0.);return;}
 vec3 c=u.rgb/max(u.a,1e-3);float lum=dot(c,vec3(.3,.59,.11));
 float m=(n1.b-.5)*.4+(n2.r-.5)*.5+(tt.b-.5)*.5+(rub-.5)*.7;
 float a=cov*(uB.y+.16*dk+.36*(1.-lum)*(1.-lum)+.28*m*(.35+.65*lum))*(.90+.2*tt.r);
 c*=1.+(n2.g-.5)*.05+(rub-.5)*.07+(tt.g-.5)*.05;c+=vec3(.5,.1,-.6)*(n1.a-.5)*.03;
 a=clamp(a,0.,.985);float k=cov*uPaper.a*(.96+.08*tt.r);float A=max(a,k);vec3 g=uPaper.rgb*(1.+(tt.r-.5)*.052+(tt.b-.5)*.05);c=mix(g,c,clamp(a/max(A,1e-3),0.,1.));A=clamp(A,0.,.99);o=vec4(clamp(c,0.,1.)*A,A);}`;

  const STROKE_VS = HEAD + COMMON + `
uniform sampler2D uU,uD,uST,uSty,uN;uniform ivec4 uTile;uniform ivec3 uKey;uniform uint uPrime;uniform vec2 uCell;uniform vec4 uPar,uPar2,uTime,uG;
flat out vec4 vCol,vA,vB,vC,vUc;out vec2 vL,vQ;
vec4 us(vec2 q,float l){return textureLod(uU,q,l)*textureLod(uD,q,0.).a;}
float lst(vec2 q){vec2 s=texelFetch(uST,ivec2(clamp(q/L,0.,.9999)*vec2(${SW}.,${SH}.)),0).rg;return floor(s.r*255.+.5)*256.+floor(s.g*255.+.5);}
int sid(ivec2 t){return int(texelFetch(uD,clamp(t,ivec2(0),textureSize(uD,0)-1),0).b*255.+.5);}
vec4 dAt(vec2 q){return texelFetch(uD,clamp(ivec2(q/L*vec2(textureSize(uD,0))),ivec2(0),textureSize(uD,0)-1),0);}
float angOf(vec4 d,float fb){vec2 r=d.rg*2.-1.;return dot(r,r)<.02?fb:.5*atan(r.y,r.x);}
float gMv=1.;
uint epochOf(vec2 q,float ph){float n=uTime.x,P=uTime.y;float e=floor((n-ph*P)/P),bt=(e+ph)*P;float last=lst(q);if(last>bt)gMv=.72;return last>bt?uint(last)+4096u:uint(int(e)+64);}
void main(){
 gl_Position=vec4(2.,2.,2.,1.);vCol=vA=vB=vC=vUc=vec4(0.);vL=vQ=vec2(0.);
 int per=uKey.x,pass=uKey.y;int N=uTile.z*uTile.w*per;int idx=int((uint(gl_InstanceID)*uPrime)%uint(N));
 int ci=idx/per,si=idx%per;ivec2 cell=uTile.xy+ivec2(ci%uTile.z,ci/uTile.z);
 uvec3 pk=uvec3(uint(cell.x+8),uint(cell.y+8),uint(pass*16+uKey.z*256+9)),key=pk+uvec3(0u,0u,uint(si+1)*1048576u);
 vec4 pn,pn2;float depth=uTime.z;bool grp=uG.x>0.;
 vec3 rp0=h3(pk),r0=h3(key);vec2 pos;uint ep;vec3 rp;float off=0.;vec2 inv=1./L;
 if(grp){vec2 pc=(vec2(cell)+rp0.xy)*uCell;ep=epochOf(pc,rp0.z);rp=h3(pk+uvec3(3u,1u,ep*977u+13u));pc+=(rp.xy-.5)*uCell*.5;vec4 d0=dAt(pc);float sz=max(.35,texelFetch(uSty,ivec2(int(d0.b*255.+.5),0),0).x*4.);if(d0.a<.5)sz=1.;
  float a0=angOf(d0,rp.z*3.14)+(rp.z-.5)*uPar2.y;vec2 nn=vec2(-sin(a0),cos(a0));vec3 rs=h3(key+uvec3(1u,5u,ep*977u+5u));off=float(si)-.5*float(per-1);float sp=uG.x*sqrt(sz)*(.78+.5*rp.x);pos=pc+nn*(off+(rs.x-.5)*.55)*sp+vec2(nn.y,-nn.x)*((rs.y-.5)*.34+off*(rp.y-.5)*.06)*uPar.x*sqrt(sz);}
 else{pos=(vec2(cell)+r0.xy)*uCell;ep=epochOf(pos,r0.z);rp=h3(uvec3(uint(int(pos.x/110.)+3),uint(int(pos.y/84.)+3),uint(pass+40)+ep/3u));}
 vec3 r1=h3(key+uvec3(0u,7u,ep*977u+13u)),r2=h3(key+uvec3(5u,0u,ep*977u+77u)),r3=h3(key+uvec3(9u,3u,ep*977u+191u));
 if(!grp)pos+=(r1.xy-.5)*uCell*.5;if(pos.x<-8.||pos.y<-8.||pos.x>L.x+8.||pos.y>L.y+8.)return;
 vec2 uvp=clamp(pos*inv,vec2(.0004),vec2(.9996));
 vec4 c0=textureLod(uU,uvp,.5);vec4 dd=dAt(pos);float cov=c0.a*step(.5,dd.a);if(cov<.05)return;
 ivec2 dt=ivec2(uvp*vec2(textureSize(uD,0)));int s0=sid(dt),s1=sid(dt+ivec2(1,0)),s2=sid(dt-ivec2(1,0)),s3=sid(dt+ivec2(0,1)),s4=sid(dt-ivec2(0,1));
 if(s0!=s1&&s0!=s2&&s0!=s3&&s0!=s4)s0=s1==s3?s1:(s2==s4?s2:s1);
 vec4 sty=texelFetch(uSty,ivec2(s0,0),0)*vec4(4.,4.,2.,1.);float size=sty.x,ln=sty.y,dens=sty.z,vary=sty.w;
 if((grp?rp.z*.6+r3.z*.4:r3.z)>uPar2.x*dens*(.35+.65*cov))return;
 pn=textureLod(uN,pos/1150.+vec2(float(uKey.z)*.137,float(pass)*.31),0.);pn2=textureLod(uN,pos/460.+vec2(.4,float(pass)*.17),0.);
 float th=angOf(dd,r1.z*6.283)+uG.w;th+=grp?(rp.z-.5)*uPar2.y+off*(rp.y-.5)*.035:(pn.r-.5)*uPar2.y;th+=(r2.x-.5)*uPar2.z;vec2 dir=vec2(cos(th),sin(th));if(r1.x<.5&&!grp)dir=-dir;vec2 nrm=vec2(-dir.y,dir.x);
 float big=mix(1.2,.94,depth);float len=uPar.x*ln*(grp?.72+.5*r1.z:.55+.9*r1.z)*big*sqrt(size),hw=.5*uPar.y*(grp?sqrt(size):size)*(.7+.6*r2.y)*big;float hf=.5*len;
 float LA=hf,LB=hf,thr=pass==0?.15:.115;
 for(int k=1;k<=5;k++){float s=hf*float(k)*.2;vec4 a=us((pos+dir*s)*inv,0.);if(length(a-c0)>thr){LA=hf*(float(k)-.6)*.2+1.;break;}}
 for(int k=1;k<=5;k++){float s=hf*float(k)*.2;vec4 a=us((pos-dir*s)*inv,0.);if(length(a-c0)>thr){LB=hf*(float(k)-.6)*.2+1.;break;}}
 float over=r3.x*r3.x*uPar2.w;float und=r3.y*r3.y*4.5*(1.-smoothstep(.03,.12,r3.x*.12));float oA=0.,oB=0.;if(LA<hf){LA=max(1.,LA+over-und);oA=over;}if(LB<hf){LB=max(1.,LB+over-und);oB=over;}
 float keep=(LA+LB)/len;if(pass==0&&keep<.42)return;if(pass==1&&keep<.16)return;if(keep<.07)return;
 vec4 pa=us((pos+nrm*hw)*inv,0.),pb=us((pos-nrm*hw)*inv,0.);float da=length(pa-c0),db=length(pb-c0);
 if(pass==0&&max(da,db)>.17)return;if(da>.18&&db>.18)hw*=.6;
 float det=max(max(da,db),max(length(textureLod(uU,uvp,3.4)-c0),length(textureLod(uU,uvp,5.)-c0)*.6));float dk=smoothstep(.02,.1,det);if(pass==0&&det>.2)return;if(pass==1&&r2.z<dk*.35)return;
 if(pass==4&&r2.z>max(dk,smoothstep(.95,.6,size))*mix(.7,1.,depth)+.05)return;
 if(pass==3&&r2.z>.75-.4*dk)return;
 vec3 col=c0.rgb/c0.a;vec3 lab=toLab(col);float lum=lab.x;
 float va=vary/.35*gMv*mix(.5,1.,smoothstep(.45,.95,size))*(pass==0?.8:1.)*mix(.8,1.,depth);float al=1.;
 // one patch of hatching is one stick of pigment: local, lighter and warmer, darker and cooler, a neighbour hue, or a stray
 vec3 q4=grp?rp:vec3(fract(pn.r*3.7+pn2.g*2.3+r3.y*.35),pn2.a,r3.y);float w=fract(q4.x*7.13+q4.y*3.1);
 float dl=0.,dh=0.,dc=0.,hue=atan(lab.z,lab.y),hw0=mod(1.45-hue+3.14159,6.28318)-3.14159,hc0=mod(4.3-hue+3.14159,6.28318)-3.14159;float isR=smoothstep(.07,.13,length(lab.yz))*(1.-smoothstep(.55,.95,abs(hue-.45)));hw0=clamp(hw0,-.8,.8)*(1.-.6*isR);hc0=clamp(hc0,-.8,.8)*(1.-.85*isR);if(isR>.5&&w>.82)w=.2;if(w<.36){dl=0.;}else if(w<.60){dl=.05;dh=.22*hw0;}else if(w<.82){dl=-.055;dh=.24*hc0;dc=.06;}else if(w<.92){dh=(q4.z-.5)*.7;dc=.1;}else{dl=.02;al=.0;}
 lab.x+=va*(dl+(r2.x-.5)*.045);float ha=va*(dh+(r3.y-.5)*.14+(pn.g-.5)*.16);float cs=cos(ha),sn=sin(ha);lab.yz=mat2(cs,sn,-sn,cs)*lab.yz*(1.+va*(dc+(r3.x-.4)*.22));
 float ta=mix(1.35,4.2,step(.5,q4.y));lab.yz+=vec2(cos(ta),sin(ta))*.010*va;
 float pk2=1.;if(al<.5){int k=int(q4.z*4.);vec2 s=k==0?vec2(.015,.09):k==1?vec2(-.02,-.07):k==2?vec2(-.05,.045):vec2(.02,-.055);lab.yz=mix(lab.yz,s*(.45+.6*lum),min(.62,.5*va));pk2=.66;}
 if(uG.z>.5)lab.x-=.035;col=fromLab(clamp(lab,vec3(.04,-.4,-.4),vec3(.995,.4,.4)));
 float press=uPar.z*(.72+.56*pn2.g)*(.8+.4*r1.x)*mix(.82,1.,cov)*pk2+.16*(1.-lum);press*=mix(.86,1.,depth);if(grp)press*=.84+.32*rp.y;
 press=min(press,.96)*smoothstep(.02,.5,cov);
 vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1));float cv=((grp?rp.y:r2.y)-.5)*uPar.w*len*.12;
 vec2 l=vec2(mix(-LB-2.,LA+2.,corner.x),mix(-1.,1.,corner.y)*(hw*1.25+abs(cv)+1.5));
 vec2 q=pos+dir*l.x+nrm*l.y;vL=l;vQ=q;
 vCol=vec4(col,uG.y);vA=vec4(LB,LA,hw,cv);vB=vec4(r1.xy*7.,press,uG.z);vC=vec4(pos,oA,oB);vUc=c0;
 gl_Position=vec4(q/L*2.-1.,0.,1.);}`;

  const STROKE_FS = HEAD + `
flat in vec4 vCol,vA,vB,vC,vUc;in vec2 vL,vQ;out vec4 o;uniform sampler2D uU,uD,uT,uN;uniform vec4 uF;uniform vec2 uE;
void main(){float LB=vA.x,LA=vA.y,hw=vA.z;float len=LA+LB,t=clamp((vL.x+LB)/len,0.,1.);
 float tc=t-.5;float y=vL.y-vA.w*(4.*tc*tc-.33);vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);
 vec4 nz=texture(uN,vL*vec2(1./240.,1./110.)+vB.xy);float st=texture(uN,vec2(vL.x/1100.+vB.x*3.,y/hw*.085+vB.y*5.)).b;
 float pr;if(vB.w>.5){ // pencil: pressed core, quick start, flicked end
  float d=abs(y)/hw+(nz.r-.5)*uF.x;float core=1.-smoothstep(.15,1.05,d);float ls=min(len*.2,7.),le=min(len*.5,30.);
  float en=smoothstep(-.1*ls,ls,vL.x+LB+(nz.g-.5)*ls)*smoothstep(-.1*le,le,LA-vL.x+(nz.g-.5)*le);pr=vB.z*(.25+.75*core)*(1.-smoothstep(uF.y,1.1,d))*(.4+.6*en)*en*(.8+.4*nz.a);}
 else{float tip=min(t,1.-t);float prof=hw*(.72+.28*smoothstep(0.,.2,tip));float d=abs(y)/prof+(nz.r-.5)*uF.x;float side=1.-smoothstep(uF.y,1.06,d);
  float e=min(vL.x+LB,LA-vL.x);float el=min(len*.36,10.+hw);float en=smoothstep(-.15*el,el,e+(nz.g-.5)*el*1.3);pr=vB.z*(.55+.7*st)*en*side*(.84+.32*nz.a);}
 float g=mix(tt.r,tt.g,uF.z);float th=1.-pr;float a=smoothstep(th-uF.w,th+uF.w,g)*smoothstep(0.,.16,pr);
 vec2 tc2=vC.xy-vQ;float dl=length(tc2)+1e-4;float rq=fract(vB.y*3.7);float al=.6+3.*rq*rq+max(0.,max(vL.x-(LA-vC.z),-vL.x-(LB-vC.w)));vec2 sp=vQ+tc2/dl*min(dl,al)+(nz.ga-.5)*3.+(vec2(tt.r,tt.g)-.5)*2.6;
 vec4 u=textureLod(uU,sp/L,0.)*textureLod(uD,sp/L,0.).a;a*=vCol.a*(1.-smoothstep(uE.x,uE.y,length(u-vUc)));
 if(a<.004)discard;
 vec3 c=vCol.rgb*(1.+(nz.a-.5)*.08+(g-.5)*.05);o=vec4(clamp(c,0.,1.)*a,a);}`;

  // kneaded eraser
  const LIFT_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uLt,uD,uT,uN;uniform vec3 uPaper;uniform vec4 uB;
void main(){vec2 q=vUv*L;vec4 nz=texture(uN,q/150.+uB.zw);vec4 l=texture(uLt,(q+(nz.rg-.5)*7.)/L);if(l.a<.01)discard;float ord=l.r/l.a*255.;
 float id=texelFetch(uD,clamp(ivec2(q/L*vec2(textureSize(uD,0))),ivec2(0),textureSize(uD,0)-1),0).r*255.;if(id>ord+.6)discard;
 vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);float st=texture(uN,vec2(q.x*.8-q.y*.5,q.y*.8+q.x*.5)/vec2(900.,110.)+uB.wz).b;
 float pr=clamp(l.a*(.6+.75*st)+(nz.b-.5)*.2*l.a,0.,1.);float th=1.-pr;float a=mix(pr*.92,smoothstep(th-.45,th+.45,tt.r),.45);
 vec3 c=uPaper*(1.+(tt.r-.5)*.05+(tt.b-.5)*.05);o=vec4(c*a,a);}`;

  const LINE_VS = HEAD + `layout(location=0)in vec4 a0;layout(location=1)in vec4 a1;layout(location=2)in vec4 aCol;layout(location=3)in float aOrd;
out vec4 v0;out vec3 v1;flat out vec4 vCol;flat out float vOrd;out vec2 vQ;
void main(){v0=vec4(a0.zw,a1.xy);v1=vec3(a1.zw,0.);vCol=aCol;vOrd=aOrd;vQ=a0.xy;gl_Position=vec4(a0.xy/L*2.-1.,0.,1.);}`;
  const LINE_FS = HEAD + `in vec4 v0;in vec3 v1;flat in vec4 vCol;flat in float vOrd;in vec2 vQ;out vec4 o;uniform sampler2D uD,uLt,uT,uN;uniform vec2 uHas;
float idAt(vec2 q){return texelFetch(uD,clamp(ivec2(q/L*vec2(textureSize(uD,0))),ivec2(0),textureSize(uD,0)-1),0).r*255.;}
void main(){float v=v0.x,s=v0.y,hw=v0.z,pr=v0.w,seed=v1.x;int med=int(v1.y+.5);vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);vec4 nz=texture(uN,vec2(s/190.,v*.06)+vec2(seed*.37,seed*.71));
 vec3 c=vCol.rgb;float a=0.;
 if(med==3){vec2 p=vec2(v,s);float d=length(p)+(nz.r-.5)*.5;float k=pr*(1.-smoothstep(.45,1.,d));a=k*smoothstep(.25,.75,tt.r+.25);}
 else{float ed=abs(v)*(hw+1.)/max(hw,.6);float d=ed+(nz.g-.5)*.34;
  if(med==0){float core=1.-smoothstep(.2,1.08,d);float p=pow(pr,.72)*(.30+.70*core)*(.82+.36*nz.r)*(1.-smoothstep(.8,1.12,d));float th=1.-p;float g=mix(tt.g,tt.r,.25);a=mix(smoothstep(th-.42,th+.42,g),core*p,.36)*smoothstep(0.,.2,p);}
  else if(med==1){float st=texture(uN,vec2(s/700.+seed,v*.11+seed*.3)).b;float p=pr*(.6+.55*st)*(1.-smoothstep(.7,1.06,d));float th=1.-p;a=smoothstep(th-.17,th+.17,tt.r)*smoothstep(0.,.14,p);}
  else{float st=texture(uN,vec2(s/420.+seed,v*.16+seed*.3)).b;float core=1.-smoothstep(.12,1.02,d);float p=pr*(.42+.62*st)*(1.-smoothstep(.55,1.12,d));p=p*.8+core*pr*.2+(nz.b-.5)*.16*pr;float th=1.-p;a=mix(smoothstep(th-.27,th+.27,mix(tt.r,tt.g,.4)),core*pr,.2)*smoothstep(0.,.18,p);c*=1.+(st-.5)*.3;c=mix(c,c*vec3(.82,.62,.66),smoothstep(.55,.95,d)*.5);}
 }
 a*=vCol.a;
 if(uHas.x>.5){float k=0.;vec2 e=vec2(1.3,-1.3);k+=step(vOrd+.6,idAt(vQ+e.xx));k+=step(vOrd+.6,idAt(vQ+e.yy));k+=step(vOrd+.6,idAt(vQ+e.xy));k+=step(vOrd+.6,idAt(vQ+e.yx));a*=1.-.88*k*.25;}
 if(uHas.y>.5){vec4 l=texture(uLt,vQ/L);if(l.a>.02&&l.r/l.a*255.>vOrd+.6)a*=1.-.85*l.a;}
 if(a<.004)discard;c*=1.+(tt.g-.5)*.08;o=vec4(clamp(c,0.,1.)*a,a);}`;

  const COMP_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uX,uT,uN;uniform vec4 uC;uniform float uS;
void main(){vec4 c=texture(uX,vUv);vec2 q=gl_FragCoord.xy/uS;vec2 ed=min(q,L-q);float e=min(ed.x,ed.y);vec4 nz=texture(uN,q/310.);
 float pr=clamp((e+7.+(nz.r-.5)*20.)/24.,0.,1.)*1.35;float th=1.-pr;float b=smoothstep(th-.36,th+.36,texelFetch(uT,ivec2(gl_FragCoord.xy),0).r);float al=uC.x;if(al<.995){float t2=1.-al*1.04;float g=texelFetch(uT,ivec2(gl_FragCoord.xy),0).r;al=mix(al,smoothstep(t2-.3,t2+.3,g)*smoothstep(0.,.1,al),.65);}o=c*al*mix(.45,1.,b);}`;
  const GHOST_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uX,uOld;uniform vec4 uC;
void main(){vec4 c=vec4(0.);for(int k=-3;k<=3;k++)c+=textureLod(uX,vUv+uC.xy*float(k)/L,1.);c/=7.;o=c*.9+texture(uOld,vUv)*uC.z*(1.-c.a);}`;
  const GHOSTC_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uX,uT;uniform float uA;void main(){vec4 t=texelFetch(uT,ivec2(gl_FragCoord.xy),0);o=texture(uX,vUv)*uA*(.45+1.1*t.r);}`;

  const AIR_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uT,uN,uG;uniform vec4 uAir0;uniform vec4 uAir1;uniform float uS;
void main(){vec2 q=gl_FragCoord.xy/uS;vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);vec4 nz=texture(uN,q/820.+.21),n2=texture(uN,q/vec2(330.,140.)+.6);vec2 w=(nz.rg-.5)*46.+(n2.ga-.5)*12.;vec2 p=q+w;float t=0.;
 if(uAir1.x>1.5){t=length(p-uAir0.xy)/max(uAir0.z,1.);}else if(uAir1.x>.5){vec2 d=uAir0.zw-uAir0.xy;t=dot(p-uAir0.xy,d)/max(dot(d,d),1.);}
 vec4 g=texture(uG,vec2(clamp(t,0.,1.)*(255./256.)+.5/256.,.5));float a=g.a*uAir1.y*(.9+.2*(nz.b-.5)+.28*(n2.r-.5)+.3*(tt.r-.5));a=clamp(a,0.,1.);
 vec3 c=g.rgb;if(uAir1.z<.5)o=vec4(mix(vec3(1.),c,a),1.);else if(uAir1.z<1.5)o=vec4(c*a,1.);else o=vec4(c*a,a);}`;

  const FINAL_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uX;uniform vec4 uR;uniform vec2 uPx;
vec4 bic(vec2 uv){vec2 p=uv*uPx-.5,f=fract(p);p=floor(p);vec2 f2=f*f,f3=f2*f;vec2 w0=-.5*f3+f2-.5*f,w1=1.5*f3-2.5*f2+1.,w2=-1.5*f3+2.*f2+.5*f,w3=.5*f3-.5*f2;vec2 w12=w1+w2;vec2 t0=(p-.5)/uPx,t3=(p+2.5)/uPx,t12=(p+.5+w2/w12)/uPx;
 return texture(uX,vec2(t12.x,t0.y))*w12.x*w0.y+texture(uX,vec2(t0.x,t12.y))*w0.x*w12.y+texture(uX,t12)*w12.x*w12.y+texture(uX,vec2(t3.x,t12.y))*w3.x*w12.y+texture(uX,vec2(t12.x,t3.y))*w12.x*w3.y;}
void main(){vec2 uv=vec2(vUv.x,1.-vUv.y);vec2 q=uv-.5;float a=uR.z;q=vec2(q.x-a*q.y*.5625,q.y+a*q.x/.5625);uv=q*(1.-.0012)+.5+uR.xy/L;vec4 c=bic(uv);float w=w=1.;o=vec4(clamp(c.rgb*uR.w,0.,1.),1.);}`.replace('float w=w=1.;', '');

  // painting one finished sheet over another
  const OV_VS = HEAD + `uniform sampler2D uNx,uN;uniform ivec4 uTile;uniform ivec3 uKey;uniform uint uPrime;uniform vec2 uCell;uniform vec4 uPar,uK;uniform vec2 uDir;
flat out vec4 vCol,vA,vB;out vec2 vL,vQ;
void main(){gl_Position=vec4(2.,2.,2.,1.);vCol=vA=vB=vec4(0.);vL=vQ=vec2(0.);int per=uKey.x;int N=uTile.z*uTile.w*per;int idx=int((uint(gl_InstanceID)*uPrime)%uint(N));int ci=idx/per;ivec2 cell=ivec2(ci%uTile.z,ci/uTile.z);
 vec3 r0=h3(uvec3(uint(cell.x),uint(cell.y),uint(idx%per+uKey.y*16+5000)));vec3 r1=h3(uvec3(uint(cell.x),uint(cell.y),uint(idx%per+uKey.y*16+7000)));vec2 pos=(vec2(cell)+r0.xy)*uCell;
 vec4 pn=textureLod(uN,pos/1500.+float(uKey.y)*.2,0.),pn2=textureLod(uN,pos/620.,0.);
 float pr=dot((pos-L*.5)/L.x,uDir)/(abs(uDir.x)+abs(uDir.y)*.5625+1e-4)+.5;pr=mix(pr,pn.g,uK.w);
 float b=uK.y+uK.z*pr+(pn2.r-.5)*.16+(r0.z-.5)*.13;float g=clamp((uK.x-b)/.085,0.,1.);if(g<=0.)return;
 float th=atan(uDir.y,uDir.x)+.55+(pn.r-.5)*2.6+(r1.x-.5)*.5;vec2 dir=vec2(cos(th),sin(th));if(r1.y<.5)dir=-dir;vec2 nrm=vec2(-dir.y,dir.x);
 float len=uPar.x*(.6+.8*r1.z),hw=.5*uPar.y*(.7+.6*r0.z);float cv=(r1.y-.5)*len*.16;vec2 corner=vec2(float(gl_VertexID&1),float(gl_VertexID>>1));
 vec2 l=vec2(mix(-2.,len*g+2.,corner.x),mix(-1.,1.,corner.y)*(hw*1.2+abs(cv)+2.));vec2 q=pos+dir*(l.x-len*.5)+nrm*l.y;vL=l;vQ=q;
 vCol=textureLod(uNx,clamp(pos/L,0.,1.),uPar.z);vA=vec4(len*g,hw,cv,g);vB=vec4(r1.xy*7.,.78+.22*r0.z,uPar.w);gl_Position=vec4(q/L*2.-1.,0.,1.);}`;
  const OV_FS = HEAD + `flat in vec4 vCol,vA,vB;in vec2 vL,vQ;out vec4 o;uniform sampler2D uNx,uN,uT;
void main(){float len=vA.x,hw=vA.y,t=clamp(vL.x/len,0.,1.);float tc=t-.5;float y=vL.y-vA.z*(4.*tc*tc-.33);vec4 nz=texture(uN,vL*vec2(1./300.,1./140.)+vB.xy);float st=texture(uN,vec2(vL.x/1300.+vB.x*3.,y/hw*.1+vB.y*5.)).b;
 float d=abs(y)/hw+(nz.r-.5)*.5;float e=min(vL.x,len-vL.x);float el=min(len*.3,16.+hw*.6);float en=smoothstep(-.1*el,el,e+(nz.g-.5)*el*1.3);
 float pr=vB.z*(.7+.6*st)*en*(1.-smoothstep(.75,1.05,d));vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);float th=1.-pr;float a=smoothstep(th-.17,th+.17,tt.r)*smoothstep(0.,.14,pr);if(a<.004)discard;
 vec3 c=mix(vCol.rgb*(1.+(nz.a-.5)*.1),texture(uNx,vQ/L).rgb,vB.w);o=vec4(c*a,a);}`;
  // last grains fill in behind the strokes
  const OVFILL_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uNx,uN,uT;uniform vec4 uK;uniform vec2 uDir;
void main(){vec2 q=vUv*L;float pr=dot((q-L*.5)/L.x,uDir)/(abs(uDir.x)+abs(uDir.y)*.5625+1e-4)+.5;vec4 n=texture(uN,q/1500.),m=texture(uN,q/300.);pr=mix(pr,n.g,uK.w);float b=uK.y+uK.z*pr+(m.r-.5)*.1;float p=clamp((uK.x-b)/.12,0.,1.);float g=texelFetch(uT,ivec2(gl_FragCoord.xy),0).r;float th=1.-p*1.1;float a=smoothstep(th-.1,th+.1,g)*step(.001,p);o=vec4(texture(uNx,vUv).rgb*a,a);}`;
  // wiping the old drawing back to paper with a cloth: long arm strokes that drag the pigment with them and leave a little behind
  const WIPE_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uA,uPp,uN,uT;uniform vec4 uK;
void main(){vec2 q=vUv*L;vec4 n=textureLod(uN,q/900.,0.),m=textureLod(uN,q/210.,0.);vec4 tt=texelFetch(uT,ivec2(gl_FragCoord.xy),0);
 float left=1.;vec2 bd=vec2(1.,0.);float drag=0.,tr=0.;
 for(int k=0;k<12;k++){vec3 r=h3(uvec3(uint(k),77u,uint(uK.y)));vec3 s=h3(uvec3(uint(k),78u,uint(uK.y)));float t0=float(k)*.066+(r.x-.5)*.03;float g=clamp((uK.x-t0)/.22,0.,1.);if(g<=0.)continue;g=g*g*(3.-2.*g);
  bool fl=(k&1)==1;float y0=-70.+float(k)*1230./11.+(r.y-.5)*80.;vec2 a=vec2(fl?2200.:-280.,y0),b=vec2(fl?-280.:2200.,y0+(s.x-.5)*330.+40.);vec2 d=b-a;float ln=length(d);d/=ln;vec2 nn=vec2(-d.y,d.x);vec2 p=q-a;float x=dot(p,d),y=dot(p,nn)-sin(x/ln*3.14)*(s.y-.5)*190.;
  float hw=182.+46.*r.z;vec4 sv=textureLod(uN,vec2(x/2600.+r.x*5.,y/330.+r.y*3.),0.);float st=sv.b;
  float ed=1.-smoothstep(hw*.42,hw,abs(y)+(n.r-.5)*50.+(st-.5)*46.);float fr=smoothstep(ln*g+40.,ln*g-170.,x+(sv.r-.5)*150.+(st-.5)*120.);
  float w=ed*fr*(.80+.24*st);left*=1.-clamp(w,0.,.96);if(w>.12){bd=mix(bd,d,smoothstep(.12,.5,w));drag=max(drag,w);tr+=w*(st-.5);}}
 vec3 A0=textureLod(uA,vUv,0.).rgb,A=vec3(0.);float W=0.;for(int k=0;k<9;k++){float f=float(k)/8.;float w=1.-.7*f;A+=textureLod(uA,clamp((q-bd*f*drag*230.)/L,0.,1.),0.).rgb*w;W+=w;}A/=W;
 vec3 pp=textureLod(uPp,vUv,0.).rgb;vec3 sm=mix(A0,A,smoothstep(.02,.4,drag));
 float res=(.21+.16*(n.b-.5)+.34*clamp(tr,-.5,.6)+.12*(m.r-.5))*smoothstep(.1,.7,drag)*(1.35-.75*tt.r);float keep=clamp(left*left*(3.-2.*left)+max(0.,res)*(1.-left),0.,1.)*uK.z;
 float k2=clamp(keep+(tt.r-.5)*.5*keep*(1.-keep),0.,1.);o=vec4(mix(pp,sm,k2),1.);}`;
  const COPY_FS = HEAD + `in vec2 vUv;out vec4 o;uniform sampler2D uX;void main(){o=texture(uX,vUv);}`;

  /* --------------------------------------------------------------- helpers */
  const colCache = new Map();
  function rgba(c) {
    if (Array.isArray(c)) return [c[0] / 255, c[1] / 255, c[2] / 255, c[3] == null ? 1 : c[3]];
    let v = colCache.get(c); if (v) return v; v = [.5, .5, .5, 1];
    if (typeof c === 'string') {
      if (c[0] === '#') { let s = c.slice(1); if (s.length < 5) s = s.replace(/./g, '$&$&'); v = [0, 2, 4].map(i => parseInt(s.slice(i, i + 2), 16) / 255); v.push(s.length >= 8 ? parseInt(s.slice(6, 8), 16) / 255 : 1); if (v.some(x => x !== x)) v = [.5, .5, .5, 1]; }
      else { const m = c.match(/-?[\d.]+%?/g); if (m && m.length >= 3 && /^rgb/.test(c)) { v = m.slice(0, 3).map(x => parseFloat(x) / 255); v.push(m[3] ? (/%/.test(m[3]) ? parseFloat(m[3]) / 100 : parseFloat(m[3])) : 1); } else { const d = document.createElement('canvas').getContext('2d'); d.fillStyle = c; const s = String(d.fillStyle); v = s[0] === '#' ? rgba(s) : v; } }
    }
    if (colCache.size > 4000) colCache.clear(); colCache.set(c, v); return v;
  }
  const css = (c, a) => { const v = rgba(c); const al = v[3] * (a == null ? 1 : a); return `rgba(${Math.round(v[0] * 255)},${Math.round(v[1] * 255)},${Math.round(v[2] * 255)},${al})`; };
  function hash(a, b, c) { let h = (Math.imul((a * 1000) | 0, 374761393) ^ Math.imul((b * 1000) | 0, 668265263) ^ Math.imul((c * 1000) | 0, 2147483647 ^ 0x5bd1e995)) | 0; h = Math.imul(h ^ (h >>> 13), 1274126177); h ^= h >>> 16; return ((h >>> 0) % 1000003) / 1000003; }
  const strHash = s => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };
  const NT = new Float32Array(4096); for (let i = 0; i < 4096; i++) NT[i] = hash(i, 3.7, 11.1) * 2 - 1;
  const sn = (x, s) => { const i = Math.floor(x), f = x - i, u = f * f * (3 - 2 * f), k = (i + s * 97) & 4095; return NT[k] + (NT[(k + 1) & 4095] - NT[k]) * u; };
  const mul = (m, n) => [m[0] * n[0] + m[2] * n[1], m[1] * n[0] + m[3] * n[1], m[0] * n[2] + m[2] * n[3], m[1] * n[2] + m[3] * n[3], m[0] * n[4] + m[2] * n[5] + m[4], m[1] * n[4] + m[3] * n[5] + m[5]];

  // path recorder: stands in for a CanvasRenderingContext2D inside shape functions; stores sheet-space commands
  class Rec {
    constructor() { this.c = []; this.m = [1, 0, 0, 1, 0, 0]; this.st = []; this.x = 0; this.y = 0; this.sx = 0; this.sy = 0; this.open = false; this.canvas = { width: LW, height: LH }; }
    start(m) { this.c = []; this.m = m; this.st.length = 0; this.open = false; return this; }
    _p(x, y) { const m = this.m; this.c.push(m[0] * x + m[2] * y + m[4], m[1] * x + m[3] * y + m[5]); }
    beginPath() { this.c = []; this.open = false; }
    moveTo(x, y) { this.c.push(0); this._p(x, y); this.x = this.sx = x; this.y = this.sy = y; this.open = true; }
    lineTo(x, y) { if (!this.open) return this.moveTo(x, y); this.c.push(1); this._p(x, y); this.x = x; this.y = y; }
    quadraticCurveTo(a, b, x, y) { if (!this.open) this.moveTo(a, b); this.c.push(2); this._p(a, b); this._p(x, y); this.x = x; this.y = y; }
    bezierCurveTo(a, b, c, d, x, y) { if (!this.open) this.moveTo(a, b); this.c.push(3); this._p(a, b); this._p(c, d); this._p(x, y); this.x = x; this.y = y; }
    closePath() { if (this.open) { this.c.push(4); this.x = this.sx; this.y = this.sy; } }
    rect(x, y, w, h) { this.moveTo(x, y); this.lineTo(x + w, y); this.lineTo(x + w, y + h); this.lineTo(x, y + h); this.closePath(); }
    roundRect(x, y, w, h, r) { r = Array.isArray(r) ? r[0] : (r || 0); r = Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2); this.moveTo(x + r, y); this.lineTo(x + w - r, y); this.quadraticCurveTo(x + w, y, x + w, y + r); this.lineTo(x + w, y + h - r); this.quadraticCurveTo(x + w, y + h, x + w - r, y + h); this.lineTo(x + r, y + h); this.quadraticCurveTo(x, y + h, x, y + h - r); this.lineTo(x, y + r); this.quadraticCurveTo(x, y, x + r, y); this.closePath(); }
    arc(x, y, r, a, b, ccw) { this.ellipse(x, y, r, r, 0, a, b, ccw); }
    ellipse(x, y, rx, ry, ro, a, b, ccw) {
      let d = b - a; if (ccw) { if (d > 0) d = d % TAU - TAU; if (d < -TAU || (b - a) <= -TAU) d = -TAU; } else { if (d < 0) d = (d % TAU + TAU) % TAU; if (d > TAU) d = TAU; }
      const n = Math.max(1, Math.ceil(Math.abs(d) / (Math.PI / 2) - 1e-6)), st = d / n, k = 4 / 3 * Math.tan(st / 4), c = Math.cos(ro), s = Math.sin(ro), P = (u, v) => [x + u * rx * c - v * ry * s, y + u * rx * s + v * ry * c];
      let t = a, q = P(Math.cos(t), Math.sin(t)); if (this.open) this.lineTo(q[0], q[1]); else this.moveTo(q[0], q[1]);
      for (let i = 0; i < n; i++) { const c0 = Math.cos(t), s0 = Math.sin(t), t1 = t + st, c1 = Math.cos(t1), s1 = Math.sin(t1), A = P(c0 - k * s0, s0 + k * c0), D = P(c1 + k * s1, s1 - k * c1), E = P(c1, s1); this.bezierCurveTo(A[0], A[1], D[0], D[1], E[0], E[1]); t = t1; }
    }
    arcTo(a, b, x, y) { this.quadraticCurveTo(a, b, x, y); }
    save() { this.st.push(this.m); } restore() { if (this.st.length) this.m = this.st.pop(); }
    translate(x, y) { this.m = mul(this.m, [1, 0, 0, 1, x, y]); } rotate(a) { const c = Math.cos(a), s = Math.sin(a); this.m = mul(this.m, [c, s, -s, c, 0, 0]); } scale(x, y) { this.m = mul(this.m, [x, 0, 0, y == null ? x : y, 0, 0]); } transform(a, b, c, d, e, f) { this.m = mul(this.m, [a, b, c, d, e, f]); }
    setTransform() { } resetTransform() { } fill() { } stroke() { } clip() { } fillRect() { } clearRect() { } strokeRect() { } setLineDash() { }
  }
  const OPN = [2, 2, 4, 6, 0];
  function build(c) { const p = new Path2D(); for (let i = 0; i < c.length;) { const o = c[i++]; if (o === 0) p.moveTo(c[i], c[i + 1]); else if (o === 1) p.lineTo(c[i], c[i + 1]); else if (o === 2) p.quadraticCurveTo(c[i], c[i + 1], c[i + 2], c[i + 3]); else if (o === 3) p.bezierCurveTo(c[i], c[i + 1], c[i + 2], c[i + 3], c[i + 4], c[i + 5]); else p.closePath(); i += OPN[o]; } return p; }
  function bbox(c) { let x0 = 1e9, y0 = 1e9, x1 = -1e9, y1 = -1e9; for (let i = 0; i < c.length;) { const o = c[i++]; for (let k = 0; k < OPN[o]; k += 2) { const x = c[i + k], y = c[i + k + 1]; if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; } i += OPN[o]; } return [x0, y0, x1, y1]; }
  function flatten(c) { const out = []; let cur = null, x = 0, y = 0; for (let i = 0; i < c.length;) { const o = c[i++]; if (o === 0) { cur = [c[i], c[i + 1]]; out.push(cur); x = c[i]; y = c[i + 1]; } else if (o === 1) { cur.push(c[i], c[i + 1]); x = c[i]; y = c[i + 1]; } else if (o === 2) { for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t; cur.push(u * u * x + 2 * u * t * c[i] + t * t * c[i + 2], u * u * y + 2 * u * t * c[i + 1] + t * t * c[i + 3]); } x = c[i + 2]; y = c[i + 3]; } else if (o === 3) { for (let k = 1; k <= 8; k++) { const t = k / 8, u = 1 - t, a = u * u * u, b = 3 * u * u * t, d = 3 * u * t * t, e = t * t * t; cur.push(a * x + b * c[i] + d * c[i + 2] + e * c[i + 4], a * y + b * c[i + 1] + d * c[i + 3] + e * c[i + 5]); } x = c[i + 4]; y = c[i + 5]; } i += OPN[o]; } return out.filter(q => q.length >= 6); }
  function inside(polys, x, y) { let w = 0; for (const q of polys) { const n = q.length; let ax = q[n - 2], ay = q[n - 1]; for (let i = 0; i < n; i += 2) { const bx = q[i], by = q[i + 1]; if (ay <= y) { if (by > y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) > 0) w++; } else if (by <= y && (bx - ax) * (y - ay) - (x - ax) * (by - ay) < 0) w--; ax = bx; ay = by; } } return w !== 0; }

  /* ---------------------------------------------------------------- engine */
  B.engine.create = function (canvas, opts = {}) {
    const gl = canvas.getContext('webgl2', { alpha: false, antialias: false, depth: false, stencil: false, preserveDrawingBuffer: !!opts.capture, powerPreference: 'high-performance' });
    if (!gl) return B.stub(canvas);
    let UW = 1280, UH = 720; const pickU = () => { UW = opts.under || (res >= .8 ? 1280 : 960); UH = Math.round(UW * 9 / 16); };
    let res = opts.res || 1, W = Math.round(LW * res), H = Math.round(LH * res), lost = false;
    let R = null; // gl resources
    const mk = (w, h) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    pickU(); const uCv = mk(UW, UH), dCv = mk(UW, UH), lCv = mk(UW, UH), oCv = mk(UW * .75 | 0, UH * .75 | 0), uc = uCv.getContext('2d'), dc = dCv.getContext('2d'), lc = lCv.getContext('2d'), oc = oCv.getContext('2d');
    const hasFilter = typeof uc.filter === 'string' && !opts.noFilter; let tc = null;
    const gCv = mk(256, 1), gc = gCv.getContext('2d', { willReadFrequently: true });

    function shader(t, s) { const x = gl.createShader(t); gl.shaderSource(x, s); gl.compileShader(x); if (!gl.getShaderParameter(x, gl.COMPILE_STATUS) && !gl.isContextLost()) { const log = gl.getShaderInfoLog(x); console.error('shader', log, s.split('\n').slice(0, 4).join('|').slice(0, 200)); } return x; }
    function program(vs, fs) { const p = gl.createProgram(); gl.attachShader(p, shader(gl.VERTEX_SHADER, vs)); gl.attachShader(p, shader(gl.FRAGMENT_SHADER, fs)); gl.linkProgram(p); if (!gl.getProgramParameter(p, gl.LINK_STATUS) && !gl.isContextLost()) console.error('link', gl.getProgramInfoLog(p)); const u = {}; const n = gl.getProgramParameter(p, gl.ACTIVE_UNIFORMS) || 0; for (let i = 0; i < n; i++) { const a = gl.getActiveUniform(p, i); u[a.name] = gl.getUniformLocation(p, a.name); } p.u = u; return p; }
    function tex(w, h, o = {}) { const t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t); const mips = o.mips ? Math.floor(Math.log2(Math.max(w, h))) + 1 : 1; gl.texStorage2D(gl.TEXTURE_2D, mips, gl.RGBA8, w, h); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, o.mips ? gl.LINEAR_MIPMAP_LINEAR : o.near ? gl.NEAREST : gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, o.near ? gl.NEAREST : gl.LINEAR); const wr = o.rep ? gl.REPEAT : gl.CLAMP_TO_EDGE; gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, wr); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, wr); t.w = w; t.h = h; t.mips = mips; return t; }
    function target(ts) { const f = gl.createFramebuffer(); gl.bindFramebuffer(gl.FRAMEBUFFER, f); ts = [].concat(ts); ts.forEach((t, i) => gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0 + i, gl.TEXTURE_2D, t, 0)); if (ts.length > 1) gl.drawBuffers(ts.map((_, i) => gl.COLOR_ATTACHMENT0 + i)); f.w = ts[0].w; f.h = ts[0].h; return f; }
    const bindT = (u, t, n) => { gl.activeTexture(gl.TEXTURE0 + n); gl.bindTexture(gl.TEXTURE_2D, t); if (u) gl.uniform1i(u, n); };
    function to(f) { gl.bindFramebuffer(gl.FRAMEBUFFER, f); if (f) gl.viewport(0, 0, f.w, f.h); else gl.viewport(0, 0, W, H); }
    const tri = () => { gl.bindVertexArray(R.vao0); gl.drawArrays(gl.TRIANGLES, 0, 3); };

    function init() {
      canvas.width = W; canvas.height = H; R = { pool: [] }; gl.disable(gl.DITHER);
      R.vao0 = gl.createVertexArray();
      const P = R.P = {}; P.noise = program(QUAD_VS, NOISE_FS); P.tooth = program(QUAD_VS, TOOTH_FS); P.paper = program(QUAD_VS, PAPER_FS); P.state = program(QUAD_VS, STATE_FS); P.base = program(QUAD_VS, BASE_FS); P.stroke = program(STROKE_VS, STROKE_FS); P.lift = program(QUAD_VS, LIFT_FS); P.line = program(LINE_VS, LINE_FS); P.comp = program(QUAD_VS, COMP_FS); P.ghost = program(QUAD_VS, GHOST_FS); P.ghostc = program(QUAD_VS, GHOSTC_FS); P.air = program(QUAD_VS, AIR_FS); P.fin = program(QUAD_VS, FINAL_FS); P.ov = program(OV_VS, OV_FS); P.ovfill = program(QUAD_VS, OVFILL_FS); P.wipe = program(QUAD_VS, WIPE_FS); P.copy = program(QUAD_VS, COPY_FS);
      gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.pixelStorei(gl.UNPACK_COLORSPACE_CONVERSION_WEBGL, gl.NONE); gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, false); gl.disable(gl.BLEND);
      R.noise = tex(512, 512, { mips: true, rep: true }); const nf = target(R.noise); to(nf); gl.useProgram(P.noise); tri(); gl.bindTexture(gl.TEXTURE_2D, R.noise); gl.generateMipmap(gl.TEXTURE_2D); gl.deleteFramebuffer(nf);
      sizeInit();
      R.sty = tex(256, 1, { near: true }); R.grad = tex(256, 1); R.zero = tex(4, 4); { const f = target(R.zero); to(f); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT); gl.deleteFramebuffer(f); }
      R.vb = gl.createBuffer(); R.ib = gl.createBuffer(); R.vcap = 0; R.icap = 0; R.vaoL = gl.createVertexArray(); gl.bindVertexArray(R.vaoL); gl.bindBuffer(gl.ARRAY_BUFFER, R.vb); gl.enableVertexAttribArray(0); gl.vertexAttribPointer(0, 4, gl.FLOAT, false, 40, 0); gl.enableVertexAttribArray(1); gl.vertexAttribPointer(1, 4, gl.FLOAT, false, 40, 16); gl.enableVertexAttribArray(2); gl.vertexAttribPointer(2, 4, gl.UNSIGNED_BYTE, true, 40, 32); gl.enableVertexAttribArray(3); gl.vertexAttribPointer(3, 1, gl.FLOAT, false, 40, 36); gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, R.ib); gl.bindVertexArray(null);
      caches.clear(); lastN = -1e9; warm();
    }
    function sizeInit() {
      const P = R.P;
      R.tooth = tex(W, H, { near: true }); const tf = target(R.tooth); to(tf); gl.useProgram(P.tooth); gl.uniform1f(P.tooth.u.uS, W / LW); tri(); gl.deleteFramebuffer(tf);
      R.sheet = []; for (let i = 0; i < 2; i++) { const t = tex(W, H, { mips: true }); R.sheet.push({ t, f: target(t) }); } const pt = tex(W, H); R.paperT = { t: pt, f: target(pt), key: '' }; const ct = tex(W, H); R.mixT = { t: ct, f: target(ct) };
    }
    // compile and link everything on the GPU now, so the first transition does not stutter
    function warm() { const t = tex(4, 4), f = target(t); for (const k in R.P) { const pr = R.P[k]; gl.useProgram(pr); for (let i = 0; i < 6; i++) bindT(null, R.zero, i); let i = 0; for (const u of ['uX', 'uU', 'uD', 'uT', 'uN', 'uST', 'uSty', 'uLt', 'uPrev', 'uOld', 'uNx', 'uA', 'uPp', 'uG']) if (pr.u[u] && !(u === 'uG' && k === 'stroke') && !(u === 'uA' && k === 'ghostc')) gl.uniform1i(pr.u[u], i++ % 6); if (k === 'state') { const t2 = tex(4, 4), f2 = target([t, t2]); to(f2); tri(); gl.deleteFramebuffer(f2); gl.deleteTexture(t2); continue; } to(f); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); if (k === 'line') { gl.bindVertexArray(R.vao0); gl.drawArrays(gl.TRIANGLES, 0, 3); } else if (k === 'stroke' || k === 'ov') { gl.uniform4i(pr.u.uTile, 0, 0, 1, 1); if (pr.u.uKey) gl.uniform3i(pr.u.uKey, 1, 0, 0); gl.uniform1ui(pr.u.uPrime, 7919); gl.bindVertexArray(R.vao0); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, 1); } else tri(); gl.disable(gl.BLEND); } gl.deleteFramebuffer(f); gl.deleteTexture(t); }
    function resize(r) {
      res = Math.max(.35, Math.min(1.5, r)); W = Math.round(LW * res); H = Math.round(LH * res); E.W = W; E.H = H; canvas.width = W; canvas.height = H;
      for (const [k] of [...caches]) free(k, caches.get(k)); while (R.pool.length) drop(R.pool.shift());
      gl.deleteTexture(R.tooth); for (const x of [...R.sheet, R.paperT, R.mixT]) { gl.deleteTexture(x.t); gl.deleteFramebuffer(x.f); }
      pickU(); for (const c of [uCv, dCv, lCv]) { c.width = UW; c.height = UH; } oCv.width = UW * .75 | 0; oCv.height = UH * .75 | 0; tc = null; sizeInit(); lastN = -1e9; sKey = '';
    }

    /* ---- layer caches ---- */
    const caches = new Map(); let lastN = -1e9, drawCount = 0;
    function newBufs() {
      const b = R.pool.pop(); if (b) { b.lt && (b.hasLift = false); return b; }
      const o = {}; o.t = tex(W, H, { mips: false }); o.f = target(o.t); o.u = tex(UW, UH, { mips: true }); o.d = tex(UW, UH); o.d.near = true; o.st = [0, 1].map(() => { const a = tex(SW, SH, { near: true }), b2 = tex(SW, SH, { near: true }); return { a, b: b2, f: target([a, b2]) }; }); o.cur = 0; o.g = null; o.lt = null; return o;
    }
    function ghostBufs(o) { if (!o.g) { o.g = [0, 1].map(() => { const t = tex(W >> 1, H >> 1); return { t, f: target(t) }; }); o.gi = 0; } }
    function free(k, C) { R.pool.push(C.b); caches.delete(k); if (R.pool.length > 5) drop(R.pool.shift()); }
    function drop(o) { [o.t, o.u, o.d, o.lt, o.ot, ...(o.st || []).flatMap(s => [s.a, s.b]), ...(o.g || []).map(g => g.t)].forEach(t => t && gl.deleteTexture(t)); [o.f, ...(o.st || []).map(s => s.f), ...(o.g || []).map(g => g.f)].forEach(f => f && gl.deleteFramebuffer(f)); }

    /* ---- painter state ---- */
    let cur = null, sceneId = '', names = null, n = 0, paperCol = [.93, .89, .81], paperSet = false, M = [1, 0, 0, 1, 0, 0], mst = [], clipStack = [], sheet = null, held = 0;
    const rec = new Rec();
    function shapeCmds(sh, sharp) {
      if (typeof sh === 'function') { rec.start(M); sh(rec); return rec.c; }
      const c = [], k = sh.length, m = M; if (k < 2) return c; const X = i => { const q = sh[(i + k) % k]; return m[0] * q[0] + m[2] * q[1] + m[4]; }, Y = i => { const q = sh[(i + k) % k]; return m[1] * q[0] + m[3] * q[1] + m[5]; };
      c.push(0, X(0), Y(0)); if (sharp || k < 3) { for (let i = 1; i < k; i++) c.push(1, X(i), Y(i)); c.push(4); return c; }
      let x0 = X(-1), y0 = Y(-1), x1 = X(0), y1 = Y(0), x2 = X(1), y2 = Y(1);
      for (let i = 0; i < k; i++) { const x3 = X(i + 2), y3 = Y(i + 2); c.push(3, x1 + (x2 - x0) / 6, y1 + (y2 - y0) / 6, x2 - (x3 - x1) / 6, y2 - (y3 - y1) / 6, x2, y2); x0 = x1; y0 = y1; x1 = x2; y1 = y2; x2 = x3; y2 = y3; } c.push(4); return c;
    }
    const mscale = () => Math.sqrt(Math.abs(M[0] * M[3] - M[1] * M[2])) || 1e-3;
    const tp = (x, y) => [M[0] * x + M[2] * y + M[4], M[1] * x + M[3] * y + M[5]];
    const FB = new Float32Array(1), IB = new Int32Array(FB.buffer);
    const hn = (h, v) => { FB[0] = Math.round(v * 16) / 16; return Math.imul(h ^ IB[0], 16777619) ^ (h >>> 15); };
    function hcmds(h, c) { for (let i = 0; i < c.length; i++) h = hn(h, c[i]); return h; }
    function hcol(h, c) { if (typeof c === 'string') return Math.imul(h ^ strHash(c), 16777619); if (!c) return h; const g = c.lin || c.rad; if (g) for (const v of g) h = hn(h, v); if (c.stops) for (const s of c.stops) { h = hn(h, s[0]); h = Math.imul(h ^ strHash(String(s[1])), 16777619); } return h; }
    function tcol(c) { // gradients into sheet space
      if (typeof c === 'string' || !c) return c || '#888888'; if (Array.isArray(c)) return css(c); if (c.lin) { const a = tp(c.lin[0], c.lin[1]), b = tp(c.lin[2], c.lin[3]); return { lin: [a[0], a[1], b[0], b[1]], stops: c.stops }; } if (c.rad) { const a = tp(c.rad[0], c.rad[1]); return { rad: [a[0], a[1], c.rad[2] * mscale()], stops: c.stops }; } return c.color || '#888888';
    }
    const safeStop = s => Math.max(0, Math.min(1, s));
    function fillOf(x, c) { if (typeof c === 'string') return c; let g; if (c.lin) { const l = c.lin; g = x.createLinearGradient(l[0], l[1], l[2] + (l[2] === l[0] && l[3] === l[1] ? .01 : 0), l[3]); } else g = x.createRadialGradient(c.rad[0], c.rad[1], 0, c.rad[0], c.rad[1], Math.max(.01, c.rad[2])); for (const s of c.stops || []) try { g.addColorStop(safeStop(s[0]), s[1]); } catch (e) { } return g; }
    const avgCol = c => typeof c === 'string' ? c : (c.stops && c.stops.length ? c.stops[Math.floor(c.stops.length / 2)][1] : '#888');

    function newLayer(name, o = {}) {
      endLayer(); let nm = name, k = 1; while (names.has(nm)) nm = name + '#' + (++k); names.add(nm);
      const still = !!o.still, every = Math.max(1, Math.round(o.every || (still ? 5 : 2)));
      const ph = strHash(nm) % every; held = Math.floor((n + ph) / every) * every;
      const key = sceneId + '|' + nm, C = caches.get(key);
      cur = { name: nm, key, every, still, ph, depth: o.depth == null ? .6 : Math.max(0, Math.min(1, o.depth)), alpha: o.alpha == null ? 1 : o.alpha, ops: [], lines: [], ord: 0, kind: 0, seq: 0, pars: new Map(), hides: 0, sty: new Uint8Array(1024), hM: 17, hL: 19, hE: 23, tiles: new Uint8Array(TX * TY), box: [1e9, 1e9, -1e9, -1e9], nMass: 0, nShade: 0, nLift: 0, skip: !!(still && C && C.valid && C.still) };
      p.layerName = nm;
    }
    const need = () => { if (!cur) newLayer('base', {}); return cur; };
    function mark(L, b, pad) { const x0 = b[0] - pad, y0 = b[1] - pad, x1 = b[2] + pad, y1 = b[3] + pad; if (!(x1 > 0 && y1 > 0 && x0 < LW && y0 < LH)) return; const B0 = L.box; if (x0 < B0[0]) B0[0] = x0; if (y0 < B0[1]) B0[1] = y0; if (x1 > B0[2]) B0[2] = x1; if (y1 > B0[3]) B0[3] = y1; const a = Math.max(0, Math.floor(x0 / 240)), c = Math.min(TX - 1, Math.floor(x1 / 240)), d = Math.max(0, Math.floor(y0 / 270)), e = Math.min(TY - 1, Math.floor(y1 / 270)); for (let y = d; y <= e; y++) for (let x = a; x <= c; x++) L.tiles[y * TX + x] = 1; }
    const clipNow = () => clipStack.length ? clipStack[clipStack.length - 1] : null;

    const p = {
      W: LW, H: LH, n: 0, t: 0, isStub: false, layerName: '',
      rnd: (a = 0, b = 0, d = 0) => hash(a + held * 17.13, b, d), fix: (a = 0, b = 0, d = 0) => hash(a, b, d),
      paper(c) { const v = rgba(c); paperCol = [v[0], v[1], v[2]]; paperSet = true; },
      layer(name, o) { newLayer(String(name), o || {}); },
      mass(sh, st = {}) {
        const L = need(); if (L.skip) return; const c = shapeCmds(sh, st.sharp); if (c.length < 6) return; const b = bbox(c); if (!(b[0] <= b[2])) return;
        const al = st.alpha == null ? 1 : st.alpha; if (al <= .003) return; const soft = (st.soft || 0) * mscale();
        const size = st.size == null ? 1 : st.size, len = st.len == null ? 1 : st.len, dens = st.dens == null ? 1 : st.dens, vary = st.vary == null ? .35 : st.vary;
        const par = size.toFixed(2) + ',' + len.toFixed(2) + ',' + dens.toFixed(2) + ',' + vary.toFixed(2); let id = L.pars.get(par);
        if (!id) { if (L.ord < 254) { id = ++L.ord; L.pars.set(par, id); const q = id * 4; L.sty[q] = Math.min(255, size * 63.75); L.sty[q + 1] = Math.min(255, len * 63.75); L.sty[q + 2] = Math.min(255, dens * 127.5); L.sty[q + 3] = Math.min(255, vary * 255); } else id = 254; }
        const opq = al >= .6; if (opq) { if (L.kind >= 2) { L.seq++; L.hides = 1; } L.kind = 1; } L.nMass++; mark(L, b, 10 + soft * 2);
        let dir = null, mode = 0; if (st.around) { dir = tp(st.around[0], st.around[1]); mode = 1; } else if (st.to) { dir = tp(st.to[0], st.to[1]); mode = 2; } else { const d = st.dir == null ? .62 : st.dir; const vx = M[0] * Math.cos(d) + M[2] * Math.sin(d), vy = M[1] * Math.cos(d) + M[3] * Math.sin(d); dir = [Math.atan2(vy, vx), 0]; }
        const col = tcol(st.color); const clip = clipNow();
        let h = hcmds(L.hM, c); h = hcol(h, col); h = hn(hn(hn(hn(h, al), soft), dir[0]), dir[1] + mode * 7); h = hn(hn(hn(hn(h, size), len), dens), vary); if (clip) h = hn(h, clip.id); L.hM = h;
        L.ops.push({ k: 1, c, col, al, soft, dir, mode, id, seq: opq ? L.seq : -1, clip });
      },
      shade(sh, st = {}) {
        const L = need(); if (L.skip) return; const c = shapeCmds(sh, st.sharp); if (c.length < 6) return; const al = st.alpha == null ? .4 : st.alpha; if (al <= .003) return; const b = bbox(c); const soft = (st.soft || 0) * mscale(); L.nShade++; if (!L.nMass) mark(L, b, 10 + soft * 2);
        const col = tcol(st.color), clip = clipNow(), mo = st.mode || 'multiply'; let h = hcmds(L.hM, c); h = hcol(h, col); h = hn(hn(h, al), soft + (mo === 'multiply' ? 0 : mo === 'screen' ? 900 : 1800)); if (clip) h = hn(h, clip.id); L.hM = h;
        L.ops.push({ k: 2, c, col, al, soft, mo, clip });
      },
      lift(sh, st = {}) {
        const L = need(); if (L.skip) return; const c = shapeCmds(sh, st.sharp); if (c.length < 6) return; if (L.kind === 2) L.seq++; L.kind = 3; L.nLift++; const soft = (st.soft || 0) * mscale(), am = st.amount == null ? .5 : st.amount, clip = clipNow(); mark(L, bbox(c), 10 + soft * 2);
        let h = hcmds(L.hM, c); h = hn(hn(h, am), soft); if (clip) h = hn(h, clip.id); L.hM = h; L.ops.push({ k: 3, c, al: Math.min(1, am), soft, seq: L.seq, clip });
      },
      line(pts, st = {}) {
        const L = need(); if (L.skip || !pts || pts.length < 2) return; const k = pts.length, q = new Float32Array(k * 3), m = M; let h = L.hL;
        for (let i = 0; i < k; i++) { const a = pts[i], x = m[0] * a[0] + m[2] * a[1] + m[4], y = m[1] * a[0] + m[3] * a[1] + m[5]; if (!(x === x && y === y)) return; q[i * 3] = x; q[i * 3 + 1] = y; q[i * 3 + 2] = a[2] == null ? 1 : a[2]; h = hn(hn(h, x), y); }
        const w = (st.w == null ? 3 : st.w) * mscale(), al = st.alpha == null ? 1 : st.alpha, pr = st.press == null ? .8 : st.press; if (al <= .003) return; h = hn(hn(hn(h, w), al), pr); h = hcol(hn(h, L.seq), st.color || ''); h = hn(hn(hn(h, st.passes || 1), st.wobble == null ? 1 : st.wobble), (st.medium ? st.medium.length : 0) + (st.taper ? st.taper[0] * 31 + st.taper[1] * 7 : 0)); h = hn(hn(h, q[2]), q[k * 3 - 1]); { const cl = clipNow(); if (cl) h = hn(h, cl.id & 65535); }
        if (L.kind === 3) L.seq++; L.kind = 2; L.hL = h; const tpr = st.taper || [.15, .3];
        L.lines.push({ q, w, al, pr, t0: tpr[0], t1: tpr[1], wob: st.wobble == null ? 1 : st.wobble, ps: Math.max(1, Math.min(4, Math.round(st.passes || 1))), med: st.medium === 'crayon' ? 1 : st.medium === 'redline' ? 2 : 0, col: rgba(st.color || '#3a332d'), ord: 0, seq0: L.seq, clip: clipNow(), sd: L.lines.length, lw: 1 });
      },
      hatch(sh, st = {}) {
        const L = need(); if (L.skip) return; const c = shapeCmds(sh, st.sharp); if (c.length < 6) return; if (L.kind === 3) L.seq++; L.kind = 2; let h = hcmds(L.hL, c); const gap = Math.max(2.5, (st.gap || 12) * mscale()); h = hcol(hn(hn(h, gap), st.dir || 0), st.color || ''); L.hL = hn(hn(hn(hn(h, st.w || 2), st.press == null ? .5 : st.press), (st.len || 0) + (st.curve || 0) * 100), L.seq);
        const vx = M[0] * Math.cos(st.dir || 0) + M[2] * Math.sin(st.dir || 0), vy = M[1] * Math.cos(st.dir || 0) + M[3] * Math.sin(st.dir || 0);
        L.lines.push({ hatch: flatten(c), gap, dir: Math.atan2(vy, vx), len: (st.len || 0) * mscale(), curve: st.curve || 0, w: (st.w == null ? 2 : st.w) * mscale(), al: st.alpha == null ? 1 : st.alpha, pr: st.press == null ? .5 : st.press, med: st.medium === 'crayon' ? 1 : st.medium === 'redline' ? 2 : 0, col: rgba(st.color || '#3a332d'), ord: 0, seq0: L.seq, clip: clipNow(), sd: L.lines.length });
      },
      dust(x, y, r, st = {}) { const L = need(); if (L.skip) return; if (L.kind === 3) L.seq++; L.kind = 2; const a = tp(x, y), s = mscale(); L.hL = hn(hn(hn(hn(L.hL, a[0]), a[1]), r), (st.n || 20) + (st.seed || 0) * 100); L.lines.push({ dust: [a[0], a[1], r * s], nn: Math.min(4000, st.n || 20), seed: st.seed || 0, size: (st.size || 1) * Math.max(.6, Math.min(1.6, s)), al: st.alpha == null ? 1 : st.alpha, col: rgba(st.color || '#ffffff'), ord: 0, seq0: L.seq, clip: clipNow(), sd: L.lines.length }); },
      push() { mst.push(M); }, pop() { if (mst.length) M = mst.pop(); }, translate(x, y) { M = mul(M, [1, 0, 0, 1, x, y]); }, rotate(a) { const c = Math.cos(a), s = Math.sin(a); M = mul(M, [c, s, -s, c, 0, 0]); }, scale(x, y) { M = mul(M, [x, 0, 0, y == null ? x : y, 0, 0]); },
      clip(sh, fn) { const c = shapeCmds(sh, false).slice(); const par = clipNow(); const C = { c, par, id: hcmds(par ? par.id : 5, c) | 0, polys: null, path: null }; clipStack.push(C); try { fn(); } finally { clipStack.pop(); } },
      air(st = {}) {
        endLayer(); const a = st.alpha == null ? .3 : st.alpha; if (a <= .002) return; const mode = st.mode === 'screen' ? 1 : st.mode === 'over' ? 2 : 0; const P = R.P.air; startSheet(); to(sheet.f); gl.useProgram(P);
        gc.clearRect(0, 0, 256, 1); gc.globalCompositeOperation = 'copy'; let ty = 0, g0 = [0, 0, 0, 0]; if ((st.lin || st.rad) && st.stops) { const g = gc.createLinearGradient(0, 0, 256, 0); for (const s of st.stops) try { g.addColorStop(safeStop(s[0]), s[1]); } catch (e) { } gc.fillStyle = g; if (st.lin) { const A = tp(st.lin[0], st.lin[1]), D = tp(st.lin[2], st.lin[3]); ty = 1; g0 = [A[0], A[1], D[0], D[1]]; } else { const A = tp(st.rad[0], st.rad[1]); ty = 2; g0 = [A[0], A[1], st.rad[2] * mscale(), 0]; } } else gc.fillStyle = st.color || '#888'; gc.fillRect(0, 0, 256, 1);
        gl.activeTexture(gl.TEXTURE2); gl.bindTexture(gl.TEXTURE_2D, R.grad); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, gc.getImageData(0, 0, 256, 1)); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.uniform1i(P.u.uG, 2);
        bindT(P.u.uT, R.tooth, 0); bindT(P.u.uN, R.noise, 1); gl.uniform4f(P.u.uAir0, ...g0); gl.uniform4f(P.u.uAir1, ty, a, mode, 0); gl.uniform1f(P.u.uS, W / LW); gl.enable(gl.BLEND); if (mode === 0) gl.blendFunc(gl.DST_COLOR, gl.ZERO); else if (mode === 1) gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); tri(); gl.disable(gl.BLEND);
      }
    };

    /* ---- raster of the underpainting ---- */
    let uClip = null;
    function applyClip(x, C) { if (C) { const list = []; for (let k = C; k; k = k.par) list.push(k); for (const k of list.reverse()) x.clip(k.path || (k.path = build(k.c))); } }
    function rasterMasses(L, C) {
      const S = UW / LW; let cl = null; const occ = L.hides && (L.lines.length || L.nLift), q8 = L.seq > 250 ? 250 / L.seq : 1; C.q8 = q8; C.occ = occ ? 1 : 0; const ctxs = [uc, dc]; if (L.nLift) ctxs.push(lc); if (occ) ctxs.push(oc);
      for (const x of ctxs) { x.setTransform(1, 0, 0, 1, 0, 0); x.globalAlpha = 1; x.globalCompositeOperation = 'source-over'; if (hasFilter) x.filter = 'none'; x.clearRect(0, 0, UW, UH); const sx = x.canvas.width / LW; x.setTransform(sx, 0, 0, sx, 0, 0); x.save(); }
      const glaze = !L.nMass && L.nShade;
      for (const o of L.ops) {
        if (o.clip !== cl) { cl = o.clip; for (const x of ctxs) { x.restore(); x.save(); applyClip(x, cl); } }
        const path = build(o.c);
        if (o.k === 1) { soft(uc, path, o, 'source-over'); dirFill(o, path); if (occ && o.seq >= 0) { const v = Math.floor(o.seq * q8); oc.fillStyle = `rgb(${v},${v},${v})`; oc.fill(path); } }
        else if (o.k === 2) { soft(uc, path, o, glaze ? 'source-over' : o.mo === 'screen' ? 'screen' : o.mo === 'over' ? 'source-atop' : 'multiply'); if (glaze) { dc.globalCompositeOperation = 'source-over'; dc.fillStyle = 'rgb(255,128,0)'; dc.fill(path); if (o.soft) { dc.strokeStyle = 'rgb(255,128,0)'; dc.lineWidth = o.soft * 4; dc.stroke(path); } } }
        else if (o.k === 3) { const v = Math.floor(o.seq * q8); soft(lc, path, { col: `rgb(${v},${v},${v})`, al: o.al, soft: o.soft }, 'source-over'); }
      }
      for (const x of ctxs) x.restore();
      const b = C.b; gl.bindTexture(gl.TEXTURE_2D, b.u); gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, b.u); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, uCv); gl.generateMipmap(gl.TEXTURE_2D); gl.bindTexture(gl.TEXTURE_2D, b.d); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, dCv);
      if (L.nLift) { if (!b.lt) b.lt = tex(UW, UH); gl.bindTexture(gl.TEXTURE_2D, b.lt); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, lCv); }
      if (occ) { if (!b.ot) b.ot = tex(oCv.width, oCv.height, { near: true }); gl.bindTexture(gl.TEXTURE_2D, b.ot); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, gl.RGBA, gl.UNSIGNED_BYTE, oCv); }
    }
    function soft(x, path, o, op) {
      x.globalCompositeOperation = op; x.globalAlpha = Math.min(1, o.al); const f = fillOf(x, o.col);
      if (o.soft > .4) {
        const sd = o.soft * UW / LW; if (hasFilter) { x.filter = `blur(${sd.toFixed(2)}px)`; x.fillStyle = f; x.fill(path); x.filter = 'none'; }
        else { const off = 4000, sh = (y, colr) => { y.save(); y.shadowColor = colr; y.shadowBlur = sd * 2; y.shadowOffsetX = off; y.translate(-off * LW / UW, 0); y.fillStyle = '#000'; y.fill(path); y.restore(); };
          if (typeof o.col === 'string') sh(x, css(o.col, 1)); else { if (!tc) { tc = mk(UW, UH).getContext('2d'); } tc.setTransform(1, 0, 0, 1, 0, 0); tc.globalCompositeOperation = 'source-over'; tc.clearRect(0, 0, UW, UH); tc.setTransform(UW / LW, 0, 0, UW / LW, 0, 0); sh(tc, '#000'); tc.globalCompositeOperation = 'source-in'; tc.fillStyle = fillOf(tc, o.col); tc.fillRect(0, 0, LW, LH); x.save(); x.setTransform(1, 0, 0, 1, 0, 0); x.drawImage(tc.canvas, 0, 0); x.restore(); } }
      } else { x.fillStyle = f; x.fill(path); }
    }
    const enc = (th, id) => `rgb(${Math.round(127.5 + 127.5 * Math.cos(2 * th))},${Math.round(127.5 + 127.5 * Math.sin(2 * th))},${id})`;
    function dirFill(o, path) {
      let f; if (o.mode && dc.createConicGradient) { const cx = o.dir[0], cy = o.dir[1], g = dc.createConicGradient(0, cx, cy), off = o.mode === 1 ? Math.PI / 2 : 0; for (let i = 0; i <= 32; i++) g.addColorStop(i / 32, enc(i / 32 * TAU + off, o.id)); f = g; } else f = enc(o.mode ? 0 : o.dir[0], o.id);
      dc.globalCompositeOperation = o.al > .3 ? 'source-over' : 'destination-over'; dc.fillStyle = f; dc.fill(path); if (o.soft > .4) { dc.globalCompositeOperation = 'destination-over'; dc.strokeStyle = f; dc.lineWidth = o.soft * 3.6; dc.lineJoin = 'round'; dc.stroke(path); }
    }

    /* ---- line geometry ---- */
    let V = new ArrayBuffer(40 * 60000), VF = new Float32Array(V), VU = new Uint32Array(V), I = new Uint32Array(180000), vn = 0, inn = 0;
    function ensure(nv, ni) { if ((vn + nv) * 40 > V.byteLength) { const N = new ArrayBuffer(Math.max(V.byteLength * 2, (vn + nv) * 40)); new Uint8Array(N).set(new Uint8Array(V)); V = N; VF = new Float32Array(V); VU = new Uint32Array(V); } if (inn + ni > I.length) { const N = new Uint32Array(Math.max(I.length * 2, inn + ni)); N.set(I); I = N; } }
    function vert(x, y, v, s, hw, pr, sd, med, col, ord) { const k = vn * 10; VF[k] = x; VF[k + 1] = y; VF[k + 2] = v; VF[k + 3] = s; VF[k + 4] = hw; VF[k + 5] = pr; VF[k + 6] = sd; VF[k + 7] = med; VU[k + 8] = col; VF[k + 9] = ord; vn++; }
    const pack = (c, a) => ((Math.min(255, Math.round(a * c[3] * 255)) << 24) | (Math.round(c[2] * 255) << 16) | (Math.round(c[1] * 255) << 8) | Math.round(c[0] * 255)) >>> 0;
    const px = new Float64Array(6000), py = new Float64Array(6000), pp = new Float64Array(6000);
    function clipPolys(C) { const out = []; for (let k = C; k; k = k.par) out.push(k.polys || (k.polys = flatten(k.c))); return out; }
    function ribbon(q, o, ep, pass) { // q: Float32Array x,y,p control points
      const k = q.length / 3; let m = 0; const MAXP = 5990; let calm = 1;
      if (k === 2) { const dx = q[3] - q[0], dy = q[4] - q[1], st = Math.max(2, Math.min(200, Math.ceil(Math.hypot(dx, dy) / 8))); for (let i = 0; i <= st; i++) { const t = i / st; px[m] = q[0] + dx * t; py[m] = q[1] + dy * t; pp[m] = q[2] + (q[5] - q[2]) * t; m++; } }
      else for (let i = 0; i < k - 1; i++) {
        const a = Math.max(0, i - 1) * 3, b = i * 3, c = (i + 1) * 3, d = Math.min(k - 1, i + 2) * 3, L0 = Math.hypot(q[c] - q[b], q[c + 1] - q[b + 1]), st = Math.max(1, Math.min(40, Math.ceil(L0 / 7)));
        for (let j = 0; j < st && m < MAXP; j++) { const t = j / st, t2 = t * t, t3 = t2 * t; for (let z = 0; z < 3; z++) { const A = q[a + z], Bq = q[b + z], Cq = q[c + z], Dq = q[d + z], v = .5 * (2 * Bq + (Cq - A) * t + (2 * A - 5 * Bq + 4 * Cq - Dq) * t2 + (3 * Bq - A - 3 * Cq + Dq) * t3); if (z === 0) px[m] = v; else if (z === 1) py[m] = v; else pp[m] = v < 0 ? 0 : v; } m++; }
        if (i === k - 2 && m < MAXP) { px[m] = q[c]; py[m] = q[c + 1]; pp[m] = q[c + 2]; m++; }
      }
      if (m < 2) return; let tot = 0; for (let i = 1; i < m; i++) tot += Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]); if (tot < .5) return; calm = Math.min(1, .3 + tot / 220);
      const sd = (o.sd * 131 + pass * 977 + ep * 7919) % 100003, amp = o.wob * Math.min(1, .35 + tot / 160), am1 = amp * (pass ? 2.1 : 1.15), am2 = amp * (pass ? .8 : .5), prK = pass ? .55 : 1, off = pass ? (hash(sd, 1, 5) < .5 ? -1 : 1) * (1.6 + 2.4 * hash(sd, 4, 5)) * amp * Math.min(1.4, .5 + o.w / 5) : 0;
      const u0 = pass ? hash(sd, 2, 5) * .12 : 0, u1 = pass ? 1 - hash(sd, 3, 5) * .14 : 1; const polys = o.clip ? clipPolys(o.clip) : null;
      ensure(m * 2, m * 6); const col = pack(o.col, o.al), base = vn; let s = 0; const extra = o.med === 0 ? 1 : 1.2;
      for (let i = 0; i < m; i++) {
        if (i) s += Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]); const a = Math.max(0, i - 1), b = Math.min(m - 1, i + 1); let tx = px[b] - px[a], ty = py[b] - py[a]; const l = Math.hypot(tx, ty) || 1e-4; tx /= l; ty /= l;
        const u = s / tot; const w = sn(s / 118 + sd * .37, sd & 63) * am1 + sn(s / 43 + sd * .71, (sd >> 3) & 63) * am2 + off, w2 = sn(s / 150 + 9.1, (sd >> 2) & 63) * am1 * .5; const x = px[i] - ty * w + tx * w2, y = py[i] + tx * w + ty * w2;
        let e = Math.min(1, u / (o.t0 || 1e-3), (1 - u) / (o.t1 || 1e-3)); e = Math.max(0, e); const br = sn(s / 74 + 3.3, (sd >> 1) & 63) * calm, br2 = sn(s / 23 + 5.1, (sd >> 4) & 63);
        let pr = o.pr * prK * (.42 + .58 * e) * (1 + .2 * br + .08 * br2) * Math.min(1.25, pp[i]); if (u < u0 || u > u1) pr = 0; if (polys) for (const g of polys) if (!inside(g, x, y)) { pr = 0; break; }
        const hw = Math.max(.7, o.w * .62 * (.46 + .54 * e) * (1 + .24 * br + .07 * br2) * (.35 + .65 * Math.min(1.6, pp[i]))) * extra, ex = (hw + 1) / hw, ow = hw + 1;
        vert(x - ty * ow, y + tx * ow, 1, s, hw, pr, sd % 997 * .0131, o.med, col, o.ord); vert(x + ty * ow, y - tx * ow, -1, s, hw, pr, sd % 997 * .0131, o.med, col, o.ord);
        if (i) { const z = base + (i - 1) * 2; I[inn++] = z; I[inn++] = z + 1; I[inn++] = z + 2; I[inn++] = z + 1; I[inn++] = z + 3; I[inn++] = z + 2; }
      }
    }
    const qT = new Float32Array(9);
    function hatchLines(o, ep) {
      const c = Math.cos(-o.dir), s = Math.sin(-o.dir), P = o.hatch.map(q => { const r = new Float32Array(q.length); for (let i = 0; i < q.length; i += 2) { r[i] = q[i] * c - q[i + 1] * s; r[i + 1] = q[i] * s + q[i + 1] * c; } return r; }); let y0 = 1e9, y1 = -1e9; for (const r of P) for (let i = 1; i < r.length; i += 2) { if (r[i] < y0) y0 = r[i]; if (r[i] > y1) y1 = r[i]; }
      let k = 0; const c2 = Math.cos(o.dir), s2 = Math.sin(o.dir);
      for (let y = y0 + o.gap * .4; y < y1 && k < 1500; y += o.gap, k++) {
        const yy = y + (hash(k, o.sd, 2 + ep) - .5) * o.gap * .42, xs = []; for (const r of P) { const nn = r.length; let ax = r[nn - 2], ay = r[nn - 1]; for (let i = 0; i < nn; i += 2) { const bx = r[i], by = r[i + 1]; if ((ay <= yy) !== (by <= yy)) xs.push(ax + (bx - ax) * (yy - ay) / (by - ay)); ax = bx; ay = by; } } xs.sort((a, b) => a - b);
        for (let i = 0; i + 1 < xs.length; i += 2) { let a = xs[i] - hash(k, i, 4 + ep) * 5, b = xs[i + 1] + (hash(k, i, 5 + ep) - .6) * 9; if (b - a < 3) continue; const pieces = o.len > 4 ? Math.max(1, Math.round((b - a) / o.len)) : 1; for (let z = 0; z < pieces; z++) { const xa = a + (b - a) * z / pieces + (z ? (hash(k, z, 6 + ep) - .3) * 10 : 0), xb = a + (b - a) * (z + 1) / pieces - (z < pieces - 1 ? hash(k, z, 7 + ep) * 10 : 0); const bow = o.curve * (Math.abs(o.curve) <= 1 ? (xb - xa) * .5 : 1), tl = (hash(k, z, 8 + ep) - .5) * o.gap * .5; const A = [xa, yy - tl], Bm = [(xa + xb) / 2, yy + bow], D = [xb, yy + tl]; [A, Bm, D].forEach((v, j) => { qT[j * 3] = v[0] * c2 - v[1] * s2; qT[j * 3 + 1] = v[0] * s2 + v[1] * c2; qT[j * 3 + 2] = .75 + .5 * hash(k, z, 9); }); ribbon(qT, { w: o.w, al: o.al, pr: o.pr, t0: .12, t1: .34, wob: .6, med: o.med, col: o.col, ord: o.ord, clip: o.clip, sd: o.sd * 13 + k * 7 + z }, ep, 0); } }
      }
    }
    function dustGrains(o) { const polys = o.clip ? clipPolys(o.clip) : null, [cx, cy, r] = o.dust; ensure(o.nn * 4, o.nn * 6); for (let i = 0; i < o.nn; i++) { const a = hash(i, o.seed, 1) * TAU, d = Math.sqrt(hash(i, o.seed, 2)) * r, x = cx + Math.cos(a) * d, y = cy + Math.sin(a) * d; if (polys && polys.some(g => !inside(g, x, y))) continue; const z = (1.1 + 2.1 * Math.pow(hash(i, o.seed, 3), 2.2)) * o.size, an = hash(i, o.seed, 4) * 3.14, as = .6 + hash(i, o.seed, 5) * .8, cx1 = Math.cos(an) * z * as, sy1 = Math.sin(an) * z * as, cx2 = -Math.sin(an) * z / as, sy2 = Math.cos(an) * z / as, pr = .55 + .45 * hash(i, o.seed, 6), col = pack(o.col, o.al), b = vn, sd = hash(i, 7, 7) * 9; vert(x - cx1 - cx2, y - sy1 - sy2, -1, -1, z, pr, sd, 3, col, o.ord); vert(x + cx1 - cx2, y + sy1 - sy2, 1, -1, z, pr, sd, 3, col, o.ord); vert(x - cx1 + cx2, y - sy1 + sy2, -1, 1, z, pr, sd, 3, col, o.ord); vert(x + cx1 + cx2, y + sy1 + sy2, 1, 1, z, pr, sd, 3, col, o.ord); I[inn++] = b; I[inn++] = b + 1; I[inn++] = b + 2; I[inn++] = b + 1; I[inn++] = b + 3; I[inn++] = b + 2; } }
    function drawLines(C, ep) {
      vn = 0; inn = 0; for (const o of C.lines) { o.ord = Math.floor(o.seq0 * (C.q8 || 1)); if (o.dust) dustGrains(o); else if (o.hatch) hatchLines(o, ep); else for (let k = o.ps - 1; k >= 0; k--) ribbon(o.q, o, ep, k); } if (!inn) return;
      gl.bindVertexArray(R.vaoL); gl.bindBuffer(gl.ARRAY_BUFFER, R.vb); if (vn * 40 > R.vcap) { R.vcap = Math.max(vn * 60, 1 << 20); gl.bufferData(gl.ARRAY_BUFFER, R.vcap, gl.DYNAMIC_DRAW); } else gl.bufferData(gl.ARRAY_BUFFER, R.vcap, gl.DYNAMIC_DRAW); gl.bufferSubData(gl.ARRAY_BUFFER, 0, new Uint8Array(V, 0, vn * 40)); if (inn * 4 > R.icap) R.icap = Math.max(inn * 6, 1 << 18); gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, R.icap, gl.DYNAMIC_DRAW); gl.bufferSubData(gl.ELEMENT_ARRAY_BUFFER, 0, I, 0, inn);
      const P = R.P.line; gl.useProgram(P); bindT(P.u.uD, C.occ ? C.b.ot : R.zero, 0); bindT(P.u.uLt, C.nLift ? C.b.lt : R.zero, 1); bindT(P.u.uT, R.tooth, 2); bindT(P.u.uN, R.noise, 3); gl.uniform2f(P.u.uHas, C.occ, C.nLift ? 1 : 0); gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.drawElements(gl.TRIANGLES, inn, gl.UNSIGNED_INT, 0); gl.disable(gl.BLEND); gl.bindVertexArray(null); stat.verts += vn;
    }

    /* ---- strokes ---- */
    // per tile nx, ny, per cell | par: length, width, pressure, curve | p2: probability, patch angle, stroke angle, overshoot | f: ragged, side, fine grain, tooth softness | g: hatch spacing (0 = scattered), opacity, pencil, angle offset
    const PASS = [
      { nx: 5, ny: 6, per: 3, par: [128, 34, .46, .9], p2: [.85, .5, .2, 14], f: [.5, .5, .0, .36], g: [0, .60, 0, 0] },
      { nx: 5, ny: 6, per: 8, par: [84, 11, .52, 1], p2: [.95, .5, .12, 17], f: [.5, .58, .1, .30], g: [10.5, .74, 0, 0] },
      { nx: 4, ny: 5, per: 13, par: [72, 4.2, .60, .9], p2: [1.02, .42, .07, 18], f: [.4, .6, .45, .26], g: [5.6, .86, 1, .06] },
      { nx: 4, ny: 4, per: 11, par: [58, 3.2, .52, .9], p2: [.62, .5, .07, 10], f: [.4, .6, .6, .26], g: [6.6, .8, 1, .62] },
      { nx: 9, ny: 10, per: 9, par: [27, 2.7, .62, .9], p2: [1.02, .5, .1, 4], f: [.4, .6, .8, .28], g: [3.3, .9, 1, .04] }];
    const PRIMES = [7919, 6101, 5003, 10007];
    function strokeLayer(L, C, n) {
      const b = C.b, u = R.P; to(b.f); gl.disable(gl.BLEND); gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
      const ep = C.epoch, hs = C.seed;
      if (C.nMass || C.glaze) {
        const bx = C.box, s = W / LW; gl.enable(gl.SCISSOR_TEST); gl.scissor(Math.max(0, Math.floor(bx[0] * s)), Math.max(0, Math.floor(bx[1] * s)), Math.max(1, Math.ceil((bx[2] - bx[0]) * s) + 2), Math.max(1, Math.ceil((bx[3] - bx[1]) * s) + 2));
        gl.useProgram(u.base); bindT(u.base.u.uU, b.u, 0); bindT(u.base.u.uD, b.d, 1); bindT(u.base.u.uT, R.tooth, 2); bindT(u.base.u.uN, R.noise, 3); gl.uniform2f(u.base.u.uPos0, 0, 0); gl.uniform2f(u.base.u.uPos1, LW, LH); gl.uniform4f(u.base.u.uPaper, paperCol[0], paperCol[1], paperCol[2], C.glaze ? 0 : .70 + .27 * Math.min(1, C.depth * 1.35)); const bl = Math.floor(ep / 5); gl.uniform4f(u.base.u.uB, 2.6 - 1.5 * C.depth, .60 + .16 * C.depth, hash(hs % 1000, bl, 3), hash(hs % 1000, bl, 4)); tri();
        gl.disable(gl.SCISSOR_TEST);
      }
      if (C.nMass) {
        gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.bindVertexArray(R.vao0);
        const P = u.stroke; gl.useProgram(P); bindT(P.u.uU, b.u, 0); bindT(P.u.uD, b.d, 1); bindT(P.u.uT, R.tooth, 2); bindT(P.u.uN, R.noise, 3); bindT(P.u.uST, b.st[b.cur].a, 4); gl.activeTexture(gl.TEXTURE5); gl.bindTexture(gl.TEXTURE_2D, R.sty); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, false); gl.texSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 256, 1, gl.RGBA, gl.UNSIGNED_BYTE, C.sty); gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true); gl.uniform1i(P.u.uSty, 5);
        gl.uniform4f(P.u.uTime, n, Math.max(6, C.every * 7), C.depth, 0);
        for (let k = 0; k < PASS.length; k++) {
          const A = PASS[k]; if (k === 4 && C.depth < .12) continue; gl.uniform4f(P.u.uG, ...A.g); gl.uniform2f(P.u.uCell, 240 / A.nx, 270 / A.ny); gl.uniform4f(P.u.uPar, ...A.par); gl.uniform4f(P.u.uPar2, ...A.p2); gl.uniform2f(P.u.uE, k ? .09 : .12, k ? .21 : .26); gl.uniform4f(P.u.uF, A.f[0], A.f[1], A.f[2], A.f[3] * (1.3 - .3 * C.depth)); gl.uniform3i(P.u.uKey, A.per, k, hs % 200);
          for (let y = 0; y < TY; y++) for (let x = 0; x < TX;) { if (!C.tiles[y * TX + x]) { x++; continue; } let e = x; while (e < TX && C.tiles[y * TX + e]) e++; const nc = (e - x) * A.nx, N = nc * A.ny * A.per; let pr = 0; while (N % PRIMES[pr] === 0) pr++; gl.uniform1ui(P.u.uPrime, PRIMES[pr]); gl.uniform4i(P.u.uTile, x * A.nx, y * A.ny, nc, A.ny); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, N); stat.strokes += N; x = e; }
        }
        gl.disable(gl.BLEND);
      }
      if (C.nLift) { const P = u.lift; gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P); bindT(P.u.uLt, b.lt, 0); bindT(P.u.uD, C.occ ? b.ot : R.zero, 1); bindT(P.u.uT, R.tooth, 2); bindT(P.u.uN, R.noise, 3); gl.uniform3f(P.u.uPaper, ...paperCol); const bl = Math.floor(ep / 4); gl.uniform4f(P.u.uB, 0, 0, hash(hs % 1000, bl, 5), hash(hs % 1000, bl, 6)); tri(); gl.disable(gl.BLEND); }
      if (C.lines.length) drawLines(C, ep);
      stat.restroke++;
    }

    function endLayer() {
      const L = cur; if (!L) return; cur = null; if (!L.ops.length && !L.lines.length && !L.skip) { const C0 = caches.get(L.key); if (C0) { C0.used = drawCount; } return; }
      startSheet(); let C = caches.get(L.key); if (!C) { C = { b: newBufs(), valid: false, seed: strHash(L.key) % 99991 }; caches.set(L.key, C); }
      C.used = drawCount; const ep = Math.floor((n + L.ph) / L.every), due = ep !== C.epoch || !C.valid;
      if (!L.skip) {
        const chM = !C.valid || L.hM !== C.hM, chL = !C.valid || L.hL !== C.hL; const pk = paperCol.join(); const chP = L.nLift && C.pk !== pk;
        if (chM || chL || due || chP || C.depth !== L.depth) {
          const fresh = !C.valid; if (!fresh && (chM || chL) && L.every <= 3 && !L.still && C.depth === L.depth) makeGhost(C); else if (fresh) C.ghost = 0;
          C.depth = L.depth; C.every = L.every; C.still = L.still; C.lines = L.lines; C.nLift = L.nLift; C.pk = pk; C.epoch = ep; C.hn = ep * L.every - L.ph;
          if (chM) { C.nMass = L.nMass; C.glaze = !L.nMass && L.nShade ? 1 : 0; C.sty = L.sty; C.tiles = L.tiles; C.box = L.box; C.glMode = C.glaze ? L.ops.find(o => o.k === 2).mo : ''; if (L.ops.length) { rasterMasses(L, C); stat.raster++; if (C.nMass) { changeState(C, fresh || !C.st0); C.st0 = 1; } } }
          C.hM = L.hM; C.hL = L.hL; C.valid = true; strokeLayer(L, C, n);
        } else if (C.ghost) C.ghost *= .5;
      } else if (due) { C.epoch = ep; strokeLayer(L, C, n); }
      compose(C, L.alpha);
    }
    function changeState(C, fresh) { const b = C.b, i = b.cur ^ 1, P = R.P.state; to(b.st[i].f); gl.disable(gl.BLEND); gl.useProgram(P); bindT(P.u.uU, b.u, 0); bindT(P.u.uPrev, b.st[b.cur].b, 1); bindT(P.u.uOld, b.st[b.cur].a, 2); gl.uniform1f(P.u.uDraw, Math.max(0, C.hn)); gl.uniform1f(P.u.uFresh, fresh ? 1 : 0); tri(); b.cur = i; }
    function makeGhost(C) { const b = C.b; ghostBufs(b); const i = b.gi ^ 1, P = R.P.ghost; to(b.g[i].f); gl.disable(gl.BLEND); gl.useProgram(P); bindT(P.u.uX, b.t, 0); bindT(P.u.uOld, C.ghost ? b.g[b.gi].t : R.zero, 1); const a = hash(n, C.seed % 97, 2) * 6.28; gl.uniform4f(P.u.uC, Math.cos(a) * 1.6, Math.sin(a) * 1.6, .5, 0); tri(); b.gi = i; C.ghost = 1; }
    function compose(C, alpha) {
      const b = C.b; to(sheet.f); gl.enable(gl.BLEND);
      if (C.ghost > .2) { const P = R.P.ghostc; gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); gl.useProgram(P); bindT(P.u.uX, b.g[b.gi].t, 0); bindT(P.u.uT, R.tooth, 1); gl.uniform1f(P.u.uA, .085 * C.ghost * alpha); tri(); }
      if (C.glaze && C.glMode === 'multiply') gl.blendFunc(gl.DST_COLOR, gl.ONE_MINUS_SRC_ALPHA); else if (C.glaze && C.glMode === 'screen') gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_COLOR); else gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA);
      const P = R.P.comp; gl.useProgram(P); bindT(P.u.uX, b.t, 0); bindT(P.u.uT, R.tooth, 1); bindT(P.u.uN, R.noise, 2); gl.uniform4f(P.u.uC, Math.max(0, Math.min(1, alpha)), 0, 0, 0); gl.uniform1f(P.u.uS, W / LW); tri(); gl.disable(gl.BLEND);
    }
    let started = false;
    function paperTex() { const k = paperCol.map(v => v.toFixed(3)).join(); if (R.paperT.key === k) return; R.paperT.key = k; const P = R.P.paper; to(R.paperT.f); gl.disable(gl.BLEND); gl.useProgram(P); bindT(P.u.uT, R.tooth, 0); gl.uniform3f(P.u.uPaper, ...paperCol); gl.uniform1f(P.u.uS, W / LW); tri(); }
    function startSheet() { if (started) return; started = true; paperTex(); to(sheet.f); gl.disable(gl.BLEND); gl.useProgram(R.P.copy); bindT(R.P.copy.u.uX, R.paperT.t, 0); tri(); }

    /* ---- sheets ---- */
    const stat = { strokes: 0, verts: 0, raster: 0, restroke: 0, ms: 0 };
    function renderSheet(fn, id, k) { sceneId = id; names = new Set(); sheet = R.sheet[k]; started = false; M = [1, 0, 0, 1, 0, 0]; mst.length = 0; clipStack.length = 0; cur = null; held = n; paperCol = [.937, .894, .812]; paperSet = false; p.n = n; p.t = n / 12; fn(p); endLayer(); startSheet(); }
    function begin(o) { n = Math.round(o.n || 0); if (n !== lastN && n !== lastN + 1) for (const C of caches.values()) { C.valid = false; C.ghost = 0; C.epoch = null; C.st0 = 0; } lastN = n; drawCount++; stat.strokes = stat.verts = stat.raster = stat.restroke = 0; }
    function sweep() { if (drawCount % 12) return; for (const [k, C] of [...caches]) if (drawCount - C.used > 14) free(k, C); }
    function present(t) { const P = R.P.fin; to(null); gl.disable(gl.BLEND); gl.useProgram(P); bindT(P.u.uX, t, 0); gl.activeTexture(gl.TEXTURE0); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); const j = (a, b) => hash(n, a, b) - .5; gl.uniform4f(P.u.uR, sn(n * .31, 5) * .34 + j(1, 1) * .42, sn(n * .27, 9) * .34 + j(2, 1) * .42, j(3, 1) * .00022, 1 + j(4, 1) * .011); gl.uniform2f(P.u.uPx, W, H); tri(); }

    let fence = null, ft = 0, lat = [], cool = 0; const auto = opts.auto == null ? !opts.capture : !!opts.auto;
    function watch(t0) { if (!auto || fence || lost) return; fence = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0); if (!fence) return; ft = t0; gl.flush(); const poll = () => { if (!fence || lost) { fence = null; return; } const s = gl.clientWaitSync(fence, 0, 0); if (s === gl.TIMEOUT_EXPIRED && performance.now() - ft < 1500) return setTimeout(poll, 3); gl.deleteSync(fence); fence = null; if (document.hidden) return; if (cool > 0) { cool--; return; } lat.push(performance.now() - ft); if (lat.length >= 14) { const m = lat.slice().sort((a, b) => a - b)[9]; lat = []; if (m > 68 && res > .52) { E.setRes(res > .8 ? .75 : res > .7 ? .6 : .5); cool = 10; } } }; setTimeout(poll, 3); }
    let sKey = '', sAt = -1e9; const same = (k, o, t) => { const key = k + '@' + Math.round(o.n || 0); if (!opts.capture && key === sKey && t - sAt < 900) return true; sKey = key; sAt = t; return false; };
    const E = {
      p, canvas, W, H, stat,
      draw(fn, o = {}) { if (lost) return; const t0 = performance.now(); if (same('d' + (o.id || ''), o, t0)) return; begin(o); renderSheet(fn, String(o.id == null ? '' : o.id), 0); present(R.sheet[0].t); sweep(); stat.ms = performance.now() - t0; watch(t0); },
      over(prev, next, k, o = {}) {
        if (lost) return; const t0 = performance.now(); if (same('o' + o.idA + o.idB + k.toFixed(4), o, t0)) return; begin(o); k = Math.max(0, Math.min(1, k)); const ia = String(o.idA == null ? 'A' : o.idA), ib = String(o.idB == null ? 'B' : o.idB);
        if (k <= 0) { renderSheet(prev, ia, 0); present(R.sheet[0].t); } else if (k >= 1) { renderSheet(next, ib, 0); present(R.sheet[0].t); }
        else { renderSheet(prev, ia, 0); renderSheet(next, ib, 1); const nx = R.sheet[1].t; gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, nx); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR); gl.generateMipmap(gl.TEXTURE_2D); if (o.kind === 'wash') wash(k, o); else paint(k, o.dir || 0, 0); present(R.mixT.t); }
        sweep(); stat.ms = performance.now() - t0; watch(t0);
      },
      finish() { if (lost) return; gl.finish(); const b = new Uint8Array(4); gl.readPixels(0, 0, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, b); },
      setRes(r) { if (!lost && Math.abs(r - res) > .01) resize(r); }, get res() { return res; }, reset() { for (const C of caches.values()) { C.valid = false; C.ghost = 0; C.epoch = null; } lastN = -1e9; }
    };
    function ovStrokes(k, dir, A, spread, scatter) { // A: [nx,ny,per,len,w,lod,mixTex,b0]
      const P = R.P.ov; gl.useProgram(P); gl.bindVertexArray(R.vao0); bindT(P.u.uNx, R.sheet[1].t, 0); bindT(P.u.uN, R.noise, 1); bindT(P.u.uT, R.tooth, 2); gl.uniform4i(P.u.uTile, 0, 0, A[0], A[1]); gl.uniform3i(P.u.uKey, A[2], A[8], 0); gl.uniform1ui(P.u.uPrime, 7919); gl.uniform2f(P.u.uCell, LW / A[0], LH / A[1]); gl.uniform4f(P.u.uPar, A[3], A[4], A[5], A[6]); gl.uniform4f(P.u.uK, k, A[7], spread, scatter); gl.uniform2f(P.u.uDir, Math.cos(dir), Math.sin(dir)); gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, A[0] * A[1] * A[2]);
    }
    function paint(k, dir, scatter, skipBase) {
      to(R.mixT.f); if (!skipBase) { gl.disable(gl.BLEND); gl.useProgram(R.P.copy); bindT(R.P.copy.u.uX, R.sheet[0].t, 0); tri(); }
      gl.enable(gl.BLEND); gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); const sp = .62;
      ovStrokes(k, dir, [30, 17, 4, 250, 64, 4.5, 0, -.03, 0], sp, scatter); ovStrokes(k, dir, [48, 27, 4, 150, 34, 3, .3, .07, 1], sp, scatter); ovStrokes(k, dir, [84, 47, 4, 86, 17, 1.5, .75, .14, 2], sp, scatter); ovStrokes(k, dir, [128, 72, 3, 54, 10, 0, 1, .2, 3], sp, scatter);
      const P = R.P.ovfill; gl.useProgram(P); bindT(P.u.uNx, R.sheet[1].t, 0); bindT(P.u.uN, R.noise, 1); bindT(P.u.uT, R.tooth, 2); gl.uniform4f(P.u.uK, k, .20, sp, scatter); gl.uniform2f(P.u.uDir, Math.cos(dir), Math.sin(dir)); tri(); gl.disable(gl.BLEND);
    }
    function wash(k, o) {
      const P = R.P.wipe; to(R.mixT.f); gl.disable(gl.BLEND); gl.useProgram(P); paperTex(); to(R.mixT.f); gl.useProgram(P); bindT(P.u.uA, R.sheet[0].t, 0); bindT(P.u.uPp, R.paperT.t, 1); bindT(P.u.uN, R.noise, 2); bindT(P.u.uT, R.tooth, 3); gl.uniform4f(P.u.uK, Math.min(1, k / .56), strHash(String(o.idB || '')) % 50, 1 - Math.max(0, (k - .5) / .5) * .7, 0); tri();
      const q = (k - .46) / .54; if (q > 0) paint(q, o.dir || .4, .6, true);
    }
    canvas.addEventListener('webglcontextlost', e => { e.preventDefault(); lost = true; }); canvas.addEventListener('webglcontextrestored', () => { lost = false; fence = null; sKey = ''; init(); });
    init(); return E;
  };
})();

/* ------------------------------------------------------------------ test sheets */
(function () {
  const B = window.BIDE, T = B.test;
  function head(p, x, y, s, o = {}) { // three-quarter head, face about 2*s tall, looking right
    p.push(); p.translate(x, y); p.scale(s, s);
    const skin = o.skin || '#dcae8c', dk = o.dk || '#b98563', hair = o.hair || '#5d4433';
    p.mass([[-.52, -.2], [-.6, -.62], [-.36, -1.02], [.1, -1.12], [.5, -.92], [.58, -.5], [.3, -.62], [-.1, -.55], [-.2, -.2], [-.3, .16], [-.5, .12]], { color: hair, around: [-.02, -.35], len: .9 });
    p.mass([[-.26, .42], [.12, .5], [.2, .98], [-.34, 1.02]], { color: dk, dir: 1.4, len: .6 });
    p.mass([[-.4, -.3], [-.2, -.72], [.2, -.8], [.5, -.55], [.56, -.2], [.6, .05], [.52, .12], [.52, .32], [.36, .62], [.12, .7], [-.16, .5], [-.34, .2]], { color: { lin: [-.3, -.6, .5, .6], stops: [[0, '#e7bd9a'], [.55, skin], [1, '#cf9877']] }, around: [0, -.1], len: .55, size: .62, vary: .4 });
    p.shade([[-.42, -.3], [-.1, -.1], [-.12, .3], [.16, .66], [-.14, .52], [-.36, .2]], { color: '#a4684c', alpha: .55, soft: .14 });
    p.shade([[.12, .02], [.34, .0], [.4, .2], [.2, .26]], { color: '#d9785f', alpha: .5, soft: .16, mode: 'multiply' });
    p.shade([[.16, -.3], [.4, -.32], [.42, -.18], [.18, -.16]], { color: '#a0674d', alpha: .5, soft: .06 });
    p.shade([[.34, .34], [.48, .3], [.5, .4], [.36, .44]], { color: '#b1544a', alpha: .7, soft: .03 });
    p.mass([[-.42, -.12], [-.3, -.2], [-.24, 0], [-.3, .16], [-.4, .1]], { color: '#cf9576', around: [-.34, 0], size: .5, len: .5 });
    p.lift([[.44, -.14], [.52, -.02], [.5, .06], [.44, 0]], { amount: .5, soft: .05 });
    p.lift([[.08, -.55], [.3, -.6], [.36, -.48], [.12, -.44]], { amount: .35, soft: .1 });
    const w = 3.2 / s;
    p.line([[-.2, -.72, .5], [.18, -.8, .8], [.48, -.58, 1], [.55, -.28, .7], [.5, -.2, .6], [.6, .04, 1], [.52, .12, 1], [.46, .14, .5]], { w, passes: 2 });
    p.line([[.52, .13, .6], [.51, .2, .8], [.54, .26, .7], [.49, .31, 1], [.52, .36, .6], [.46, .46, .7], [.36, .64, 1], [.12, .7, .9], [-.14, .52, .7], [-.32, .22, .5]], { w, passes: 2 });
    p.line([[.14, -.22], [.22, -.29, 1.2], [.34, -.26, 1], [.4, -.2, .5]], { w: w * 1.1 }); p.line([[.16, -.2], [.26, -.17, .5], [.36, -.19, .4]], { w: w * .7 });
    p.line([[.27, -.275], [.29, -.22, 1.4], [.275, -.19]], { w: w * 1.9, color: '#2c2723', taper: [.05, .1] });
    p.line([[.47, -.26], [.53, -.28], [.55, -.24]], { w: w }); p.line([[.08, -.4], [.22, -.47, 1.1], [.38, -.42, .7]], { w: w * 1.5, color: '#4a372b', passes: 2 }); p.line([[.46, -.4], [.54, -.44]], { w: w * 1.2, color: '#4a372b' });
    p.line([[.3, .31, .4], [.42, .335, 1], [.5, .325, .7]], { w: w * 1.1, color: '#6e3a30' }); p.line([[.38, .42], [.46, .41]], { w: w * .7, press: .5 });
    p.line([[-.4, -.14, .5], [-.3, -.2, 1], [-.24, -.04, .8], [-.31, .14, .9]], { w, color: '#6b4636' }); p.line([[-.35, -.06], [-.29, -.08], [-.3, .04]], { w: w * .7, color: '#6b4636' });
    for (let i = 0; i < 9; i++) { const a = p.fix(i, 1), b = p.fix(i, 2); p.line([[-.2 + a * .5, -1.05 + b * .1, .4], [-.3 + a * .3, -.75 + b * .1, 1], [-.46 + a * .14, -.35 + b * .25, .4]], { w: w * .9, color: '#3d2c22', press: .6 }); }
    p.line([[-.28, .34], [-.3, .7], [-.4, 1.0]], { w }); p.line([[.14, .7], [.18, .98]], { w });
    p.line([[-.9, -.2, .3], [.8, -.28, .5]], { w: w * .7, color: '#7d94b8', press: .45, taper: [.3, .3] }); p.line([[.14, -1.3, .4], [.26, -.3, .5], [.2, .9, .3]], { w: w * .7, color: '#b5573f', press: .35 });
    p.pop();
  }
  T.mediumCard = function (p, k) {
    p.paper('#efe4cf');
    p.layer('sky', { every: 5, depth: 0, still: true });
    p.mass([[-20, -20], [1180, -20], [1180, 470], [-20, 470]], { sharp: true, color: { lin: [0, 0, 0, 460], stops: [[0, '#6f93b4'], [.45, '#a9c0c6'], [.8, '#e8d9b4'], [1, '#f1d9a6']] }, dir: -.12, len: 1.5 });
    p.mass([[90, 120], [260, 60], [420, 110], [560, 90], [640, 150], [480, 190], [300, 180], [150, 190]], { color: '#f3ead6', dir: -.1, soft: 24, alpha: .85 });
    p.lift([[700, 60], [860, 40], [960, 80], [840, 120]], { amount: .6, soft: 26 });
    p.layer('hills', { every: 5, depth: .2, still: true });
    p.mass([[-20, 420], [140, 330], [330, 400], [520, 300], [760, 390], [960, 320], [1180, 400], [1180, 640], [-20, 640]], { color: { lin: [0, 300, 0, 600], stops: [[0, '#7f96a6'], [1, '#9fb0a2']] }, dir: .5, size: 1.2 });
    p.shade([[520, 300], [760, 390], [700, 520], [560, 430]], { color: '#4f6a86', alpha: .5, soft: 30 });
    p.line([[-20, 420, .5], [140, 332, .9], [330, 400, .6], [520, 300, 1], [760, 390, .6], [960, 322, .9], [1170, 398, .5]], { w: 3, color: '#4b5b68', press: .5, passes: 2 });
    p.layer('glen', { every: 5, depth: .5, still: true });
    p.mass([[-20, 560], [200, 500], [480, 560], [760, 520], [1180, 600], [1180, 1100], [-20, 1100]], { color: { lin: [0, 500, 0, 1080], stops: [[0, '#a3ab6b'], [.4, '#7f9352'], [1, '#55703f']] }, dir: .25, vary: .55 });
    p.mass([[-20, 700], [300, 640], [620, 720], [420, 800], [-20, 820]], { color: '#b9a75c', dir: .1, alpha: .8, vary: .5 });
    p.shade([[300, 800], [700, 760], [1180, 860], [1180, 1100], [300, 1100]], { color: '#4c5a55', alpha: .5, soft: 60 });
    p.mass([[880, 560], [960, 420], [1080, 400], [1150, 470], [1185, 600], [1120, 680], [960, 690]], { color: { lin: [900, 400, 1100, 700], stops: [[0, '#8ea253'], [.5, '#5e7c46'], [1, '#37523f']] }, around: [1030, 560], len: .5, size: .8, vary: .7 });
    for (let i = 0; i < 46; i++) { const x = 900 + p.fix(i, 1) * 260, y = 420 + p.fix(i, 2) * 240; p.line([[x, y, .6], [x + 8, y - 7, 1], [x + 17, y - 2, .6]], { w: 4, color: i % 3 ? '#2f4a36' : '#c3bd6a', press: .6, medium: 'crayon' }); }
    for (let i = 0; i < 90; i++) { const x = p.fix(i, 4) * 1150, y = 840 + p.fix(i, 5) * 250, h = 30 + p.fix(i, 6) * 50; p.line([[x, y, 1], [x + 6, y - h * .5, .8], [x + 18 + p.fix(i, 7) * 14, y - h, .3]], { w: 4, color: ['#3f5936', '#8a9a4c', '#d3c27a', '#56705a'][i % 4], press: .75, medium: 'crayon', taper: [.02, .6] }); }
    p.layer('cottage', { every: 4, depth: .75, still: true });
    p.mass([[330, 520], [560, 512], [566, 640], [332, 648]], { sharp: true, color: { lin: [330, 0, 566, 0], stops: [[0, '#fbf3e2'], [.7, '#efe3cb'], [1, '#c9c3bd']] }, dir: 1.5, len: .7, vary: .25 });
    p.mass([[306, 530], [350, 440], [520, 430], [592, 522]], { sharp: true, color: '#b79257', dir: 1.1, len: .6, vary: .6 });
    p.mass([[486, 440], [488, 400], [516, 398], [518, 436]], { sharp: true, color: '#d8cdb8', dir: 1.5, size: .6 });
    p.mass([[420, 566], [456, 564], [458, 642], [420, 644]], { sharp: true, color: '#5f7d86', dir: 1.5, size: .6, len: .6 });
    p.mass([[360, 562], [394, 560], [394, 594], [361, 596]], { sharp: true, color: '#3f4a55', dir: 1.5, size: .5, len: .5 }); p.mass([[500, 560], [532, 558], [534, 592], [501, 594]], { sharp: true, color: '#e9b45a', dir: 1.5, size: .5, len: .5 });
    p.shade([[306, 532], [592, 524], [590, 548], [310, 556]], { color: '#7a6f78', alpha: .6, soft: 8 });
    for (let i = 0; i < 26; i++) { const x = 322 + i * 10; p.line([[x + 22 - i * .3, 448 + p.fix(i, 1) * 16, .5], [x + 8 - i * .2, 490, .9], [x, 526, .5]], { w: 2.6, color: '#6d5230', press: .55 }); }
    p.line([[306, 532], [350, 440, .8], [520, 430], [594, 524], [306, 532]], { w: 3.4, passes: 2 }); p.line([[331, 530], [333, 648]], { w: 3, passes: 2 }); p.line([[562, 526], [567, 640]], { w: 3 }); p.line([[320, 650, .5], [450, 645], [590, 640, .5]], { w: 3 });
    p.line([[420, 566], [456, 564], [458, 642]], { w: 2.4 }); p.line([[420, 644], [420, 566]], { w: 2.4 }); p.line([[377, 562], [378, 596]], { w: 2 }); p.line([[361, 579], [394, 577]], { w: 2 });
    p.hatch([[540, 530], [566, 526], [568, 640], [544, 642]], { color: '#4d5561', dir: 1.1, gap: 7, w: 2, press: .5 });
    p.line([[438, 640, .7], [470, 700, 1], [420, 760, .8], [300, 800, 1], [360, 880, 1], [560, 900, .9], [700, 860, 1], [800, 930, 1], [1010, 960, .9], [1130, 900, 1]], { w: 6, color: '#c8342b', medium: 'redline', taper: [.02, .05], press: .95 });
    // head
    p.layer('wall', { every: 4, depth: .35, still: true });
    p.mass([[1200, 20], [1905, 20], [1905, 640], [1200, 640]], { sharp: true, color: { lin: [1200, 0, 1900, 640], stops: [[0, '#cdb591'], [.5, '#a58f76'], [1, '#5f5a5c']] }, dir: .9, vary: .5 });
    p.layer('head', { every: 1, depth: 1 });
    p.mass([[1400, 640], [1420, 520], [1500, 470], [1640, 470], [1760, 540], [1800, 640]], { color: { lin: [1400, 480, 1800, 640], stops: [[0, '#7d8f8e'], [1, '#4d6069']] }, dir: 1.2, vary: .5 });
    p.mass([[1466, 494], [1530, 462], [1620, 470], [1662, 506], [1620, 540], [1520, 540], [1474, 524]], { color: '#c23a30', dir: .2, len: .6, vary: .4 });
    p.line([[1470, 500, .6], [1540, 486], [1620, 500], [1660, 510, .5]], { w: 3, color: '#7c1f1b' }); p.line([[1478, 522, .6], [1560, 516], [1640, 530, .5]], { w: 3, color: '#7c1f1b' });
    p.line([[1400, 640], [1420, 524, .8], [1500, 474]], { w: 3.4, passes: 2 }); p.line([[1640, 476], [1760, 544, .9], [1800, 640]], { w: 3.4, passes: 2 });
    head(p, 1560, 300, 200);
    // night + snow + hand
    p.layer('night', { every: 5, depth: .3, still: true });
    p.mass([[1200, 660], [1905, 660], [1905, 1062], [1200, 1062]], { sharp: true, color: { lin: [0, 660, 0, 1060], stops: [[0, '#1d2c4d'], [.6, '#31527a'], [1, '#5f7f99']] }, dir: -.3, vary: .5, len: 1.2 });
    p.mass([[1200, 960], [1340, 920], [1560, 950], [1760, 910], [1905, 950], [1905, 1062], [1200, 1062]], { color: '#c9d6df', dir: .05, vary: .4 });
    p.lift([[1320, 950], [1440, 940], [1500, 975], [1360, 985]], { amount: .8, soft: 10 });
    for (let i = 0; i < 24; i++) { const x = 1220 + p.fix(i, 9) * 660, y = 680 + p.fix(i, 10) * 190; p.lift([[x - 2, y], [x, y - 2], [x + 3, y], [x, y + 3]], { amount: 1 }); }
    p.dust(1560, 860, 260, { color: '#ffffff', n: 90, seed: 3 });
    p.layer('hand', { every: 1, depth: 1 });
    p.push(); p.translate(1660, 830); p.scale(1.05);
    p.mass([[-150, 120], [-120, 60], [-70, 20], [-20, 0], [10, -60], [34, -70], [40, -40], [26, 4], [60, 0], [96, -50], [116, -52], [118, -24], [86, 28], [120, 10], [134, 20], [128, 40], [84, 66], [112, 64], [116, 80], [76, 100], [20, 116], [-40, 150], [-90, 200], [-160, 200]], { color: { lin: [-120, 0, 100, 140], stops: [[0, '#e2b694'], [1, '#b97f60']] }, dir: .7, size: .6, len: .5 });
    p.shade([[20, 40], [80, 60], [70, 100], [-20, 120], [-60, 120]], { color: '#8f5b48', alpha: .5, soft: 24 });
    const hl = { w: 3, passes: 2, color: '#3c2f2a' };
    p.line([[-150, 118, .5], [-118, 58], [-70, 20], [-20, 0], [10, -60], [34, -70, .7], [40, -40], [26, 4]], hl); p.line([[26, 4], [60, 0], [96, -50], [116, -52], [118, -24], [86, 28]], hl); p.line([[86, 28], [120, 10], [134, 20], [128, 40], [84, 66]], hl); p.line([[84, 66], [112, 64], [116, 80], [76, 100], [20, 116], [-40, 150], [-90, 200, .5]], hl); p.line([[30, 30, .5], [46, 24], [60, 26, .4]], { w: 2 });
    p.line([[-420, 60, .6], [-300, 120, 1], [-180, 60, 1], [20, -66, 1], [60, -30, 1], [30, 20, 1], [-30, 10, .8], [60, -100, .9], [200, -120, .6]], { w: 5.5, color: '#cf352c', medium: 'redline', taper: [.03, .08], press: .95 });
    p.pop();
  };
  T.mediumMove = function (p, k) {
    const n = Math.round(k * 12), u = n / 24, A = B.anim;
    p.paper('#efe4cf');
    p.layer('land', { every: 5, depth: .25, still: true });
    p.mass([[-20, -20], [1940, -20], [1940, 620], [-20, 620]], { sharp: true, color: { lin: [0, 0, 0, 600], stops: [[0, '#9fb6bd'], [.6, '#dcd6bd'], [1, '#efdcb2']] }, dir: -.1, len: 1.4 });
    p.mass([[-20, 480], [300, 380], [700, 470], [1100, 360], [1500, 450], [1940, 380], [1940, 700], [-20, 700]], { color: '#8d9f9c', dir: .4 });
    p.line([[-20, 480], [300, 382], [700, 470], [1100, 362], [1500, 450], [1940, 380]], { w: 3, color: '#56656b', press: .5, passes: 2 });
    p.layer('field', { every: 4, depth: .6, still: true });
    p.mass([[-20, 640], [500, 590], [1100, 650], [1940, 590], [1940, 1100], [-20, 1100]], { color: { lin: [0, 600, 0, 1080], stops: [[0, '#b8ad6c'], [1, '#6f8350']] }, dir: .15, vary: .55 });
    for (let i = 0; i < 60; i++) { const x = p.fix(i, 4) * 1920, y = 760 + p.fix(i, 5) * 320, h = 26 + p.fix(i, 6) * 40; p.line([[x, y], [x + 5, y - h * .5, .8], [x + 14, y - h, .3]], { w: 3.6, color: ['#4d6238', '#93a04f', '#d8c880'][i % 3], medium: 'crayon', taper: [.02, .6] }); }
    p.layer('fig', { every: 1, depth: 1 });
    const x = A.lerp(420, 1350, A.ease.io(A.clamp(u))), ph = n * .62, bob = Math.abs(Math.sin(ph)) * 14, y = 900 - bob, sw = Math.sin(ph);
    const leg = (s, c) => { const kx = x + s * 40 + 10, ky = y - 130, fx = x + s * 92, fy = y + (s * Math.cos(ph) > .2 ? -16 : 6); p.mass([[x - 26, y - 250], [x + 28, y - 250], [kx + 22, ky], [fx + 16, fy], [fx + 34, fy + 12], [fx - 16, fy + 14], [kx - 20, ky]], { color: c, dir: 1.4, size: .8, len: .7 }); p.line([[x - 26, y - 250], [kx - 20, ky], [fx - 16, fy + 10]], { w: 3.2, passes: 2 }); p.line([[x + 28, y - 250], [kx + 22, ky], [fx + 16, fy], [fx + 36, fy + 12], [fx - 16, fy + 14]], { w: 3.2 }); };
    leg(-sw, '#4d4741'); leg(sw, '#5d554b');
    p.mass([[x - 52, y - 236], [x - 60, y - 340], [x - 40, y - 440], [x + 10, y - 458], [x + 50, y - 436], [x + 62, y - 340], [x + 54, y - 232], [x, y - 222]], { color: { lin: [x - 60, 0, x + 60, 0], stops: [[0, '#8f8a7d'], [1, '#5c6468']] }, dir: 1.3, vary: .5 });
    p.shade([[x - 60, y - 340], [x - 20, y - 400], [x - 14, y - 230], [x - 56, y - 230]], { color: '#4a4f5c', alpha: .5, soft: 18 });
    p.line([[x - 52, y - 236], [x - 60, y - 340], [x - 38, y - 440], [x + 10, y - 456]], { w: 3.4, passes: 2 }); p.line([[x + 50, y - 436], [x + 62, y - 340], [x + 54, y - 232], [x, y - 222], [x - 52, y - 236]], { w: 3.4, passes: 2 });
    p.mass([[x - 34, y - 470], [x - 40, y - 530], [x - 4, y - 566], [x + 34, y - 548], [x + 44, y - 506], [x + 30, y - 462], [x, y - 450]], { color: '#d3a483', around: [x, y - 505], size: .6, len: .5 }); p.mass([[x - 44, y - 500], [x - 42, y - 560], [x - 6, y - 586], [x + 34, y - 570], [x + 40, y - 548], [x - 4, y - 540], [x - 24, y - 490]], { color: '#4c3a2e', around: [x, y - 520], size: .7, len: .6 });
    p.line([[x + 34, y - 548], [x + 45, y - 510], [x + 50, y - 498], [x + 42, y - 490], [x + 30, y - 462], [x, y - 450]], { w: 3 }); p.line([[x + 24, y - 520], [x + 30, y - 516]], { w: 4, color: '#2b2622' });
    const aa = -sw * .7; const hx = x + Math.sin(aa) * 150, hy = y - 300 + Math.cos(aa) * 60; p.mass([[x - 18, y - 420], [x + 18, y - 420], [x + (hx - x) * .6 + 18, y - 340], [hx + 14, hy], [hx - 14, hy + 8], [x + (hx - x) * .5 - 18, y - 330]], { color: '#79786f', dir: 1.2, size: .8 }); p.line([[x - 18, y - 420], [x + (hx - x) * .5 - 18, y - 330], [hx - 14, hy + 8]], { w: 3.2, passes: 2 }); p.line([[x + 18, y - 420], [x + (hx - x) * .6 + 18, y - 340], [hx + 14, hy]], { w: 3.2 });
    const c = []; for (let i = 0; i < 9; i++) { const d = i / 8; c.push([x - 30 - i * 26 - u * 40 * d, y - 430 + Math.sin(ph - i * .75) * 26 * d + d * 36, 1 - d * .3]); }
    p.mass([...c.map(q => [q[0], q[1] - 13]), ...c.slice().reverse().map(q => [q[0], q[1] + 13])], { color: '#c43a30', dir: .1, size: .7, len: .6 }); p.line(c.map(q => [q[0], q[1] - 13]), { w: 2.8, color: '#7c1f1b' }); p.line(c.map(q => [q[0], q[1] + 13]), { w: 2.8, color: '#7c1f1b' });
  };
})();
