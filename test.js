// Tests del juego sin navegador: se extrae el <script> de index.html y se corre
// en un vm con stubs mínimos de DOM/Audio/Image.  node test.js
const fs=require('fs'), vm=require('vm'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const src=html.match(/<script>([\s\S]*)<\/script>/)[1];

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
  const cls=new Set();
  const root={style:{setProperty(k,v){ctx.css[k]=v}},
              get cls(){ return [...cls].join(' ') },
              classList:{add:c=>cls.add(c),remove:c=>cls.delete(c),contains:c=>cls.has(c)},
              requestFullscreen(){ doc.fullscreenElement=root; fire();
                                   return Promise.resolve() }};
  doc.documentElement=root;
  const ctx={console,Int16Array,performance:{now:()=>Date.now()},requestAnimationFrame:()=>0,
    setTimeout:()=>0,clearTimeout:()=>0,addEventListener:()=>0,innerWidth:375,
    visualViewport:{width:375,height:700,addEventListener:()=>0},
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
const step=()=>press(letters[Object.keys(letters)[0]]);   // una letra válida cualquiera
const wrong=()=>press([...POOL].find(c=>!Object.values(letters).includes(c)));
const cell=()=>p.y*C+p.x;
const has=(e,c)=>String(e.className||'').split(' ').indexOf(c)>=0;
const juega=id=>{ setLevel(id); gen(); foes=[] };          // nivel limpio y sin gatos
function path(from,to){const prev={},q=[from],seen=new Set([from]);
 while(q.length){const c=q.shift(); if(c===to)break; const cx=c%C,cy=c/C|0;
  [[0,-1,'n'],[1,0,'e'],[0,1,'s'],[-1,0,'w']].forEach(([dx,dy,w])=>{
   const nx=cx+dx,ny=cy+dy,n=ny*C+nx;
   if(nx>=0&&ny>=0&&nx<C&&ny<R&&!g[c][w]&&!seen.has(n)){seen.add(n);prev[n]=[c,w];q.push(n)}})}
 const out=[];for(let n=to;n!==from;){const [pv,w]=prev[n];out.unshift(w);n=pv}return out}
// una partida entera jugada por un bot: junta las monedas del nivel y sale
function botGame(id){
  if(id) setLevel(id);
  gen(); foes=[]; baby=0;
  if(!coins.length) spawn(coins,LV.coins);   // en el tutorial las suelta un paso, no gen()
  // se puede ganar antes de tachar la lista: yendo por una moneda se pisan otras
  // y, con todas juntas, cruzar la casilla de salida ya termina la partida
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
  juega('clasico');                          // la foto se saca siempre del mismo nivel
  const q=[], b0=baby, g0=got, c0=combo;
  for(let n=0;n<=5;n++){ got=n; q.push(foeMs(),chaseP(),qteLen()) }
  for(let c=0;c<=20;c++){ combo=c; deal(); q.push(durBase,comboFill(),comboCol(),rankFill()) }
  for(let b=0;b<=3;b++){ baby=b; q.push(babyK(),dur()) }
  baby=b0; got=g0; combo=c0; deal();
  return JSON.stringify([C,R,S,POOL,COMBO_MAX,MS_LETRA,BEAT,VIBE_OFF,q,
                         LEVELS.map(l=>[l.id,l.C,l.R,l.coins,l.foes,l.dur0,l.durMin,l.foe0,l.foeMin]),
                         RANKS.map(r=>[r.c,r.k]),
                         [0,.1,.174,.25,.5].map(bopAt)]);
}
`;

const harness=`
if(!BGM.paused) throw new Error('la musica no debe autoarrancar');

// 0) el juego arranca en el tutorial guiado, no en un cartel de onboarding
if(LV.id!=='tutorial'||!tutOn||tstep!==0) throw new Error('no arranco en el tutorial');
if(tut.className!=='on') throw new Error('el cartel del tutorial no se ve');
if(css['--tuth']!=='112px') throw new Error('el tablero no le dejo alto al tutorial');
if(css['--ar']!==(LV.C/LV.R).toFixed(4)) throw new Error('el CSS no tiene la proporcion del nivel');

juega('clasico');

// 1) timer MM:SS:mmm
if(fmt(83456)!=='01:23:456'||fmt(0)!=='00:00:000') throw new Error('formato del timer');

// 2) reinicio sólo por botón: 'r' es una letra jugable
gen(); foes=[]; press('r');
if(!log.length) throw new Error("'r' deberia jugarse como letra");
if(typeof rst.onclick!=='function') throw new Error('boton reinicio sin handler');

// 3) UI: los chips de letra nunca caen sobre la celda del PJ ni fuera del canvas
for(const id of LEVELS.map(l=>l.id)){ juega(id);
 for(let i=0;i<C*R;i++){const cx=i%C,cy=i/C|0;
  for(const d of ['n','e','s','w']){ if(g[i][d]) continue;
   const [X,Y]=LP[d](cx,cy), r=12;
   if(X+r>cx*S&&X-r<(cx+1)*S&&Y+r>cy*S&&Y-r<(cy+1)*S) throw new Error('letra sobre el PJ');
   if(X-r<0||Y-r<0||X+r>C*S||Y+r>R*S) throw new Error('letra fuera del canvas');
  }}}
juega('clasico');

// 4) retroceso: 3 avances + 3 errores => de vuelta al inicio
gen(); foes=[]; const start=cell(), seen=[start];
for(let i=0;i<3;i++){ step(); seen.push(cell()) }
for(let i=0;i<3;i++){ wrong(); if(cell()!==seen[2-i]) throw new Error('retroceso mal') }
if(cell()!==start) throw new Error('no volvio al inicio');

// 5) dificultad escalada y margen por letra constante
gen(); const d0=[foeMs(),chaseP(),qteLen()];
got=5; const d5=[foeMs(),chaseP(),qteLen()];
if(!(d5[0]<d0[0]&&d5[1]>d0[1]&&d5[2]===8)) throw new Error('la dificultad no escala');
// el clásico tiene que seguir dando los mismos numeros de siempre
if(d0[0]!==750||d5[0]!==300||d0[1]!==.7||d5[2]!==8) throw new Error('el clasico cambio de balance');
got=0; deal(); if(durBase!==1700) throw new Error('la ventana por letra del clasico cambio');
combo=COMBO_MAX; deal(); if(durBase!==650) throw new Error('el minimo de la ventana cambio');
combo=0; deal();
got=0; qteStart(); const m0=qte.ms/qte.seq.length; qte=null;
got=5; qteStart(); const m5=qte.ms/qte.seq.length; qte=null;
if(m0!==m5||m0!==MS_LETRA) throw new Error('margen por letra no constante');
got=0;

// 6) QTE fallido: 3 pasos atras + congelado; exitoso: sin retroceso
gen(); foes=[]; const camino=[cell()];
for(let i=0;i<4;i++){ step(); camino.push(cell()) }
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
for(let i=0;i<12;i++) i%4===0?step():wrong();
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
// pero el tutorial no se interrumpe con el dialogo
juega('tutorial'); nextAsk=0; hits=20; fails=20; checkSkill();
if(paused) throw new Error('el dialogo interrumpio el tutorial');
juega('clasico'); baby=0;

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
setLevel('sotano');                          // un tablero mas ancho pide mas ancho
if(parseInt(css['--w'])!==LV.C*S) throw new Error('el nivel grande no se dibuja entero');
if(css['--vh']!=='700px') throw new Error('fit() no publico el alto visible: '+css['--vh']);
juega('clasico'); visualViewport.width=375; fit();

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
botGame('clasico');
if(!unlockT) throw new Error('no aviso al desbloquear la salida');
if(tEnd+pen<0) throw new Error('tiempo neto negativo');
if(log.length!==hits+fails) throw new Error('log descuadrado');
if(bests.clasico===undefined) throw new Error('no guardo el record del nivel');
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

// 11b) rangos estilo DMC: letra, nombre, color y medidor hacia el rango siguiente
if(RANKS[0].k!=='D'||RANKS[RANKS.length-1].k!=='SSS') throw new Error('faltan los rangos D..SSS');
if(RANKS.some((r,i)=>i&&r.c<=RANKS[i-1].c)) throw new Error('los rangos no suben');
combo=0; if(rankI()!==0||rankFill()!==0) throw new Error('el rango no arranca en D vacio');
combo=RANKS[1].c; if(rankI()!==1||rankFill()!==0) throw new Error('el medidor no se vacia al subir');
combo=RANKS[1].c+1;
if(!(rankFill()>0&&rankFill()<1)) throw new Error('el medidor no llena hacia el rango siguiente');
combo=999; if(rankI()!==RANKS.length-1||rankFill()!==1) throw new Error('el tope del rango');
if(comboCol()!==RANKS[RANKS.length-1].col) throw new Error('el color no sale del rango');
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
if(!document.documentElement.classList.contains('vibes'))
  throw new Error('extra vibes no marco <html>: el CSS del latido no se enciende');
if(!BGM.paused||VIBE.paused) throw new Error('las dos pistas suenan a la vez');
if(cell()!==posA||got!==gotA||dur()!==durA||foeMs()!==foeA||qteLen()!==qA)
  throw new Error('extra vibes toco el gameplay');
mus.onclick(); if(!VIBE.muted) throw new Error('el mute no llega a la pista de vibes'); mus.onclick();
vibe.onclick();
if(vibes||track()!==BGM||!VIBE.paused) throw new Error('no volvio a la pista normal');
if(document.documentElement.classList.contains('vibes'))
  throw new Error('apagar extra vibes no saco la clase de <html>');

// 14) tutorial guiado: cada paso enciende un sistema y no avanza hasta usarlo
juega('tutorial');
if(!tutOn||tstep!==0) throw new Error('el tutorial no arranco');
if(!tutHold()) throw new Error('el primer paso deberia ir sin reloj');
lastDraw=0; frame();
if(tstep!==0) throw new Error('el paso 1 se cerro sin teclear nada');
for(let i=0;i<4;i++) step(); tutCheck();
if(tstep!==1) throw new Error('el paso 1 no se cerro con las 4 letras');
if(tutHold()) throw new Error('el paso 2 tiene que encender el reloj');
for(let i=0;i<5;i++) step(); tutCheck();
if(tstep!==2||combo!==0) throw new Error('el paso 3 no reinicio el combo');
for(let i=0;i<4;i++) step(); tutCheck();
if(tstep!==3) throw new Error('el paso del combo no se cerro');
if(!foes.length) throw new Error('el paso del QTE no solto el gato');
// un jugador rapido se le escapa al gato: el paso tiene que destrabarse solo
tAt-=TUT_PUSH+1; tutCheck();
if(!qte) throw new Error('el paso del QTE se quedo trabado esperando al gato');
if(tstep!==3) throw new Error('el empujon no deberia saltear el paso');
qte.seq.slice().forEach(k=>press(k)); tutCheck();
if(tstep!==4) throw new Error('el QTE limpio no cerro el paso');
if(coins.length!==LV.coins) throw new Error('el paso de las monedas no las solto');
got=LV.coins; coins=[]; tutCheck();
if(tstep!==5||!exitOpen()) throw new Error('el paso de la salida no arranco');
win=true; tutCheck();
if(tutOn||tut.className) throw new Error('el tutorial no termino');
if(!lvlOn||lvl.className!=='open') throw new Error('al terminar no abrio el selector de nivel');
if(css['--tuth']!=='0px') throw new Error('el tutorial no le devolvio el alto al tablero');
lvlHide();
// saltarlo lleva al mismo lugar
juega('tutorial'); tskip.onclick();
if(tutOn||!lvlOn) throw new Error('SALTAR no llevo al selector');
lvlHide();
// y el tutorial no ensucia los records
botGame('tutorial');
if(bests.tutorial!==undefined) throw new Error('el tutorial no deberia guardar record');
if(typeof how.onclick!=='function') throw new Error('falta el boton de repetir el tutorial');
how.onclick(); if(LV.id!=='tutorial'||!tutOn) throw new Error('el boton no repitio el tutorial');

// 15) selector de nivel: lista, ficha, pausa y arranque
juega('clasico'); press(letters[Object.keys(letters)[0]]);
if(typeof nvl.onclick!=='function'||typeof lgo.onclick!=='function') throw new Error('faltan botones del selector');
lvlShow();
if(!lvlOn||!paused||lvl.className!=='open') throw new Error('el selector no abrio');
const nlv=log.length; press('a');
if(log.length!==nlv) throw new Error('acepta teclas con el selector abierto');
lvlPick('sotano');
if(pick!=='sotano'||lgo.disabled) throw new Error('no marco el nivel elegido');
lvlPick('contra');
if(!lgo.disabled) throw new Error('un modo PROXIMAMENTE no se deberia poder jugar');
lvlPlay();
if(!lvlOn) throw new Error('un modo sin implementar no deberia arrancar');
lvlPick('sotano'); pauseAt-=300; lvlPlay();
if(lvlOn||paused) throw new Error('el selector no cerro al jugar');
if(LV.id!=='sotano'||C!==17||R!==13) throw new Error('no arranco el nivel elegido');
if(cv.width!==C*S||cv.height!==R*S) throw new Error('el canvas no siguio al nivel');
if(css['--ar']!==(C/R).toFixed(4)) throw new Error('el CSS no siguio la proporcion');
if(LEVELS.length!==3||MODES.length<2) throw new Error('faltan niveles o modos en el selector');
if(ALL.some(l=>!l.name||!l.desc||!l.pts.length)) throw new Error('un nivel sin ficha para mostrar');

// 15b) el sótano: niebla, faroles y acechador
if(!LV.fog||!LV.lamps||!LV.stalk) throw new Error('el sotano perdio sus mecanicas');
if(lamps.length!==LV.lamps) throw new Error('no salieron los faroles');
if(coins.some(c=>lamps.includes(c))) throw new Error('un farol quedo encima de una moneda');
gen(); foes=[];
const dir=Object.keys(letters)[0], dest=cell()+{n:-C,e:1,s:C,w:-1}[dir];
lamps=[dest]; revealT=0; press(letters[dir]);
if(!revealT||lamps.length) throw new Error('el farol no abrio la niebla');
// el acechador va a medio paso pero no despista NUNCA
gen(); Math.random=()=>.99;                  // cualquier gato normal se iria de paseo
foes=[far()]; prevFoe=[]; foeBeat=0;
const s0=foes[0]; moveFoes(); qte=null;
if(foes[0]!==s0) throw new Error('el acechador no va a medio paso');
const dA=flow()[foes[0]]; moveFoes(); qte=null;
if(flow()[foes[0]]>=dA) throw new Error('el acechador deberia perseguir siempre');
Math.random=rnd;
lastDraw=0; frame();                         // la niebla se dibuja sin romper el cuadro
botGame('sotano');                           // y el nivel se puede terminar
juega('clasico');

// 16) salida: la unica condicion es juntar las monedas del nivel
gen(); foes=[];
got=0; if(exitOpen()) throw new Error('la salida arranca abierta');
got=LV.coins-1; if(exitOpen()) throw new Error('la salida abre antes de tiempo');
got=LV.coins; if(!exitOpen()) throw new Error('la salida no abre con todas las monedas');
p={x:C-1,y:R-1};
got=4; unlockT=0;         frame();              // pintar la salida cerrada no rompe
got=5; unlockT=now();     frame();              // ni la abierta con el cartel encima
got=0; unlockT=0;

frame();

// 16b) RESPIRO: vencer a un gato congela 1.5s el reloj de la letra y a los gatos
juega('clasico'); gen(); foes=[];
if(GRACE_MS!==1500) throw new Error('el respiro tiene que durar 1.5s');
step();                                          // arranca el reloj
qteStart(); qte.seq.slice().forEach(k=>press(k));
if(!(graceT>now())) throw new Error('ganar el QTE no congelo el reloj de la letra');
if(graceT-now()>GRACE_MS+60) throw new Error('el respiro dura mas de lo pactado');
foes=[far()]; prevFoe=[];
const fA=foes[0]; shownAt=now()-1e6; foeTick=now()-1e6;
lastDraw=0; frame();
if(now()-shownAt>60) throw new Error('el respiro no congelo la ventana de la letra');
if(foes[0]!==fA) throw new Error('los gatos dieron un paso durante el respiro');
if(fails) throw new Error('el respiro dejo pasar una penalizacion por tarde');
// y al terminarse vuelve todo a correr
graceT=0; shownAt=now()-1e6; foeTick=now()-1e6; lastDraw=0; frame();
if(foes[0]===fA) throw new Error('los gatos no volvieron a moverse al terminar el respiro');
// fallar el QTE no regala respiro: para eso ya esta el jumpscare
gen(); foes=[]; step(); graceT=0;
qteStart(); press([...POOL].find(c=>c!==qte.seq[0])); scareHide();
if(graceT>now()) throw new Error('perder el QTE no deberia dar respiro');

// 16c) DETERMINACION: cada 3 gatos vencidos, una letra que atraviesa un muro
juega('clasico'); gen(); foes=[]; det=0; qteWins=0;
if(DET_EVERY!==3) throw new Error('la determinacion tiene que pedir 3 gatos');
for(let i=0;i<2;i++){ qteStart(); qte.seq.slice().forEach(k=>press(k)) }
if(det!==0) throw new Error('la carga llego antes de los 3 gatos');
qteStart(); qte.seq.slice().forEach(k=>press(k));
if(det!==1) throw new Error('3 gatos vencidos no dieron la carga');
// parada en una celda que TENGA un muro interior (en una esquina pueden ser todos del borde)
let ci=-1;
for(let i=0;i<C*R&&ci<0;i++){ const cx=i%C, cy=i/C|0;
  if(['n','e','s','w'].some(d=>g[i][d]&&cx+DV[d][0]>=0&&cy+DV[d][1]>=0
                                      &&cx+DV[d][0]<C&&cy+DV[d][1]<R)) ci=i }
p={x:ci%C,y:ci/C|0}; trail=[]; deal();
const muros=Object.keys(phase);
if(!muros.length) throw new Error('con carga los muros deberian tener letra');
if(muros.some(d=>!g[cell()][d])) throw new Error('marco como muro una salida abierta');
if(new Set(Object.values(letters)).size!==Object.keys(letters).length)
  throw new Error('dos direcciones con la misma letra');
for(const d of muros){ const [X,Y]=LP[d](p.x,p.y);
  if(X-12<0||Y-12<0||X+12>C*S||Y+12>R*S) throw new Error('letra de muro fuera del canvas') }
const antesD=cell(), dm=muros[0], destD=antesD+{n:-C,e:1,s:C,w:-1}[dm];
press(letters[dm]);
if(cell()!==destD) throw new Error('la letra violeta no atraveso el muro');
if(det!==0) throw new Error('atravesar no gasto la carga');
if(Object.keys(phase).length) throw new Error('sin carga siguen apareciendo letras de muro');
if(Object.keys(letters).some(d=>g[cell()][d])) throw new Error('sin carga hay letra sobre un muro');
wrong(); if(cell()!==antesD) throw new Error('el retroceso no volvio atravesando el muro');
// las cargas se acumulan hasta el tope y gen() las borra
det=0; qteWins=0;
for(let i=0;i<DET_EVERY*(DET_MAX+1);i++){ qteStart(); qte.seq.slice().forEach(k=>press(k)) }
if(det!==DET_MAX) throw new Error('las cargas no toparon en DET_MAX');
gen(); if(det||qteWins) throw new Error('la partida nueva arranco con determinacion');

// 16d) AHUYENTADOR: maullido con el combo al tope, 2.5s de huida y 45s de espera
juega('clasico'); gen(); foes=[]; combo=0; meowAt=-1e9; scareUntil=0;
if(MEOW_CD!==45000||MEOW_MS!==2500) throw new Error('el maullido cambio de numeros');
step();
if(meow()) throw new Error('maullo sin el combo al tope');
combo=COMBO_MAX;
if(!meowReady()) throw new Error('con el combo al tope deberia estar listo');
if(!meow()) throw new Error('no maullo con el combo al tope');
if(combo!==COMBO_MAX) throw new Error('el maullido no deberia gastar el combo');
if(!(scareUntil>now())||scareUntil-now()>MEOW_MS+60) throw new Error('el susto no dura 2.5s');
if(meow()) throw new Error('maullo dos veces sin esperar el cooldown');
meowAt=now()-MEOW_CD+1000;
if(meowReady()) throw new Error('el cooldown de 45s se corto antes');
meowAt=now()-MEOW_CD-1;
if(!meowReady()) throw new Error('el cooldown no se cumplio');
// sin combo al tope no hay maullido por mas que el cooldown este listo
combo=0;
if(meowReady()||meow()) throw new Error('el maullido tiene que pedir SIEMPRE el combo al tope');
// los gatos cercanos se ALEJAN y mientras huyen no abren QTE
gen(); foes=[]; combo=COMBO_MAX; meowAt=-1e9; scareUntil=0;
const dn=flow(); let cerca=-1, lejos=-1;
for(let i=0;i<C*R;i++){
  if(cerca<0&&dn[i]>=2&&dn[i]<=MEOW_R&&open(i).length>1) cerca=i;
  if(lejos<0&&dn[i]>MEOW_R) lejos=i;
}
if(cerca<0||lejos<0) throw new Error('el tablero no da para probar el alcance del maullido');
foes=[cerca]; prevFoe=[]; meow();
const dC=flow()[foes[0]]; moveFoes();
if(flow()[foes[0]]<=dC) throw new Error('el gato cercano no se alejo con el maullido');
if(qte) throw new Error('un gato huyendo no deberia abrir un QTE');
// el de lejos ni se entera: el maullido no cruza el laberinto entero
foes=[lejos]; prevFoe=[]; Math.random=()=>0;
const dL=flow()[lejos]; moveFoes(); qte=null;
if(flow()[foes[0]]>=dL) throw new Error('el maullido no deberia llegar tan lejos');
Math.random=rnd; scareUntil=0;
// ESPACIO y ENTER son las teclas; el Enter de un boton del menu no se toca
combo=COMBO_MAX; meowAt=-1e9; scareUntil=0;
onkeydown({key:' ',preventDefault(){}});
if(!(scareUntil>now())) throw new Error('ESPACIO no maullo');
meowAt=-1e9; scareUntil=0;
onkeydown({key:'Enter',preventDefault(){}});
if(!(scareUntil>now())) throw new Error('ENTER no maullo');
meowAt=-1e9; scareUntil=0;
onkeydown({key:'Enter',preventDefault(){},target:{tagName:'BUTTON'}});
if(scareUntil>now()) throw new Error('le robo el Enter a un boton del menu');
// y el espacio del teclado del telefono, que no cuenta como letra
meowAt=-1e9; scareUntil=0; const nEsp=log.length;
kb.value=' '; kb.oninput();
if(!(scareUntil>now())) throw new Error('el espacio del teclado del telefono no maullo');
if(log.length!==nEsp) throw new Error('el espacio se conto como letra del laberinto');
gen(); if(scareUntil||meowAt>-1e8) throw new Error('la partida nueva arranco con el maullido usado');
combo=0;

// 16e) el cartel del rango esquiva al gato en cualquier esquina
juega('clasico');
cv.clientWidth=cv.width; cv.clientHeight=cv.height;
rpop.offsetWidth=150; rpop.offsetHeight=20;
for(const q of [[0,0],[C-1,0],[0,R-1],[C-1,R-1],[(C/2)|0,0],[(C/2)|0,R-1]]){
  p={x:q[0],y:q[1]};
  rpopPlace();
  const M=7,
        L=rpop.style.left!=='auto'?parseInt(rpop.style.left):cv.width-M-150,
        U=rpop.style.top !=='auto'?parseInt(rpop.style.top ):cv.height-M-20;
  if(L<p.x*S+S&&L+150>p.x*S&&U<p.y*S+S&&U+20>p.y*S)
    throw new Error('el cartel del rango tapa al gato en '+q);
}
// con el gato arriba a la derecha el cartel se va a la izquierda, y entra desde ahi
p={x:C-1,y:0}; vis={x:C-1,y:0}; combo=0; lastRank=0; lastDraw=0; frame();
combo=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(!has(rpop,'l')) throw new Error('el cartel no se corrio del gato');
if(!has(rpop,'show')) throw new Error('el cartel corrido no se animo');
p={x:0,y:0}; vis={x:0,y:0}; combo=0; lastRank=0; lastDraw=0; frame();
combo=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(has(rpop,'l')) throw new Error('sin estorbo el cartel deberia quedarse a la derecha');
combo=0; lastRank=0; juega('clasico');

// 17) escritorio: el perfil lite NO se aplica, todo queda como estaba
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

// 18) pantalla completa: el boton la maneja, pero en escritorio nada la fuerza
cv.onclick(); tec.onclick(); lvlPick('clasico'); lvlPlay();
if(document.fullscreenElement) throw new Error('escritorio no deberia entrar solo a pantalla completa');
fsb.onclick();
if(!document.fullscreenElement) throw new Error('el boton no entro a pantalla completa');
if(fsb.className!=='on') throw new Error('el boton no quedo marcado');
fsb.onclick();
if(document.fullscreenElement) throw new Error('el boton no salio de pantalla completa');
if(fsb.className) throw new Error('el boton quedo marcado al salir');
if(fsb.style.display==='none') throw new Error('con API disponible el boton tiene que verse');

console.log('OK 22/22 | partida completa:',teclas,'teclas, precision',prec+'%');
`;

// ---- 19) el mismo juego en un teléfono: perfil lite, gameplay intacto ----
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
juega('clasico'); p={x:10,y:0}; vis={x:0,y:0};
lastDraw=0; frame(); const v1=vis.x;
if(!v1) throw new Error('el primer cuadro no dibujo');
frame();
if(vis.x!==v1) throw new Error('el tope de fps no salteo el cuadro repetido');

// y el juego se juega igual: partida completa y dificultad identica
botGame('clasico');
lastDraw=0; frame();
if(log.length!==hits+fails) throw new Error('log descuadrado en movil');
SNAP=snap();

// ---- 20) GUI del teléfono: barra arriba, rango de combo y menú ----
// la barra de info vive SIEMPRE arriba del laberinto: ya no se muda de borde
juega('clasico'); vis={x:0,y:0}; lastDraw=0; frame();
if(bar.className==='low') throw new Error('la barra ya no deberia mudarse de borde');
p={x:0,y:R-1}; vis={x:0,y:R-1}; lastDraw=0; frame();
if(bar.className==='low') throw new Error('la barra se movio con el gato abajo');

// el rango: al subir, la letra festeja y toda la GUI toma su color
combo=0; lastRank=0; lastDraw=0; frame();
combo=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(lastRank!==RANKS.length-1) throw new Error('la barra no siguio al rango');
if(brank.className!=='rank up') throw new Error('el ascenso de rango no se festejo');
if(!has(rpop,'rank')||!has(rpop,'show')) throw new Error('no aparecio el nombre del rango');
if(css['--rc']!==RANKS[RANKS.length-1].col) throw new Error('la GUI no tomo el color del rango');
combo=0; lastDraw=0; frame();
if(lastRank!==0) throw new Error('no volvio a bajar de rango');
if(brank.className==='rank up') throw new Error('bajar de rango no se festeja');
if(!bfill.style.width) throw new Error('el medidor de combo no se dibujo');

// el menú congela el reloj igual que el diálogo de skill issue
juega('clasico'); press(letters[Object.keys(letters)[0]]);
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

// ---- 20b) el maullido en el teléfono: no hay barra espaciadora a mano ----
juega('clasico'); combo=COMBO_MAX; meowAt=-1e9; scareUntil=0;
if(typeof bcombo.onclick!=='function') throw new Error('el rango de combo no es el boton del maullido');
bcombo.onclick({stopPropagation(){}});
if(!(scareUntil>now())) throw new Error('tocar el rango de combo no maullo');
scareUntil=0; combo=0; meowAt=-1e9;
bcombo.onclick({stopPropagation(){}});          // sin combo al tope: no maulla y no rompe
if(scareUntil>now()) throw new Error('maullo sin el combo al tope desde el telefono');

// ---- 21) pantalla completa automática: SOLO la primera vez ----
fsAuto=true; document.exitFullscreen();
cv.onclick();
if(!document.fullscreenElement) throw new Error('el primer toque no entro a pantalla completa');
document.exitFullscreen();
cv.onclick(); tec.onclick();
if(document.fullscreenElement) throw new Error('el automatico tiene que ser de una sola vez');
fsb.onclick();
if(!document.fullscreenElement) throw new Error('el boton no entro a pantalla completa');
fsb.onclick();
if(document.fullscreenElement) throw new Error('el boton no salio de pantalla completa');
cv.onclick();
if(document.fullscreenElement) throw new Error('el boton no deberia rearmar el automatico');
// y arrancar un nivel desde el selector tambien gasta el unico automatico
fsAuto=true; lvlShow(); lvlPick('clasico'); lvlPlay();
if(!document.fullscreenElement) throw new Error('entrar a la partida no uso el automatico');
document.exitFullscreen(); lvlShow(); lvlPick('clasico'); lvlPlay();
if(document.fullscreenElement) throw new Error('la segunda partida no deberia forzar pantalla completa');
`;

vm.runInNewContext(src+common+harness,ctx);
const mctx=mkctx(true);
vm.runInNewContext(src+common+mobile,mctx);
if(!ctx.SNAP||ctx.SNAP!==mctx.SNAP)
  throw new Error('el perfil movil movio algo del gameplay');

// ---- 22) CSS: en el teléfono TODO va alineado arriba y la barra sobre el tablero ----
const style=html.match(/<style>([\s\S]*?)<\/style>/)[1];
const bloque=sel=>{const i=style.indexOf(sel+'{');
  if(i<0) throw new Error('falta la regla '+sel);
  return style.slice(i+sel.length+1,style.indexOf('}',i))};
const lbody=bloque('.lite body');
if(!/justify-content:flex-start/.test(lbody)) throw new Error('la GUI del telefono no arranca arriba');
if(!/height:100dvh/.test(lbody)||!/overflow:hidden/.test(lbody))
  throw new Error('el telefono no se queda dentro de la pantalla');
const lbar=bloque('.lite #bar');
if(/position:(fixed|absolute)/.test(lbar)) throw new Error('la barra no deberia flotar sobre el laberinto');
if(!/flex:none/.test(lbar)) throw new Error('la barra tiene que conservar su alto');
if(/#bar\.low/.test(style)) throw new Error('quedo la regla de la barra que se mudaba de borde');
for(const sel of ['.lite #menu','.lite #lvl','.lite #skill'])
  if(!/align-items:start/.test(bloque(sel))) throw new Error(sel+' no esta alineado arriba');
const stage=html.match(/<div id=stage>[\s\S]*?<\/div>\s*<div id=scare>/)[0];
if(stage.indexOf('id=bar')>stage.indexOf('id=board'))
  throw new Error('la barra tiene que ir ANTES del tablero en el markup');
const lstage=bloque('.lite #stage');
if(!/--tuth/.test(lstage)) throw new Error('el tablero no le reserva alto al tutorial');
if(!/--vh/.test(lstage)) throw new Error('el tablero no se achica con el alto visible');

// ---- 23) tipografía: una sola familia para la GUI y el tablero ----
if(!/--ui:/.test(style)) throw new Error('falta la pila de fuentes --ui');
if(!/Arial Narrow/.test(style)) throw new Error('la pila condensada no llego al CSS');
if(!/var\(--ui\)/.test(bloque('body'))) throw new Error('el body no usa --ui');
if(/ui-monospace/.test(style)||/ui-monospace/.test(src))
  throw new Error('quedo monoespaciado suelto: la GUI y el tablero van con la misma familia');
if(!/const CF=/.test(src)||!/const DF=/.test(src)) throw new Error('el canvas no tiene su pila de fuentes');
for(const m of src.match(/x\.font=[^;]+;/g)||[])
  if(!/CF|DF/.test(m)) throw new Error('un texto del tablero quedo fuera de la familia: '+m);

// ---- 24) extra vibes: el latido llega a mucho mas que el canvas y la barra ----
const vibSel=[...style.matchAll(/\.vibes\s+([#.\w]+)/g)].map(m=>m[1]);
if(new Set(vibSel).size<10)
  throw new Error('el latido llega a muy pocos elementos: '+new Set(vibSel).size);
for(const sel of ['#log','#cmeter','#tut','#board','#btns','#bar'])
  if(vibSel.indexOf(sel)<0) throw new Error('extra vibes no llega a '+sel);
if(!/classList\[vibes\?'add':'remove'\]\('vibes'\)/.test(src))
  throw new Error('el boton no enciende la clase .vibes');
if(!/@keyframes rpopl/.test(style)) throw new Error('falta la entrada espejada del cartel del rango');
if(/var\(--rc,#4cf\)22/.test(style)) throw new Error('quedo el degradado con el hex roto de 5 digitos');

console.log('OK 26/26 | el perfil lite prende solo en pointer:coarse y no toca la dificultad');
