// Tests del juego sin navegador: se extrae el <script> de index.html y se corre
// en un vm con stubs mínimos de DOM/Audio/Image.  node test.js
const fs=require('fs'), vm=require('vm'), path=require('path');
const src=fs.readFileSync(path.join(__dirname,'index.html'),'utf8').match(/<script>([\s\S]*)<\/script>/)[1];

const noop=new Proxy(function(){},{get:()=>noop,apply:()=>noop,set:()=>true});
const el=()=>({getContext:()=>noop,style:{},value:'',className:'',
  set textContent(v){},set innerHTML(v){},
  set src(v){this._s=v},get src(){return this._s},
  insertAdjacentHTML(){},blur(){},focus(){},addEventListener(){},width:0,height:0});

// El mismo index.html se corre en dos contextos: uno "escritorio" (pointer:fine)
// y uno "teléfono" (pointer:coarse).  Así se verifica que el perfil lite prenda
// sólo en el segundo y que ninguno de los dos toque el gameplay.
const mkctx=coarse=>{
  // API de pantalla completa de mentira: guarda el elemento y avisa a los listeners
  const fsl=[], fire=()=>fsl.forEach(f=>f());
  const doc={getElementById:el,createElement:el,
    addEventListener(k,f){ if(k==='fullscreenchange') fsl.push(f) },
    fullscreenEnabled:true, fullscreenElement:null,
    exitFullscreen(){ doc.fullscreenElement=null; fire(); return Promise.resolve() }};
  const root={style:{setProperty(k,v){ctx.css[k]=v}},cls:'',
              classList:{add(c){root.cls=c},remove(c){root.cls=''}},
              requestFullscreen(){ doc.fullscreenElement=root; fire();
                                   return Promise.resolve() }};
  doc.documentElement=root;
  const ctx={console,Int16Array,performance:{now:()=>Date.now()},requestAnimationFrame:()=>0,
    setTimeout:()=>0,clearTimeout:()=>0,addEventListener:()=>0,innerWidth:375,
    visualViewport:{width:375,addEventListener:()=>0},
    matchMedia:q=>({matches:coarse&&/coarse/.test(q)}),
    navigator:{userAgent:coarse?'Mozilla/5.0 (Linux; Android 14) Mobile'
                               :'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)'},
    Image:function(){this.complete=false;this.naturalWidth=0;this.decode=()=>Promise.resolve()},
    Audio:function(s){this.src=s;this.paused=true;this.muted=false;
                      this.play=()=>{this.paused=false;return Promise.resolve()};
                      this.pause=()=>{this.paused=true}},
    css:{},
    document:doc};
  ctx.window=ctx;
  return ctx;
};
const ctx=mkctx(false);

// helpers compartidos por los dos contextos
const common=`
const press=k=>onkeydown({key:k,preventDefault(){}});
const wrong=()=>press([...POOL].find(c=>!Object.values(letters).includes(c)));
const cell=()=>p.y*C+p.x;
function path(from,to){const prev={},q=[from],seen=new Set([from]);
 while(q.length){const c=q.shift(); if(c===to)break; const cx=c%C,cy=c/C|0;
  [[0,-1,'n'],[1,0,'e'],[0,1,'s'],[-1,0,'w']].forEach(([dx,dy,w])=>{
   const nx=cx+dx,ny=cy+dy,n=ny*C+nx;
   if(nx>=0&&ny>=0&&nx<C&&ny<R&&!g[c][w]&&!seen.has(n)){seen.add(n);prev[n]=[c,w];q.push(n)}})}
 const out=[];for(let n=to;n!==from;){const [pv,w]=prev[n];out.unshift(w);n=pv}return out}
// una partida entera jugada por un bot: junta las 5 monedas y sale
function botGame(){
  gen(); foes=[]; baby=0;
  // se puede ganar antes de tachar la lista: yendo por una moneda se pisan otras
  // y, con las 5 juntas, cruzar la casilla de salida ya termina la partida
  for(const t of [...coins,C*R-1]){ let guard=0;
    while(!win && cell()!==t && guard++<400){
      if(paused){ babyEnd(false); continue }
      if(qte){ qte.seq.slice().forEach(k=>press(k)); continue }
      press(letters[path(cell(),t)[0]]);
    }
    if(guard>=400) throw new Error('el bot se atoro');
    if(win) break;
  }
  if(!win) throw new Error('no gano');
}
// foto de TODO lo que define la dificultad: tiene que dar igual en los dos perfiles
function snap(){
  const q=[], b0=baby, g0=got, c0=combo;
  for(let n=0;n<=5;n++){ got=n; q.push(foeMs(),chaseP(),qteLen()) }
  for(let c=0;c<=20;c++){ combo=c; deal(); q.push(durBase,comboFill(),comboCol()) }
  for(let b=0;b<=3;b++){ baby=b; q.push(babyK(),dur()) }
  baby=b0; got=g0; combo=c0; deal();
  return JSON.stringify([C,R,S,POOL,COMBO_MAX,MS_LETRA,BEAT,VIBE_OFF,q,
                         [0,.1,.174,.25,.5].map(bopAt)]);
}
`;

const harness=`
if(!BGM.paused) throw new Error('la musica no debe autoarrancar');

// 1) timer MM:SS:mmm
if(fmt(83456)!=='01:23:456'||fmt(0)!=='00:00:000') throw new Error('formato del timer');

// 2) reinicio sólo por botón: 'r' es una letra jugable
gen(); foes=[]; press('r');
if(!log.length) throw new Error("'r' deberia jugarse como letra");
if(typeof rst.onclick!=='function') throw new Error('boton reinicio sin handler');

// 3) UI: los chips de letra nunca caen sobre la celda del PJ ni fuera del canvas
for(let i=0;i<C*R;i++){const cx=i%C,cy=i/C|0;
 for(const d of ['n','e','s','w']){ if(g[i][d]) continue;
  const [X,Y]=LP[d](cx,cy), r=12;
  if(X+r>cx*S&&X-r<(cx+1)*S&&Y+r>cy*S&&Y-r<(cy+1)*S) throw new Error('letra sobre el PJ');
  if(X-r<0||Y-r<0||X+r>C*S||Y+r>R*S) throw new Error('letra fuera del canvas');
 }}

// 4) retroceso: 3 avances + 3 errores => de vuelta al inicio
gen(); foes=[]; const start=cell(), seen=[start];
for(let i=0;i<3;i++){ press(letters[Object.keys(letters)[0]]); seen.push(cell()) }
for(let i=0;i<3;i++){ wrong(); if(cell()!==seen[2-i]) throw new Error('retroceso mal') }
if(cell()!==start) throw new Error('no volvio al inicio');

// 5) dificultad escalada y margen por letra constante
gen(); const d0=[foeMs(),chaseP(),qteLen()];
got=5; const d5=[foeMs(),chaseP(),qteLen()];
if(!(d5[0]<d0[0]&&d5[1]>d0[1]&&d5[2]===8)) throw new Error('la dificultad no escala');
got=0; qteStart(); const m0=qte.ms/qte.seq.length; qte=null;
got=5; qteStart(); const m5=qte.ms/qte.seq.length; qte=null;
if(m0!==m5||m0!==MS_LETRA) throw new Error('margen por letra no constante');

// 6) QTE fallido: 3 pasos atras + congelado; exitoso: sin retroceso
gen(); foes=[]; const camino=[cell()];
for(let i=0;i<4;i++){ press(letters[Object.keys(letters)[0]]); camino.push(cell()) }
qteStart(); press([...POOL].find(c=>c!==qte.seq[0]));
if(qte||cell()!==camino[1]) throw new Error('el fallo no retrocedio 3');
if(!frozen) throw new Error('no congelo con el jumpscare');
const nlog=log.length; press('a');
if(log.length!==nlog) throw new Error('acepta teclas congelado');
scareHide(); if(frozen) throw new Error('no descongelo');
const cOK=cell(); qteStart(); qte.seq.slice().forEach(k=>press(k));
if(qte||cell()!==cOK) throw new Error('qte exitoso mal');

// 7) skill issue: pausa, baby mode, reloj congelado y cooldown
gen(); foes=[]; baby=0; nextAsk=12;
for(let i=0;i<12;i++) i%4===0?press(letters[Object.keys(letters)[0]]):wrong();
if(!paused||skill.style.display!=='grid') throw new Error('no aparecio el dialogo');
const nl=log.length; press('a');
if(log.length!==nl) throw new Error('acepta teclas en pausa');
const t0a=t0, sa=shownAt; pauseAt-=500; babyEnd(true);   // simula 500ms en pausa
if(baby!==1||paused) throw new Error('el "si" no aplico baby mode');
if(Math.abs((t0-t0a)-500)>50||Math.abs((shownAt-sa)-500)>50) throw new Error('la pausa no corrio el reloj');
const dB=dur(); qteStart(); const msB=qte.ms/qte.seq.length; qte=null;
baby=0; const dN=dur(); qteStart(); const msN=qte.ms/qte.seq.length; qte=null; baby=1;
if(!(dB>dN&&msB>msN)) throw new Error('baby mode no da mas tiempo');
const ask=nextAsk; wrong(); wrong();
if(paused) throw new Error('spam del dialogo dentro del cooldown');
while(hits+fails<ask) wrong();
if(!paused) throw new Error('no volvio a preguntar tras el cooldown');
babyEnd(false);
if(baby!==1||nextAsk<=ask) throw new Error('el "no" mal');

// 8) assets embebidos + preload
if(!PJ.src.startsWith('data:image/webp')||!FOE.src.startsWith('data:image/webp')) throw new Error('sprites');
if(!GIF.src.startsWith('data:image/gif')||!sgif.src.startsWith('data:image/gif')) throw new Error('gifs');
if(!BGM.loop||!(BGM.volume>0&&BGM.volume<1)) throw new Error('musica mal configurada');
if([SCREAM,BANG,BGM].some(a=>a.preload!=='auto')) throw new Error('falta preload de audio');
BGM.paused=true; press('a'); if(BGM.paused) throw new Error('la musica no arranco con la 1a tecla');
mus.onclick(); if(!BGM.muted) throw new Error('mute'); mus.onclick();

// 9) teclado de telefono: la ruta oninput mueve igual que keydown
gen(); foes=[]; baby=0;
const c0=cell(); kb.value=letters[Object.keys(letters)[0]].toUpperCase();  // soft keyboards mandan mayusculas
kb.oninput();
if(cell()===c0) throw new Error('el teclado de telefono no movio al PJ');
if(kb.value!=='') throw new Error('el input no se limpio');
if(typeof tec.onclick!=='function'||typeof cv.onclick!=='function') throw new Error('sin foco al teclado');
kb.value='ZZZ'; kb.oninput();
if(hits+fails<3) throw new Error('no proceso la cadena completa');

// 9b) layout: fit() nunca excede el viewport visible
fit();
if(parseInt(css['--w'])>visualViewport.width-16) throw new Error('el layout desborda: '+css['--w']);
visualViewport.width=1200; fit();
if(parseInt(css['--w'])!==510) throw new Error('no respeta el maximo de 510px');
visualViewport.width=375; fit();

// 9c) IA: con el campo de flujo el gato SIEMPRE alcanza al PJ por el camino mas corto
const rnd=Math.random;
for(let round=0;round<25;round++){
  Math.random=rnd; gen();                      // laberinto aleatorio...
  const src=far(); foes=[src]; prevFoe=[];
  Math.random=()=>0;                           // ...y persecucion pura
  const d0=flow()[src]; let pasos=0;
  while(foes[0]!==p.y*C+p.x){
    const antes=flow()[foes[0]];
    moveFoes(); qte=null;
    if(flow()[foes[0]]>=antes) throw new Error('el gato no se acerco');
    if(++pasos>C*R) throw new Error('el gato se atoro');
  }
  if(pasos!==d0) throw new Error('no tomo el camino mas corto: '+pasos+' vs '+d0);
}
Math.random=rnd;

// 10) partida completa
botGame();
if(!unlockT) throw new Error('no aviso al desbloquear la salida');
if(tEnd+pen<0) throw new Error('tiempo neto negativo');
if(log.length!==hits+fails) throw new Error('log descuadrado');
const teclas=log.length, prec=Math.round(acc()*100);   // la partida completa, antes de los resets
// 11) medidor de combo: llena, satura y cambia de tramo
gen(); foes=[]; combo=0;
if(comboFill()!==0) throw new Error('el medidor no arranca vacio');
combo=Math.round(COMBO_MAX/2);
if(Math.abs(comboFill()-.5)>.05) throw new Error('el medidor no llena a la mitad');
combo=COMBO_MAX*3;
if(comboFill()!==1) throw new Error('el medidor se pasa de 1');
const tramos=new Set([0,5,10,COMBO_MAX].map(c=>{combo=c;return comboCol()}));
if(tramos.size!==4) throw new Error('los tramos del combo no cambian de color');
combo=0;

// 12) SFX: sin WebAudio en el stub tienen que ser no-op, no reventar la partida
sfxOk(); sfxBad(); sfxLate(); sfxCoin(); sfxUnlock();
BGM.muted=true; sfxOk(); BGM.muted=false;

// 13) extra vibes: cambia de pista, late a 120 BPM y NO toca el gameplay
gen(); foes=[];
const posA=cell(), gotA=got, durA=dur(), foeA=foeMs(), qA=qteLen();
if(track()!==BGM) throw new Error('no arranca en la pista normal');
if(!VIBE.loop||!(VIBE.volume>0&&VIBE.volume<1)) throw new Error('pista de vibes mal configurada');
if(BEAT!==0.5) throw new Error('120 BPM tiene que dar 0.5s por beat');
const KICK=0.174;                    // bombo medido sobre el mp3 (lowpass 120Hz)
if(bopAt(KICK)<.999) throw new Error('el bop no cae sobre el bombo del mp3');
if(Math.abs(bopAt(KICK)-bopAt(KICK+BEAT))>1e-9) throw new Error('el bop no es periodico');
if(bopAt(KICK+BEAT/2)>.4) throw new Error('el bop no decae entre beats');
if(bopAt(KICK+BEAT*.9)>.1) throw new Error('el bop llega alto al beat siguiente');
BGM.paused=false; vibe.onclick();
if(!vibes||track()!==VIBE) throw new Error('no cambio a la pista de vibes');
if(!BGM.paused||VIBE.paused) throw new Error('las dos pistas suenan a la vez');
if(cell()!==posA||got!==gotA||dur()!==durA||foeMs()!==foeA||qteLen()!==qA)
  throw new Error('extra vibes toco el gameplay');
mus.onclick(); if(!VIBE.muted) throw new Error('el mute no llega a la pista de vibes'); mus.onclick();
vibe.onclick();
if(vibes||track()!==BGM||!VIBE.paused) throw new Error('no volvio a la pista normal');

// 14) onboarding: se ve al cargar, reusa los sprites y se va con la 1a tecla
if(!dpj.src.startsWith('data:image/webp')||!dfoe.src.startsWith('data:image/webp'))
  throw new Error('el onboarding no reusa los sprites embebidos');
introShow(); if(intro.style.display!=='grid') throw new Error('no abrio el onboarding');
gen(); foes=[]; press(letters[Object.keys(letters)[0]]);
if(intro.style.display!=='none') throw new Error('la 1a tecla no cerro el onboarding');
if(typeof how.onclick!=='function'||typeof igo.onclick!=='function')
  throw new Error('faltan los botones del onboarding');

// 15) salida: la unica condicion es juntar las 5 monedas
gen(); foes=[];
got=0; if(exitOpen()) throw new Error('la salida arranca abierta');
got=4; if(exitOpen()) throw new Error('la salida abre antes de las 5 monedas');
got=5; if(!exitOpen()) throw new Error('la salida no abre con las 5 monedas');
p={x:C-1,y:R-1};
got=4; unlockT=0;         frame();              // pintar la salida cerrada no rompe
got=5; unlockT=now();     frame();              // ni la abierta con el cartel encima
got=0; unlockT=0;

frame();

// 16) escritorio: el perfil lite NO se aplica, todo queda como estaba
if(MOBILE) throw new Error('escritorio detectado como movil');
if(!PERF.scan||PERF.glow!==1||PERF.fps||PERF.hudMs||PERF.dust!==1)
  throw new Error('el perfil lite se colo en escritorio');
if(document.documentElement.cls) throw new Error('escritorio no lleva la clase lite');
if(BGM.preload!=='auto'||VIBE.preload!=='auto') throw new Error('escritorio sin preload de audio');
if(!VIBE.src.startsWith('data:audio')) throw new Error('escritorio ya deberia tener el mp3 de vibes');
// el horneado de paredes no depende del perfil
if(!baked||!mz[0]) throw new Error('escritorio no horneo las paredes');
if(BLUR[0]!==10||BLUR[1]!==26) throw new Error('las capas no cubren el rango del latido');
if(mz[0].width!==cv.width+PAD*2) throw new Error('la capa horneada va con margen');
if(!mz[1]) throw new Error('extra vibes deberia haber horneado la capa del latido');
gen(); foes=[]; p={x:10,y:0}; vis={x:0,y:0};   // vis persigue a p: avanza una vez por cuadro
lastDraw=0; frame(); const v1=vis.x; frame();
if(!v1) throw new Error('el cuadro no dibujo');
if(vis.x===v1) throw new Error('escritorio no deberia saltear cuadros');
SNAP=snap();

// 17) pantalla completa: el boton la maneja, pero en escritorio nada la fuerza
cv.onclick(); tec.onclick(); igo.onclick();
if(document.fullscreenElement) throw new Error('escritorio no deberia entrar solo a pantalla completa');
fsb.onclick();
if(!document.fullscreenElement) throw new Error('el boton no entro a pantalla completa');
if(fsb.className!=='on') throw new Error('el boton no quedo marcado');
fsb.onclick();
if(document.fullscreenElement) throw new Error('el boton no salio de pantalla completa');
if(fsb.className) throw new Error('el boton quedo marcado al salir');
if(fsb.style.display==='none') throw new Error('con API disponible el boton tiene que verse');

console.log('OK 17/17 | partida completa:',teclas,'teclas, precision',prec+'%');
`;

// ---- 18) el mismo juego en un teléfono: perfil lite, gameplay intacto ----
const mobile=`
if(!MOBILE) throw new Error('no detecto el telefono');
if(PERF.scan||!(PERF.glow<1)||!PERF.fps||!PERF.hudMs||!(PERF.dust<1))
  throw new Error('perfil lite incompleto');
if(document.documentElement.cls!=='lite') throw new Error('falta la clase lite en <html>');

// los dos mp3 de ~1MB no se tocan hasta que hagan falta
if(BGM.preload!=='none'||VIBE.preload!=='none') throw new Error('movil precargando los mp3 grandes');
if(VIBE.src) throw new Error('el mp3 de vibes no debe cargarse sin pedirlo');
if(mz[1]) throw new Error('la capa del latido no se hornea hasta prender extra vibes');
vibe.onclick();
if(!mz[1]) throw new Error('extra vibes no horneo la capa del latido');
if(!VIBE.src.startsWith('data:audio')) throw new Error('EXTRA VIBES no cargo la pista');
if(!vibes||track()!==VIBE) throw new Error('no cambio a la pista de vibes en movil');
vibe.onclick();
if(vibes||track()!==BGM) throw new Error('no volvio a la pista normal en movil');

// las paredes se hornean una vez por laberinto, igual que en escritorio
if(!baked||!mz[0]) throw new Error('no horneo la capa de paredes');
const capas=mz.slice(); gen();
if(mz[0]!==capas[0]||mz[1]!==capas[1]) throw new Error('gen() no deberia crear canvas nuevos');

// tope de cuadros: dos llamadas seguidas dibujan una sola vez
gen(); foes=[]; p={x:10,y:0}; vis={x:0,y:0};
lastDraw=0; frame(); const v1=vis.x;
if(!v1) throw new Error('el primer cuadro no dibujo');
frame();
if(vis.x!==v1) throw new Error('el tope de fps no salteo el cuadro repetido');

// y el juego se juega igual: partida completa y dificultad identica
botGame();
lastDraw=0; frame();
if(log.length!==hits+fails) throw new Error('log descuadrado en movil');
SNAP=snap();

// ---- 19) GUI del teléfono: barra flotante, menú hamburguesa y encuadre ----
// la barra se corre al borde opuesto en cuanto el gato entra en su franja
gen(); foes=[]; vis={x:0,y:0}; lastDraw=0; frame();
if(!barLow||bar.className!=='low') throw new Error('la barra no se aparto del gato');
p={x:0,y:R-1}; vis={x:0,y:R-1}; lastDraw=0; frame();
if(barLow||bar.className) throw new Error('la barra no volvio arriba con el gato abajo');

// el menú congela el reloj igual que el diálogo de skill issue
gen(); foes=[]; press(letters[Object.keys(letters)[0]]);
const tm=t0, sm=shownAt;
menuOpen();
if(!menuOn||!paused||menu.className!=='open') throw new Error('el menu no abrio');
const nk=log.length; press('a');
if(log.length!==nk) throw new Error('acepta teclas con el menu abierto');
pauseAt-=400; menuClose();
if(menuOn||paused||menu.className) throw new Error('el menu no cerro');
if(Math.abs((t0-tm)-400)>50||Math.abs((shownAt-sm)-400)>50)
  throw new Error('el menu no devolvio el tiempo pausado');
menuOpen(); rst.onclick();
if(menuOn||paused) throw new Error('REINICIAR no cerro el menu');
// sin primera tecla no hay reloj: cerrar el menú no puede inventarlo
gen(); menuOpen(); pauseAt-=400; menuClose();
if(t0) throw new Error('el menu arranco el reloj sin jugar');

// tocar el laberinto, TECLADO y JUGAR entran a pantalla completa
for(const [quien,fn] of [['el laberinto',cv.onclick],['TECLADO',tec.onclick],['JUGAR',igo.onclick]]){
  document.exitFullscreen(); fn();
  if(!document.fullscreenElement) throw new Error(quien+' no entro a pantalla completa');
}
// pero si el jugador sale con el boton, tocar el laberinto no lo devuelve ahi
fsb.onclick();
if(document.fullscreenElement) throw new Error('el boton no salio de pantalla completa');
cv.onclick(); tec.onclick();
if(document.fullscreenElement) throw new Error('volvio solo a pantalla completa tras salir a mano');
fsb.onclick();
if(!document.fullscreenElement) throw new Error('el boton no la volvio a habilitar');
document.exitFullscreen();
cv.onclick();
if(!document.fullscreenElement) throw new Error('el boton no reactivo el automatico');
document.exitFullscreen();

`;

vm.runInNewContext(src+common+harness,ctx);
const mctx=mkctx(true);
vm.runInNewContext(src+common+mobile,mctx);
if(!ctx.SNAP||ctx.SNAP!==mctx.SNAP)
  throw new Error('el perfil movil movio algo del gameplay');
console.log('OK 19/19 | el perfil lite prende solo en pointer:coarse y no toca la dificultad');
