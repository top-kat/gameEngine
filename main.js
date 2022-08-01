//--------------------------------------------------
//                 Point d'entrée
// vars "globales"
// fonction start
// utils
//--------------------------------------------------


var GE = {
    //--------------------
    // Propriétés
    //--------------------
    i: 0, // id de départ
    f: 0, // nb frames depuis le début
    vw: 0, // viewport width
    vh: 0, // viewport height
    vx: 0, // viewPortX,
    vy: 0,
    //pause: true, // DELETE pas sur d'utiliser pause car 2 modes de jeu et pause == mode menu
    animNextFrame: 0, // stocke le tmp en ms avant la frame suivante (voir draw.js spriteAnim())
    //jsonMap: 'json', // DELETE  pr stocker la map en cours
    previousTick: 0, // timestamp
    delta: 0, // le delta est un facteur de tmp (a 60fps il vaut 1, 30fps = 2)
    objects: [{}], // array de tout les objets physiques stockés par id
    cachedCollisions: [], // array des collisions mises en cache
    ready: function() {}, // @custom "document ready"
    gameStarted: false,
    killDemAll: [], // array de tout les kill du tour
    physiquePrecisionAuto: false,
    drawThisTick: true,
    levelReady: {},
    messageSuivant() {
        var next = $('.message.active').nextAll('.message')
        if (next.length) {
            $('.message.active').removeClass('active')
            next.addClass('active')
        } else {
            GE.hideScreen()
            if (GE.seqPlaying) {
                GE.seqNext();
            } else {
                GE.play()
            }
        }
    },
    tick() {

        GE.nextFrame();

        GE.f++; // nb de frames total

        if (GE.config.draw1on2frames) GE.drawThisTick = !GE.drawThisTick // dessine 1 frame sur 2

        // stats
        var t = Date.now();
        GE.frameTime = t - GE.previousTick;
        // 0.06 = 1 / (1000 / 60)
        // Delta limité car sinon lors d'un chgmt d'onglet (3fps) les players passent à travers les murs !!
        // Du à l'optimisation des tab non-actives des navigateurs
        GE.delta = Math.min(GE.frameTime * 0.06, 4);
        GE.previousTick = t;

        // Précision auto des calculs physiques basé sur les performances
        // delta / 3 * 5 = resultat
        // 3 == delta max, 5 == précision "min"
        if (GE.physiquePrecisionAuto) GE.config.physiquePrecision = GE.delta > 1.2 ? Math.floor(GE.delta * 4 / 5) : 1

        if (GE.mode === 'game') { //

            // BeforeTick
            for (var i = GE.beforeTick.length - 1; i >= 0; GE.beforeTick[i](), i--);

            // Camera
            GE.camera();

            // mise en cache des données pr la limitation des calculs (physiques et graphiques) selon l'aire visible
            GE.limitAreaInit();

            GE.collidables = []; // reset des array
            GE.onCollideFn = [];
            GE.drawables = [];
            GE.drawablesColliders = [];

            // GESTION PHYSIQUE et GRAPHIQUE des GameObjects
            GE.objects.forEach(function(o) { // object, index

                // passe à la suite si en dehors de la tranche de calcul
                if (GE.limitPhysicsAreaFn(o.x, o.y, o.xMax, o.yMax)) {

                    // gestion des durées de vies
                    if (o.lifeSpan) o.lifeSpan === 1 ? o.kill() : o.lifeSpan--;

                    // @custom si un comportement est programmé "beforeTick" il s'execute ici (IA)
                    for (j = o.beforeTick.length - 1; j >= 0; GE.IA[o.beforeTick[j]].tick(o), j--); // @custom

                    // réinit des visions
                    if (o.player) o.reinitVisions()

                    // MOUVEMENT
                    if (!o.static && GE.limitMoveAreaFn(o.x, o.y, o.xMax, o.yMax)) GE.move(o)

                    if (o.collidable) {
                        // réinit des colliders array

                        o.colliders = []
                        o.collidersClasse = []
                        o.collidersType = []
                        // construit un array de collidables dont x est l'index (cf #collisionDetection)
                        isset(GE.collidables[o.x]) ? GE.collidables[o.x].push(o) : GE.collidables[o.x] = [o]

                        if (GE.config.debugMode && GE.limitVisibleAreaFn(o.x, o.y, o.xMax, o.yMax)) GE.drawablesColliders.push(o)
                    }

                    // @custom si un comportement est programmé "afterTick" il s'execute ici (IA)
                    for (j = o.afterTick.length - 1; j >= 0; GE.IA[o.afterTick[j]].tick(o), j--); // @custom

                    // envoie les GameObjects vers le moteur graphique et limite le dessin à l'aire visible
                    if (o.visible && GE.limitVisibleAreaFn(o.x, o.y, o.xMax, o.yMax)) { //GE.drawables.push(o);
                        // gestion des zIndex (crée l'array si n existe pas encore)
                        isset(GE.drawables[o.zIndex]) ? GE.drawables[o.zIndex].push(o) : GE.drawables[o.zIndex] = [o]
                    }
                }
            });

            // Update
            GE.physics();

            // Draw
            GE.draw();
            if (GE.config.debugMode) GE.drawCollidables()

            // gestion des kills
            GE.kills();

            // afterTick
            for (i = GE.afterTick.length - 1; i >= 0; GE.afterTick[i](), i--);

        }
    },
    nextFrame() { // est remplacépar un timeout si config.fpsManuel est != false
        window.requestAnimationFrame(() => GE.tick())
    },
    init(containerId, startingLevel) {

        // charge le preloader puis execute la suite du code
        GE.resMgr.loadTemplate('ressources/default/screens/preloader.html', (htmlElm) => {

            // création container de screen et append du preloader
            $('body').append('<div id="screen-container"><div class="screen">' + htmlElm + '</div></div>');
            GE.resMgr.preloader = document.getElementById('preloader');

            $(containerId).css({
                height: 100 + '%',
                width: 100 + '%'
            });

            // création du canvas
            $(containerId).html('<canvas id="geek-school-game" class="ol"></canvas>');
            GE.container = containerId;
            GE.canvas = document.getElementById('geek-school-game');
            GE.ctx = GE.canvas.getContext("2d");

            GE.vw = $(containerId).width();
            GE.vh = $(containerId).height();
            GE.vCentre = [GE.vw / 2, GE.vh / 2];

            // ?? prends pas en compe le viewport
            GE.ctx.canvas.width = window.innerWidth;
            GE.ctx.canvas.height = window.innerHeight;

            GE.config.animFPSms = 1000 / GE.config.animFPS;
            // desactive le requestAnimationFrame pr mettre un timeout (limité à 300fps)
            if (GE.config.fpsManuel) GE.nextFrame = () => setTimeout(() => GE.tick(), Math.max(1000 / GE.config.fpsManuel, 1000 / 150));


            // Modifie l'objet dynamiquement
            if (GE.config.limitPhysicsArea.x && GE.config.limitPhysicsArea.y) {
                // met en cache les offsets (decalages limitation par rapport au viewport)
                GE.config.limitPhysicsArea.offsetLeft = GE.config.limitPhysicsArea.x * GE.vw / 2 - GE.vw / 2 //GE.vx - GE.config.limitPhysicsArea.x * GE.vw / 2 - GE.vw / 2;
                GE.config.limitPhysicsArea.offsetTop = GE.config.limitPhysicsArea.y * GE.vh / 2 - GE.vh / 2 //GE.vy - GE.config.limitPhysicsArea.y * GE.vh / 2 - GE.vh / 2;
            } else {
                GE.limitPhysicsAreaFn = GE.limitAreaInit = () => true; // si une des 2 val == 0
            }

            // mode ECO: desactive les groupes de collisions
            if (!GE.config.collisionGroups) GE.collisionGroupFn = (a, b) => true;

            // gère les onInit() qui peuvent être utilisés par des plugins par ex
            for (var i = 0; i < GE.onInit.length; i++) GE.onInit[i]();

            if (GE.config.enablePointerLock) GE.pointerLock();

            if (GE.config.enableJump) {
                GE.assign('direction', function(dir) {
                    var hero = GE.objects[0];
                    // si une anim avec direction existe on met en place la nouvelle anim
                    // si pr autres joueurs if(o.animable)
                    if (hero.grounded) hero.animation = dir === 's' ? 's' : 'marche' // jump, walk, s
                    if (dir === 'g' || dir === 'd') {
                        hero.direction = dir;
                        if (isset(hero.animations[hero.animation + '_' + hero.direction])) hero.anim = hero.animation + '_' + hero.direction // permet un chgmt de direction rapide des anims
                    }

                    switch (dir) {
                        case 'h':
                            hero.jump(); // mouvement du héros
                            if (!GE.config.enableMouse) GE.mouseDirection = [0, -1];
                            break;
                        case 'b':
                            if (!GE.config.enableMouse) GE.mouseDirection = [0, 1];
                            break;
                        case 'g':
                            if (!GE.config.enableMouse) GE.mouseDirection = [-1, 0];
                            hero.move = [-1, 0];
                            break;
                        case 'd':
                            hero.move = [1, 0];
                            if (!GE.config.enableMouse) GE.mouseDirection = [1, 0];
                            break;
                        case 's': // stop
                            hero.move = [0, 0];
                    }
                });
            }

            if (!GE.config.cameraFollowHero) {
                // TODO mettre tt dans onInit[] et enlever before et after tick en général
                // créer un ordre de priorité ?
                GE.camera = () => false;
            }

            if (GE.config.physiquePrecision == 'auto') {
                GE.physiquePrecisionAuto = true
                GE.config.physiquePrecision = 1
            }

            GE.config.physiquePrecision = Math.max(1, Math.min(GE.physiquePrecisionAuto, 5)) // compris entre 1 et 5

            Object.assign(GE.IA, GE.IAdef); // merge les IA définies par l'utilisateur et celles par defaut

            //if(isset(GE.ressources.global)) Object.assign(GE.ressourcesDefault, GE.ressources.global); // merge les ressources par defaut et globals

            if (typeof startingLevel === 'undefined') {
                console.error("StartingLevel non défini dans GE.init(conteneur, startingLevel)");
            }

            GE.evt.init(); // initialisation des eventListeners (inputs, clavier / souris)

            // config.debugMode
            if (GE.config.debugMode) {
                GE.debugger.init()
                GE.ressourcesDefault.sequences.intro.shift() // on ne met pas le logo geekschool en debug mode
            }
            GE.ressourcesDefault.sequences.intro.push(['startLevel', startingLevel]);

            GE.startLevel('game');

            GE.tick();

        });
    },
    kills: () => {

        while (GE.killDemAll.length) {
            let o = GE.killDemAll[0];
            // kill les visions et groudedVisions ratachés
            isset(o.visionIdsForKill) && o.visionIdsForKill.forEach(e => isset(GE.objects[e]) && GE.objects[e].kill());
            isset(o.groundedIds) && o.groundedIds.forEach(e => isset(GE.objects[e]) && GE.objects[e].kill());

            // lance l'effet si il existe
            if (o.effectKill) {
                GE.create({
                    type: 'effet',
                    classe: o.effectKill,
                    w: GE.classes[o.effectKill].spriteSheet[3],
                    h: GE.classes[o.effectKill].spriteSheet[4],
                    options: {
                        init: function() {
                            //var o = GE.objects[GE.id];
                            GE.x = o.xCentre - GE.w / 2;
                            GE.y = o.yCentre - GE.h / 2;
                        }
                    }
                });
            }

            o.childs.forEach(e => e.kill());
            delete GE.objects[o.id];
            GE.killDemAll.shift();
        }
    },
    startLevel: function(levelName, callBack = () => {}) {
        GE.pause();
        // réinit de certaines variables
        GE.hideAllScreens()
        // copie le hero (attention a pas copier l'objet directement)
        let Zhero = isset(GE.objects) && isset(GE.objects[0]) ? jQuery.extend({}, GE.objects[0]) : false
        GE.objects = []
        GE.i = 0
        GE.res.map = {}
        GE.res.tilesets = {}
        GE.level = levelName
        $('div', GE.container).remove()
        if (Zhero) {
            // props du hero à réinitialiser quand on change de niveau
            var arr = ['x', 'y', 'xMax', 'yMax', 'xCentre', 'yCentre', 'anim', 'direction', 'animPrec', 'animationPrec', 'animation', 'f', 'grounded', 'groundedIds', 'inertie', 'impulse', 'move', 'lastX', 'lastY', 'nextAnim', 'positionDepart', 'visionId', 'visionIdsForKill', 'seeClasses', 'vision', 'seeType', 'cachedCollisions', 'groundVision']

            // suppr la propriété à réinit
            arr.forEach(e => delete Zhero[e])

            callback = function() {
                callback();
                // permet de garder certaines fonctionnalités du hero comme par exemple les PV, score...etc
                $.extend(true, GE.objects[0], Zhero)
            }
        }
        // suit le joueur
        GE.vx = 0
        GE.vy = 0

        // cache des coord max
        GE.vxMax = GE.vx + GE.vw
        GE.vyMax = GE.vy + GE.vh
        GE.resMgr.init(callBack)
    },
    //--------------------
    // Modes
    //--------------------
    mode: 'menu', // menu, game...(joue sur les touches clavier et sur l'état de la partie)
    changeMode: function(mode) {

        GE.mode = mode;

        if (mode == 'game') {
            GE.hud.show();
        } else {
            GE.hud.hide();
        }

        // change le curseur du mode
        if (typeof GE.ressourcesDefault.cursor[mode] !== 'undefined') {
            $('body').css({
                cursor: 'url(' + GE.ressourcesDefault.cursor[mode] + ')'
            });
        }
    },
    play: () => GE.changeMode('game'),
    pause: () => GE.changeMode('menu'),
    //--------------------
    // Ressources
    //--------------------
    ressourcesDefault: { // ?DELETE? seulement mettre 1 premier screen geekschool ?
        images: {},
        sounds: {
            select: 'ressources/default/sounds/select.wav',
            valider: 'ressources/default/sounds/valider.wav'
        },
        screens: {
            //preloader: 'dep/screens/preloader.html',
            splashScreen: 'ressources/default/screens/splash.html',
            pause: 'ressources/default/screens/pause.html'
        },
        sequences: {
            intro: [
                ['showScreen', 'splashScreen', 1500]
            ]
        },
        cursor: { // celui ci est récupéré dans la fonction de changement de modes pr afficher le bon curseur
            menu: '',
            game: 'ressources/default/images/cursor-blank.png'
        }
    },
    ressources: {}, // @custom ressources du jeu
    classes: {}, // @custom types d'énnemis
    IA: {}, // @custom IA
    IAdef: { // IA par defaut

    },
    //--------------------
    // Custom evt listener
    //--------------------
    onInit: [], // @custom arr de functions
    onCollideFn: [], // arr qui stocke ttes les fn onCollide à déclencher pr le tick en cours
    onStartLevel: fn => GE.onStartLevelFn.push(fn),
    onStartLevelFn: [],
    beforeTick: [],
    afterTick: [],
    //--------------------
    // UTILITIES
    //--------------------
    ids: function() { // créations d'identifiants uniques
        GE.i++;
        return GE.i;
    },
    addCustomKey: function(i, keyCode, action) { // ALIAS ajoute une touche custom aux listeners
        GE.evt.addCustomKey(i, keyCode, action);
    },
    cloneJSObject: (o, opt = {}) => jQuery.extend(true, {}, o, opt), // cloneJSObjectr des objets
    /*ease: function(t, b, c, d) { // t: current time, b: begInnIng value, c: change In value, d: duration
     return c * (t /= d) * t + b;
     },*/
    pointerLock: function() {

        if ('pointerLockElement' in document) {

            var pointerlockchange = function(event) {
                //document.pointerLockElement && GE.keyMap.esc[GE.mode]();
            };

            document.addEventListener('pointerlockchange', pointerlockchange, false);

            // clic sur l'overlay SplashScreen
            window.addEventListener('click', function(event) {

                !document.pointerLockElement && GE.canvas.requestPointerLock();

            }, false);
        }
    },
    //--------------------
    // Opérations sur les vecteurs
    //--------------------
    vector: (x, y) => [x, y],
    vMult: function(v) { // multiplications de vecteurs
        return new GE.vector(v1[0] * v2[0], v1[1] * v2[1]);
    },
    vDist: function(v1, v2) { // distance entre 2 points
        return Math.sqrt(Math.pow(v2[0] - v1[0], 2) + Math.pow(v2[1] - v1[1], 2));
    },
    vDot: function(v1, v2) { // produit scalaire
        return v1[0] * v2[0] + v1[1] * v2[1];
    },
    vNorm: function(v) {
        var longueur = Math.sqrt(Math.pow(v[0], 2) + Math.pow(v[1], 2));
        v[0] /= longueur;
        v[1] /= longueur;
        return v;
    }
};

function isset(elm) {
    return typeof elm != "undefined"; // ne pas tester en strict car undefined !== de 'undefined'
}