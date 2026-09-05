// Tests del juego sin navegador: se corre game.js en un vm con stubs mínimos de
// DOM/Audio/Image, y se leen style.css e index.html como texto.  node test.js
const fs=require('fs'), vm=require('vm'), path=require('path');
const html=fs.readFileSync(path.join(__dirname,'index.html'),'utf8');
const src=fs.readFileSync(path.join(__dirname,'game.js'),'utf8');

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
const src0=[BGM.src,VIBE.src];   // que pistas quedaron cargadas al abrir la pagina
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
  const q=[], b0=baby, g0=got, c0=combo, s0=stl;
  for(let n=0;n<=5;n++){ got=n; q.push(foeMs(),chaseP(),qteLen()) }
  for(let c=0;c<=20;c++){ combo=c; deal(); q.push(durBase,comboFill()) }
  for(let v=0;v<=STYLE_MAX+4;v++){ stl=v; q.push(rankI(),rankFill(),comboCol()) }
  for(let c=0;c<=COMBO_MAX+3;c++){ combo=c; q.push(styleCap().toFixed(4)) }
  const k0=kills;
  for(let k=1;k<=7;k++){ kills=k; q.push(qteStyle()) }
  kills=k0;
  for(let b=0;b<=3;b++){ baby=b; q.push(babyK(),dur()) }
  baby=b0; got=g0; combo=c0; stl=s0; deal();
  return JSON.stringify([C,R,S,POOL,COMBO_MAX,MS_LETRA,BEAT,VIBE_OFF,q,
                         [STYLE_ERR,STYLE_LOSS,STYLE_QTE,STYLE_HIT,STYLE_CHAIN,
                          STYLE_CHAIN_MAX,STYLE_DECAY,STYLE_MAX,
                          GRACE_MS,MEOW_MS,MEOW_CD,MEOW_R,RADAR_MS,RES_MS],
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
// el nivel 3 iba mas acelerado que el 2: ahora comparten la ventana por letra
const cl=LEVELS.find(l=>l.id==='clasico'), so=LEVELS.find(l=>l.id==='sotano');
if(cl.dur0!==so.dur0||cl.durMin!==so.durMin)
  throw new Error('el nivel 2 y el 3 tienen que compartir el timer de las letras');
got=0; deal(); if(durBase!==1700) throw new Error('la ventana por letra del clasico cambio');
combo=COMBO_MAX; deal(); if(durBase!==650) throw new Error('el minimo de la ventana cambio');
combo=0; deal();
got=0; qteStart(); const m0=qte.ms/qte.seq.length; qte=null;
got=5; qteStart(); const m5=qte.ms/qte.seq.length; qte=null;
if(m0!==m5||m0!==MS_LETRA) throw new Error('margen por letra no constante');
got=0;

// 5b) reparto: nada aparece pegado al jugador ni amontonado con lo demas.  El
// nivel 1 se juega en 9x7 y antes las monedas podian caer en la casilla de al
// lado y el gato a dos pasos: no habia tramo para reaccionar ni para respirar.
for(const id of ['tutorial','clasico','sotano']){
  setLevel(id);
  for(let v=0;v<60;v++){
    gen();
    if(LV.tut) spawn(coins,LV.coins);     // en el tutorial las suelta un paso, no gen()
    // el tramo final es el que aprieta: el gato camina al doble de velocidad, asi
    // que el respiro en CELDAS tiene que crecer para seguir valiendo los mismos
    // segundos.  Se reubica un gato como despues de un QTE ganado.
    for(const g of [0,LV.coins]){
      got=g; foes=[]; for(let i=0;i<(LV.foes||1);i++) foes.push(far());
      const d=flow();
      foes.forEach(f=>{ if(d[f]<FAR())
        throw new Error(id+': un gato entro a '+d[f]+' pasos (minimo '+FAR()+')') });
      foes.forEach((a,i)=>foes.slice(i+1).forEach(b=>{ if(sep(a,b)<SEP())
        throw new Error(id+': dos gatos amontonados a '+sep(a,b)+' celdas') }));
    }
    got=0;
    const dd=flow(), cosas=[...coins,...lamps];
    cosas.forEach(i=>{ if(dd[i]<NEAR())
      throw new Error(id+': una moneda quedo a '+dd[i]+' pasos del jugador') });
    // el sotano reparte diez cosas en 17x13: al ultimo le puede faltar una celda
    // para el minimo, pero nunca quedan pegadas
    cosas.forEach((a,i)=>cosas.slice(i+1).forEach(b=>{ if(sep(a,b)<SEP()-1)
      throw new Error(id+': dos monedas/faroles a '+sep(a,b)+' celdas') }));
  }
}
// el respiro del gato se mide en SEGUNDOS: mas rapida la caza, mas celdas de aire
setLevel('clasico'); gen();
got=0; const fa0=FAR(), fm0=foeMs();
got=LV.coins; const fa5=FAR();
if(!(fa5>fa0)) throw new Error('el respiro no crece cuando el gato acelera');
if(Math.abs(fa0*fm0-REST_MS)>fm0) throw new Error('FAR no vale REST_MS de caminata');
got=0;
setLevel('clasico');

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

// 8) assets externos + preload
if(!PJ.src.endsWith('assets/jugador.webp')||!FOE.src.endsWith('assets/gato.webp')) throw new Error('sprites');
if(!GIF.src.endsWith('assets/boom.gif')) throw new Error('gifs');
// el rage del dialogo (158KB) no se baja hasta que el dialogo aparece
sgif.src=''; nextAsk=0; hits=3; fails=9; checkSkill();
if(!paused||skill.style.display!=='grid') throw new Error('no aparecio el dialogo');
if(!String(sgif.src).endsWith('assets/rage.gif')) throw new Error('el dialogo no cargo su gif');
babyEnd(false);
if(!BGM.loop||!(BGM.volume>0&&BGM.volume<1)) throw new Error('musica mal configurada');
if([SCREAM,BANG,BGM].some(a=>a.preload!=='auto')) throw new Error('falta preload de audio');
BGM.paused=true; press('a'); if(BGM.paused) throw new Error('la musica no arranco con la 1a tecla');
if(!BGM.src.endsWith('assets/bgm.mp3')) throw new Error('la 1a tecla no le puso la pista al BGM');
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

// 9b) layout: fit() nunca excede el viewport visible, y en escritorio el tablero
// se lleva el espacio que sobra sin perder nitidez (K = pixeles por pixel de tablero)
fit();
if(parseInt(css['--w'])>visualViewport.width-16) throw new Error('el layout desborda: '+css['--w']);
if(css['--vh']!=='700px') throw new Error('fit() no publico el alto visible: '+css['--vh']);
// ventana angosta: sin las dos columnas el tablero se queda en su tamaño nativo
visualViewport.width=800; fit();
if(parseInt(css['--w'])!==510) throw new Error('sin las dos columnas deberia quedarse en 510px');
if(K!==1) throw new Error('a tamaño nativo el canvas no necesita resolucion de mas');
if(cv.width!==C*S) throw new Error('el canvas no siguio al tablero');
// consola de escritorio: el tablero crece con la pantalla...
visualViewport.width=1600; visualViewport.height=1000; fit();
const wDsk=parseInt(css['--w']);
if(wDsk<=510) throw new Error('el tablero no crecio con la pantalla: '+wDsk);
if(wDsk>1600-16) throw new Error('el tablero crecido se sale de ancho');
if(wDsk>1000*(C/R)) throw new Error('el tablero crecido no entra de alto');
// ...y el canvas sube de resolucion con el: agrandar por CSS lo dejaba borroso
if(K<2) throw new Error('el tablero crecido sigue dibujandose a resolucion nativa');
if(cv.width!==C*S*K||cv.height!==R*S*K) throw new Error('el canvas no tomo la resolucion K');
if(mz[0].width!==(C*S+PAD*2)*K) throw new Error('las paredes horneadas no siguieron a K');
setLevel('sotano');                          // un tablero mas ancho pide mas ancho
if(parseInt(css['--w'])<LV.C*S) throw new Error('el nivel grande no se dibuja entero');
// el cartel del tutorial le come alto al tablero: con el prendido, el tablero achica
juega('tutorial'); const wTut=parseInt(css['--w']);
tutOn=false; fit();
if(parseInt(css['--w'])<=wTut) throw new Error('el cartel del tutorial no le reserva alto al tablero');
tutOn=true; fit();
// pantalla baja: el tablero se ACHICA en vez de desbordar la pagina (con el ancho
// clavado en 510 no quedaba alto para la barra ni para el cartel y aparecia scroll)
visualViewport.height=560; fit();
const wBajo=parseInt(css['--w']);
if(wBajo>=510) throw new Error('en una pantalla baja el tablero no se achico: '+wBajo);
if(wBajo/(C/R)>560) throw new Error('el tablero sigue sin entrar de alto');
juega('clasico'); visualViewport.width=375; visualViewport.height=700; fit();
if(K!==1) throw new Error('en una ventana chica el canvas vuelve a resolucion nativa');

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
const tramos=new Set([0,5,10,COMBO_MAX].map(c=>{stl=c;return comboCol()}));
if(tramos.size!==4) throw new Error('los tramos del estilo no cambian de color');
combo=0; stl=0;

// 11b) rangos estilo DMC: letra, nombre, color y medidor hacia el rango siguiente
if(RANKS[0].k!=='D'||RANKS[RANKS.length-1].k!=='SSS') throw new Error('faltan los rangos D..SSS');
if(RANKS.some((r,i)=>i&&r.c<=RANKS[i-1].c)) throw new Error('los rangos no suben');
stl=0; if(rankI()!==0||rankFill()!==0) throw new Error('el rango no arranca en D vacio');
stl=RANKS[1].c; if(rankI()!==1||rankFill()!==0) throw new Error('el medidor no se vacia al subir');
stl=RANKS[1].c+1;
if(!(rankFill()>0&&rankFill()<1)) throw new Error('el medidor no llena hacia el rango siguiente');
stl=999; if(rankI()!==RANKS.length-1||rankFill()!==1) throw new Error('el tope del rango');
if(comboCol()!==RANKS[RANKS.length-1].col) throw new Error('el color no sale del rango');
if(rankI(RANKS[1].c)!==1) throw new Error('rankI() tiene que poder leer otro valor (el maximo)');
stl=0; combo=0;

// 11c) ESTILO y COMBO son dos medidores: el error borra uno y abolla el otro
juega('clasico'); gen(); foes=[]; coins=[]; combo=0; stl=0; nextAsk=1e9;
for(let i=0;i<6;i++) step();
if(combo!==6) throw new Error('los aciertos no suben el combo');
if(!(stl>0&&stl<=6*STYLE_HIT)) throw new Error('los aciertos no suben el estilo');
const s6=stl;
wrong();
if(combo!==0) throw new Error('el error tiene que borrar el combo');
if(stl!==s6-STYLE_ERR) throw new Error('el error no deberia reiniciar el estilo');
if(!(STYLE_LOSS>=STYLE_ERR*3)) throw new Error('perder contra un gato tiene que doler MUCHO mas');
// "tarde" es lo mismo que la letra equivocada
stl=10; combo=5; penalize(400,'#f70','late','-');
if(combo!==0||stl!==10-STYLE_ERR) throw new Error('el "tarde" no separa combo y estilo');
// perder contra un gato: la racha se corta igual, pero el estilo se hunde
stl=20; combo=7; kills=3; qteStart(); press([...POOL].find(c=>c!==qte.seq[0])); scareHide();
if(combo!==0) throw new Error('perder el QTE tiene que borrar el combo');
if(stl!==20-STYLE_LOSS) throw new Error('perder el QTE no hundio el estilo');
if(kills!==0) throw new Error('perder el QTE tiene que cortar la cadena de gatos');
// ganarlo suma mas que una letra suelta, y el estilo tiene tope
stl=0; combo=0; kills=0; qteStart(); qte.seq.slice().forEach(k=>press(k));
if(stl!==STYLE_QTE||combo!==1) throw new Error('ganar el QTE no sumo estilo y combo');
if(!(STYLE_QTE>STYLE_HIT*4)) throw new Error('un gato tiene que valer mucho mas que una letra');
stl=STYLE_MAX; styleUp(5);
if(stl!==STYLE_MAX) throw new Error('el estilo se pasa de su tope');
styleDown(STYLE_MAX*2); if(stl!==0) throw new Error('el estilo se fue abajo de cero');
// y el rango lee el estilo, no el combo
stl=RANKS[RANKS.length-1].c; combo=0;
if(rankI()!==RANKS.length-1) throw new Error('el rango deberia leer el estilo');
stl=0; combo=COMBO_MAX;
if(rankI()!==0) throw new Error('el combo ya no manda el rango');
combo=0; stl=0; kills=0; nextAsk=12;

// 11d) EL TECHO DEL COMBO: teclear bien sube el estilo, pero solo hasta donde lo
// deja la racha.  Sin combo el techo es cero y con la racha llena llega justo a S:
// caminar el laberinto, por limpio que sea, no da SS ni SSS.
combo=0; if(styleCap()!==0) throw new Error('sin combo el techo del estilo no es cero');
if(Math.abs((combo=COMBO_MAX, styleCap())-RANKS[4].c)>1e-9)
  throw new Error('con el combo lleno el techo tiene que llegar justo a S');
combo=COMBO_MAX*3; if(styleCap()!==RANKS[4].c) throw new Error('el techo se pasa de S');
for(let c=1;c<=COMBO_MAX;c++){ combo=c-1; const a=styleCap(); combo=c;
  if(!(styleCap()>a)) throw new Error('cada punto de combo tiene que subir el techo') }
// una letra suma... hasta el techo, y ahi deja de sumar
combo=COMBO_MAX; stl=0; styleHit();
if(stl!==STYLE_HIT) throw new Error('la letra no sumo dentro del techo');
stl=RANKS[4].c; styleHit();
if(stl!==RANKS[4].c) throw new Error('la letra paso el techo del combo');
combo=0; stl=8; styleHit();
if(stl!==8) throw new Error('sin combo las letras siguen sumando estilo');
// y las letras SOLAS no llegan a SS: por muchas que se tecleen, topan en S
combo=COMBO_MAX; stl=0; for(let i=0;i<200;i++) styleHit();
if(rankI()!==4) throw new Error('teclear solo tendria que topar exactamente en S');

// 11e) LA CADENA DE GATOS: es lo unico que pasa de S, y cada gato seguido paga mas
kills=1; const q1=qteStyle();
if(q1!==STYLE_QTE) throw new Error('el primer gato de la cadena paga el minimo');
for(let k=2;k<=STYLE_CHAIN_MAX+1;k++){ kills=k-1; const a=qteStyle(); kills=k;
  if(qteStyle()-a!==STYLE_CHAIN) throw new Error('la cadena no paga STYLE_CHAIN mas por gato') }
kills=STYLE_CHAIN_MAX+1; const qtop=qteStyle();
kills=99; if(qteStyle()!==qtop) throw new Error('la cadena no tiene tope');
// tres gatos encadenados desde el techo de las letras SI pasan de S
combo=COMBO_MAX; stl=RANKS[4].c; kills=0;
for(let i=0;i<3;i++){ kills++; styleUp(qteStyle()) }
if(rankI()<=4) throw new Error('encadenar gatos tiene que pasar de S');
// y el resumen guarda la cadena mas larga
gen(); foes=[]; kills=0; maxKills=0;
qteStart(); qte.seq.slice().forEach(k=>press(k));
qteStart(); qte.seq.slice().forEach(k=>press(k));
if(kills!==2||maxKills!==2) throw new Error('dos gatos seguidos no armaron la cadena');
qteStart(); press([...POOL].find(c=>c!==qte.seq[0])); scareHide();
if(kills!==0||maxKills!==2) throw new Error('el pico de la cadena tiene que quedar guardado');
combo=0; stl=0; kills=0; maxKills=0;

// 11f) LO QUE PASA DEL TECHO SE ESCURRE: un rango alto no se guarda, se sostiene
juega('clasico'); gen(); foes=[]; coins=[]; nextAsk=1e9;
step();                                   // arranca el reloj (t0)
combo=0; stl=20; stlAt=0; lastDraw=0; frame();   // el primer cuadro solo fija stlAt
// frame() tapa el dt en 250 ms (una pestana dormida no puede vaciar el medidor de
// un saque), asi que un segundo de juego son cuatro cuadros de 250
const seg=(ms)=>{ for(let m=0;m<ms;m+=250){ stlAt=now()-250; lastDraw=0; frame() } };
seg(1000);
if(Math.abs(stl-(20-STYLE_DECAY))>.05) throw new Error('el estilo por encima del techo no se escurrio');
// pero nunca por debajo del techo que sostiene el combo
combo=COMBO_MAX; stl=RANKS[4].c; seg(4000);
if(stl!==RANKS[4].c) throw new Error('el escurrido se comio lo que sostiene el combo');
// y el escurrido no baja de cero ni con el combo roto
combo=0; stl=.2; seg(4000);
if(stl!==0) throw new Error('el estilo se fue abajo de cero escurriendose');

// 11g) EL PROMEDIO: el rango del resumen es el estilo PROMEDIO de la partida, no
// el pico ni el que quedo al final.  Medio minuto en D y un pico de SSS al final
// tienen que dar un promedio bajo, que es justo lo que el maximo escondia.
juega('clasico'); gen(); foes=[]; coins=[]; nextAsk=1e9;
step();
stlSum=0; stlT=0; combo=COMBO_MAX;
stl=0; stlAt=now(); seg(9000);                    // 9 s en D...
stl=RANKS[RANKS.length-1].c; maxStl=stl; seg(1000); // ...y 1 s en SSS
if(rankI(maxStl)!==RANKS.length-1) throw new Error('el pico deberia ser SSS');
if(rankI(avgStl())!==0) throw new Error('el promedio no puede ser el pico');
if(!(avgStl()>0&&avgStl()<RANKS[1].c)) throw new Error('el promedio no salio de la integral');
// al reves: sostener S toda la partida SI da S de promedio (y el combo lleno lo
// sostiene solo: es justo el techo de las letras, asi que no se escurre)
stlSum=0; stlT=0; stl=RANKS[4].c; stlAt=now(); seg(10000);
if(rankI(avgStl())!==4) throw new Error('sostener el rango no lo dio en el promedio');
// las pausas no cuentan: con el juego congelado el promedio no se mueve
const sT=stlT; menuOpen(); lastDraw=0; frame(); frame();
if(stlT!==sT) throw new Error('el promedio corrio con el juego en pausa');
menuClose();
// y gen() lo deja todo de cero
gen(); foes=[];
if(stlSum||stlT||stlAt||kills||maxKills||maxStl||stl)
  throw new Error('la partida nueva heredo el estilo de la anterior');
if(avgStl()!==0) throw new Error('sin partida el promedio no es cero');
nextAsk=12;

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
// el gato entra LEJOS: hay que verlo venir, no encontrarselo encima
if(flow()[foes[0]]<FAR()) throw new Error('el gato del tutorial entro pegado al jugador');
// un jugador rapido se le escapa al gato: el paso tiene que destrabarse solo, pero
// el gato NO se aparece encima.  El primer empujon lo deja a dos pasos y el resto
// lo camina el solo: el paso dice "miralo venir", un teletransporte lo desmiente
tAt-=TUT_PUSH+1; tutCheck();
if(qte||brief.className==='on') throw new Error('el primer empujon cayo encima del jugador');
if(foes[0]===cell()) throw new Error('el gato aparecio en la casilla del jugador');
if(flow()[foes[0]]>3) throw new Error('el primer empujon no acerco al gato');
// y si aun asi se le sigue escapando, ahi si se da el encuentro por hecho
tAt-=TUT_GRAB+1; tutCheck();
// pero el PRIMER encuentro no arranca de una: el juego se frena y lo explica
if(qte) throw new Error('el primer QTE del tutorial arranco sin explicarse');
if(brief.className!=='on') throw new Error('el primer encuentro no abrio el cartel');
if(!paused) throw new Error('el cartel del primer encuentro no congelo el juego');
if(typeof bok.onclick!=='function') throw new Error('el cartel no tiene boton');
// NINGUNA tecla cierra el cartel.  El cartel explica un QTE, que se gana tecleando:
// con "cualquier tecla es ESTOY LISTO" la letra que el jugador ya tenia en el aire
// para moverse se llevaba puesta la unica explicacion que hay del sistema
const nb=log.length, cb=cell(), tA=t0, sA=shownAt;
for(const k of ['a','Enter',' ','z']) press(k);
if(!paused||brief.className!=='on') throw new Error('una tecla suelta cerro el cartel');
if(log.length!==nb||cell()!==cb) throw new Error('las teclas sobre el cartel se jugaron igual');
// y el boton tampoco vale de entrada: el clic que ya venia en camino cuando salto
// el cartel no cuenta, primero hay que haber podido leerlo
briefAt=now(); bok.onclick();
if(!paused||brief.className!=='on') throw new Error('ESTOY LISTO se dejo apretar sin tiempo de leer');
// pasado ese rato el boton —y solo el boton— sigue el juego
briefAt-=BRIEF_LOCK+1; pauseAt-=400;                        // simula 400ms leyendo
bok.onclick();
if(paused||brief.className) throw new Error('el boton no cerro la pausa');
if(log.length!==nb||cell()!==cb) throw new Error('cerrar el cartel jugo una letra');
if(Math.abs((t0-tA)-400)>50||Math.abs((shownAt-sA)-400)>50)
  throw new Error('leer el cartel le costo segundos de partida');
if(!qte) throw new Error('el QTE no arranco despues de la explicacion');
// y ese primero es el blando: secuencia corta y mas del doble de margen por letra
if(qte.seq.length!==TUT_QTE_N) throw new Error('el primer QTE del tutorial no es el corto');
if(qte.ms/qte.seq.length<=MS_LETRA) throw new Error('el primer QTE no da mas tiempo por letra');
if(tstep!==3) throw new Error('el empujon no deberia saltear el paso');
qte.seq.slice().forEach(k=>press(k)); tutCheck();
if(tstep!==4) throw new Error('el QTE limpio no cerro el paso');
// ganarlo deja un respiro LARGO: aparecen las monedas y hay un cartel nuevo que
// leer, y con dos segundos el gato reubicado ya venia de vuelta
if(graceT-now()<=GRACE_MS) throw new Error('el tutorial no da el respiro largo');
// el cartel se explica UNA sola vez por partida
qteStart(); if(brief.className==='on') throw new Error('el cartel volvio a salir');
qte=null;

// 14b) DETERMINACION: el paso la MUESTRA en su propio cartel y despues la hace usar
if(!has(hab,'on')||!has(hab,'det')) throw new Error('el paso de la determinacion no abrio su cartel');
if(!paused) throw new Error('el cartel de la determinacion no congelo el juego');
if(!det) throw new Error('el paso no regalo la carga que hay que gastar');
if(foes.length) throw new Error('el paso de la determinacion tendria que quedar sin gatos');
// y tampoco se cierra con el teclado: el cartel que sigue explica el MAULLIDO, que
// se suelta con ESPACIO, y el espacio que ya venia en camino se lo llevaria puesto
const nh=log.length, ch=cell();
for(const k of ['a','Enter',' ','z']) press(k);
if(!paused||!has(hab,'on')) throw new Error('una tecla suelta cerro el cartel de habilidades');
if(log.length!==nh||cell()!==ch) throw new Error('las teclas sobre el cartel se jugaron igual');
habAt=now(); hok.onclick();
if(!paused) throw new Error('ENTENDIDO se dejo apretar sin tiempo de leer');
habAt-=HAB_LOCK+1; pauseAt-=300; hok.onclick();
if(paused||hab.className) throw new Error('el boton no cerro el cartel de habilidades');
tutCheck(); if(tstep!==4) throw new Error('el paso de la determinacion se cerro solo');
// teclear normal no alcanza: hay que ATRAVESAR un muro con la letra violeta
const plain=()=>{ const d=Object.keys(letters).find(w=>!phase[w]); press(letters[d]) };
let gv=0; while(!Object.keys(phase).length&&gv++<40) plain();
const vd=Object.keys(phase)[0];
if(!vd) throw new Error('la determinacion no marco ningun muro');
plain(); tutCheck();
if(tstep!==4) throw new Error('una letra normal cerro el paso de la determinacion');
let gw=0; while(!Object.keys(phase).length&&gw++<40) plain();
const cAnt=cell(), dAnt=det;
press(letters[Object.keys(phase)[0]]);
if(det!==dAnt-1) throw new Error('la letra violeta no gasto la carga');
if(cell()===cAnt) throw new Error('la letra violeta no atraveso el muro');
tutCheck(); if(tstep!==5) throw new Error('atravesar el muro no cerro el paso');

// 14c) MAULLIDO: mismo trato, y el paso pone gatos para que se los vea huir
if(!has(hab,'on')||!has(hab,'meow')) throw new Error('el paso del maullido no abrio su cartel');
if(!paused) throw new Error('el cartel del maullido no congelo el juego');
if(!meowOn||meowCd(now())) throw new Error('el paso no dejo el maullido listo');
// y el gato es EL del tutorial, uno solo: dos desconocidos no son "el enemigo
// con el que jugaste todo el nivel", que es a quien tiene que ahuyentar
if(foes.length!==1) throw new Error('el paso del maullido no puso EL gato que ahuyentar');
habAt=now()-HAB_LOCK-1; hok.onclick();
if(paused||hab.className) throw new Error('el cartel del maullido no se cerro');
tutCheck(); if(tstep!==5) throw new Error('el paso del maullido se cerro sin maullar');
plain(); tutCheck(); if(tstep!==5) throw new Error('una letra cerro el paso del maullido');
if(!meow()) throw new Error('el maullido no salio');
tutCheck(); if(tstep!==6) throw new Error('maullar no cerro el paso');

if(coins.length!==LV.coins) throw new Error('el paso de las monedas no las solto');
// el maullido AHUYENTA, no borra: el gato tiene que seguir en el laberinto.  El
// paso siguiente lo desaparecia y desmentia lo que el anterior acababa de ensenar
if(foes.length!==1) throw new Error('el paso de las monedas se llevo puesto al gato ahuyentado');
got=LV.coins; coins=[]; tutCheck();
if(tstep!==7||!exitOpen()) throw new Error('el paso de la salida no arranco');
win=true; tutCheck();
if(tutOn||tut.className) throw new Error('el tutorial no termino');
// terminarlo GANANDO ya no salta al selector: primero va la pantalla de resultados
if(lvlOn) throw new Error('el tutorial ganado no deberia abrir el selector');
if(css['--tuth']!=='0px') throw new Error('el tutorial no le devolvio el alto al tablero');
// pero si el nivel se cierra sin ganar (no deberia pasar), el selector sigue ahi
win=false; tutOn=true; tstep=TUT.length-1; tutEnd();
if(!lvlOn||lvl.className!=='open') throw new Error('sin ganar, terminar el tutorial va al selector');
lvlHide(); win=false;
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

// 16b) RESPIRO: vencer a un gato congela 2s el reloj de la letra y a los gatos
juega('clasico'); gen(); foes=[];
if(GRACE_MS!==2000) throw new Error('el respiro tiene que durar 2s');
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
// ...y del otro lado del muro se arranca de cero: la celda a la que cruzaste es
// tu nuevo punto de partida.  Devolver al jugador atravesando la pared lo dejaba
// del lado equivocado y SIN carga con que volver a cruzar, o sea peor que el
// castigo normal; ahora un error ahi no lo mueve de donde esta.
if(trail.length) throw new Error('cruzar un muro tiene que borrar el camino de migas');
wrong(); if(cell()!==destD) throw new Error('un error devolvio al jugador atravesando el muro');
// las cargas se acumulan hasta el tope y gen() las borra
det=0; qteWins=0;
for(let i=0;i<DET_EVERY*(DET_MAX+1);i++){ qteStart(); qte.seq.slice().forEach(k=>press(k)) }
if(det!==DET_MAX) throw new Error('las cargas no toparon en DET_MAX');
gen(); if(det||qteWins) throw new Error('la partida nueva arranco con determinacion');

// 16d) AHUYENTADOR: se ARMA al llenar el combo una vez y despues solo espera el
// cooldown.  Pedirlo al tope EN EL MOMENTO lo volvia inservible: justo cuando un
// gato te alcanza es cuando el combo se esta por romper.
juega('clasico'); gen(); foes=[]; coins=[]; combo=0; meowAt=-1e9; scareUntil=0; nextAsk=1e9;
if(MEOW_CD!==45000||MEOW_MS!==2500) throw new Error('el maullido cambio de numeros');
step();
if(meowOn) throw new Error('el maullido no deberia arrancar armado');
if(meow()) throw new Error('maullo sin haber cargado nunca el combo');
for(let i=0;i<COMBO_MAX;i++) step();          // el combo toca el tope: queda armado
if(combo<COMBO_MAX) throw new Error('el bot no llego al tope del combo');
if(!meowOn) throw new Error('llenar el combo no armo el maullido');
if(!meowReady()) throw new Error('armado y sin cooldown deberia estar listo');
const cA=combo;
if(!meow()) throw new Error('no maullo con el maullido armado');
if(combo!==cA) throw new Error('el maullido no deberia gastar el combo');
if(!(scareUntil>now())||scareUntil-now()>MEOW_MS+60) throw new Error('el susto no dura 2.5s');
if(meow()) throw new Error('maullo dos veces sin esperar el cooldown');
meowAt=now()-MEOW_CD+1000;
if(meowReady()) throw new Error('el cooldown de 45s se corto antes');
meowAt=now()-MEOW_CD-1;
if(!meowReady()) throw new Error('el cooldown no se cumplio');
// y ESTA es la gracia: sigue disponible con el combo roto
combo=0; wrong();
if(!meowOn||!meowReady()) throw new Error('romper el combo no deberia desarmar el maullido');
if(!meow()) throw new Error('el maullido tiene que servir justo cuando se rompe el combo');
// los gatos cercanos se ALEJAN y mientras huyen no abren QTE
gen(); foes=[]; meowOn=true; combo=0; meowAt=-1e9; scareUntil=0;
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
meowOn=true; meowAt=-1e9; scareUntil=0;
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
gen(); if(scareUntil||meowAt>-1e8||meowOn)
  throw new Error('la partida nueva arranco con el maullido usado');
combo=0; nextAsk=12;

// 16f) RADAR: en el sotano el maullido tambien es un eco de monedas y gatos
juega('sotano'); gen(); foes=[far()]; meowOn=true; meowAt=-1e9; radar=null;
const rev0=revealT;
if(!meow()) throw new Error('no maullo en el sotano');
if(!radar) throw new Error('el maullido no dejo radar en el sotano');
if(radar.pts.length!==coins.length+foes.length)
  throw new Error('el radar no marco todas las monedas y los gatos');
if(!radar.pts.some(m=>m.k)||!radar.pts.some(m=>!m.k))
  throw new Error('el radar tiene que marcar las dos cosas');
// es una PISTA, no un mapa: cada marca miente hasta RADAR_J celdas, pero no mas
coins.forEach((c,i)=>{ const m=radar.pts[i];
  if(Math.abs(m.x-(c%C+.5))>RADAR_J+1e-9||Math.abs(m.y-((c/C|0)+.5))>RADAR_J+1e-9)
    throw new Error('la marca de la moneda no cae cerca de la moneda');
  if(m.x===c%C+.5&&m.y===(c/C|0)+.5) throw new Error('la marca es exacta: eso ya es un mapa') });
// y NO enciende el sotano: la niebla y los faroles quedan como estaban
if(revealT!==rev0) throw new Error('el radar no deberia encender el sotano');
lastDraw=0; frame();                          // se dibuja sin romper el cuadro
// a la vista no hace falta: el radar es del sotano
juega('clasico'); gen(); foes=[]; meowOn=true; meowAt=-1e9; radar=null; meow();
if(radar) throw new Error('el radar es del sotano, no del clasico');
juega('clasico'); combo=0;

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
p={x:C-1,y:0}; vis={x:C-1,y:0}; stl=0; lastRank=0; lastDraw=0; frame();
stl=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(!has(rpop,'l')) throw new Error('el cartel no se corrio del gato');
if(!has(rpop,'show')) throw new Error('el cartel corrido no se animo');
p={x:0,y:0}; vis={x:0,y:0}; stl=0; lastRank=0; lastDraw=0; frame();
stl=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(has(rpop,'l')) throw new Error('sin estorbo el cartel deberia quedarse a la derecha');
stl=0; combo=0; lastRank=0; juega('clasico');

// 26) PANTALLA DE RESULTADOS: todo nivel termina en su resumen.  El tutorial
// abria el selector encima del final y el jugador no llegaba a ver ni su tiempo.
juega('tutorial'); botGame();
if(!win) throw new Error('el bot no gano el tutorial');
if(resOn) throw new Error('el resumen no deberia entrar de golpe');
if(!resAt) throw new Error('ganar no dejo el resumen en camino');
lastDraw=0; frame();
if(resOn) throw new Error('el resumen entro sin esperar los RES_MS');
if(lvlOn) throw new Error('el tutorial ganado no deberia abrir el selector');
resAt=now()-1; lastDraw=0; frame();
if(!resOn||res.className!=='open') throw new Error('el resumen no aparecio al terminar');
if(lvlOn) throw new Error('el selector se abrio igual encima del resumen');
// las tres salidas: el nivel siguiente, otra vuelta al mismo, o el selector
for(const b of [rnext,ragain,rlvls]) if(typeof b.onclick!=='function')
  throw new Error('al resumen le falta una salida');
if(rnext.style.display==='none') throw new Error('despues del tutorial hay nivel siguiente');
rnext.onclick();
if(resOn||res.className) throw new Error('el resumen no cerro al elegir');
if(LV.id!=='clasico') throw new Error('SIGUIENTE no arranco el nivel de al lado');
if(win||t0||got) throw new Error('SIGUIENTE no arranco una partida nueva');
// REINTENTAR rehace el mismo nivel
botGame('clasico'); resAt=now()-1; lastDraw=0; frame();
if(!resOn) throw new Error('el clasico no mostro su resumen');
ragain.onclick();
if(LV.id!=='clasico'||win||resOn) throw new Error('REINTENTAR no rehizo el mismo nivel');
// del ultimo nivel no se sigue a ningun lado; NIVELES lleva al selector
botGame('sotano'); resAt=now()-1; lastDraw=0; frame();
if(!resOn) throw new Error('el sotano no mostro su resumen');
if(rnext.style.display!=='none') throw new Error('el ultimo nivel ofrecio un siguiente');
rlvls.onclick();
if(!lvlOn||resOn) throw new Error('NIVELES no llevo al selector');
lvlHide(); juega('clasico');

// 30) EL AVISO DE SKILL ISSUE: apagable, y cada NO lo vuelve menos insistente
// Decir "asi esta bien" y que el cartel vuelva a los 25 teclazos es no haber
// escuchado la respuesta: cada NO tiene que alargar la espera Y bajar el umbral.
juega('clasico'); noes=0; baby=0; hits=0; fails=0; skillOff=false;
const acc0=skillAcc();
hits=10; fails=0; babyEnd(true);
const askSi=nextAsk-(hits+fails);
if(askSi!==25) throw new Error('el SI cambio su cooldown corto');
if(baby!==1) throw new Error('el SI no dio el baby point');
if(skillAcc()!==acc0) throw new Error('aceptar la ayuda no deberia bajar el umbral');
babyEnd(false);
const askNo1=nextAsk-(hits+fails);
if(!(askNo1>askSi)) throw new Error('el NO tiene que esperar mas que el SI: '+askNo1);
if(!(skillAcc()<acc0)) throw new Error('el NO no bajo el umbral de precision');
babyEnd(false);
const askNo2=nextAsk-(hits+fails);
if(!(askNo2>askNo1)) throw new Error('el segundo NO tiene que esperar todavia mas');
if(!(skillAcc()<0.8-0.12)) throw new Error('el segundo NO no bajo mas el umbral');
if(skillAcc()<0.45) throw new Error('el umbral no puede caer por debajo del piso');
// ...y con el interruptor apagado no aparece nunca, por mal que se juegue
noes=0; baby=0; hits=2; fails=30; nextAsk=0; paused=false; skillSet(true);
push('a','bad');
if(paused||skill.style.display==='grid') throw new Error('el cartel salio con el aviso apagado');
skillSet(false);
push('a','bad');
if(!paused) throw new Error('con el aviso prendido el cartel tiene que salir');
babyEnd(false); noes=0; baby=0; hits=0; fails=0; nextAsk=12;
// el interruptor es UNO solo aunque se toque desde dos lugares
skb.onclick(); if(!skillOff) throw new Error('el boton del menu no apago el aviso');
lskb.onclick(); if(skillOff) throw new Error('el boton del selector no volvio a prenderlo');
if(has(skb,'on')!==has(lskb,'on')) throw new Error('los dos interruptores muestran estados distintos');
skillSet(false);

// 31) BABY POINTS ANTES DE ENTRAR: la dificultad se elige con la ficha a la vista
startBaby=0; babyStep(-1);
if(startBaby!==0) throw new Error('los baby points no pueden ser negativos');
for(let i=0;i<BABY_MAX+3;i++) babyStep(1);
if(startBaby!==BABY_MAX) throw new Error('los baby points pasaron su tope');
babyStep(-1);
if(startBaby!==BABY_MAX-1) throw new Error('el menos no descuenta');
// babyK toma el valor suelto para poder mostrar lo que todavia no se aplico
if(babyK(2)!==1+0.35*2) throw new Error('babyK no acepta un valor suelto');
baby=0; if(babyK()!==babyK(baby)) throw new Error('babyK sin argumento dejo de leer baby');
startBaby=2; lvlPick('clasico'); lvlPlay();
if(baby!==2) throw new Error('entrar al nivel no aplico los baby points elegidos');
// y valen lo mismo que los que regala el cartel: mas ventana por letra y por QTE
got=0; combo=0; deal(); const durBaby=dur();
baby=0; const durSin=dur();
if(!(durBaby>durSin)) throw new Error('los baby points elegidos no dan mas tiempo');
baby=2; qteStart(); const qb=qte.ms; qte=null;
baby=0; qteStart(); const qa=qte.ms; qte=null;
if(!(qb>qa)) throw new Error('los baby points elegidos no aflojan el QTE');
startBaby=0; baby=0; babySync();

// 32) EL ACECHADOR DEL SOTANO: cara, grito y salida propios
juega('sotano');
if(!STALK.src) throw new Error('el sotano no bajo la cara del acechador');
if(!LOBO.src.endsWith('assets/lobotomy.mp3')) throw new Error('el sotano no bajo el grito del acechador');
// el QTE se acuerda de QUIEN te alcanzo: los acechadores son los primeros de foes
foes=[cell(),far()]; qteStart();
if(!qte.st) throw new Error('el QTE no marco que te alcanzo el acechador');
qte=null;
foes=[far(),cell()]; qteStart();   // el segundo ya es un gato negro comun
if(qte.st) throw new Error('un gato comun no puede pasar por acechador');
qte=null;
// el jumpscare del acechador usa SU grito y se va con fade; el del resto, no
mufSlow=0; scareShow(true);
if(scareA!==LOBO) throw new Error('el acechador no grito con su propio audio');
if(scare.className!=='fade') throw new Error('el jumpscare del acechador no se desvanece');
if(!scareFade) throw new Error('el fade del acechador no arranco');
if(!mufSlow) throw new Error('el jumpscare no pidio el fade-in largo de la musica');
scareHide();
if(frozen||scare.className||scareFade||scareA) throw new Error('el susto no se limpio al cerrarse');
scareShow(false);
if(scareA!==SCREAM) throw new Error('un gato comun no puede robarle el grito al acechador');
if(scare.className==='fade'||scareFade) throw new Error('el susto de siempre corta, no se desvanece');
scareHide();
juega('clasico');

// 33) LA MUSICA SE HUNDE EN EL QTE Y VUELVE DE A POCO
if(vibes) vibe.onclick();
juega('clasico'); BGM.muted=false;
const rn=performance.now; let FT=rn();
performance.now=()=>FT;                       // reloj de mentira: el ducking va por dt
// de a 100ms: el dt de cada cuadro esta topado en 250 (ver frame), que es lo que
// tapa el salto de una pestana dormida.  Un unico salto grande no vale.
const paso=(ms,n)=>{ for(let i=0;i<n;i++){ FT+=ms; lastDraw=0; frame() } };
muf=0; mufAt=0; mufV=-1; mufSlow=0;
qteStart(); lastDraw=0; frame();              // el primer cuadro solo fija mufAt
const vol0=BGM.volume, qms=qte.ms;
paso(100,Math.round(qms*0.5/100));
if(!(muf>0.4&&muf<0.6)) throw new Error('a mitad del QTE la musica tendria que ir por la mitad: '+muf);
if(!(BGM.volume<vol0)) throw new Error('el volumen no bajo durante el QTE');
paso(100,Math.round(qms*0.45/100));
if(muf<0.9) throw new Error('al final del QTE la musica tiene que estar casi muda: '+muf);
if(!(BGM.volume<BGM.v0*0.25)) throw new Error('el volumen del final del QTE quedo alto: '+BGM.volume);
// perderlo la deja abajo y la trae por el camino LARGO
qteEnd(false);
if(!mufSlow) throw new Error('el jumpscare no pidio el fade-in largo');
scareHide();
paso(250,1);
if(muf<=0) throw new Error('despues del susto la musica no puede volver de golpe');
paso(250,Math.ceil(MUF_IN/250)+1);
if(muf!==0||mufSlow) throw new Error('la musica no termino de volver: '+muf);
if(BGM.volume!==BGM.v0) throw new Error('el volumen no volvio al de siempre: '+BGM.volume);
// ...y ganar un QTE la devuelve por el camino corto, que es mas de tres veces mas rapido
if(!(MUF_IN>MUF_OUT*3)) throw new Error('el fade-in del susto tiene que ser mucho mas largo');
muf=1; mufSlow=0; paso(250,Math.ceil(MUF_OUT/250)+1);
if(muf!==0) throw new Error('sin susto la musica tiene que volver enseguida');
performance.now=rn;

// 34) ESQUIVE AL CRUCE: el gato pasa de largo y eso ahora paga
juega('clasico'); gen(); foes=[]; det=0; combo=0; stl=0; dodges=0;
step(); const celB=cell(), celA=trail[trail.length-1];
foes=[celA]; prevFoe=[];                        // el gato viene desde celA hacia celB
wrong();                                      // el jugador se equivoca y retrocede A celA
if(cell()!==celA) throw new Error('el retroceso no lo dejo en la celda del gato');
stl=0; dodge(celA,celB);                          // y el gato entra a la celda que dejo
if(dodges!==1) throw new Error('el cruce no se conto como esquive');
if(stl!==STYLE_DODGE) throw new Error('el esquive no pago el bonus de estilo: '+stl);
if(!(STYLE_DODGE>STYLE_QTE)) throw new Error('esquivar al cruce tiene que pagar mas que un QTE ganado');
// y NO es esquive cualquier otra cosa: ni un gato que va a otro lado, ni el
// mismo cruce dos minutos despues (si no, perseguirte de atras pagaria siempre)
dodges=0; dodge(celA,celA);
if(dodges) throw new Error('conto un esquive donde no hubo cruce');
dodge(celB,celB);
if(dodges) throw new Error('conto un esquive con el gato en otra celda');
pfrom.t-=DODGE_MS+1; dodge(celA,celB);
if(dodges) throw new Error('el esquive tiene que ser casi al mismo tiempo, no cuando sea');
// ...y el cruce tiene que llegar desde moveFoes, no solo de llamar a dodge a mano.
// Para que el gato no pueda ir a otro lado: un pasillo con DOS salidas y el gato
// viniendo de una, asi que la unica que le queda es la celda que dejo el jugador.
juega('clasico'); scareUntil=0; dodges=0; stl=0;
let cX=-1; for(let i=0;i<C*R;i++) if(open(i).length===2){ cX=i; break }
if(cX<0) throw new Error('no hay pasillo de dos salidas donde probar el cruce');
const [oUno,oOtro]=open(cX);
p={x:cX%C,y:cX/C|0}; vis={x:p.x,y:p.y};
pfrom={c:oUno,t:now()}; foes=[cX]; prevFoe=[oOtro];
moveFoes();
if(foes[0]!==oUno) throw new Error('el gato no tomo el unico camino que le quedaba');
if(dodges!==1) throw new Error('moveFoes no paga el esquive: el bonus no se cobra nunca');
if(stl!==STYLE_DODGE) throw new Error('el esquive desde moveFoes no pago estilo');

// el resumen tiene que poder contarlos sin romperse
dodges=3; win=true; tEnd=1000; resShow(); resHide(); win=false; dodges=0;

// 17) escritorio: el perfil lite NO se aplica, todo queda como estaba
if(MOBILE) throw new Error('escritorio detectado como movil');
if(PERF.scan||PERF.glow!==1||PERF.fps||PERF.hudMs||PERF.dust!==1)
  throw new Error('el perfil lite se colo en escritorio');
if(document.documentElement.cls) throw new Error('escritorio no lleva la clase lite');
if(BGM.preload!=='auto') throw new Error('escritorio sin preload de audio');
if(VIBE.preload!=='none') throw new Error('las vibes se precargan sin pedirlas en escritorio');
if(!src0[0]) throw new Error('escritorio deberia cargar el BGM de entrada');
if(src0[1]) throw new Error('escritorio bajo las vibes sin pedirlas');
// el horneado de paredes no depende del perfil
if(!baked||!mz[0]) throw new Error('escritorio no horneo las paredes');
if(BLUR[0]!==10||BLUR[1]!==26) throw new Error('las capas no cubren el rango del latido');
if(mz[0].width!==cv.width+PAD*2) throw new Error('la capa horneada va con margen');
if(!mz[1]) throw new Error('extra vibes deberia haber horneado la capa del latido');
gen(); foes=[]; p={x:10,y:0}; vis={x:0,y:0};   // vis persigue a p: avanza una vez por cuadro
lastDraw=0; frame(); const v1=vis.x; frame();
if(!v1) throw new Error('el cuadro no dibujo');
// el escritorio usa LA MISMA barra que el telefono (ver 25), no el h2+p de antes
if(bname.style.color!==LV.col) throw new Error('la barra de escritorio no trae el nivel');
if(!bfill.style.width) throw new Error('el medidor del rango no llego al escritorio');
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

console.log('OK 31/31 | partida completa:',teclas,'teclas, precision',prec+'%');
`;

// ---- 19) el mismo juego en un teléfono: perfil lite, gameplay intacto ----
const mobile=`
if(!MOBILE) throw new Error('no detecto el telefono');
if(!(PERF.glow<1)||!PERF.fps||!PERF.hudMs||!(PERF.dust<1))
  throw new Error('perfil lite incompleto');
if(document.documentElement.cls!=='lite') throw new Error('falta la clase lite en <html>');

// los dos mp3 de ~730KB no se tocan hasta que hagan falta: ni siquiera se les pone
// el src, porque pasarle la URL al constructor YA arranca la descarga y el
// preload='none' de aca abajo llegaria tarde
if(BGM.preload!=='none'||VIBE.preload!=='none') throw new Error('movil precargando los mp3 grandes');
if(src0[0]||src0[1]) throw new Error('movil bajando los mp3 apenas abre la pagina');
if(VIBE.src) throw new Error('el mp3 de vibes no debe cargarse sin pedirlo');
if(mz[1]) throw new Error('la capa del latido no se hornea hasta prender extra vibes');
vibe.onclick();
if(!mz[1]) throw new Error('extra vibes no horneo la capa del latido');
if(!VIBE.src.endsWith('assets/vibes.mp3')) throw new Error('EXTRA VIBES no cargo la pista');
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
stl=0; lastRank=0; lastDraw=0; frame();
stl=RANKS[RANKS.length-1].c; lastDraw=0; frame();
if(lastRank!==RANKS.length-1) throw new Error('la barra no siguio al rango');
if(brank.className!=='rank up') throw new Error('el ascenso de rango no se festejo');
if(!has(rpop,'rank')||!has(rpop,'show')) throw new Error('no aparecio el nombre del rango');
if(css['--rc']!==RANKS[RANKS.length-1].col) throw new Error('la GUI no tomo el color del rango');
stl=0; lastDraw=0; frame();
if(lastRank!==0) throw new Error('no volvio a bajar de rango');
if(brank.className==='rank up') throw new Error('bajar de rango no se festeja');
if(!bfill.style.width) throw new Error('el medidor de estilo no se dibujo');

// ---- 20a) los DOS medidores y el estado del maullido se dibujan por separado ----
// el ancho de abajo es el estilo; la barrita de al lado de la x es el combo, y el
// del combo es el que arma el maullido: por eso se llena hasta COMBO_MAX y avisa
juega('clasico'); combo=0; stl=0; meowOn=false; meowAt=-1e9; lastDraw=0; frame();
if(bcfill.style.width!=='0.0%') throw new Error('el medidor de combo no arranca vacio');
if(has(bcbar,'full')) throw new Error('el medidor de combo arranco lleno');
if(bmeow.className) throw new Error('el ♪ deberia arrancar apagado');
combo=COMBO_MAX; stl=0; lastDraw=0; frame();
if(bcfill.style.width!=='100.0%') throw new Error('el medidor de combo no llego al tope');
if(!has(bcbar,'full')) throw new Error('el medidor de combo lleno no se marco');
if(bfill.style.width!=='0.0%') throw new Error('el combo al tope no deberia llenar el estilo');
// armado y en cooldown: el ♪ se prende a medias y la barrita cuenta los 45 s
meowOn=true; meowAt=now()-MEOW_CD/2; lastDraw=0; frame();
if(bmeow.className!=='cd') throw new Error('el ♪ no muestra el cooldown');
const mw=parseFloat(bmfill.style.width);
if(!(mw>40&&mw<60)) throw new Error('la barrita del cooldown no va por la mitad: '+mw);
meowAt=-1e9; lastDraw=0; frame();
if(bmeow.className!=='ready') throw new Error('el ♪ no se prendio con el maullido listo');
if(bmfill.style.width!=='100%') throw new Error('el cooldown cumplido no dejo la barrita llena');
combo=0; stl=0; meowOn=false; meowAt=-1e9;

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
// y un QTE abierto sobrevive al menu: el reloj del QTE es uno mas de los que la
// pausa tiene que correr.  Sin eso, abrir el menu con un gato encima lo hacia
// PERDER solo al cerrarlo (+2s, combo a cero y el estilo hundido) sin teclear nada.
juega('clasico'); step(); qteStart();
qte.until=now()-100;                  // en tiempo real ya estaria vencido...
menuOpen(); pauseAt-=600; menuClose();  // ...pero fueron 600ms de menu, no de juego
lastDraw=0; frame();
if(!qte) throw new Error('el menu se llevo puesto el QTE');
qte.seq.slice().forEach(k=>press(k));
if(qte||!combo) throw new Error('no se pudo ganar el QTE que sobrevivio a la pausa');
combo=0; stl=0; kills=0; maxKills=0;
// sin primera tecla no hay reloj: cerrar el menú no puede inventarlo
gen(); menuOpen(); pauseAt-=400; menuClose();
if(t0) throw new Error('el menu arranco el reloj sin jugar');

// ---- 20b) el maullido en el teléfono: no hay barra espaciadora a mano ----
juega('clasico'); meowOn=true; meowAt=-1e9; scareUntil=0;
if(typeof bcombo.onclick!=='function') throw new Error('el rango de combo no es el boton del maullido');
bcombo.onclick({stopPropagation(){}});
if(!(scareUntil>now())) throw new Error('tocar el rango de combo no maullo');
// y el ♪, que es el indicador, es tambien el boton
scareUntil=0; meowAt=-1e9;
if(typeof bmeow.onclick!=='function') throw new Error('el indicador del maullido no es boton');
bmeow.onclick({stopPropagation(){}});
if(!(scareUntil>now())) throw new Error('tocar el ♪ no maullo');
scareUntil=0; meowOn=false; meowAt=-1e9;
bmeow.onclick({stopPropagation(){}});           // sin armar: no maulla y no rompe
if(scareUntil>now()) throw new Error('maullo sin haber cargado nunca el combo');

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
// El index.html pasa por un formateador, asi que las reglas vienen partidas en
// varios renglones y con un espacio despues de cada ':'.  Para BUSCAR patrones da
// igual: se aplasta a la forma compacta de siempre (y de paso se van los
// comentarios, que si no hacen aparecer reglas que ya no existen).
const squash=t=>t.replace(/\/\*[\s\S]*?\*\//g,'')
                 .replace(/\s+/g,' ').replace(/ *([{};:,>]) */g,'$1');
const style=squash(fs.readFileSync(path.join(__dirname,'style.css'),'utf8'));
// El markup salio del mismo formateador: etiquetas partidas en varios renglones y
// atributos entre comillas.  `mk` lo devuelve a la forma compacta —un renglon, sin
// comillas simples de atributo— para que los patrones de abajo sigan como estaban.
const mk=html.replace(/\s*\n\s*/g,' ').replace(/\s+>/g,'>').replace(/="([^"\s>]*)"/g,'=$1');
// Y con el JS igual: `flat` es el fuente sin los espacios que el formateador mete
// alrededor de la puntuacion, para que un test pueda pedir `const CF=` sin depender
// de si el dia de manana se escribe `const CF =`.  Es para BUSCAR formas de codigo,
// no para leer textos.
const flat=src.replace(/"/g,"'").replace(/ *([=?:,;{}()[\]]) */g,'$1');

// ---- el cableado del HTML ----
// El juego ya no vive adentro del index.html, asi que el markup tiene que traer las
// dos etiquetas que lo cargan y NADA de arriba las mira: el JS se lee del archivo y
// el CSS tambien, asi que romper el <link> dejaba los tests en verde y la pagina en
// blanco.  Y cada asset al que apunta el juego tiene que existir de verdad: una ruta
// mal escrita pasa el test 8 igual y se come un 404 en el navegador.
if(!/<link[^>]+href=style\.css/.test(mk)) throw new Error('el index no carga style.css');
if(!/<script src=game\.js>/.test(mk)) throw new Error('el index no carga game.js');
const rutas=[...new Set([...src.matchAll(/"(assets\/[\w.-]+)"/g)].map(m=>m[1]))];
if(rutas.length!==11) throw new Error('el juego dejo de tener sus 11 assets: '+rutas.length);
for(const a of rutas)
  if(!fs.existsSync(path.join(__dirname,a))) throw new Error('falta el archivo '+a);

const bloque=sel=>{const i=style.indexOf(sel+'{');
  if(i<0) throw new Error('falta la regla '+sel);
  return style.slice(i+sel.length+1,style.indexOf('}',i))};
const lbody=bloque('.lite body');
if(!/justify-content:flex-start/.test(lbody)) throw new Error('la GUI del telefono no arranca arriba');
if(!/overflow:hidden/.test(lbody)||!/position:fixed/.test(lbody))
  throw new Error('el telefono no se queda dentro de la pantalla');
// el alto de la pagina es el alto VISIBLE: si la pagina es mas alta que lo que se
// ve, el navegador tiene margen para correrla al abrir el teclado y el laberinto
// se va de pantalla (que era el bug: quedaba escondido arriba)
if(!/height:min\(var\(--vh/.test(lbody))
  throw new Error('la pagina no se limita al alto visible');
if(!/overflow:hidden/.test(bloque('.lite')))
  throw new Error('el <html> del telefono todavia puede desplazarse');
// el input escondido va ARRIBA: pegado abajo, el "traer a la vista" del navegador
// al enfocarlo empuja la pagina entera hacia el fondo
const kbr=bloque('#kb');
if(!/top:0/.test(kbr)||/bottom:0/.test(kbr))
  throw new Error('el input del teclado quedo pegado al borde de abajo');
const vp=mk.match(/<meta name=viewport[^>]*>/)[0];
if(!/interactive-widget=resizes-content/.test(vp))
  throw new Error('falta interactive-widget: el teclado desplazaria la pagina');
if(!/function unscroll\(/.test(src)) throw new Error('falta el rescate de scroll');
if(!/preventScroll/.test(src)) throw new Error('el focus del teclado desplaza la pagina');
if(/kb\.focus\(\)/.test(src)) throw new Error('quedo un kb.focus() sin preventScroll');
// la barra es la MISMA pieza en los dos perfiles (ver 25): lo comun vive en #bar y
// en .lite queda solo el alto fijo del que cuelga el ancho del tablero
const barr=bloque('#bar');
if(/position:(fixed|absolute)/.test(barr)) throw new Error('la barra no deberia flotar sobre el laberinto');
if(!/flex:none/.test(barr)) throw new Error('la barra tiene que conservar su alto');
if(!/height:var\(--barh\)/.test(bloque('.lite #bar')))
  throw new Error('la barra del telefono perdio el alto fijo que le reserva el tablero');
if(/#bar\.low/.test(style)) throw new Error('quedo la regla de la barra que se mudaba de borde');
for(const sel of ['.lite #menu','.lite #lvl','.lite #skill','.lite #res'])
  if(!/align-items:start/.test(bloque(sel))) throw new Error(sel+' no esta alineado arriba');
const stage=mk.match(/<div id=stage>[\s\S]*?<\/div>\s*<div id=scare>/)[0];
if(stage.indexOf('id=bar')>stage.indexOf('id=board'))
  throw new Error('la barra tiene que ir ANTES del tablero en el markup');
const lstage=bloque('.lite #stage');
if(!/--tuth/.test(lstage)) throw new Error('el tablero no le reserva alto al tutorial');
if(!/--vh/.test(lstage)) throw new Error('el tablero no se achica con el alto visible');
// las scanlines salen del CSS (#board::after global), no del canvas: eran ~150
// fillRect por cuadro en escritorio
if(!/scan:0/.test(flat)) throw new Error('el canvas sigue pintando scanlines');
const boa=bloque('#board::after');
if(!/repeating-linear-gradient/.test(boa)) throw new Error('las scanlines no salen del CSS');
if(/\.lite #board::after/.test(style)) throw new Error('las scanlines quedaron solo en el telefono');
if(!/\.vibes #board::after/.test(style)) throw new Error('el beat ya no aclara las scanlines');

// ---- 23) tipografía: una sola familia para la GUI y el tablero ----
if(!/--ui:/.test(style)) throw new Error('falta la pila de fuentes --ui');
if(!/Arial Narrow/.test(style)) throw new Error('la pila condensada no llego al CSS');
if(!/var\(--ui\)/.test(bloque('body'))) throw new Error('el body no usa --ui');
if(/ui-monospace/.test(style)||/ui-monospace/.test(src))
  throw new Error('quedo monoespaciado suelto: la GUI y el tablero van con la misma familia');
if(!/const CF=/.test(flat)||!/const DF=/.test(flat)) throw new Error('el canvas no tiene su pila de fuentes');
for(const m of flat.match(/x\.font=[^;]+;/g)||[])
  if(!/CF|DF/.test(m)) throw new Error('un texto del tablero quedo fuera de la familia: '+m);

// ---- 24) extra vibes: el latido llega a mucho mas que el canvas y la barra ----
const vibSel=[...style.matchAll(/\.vibes\s+([#.\w]+)/g)].map(m=>m[1]);
if(new Set(vibSel).size<10)
  throw new Error('el latido llega a muy pocos elementos: '+new Set(vibSel).size);
for(const sel of ['#log','#tut','#board','#btns','#bar','#bcombo','#bfill'])
  if(vibSel.indexOf(sel)<0) throw new Error('extra vibes no llega a '+sel);
if(!/classList\[vibes\?'add':'remove'\]\('vibes'\)/.test(flat))
  throw new Error('el boton no enciende la clase .vibes');
if(!/@keyframes rpopl/.test(style)) throw new Error('falta la entrada espejada del cartel del rango');
if(/var\(--rc,#4cf\)22/.test(style)) throw new Error('quedo el degradado con el hex roto de 5 digitos');

// ---- 25) la GUI del telefono llego al escritorio ----
// El escritorio no tenia identidad propia: un h2 + un p de texto centrado y una
// barrita de combo con la etiqueta adentro.  Ahora usa LA MISMA barra que el
// telefono y gasta el ancho de mas en lo que alla no entraba.
// con \b, porque el medidor de combo NUEVO se llama #bcbar y contiene 'cbar'
if(/#cmeter\b|#cbar\b|#clab\b/.test(style)||/\b(cmeter|cbar|clab)\b/.test(src))
  throw new Error('quedo el medidor de combo viejo del escritorio');
if(/id=hud|id=sub[>\s]/.test(mk)||/hudt|hudx|subt|babyEl/.test(src))
  throw new Error('quedo el HUD suelto viejo (h2 + p) del escritorio');
// la lista de selectores que esconde cosas en escritorio: la que nombra a
// #mstats, desde la llave de cierre anterior hasta la suya
const im=style.indexOf('#mstats');
const oculto=style.slice(style.lastIndexOf('}',im)+1,style.indexOf('{',im));
if(/#bar/.test(oculto)) throw new Error('el escritorio sigue escondiendo la barra');
// la barra va entera en una linea: ahi tienen que estar las zonas de escritorio
const barm=mk.match(/<div id=bar>.*<\/div>/)[0];
for(const id of ['bmeta','bname','bpb','bstat','bmax'])
  if(barm.indexOf('id='+id)<0) throw new Error('la barra no trae la zona de escritorio '+id);
for(const sel of [':root:not(.lite) #bmeta',':root:not(.lite) #bstat',':root:not(.lite) #bmax'])
  if(!/display:(flex|block)/.test(bloque(sel))) throw new Error(sel+' no se muestra en escritorio');
if(!/bstat\.textContent/.test(src)||!/bname\.textContent/.test(src)||!/bmax\.textContent/.test(src))
  throw new Error('el HUD de escritorio no escribe en la barra');
// y el tablero deja de estar solo en el medio: log y ayuda pasan a la columna de al lado
const dsk=bloque(':root:not(.lite) body');
if(!/display:grid/.test(dsk)) throw new Error('el escritorio no arma las dos columnas');
for(const sel of [':root:not(.lite) #log',':root:not(.lite) p.help'])
  if(!/grid-column:2/.test(bloque(sel))) throw new Error(sel+' no fue a la columna lateral');
// los botones secundarios ya no viven en una fila abajo del tablero comiendole alto:
// en los DOS perfiles estan dentro del menu, que ahora es el mismo panel en los dos
if(/:root:not\(\.lite\) #btns\{/.test(style))
  throw new Error('quedo la fila de botones de escritorio abajo del tablero');
if(/#menu,#menu>div\{display:contents/.test(style))
  throw new Error('el menu de escritorio sigue disuelto en la pagina');
const men=bloque('#menu');
if(!/position:fixed/.test(men)||!/display:none/.test(men))
  throw new Error('el menu no es un panel');
if(!/display:grid/.test(bloque('#menu.open'))) throw new Error('el menu no se abre con .open');
if(/display:none/.test(bloque('#burger')))
  throw new Error('sin hamburguesa a la vista el menu de escritorio no se encuentra');
if(!/e\.key==='Escape'/.test(flat)) throw new Error('ESCAPE no abre el menu');
// y el tablero se queda con el alto que dejaron: crece con la pantalla
if(!/DSK_MIN|DSK_SIDE/.test(flat)) throw new Error('fit() no mide la consola de escritorio');
if(style.indexOf('@media (min-width:860px)')<0)
  throw new Error('sin la consulta de ancho, una ventana angosta se queda sin respaldo');
// las dos columnas NO pueden pisar al telefono: una tablet tactil ancha entra igual
// en la consulta de ancho y ahi manda el perfil lite
const mq=style.slice(style.indexOf('@media (min-width:860px)'));
for(const sel of mq.slice(mq.indexOf('{')+1,mq.indexOf('\n }')).match(/^[^{\n]+\{/gm)||[])
  if(!/:root:not\(\.lite\)/.test(sel))
    throw new Error('la grilla de escritorio pisa al telefono: '+sel.trim());

// ---- 26) los DOS medidores y el indicador del maullido, en la misma barra ----
// Separar estilo de combo solo sirve si se VEN distinto, y el maullido, que ahora
// se arma solo una vez y despues se enfria, necesita decir en que estado esta.
for(const id of ['bcbar','bcfill','bmeow','bmcd','bmfill'])
  if(barm.indexOf('id='+id)<0) throw new Error('la barra no trae '+id);
if(!/grid-row:2/.test(bloque('#bcbar'))) throw new Error('el medidor de combo no va debajo de la x');
if(!/#bcbar.full/.test(style)) throw new Error('el medidor de combo lleno no se distingue');
for(const sel of ['#bmeow.ready','#bmeow.cd'])
  if(style.indexOf(sel+'{')<0) throw new Error('al ♪ le falta el estado '+sel);
if(!/opacity:\.?\d/.test(bloque('#bmeow'))) throw new Error('el ♪ sin armar tiene que verse apagado');
if(!/bmeow\.className/.test(src)||!/bmfill\.style\.width/.test(src))
  throw new Error('el cuadro no escribe la disponibilidad ni el cooldown del maullido');
if(!/bcfill\.style\.width/.test(src)) throw new Error('el cuadro no dibuja el medidor de combo');
// el ♪ es tambien boton: en el telefono no hay barra espaciadora
if(!/bmeow\.onclick/.test(src)) throw new Error('el ♪ no es boton');

// ---- 27) la pantalla de resultados existe y esta cableada ----
for(const id of ['res','rtag','rttl','rtime','rsub','rgrid','rpb','rnext','ragain','rlvls'])
  if(mk.indexOf('id='+id)<0) throw new Error('al resumen le falta '+id);
if(style.indexOf('#res.open{')<0) throw new Error('el resumen no se abre con .open');
if(!/#res button/.test(style)) throw new Error('los botones del resumen no heredan el estilo del resto');
for(const m of ['rtime.textContent','rgrid.innerHTML','rnext.onclick','rlvls.onclick'])
  if(src.indexOf(m)<0) throw new Error('el resumen no escribe '+m);

// ---- 28) el cartel del primer encuentro MUESTRA el QTE, no solo lo cuenta ----
// Un cartel de puro texto se lee y no se reconoce, y lo que hay que reconocer
// cuando el gato te alcanza de verdad es una IMAGEN.  Arriba del texto va la
// escena en chico, y el test la ata a la del canvas: si manana cambian los
// colores de la secuencia o el gato del overlay, la demo tiene que cambiar con
// ellos o esto se cae —una demo que ensena otra cosa es peor que no tenerla—.
const brf=mk.match(/<div id=brief>[\s\S]*?<script/)[0];
for(const id of ['bdemo','bdcat','bdttl','bdseq','bdbar','bdwin'])
  if(!new RegExp('id='+id+'[ >]').test(brf))
    throw new Error('a la demo del cartel le falta '+id);
if(brf.indexOf('id=bdemo')>brf.indexOf('<p>'))
  throw new Error('la demo va ANTES del parrafo: primero se ve, despues se lee');
if(!/<div id=bdseq>(<b>\w<\/b>){3}<\/div>/.test(brf))
  throw new Error('la secuencia de la demo no tiene las tres letras del QTE blando');
if(brf.indexOf('id=bok')<brf.indexOf('id=bdemo'))
  throw new Error('ESTOY LISTO tiene que seguir cerrando el cartel, no abrirlo');
// los tres colores de letra salen del MISMO sitio que los del canvas
const cols=(flat.match(/const col=done\?'(#\w+)':i==qte\.i\?'(#\w+)':'(#\w+)'/)||[]).slice(1);
if(cols.length!==3) throw new Error('no se pudieron leer los colores del QTE del canvas');
for(const k of ['bdk1','bdk2','bdk3']){
  const i=style.indexOf('@keyframes '+k);
  if(i<0) throw new Error('falta la animacion '+k+' de la demo');
  const kf=style.slice(i,style.indexOf('}}',i));
  for(const c of cols)  // el (?!hex) evita que #6f9 se de por visto dentro de #6f98
    if(!new RegExp(c+'(?![0-9a-f])','i').test(kf))
      throw new Error(k+' no pasa por el color '+c+' que dibuja el QTE');
}
if(!/background:#f57/.test(bloque('#bdbar i')))
  throw new Error('la barra de la demo no es la roja del QTE');
// y el gato es el del overlay, sin un byte extra de imagen
if(!/\$\('bdcat'\)\.src=BIG\.src/.test(flat))
  throw new Error('la demo no usa el mismo gato que se te viene encima en el QTE');
if(/bdemo|bdseq|bdbar/.test(flat.replace(/\$\('bdcat'\)\.src=BIG\.src;/,'')))
  throw new Error('la demo tiene que moverse sola con CSS, sin timers en el JS');
if(style.indexOf('@media (prefers-reduced-motion:reduce)')<0)
  throw new Error('la demo no respeta a quien pide menos movimiento');
if(style.indexOf('#bdemo *,#bdemo::after{animation:none')<0)
  throw new Error('con menos movimiento la demo deberia quedarse en un cuadro fijo');

// ---- 29) el cartel de las HABILIDADES: la determinacion y el maullido tambien
// se MUESTRAN antes de contarse ----
// Las dos vivian en un renglon de ayuda del menu, y un renglon se lee pero no se
// reconoce: cuando en la partida aparece una letra violeta sobre un muro, o el
// medidor dice que el maullido esta listo, hay que saber que es ESO.  Asi que
// tienen el mismo trato que el QTE —primero la escena en chico, corriendo sola,
// y despues el texto— y el test las ata a lo que dibuja el canvas: si manana
// cambia el violeta de la determinacion o el celeste del maullido, las demos
// tienen que cambiar con ellos o esto se cae.
const hb=mk.slice(mk.indexOf('<div id=hab>'),mk.indexOf('<script'));
if(!hb) throw new Error('falta el cartel de las habilidades');
for(const id of ['hsdet','hsmeow','hddet','hdmeow','hdpips','hdrow','hdwall','hdk','hdcat',
                 'hmrow','hmcat','hmf1','hmf2','hmr1','hmr2','hmkey','hok'])
  if(!new RegExp('id='+id+'[ >]').test(hb))
    throw new Error('al cartel de las habilidades le falta '+id);
// una escena por habilidad, y en las dos la demo va ANTES del parrafo
for(const [sec,demo] of [['hsdet','hddet'],['hsmeow','hdmeow']]){
  const i=hb.indexOf('id='+sec), blk=hb.slice(i,hb.indexOf('</section>',i));
  if(i<0||blk.indexOf('id='+demo)<0) throw new Error('la seccion '+sec+' no trae su demo');
  if(blk.indexOf('id='+demo)>blk.indexOf('<p>'))
    throw new Error('en '+sec+' la demo va ANTES del parrafo: primero se ve, despues se lee');
  if(style.indexOf('#hab.'+(sec==='hsdet'?'det':'meow')+' #'+sec+',')<0
     &&style.indexOf('#hab.'+(sec==='hsdet'?'det':'meow')+' #'+sec+'{')<0)
    throw new Error('la clase de #hab no elige la escena '+sec);
}
if(style.indexOf('#hsdet,#hsmeow{display:none')<0)
  throw new Error('las dos escenas se ven a la vez: tiene que haber una sola');
if(hb.indexOf('id=hok')<hb.indexOf('id=hdmeow'))
  throw new Error('ENTENDIDO tiene que cerrar el cartel, no abrirlo');
// los colores salen del MISMO sitio que los del canvas: el violeta con el que se
// gasta una carga, el celeste de la onda del maullido y el azul de las paredes
const vio=(src.match(/det--;[\s\S]{0,900}?burst\([^)]*?"(#[0-9a-f]{3,6})"/i)||[])[1];
const cel=(src.match(/scareUntil = meowAt[\s\S]{0,1400}?burst\([^)]*?"(#[0-9a-f]{3,6})"/i)||[])[1];
const muro=(src.match(/k\.strokeStyle = "(#[0-9a-f]{3,6})"/i)||[])[1];
if(!vio||!cel||!muro) throw new Error('no se pudieron leer del canvas los colores de las habilidades');
const pasa=(sel,c,q)=>{ if(bloque(sel).indexOf(c)<0) throw new Error(q) };
pasa('#hdk',vio,'la letra de la demo no es el violeta de la determinacion');
pasa('#hdpips i',vio,'las cargas de la demo no son las de la determinacion');
pasa('#hdwall',muro,'la pared de la demo no es la que dibuja el canvas');
pasa('.hmring',cel,'la onda de la demo no es el celeste del maullido');
pasa('#hmkey',cel,'la tecla de la demo no es la del maullido');
// el canvas dibuja DOS anillos corridos: la demo tambien, o ensena otra cosa
if(!/for \(const o of \[0, 0\.22\]\)/.test(src))
  throw new Error('no se pudo leer el doble anillo del maullido del canvas');
if(!/animation-delay/.test(bloque('#hmr2')))
  throw new Error('la demo del maullido no corre el segundo anillo como el canvas');
// las dos se mueven SOLAS con CSS
for(const k of ['hdcat','hdk','hdwall','hdpip','hdflash','hmring','hmcat','hmf1','hmf2','hmkey'])
  if(style.indexOf('@keyframes '+k)<0) throw new Error('falta la animacion '+k+' de las demos');
// ...y los gatos son los del tablero, sin un byte extra de imagen
if(!/\$\('hdcat'\)\.src=\$\('hmcat'\)\.src=PJ\.src/.test(flat))
  throw new Error('la demo de la determinacion no usa el gato blanco del tablero');
if(!/\$\('hmf1'\)\.src=\$\('hmf2'\)\.src=FOE\.src/.test(flat))
  throw new Error('la demo del maullido no usa los gatos negros del tablero');
const sinSrc=flat.replace(/\$\('hdcat'\)\.src=\$\('hmcat'\)\.src=PJ\.src;/,'')
                 .replace(/\$\('hmf1'\)\.src=\$\('hmf2'\)\.src=FOE\.src;/,'');
if(/hdcat|hdwall|hdpips|hmring|hmf1|hmkey/.test(sinSrc))
  throw new Error('las demos tienen que moverse solas con CSS, sin timers en el JS');
if(style.indexOf('#hddet *,#hddet::after,#hdmeow *{animation:none')<0)
  throw new Error('con menos movimiento las demos deberian quedarse en un cuadro fijo');
// ...y los overrides tienen la MISMA especificidad que las reglas de arriba, asi
// que ganan por orden: con el bloque del cartel declarado despues, ni "menos
// movimiento" ni la pantalla baja hacian nada (y no se nota hasta que se prueba)
if(!(style.indexOf('.hdemo{')<style.indexOf('@media (max-height:620px)')))
  throw new Error('el CSS del cartel tiene que ir antes de los @media que lo pisan');
if(!(style.indexOf('#hdcat{')<style.indexOf('@media (prefers-reduced-motion:reduce)')))
  throw new Error('la demo se declara despues de su propio override de menos movimiento');
// y el cartel se cierra por su boton y nada mas, igual que el del primer encuentro
if(!/hok\.onclick=habGo/.test(flat)) throw new Error('ENTENDIDO no esta cableado');
if(!/HAB_LOCK/.test(flat)) throw new Error('el cartel no espera a que se lo pueda leer');
if(style.indexOf('#hab.on #hok{')<0) throw new Error('ENTENDIDO no se carga solo');

// ---- 35) el destello del ascenso de rango dejo de repintar la barra entera ----
// Animar `background` y `box-shadow` sobre una caja del ancho de la pantalla es un
// repintado por cuadro, con un difuminado de 34px que encima se sale de su caja; y
// el background iba de color solido a degradado, que ni siquiera interpola: saltaba
// a la mitad.  El fogonazo pasa a ser una capa aparte que se va con opacity, que es
// de lo poco que el compositor anima sin volver a pintar nada.
const kf=k=>{const i=style.indexOf('@keyframes '+k);
  if(i<0) throw new Error('falta la animacion '+k);
  return style.slice(i,style.indexOf('}}',i))};
const kfb=kf('barup');
if(/background|box-shadow/.test(kfb)) throw new Error('el destello sigue animando pintura: '+kfb);
if(!/opacity/.test(kfb)) throw new Error('el destello dejo de destellar');
if(style.indexOf('#bar.up::after{')<0)
  throw new Error('el destello tiene que vivir en su propia capa, no en la barra');
const kfr=kf('rankup');
if(/filter/.test(kfr))
  throw new Error('la letra del rango sigue animando un filter sobre texto recortado');
if(!/transform/.test(kfr)) throw new Error('la letra del rango dejo de festejar');
// reiniciar las tres animaciones cuesta UN layout sincronico, no tres
const voids=(flat.match(/void [a-z]+\.offsetWidth/g)||[]);
if(voids.length!==1) throw new Error('rankShow fuerza '+voids.length+' layouts: tiene que ser uno');

// ---- 36) la GUI es CHAPA, no tarjetas ----
// La barra y los paneles eran tarjetas: esquina de 10px, borde de un pelo y sombra
// blanda.  Eso es lenguaje de aplicacion, no de maquina, y desentonaba con un
// laberinto de neon lleno de scanlines.  Ahora: bordes biselados de verdad (los del
// navegador, sin una sombra de mas), esquina casi recta y trama encima.
for(const t of ['--bev:','--grid:','--mar:'])
  if(style.indexOf(t)<0) throw new Error('falta el token de la chapa '+t);
for(const [sel,q] of [['#bar','la barra'],['#menu>div','el menu'],
                      ['#lvl>div','el selector'],['#res>div','el resumen']]){
  const b=bloque(sel);
  if(!/(ridge|outset)/.test(b)) throw new Error(q+' no tiene marco biselado');
  if(!/border-radius:[0-3]px/.test(b)) throw new Error(q+' sigue con esquina de tarjeta');
  if(b.indexOf('var(--grid)')<0) throw new Error(q+' no lleva la trama de la chapa');
}
const btn='#btns button,#skill button,#brief button,#lvl button,#tut button,#res button,#hab button';
if(!/(ridge|outset)/.test(bloque(btn))) throw new Error('los botones no son teclas biseladas');
if(style.indexOf(btn.replace(/,/g,':active,')+':active{')<0)
  throw new Error('las teclas no se hunden al apretarlas');
// los medidores se leen segmentados: una barra lisa es una barra de progreso
for(const sel of ['#bfill','#bcfill','#bmfill'])
  if(bloque(sel).indexOf('repeating-linear-gradient')<0)
    throw new Error('el medidor '+sel+' no esta segmentado');
// el reloj es el dato que mas se mira: tiene su placa, no es texto suelto
if(!/border:/.test(bloque('#bt'))) throw new Error('el reloj no tiene su placa');
// y el bisel de la barra sobrevive al latido, que le pisa el box-shadow entero
for(const sel of ['.vibes #bar','.lite.vibes #bar'])
  if(bloque(sel).indexOf('var(--bev)')<0)
    throw new Error(sel+' se lleva puesto el bisel de la barra');

// ---- 37) la dificultad se elige ANTES de entrar, y el aviso se puede apagar ----
for(const id of ['skb','lskb','lopt','lbm','lbv','lbp','lbh'])
  if(mk.indexOf('id='+id)<0) throw new Error('falta el control '+id+' en el markup');
if(mk.match(/<div id=btns>[\s\S]*?<\/div>/)[0].indexOf('id=skb')<0)
  throw new Error('el interruptor no esta en el menu de ESC');
const ldet=mk.slice(mk.indexOf('<div id=ldet>'),mk.indexOf('id=res'));
if(ldet.indexOf('id=lskb')<0) throw new Error('el interruptor no esta en el selector de nivel');
if(!(ldet.indexOf('id=lopt')<ldet.indexOf('id=lgo')))
  throw new Error('la dificultad se elige ANTES de JUGAR, no despues');
if(style.indexOf('#lskb.on')<0)
  throw new Error('el interruptor prendido no se distingue en el selector');
if(!/localStorage.setItem\('lg.skill'/.test(flat))
  throw new Error('el interruptor no se recuerda entre partidas');
const chk=src.slice(src.indexOf('function checkSkill'),src.indexOf('function unpause'));
if(chk.indexOf('skillOff')<0) throw new Error('checkSkill no mira el interruptor');
if(chk.indexOf('skillAcc()')<0)
  throw new Error('el umbral de checkSkill dejo de aflojarse con cada NO');
if(!/baby = startBaby/.test(src))
  throw new Error('entrar al nivel no aplica los baby points elegidos');

// ---- 38) el acechador y la cuenta de monedas en el tablero ----
if(style.indexOf('#scare.fade{')<0) throw new Error('el susto del acechador no tiene su fade');
kf('scarefade');
if(!/SCARE_FADE/.test(flat)) throw new Error('el JS no acompana el fade de la cara con el del grito');
if(!/ready\(STALK\) \? STALK : FOE/.test(src))
  throw new Error('el tablero dibuja al acechador con el sprite de los otros gatos');
// los dos archivos del acechador se bajan al entrar al sotano y no antes: son
// ~270KB que en los niveles 1 y 2 no se miran nunca
if(/^STALK\.src *=/m.test(src)||/^LOBO\.src *=/m.test(src))
  throw new Error('la cara y el grito del acechador se bajan al abrir la pagina');
// la cuenta de monedas se lee en el tablero, no solo arriba.  Va DESPUES de la
// niebla: si no, en el sotano —donde mas hace falta— queda tapada.
const iFog=src.indexOf('if (LV.fog) {'), iCoin=src.indexOf('las monedas, en el tablero');
if(iCoin<0) throw new Error('el tablero no dibuja la cuenta de monedas');
if(!(iCoin>iFog)) throw new Error('la cuenta de monedas queda debajo de la niebla');
if(!/p\.y === 0 \? BH - 15 : 15/.test(src))
  throw new Error('la cuenta no se corre cuando el gato esta en la primera fila, que es donde arranca');
if(src.indexOf('ESQUIVES AL CRUCE')<0) throw new Error('el resumen no cuenta los esquives');

console.log('OK 36/36 | el perfil lite prende solo en pointer:coarse y no toca la dificultad');
