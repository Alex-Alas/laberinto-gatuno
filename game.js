const S = 34,
	POOL = "abcdefghijklmnopqrstuvwxyz";
let C = 15,
	R = 11; // el tamaño del tablero lo fija setLevel()
const $ = (i) => document.getElementById(i);
const cv = $("cv"),
	x = cv.getContext("2d"),
	logEl = $("log"),
	boom = $("boom"),
	scare = $("scare"),
	rst = $("rst"),
	mus = $("mus"),
	skill = $("skill"),
	sacc = $("sacc"),
	byes = $("byes"),
	bno = $("bno"),
	sgif = $("sgif"),
	kb = $("kb"),
	tec = $("tec"),
	how = $("how"),
	vibe = $("vibe"),
	rpop = $("rpop"),
	nvl = $("nvl"),
	bname = $("bname"),
	bpb = $("bpb"),
	bstat = $("bstat"),
	bmax = $("bmax"),
	bar = $("bar"),
	bt = $("bt"),
	bc = $("bc"),
	bx = $("bx"),
	bfill = $("bfill"),
	brank = $("brank"),
	bcombo = $("bcombo"),
	burger = $("burger"),
	menu = $("menu"),
	mstats = $("mstats"),
	fsb = $("fs"),
	bcbar = $("bcbar"),
	bcfill = $("bcfill"),
	bmeow = $("bmeow"),
	bmfill = $("bmfill"),
	res = $("res"),
	rtag = $("rtag"),
	rttl = $("rttl"),
	rtime = $("rtime"),
	rsub = $("rsub"),
	rgrid = $("rgrid"),
	rpb = $("rpb"),
	rnext = $("rnext"),
	ragain = $("ragain"),
	rlvls = $("rlvls"),
	lvl = $("lvl"),
	llist = $("llist"),
	ltag = $("ltag"),
	lname = $("lname"),
	ldesc = $("ldesc"),
	lpts = $("lpts"),
	lmeta = $("lmeta"),
	lpic = $("lpic"),
	lgo = $("lgo"),
	tut = $("tut"),
	tmsg = $("tmsg"),
	tnum = $("tnum"),
	tfill = $("tfill"),
	tskip = $("tskip"),
	brief = $("brief"),
	bok = $("bok"),
	hab = $("hab"),
	hok = $("hok"),
	skb = $("skb"),
	lskb = $("lskb"),
	lbm = $("lbm"),
	lbv = $("lbv"),
	lbp = $("lbp"),
	lbh = $("lbh");
const RAGE = "assets/rage.gif";
// el gif del diálogo (158KB) no se baja al abrir la página: se carga la primera
// vez que el diálogo aparece (ver checkSkill) y ahí queda para las siguientes
function rageOn() {
	if (!sgif.src) sgif.src = RAGE;
	else {
		sgif.src = "";
		sgif.src = RAGE; // el gif arranca desde el frame 1
	}
}

// ---- resolución del tablero -------------------------------------------------
// TODO el dibujo habla en "coordenadas de tablero": S píxeles por celda, BW x BH
// el tablero entero.  El canvas puede guardar K píxeles por cada uno de esos, y
// el cuadro arranca con un setTransform(K, ...) que hace la conversión sola: así
// el laberinto crece en pantalla —en escritorio se lleva el alto que dejó la fila
// de botones— sin quedar borroso, y ni una cuenta del dibujo cambia.  En el
// teléfono K se queda en 1: allá el tablero ya entra justo y los píxeles de más
// se pagan en cuadros.
let BW = C * S,
	BH = R * S,
	K = 1;
// Deja el canvas del tamaño que piden el nivel y K.  Devuelve true si cambió: eso
// borra el contenido y obliga a rehornear las paredes (ver bakeMaze).
function sizeCanvas() {
	BW = C * S;
	BH = R * S;
	if (cv.width === BW * K && cv.height === BH * K) return false;
	cv.width = BW * K;
	cv.height = BH * K;
	return true;
}
sizeCanvas();

// ---- perfil de rendimiento -------------------------------------------------
// En el teléfono lo caro no es la lógica del juego: es shadowBlur en cada dibujo,
// reescribir innerHTML 60 veces por segundo y animar box-shadow con --bop.
// TODO lo que se nota a la vista va detras de MOBILE; en escritorio PERF deja el
// juego pixel por pixel como estaba.  Los numeros de gameplay no se tocan.
const MOBILE = (() => {
	try {
		if (
			typeof matchMedia === "function" &&
			matchMedia("(pointer:coarse)").matches
		)
			return true;
		return (
			typeof navigator !== "undefined" &&
			/Android|iPhone|iPad|iPod|Mobile/i.test(
				navigator.userAgent || "",
			)
		);
	} catch (e) {
		return false;
	}
})();
const PERF = MOBILE
	? //  glow: factor de shadowBlur · scan: las scanlines las pinta el CSS
		//  dust: cuántas partículas · hudMs: cada cuánto se reescribe el reloj
		//  fps: tope de cuadros (pantallas de 120Hz) · pre: preload de los mp3 grandes
		{
			glow: 0.5,
			scan: 0,
			dust: 0.6,
			hudMs: 66,
			fps: 61,
			pre: "none",
			lazy: 1,
		}
	: { glow: 1, scan: 0, dust: 1, hudMs: 0, fps: 0, pre: "auto", lazy: 0 };
const GLOW = PERF.glow;
if (MOBILE) document.documentElement.classList.add("lite");

const now = () => performance.now();
const pad = (n, w) => String(n | 0).padStart(w, "0");
const fmt = (ms) => {
	const t = Math.max(0, ms); // MM:SS:mmm
	return `${pad(t / 60000, 2)}:${pad((t / 1000) % 60, 2)}:${pad(t % 1000, 3)}`;
};
const CLS = { ok: "k", bad: "b", late: "l", qte: "q", qtebad: "b" };

// Tipografía del tablero: la misma que la GUI, no el monoespaciado de antes.
// CF es el condensado de sistema y se lleva todo lo que hay que LEER a las
// apuradas (las letras de las salidas, la secuencia del QTE); DF es el display
// del rango de combo y se queda sólo con los titulares, que es lo único que
// tiene que gritar.  Nada de esto se descarga: son fuentes que ya están.
const CF =
	"'Arial Narrow','Roboto Condensed','Avenir Next Condensed','Liberation Sans Narrow'," +
	"'Helvetica Neue',Helvetica,Arial,sans-serif";
const DF =
	"Impact,Haettenschweiler,'Franklin Gothic Heavy','Arial Black','Roboto Condensed',sans-serif";

const PJ = new Image(),
	FOE = new Image();
PJ.src = "assets/jugador.webp";
FOE.src = "assets/gato.webp";
const ready = (i) => i.complete && i.naturalWidth > 0;
const BIG = new Image();
BIG.src = "assets/gato-qte.webp"; // enemigo a pantalla completa
// El ACECHADOR del sótano es el ÚNICO enemigo que no se juega en ningún otro
// nivel, así que no puede tener la misma cara ni el mismo grito que el resto:
// sprite propio en el tablero y jumpscare propio (ver scareShow).  La cara y el
// grito los baja gen() al generar el primer sótano y no antes —son ~270KB que en
// los niveles 1 y 2 no se miran nunca—, y hasta que estén ready() da false y se
// dibuja el gato negro de siempre.
const STALK = new Image();
// la demo del cartel usa el MISMO gato del QTE, sin un byte extra: si lo que
// se ve ahí no fuera el de la partida, la demo enseñaría otra cosa
$("bdcat").src = BIG.src;
// ...y por lo mismo las dos demos de habilidades usan el gato blanco y los
// negros del tablero: son las imágenes que ya están cargadas
$("hdcat").src = $("hmcat").src = PJ.src;
$("hmf1").src = $("hmf2").src = FOE.src;
const BOOM = "assets/boom.gif";
const SCREAM = new Audio("assets/scream.mp3"),
	BANG = new Audio("assets/bang.mp3");
// el grito del acechador: ~120KB que sólo hacen falta en el sótano, así que la
// URL se la pone gen() al generar un nivel que tenga acechador
const LOBO = new Audio();
LOBO.preload = "none";
const play = (a) => {
	try {
		a.currentTime = 0;
		return a.play();
	} catch (e) {
		return Promise.reject(e);
	}
};
const GIF = new Image();
GIF.src = BOOM; // gif de explosión ya decodificado
const BGM_SRC = "assets/bgm.mp3";
const BGM = new Audio();
BGM.loop = true;
BGM.v0 = BGM.volume = 0.32; // v0: el volumen "normal" al que vuelve el ducking
SCREAM.preload = BANG.preload = "auto"; // cortos: vale la pena tenerlos listos
BGM.preload = PERF.pre; // ~730KB de mp3: en móvil se baja al tocar
const VIBE_SRC = "assets/vibes.mp3";
const VIBE = new Audio();
VIBE.loop = true;
VIBE.v0 = VIBE.volume = 0.34;
VIBE.preload = "none"; // las vibes se bajan al pedirlas, también en escritorio
// Las dos pistas se crean VACÍAS: pasarle la URL al constructor arranca la descarga
// ahí mismo, y ahí el preload="none" del teléfono llega tarde.  srcOn() se la pone a
// la que va a sonar —el BGM con la 1ª tecla, las vibes recién al pedirlas—; en
// escritorio el BGM se carga de entrada, las vibes no (otros ~730KB ahorrados).
const srcOn = (a) => {
	if (!a.src) a.src = a === VIBE ? VIBE_SRC : BGM_SRC;
};
if (!PERF.lazy) srcOn(BGM);
mus.onclick = () => {
	BGM.muted = !BGM.muted;
	VIBE.muted = BGM.muted;
	mus.textContent = (BGM.muted ? "♫̸" : "♫") + " MUSICA";
	mus.blur();
};
// ---- la música durante el QTE y el jumpscare --------------------------------
// Un QTE es el momento en que el laberinto deja de existir, así que la música se
// HUNDE mientras dura: arranca en su volumen y baja sin parar hasta quedar casi
// muda justo cuando el gato ya te tiene encima.  Ganarlo la devuelve enseguida;
// terminar en jumpscare la deja abajo y la trae de vuelta de a poco, con el
// silencio del susto todavía puesto.
//
// ponytail: esto es un ducking, no un filtro.  Un lowpass de verdad ("muffled" en
// serio) pide meter las dos pistas en un MediaElementSource de WebAudio, y un
// AudioContext suspendido —que en el teléfono es lo normal hasta el primer
// gesto— deja la música MUDA en vez de apagada.  Si algún día vale la pena, el
// enganche es acá: BGM/VIBE -> BiquadFilter(lowpass) -> destination, y `muf`
// pasa a manejar la frecuencia de corte en vez del volumen.
const MUF_MAX = 0.88, // cuánto se hunde, como fracción del volumen normal
	MUF_IN = 2600, // fade-in largo: el de después del jumpscare
	MUF_OUT = 650; // y el corto, el de un QTE ganado
let muf = 0, // 0 = volumen normal · 1 = hundida del todo
	mufAt = 0, // último cuadro contado
	mufV = -1, // volumen ya escrito en la pista (para no tocarla por gusto)
	mufSlow = 0; // el fade-in que viene es el largo (hubo jumpscare)

// ---- SFX sintetizados con WebAudio: cortos y bajitos, sin embeber otro mp3 ----
let AC = null;
function sfx(f, ms, type = "square", vol = 0.06, to = 0) {
	if (BGM.muted) return;
	try {
		AC = AC || new (window.AudioContext || window.webkitAudioContext)();
		if (AC.state === "suspended") AC.resume();
		const o = AC.createOscillator(),
			g = AC.createGain(),
			t = AC.currentTime,
			s = ms / 1000;
		o.type = type;
		o.frequency.setValueAtTime(f, t);
		if (to)
			o.frequency.exponentialRampToValueAtTime(
				Math.max(30, to),
				t + s,
			);
		g.gain.setValueAtTime(0.0001, t);
		g.gain.exponentialRampToValueAtTime(vol, t + 0.006);
		g.gain.exponentialRampToValueAtTime(0.0001, t + s);
		o.connect(g).connect(AC.destination);
		o.start(t);
		o.stop(t + s + 0.03);
	} catch (e) {} // sin WebAudio el juego sigue igual
}
// el acierto sube de tono con el combo: es lo que hace que la racha se sienta
const sfxOk = () =>
	sfx(440 * Math.pow(2, Math.min(combo, 12) / 12), 55, "square", 0.045);
const sfxBad = () => sfx(200, 150, "sawtooth", 0.07, 90);
const sfxLate = () => sfx(300, 110, "triangle", 0.05, 150);
const sfxCoin = () => {
	sfx(988, 70, "triangle", 0.06);
	setTimeout(() => sfx(1319, 110, "triangle", 0.06), 70);
};
const sfxUnlock = () =>
	[523, 659, 784, 1047].forEach((f, i) =>
		setTimeout(() => sfx(f, 140, "triangle", 0.07), i * 90),
	);

// ---- extra vibes: sólo estética, el bop sale del reloj del propio mp3 ----
const BPM = 120,
	BEAT = 60 / BPM;
// el bombo del mp3 cae en 0.174s + n*0.5 (medido con un lowpass de 120Hz sobre el propio
// archivo), asi que el beat se adelanta 0.326s. ponytail: si el bop va corrido, mové esto.
let VIBE_OFF = 0.326;
const bopAt = (t) =>
	Math.pow(1 - (((((t + VIBE_OFF) / BEAT) % 1) + 1) % 1), 1.8);
let vibes = false,
	bop = 0;
const track = () => (vibes ? VIBE : BGM);
vibe.onclick = () => {
	vibes = !vibes;
	vibe.className = vibes ? "on" : "";
	// de acá cuelgan TODAS las reglas del latido: sin la clase el CSS ni las mira
	document.documentElement.classList[vibes ? "add" : "remove"]("vibes");
	if (vibes) {
		srcOn(VIBE);
		bakeBop();
	} // recién acá se pagan el mp3 y la capa del latido
	const on = track(),
		off = vibes ? BGM : VIBE,
		sonaba = !off.paused;
	mufV = -1; // la pista nueva no hereda el volumen cacheado de la otra
	off.pause();
	if (sonaba) on.play().catch(() => {});
	vibe.blur();
};

// ---- niveles y modos -------------------------------------------------------
// Todo lo que cambia entre partidas vive acá: el resto del juego lee LV y nunca
// pregunta "en qué nivel estoy".  Un nivel nuevo = un objeto más en esta lista.
//   C,R          tamaño del tablero
//   coins        monedas que abren la salida · mid: moneda que trae un gato más
//   foes         gatos negros al empezar
//   dur0/durMin  ventana por letra con combo 0 / con el combo al tope
//   foe0/foeMin  ms entre pasos de los gatos con 0 monedas / con todas
//   fog          radio de visión en celdas · lamps: faroles que la abren un rato
//   stalk        acechadores: persiguen SIEMPRE, pero van a medio paso
//   tut          el nivel se juega guiado paso a paso
const LEVELS = [
	{
		id: "tutorial",
		pic: "assets/nivel1.png",
		name: "PRIMEROS PASOS",
		tag: "NIVEL 1 · TUTORIAL",
		col: "#6f9",
		C: 9,
		R: 7,
		coins: 3,
		foes: 0,
		mid: 99,
		dur0: 2400,
		durMin: 1400,
		foe0: 900,
		foeMin: 700,
		tut: 1,
		desc: "El laberinto en chiquito y explicado paso a paso: mover, el reloj, el combo, el gato negro y la salida.",
		pts: [
			"El juego te va diciendo qué hacer",
			"El reloj recién aparece cuando toca explicarlo",
			"Se puede saltar en cualquier momento",
		],
	},
	{
		id: "clasico",
		pic: "assets/nivel2.png",
		name: "EL LABERINTO",
		tag: "NIVEL 2 · CLÁSICO",
		col: "#4cf",
		C: 15,
		R: 11,
		coins: 5,
		foes: 2,
		mid: 3,
		dur0: 1700,
		durMin: 650,
		foe0: 750,
		foeMin: 300,
		desc: "La partida de siempre: 15x11, cinco monedas y dos gatos negros que calculan el camino más corto hasta vos.",
		pts: [
			"Un tercer gato entra a la mitad",
			"Cada moneda acelera la cacería",
			"La salida abre con las 5 monedas",
		],
	},
	{
		id: "sotano",
		pic: "assets/nivel3.png",
		name: "EL SÓTANO",
		tag: "NIVEL 3 · PESADILLA",
		col: "#f4a",
		C: 17,
		R: 13,
		coins: 7,
		foes: 3,
		mid: 4,
		dur0: 1700,
		durMin: 650,
		foe0: 700,
		foeMin: 280,
		fog: 4.2,
		lamps: 3,
		stalk: 1,
		desc: "Un sótano el doble de grande y a oscuras: sólo ves lo que tenés al lado y algo ahí adentro no deja de seguirte nunca.",
		pts: [
			"<b>NIEBLA</b>: el mapa te lo acordás vos",
			"<b>FAROLES</b>: pisá uno y el sótano se enciende 5 segundos",
			"<b>ACECHADOR</b>: nunca despista; es lento pero no para",
			"<b>MAULLIDO</b>: acá además es radar de monedas y gatos",
			"Siete monedas: partida larga de verdad",
		],
	},
];
// Los modos todavía no se juegan: el selector ya los lista para que el día que
// existan sólo haya que sacarles el soon.
const MODES = [
	{
		id: "contra",
		name: "CONTRARRELOJ",
		tag: "MODO · PRÓXIMAMENTE",
		col: "#fd0",
		soon: 1,
		desc: "Un solo reloj para todo el laberinto: cada moneda te devuelve segundos y cada error te los cobra.",
		pts: [
			"El combo pasa a ser tiempo, no sólo estilo",
			"Sin retroceso: el castigo es el reloj",
		],
	},
	{
		id: "infinito",
		name: "SUPERVIVENCIA",
		tag: "MODO · PRÓXIMAMENTE",
		col: "#f66",
		soon: 1,
		desc: "Laberintos encadenados sin fin: al escapar de uno te espera el siguiente, más grande y con un gato más.",
		pts: [
			"El combo y el rango no se reinician entre laberintos",
			"Ranking por cuántos pisos aguantás",
		],
	},
];
const ALL = [...LEVELS, ...MODES];
let LV = LEVELS[1],
	bests = {};
// setLevel deja listo el tablero del nivel: tamaño del canvas y la proporción con
// la que el CSS del teléfono saca el ancho que entra en la pantalla.
function setLevel(id) {
	LV = ALL.find((l) => l.id === id && !l.soon) || LEVELS[1];
	C = LV.C;
	R = LV.R;
	root.style.setProperty("--ar", (C / R).toFixed(4));
	fit(); // fija --w, la resolución del canvas y, si cambió, rehornea
}

let tutOn = false,
	tstep = 0,
	tflag = 0,
	tAt = 0, // estado del tutorial guiado
	tpush = 0, // empujones dados en el paso actual (ver TUT_PUSH)
	tthru = 0, // muros atravesados con DETERMINACIÓN en el paso actual
	tmeow = 0, // maullidos soltados en el paso actual
	briefSeen = 0; // el primer encuentro ya se explicó
let g,
	p,
	vis,
	coins,
	lamps,
	revealT,
	got,
	win,
	t0,
	tEnd,
	parts,
	letters,
	phase,
	shownAt,
	durBase,
	combo,
	maxCombo,
	hits,
	fails,
	pen,
	shake,
	flash,
	cpop,
	unlockT,
	foes,
	prevFoe,
	foeTick,
	foeBeat,
	qte,
	log,
	trail,
	frozen,
	scareT,
	note,
	graceT = 0,
	qteWins = 0,
	det = 0,
	scareUntil = 0,
	meowAt = -1e9,
	meowOn = false,
	radar = null,
	stl = 0,
	maxStl = 0, // el medidor de ESTILO y su tope de la partida
	stlSum = 0,
	stlT = 0, // integral del estilo y tiempo jugado: de ahí sale el promedio
	stlAt = 0, // último cuadro contado (para el dt del promedio y del escurrido)
	kills = 0, // gatos vencidos SEGUIDOS: la cadena que paga cada vez más
	maxKills = 0, // ...y la cadena más larga de la partida, para el resumen
	baby = 0,
	noes = 0, // cuántas veces se dijo "así está bien" (ver checkSkill)
	dodges = 0, // gatos esquivados al cruce
	pfrom = null, // la celda que el jugador acaba de dejar, y cuándo
	paused = false,
	pauseAt = 0,
	nextAsk = 12;

// ---- balance: detector de skill issue ----
const COMBO_MAX = 15; // a 15 el reloj de reacción ya toca su mínimo
const comboFill = () => Math.min(1, combo / COMBO_MAX);
// ---- los dos medidores ------------------------------------------------------
// COMBO es la racha: sube de a uno, manda la ventana de reacción y el tono del
// blip, y CUALQUIER error lo borra entero.  ESTILO es el otro, el que da el
// rango: un error apenas lo abolla (STYLE_ERR) y lo que de verdad lo hunde es
// perder contra un gato (STYLE_LOSS).  Antes eran la misma variable, así que una
// tecla mal tirada te bajaba de SSS a D: la racha se pierde de una, el estilo se
// gasta de a poco.
//
// Pero el estilo TAMPOCO se regala.  Tres reglas lo vuelven un juicio y no un
// contador, y las tres se leen en la barra mientras se juega:
//
//   1. TECHO DE LAS LETRAS.  Teclear bien sube el medidor, pero sólo hasta un
//      techo que sale del COMBO (styleCap): sin racha el techo es cero y con la
//      racha llena llega justo a S.  Caminar el laberinto, por limpio que sea,
//      no pasa de ahí: es el piso del estilo, no el techo.
//   2. LOS GATOS SON EL RESTO.  SS y SSS salen de VENCER gatos, y encadenarlos
//      sin perder ninguno paga cada vez más (STYLE_CHAIN).  Perder un QTE corta
//      la cadena y hunde el medidor.
//   3. LO QUE PASA DEL TECHO SE ESCURRE.  Cada segundo por encima de styleCap()
//      se van STYLE_DECAY puntos, así que un rango alto no se guarda: o se
//      sostiene la racha y se sigue cazando, o se cae solo.
const STYLE_ERR = 3, // letra equivocada o tarde: un mordisco
	STYLE_LOSS = 10, // perder el QTE: eso sí duele
	STYLE_HIT = 0.5, // lo que suma una letra DENTRO del techo del combo
	STYLE_QTE = 4, // vencer un gato vale ocho letras...
	STYLE_CHAIN = 2, // ...y cada gato encadenado suma esto de más
	STYLE_CHAIN_MAX = 4, // hasta el 5º seguido (+8): más sería infinito
	STYLE_DECAY = 0.45; // puntos por segundo que se va lo que pasa del techo
// el tope deja al SSS a cinco puntos de distancia: sin él, media partida buena
// dejaba el medidor tan arriba que ningún castigo se notaba
const STYLE_MAX = 26;
// El techo que las letras solas pueden llenar.  Sale del combo y topa en S: de
// ahí para arriba el estilo lo dan los gatos.  Con el combo roto el techo es 0 y
// TODO el medidor queda escurriéndose: eso es lo que hace que la racha tenga que
// ser constante y no un pico.
const styleCap = () => RANKS[4].c * Math.sqrt(comboFill());
// lo que paga vencer un gato, con la cadena de gatos seguidos encima
const qteStyle = () =>
	STYLE_QTE + Math.min(STYLE_CHAIN_MAX, kills - 1) * STYLE_CHAIN;
const styleUp = (n) => {
	stl = Math.min(STYLE_MAX, stl + n);
	maxStl = Math.max(maxStl, stl);
};
// las letras no pasan del techo: si el medidor ya está arriba, teclear no suma
const styleHit = () => styleUp(Math.max(0, Math.min(STYLE_HIT, styleCap() - stl)));
const styleDown = (n) => {
	stl = Math.max(0, stl - n);
};
// EL PROMEDIO.  El rango que te llevás no es el que tocaste un segundo ni el que
// quedó al final: es la integral del medidor dividida por el tiempo jugado, o
// sea el estilo PROMEDIO de la partida entera.  Un pico de SSS en el último
// pasillo ya no tapa cuatro minutos en D, y sostener S de punta a punta vale más
// que rozar SSS una vez.  Se acumula en frame() con el reloj del juego, así que
// las pausas (menú, selector, carteles) no cuentan.
const avgStl = () => (stlT ? stlSum / stlT : stl);
// subir el combo es también lo que ARMA el maullido: se carga una vez y queda
function comboUp() {
	combo++;
	maxCombo = Math.max(maxCombo, combo);
	if (combo >= COMBO_MAX && !meowOn) {
		meowOn = true;
		sfxUnlock();
		say(
			"AHUYENTADOR LISTO",
			"ESPACIO O ENTER SUELTA EL MAULLIDO",
			"#9ff",
		);
	}
}
// Rangos al estilo Devil May Cry: la racha deja de ser un número y pasa a ser un
// grado con nombre.  El tope de la dificultad sigue en COMBO_MAX; SS y SSS son
// puro flex, para que siempre quede algo arriba que perseguir.
const RANKS = [
	{ c: 0, k: "D", n: "DORMIDO", col: "#8ad" },
	{ c: 3, k: "C", n: "CURIOSO", col: "#4cf" },
	{ c: 6, k: "B", n: "BRAVO", col: "#6f9" },
	{ c: 9, k: "A", n: "ARRASANDO", col: "#fd0" },
	{ c: 12, k: "S", n: "SALVAJE", col: "#f80" },
	{ c: 16, k: "SS", n: "SUPREMO", col: "#f4a" },
	{ c: 21, k: "SSS", n: "SIN PIEDAD", col: "#fff" },
];
// el rango sale del ESTILO (v: para leer el rango de otro valor, como el máximo
// de la partida en la pantalla de resultados)
const rankI = (v) => {
	const q = v === undefined ? stl : v;
	let i = 0;
	while (i + 1 < RANKS.length && q >= RANKS[i + 1].c) i++;
	return i;
};
// el medidor muestra lo que falta para el rango SIGUIENTE: se vacía y vuelve a
// llenarse en cada ascenso, que es lo que hace que la racha se sienta
const rankFill = () => {
	const i = rankI(),
		a = RANKS[i].c,
		b = RANKS[i + 1] && RANKS[i + 1].c;
	return b === undefined ? 1 : Math.min(1, (stl - a) / (b - a));
};
const comboCol = () => RANKS[rankI()].col;
// ---- las dos habilidades ----------------------------------------------------
// DETERMINACIÓN: cada 3 gatos vencidos en un QTE, una carga.  Con carga, los muros
// de tu celda también muestran letra (en violeta) y teclearla te cruza el muro.
// AHUYENTADOR: ESPACIO o ENTER sueltan un maullido que pone a los gatos cercanos
// a correr para el otro lado (y en el sótano deja un radar).  Se ARMA la primera
// vez que el combo llega al tope y queda armado toda la partida: el costo no es
// el combo sino el cooldown de 45 s desde el último maullido.
const GRACE_MS = 2000, // respiro sin reloj al ganar un QTE
	TUT_GRACE_MS = 5000, // en el tutorial el respiro es más largo (ver qteEnd)
	DET_EVERY = 3,
	DET_MAX = 3,
	MEOW_MS = 2500,
	MEOW_CD = 45000,
	MEOW_R = 7; // MEOW_R: "cercano" en celdas de laberinto
// el eco del maullido en el sótano: cuánto dura y cuánto miente (en celdas)
const RADAR_MS = 4500,
	RADAR_J = 0.45;
const ping = (i, k) => ({
	x: (i % C) + 0.5 + (Math.random() * 2 - 1) * RADAR_J,
	y: ((i / C) | 0) + 0.5 + (Math.random() * 2 - 1) * RADAR_J,
	k,
});
const DV = { n: [0, -1], e: [1, 0], s: [0, 1], w: [-1, 0] };
const meowCd = (T) => Math.max(0, MEOW_CD - (T - meowAt));
// pedía el combo AL TOPE en el momento de maullar, y eso lo volvía inservible:
// justo cuando un gato te alcanza es cuando el combo se está por romper.  Ahora
// se ARMA la primera vez que lo llenás y de ahí en más sólo lo frena el cooldown.
const meowReady = (T) => meowOn && meowCd(T === undefined ? now() : T) <= 0;
// cómo se leen las dos habilidades: entero en escritorio y en el menú, en iconos
// en la barra del teléfono, donde no hay renglón para una frase
const habTxt = (T) =>
	(det ? `  ·  DETERMINACIÓN ${"\u25C8".repeat(det)}` : "") +
	(!meowOn
		? comboFill() >= 0.6
			? `  ·  MAULLIDO A x${COMBO_MAX}`
			: "" // callado si falta mucho
		: meowCd(T)
			? `  ·  MAULLIDO EN ${Math.ceil(meowCd(T) / 1000)}s`
			: "  ·  MAULLIDO LISTO [ESPACIO]");
// en el teléfono el ♪ tiene su propio botón en la barra (#bmeow), así que acá
// queda sólo la determinación, que no tiene otro lugar donde leerse
const habIco = () => (det ? "  " + "\u25C8".repeat(det) : "");

const exitOpen = () => got >= LV.coins; // única condición para escapar: las monedas
// cada baby point = 35% más de tiempo.  Toma un valor suelto para que el selector
// de nivel pueda mostrar lo que van a valer los que todavía no se aplicaron.
const babyK = (n) => 1 + 0.35 * (n === undefined ? baby : n);
const dur = () => durBase * babyK();
const acc = () => (hits + fails ? hits / (hits + fails) : 1);
// Decir "NO, ASÍ ESTÁ BIEN" y que el cartel vuelva a los 25 teclazos es no haber
// escuchado la respuesta.  Cada NO hace las dos cosas: alarga la espera (60 teclas
// por cada uno) y baja el umbral de precisión con el que el cartel se anima a
// aparecer, así que al segundo NO prácticamente hay que jugar el doble de mal para
// volver a verlo.  El SÍ sigue con el cooldown corto de siempre: ése lo pidió.
const skillAcc = () => Math.max(0.45, 0.8 - 0.12 * noes);
function checkSkill() {
	const n = hits + fails;
	if (
		skillOff ||
		paused ||
		qte ||
		frozen ||
		win ||
		tutOn ||
		n < 12 ||
		n < nextAsk ||
		acc() >= skillAcc()
	)
		return;
	paused = true;
	pauseAt = now();
	if (MOBILE) kb.blur(); // el teclado taparía el diálogo
	sacc.textContent = Math.round(acc() * 100) + "%";
	rageOn();
	skill.style.display = "grid";
}
// con cualquier panel abierto el reloj se congela; al cerrarlo se devuelve lo pausado
function unpause() {
	const d = now() - pauseAt;
	if (t0) {
		t0 += d;
		shownAt += d;
		foeTick += d;
	} // sin primera tecla no hay reloj que correr
	graceT += d;
	scareUntil += d;
	meowAt += d; // ni el respiro, ni el maullido, ni su cooldown
	tAt += d; // ni el empujón del tutorial, que si no salta al cerrar el panel
	if (qte) qte.until += d; // ni el QTE, que si no se pierde solo al cerrar el panel
	if (revealT) revealT += d; // ni el farol, que si no se gasta en la pausa
	if (radar) radar.t += d;
	if (resAt) resAt += d; // ni el resumen, que si no salta sobre el menú
	paused = false;
}
function babyEnd(yes) {
	if (yes) baby++;
	else noes++;
	nextAsk = hits + fails + (yes ? 25 : 60 * noes);
	skill.style.display = "none";
	unpause();
	if (MOBILE) kbFocus(); // devolver el teclado que cerró el diálogo
}
byes.onclick = () => babyEnd(true);
bno.onclick = () => babyEnd(false);

// ...y para el que no lo quiere ver NUNCA, el interruptor.  Vive en los dos
// lugares donde se decide cómo se va a jugar —el menú de ESC y el selector de
// nivel— y es el mismo estado en los dos, así que da igual dónde se toque.  Se
// recuerda entre partidas, como el tutorial ya visto.
let skillOff = (() => {
	try {
		return localStorage.getItem("lg.skill") === "0";
	} catch (e) {
		return false;
	}
})();
function skillSync() {
	const t = (skillOff ? "\u2610" : "\u2611") + " SKILL ISSUE";
	skb.textContent = t;
	skb.className = skillOff ? "" : "on";
	lskb.textContent = t;
	lskb.className = skillOff ? "" : "on";
}
function skillSet(v) {
	skillOff = v;
	try {
		localStorage.setItem("lg.skill", v ? "0" : "1");
	} catch (e) {}
	if (v && skill.style.display === "grid") {
		skill.style.display = "none"; // si justo estaba abierto, se va con su pausa
		unpause();
	}
	skillSync();
}
skb.onclick = () => {
	skillSet(!skillOff);
	skb.blur();
};
lskb.onclick = () => skillSet(!skillOff);
skillSync();

function gen() {
	g = [...Array(C * R)].map((_) => ({ n: 1, e: 1, s: 1, w: 1, v: 0 }));
	const st = [0];
	g[0].v = 1;
	while (st.length) {
		const c = st[st.length - 1],
			cx = c % C,
			cy = (c / C) | 0;
		const nb = [
			[0, -1, "n", "s"],
			[1, 0, "e", "w"],
			[0, 1, "s", "n"],
			[-1, 0, "w", "e"],
		]
			.map(([dx, dy, a, b]) => [cx + dx, cy + dy, a, b])
			.filter(
				([nx, ny]) =>
					nx >= 0 &&
					ny >= 0 &&
					nx < C &&
					ny < R &&
					!g[ny * C + nx].v,
			);
		if (!nb.length) {
			st.pop();
			continue;
		}
		const [nx, ny, a, b] = nb[(Math.random() * nb.length) | 0],
			n = ny * C + nx;
		g[c][a] = 0;
		g[n][b] = 0;
		g[n].v = 1;
		st.push(n);
	}
	p = { x: 0, y: 0 };
	vis = { x: 0, y: 0 };
	got = 0;
	win = false;
	t0 = null;
	tEnd = 0;
	parts = [];
	combo = 0;
	maxCombo = 0;
	stl = 0;
	maxStl = 0;
	stlSum = 0;
	stlT = 0;
	stlAt = 0;
	kills = 0;
	maxKills = 0;
	hits = 0;
	fails = 0;
	pen = 0;
	shake = 0;
	flash = 0;
	cpop = 0;
	unlockT = 0;
	qte = null;
	foeTick = 0;
	foeBeat = 0;
	log = [];
	logEl.innerHTML = "";
	trail = [];
	frozen = false;
	clearTimeout(scareT);
	scare.style.display = "none";
	boom.style.display = "none";
	paused = false;
	nextAsk = 12;
	skill.style.display = "none"; // el baby mode sí se conserva
	graceT = 0;
	qteWins = 0;
	dodges = 0;
	pfrom = null;
	det = 0;
	scareUntil = 0;
	meowAt = -1e9;
	note = null; // habilidades de cero
	meowOn = false;
	radar = null;
	resHide();
	newPB = false;
	coins = [];
	lamps = [];
	revealT = 0;
	foes = [];
	briefSeen = 0;
	brief.className = ""; // el cartel del primer encuentro, de cero
	// en el tutorial las monedas y los gatos los va soltando cada paso, no el gen()
	if (!LV.tut) {
		spawn(coins, LV.coins);
		spawn(lamps, LV.lamps || 0);
		// de a uno y no con un map: así cada gato ve dónde quedaron los otros
		for (let i = 0; i < LV.foes; i++) foes.push(far());
	}
	prevFoe = [];
	// la cara y el grito del acechador se bajan al generar el primer sótano
	if (LV.stalk) {
		if (!STALK.src) STALK.src = "assets/acechador.png";
		if (!LOBO.src) LOBO.src = "assets/lobotomy.mp3";
	}
	bakeMaze(); // el laberinto nuevo se hornea una sola vez
	deal();
	tutStart(); // arma (o apaga) el tutorial del nivel
}
// ---- reparto en el tablero --------------------------------------------------
// Antes cada moneda, farol o gato caía en una celda al azar y listo: podían
// salir dos monedas pegadas en el mismo rincón, o un gato negro a dos pasos
// tuyos apenas arrancaba el nivel.  Ahora todo pasa por place(): se tiran
// SPREAD_K celdas al azar y gana la primera que cumple los DOS mínimos —lo que
// hay que caminar desde el gato blanco y lo que la separa de todo lo que ya
// está puesto—.  Sigue siendo aleatorio, pero repartido: entre un encuentro y
// el siguiente siempre queda tramo de laberinto para reaccionar y respirar.
const SPREAD_K = 160; // tiros por objeto antes de conformarse con el menos malo
// separación entre dos cosas del tablero: va en línea recta porque es la que se VE
const SEP = () => Math.max(2, ((C + R) / 6) | 0);
// caminata mínima hasta una moneda o un farol
const NEAR = () => Math.max(3, ((C + R) / 3) | 0);
// Y la de un gato negro, que a diferencia de una moneda viene caminando hacia
// vos: ésa se mide en SEGUNDOS, no en celdas.  Diez celdas son una eternidad en
// el nivel 1 (900 ms por paso) y un suspiro en el sótano con todas las monedas
// (280 ms), así que un número fijo de celdas daba un respiro distinto en cada
// nivel y en cada tramo de la partida.  FAR devuelve las celdas que, a la
// velocidad de caza de ESTE momento, le cuestan al gato REST_MS de camino: el
// rato para reaccionar al encuentro anterior y prepararse para el siguiente.
// Antes eran 8 celdas EN LÍNEA RECTA, y en línea recta el laberinto miente: un
// gato "a ocho celdas" puede tener las paredes abiertas y caerte encima ya.
const REST_MS = 8000;
const FAR = () => Math.max(6, Math.round(REST_MS / foeMs()));
const sep = (a, b) =>
	Math.abs((a % C) - (b % C)) + Math.abs(((a / C) | 0) - ((b / C) | 0));
// place(d, min, otros): d = campo de distancias desde el PJ (flow), min = celdas
// que como mínimo hay que caminar, otros = lo que ya está en el tablero.  El
// puntaje se recorta en 0 a propósito: apenas una celda cumple los dos mínimos
// ya está bien y gana ésa, así que el reparto no termina SIEMPRE en el rincón
// más lejano.  Si ninguna llega, vuelve la menos mala y, si ni eso, la primera
// libre: en un tablero apretado el reparto se achica, pero nunca se cuelga.
function place(d, min, otros) {
	const gap = SEP();
	let best = -1,
		bs = -1e9;
	for (let k = 0; k < SPREAD_K; k++) {
		const i = (Math.random() * C * R) | 0;
		if (!i || i === C * R - 1 || d[i] < 1 || otros.includes(i)) continue;
		const s = Math.min(
			0,
			d[i] - min,
			...otros.map((o) => sep(i, o) - gap),
		);
		if (s > bs) {
			bs = s;
			best = i;
		}
		if (!s) return i; // cumple los dos mínimos: no hace falta buscar más
	}
	if (best < 0)
		for (let i = 1; i < C * R - 1; i++) if (!otros.includes(i)) return i;
	return best;
}
// monedas y faroles: repartidos, y ninguno en la falda del jugador
function spawn(arr, n) {
	const d = flow(),
		min = NEAR();
	let guard = 0;
	while (arr.length < n && guard++ < 999) {
		const i = place(d, min, [...coins, ...lamps]);
		if (i < 0) break;
		arr.push(i);
	}
}
// un gato negro lejos: lejos del jugador Y lejos de los gatos que ya están
function far() {
	return Math.max(0, place(flow(), FAR(), foes || []));
}

const DIRS = [
	[0, -1, "n"],
	[1, 0, "e"],
	[0, 1, "s"],
	[-1, 0, "w"],
];
const open = (i) =>
	DIRS.filter(([, , w]) => !g[i][w])
		.map(([dx, dy]) =>
			((i / C) | 0) + dy >= 0 &&
			((i / C) | 0) + dy < R &&
			(i % C) + dx >= 0 &&
			(i % C) + dx < C
				? (((i / C) | 0) + dy) * C + (i % C) + dx
				: -1,
		)
		.filter((n) => n >= 0);

// dificultad: sube con cada moneda recogida, entre los topes del nivel
const foeMs = () => LV.foe0 - ((LV.foe0 - LV.foeMin) * got) / LV.coins;
const chaseP = () => 0.7 + (0.25 * got) / LV.coins; // 70% -> 95% de persecución
const qteLen = () => 3 + Math.round((5 * got) / LV.coins); // 3 -> 8 letras
const MS_LETRA = 700; // margen constante por letra

// campo de flujo: distancia REAL por el laberinto desde el PJ (BFS).
// Con Manhattan los gatos se metían en callejones porque la línea recta miente.
// se corre entero en cada paso de los gatos: con open() eran 4 arrays por celda
// (165 celdas x 3/seg).  Los vecinos van inline, el resultado es idéntico.
function flow() {
	const d = new Int16Array(C * R).fill(-1),
		src = p.y * C + p.x,
		q = [src];
	d[src] = 0;
	for (let i = 0; i < q.length; i++) {
		const c = q[i],
			cx = c % C,
			cy = (c / C) | 0,
			k = g[c],
			nd = d[c] + 1;
		if (!k.n && cy > 0 && d[c - C] < 0) {
			d[c - C] = nd;
			q.push(c - C);
		}
		if (!k.s && cy < R - 1 && d[c + C] < 0) {
			d[c + C] = nd;
			q.push(c + C);
		}
		if (!k.w && cx > 0 && d[c - 1] < 0) {
			d[c - 1] = nd;
			q.push(c - 1);
		}
		if (!k.e && cx < C - 1 && d[c + 1] < 0) {
			d[c + 1] = nd;
			q.push(c + 1);
		}
	}
	return d;
}
// ESQUIVE AL CRUCE.  El gato venía desde `f` hacia tu casilla y vos, casi en el
// mismo instante —normalmente por equivocarte y retroceder justo ahí—, saliste
// hacia la suya: se cruzan de frente, cada uno se queda con la casilla del otro y
// el gato pasa de largo sin tocarte.  Ninguna de las dos comprobaciones de choque
// lo agarra (stepBack no mira gatos, y moveFoes mira tu casilla DESPUÉS de que se
// movió), así que hasta ahora era un agujero que el jugador descubría solo y no
// pagaba nada.  Es la jugada más difícil que tiene el juego: ahora paga.
const DODGE_MS = 1200, // "casi al mismo tiempo": el margen entre las dos movidas
	STYLE_DODGE = 9; // más que vencer un gato de QTE (STYLE_QTE), y con razón
function dodge(f, next) {
	if (
		!pfrom ||
		next !== pfrom.c || // el gato entra justo a la casilla que dejaste...
		f !== p.y * C + p.x || // ...y vos te quedaste con la que él dejó
		now() - pfrom.t > DODGE_MS
	)
		return;
	dodges++;
	styleUp(STYLE_DODGE);
	shake = 11;
	sfx(300, 90, "square", 0.05, 900);
	setTimeout(() => sfx(1200, 240, "triangle", 0.06, 700), 90);
	burst(p.x * S + S / 2, p.y * S + S / 2, "#9ff", 26);
	say(
		"¡LO ESQUIVASTE AL CRUCE!",
		`+${STYLE_DODGE} DE ESTILO · ESO NO SE APRENDE`,
		"#9ff",
	);
}
function moveFoes() {
	const d = flow();
	foeBeat++;
	const huyen = now() < scareUntil; // ahuyentador activo
	foes = foes.map((f, i) => {
		const st = i < (LV.stalk || 0); // acechador del sótano
		if (st && !huyen && foeBeat % 2) return f; // va a medio paso...
		let nb = open(f);
		if (!nb.length) return f;
		// AHUYENTADOR: el mismo campo de flujo, leído al revés.  Sólo lo escuchan los
		// que están cerca (el maullido no llega al otro lado del laberinto), pero al
		// que lo escucha lo pone a correr aunque sea el acechador, que no despista nunca.
		if (huyen && d[f] >= 0 && d[f] <= MEOW_R) {
			prevFoe[i] = f;
			return nb.reduce((a, b) => (d[b] > d[a] ? b : a));
		}
		const fwd = nb.filter((n) => n !== prevFoe[i]); // no se devuelve salvo callejón
		if (fwd.length) nb = fwd;
		const next =
			st || Math.random() < chaseP() // ...pero nunca despista
				? nb.reduce((a, b) => (d[b] < d[a] ? b : a)) // baja por el campo de flujo
				: nb[(Math.random() * nb.length) | 0]; // despista
		prevFoe[i] = f;
		dodge(f, next); // ¿se cruzaron sin tocarse? eso se paga
		return next;
	});
	if (!huyen && foes.includes(p.y * C + p.x)) qteStart();
}

// ---- el maullido -----------------------------------------------------------
// Pide el combo AL TOPE siempre (no lo gasta: el precio es el cooldown de 45 s).
// Devuelve true sólo si salió, para que quien lo llame sepa si hacer otra cosa.
function meow() {
	if (win || frozen || paused || qte || tutHold()) return false;
	if (!meowReady()) {
		sfx(120, 180, "sine", 0.035, 80);
		return false;
	} // negado: un gruñido
	meowAt = now();
	scareUntil = meowAt + MEOW_MS;
	// RADAR: a oscuras el maullido vuelve con algo más que gatos asustados.  Las
	// monedas son las que quedan; los gatos son los que HABÍA al maullar (para
	// cuando el eco se apaga ya se corrieron, que es justo la gracia).  No se
	// guarda la celda sino un punto con ruido: es una pista, no un mapa.
	if (LV.fog)
		radar = {
			t: meowAt,
			pts: [
				...coins.map((i) => ping(i, 0)),
				...foes.map((i) => ping(i, 1)),
			],
		};
	// maullido de verdad: sube y después cae, no un beep
	sfx(520, 240, "sawtooth", 0.055, 900);
	setTimeout(() => sfx(900, 420, "sawtooth", 0.05, 280), 150);
	shake = 13;
	tmeow++; // el paso del tutorial que enseña el maullido espera esto
	burst(p.x * S + S / 2, p.y * S + S / 2, "#9ff", 34);
	say("¡MAULLIDO!", "LOS GATOS NEGROS SE ALEJAN", "#9ff");
	return true;
}

// ---- QTE ----
// El PRIMER encuentro del tutorial va con la secuencia más corta y más del
// doble de margen por letra.  Un QTE que cae de sorpresa la primera vez no se
// aprende: se pierde, y lo que queda es el susto, no la mecánica.  Se mantiene
// blando hasta que se gane uno: si el primero se falla, el que sigue vuelve a
// ser el fácil.
const TUT_QTE_N = 3,
	TUT_QTE_MS = 1500;
function qteStart() {
	if (qte || win || frozen) return;
	// ...y antes de ese primero el juego se frena y lo explica (ver briefShow)
	if (tutOn && !briefSeen) return briefShow();
	const primero = tutOn && !qteWins,
		free = [...POOL].sort(() => Math.random() - 0.5),
		n = primero ? TUT_QTE_N : qteLen(),
		ms = n * (primero ? TUT_QTE_MS : MS_LETRA) * babyK(),
		// los acechadores son los primeros de `foes` (ver moveFoes): quién te
		// alcanzó decide qué cara y qué grito trae el jumpscare si se pierde
		fi = foes.indexOf(p.y * C + p.x);
	qte = {
		seq: [...Array(n)].map((_) => free.pop()),
		i: 0,
		ms,
		until: now() + ms,
		st: fi > -1 && fi < (LV.stalk || 0),
	};
	shake = 10;
}
function qteEnd(okAll) {
	const cell = p.y * C + p.x,
		st = !!(qte && qte.st); // te alcanzó el acechador del sótano
	if (okAll) {
		pen -= 500;
		comboUp();
		// la CADENA: el 1º paga STYLE_QTE y cada gato seguido paga STYLE_CHAIN
		// más, hasta el 5º.  Es la única forma de pasar de S, así que el rango
		// alto no es "jugar prolijo": es haber estado cazando.
		kills++;
		maxKills = Math.max(maxKills, kills);
		styleUp(qteStyle());
		tflag++;
		if (kills >= 2)
			say(
				`¡RACHA DE ${kills} GATOS!`,
				`+${qteStyle()} DE ESTILO`,
				"#4cf",
			);
		// Salís del QTE con la pantalla llena de secuencia y sin saber para dónde
		// estabas yendo: el reloj de la letra arranca recién 2 s después, y en ese
		// rato los gatos tampoco dan un paso.  Es tiempo para MIRAR, no para correr.
		// en el tutorial el respiro va más largo: se gana el encuentro, recién
		// ahí aparecen las monedas y hay un cartel nuevo que leer.  Con dos
		// segundos el gato reubicado ya venía de vuelta antes de terminar.
		graceT = now() + (tutOn ? TUT_GRACE_MS : GRACE_MS);
		if (++qteWins % DET_EVERY === 0 && det < DET_MAX) {
			// tres gatos = una carga
			det++;
			sfxUnlock();
			say(
				"DETERMINACIÓN",
				"LA LETRA VIOLETA ATRAVIESA EL MURO",
				"#c8f",
			);
		}
		burst(p.x * S + S / 2, p.y * S + S / 2, "#4cf", 26);
		play(BANG).catch(() => {});
		boom.src = "";
		boom.src = BOOM; // reinicia el gif
		boom.style.cssText = `position:absolute;display:block;pointer-events:none;z-index:2;top:${((p.y * S - 25) / BH) * 100}%;left:${((p.x * S - 25) / BW) * 100}%;width:${(84 / BW) * 100}%`; // en % para que escale en móvil
		setTimeout(() => (boom.style.display = "none"), 900);
	} else {
		// perder contra un gato es lo único que le pega FUERTE al estilo: la racha
		// se corta igual que con un error, pero acá el medidor de color se hunde
		pen += 2000;
		combo = 0;
		kills = 0; // se corta la cadena: el gato siguiente vuelve a pagar el mínimo
		styleDown(STYLE_LOSS);
		flash = 1;
		shake = 14;
		sfxBad();
		burst(p.x * S + S / 2, p.y * S + S / 2, "#f45", 20);
		for (let i = 0; i < 3; i++) stepBack(); // fallar = 3 pasos atrás
	}
	foes = foes.map((f) => (f === cell ? far() : f)); // el enemigo se reubica lejos igual
	// en el tutorial cada encuentro reinicia el empujón: el gato se fue lejos y
	// vuelve a haber camino que verle hacer antes de que se lo acerque nadie
	if (tutOn) {
		tpush = 0;
		tAt = now();
	}
	qte = null;
	if (okAll) deal();
	else scareShow(st);
}

// ---- el cartel de las dos habilidades (tutorial) ---------------------------
// La determinación y el maullido se contaban en un renglón del menú y nada más:
// se leían, no se reconocían.  Ahora tienen el mismo trato que el QTE —primero
// se MUESTRAN y después se cuentan—: el juego se congela, corre la escena en
// chico (el gato blanco cruzando el muro por la letra violeta, o la onda del
// maullido sacando a los gatos negros de encima) y recién al decir ENTENDIDO
// arranca el paso donde hay que usarla.  Todo el movimiento lo hace el CSS: con
// el cartel en display:none las animaciones no corren.
//
// Y no se cierra con el teclado, por lo mismo que el otro: el maullido SE SUELTA
// con ESPACIO, así que un espacio ya en camino se llevaría puesta la explicación
// de lo que estaba por leer.
const HAB_LOCK = 1200;
let habAt = 0;
function habShow(k) {
	habAt = now();
	if (!paused) {
		paused = true;
		pauseAt = now();
	}
	if (MOBILE) kb.blur(); // el teclado del teléfono taparía medio cartel
	hab.className = "on " + k;
}
const habOn = () => /(^| )on( |$)/.test(hab.className);
const habReady = () => habOn() && now() - habAt >= HAB_LOCK;
function habGo() {
	if (!habReady()) return;
	hab.className = "";
	unpause();
	if (MOBILE) kbFocus();
}
hok.onclick = habGo;

// ---- la pausa del primer encuentro (tutorial) ------------------------------
// El gato te alcanzó por primera vez.  En vez de tirarte el QTE encima, el juego
// se congela entero —el mismo `paused` que usan el menú y el diálogo de skill
// issue, así que el reloj, los gatos, el respiro y el maullido quedan quietos— y
// el cartel explica qué hay que teclear.  Recién al decir ESTOY LISTO arranca el
// QTE, y arranca con la versión blanda de arriba.
//
// Este cartel no se puede perder por accidente: es la ÚNICA vez que el juego
// explica el sistema y aparece justo cuando el jugador está tecleando para
// moverse.  Por eso sale sólo por su botón (ver onkeydown) y ni siquiera de
// entrada: durante BRIEF_LOCK ms el botón está apagado —lo muestra cargándose—
// y el clic que ya venía en camino no se lleva la explicación puesta.
const BRIEF_LOCK = 1400;
let briefAt = 0;
function briefShow() {
	briefSeen = 1;
	briefAt = now();
	if (!paused) {
		paused = true;
		pauseAt = now();
	}
	if (MOBILE) kb.blur(); // el teclado del teléfono taparía medio cartel
	brief.className = "on";
}
const briefReady = () =>
	brief.className === "on" && now() - briefAt >= BRIEF_LOCK;
function briefGo() {
	if (!briefReady()) return; // todavía se está leyendo
	brief.className = "";
	unpause();
	if (MOBILE) kbFocus(); // devolver el teclado que cerró el cartel
	qteStart(); // ahora sí: con briefSeen puesto, la pausa no se repite
}
bok.onclick = briefGo;

// El enemigo te come la pantalla mientras suena el grito.  El ACECHADOR del
// sótano trae los suyos —su cara y su grito— y encima sale distinto: el resto
// corta de golpe cuando el mp3 termina, y él se DESVANECE.  La imagen la apaga el
// CSS (#scare.fade) y el audio baja con el mismo perfil desde frame(), así que el
// susto no termina, se disuelve: es lo que lo deja pegado un rato más.
const SCARE_FADE = 2200; // lo que tarda en irse el del acechador
let scareA = null, // el audio que está sonando ahora
	scareFade = 0; // cuándo arrancó su desvanecido (0 = no se desvanece)
function scareShow(st) {
	frozen = true;
	mufSlow = 1; // hubo jumpscare: la música vuelve por el camino largo
	const ace = !!st;
	scareA = ace ? LOBO : SCREAM;
	scare.style.backgroundImage = `url(${(ace && ready(STALK) ? STALK : BIG).src})`;
	scare.className = ace ? "fade" : "";
	scare.style.display = "block";
	scareFade = ace ? now() : 0;
	if (scareA.volume !== undefined) scareA.volume = 1;
	SCREAM.onended = ace ? null : scareHide;
	play(scareA).catch(scareHide);
	clearTimeout(scareT);
	// el acechador se va con su fade; el resto, cuando el grito termina (y a los
	// 8 s igual, ponytail: red por si el audio no suena)
	scareT = setTimeout(scareHide, ace ? SCARE_FADE : 8000);
}
function scareHide() {
	clearTimeout(scareT);
	SCREAM.onended = null;
	scare.style.display = "none";
	scare.className = "";
	if (scareA) {
		if (scareA.volume !== undefined) scareA.volume = 1;
		if (!scareA.paused) scareA.pause();
	}
	scareA = null;
	scareFade = 0;
	frozen = false;
	deal();
}

const LOG_KEEP = 180; // el div muestra 3 renglones; el resto sobra
function push(k, kind) {
	log.push({ k, kind });
	if (!MOBILE) {
		// en el teléfono el log ni se dibuja
		logEl.insertAdjacentHTML(
			"beforeend",
			`<span class="${CLS[kind]}">${k.toUpperCase()}</span>`,
		);
		// sin tope, una partida larga dejaba cientos de <span> invisibles y cada tecla
		// costaba un reflow más caro que la anterior
		while (logEl.childElementCount > LOG_KEEP)
			logEl.removeChild(logEl.firstChild);
		logEl.scrollTop = logEl.scrollHeight;
	}
	checkSkill(); // se evalúa con cada tecla registrada
}

// Letras nuevas para cada salida abierta de la celda actual.  Con una carga de
// DETERMINACIÓN encima, los MUROS que dan a una celda del tablero también reciben
// letra: quedan marcados en `phase` y son las únicas que se pueden atravesar.  Los
// muros del borde no entran: la letra caería fuera del canvas y no lleva a ningún lado.
function deal() {
	const free = [...POOL].sort(() => Math.random() - 0.5),
		i = p.y * C + p.x;
	letters = {};
	phase = {};
	["n", "e", "s", "w"].forEach((d) => {
		if (!g[i][d]) letters[d] = free.pop();
	});
	if (det > 0)
		["n", "e", "s", "w"].forEach((d) => {
			const nx = p.x + DV[d][0],
				ny = p.y + DV[d][1];
			if (g[i][d] && nx >= 0 && ny >= 0 && nx < C && ny < R) {
				letters[d] = free.pop();
				phase[d] = 1;
			}
		});
	shownAt = now();
	durBase = Math.max(LV.durMin, LV.dur0 - combo * 70); // más combo => menos tiempo para reaccionar
}

function burst(cx, cy, col, n = 14) {
	const m = Math.max(4, (n * PERF.dust) | 0); // en móvil el chispazo va más corto
	for (let i = 0; i < m; i++) {
		const a = Math.random() * 6.283,
			s = 1 + Math.random() * 2.5;
		parts.push({
			x: cx,
			y: cy,
			vx: Math.cos(a) * s,
			vy: Math.sin(a) * s,
			l: 1,
			c: col,
		});
	}
}
// cada error te devuelve un paso atrás por el camino que recorriste
function stepBack() {
	const c = trail.pop();
	if (c !== undefined) {
		pfrom = { c: p.y * C + p.x, t: now() }; // ver dodge()
		p = { x: c % C, y: (c / C) | 0 };
	}
}
function penalize(ms, col, kind, k) {
	pen += ms;
	combo = 0;
	styleDown(STYLE_ERR);
	fails++;
	shake = 9;
	flash = 1;
	kind === "late" ? sfxLate() : sfxBad();
	push(k, kind);
	burst(p.x * S + S / 2, p.y * S + S / 2, col, 10);
	stepBack();
	deal();
}

// ---- carteles a media pantalla ---------------------------------------------
// Los usa la salida desbloqueada y también los avisos de las dos habilidades.
// say() deja uno pendiente; banner() lo pinta y se apaga solo a los 1.8 s.
const NOTE_MS = 1800;
function say(a, b, col) {
	note = { t: now(), a, b, col };
}
function banner(T, at, a, b, col, dy) {
	const k = Math.max(0, 1 - (T - at) / NOTE_MS),
		Y = BH / 2 + (dy || 0);
	x.globalAlpha = k;
	x.fillStyle = "rgba(2,6,12,.88)";
	x.fillRect(0, Y - 32, BW, 58);
	x.strokeStyle = col;
	x.lineWidth = 1;
	x.shadowColor = col;
	x.shadowBlur = 12 * GLOW;
	x.strokeRect(0.5, Y - 31.5, BW - 1, 57);
	x.font = "italic 900 23px " + DF;
	x.shadowBlur = 20 * GLOW;
	x.fillStyle = col;
	x.fillText(a, BW / 2, Y - 13);
	x.font = "bold 13px " + CF;
	x.fillText(b, BW / 2, Y + 9);
	x.globalAlpha = 1;
	x.shadowBlur = 0;
}

const root = document.documentElement;
let lastW,
	lastLab,
	lastCw,
	lastMst,
	lastMw,
	lastSc,
	lastBop, // el frame no reescribe estilos que no cambiaron
	lastT,
	lastEx,
	lastSub,
	lastMeta,
	lastRank = 0,
	hudAt = 0,
	lastDraw = 0;
const REVEAL_MS = 5000; // lo que dura encendido un farol
// ---- niebla horneada -------------------------------------------------------
// Evaluar un degradado radial sobre el tablero entero costaba más que TODO el
// resto del cuadro junto (17 de 28 ms con el móvil a 6x de throttle).  El
// degradado no cambia nunca: se hornea a un parche cuadrado una sola vez y el
// cuadro lo pega escalado al radio de visión (un blit) más los rectángulos
// sólidos de afuera.  Mismo dibujo, sin gradiente por píxel.
const FOG = "rgba(3,4,10,",
	FOG_N = 256;
let fogTex; // undefined = sin hornear · null = no se pudo
function bakeFog() {
	const c = document.createElement("canvas");
	c.width = c.height = FOG_N;
	const k = c.getContext("2d");
	if (!k) return null;
	const h = FOG_N / 2,
		gr = k.createRadialGradient(h, h, h * 0.5, h, h, h);
	gr.addColorStop(0, FOG + "0)");
	gr.addColorStop(0.72, FOG + ".8)");
	gr.addColorStop(1, FOG + ".985)");
	k.fillStyle = gr;
	k.fillRect(0, 0, FOG_N, FOG_N);
	return c;
}

// El cartel del rango es lo más grande que se dibuja sobre el tablero, así que en
// un laberinto chico —o con el gato pegado a un borde— le caía justo encima.  En
// vez de fijarlo a una esquina se prueban las cuatro contra la celda del gato y se
// usa la primera libre; el orden deja arriba-derecha como la de siempre.  Devuelve
// 'l' o 'r' para que la entrada del cartel venga desde afuera del tablero.
function rpopPlace() {
	if (!p) return "r"; // antes del primer gen() no hay gato
	const M = 7,
		bw = cv.clientWidth || BW,
		bh = cv.clientHeight || BH,
		k = bw / (BW || 1), // el tablero se dibuja escalado por CSS
		pw = rpop.offsetWidth || 130,
		ph = rpop.offsetHeight || 20,
		px = p.x * S * k,
		py = p.y * S * k,
		ps = S * k,
		pisa = (l, t) =>
			l < px + ps && l + pw > px && t < py + ps && t + ph > py,
		esq = [
			["r", "t"],
			["l", "t"],
			["r", "b"],
			["l", "b"],
		],
		[h, v] =
			esq.find(
				([a, b]) =>
					!pisa(
						a === "r" ? bw - M - pw : M,
						b === "t" ? M : bh - M - ph,
					),
			) || esq[0];
	rpop.style.left = h === "l" ? M + "px" : "auto";
	rpop.style.right = h === "r" ? M + "px" : "auto";
	rpop.style.top = v === "t" ? M + "px" : "auto";
	rpop.style.bottom = v === "b" ? M + "px" : "auto";
	return h;
}

// Un ascenso de rango tiene que VERSE: la letra crece de golpe, la barra
// destella y el nombre del rango entra volando sobre el laberinto.
//
// Reiniciar una animación de CSS pide apagar la clase, forzar el layout y volver
// a prenderla.  Eran TRES layouts sincrónicos seguidos —uno por elemento—, y un
// layout sincrónico frena el hilo hasta que el navegador termina de recalcular la
// página entera.  Un solo `void offsetWidth` los cubre a los tres: la lectura
// vacía el estilo pendiente de todo el documento, no del elemento que se lee.
function rankShow(i, up) {
	const r = RANKS[i];
	root.style.setProperty("--rc", r.col); // de acá lo toman la letra, la barra y el cartel
	brank.textContent = r.k;
	bfill.style.color = r.col;
	if (up) rpop.textContent = r.n + "!";
	const base = up ? "rank" + (rpopPlace() === "l" ? " l" : "") : "";
	brank.className = "rank"; // las tres clases apagadas...
	bar.className = "";
	if (up) rpop.className = base;
	void bar.offsetWidth; // ...un layout para las tres...
	brank.className = up ? "rank up" : "rank"; // ...y las tres prendidas
	bar.className = up ? "up" : "";
	if (up) rpop.className = base + " show";
}

// ---- capa de paredes horneada ---------------------------------------------
// Las ~660 líneas del laberinto con shadowBlur eran, lejos, el dibujo más caro
// del cuadro, y no cambian hasta el próximo gen().  Se pintan una vez a un canvas
// aparte y después el cuadro es un solo drawImage.  Va en los dos perfiles: es el
// mismo dibujo cacheado, no una versión recortada.
//
// El latido de extra vibes abría el shadowBlur de 10 a 26, así que se hornean las
// dos puntas y el cuadro mezcla entre ellas: los extremos salen exactos y el medio
// es una interpolación de dos gaussianas en vez de una gaussiana intermedia.  La
// segunda capa se hornea recién cuando alguien prende extra vibes.
//
// PAD: al temblar, la copia se corre y el borde se quedaba sin el resplandor que
// entra desde afuera del tablero.  Se hornea con margen y se pega en -PAD.
const BLUR = [10, 26],
	PAD = 32; // = 10+bop*16, los extremos del latido
let mz = [null, null],
	baked = false;
function walls(c) {
	g.forEach((k, i) => {
		const X = (i % C) * S,
			Y = ((i / C) | 0) * S;
		if (k.n) {
			c.moveTo(X, Y);
			c.lineTo(X + S, Y);
		}
		if (k.w) {
			c.moveTo(X, Y);
			c.lineTo(X, Y + S);
		}
		if (k.e) {
			c.moveTo(X + S, Y);
			c.lineTo(X + S, Y + S);
		}
		if (k.s) {
			c.moveTo(X, Y + S);
			c.lineTo(X + S, Y + S);
		}
	});
}
function bakeLayer(i) {
	const c = mz[i] || document.createElement("canvas");
	c.width = (BW + PAD * 2) * K;
	c.height = (BH + PAD * 2) * K; // asignar width ya lo deja limpio
	const k = c.getContext("2d");
	if (!k) return null; // sin 2d context se dibuja como siempre
	k.setTransform(K, 0, 0, K, 0, 0); // la capa guarda los mismos píxeles que el canvas
	k.translate(PAD, PAD); // walls() sigue hablando en coords del tablero
	k.lineCap = "round";
	k.strokeStyle = "#39f";
	k.lineWidth = 2;
	k.shadowColor = "#2af";
	k.shadowBlur = BLUR[i];
	k.beginPath();
	walls(k);
	k.stroke();
	return c;
}
function bakeMaze() {
	try {
		mz[0] = bakeLayer(0);
		if (mz[1]) mz[1] = bakeLayer(1); // la del latido, sólo si ya se usó alguna vez
		baked = !!mz[0];
	} catch (e) {
		baked = false;
	}
}
const bakeBop = () => {
	if (baked && !mz[1])
		try {
			mz[1] = bakeLayer(1);
		} catch (e) {}
};

// las letras van en la celda VECINA (12px pasando la abertura), nunca debajo del PJ
const LP = {
	n: (cx, cy) => [cx * S + S / 2, cy * S - 12],
	s: (cx, cy) => [cx * S + S / 2, (cy + 1) * S + 12],
	e: (cx, cy) => [(cx + 1) * S + 12, cy * S + S / 2],
	w: (cx, cy) => [cx * S - 12, cy * S + S / 2],
};

function frame() {
	requestAnimationFrame(frame);
	// pestaña oculta: si igual llega un cuadro no se dibuja nada (el dt del estilo
	// está topado a 250 ms, así que al volver no hay salto).  document.hidden es
	// undefined en los tests y ahí nunca se salta.
	if (document.hidden === true) {
		lastDraw = 0; // al volver, el tope de fps no se come el primer cuadro
		return;
	}
	const RT = now();
	// pantallas de 120Hz pedían el doble de cuadros por el mismo juego
	if (PERF.fps && RT - lastDraw < 1000 / PERF.fps) return;
	lastDraw = RT;
	// ---- la música, cuadro a cuadro ------------------------------------------
	// Va con el reloj REAL: el susto y el QTE tienen que sonar igual con la pestaña
	// al frente que con el menú encima.  Durante el QTE (o el jumpscare) `muf` sube
	// hasta 1 —el QTE entero para hundirse del todo, así que cuanto menos tiempo
	// queda, menos se escucha— y después baja: rápido si el QTE se ganó, lento si
	// terminó en susto.
	const mdt = mufAt ? Math.min(250, RT - mufAt) : 0;
	mufAt = RT;
	if (qte || frozen) muf = Math.min(1, muf + mdt / (qte ? qte.ms : 700));
	else if (muf > 0) {
		muf = Math.max(0, muf - mdt / (mufSlow ? MUF_IN : MUF_OUT));
		if (!muf) mufSlow = 0;
	}
	const trk = track(),
		tv = +((trk.v0 || 0.32) * (1 - MUF_MAX * muf)).toFixed(3);
	if (tv !== mufV) {
		trk.volume = mufV = tv; // sólo se escribe cuando de verdad cambió
	}
	// y el grito del acechador baja con su imagen: el mismo perfil que el CSS de
	// #scare.fade (pleno hasta el 32%, y de ahí a cero), sin un timer más
	if (scareFade && scareA) {
		const q = (RT - scareFade) / SCARE_FADE;
		scareA.volume = Math.max(0, Math.min(1, (1 - q) / 0.68));
	}
	const T = paused ? pauseAt : RT,
		live = t0 && !win && !frozen && !paused; // en pausa el reloj se congela
	// Respiro post-QTE: durante GRACE_MS la ventana de la letra no corre y los gatos
	// no dan un paso.  Es el único momento del juego en que se puede pensar.
	const respiro = live && !qte && T < graceT;
	if (live && (tutHold() || respiro)) shownAt = T; // el 1er paso del tutorial va sin reloj
	if (respiro) foeTick = T; // ...y al salir del respiro no se cobran los pasos
	// ---- el estilo, cuadro a cuadro ------------------------------------------
	// Dos cosas, las dos con el reloj DEL JUEGO (T), así que el menú, el selector
	// y los carteles no cuentan: (1) lo que pasa del techo del combo se escurre,
	// y (2) el medidor va sumando a la integral de la que sale el promedio.  El
	// QTE y el respiro no escurren: ahí el jugador no puede teclear el laberinto.
	const sdt = stlAt ? Math.min(250, T - stlAt) : 0; // el tope tapa el salto de una pestaña dormida
	stlAt = T;
	if (live && sdt > 0) {
		if (!qte && !respiro)
			styleDown(
				Math.min(
					Math.max(0, stl - styleCap()),
					(STYLE_DECAY * sdt) / 1000,
				),
			);
		stlSum += stl * sdt;
		stlT += sdt;
	}
	const left = qte
		? (qte.until - T) / qte.ms
		: live
			? 1 - (T - shownAt) / dur()
			: 1;

	if (tutOn) tutCheck();
	if (resAt && T >= resAt) resShow(); // ganaste hace RES_MS: entra el resumen
	if (qte && T > qte.until) qteEnd(false);
	else if (live && !qte && left <= 0) penalize(400, "#f70", "late", "-");
	// con el maullido encima los gatos se mueven más seguido, pero para el otro lado
	if (
		live &&
		!qte &&
		!respiro &&
		T - foeTick > foeMs() * (T < scareUntil ? 0.55 : 1)
	) {
		foeTick = T;
		moveFoes();
	}

	bop = vibes && !VIBE.paused ? bopAt(VIBE.currentTime) : 0;
	// El CSS late en 20 pasos en vez de seguir el bop continuo: la misma vista con
	// un tercio de las recalculaciones de estilo (el canvas sigue usando el fino).
	const bopCss = Math.round(bop * 20) / 20;
	if (bopCss !== lastBop) {
		root.style.setProperty("--bop", bopCss.toFixed(2));
		lastBop = bopCss;
	}

	vis.x += (p.x - vis.x) * 0.35;
	vis.y += (p.y - vis.y) * 0.35;
	parts.forEach((q) => {
		q.x += q.vx;
		q.y += q.vy;
		q.vx *= 0.9;
		q.vy *= 0.9;
		q.l -= 0.04;
	});
	parts = parts.filter((q) => q.l > 0);
	shake *= 0.85;
	flash *= 0.9;
	cpop *= 0.88;

	const sk = shake > 0.4 ? shake : 0; // debajo de medio píxel no se ve y rompe el fast path
	// K: el canvas guarda K píxeles por cada uno del tablero (ver sizeCanvas).  El
	// temblor sigue midiéndose en píxeles del tablero, así que también se escala.
	x.setTransform(
		K,
		0,
		0,
		K,
		(Math.random() - 0.5) * sk * K,
		(Math.random() - 0.5) * sk * K,
	);
	x.fillStyle = "#0b0b12";
	x.fillRect(-20, -20, BW + 40, BH + 40);
	x.lineCap = "round";
	x.textAlign = "center";
	x.textBaseline = "middle";

	if (baked) {
		// una copia, o la mezcla si está latiendo.  La capa guarda K píxeles por
		// cada uno del tablero: se dibuja pidiendo su tamaño en coords de tablero.
		const LW = BW + PAD * 2,
			LH = BH + PAD * 2;
		x.shadowBlur = 0;
		if (bop > 0.002 && mz[1]) {
			x.globalAlpha = 1 - bop;
			x.drawImage(mz[0], -PAD, -PAD, LW, LH);
			x.globalAlpha = bop;
			x.drawImage(mz[1], -PAD, -PAD, LW, LH);
			x.globalAlpha = 1;
		} else x.drawImage(mz[0], -PAD, -PAD, LW, LH);
	} else {
		x.shadowBlur = 10 + bop * 16;
		x.shadowColor = "#2af";
		x.strokeStyle = "#39f";
		x.lineWidth = 2;
		x.beginPath();
		walls(x);
		x.stroke();
	}

	// salida: roja con el candado cerrado hasta juntar las 5 monedas, verde y latiendo después
	const ab = exitOpen(),
		ex = (C - 1) * S + S / 2,
		ey = (R - 1) * S + S / 2,
		pulse = ab ? 0.5 + 0.5 * Math.sin(T / 200) : 0.25;
	x.shadowColor = ab ? "#0f9" : "#f66";
	x.shadowBlur = (6 + 18 * pulse + bop * 14) * GLOW;
	x.fillStyle = ab
		? `rgba(0,255,150,${0.25 + 0.6 * pulse})`
		: `rgba(255,70,90,${0.1 + 0.12 * pulse})`;
	x.fillRect((C - 1) * S + 8, (R - 1) * S + 8, S - 16, S - 16);
	x.strokeStyle = x.fillStyle = ab ? "#0f9" : "#f88";
	x.lineWidth = 2;
	x.fillRect(ex - 5, ey, 10, 7); // cuerpo del candado
	x.beginPath(); // arco: abierto = ladeado
	x.arc(ab ? ex - 4 : ex, ey - 3, 4, Math.PI, ab ? Math.PI * 1.85 : 0);
	x.stroke();

	x.shadowColor = "#fd0";
	x.shadowBlur = (14 + bop * 16) * GLOW;
	x.fillStyle = "#fe4";
	coins.forEach((i) => {
		const b = 1 + 0.25 * Math.sin(T / 150 + i) + bop * 0.3;
		x.beginPath();
		x.arc((i % C) * S + S / 2, ((i / C) | 0) * S + S / 2, 4 * b, 0, 7);
		x.fill();
	});

	// faroles: en el sótano son la única forma de ver el mapa completo
	if (lamps.length) {
		x.shadowColor = "#fd8";
		x.shadowBlur = (17 + bop * 14) * GLOW;
		x.fillStyle = "#fe9";
		lamps.forEach((i) => {
			const X = (i % C) * S + S / 2,
				Y = ((i / C) | 0) * S + S / 2,
				b = 1 + 0.22 * Math.sin(T / 220 + i);
			x.beginPath();
			x.moveTo(X, Y - 7 * b);
			x.lineTo(X + 5 * b, Y);
			x.lineTo(X, Y + 7 * b);
			x.lineTo(X - 5 * b, Y);
			x.closePath();
			x.fill();
		});
	}

	// enemigos (gato oscuro).  Con el maullido encima van pálidos y con el halo del
	// maullido en vez del rojo: de un vistazo se ve que están huyendo, no cazando.
	const asustados = T < scareUntil;
	x.shadowColor = asustados ? "#9ff" : "#f36";
	x.shadowBlur = (16 + bop * 14) * GLOW;
	if (asustados) x.globalAlpha = 0.72;
	const nst = LV.stalk || 0; // los acechadores son los primeros de la lista
	foes.forEach((f, i) => {
		const X = (f % C) * S + S / 2,
			Y = ((f / C) | 0) * S + S / 2,
			s = S - 8 + 2 * Math.sin(T / 150 + f),
			im = i < nst && ready(STALK) ? STALK : FOE;
		if (ready(im)) x.drawImage(im, X - s / 2, Y - s / 2, s, s);
		else {
			x.fillStyle = "#f57";
			x.fillRect(X - 6, Y - 6, 12, 12);
		}
	});
	x.globalAlpha = 1;

	// jugador (gato blanco)
	x.shadowColor = "#0ff";
	x.shadowBlur = (18 + bop * 16) * GLOW;
	x.fillStyle = `rgba(0,220,255,${(0.18 + bop * 0.16).toFixed(3)})`;
	x.fillRect(vis.x * S + 4, vis.y * S + 4, S - 8, S - 8);
	if (ready(PJ))
		x.drawImage(PJ, vis.x * S + 3, vis.y * S + 3, S - 6, S - 6);
	else {
		x.fillStyle = "#7ff";
		x.fillRect(vis.x * S + 9, vis.y * S + 9, S - 18, S - 18);
	}

	const PX = vis.x * S + S / 2,
		PY = vis.y * S + S / 2;
	if (!win && !tutHold()) {
		// durante el respiro el anillo queda lleno y en blanco: se ve que NO está corriendo
		x.strokeStyle = respiro
			? "#dff"
			: left > 0.5
				? "#0ff"
				: left > 0.25
					? "#fd0"
					: "#f45";
		x.shadowColor = x.strokeStyle;
		// en el teléfono el anillo va sin sombra: el color ya dice el tiempo que queda
		x.shadowBlur = MOBILE ? 0 : (respiro ? 16 : 0) * GLOW;
		x.lineWidth = respiro ? 4 : 3;
		x.beginPath();
		x.arc(PX, PY, S * 0.62, -1.571, -1.571 + 6.283 * Math.max(0, left));
		x.stroke();
		x.shadowBlur = 0;
		if (respiro) {
			// halo que respira dentro del anillo:
			const q = 0.5 + 0.5 * Math.sin(T / 300); // "el reloj está quieto, mirá tranquilo"
			x.globalAlpha = 0.1 + 0.11 * q;
			x.fillStyle = "#dff";
			x.beginPath();
			x.arc(PX, PY, S * 0.62, 0, 6.283);
			x.fill();
			x.globalAlpha = 1;
		}
	}
	// DETERMINACIÓN: una órbita violeta por fuera del anillo de reacción, con una
	// pastilla por carga.  Va por fuera a propósito: el sprite del gato no se toca.
	if (det > 0 && !win) {
		const q = 0.5 + 0.5 * Math.sin(T / 260),
			rr = S * 0.78;
		x.strokeStyle = "#c8f";
		x.shadowColor = "#c8f";
		x.shadowBlur = (6 + 8 * q) * GLOW;
		x.lineWidth = 1.2;
		x.setLineDash([3, 6]);
		x.lineDashOffset = T / 40;
		x.beginPath();
		x.arc(PX, PY, rr, 0, 6.283);
		x.stroke();
		x.setLineDash([]);
		x.lineDashOffset = 0;
		x.fillStyle = "#e2b4ff";
		x.shadowBlur = (9 + 7 * q) * GLOW;
		for (let i = 0; i < det; i++) {
			const a = T / 900 + (i * 6.283) / det,
				X = PX + Math.cos(a) * rr,
				Y = PY + Math.sin(a) * rr;
			x.beginPath();
			x.moveTo(X, Y - 3.4);
			x.lineTo(X + 3.4, Y);
			x.lineTo(X, Y + 3.4);
			x.lineTo(X - 3.4, Y);
			x.closePath();
			x.fill();
		}
		x.shadowBlur = 0;
	}

	// NIEBLA: un solo relleno con degradado radial encima de todo lo que es el
	// mundo (paredes, monedas, gatos).  Las letras, el QTE y los carteles se
	// dibujan después, así que nunca quedan tapados.  Un farol la abre de golpe
	// y desde ahí se vuelve a cerrar sola.
	if (LV.fog) {
		// el farol alumbra a pleno la mitad del tiempo y después se va apagando
		const dt = T - revealT,
			lit =
				revealT && dt < REVEAL_MS
					? Math.min(1, 2 - (2 * dt) / REVEAL_MS)
					: 0,
			rad = (LV.fog + lit * lit * (C + R) * 1.6) * S, // a pleno, el núcleo tapa el tablero entero
			fx = (vis.x + 0.5) * S,
			fy = (vis.y + 0.5) * S;
		if (fogTex === undefined) fogTex = bakeFog();
		x.shadowBlur = 0;
		if (fogTex) {
			const L = fx - rad,
				U = fy - rad,
				W = rad * 2,
				Rr = L + W,
				D = U + W;
			x.drawImage(fogTex, L, U, W, W);
			x.fillStyle = FOG + ".985)"; // lo que queda fuera del parche, opaco
			if (L > 0) x.fillRect(0, 0, L, BH);
			if (Rr < BW) x.fillRect(Rr, 0, BW - Rr, BH);
			const l0 = Math.max(0, L),
				r0 = Math.min(BW, Rr);
			if (U > 0) x.fillRect(l0, 0, r0 - l0, U);
			if (D < BH) x.fillRect(l0, D, r0 - l0, BH - D);
		} else {
			// sin canvas de respaldo, el degradado de siempre
			const gr = x.createRadialGradient(
				fx,
				fy,
				rad * 0.5,
				fx,
				fy,
				rad,
			);
			gr.addColorStop(0, FOG + "0)");
			gr.addColorStop(0.72, FOG + ".8)");
			gr.addColorStop(1, FOG + ".985)");
			x.fillStyle = gr;
			x.fillRect(0, 0, BW, BH);
		}
		// a oscuras, lo que da luz propia se sigue viendo: los faroles son faros y
		// la salida abierta es la meta.  Sin esto el sótano es a ciegas, no a oscuras.
		x.globalAlpha = 0.6;
		x.shadowColor = "#fd8";
		x.shadowBlur = 14 * GLOW;
		x.fillStyle = "#fe9";
		lamps.forEach((i) => {
			const X = (i % C) * S + S / 2,
				Y = ((i / C) | 0) * S + S / 2;
			x.beginPath();
			x.moveTo(X, Y - 6);
			x.lineTo(X + 4, Y);
			x.lineTo(X, Y + 6);
			x.lineTo(X - 4, Y);
			x.closePath();
			x.fill();
		});
		x.globalAlpha = 1;
		if (ab) {
			x.shadowColor = "#0f9";
			x.shadowBlur = 24 * GLOW;
			x.fillStyle = `rgba(0,255,150,${0.3 + 0.5 * pulse})`;
			x.fillRect((C - 1) * S + 10, (R - 1) * S + 10, S - 20, S - 20);
		}
		x.shadowBlur = 0;
	}

	// AHUYENTADOR: la onda del maullido saliendo del gato blanco.  Va después de la
	// niebla a propósito: en el sótano el maullido se oye aunque no se vea nada.
	if (T < scareUntil) {
		const k = 1 - (scareUntil - T) / MEOW_MS; // 0 al maullar, 1 al apagarse
		x.shadowColor = "#9ff";
		for (const o of [0, 0.22]) {
			const kk = k - o;
			if (kk < 0 || kk > 1) continue;
			x.globalAlpha = (1 - kk) * 0.6;
			x.shadowBlur = 16 * GLOW;
			x.strokeStyle = "#9ff";
			x.lineWidth = 1 + 3 * (1 - kk);
			x.beginPath();
			x.arc(PX, PY, S * 0.6 + kk * MEOW_R * S, 0, 6.283);
			x.stroke();
		}
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// RADAR del maullido (sótano).  El eco vuelve con una idea de dónde hay monedas
	// y de dónde estaban los gatos.  NO enciende el sótano: la niebla se dibujó
	// arriba y sigue igual, no se ve una pared más.  Son anillos flojos, corridos
	// hasta media celda a propósito, que laten un rato y se apagan solos.
	if (radar && T - radar.t < RADAR_MS) {
		const k = (T - radar.t) / RADAR_MS,
			a = Math.min(1, k * 8) * (1 - k) * (1 - k), // entra de golpe y se va apagando
			q = 0.5 + 0.5 * Math.sin(T / 180);
		x.lineWidth = 1.6;
		radar.pts.forEach((m) => {
			const col = m.k ? "#f7a" : "#fe4"; // k=1 gato, k=0 moneda
			x.globalAlpha = a * (m.k ? 0.8 : 0.95);
			x.strokeStyle = col;
			x.shadowColor = col;
			x.shadowBlur = (7 + 6 * q) * GLOW;
			x.beginPath();
			x.arc(m.x * S, m.y * S, S * (0.19 + 0.13 * q), 0, 6.283);
			x.stroke();
		});
		x.globalAlpha = 1;
		x.shadowBlur = 0;
	}

	// una sombra difuminada por partícula (hasta 34) era el segundo gasto del cuadro:
	// en móvil el halo se finge con un cuadrado más grande y transparente
	if (MOBILE) {
		x.shadowBlur = 0;
		parts.forEach((q) => {
			x.fillStyle = q.c;
			x.globalAlpha = q.l * 0.22;
			x.fillRect(q.x - 4, q.y - 4, 8, 8);
			x.globalAlpha = q.l;
			x.fillRect(q.x - 2, q.y - 2, 4, 4);
		});
	} else {
		parts.forEach((q) => {
			x.shadowColor = q.c;
			x.fillStyle = q.c;
			x.globalAlpha = q.l;
			x.fillRect(q.x - 2, q.y - 2, 4, 4);
		});
	}
	x.globalAlpha = 1;
	x.shadowBlur = 0;

	// ---- las monedas, en el tablero ------------------------------------------
	// Llevar la cuenta obligaba a soltar el laberinto y leer la barra de arriba, y
	// eso es justo lo que no se puede hacer con un gato encima.  Las mismas fichas
	// que la barra, pero acá: llenas las que ya juntaste, huecas las que faltan, y
	// todas verdes cuando la salida ya abrió.  Va DESPUÉS de la niebla, así que en
	// el sótano —donde no se ve nada y la cuenta importa más— se lee igual.  Se
	// muda abajo si el gato está en la primera fila, que es donde arranca.
	if (!win) {
		const gap = 13,
			wc = LV.coins * gap,
			X0 = (BW - wc) / 2 + gap / 2,
			Y0 = p.y === 0 ? BH - 15 : 15;
		x.fillStyle = "rgba(4,6,12,.82)";
		x.fillRect(X0 - gap / 2 - 6, Y0 - 10, wc + 12, 20);
		x.strokeStyle = ab ? "#0f96" : "#1ff5";
		x.lineWidth = 1;
		x.strokeRect(X0 - gap / 2 - 5.5, Y0 - 9.5, wc + 11, 19);
		for (let i = 0; i < LV.coins; i++) {
			const lleno = i < got,
				c = lleno ? (ab ? "#0f9" : "#fe4") : "#4a5a72";
			x.strokeStyle = x.fillStyle = c;
			x.shadowColor = c;
			x.shadowBlur = MOBILE || !lleno ? 0 : 9 * GLOW;
			x.beginPath();
			x.arc(X0 + i * gap, Y0, 4.2, 0, 6.283);
			lleno ? x.fill() : x.stroke();
		}
		x.shadowBlur = 0;
	}

	// letras de las salidas: SIEMPRE al final, encima de todo
	if (!win && !qte) {
		const col = respiro
			? "#dff"
			: left > 0.5
				? "#9ff"
				: left > 0.25
					? "#fe6"
					: "#f88";
		x.font = "bold 21px " + CF;
		for (const d in letters) {
			const [X, Y] = LP[d](p.x, p.y),
				ph = phase && phase[d], // ph: la letra que cruza el muro
				c = ph ? "#d8a6ff" : col;
			x.shadowBlur = 0;
			x.fillStyle = "rgba(4,6,12,.95)";
			x.beginPath();
			x.arc(X, Y, 12, 0, 7);
			x.fill();
			x.strokeStyle = c;
			x.lineWidth = 1.5;
			if (ph) x.setLineDash([3, 3]); // punteada = todavía hay un muro ahí
			x.stroke();
			x.setLineDash([]);
			x.shadowColor = c;
			// en el teléfono las letras van sin sombra: ya traen disco y borde propios
			x.shadowBlur = MOBILE ? 0 : (14 + bop * 12) * GLOW;
			x.fillStyle = c;
			x.fillText(letters[d].toUpperCase(), X, Y);
		}
		x.shadowBlur = 0;
	}

	const abrio = unlockT && T - unlockT < NOTE_MS;
	if (abrio)
		banner(
			T,
			unlockT,
			"SALIDA DESBLOQUEADA",
			"CORRÉ A LA CASILLA VERDE",
			"#0f9",
			0,
		);
	// si justo coinciden, el aviso de la habilidad se corre para abajo y no se pisan
	if (note && T - note.t < NOTE_MS)
		banner(T, note.t, note.a, note.b, note.col, abrio ? 66 : 0);

	// overlay del QTE
	if (qte) {
		x.fillStyle = "rgba(8,0,10,.78)";
		x.fillRect(0, 0, BW, BH);
		// el enemigo se te viene encima según se acaba el tiempo
		const gr = Math.min(1, Math.max(0, 1 - left)),
			sz = 70 + gr * gr * (BW * 1.5 - 70);
		if (ready(BIG)) {
			x.globalAlpha = 0.35 + 0.5 * gr;
			x.drawImage(
				BIG,
				BW / 2 - sz / 2,
				BH / 2 - sz / 2,
				sz,
				sz,
			);
			x.globalAlpha = 1;
		}
		x.font = "italic 900 18px " + DF;
		x.shadowColor = "#f57";
		x.shadowBlur = 12 * GLOW;
		x.fillStyle = "#f9a";
		x.fillText(
			"! ENEMIGO — TECLEA LA SECUENCIA !",
			BW / 2,
			BH / 2 - 52,
		);
		const n = qte.seq.length,
			step = Math.min(54, (BW - 30) / n);
		x.font = `bold ${Math.min(42, step * 0.8) | 0}px ` + CF;
		qte.seq.forEach((k, i) => {
			const X = BW / 2 + (i - (n - 1) / 2) * step,
				done = i < qte.i;
			const col = done ? "#6f9" : i == qte.i ? "#fff" : "#89a";
			x.fillStyle = "#000";
			x.shadowColor = "#000";
			x.shadowBlur = 6 * GLOW;
			x.fillText(k.toUpperCase(), X, BH / 2);
			x.shadowColor = col;
			x.shadowBlur = (i == qte.i ? 22 : 10) * GLOW;
			x.fillStyle = col;
			x.fillText(k.toUpperCase(), X, BH / 2);
		});
		x.shadowBlur = 0;
		x.fillStyle = "#f57";
		x.fillRect(
			BW / 2 - 120,
			BH / 2 + 40,
			240 * Math.max(0, left),
			5,
		);
	}

	if (flash > 0.01) {
		x.fillStyle = `rgba(255,40,60,${flash * 0.28})`;
		x.fillRect(0, 0, BW, BH);
	}
	// las scanlines las pinta el CSS (#board::after): eran ~150 fillRect por cuadro
	if (bop > 0.02) {
		// y el borde del tablero también late
		x.strokeStyle = `rgba(120,235,255,${(bop * 0.45).toFixed(3)})`;
		x.lineWidth = 1 + bop * 3;
		x.shadowColor = "#0ff";
		x.shadowBlur = bop * 24 * GLOW;
		x.strokeRect(1, 1, BW - 2, BH - 2);
		x.shadowBlur = 0;
	}
	x.setTransform(1, 0, 0, 1, 0, 0); // el HUD de abajo es DOM, no canvas

	// ---- HUD -----------------------------------------------------------------
	// Antes eran dos innerHTML por cuadro: el navegador reparseaba HTML, tiraba los
	// nodos y recalculaba estilo y layout del encabezado 60 veces por segundo.
	// Ahora cada dato tiene su <span> fijo y sólo se escribe el que cambió; en móvil
	// el reloj además se refresca cada PERF.hudMs (los milisegundos igual no se leen).
	//
	// La barra es LA MISMA en los dos perfiles —reloj y monedas a la izquierda, rango
	// de combo a la derecha, llenado hacia el rango siguiente abajo—: lo único que
	// cambia es cuánto texto entra.  En el teléfono el ancho da para el dato y nada
	// más (las habilidades van en iconos y lo secundario se lee en el menú); en
	// escritorio hay lugar para la frase entera, el nivel, la mejor marca, la
	// precisión y el récord de combo.
	const falta = LV.coins - got,
		tms = (win ? tEnd : t0 ? T - t0 : 0) + pen,
		pb = bests[LV.id];
	const ri = rankI(); // el rango manda el color de toda la GUI
	if (ri !== lastRank) {
		rankShow(ri, ri > lastRank);
		lastRank = ri;
	}
	if (!PERF.hudMs || T - hudAt >= PERF.hudMs || win) {
		hudAt = T;
		const line = fmt(tms);
		if (line !== lastT) {
			bt.textContent = line;
			lastT = line;
		}
	}
	const mon = "\u25CF".repeat(got) + "\u25CB".repeat(falta),
		lock = win
			? "\u{1F3C1} GANASTE!  " + mon
			: MOBILE
				? (falta ? "\u{1F512}" : "\u{1F513}") + mon + habIco()
				: (falta
						? `\u{1F512} SALIDA BLOQUEADA · faltan ${falta} ${falta == 1 ? "moneda" : "monedas"}`
						: "\u{1F513} SALIDA ABIERTA") +
					"  " +
					mon;
	if (lock !== lastEx) {
		bc.textContent = lock;
		bc.style.color = falta && !win ? "#f88" : "#0f9";
		lastEx = lock;
	}
	const lab = "x" + combo;
	if (lab !== lastLab) {
		bx.textContent = lab;
		lastLab = lab;
	}
	// el llenado ancho de abajo es el ESTILO (hacia el rango siguiente); la barrita
	// de al lado de la x es el COMBO, que al llenarse arma el maullido para siempre
	const w = (rankFill() * 100).toFixed(1) + "%";
	if (w !== lastW) {
		bfill.style.width = w;
		lastW = w;
	}
	const cw = (comboFill() * 100).toFixed(1) + "%";
	if (cw !== lastCw) {
		bcfill.style.width = cw;
		bcbar.className = comboFill() >= 1 ? "full" : "";
		lastCw = cw;
	}
	// el ♪: apagado = nunca cargaste el combo · llenándose = cooldown · prendido = listo
	const cd = meowCd(T),
		mst = meowOn ? (cd ? "cd" : "ready") : "",
		mw = meowOn ? (100 - (cd / MEOW_CD) * 100).toFixed(0) + "%" : "0%";
	if (mst !== lastMst) {
		bmeow.className = mst;
		lastMst = mst;
	}
	if (mw !== lastMw) {
		bmfill.style.width = mw;
		lastMw = mw;
	}
	const sc = (1 + cpop * 0.45 + bopCss * 0.09).toFixed(2); // cada acierto —y cada beat— golpea la letra
	if (sc !== lastSc) {
		brank.style.transform = `skewX(-11deg) scale(${sc})`;
		lastSc = sc;
	}
	if (MOBILE) {
		// lo secundario (precisión, penalización, récord) se lee en el menú
		if (menuOn) {
			const sb = stats();
			if (sb !== lastSub) {
				mstats.textContent = sb;
				lastSub = sb;
			}
		}
	} else {
		const sb =
			`precisión ${Math.round(acc() * 100)}%  ·  pen +${fmt(pen)}  ·  teclas ${log.length}` +
			`  ·  estilo promedio ${RANKS[rankI(avgStl())].k}` +
			habTxt(T) +
			(baby ? `  ·  BABY MODE ${baby}` : "");
		if (sb !== lastSub) {
			bstat.textContent = sb;
			lastSub = sb;
		}
		// la placa del nivel y el récord de combo cambian de a poco: una sola clave
		// los cubre a los tres y así el cuadro no toca tres nodos al pedo
		const meta = `${LV.id}|${pb || 0}|${maxCombo}`;
		if (meta !== lastMeta) {
			bname.textContent = LV.name;
			bname.style.color = LV.col;
			bpb.textContent = pb
				? `MEJOR ${fmt(pb)}s`
				: "sin marca todavía";
			bmax.textContent = `RÉCORD x${maxCombo}`;
			lastMeta = meta;
		}
	}
}

rst.onclick = () => {
	menuClose();
	gen();
	rst.blur();
}; // reinicio sólo por botón

function key(k) {
	if (track().paused) {
		srcOn(track()); // en el teléfono el mp3 se baja recién acá
		track()
			.play()
			.catch(() => {});
	} // la música arranca con la 1ª tecla
	if (win || frozen || paused || k.length != 1 || k < "a" || k > "z")
		return;
	if (!t0) {
		t0 = now();
		shownAt = t0;
		foeTick = t0;
	}

	if (qte) {
		// durante el QTE sólo cuenta la secuencia
		if (k === qte.seq[qte.i]) {
			push(k, "qte");
			hits++;
			sfx(660 + qte.i * 70, 45, "square", 0.04);
			if (++qte.i === qte.seq.length) qteEnd(true);
		} else {
			push(k, "qtebad");
			fails++;
			qteEnd(false);
		}
		return;
	}

	const dir = Object.keys(letters).find((d) => letters[d] == k);
	if (!dir) return penalize(600, "#f45", "bad", k); // tecla equivocada: castigo fuerte
	const thru = !!(phase && phase[dir]); // letra violeta: se cruza el muro

	const react = now() - shownAt;
	hits++;
	comboUp();
	styleHit(); // ...y el estilo sólo hasta donde lo deja el combo
	push(k, "ok");
	cpop = 1;
	sfxOk();
	if (react < 350) {
		// reflejo rápido: descuento de tiempo
		pen -= Math.min(300, 100 + combo * 10);
		pen = Math.max(pen, -(now() - t0) * 0.25); // el bono nunca baja del 75% del crudo
	}
	const d = DV[dir];
	trail.push(p.y * C + p.x); // migaja para el castigo
	pfrom = { c: p.y * C + p.x, t: now() }; // ...y la marca del esquive (ver dodge)
	p.x += d[0];
	p.y += d[1];
	if (thru) {
		// se gastó una carga de determinación
		det--;
		// Y del otro lado del muro se empieza de cero: la determinación no es un
		// atajo de ida y vuelta.  Un error no puede devolverte por una pared que
		// no se cruza sin otra carga —te dejaría del lado equivocado y sin nada
		// con qué volver—, así que ESTA celda pasa a ser tu punto de partida y el
		// camino de migas de antes se borra.
		trail = [];
		tthru++; // ...y el paso del tutorial que la enseña espera esto
		shake = 7;
		sfx(150, 260, "sine", 0.055, 620);
		burst(p.x * S + S / 2, p.y * S + S / 2, "#c8f", 26);
	}
	const j = coins.indexOf(p.y * C + p.x);
	if (j > -1) {
		coins.splice(j, 1);
		got++;
		burst(p.x * S + S / 2, p.y * S + S / 2, "#fe4");
		sfxCoin();
		if (got == LV.mid) foes.push(far()); // un gato más a mitad de camino
		if (exitOpen()) {
			// se abrió la salida: hay que cantarlo fuerte
			unlockT = now();
			sfxUnlock();
			burst((C - 0.5) * S, (R - 0.5) * S, "#0f9", 34);
		}
	}
	const li = lamps.indexOf(p.y * C + p.x); // farol: la niebla se abre unos segundos
	if (li > -1) {
		lamps.splice(li, 1);
		revealT = now();
		sfxUnlock();
		burst(p.x * S + S / 2, p.y * S + S / 2, "#fd8", 24);
	}
	if (exitOpen() && p.x == C - 1 && p.y == R - 1) {
		win = true;
		tEnd = now() - t0;
		const bb = bests[LV.id]; // el récord es de cada nivel
		newPB = !LV.tut && (bb === undefined || tEnd + pen < bb);
		if (newPB) bests[LV.id] = tEnd + pen;
		resAt = now() + RES_MS; // primero se ve el escape, después el resumen
		burst(p.x * S + S / 2, p.y * S + S / 2, "#0f9", 30);
		[784, 988, 1175, 1568].forEach((f, i) =>
			setTimeout(() => sfx(f, 220, "triangle", 0.08), i * 110),
		);
		return;
	}
	if (foes.includes(p.y * C + p.x)) return qteStart(); // le caíste encima a un enemigo
	deal();
}

// teclado físico.  ESPACIO y ENTER no son letras del laberinto: son el maullido.
// Si el foco está en un botón del menú el Enter es de ese botón y no se le roba.
const enUI = (e) => {
	const t = e && e.target;
	return !!(
		t &&
		t !== kb &&
		/^(BUTTON|INPUT|TEXTAREA|SELECT|A)$/.test(t.tagName || "")
	);
};
onkeydown = (e) => {
	if (e.ctrlKey || e.metaKey || e.altKey) return;
	// El cartel del primer encuentro NO se cierra con el teclado.  Lo que explica
	// es un QTE, y un QTE se gana TECLEANDO: con "cualquier tecla es ESTOY LISTO"
	// la letra que el jugador ya tenía en el aire para moverse se llevaba puesta la
	// única explicación que hay del sistema —y de paso parecía que el QTE ya había
	// arrancado y él lo estaba perdiendo—.  Se sale por su botón y nada más: con el
	// mouse, o con TAB (que lleva el foco ahí) y después ENTER.
	if (brief.className === "on") {
		if (e.key === "Tab") {
			e.preventDefault();
			bok.focus();
			return;
		}
		if (e.target === bok && (e.key === "Enter" || e.key === " ")) return;
		e.preventDefault();
		return;
	}
	// el cartel de las habilidades, igual: el maullido se suelta con ESPACIO y el
	// que ya venía en camino no se puede llevar puesta la explicación
	if (habOn()) {
		if (e.key === "Tab") {
			e.preventDefault();
			hok.focus();
			return;
		}
		if (e.target === hok && (e.key === "Enter" || e.key === " ")) return;
		e.preventDefault();
		return;
	}
	// ESCAPE abre y cierra el menú, que es donde viven los botones secundarios.
	// Con otro panel arriba no hace nada: cada uno tiene su propia salida.
	if (e.key === "Escape" || e.key === "Esc") {
		if (lvlOn || resOn || skill.style.display === "grid") return;
		e.preventDefault();
		menuOn ? menuClose() : menuOpen();
		return;
	}
	if (e.key === " " || e.key === "Spacebar" || e.key === "Enter") {
		if (enUI(e)) return;
		e.preventDefault();
		meow();
		return;
	}
	if (e.key.length !== 1) return;
	e.preventDefault();
	key(e.key.toLowerCase());
};
// teclado de teléfono: los soft keyboards no mandan e.key fiable, se lee lo que escriben
kb.oninput = () => {
	const v = kb.value;
	kb.value = "";
	for (const c of v.toLowerCase())
		if (c === " " || c === "\n") meow();
		else key(c);
};

// ---- pantalla completa -----------------------------------------------------
// Es el único botón que le devuelve al juego el alto que se comen las barras del
// navegador.  Dentro de un iframe la API puede venir bloqueada: en ese
// caso el botón ni se muestra y todo lo demás sigue igual.
const FSOK = !!(
	document.fullscreenEnabled || document.webkitFullscreenEnabled
);
const fsOn = () =>
	!!(document.fullscreenElement || document.webkitFullscreenElement);
function goFS() {
	if (!FSOK || fsOn()) return;
	const r = root.requestFullscreen || root.webkitRequestFullscreen;
	try {
		const q = r && r.call(root);
		q && q.catch && q.catch(() => {});
	} catch (e) {}
}
function outFS() {
	if (!fsOn()) return;
	const q = document.exitFullscreen || document.webkitExitFullscreen;
	try {
		const r = q && q.call(document);
		r && r.catch && r.catch(() => {});
	} catch (e) {}
}
function fsSync() {
	const on = fsOn();
	fsb.textContent = on
		? "\u25A0 PANTALLA NORMAL"
		: "\u25A1 PANTALLA COMPLETA";
	fsb.className = on ? "on" : "";
	fit(); // cambió el alto útil: reencuadrar
	if (on && MOBILE) setTimeout(kbFocus, 80); // entrar a fullscreen cierra el teclado
}
// El automático es UNA sola vez: el primer toque al entrar a la partida.  Después
// la pantalla completa se maneja sólo con el botón del menú (si el jugador sale a
// mano, tocar el laberinto no lo devuelve ahí de prepo... ni la partida siguiente).
let fsAuto = true;
const autoFS = () => {
	if (MOBILE && fsAuto) {
		fsAuto = false;
		goFS();
	}
};
fsb.onclick = () => {
	fsAuto = false;
	fsOn() ? outFS() : goFS();
	fsb.blur();
};
if (!FSOK) fsb.style.display = "none";
if (document.addEventListener) {
	document.addEventListener("fullscreenchange", fsSync);
	document.addEventListener("webkitfullscreenchange", fsSync);
}

// tocar el laberinto abre el teclado; en el teléfono además entra a pantalla
// completa (hay gesto del usuario, que es lo único que pide la API)
function tap() {
	kbFocus();
	autoFS();
}
tec.onclick = () => {
	menuClose();
	tap();
	tec.blur();
};
cv.onclick = tap;
bar.onclick = tap;
// en el teléfono no hay barra espaciadora a mano: el bloque del rango es el botón
// del maullido, y si todavía no está listo hace lo mismo que el resto de la barra
bcombo.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	if (!meow()) tap();
};
bmeow.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	if (!meow()) tap();
};

// ---- menú hamburguesa ------------------------------------------------------
// Mismo markup que la fila de botones de escritorio; en el teléfono se abre como
// panel y, mientras está abierto, el reloj se congela igual que con el diálogo
// de skill issue (si no, mirar el menú costaría segundos de partida).
let menuOn = false,
	menuPaused = false;
const stats = () =>
	`precisión ${Math.round(acc() * 100)}%  ·  pen +${fmt(pen)}  ·  teclas ${log.length}` +
	`  ·  combo x${combo} (récord x${maxCombo})` +
	`  ·  estilo ${RANKS[rankI()].k} (promedio ${RANKS[rankI(avgStl())].k}, pico ${RANKS[rankI(maxStl)].k})` +
	habTxt(now()) +
	(baby ? `  ·  BABY MODE ${baby}` : "") +
	(bests[LV.id] ? `  ·  MEJOR ${fmt(bests[LV.id])}s` : "");
function menuOpen() {
	if (menuOn) return;
	menuOn = true;
	kb.blur(); // si no, el teclado tapa medio panel
	if (!paused) {
		paused = true;
		pauseAt = now();
		menuPaused = true;
	}
	mstats.textContent = stats();
	lastSub = null;
	menu.className = "open";
}
function menuClose() {
	if (!menuOn) return;
	menuOn = false;
	menu.className = "";
	if (menuPaused) {
		menuPaused = false;
		unpause();
	}
}
burger.onclick = (e) => {
	if (e && e.stopPropagation) e.stopPropagation();
	menuOn ? menuClose() : menuOpen();
};
menu.onclick = (e) => {
	if (e && e.target === menu) menuClose();
}; // tocar afuera cierra

// ---- selector de nivel -----------------------------------------------------
// Izquierda la lista (niveles ahora, modos de juego cuando existan), derecha la
// ficha del seleccionado con su botón de jugar.  La lista se dibuja de una sola
// pasada con innerHTML y los clics se resuelven por delegación: así agregar un
// nivel no obliga a tocar nada de esta parte.
let pick = LEVELS[1].id,
	lvlOn = false,
	lvlPaused = false;
const meta = (l) =>
	l.soon
		? []
		: [
				`${l.C}x${l.R}`,
				`${l.coins} monedas`,
				`${l.foes} gato${l.foes == 1 ? "" : "s"}` +
					(l.stalk ? ` + ${l.stalk} acechador` : ""),
				l.fog ? "niebla" : "a la vista",
				bests[l.id] ? `mejor ${fmt(bests[l.id])}` : "sin récord",
			];
function lvlList() {
	const row = (l) =>
		`<button data-id="${l.id}" class="${l.id === pick ? "sel" : ""}${l.soon ? " soon" : ""}"` +
		` style="color:${l.col}">${l.name}<small>${l.soon ? "PRÓXIMAMENTE" : l.tag.split(" · ")[0]}</small></button>`;
	llist.innerHTML =
		"<div class=cat>NIVELES</div>" +
		LEVELS.map(row).join("") +
		"<div class=cat>MODOS DE JUEGO</div>" +
		MODES.map(row).join("");
}
function lvlPick(id) {
	const l = ALL.find((v) => v.id === id);
	if (!l) return;
	pick = id;
	lvlList();
	ltag.textContent = l.tag;
	lname.textContent = l.name;
	lname.style.color = l.col;
	// la foto sólo la tienen los niveles: los modos PRÓXIMAMENTE no, y sin esto
	// se quedaba a la vista la del nivel anterior
	lpic.style.display = l.pic ? "" : "none";
	if (l.pic) lpic.src = l.pic;
	ldesc.textContent = l.desc;
	lpts.innerHTML = l.pts.map((t) => `<li>${t}</li>`).join("");
	lmeta.innerHTML = meta(l)
		.map((t) => `<span>${t}</span>`)
		.join("");
	lgo.textContent = l.soon ? "PRÓXIMAMENTE" : "\u25B6 JUGAR";
	lgo.disabled = !!l.soon;
	lgo.style.opacity = l.soon ? ".4" : "1";
	lgo.style.color = l.soon ? "#9ef" : l.col;
}
// ---- BABY POINTS de arranque -----------------------------------------------
// El cartel de skill issue los regala de a uno EN MEDIO de la partida, que es el
// peor momento posible para decidir una dificultad: te lo pregunta justo cuando la
// estás pasando mal.  Acá se eligen ANTES de entrar, con la ficha del nivel a la
// vista.  Es el mismo babyK que usa el cartel —35% más de ventana por letra y de
// margen por letra en el QTE, por punto— y se aplican al apretar JUGAR.
const BABY_MAX = 5;
let startBaby = 0;
function babySync() {
	lbv.textContent = startBaby;
	lbh.textContent = startBaby
		? `+${Math.round(babyK(startBaby) * 100 - 100)}% de tiempo para reaccionar`
		: "reacción normal";
	lbm.disabled = !startBaby;
	lbp.disabled = startBaby >= BABY_MAX;
}
const babyStep = (d) => {
	startBaby = Math.max(0, Math.min(BABY_MAX, startBaby + d));
	babySync();
};
lbm.onclick = () => babyStep(-1);
lbp.onclick = () => babyStep(1);
babySync();

function lvlShow() {
	if (lvlOn) return;
	lvlOn = true;
	menuClose();
	kb.blur();
	if (!paused) {
		paused = true;
		pauseAt = now();
		lvlPaused = true;
	} // mirar el menú no cuesta segundos
	lvlPick(pick);
	lvl.className = "open";
}
function lvlHide() {
	if (!lvlOn) return;
	lvlOn = false;
	lvl.className = "";
	if (lvlPaused) {
		lvlPaused = false;
		unpause();
	}
}
function lvlPlay() {
	const l = ALL.find((v) => v.id === pick);
	if (!l || l.soon) return;
	lvlHide();
	setLevel(l.id);
	baby = startBaby; // la dificultad que se eligió antes de entrar
	gen();
	autoFS();
	kbFocus();
}
llist.onclick = (e) => {
	const b = e.target.closest && e.target.closest("button[data-id]");
	if (b) lvlPick(b.dataset.id);
};
lgo.onclick = lvlPlay;
nvl.onclick = () => {
	lvlShow();
	nvl.blur();
};

// ---- pantalla de resultados ------------------------------------------------
// Terminar un nivel dejaba el tablero quieto con un "GANASTE!" chiquito en la
// barra, y el tutorial mandaba derecho al selector: el jugador nunca llegaba a
// ver su tiempo.  Ahora todo nivel termina en su resumen —tiempo neto, crudo y
// penalización, rango máximo, combo, precisión, monedas— con las tres salidas:
// el nivel siguiente, otra vuelta al mismo, o el selector.  Entra RES_MS después
// de pisar la salida para que primero se vea el escape y su chispazo.
const RES_MS = 1200;
let resOn = false,
	resAt = 0,
	newPB = false;
const nextLv = () => {
	const i = LEVELS.findIndex((l) => l.id === LV.id);
	return i < 0 ? null : LEVELS[i + 1] || null;
};
function resShow() {
	resAt = 0;
	if (resOn) return;
	resOn = true;
	menuClose();
	kb.blur(); // en el teléfono el teclado tapa medio panel
	const avg = RANKS[rankI(avgStl())],
		top = RANKS[rankI(maxStl)],
		nx = nextLv();
	rtag.textContent = LV.tag;
	rttl.textContent = LV.tut ? "TUTORIAL COMPLETADO" : "NIVEL COMPLETADO";
	rtime.textContent = fmt(tEnd + pen);
	rsub.textContent = `CRUDO ${fmt(tEnd)}  ·  ${pen < 0 ? "BONUS -" : "PENALIZACIÓN +"}${fmt(Math.abs(pen))}`;
	// El rango grande es el PROMEDIO de toda la partida, no el pico ni el que quedó
	// al final.  Antes mostraba el máximo: un solo momento bueno en cuatro minutos
	// malos se llevaba el SSS, y el resumen mentía sobre cómo se había jugado.  El
	// pico sigue estando, al lado, como el récord que es.
	rgrid.innerHTML =
		`<div><i class=rank style="--rc:${avg.col}">${avg.k}</i><small>ESTILO PROMEDIO</small></div>` +
		`<div><b style="color:${top.col}">${top.k}</b><small>PICO DE ESTILO</small></div>` +
		`<div><b>x${maxCombo}</b><small>COMBO MÁX.</small></div>` +
		`<div><b>${Math.round(acc() * 100)}%</b><small>PRECISIÓN</small></div>` +
		`<div><b>${got}/${LV.coins}</b><small>MONEDAS</small></div>` +
		`<div><b>${hits + fails}</b><small>TECLAS</small></div>` +
		(qteWins
			? `<div><b>${qteWins}</b><small>GATOS</small></div>`
			: "") +
		(maxKills > 1
			? `<div><b>x${maxKills}</b><small>RACHA DE GATOS</small></div>`
			: "") +
		(dodges
			? `<div><b>${dodges}</b><small>ESQUIVES AL CRUCE</small></div>`
			: "") +
		(baby ? `<div><b>${baby}</b><small>BABY POINTS</small></div>` : "");
	rpb.textContent = newPB
		? "\u2605 ¡NUEVA MEJOR MARCA!"
		: bests[LV.id] !== undefined
			? "MEJOR MARCA " + fmt(bests[LV.id])
			: "";
	rnext.textContent = nx ? "\u25B6 " + nx.name : "\u25B6 SIGUIENTE";
	rnext.style.display = nx ? "" : "none"; // del último nivel no se sigue a ningún lado
	res.className = "open";
}
function resHide() {
	resOn = false;
	resAt = 0;
	res.className = "";
}
function resGo(id) {
	resHide();
	if (id) setLevel(id);
	gen();
	autoFS();
	kbFocus();
}
rnext.onclick = () => {
	const nx = nextLv();
	resGo(nx ? nx.id : null);
};
ragain.onclick = () => resGo(null);
rlvls.onclick = () => {
	const nx = nextLv();
	resHide();
	if (nx) pick = nx.id;
	lvlShow();
};

// ---- tutorial guiado -------------------------------------------------------
// Reemplaza al cartel de onboarding: en vez de leer cinco reglas de golpe, el
// nivel 1 enciende UN sistema por paso y no avanza hasta que el jugador lo usó.
// Cada paso: qué dice, qué prende al entrar (enter) y cómo se da por aprendido.
const TUT = [
	{
		t: "Cada salida abierta de tu casilla muestra una <b>LETRA</b>. Tecleála y el gato blanco avanza para ese lado.",
		hold: 1,
		ok: () => hits >= 4,
	},
	{
		t: "Ese <b>ANILLO</b> alrededor del gato es tu tiempo. Si se vacía —o tecleás una letra que no está— retrocedés un paso.",
		ok: () => hits >= 9,
	},
	{
		t: "Aciertos seguidos suben el <b>COMBO</b> —un error lo borra entero— y suman <b>ESTILO</b>, que es tu <b>RANGO</b> y aguanta mucho más. Encadená 4.",
		enter: () => {
			combo = 0;
		},
		ok: () => combo >= 4,
	},
	{
		t: "Cuidado: un <b>GATO NEGRO</b> entró al laberinto y viene caminando por vos. Todavía está lejos: miralo venir. Cuando te alcance, el juego se <b>frena</b> y te explica qué hacer.",
		// entra a la MISMA distancia que usa el resto del juego (FAR).  A tres
		// pasos aparecía casi encima: el primer encuentro era un manotazo y no
		// quedaba tiempo ni de mirar de dónde venía.
		enter: () => {
			foes = [tutFoe(FAR())];
			prevFoe = [];
		},
		// un jugador rápido se le escapa para siempre a un gato que da un paso por segundo,
		// y el tutorial no puede quedarse trabado esperando: al rato el gato te encuentra
		// igual.  Va a tu MISMA casilla y no a la de al lado: así el encuentro termina
		// como cualquier otro y el gato se reubica lejos al ganarlo (ver qteEnd).
		push: () => {
			prevFoe = [];
			// primer empujón: el gato NO aparece encima.  Se lo reubica a dos pasos
			// y camina los que faltan como cualquier otro (moveFoes dispara el
			// encuentro al pisarte): el jugador ve de dónde le vino.  Aparecérsele
			// en la casilla se leía como un teletransporte, y justo en el paso que
			// dice "miralo venir".
			if (tpush === 1) {
				foes = [tutFoe(2)];
				return;
			}
			// y si aun así se le sigue escapando, ahí sí se da por alcanzado: el
			// tutorial no puede quedarse trabado esperando a un jugador rápido
			foes = [p.y * C + p.x];
			qteStart();
		},
		ok: () => tflag > 0,
	},
	{
		t: "Vencer gatos te da <b>DETERMINACIÓN</b>. Con una carga, los <b>MUROS</b> de tu celda también sacan letra —en <b>violeta</b>— y teclearla te <b>atraviesa la pared</b>. Gastá una.",
		// el gato ya cumplió: se va del tablero para que este paso se practique
		// tranquilo, y la carga se regala (en la partida son 3 gatos por carga)
		enter: () => {
			foes = [];
			prevFoe = [];
			det = Math.max(det, 1);
			deal(); // las letras violetas salen recién en el reparto siguiente
			habShow("det");
		},
		ok: () => tthru > 0,
	},
	{
		t: "Y llenar el combo arma el <b>MAULLIDO</b> para toda la partida. <b>ESPACIO</b> —o el <b>&#9834;</b> de la barra— y los gatos cercanos salen corriendo. Probalo.",
		// Se arma a mano (en la partida lo arma llegar a COMBO_MAX) y vuelve EL
		// gato del tutorial, el único con el que se jugó en todo el nivel, a media
		// distancia: un maullido sin nadie a quien ahuyentar no enseña nada, y dos
		// gatos desconocidos tampoco —lo que hay que ver es a ÉSE dando media
		// vuelta, el mismo que te alcanzó hace dos pasos.
		enter: () => {
			meowOn = true;
			meowAt = -1e9;
			foes = [tutFoe(5)];
			prevFoe = [];
			habShow("meow");
		},
		ok: () => tmeow > 0,
	},
	{
		t: "Juntá las <b>MONEDAS</b> amarillas: la salida está <b>cerrada con candado</b> hasta tenerlas todas.",
		// El gato NO se borra acá.  Lo AHUYENTASTE, no lo hiciste desaparecer: el
		// maullido lo puso a correr para el otro lado y sigue en el laberinto,
		// donde tiene que estar.  Borrarlo era desmentir en el paso siguiente lo
		// que el paso anterior acababa de enseñar.
		enter: () => {
			spawn(coins, LV.coins);
		},
		ok: () => exitOpen(),
	},
	{
		t: "La salida ya está <b>verde</b>, abajo a la derecha. Corré hasta ella y escapá: eso es todo el juego.",
		ok: () => win,
	},
];
// el gato a n pasos por el laberinto: lejos para verlo venir, cerca para que no se eternice
function tutFoe(n) {
	const d = flow();
	let best = 0,
		bd = 99;
	for (let i = 0; i < C * R; i++) {
		const dd = Math.abs(d[i] - n);
		if (d[i] > 0 && dd < bd) {
			bd = dd;
			best = i;
		}
	}
	return best;
}
const tutHold = () => tutOn && !!TUT[tstep].hold;
// Lo que espera un paso antes de darse una mano.  Con el gato entrando a FAR()
// celdas —unos 8 s de caminata en el nivel 1— 4,5 s lo teletransportaban encima
// justo cuando el jugador lo estaba viendo venir.  12 s le dejan al gato llegar
// solo aunque despiste un poco: el empujón es el último recurso, no la regla.
// Y el empujón va en dos tiempos: el primero lo acerca (TUT_PUSH), el segundo lo
// da por encima tuyo (TUT_GRAB después, que desde dos pasos es tiempo de sobra
// para que llegue caminando si el jugador no sale corriendo).
const TUT_PUSH = 12000,
	TUT_GRAB = 4000;
function tutStart() {
	tutOn = !!LV.tut;
	tstep = 0;
	tflag = 0;
	tthru = 0;
	tmeow = 0;
	tAt = now();
	tpush = 0;
	tut.className = tutOn ? "on" : "";
	root.style.setProperty("--tuth", tutOn ? "112px" : "0px"); // el tablero le deja el alto
	fit(); // ...y en escritorio ese alto sale del que crecía el tablero
	if (tutOn) tutSay();
}
function tutSay() {
	tmsg.innerHTML = TUT[tstep].t;
	tnum.textContent = tstep + 1 + "/" + TUT.length;
	tfill.style.width = ((tstep / TUT.length) * 100).toFixed(0) + "%";
}
function tutCheck() {
	if (paused || frozen) return;
	const s = TUT[tstep];
	if (!s.ok()) {
		// el paso todavía no se aprendió
		if (s.push && now() - tAt > (tpush ? TUT_GRAB : TUT_PUSH)) {
			tAt = now();
			tpush++;
			s.push();
		}
		return;
	}
	if (++tstep >= TUT.length) return tutEnd();
	tflag = 0;
	tthru = 0;
	tmeow = 0;
	tAt = now();
	tpush = 0;
	const e = TUT[tstep].enter;
	if (e) e();
	shownAt = now(); // el paso nuevo no hereda el reloj gastado
	tutSay();
	sfxUnlock();
}
// SALTAR el tutorial lleva al selector, como siempre.  Terminarlo GANANDO no:
// ahí el resumen del nivel ya está en camino (entra RES_MS después de pisar la
// salida) y desde el resumen se elige a dónde ir.  Antes el selector se abría
// encima del final y el jugador no veía ni su tiempo.
function tutEnd() {
	tutOn = false;
	tut.className = "";
	root.style.setProperty("--tuth", "0px");
	fit(); // el alto que dejó el cartel vuelve al tablero
	try {
		localStorage.setItem("lg.tut", "1");
	} catch (e) {}
	pick = "clasico";
	if (!win) lvlShow();
}
tskip.onclick = () => {
	tskip.blur();
	tutEnd();
};
how.onclick = () => {
	menuClose();
	lvlHide();
	setLevel("tutorial");
	gen();
	how.blur();
};

// Si algo desplazó la página, la devolvemos arriba.  "Algo" es casi siempre el
// navegador trayendo a la vista el input al abrir el teclado, pero también sirve
// para el rebote de iOS o un scrollIntoView ajeno.  El laberinto vive pegado al
// borde superior y ahí se tiene que quedar: con el <body> ya limitado al alto
// visible esto casi nunca tiene trabajo, pero es lo que cubre a los navegadores
// que ignoran interactive-widget (iOS) y a los iframes, donde la
// etiqueta viewport es inerte.
function unscroll() {
	if (!MOBILE) return;
	try {
		if (window.scrollX || window.scrollY) window.scrollTo(0, 0);
		const se = document.scrollingElement;
		if (se && (se.scrollTop || se.scrollLeft)) {
			se.scrollTop = 0;
			se.scrollLeft = 0;
		}
	} catch (e) {}
}
// Enfocar el teclado SIN que el navegador desplace nada.  preventScroll frena el
// "traer a la vista" inmediato; iOS además desplaza cuando termina de animar el
// teclado, así que se vuelve a barrer un par de veces.
function kbFocus() {
	try {
		kb.focus({ preventScroll: true });
	} catch (e) {} // sin soporte lo ignoran, pero enfocan
	unscroll();
	[60, 180, 400].forEach((ms) => setTimeout(unscroll, ms));
}
// El ancho y el alto útiles salen del viewport VISIBLE (el de layout miente dentro
// de iframes y, en el teléfono, no descuenta el teclado).  --vh es el alto del que
// cuelgan las dos cosas: el <body> mide eso (así no hay página de sobra donde
// esconder el tablero) y el CSS achica el laberinto sólo lo necesario para que la
// barra, el tablero y el cartel del tutorial entren enteros arriba del teclado.
// Con pinch-zoom visualViewport también se achica y ahí NO cuenta: se vuelve al
// alto de layout, si no la página se plegaría al zoom.  Si el navegador no da
// visualViewport —o miente dentro del iframe— el min() con 100dvh deja todo igual.
// Lo que en la consola de escritorio NO es tablero, con los mismos números que la
// grilla de @media (min-width:860px): a lo ancho, la columna de servicio + el gap
// + el padding del <body>; a lo alto, el padding + la barra de info (80 de alto y
// 24 de margen) + el gap, y el cartel del tutorial cuando está encendido.
const DSK_MIN = 860,
	DSK_SIDE = 248 + 16 + 20,
	DSK_TOP = 28 + 104 + 9,
	DSK_TUT = 104;
function fit() {
	const vv = window.visualViewport,
		ok = !!(vv && !(vv.scale > 1.02) && vv.width > 0 && vv.height > 0),
		vw = ok ? vv.width : innerWidth,
		vh = ok ? vv.height : innerHeight;
	// El tablero se dibuja a C*S y hasta acá se quedaba clavado en ese ancho: en
	// una pantalla de escritorio era una postal chica en el medio, rodeada de aire.
	// Ahora que los botones viven adentro del menú se lleva TODO lo que sobra —el
	// ancho que deja la columna de servicio y el alto que deja la barra, siempre en
	// la proporción del nivel— y el canvas sube de resolución (K) para que crecer
	// no lo deje borroso.
	let w = Math.max(510, C * S); // ventana angosta: el tamaño de siempre
	// En la consola de dos columnas el tablero se lleva lo que sobra, y también se
	// achica si hace falta: con el ancho clavado en 510 una pantalla baja no tenía
	// dónde poner la barra y el cartel del tutorial, y la página terminaba con
	// scroll —justo lo que el laberinto no puede tener—.
	if (!MOBILE && vw >= DSK_MIN)
		w = Math.max(
			380,
			Math.min(
				vw - DSK_SIDE,
				(vh - DSK_TOP - (tutOn ? DSK_TUT : 0)) * (C / R),
			),
		);
	w = Math.max(240, Math.min(w, vw - 16));
	root.style.setProperty("--w", Math.round(w) + "px");
	root.style.setProperty("--vh", Math.round(vh) + "px");
	// K entero: escalar por 1,5 se ve peor que dibujar al doble y achicar.  El
	// -0.1 es tolerancia: a 2,03 aumentos no hace falta el triple de píxeles, la
	// diferencia no se ve y son 2,25 veces más canvas que pintar por cuadro.
	K = MOBILE ? 1 : Math.min(3, Math.max(1, Math.ceil(w / (C * S) - 0.1)));
	// el canvas nuevo arranca en blanco: si cambió, las paredes se rehornean
	if (sizeCanvas() && g && g.length === C * R) bakeMaze();
	unscroll();
}
// El resize arrastra decenas de eventos por segundo y cada fit() con el tamaño
// cambiado rehornea las paredes con shadowBlur: se coalesca a uno solo 150 ms
// después del último evento.  fit() queda síncrono para las llamadas directas
// (gen, setLevel, fsSync), que lo necesitan al instante.
let fitT = 0;
function fitSoon() {
	clearTimeout(fitT);
	fitT = setTimeout(fit, 150);
}
addEventListener("resize", fitSoon);
if (window.visualViewport) {
	visualViewport.addEventListener("resize", fitSoon);
	visualViewport.addEventListener("scroll", unscroll);
}
if (MOBILE) {
	// último cinturón: nada de scroll
	addEventListener("scroll", unscroll, { passive: true });
	addEventListener("focusin", unscroll);
}
fsSync(); // deja el botón con el texto correcto
fit();

// Primera visita: al tutorial guiado.  Si ya se terminó alguna vez, directo al
// selector de nivel (dentro de un iframe localStorage puede no estar:
// si falla, se juega el tutorial y listo).
const visto = (() => {
	try {
		return localStorage.getItem("lg.tut") === "1";
	} catch (e) {
		return false;
	}
})();
lvlList();
rankShow(0, false);
setLevel(visto ? "clasico" : "tutorial");
gen();
if (visto) lvlShow();
// render sólo cuando los sprites ya están decodificados (nada de cuadros de respaldo).
// En móvil se espera sólo a los dos que se dibujan siempre: el enemigo a pantalla
// completa y el gif de la explosión (~130KB) se decodifican en paralelo y no
// retrasan el primer cuadro, que es lo que hacía sentir lento el arranque.
const dec = (i) =>
	i.decode ? i.decode().catch(() => {}) : Promise.resolve();
Promise.all((MOBILE ? [PJ, FOE] : [PJ, FOE, BIG, GIF]).map(dec)).then(
	frame,
	frame,
);
if (MOBILE) [BIG, GIF].forEach(dec);
// check: el laberinto siempre queda conectado
(() => {
	const seen = [0],
		q = [0];
	while (q.length) {
		const c = q.pop(),
			cx = c % C,
			cy = (c / C) | 0;
		[
			[0, -1, "n"],
			[1, 0, "e"],
			[0, 1, "s"],
			[-1, 0, "w"],
		].forEach(([dx, dy, w]) => {
			const nx = cx + dx,
				ny = cy + dy,
				n = ny * C + nx;
			if (
				nx >= 0 &&
				ny >= 0 &&
				nx < C &&
				ny < R &&
				!g[c][w] &&
				!seen.includes(n)
			) {
				seen.push(n);
				q.push(n);
			}
		});
	}
	console.assert(seen.length == C * R, "laberinto no conectado");
})();
