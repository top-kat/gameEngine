//--------------------------
// OBJECTS
//--------------------------

// CLASSES, TYPES et BLOCS:
// Les BLOCS sont des blocs de propriétés
// Les TYPES sont des types d'objets prédéfinis issu du 'merge' de plusieurs blocs
// Les CLASSES sont définies par l'utilisateur avec les propriétés custom à ajouter ou remplacer dans le type
//
// HERITAGE
// < : hérite de
// classe < type < bloc1 < bloc2 < blocBase
// Exemple:
// classe 'zombie' < type 'ennemi' < bloc 'player' < bloc 'collidable' < bloc 'dynamic' < bloc 'base'

GE.obj = {};

//---------------------
// BLOCS
//---------------------

GE.obj.base = function ( x, y, w, h, shape ) { // prototype de base pr tt les objets

    this.id = GE.ids(); // génère un nouvel ID
    this.init = () => {};
    this.collidable = false;
    this.static = true; // ne bouge pas
    this.visible = false;
    this.shape = shape;
    this.x = Math.round( x ), this.y = Math.round( y ); // important qu'ils soient arrondis pr perfs ! /!\ Le moteur physique ne permet que des nombres entiers
    this.w = Math.round( w ), this.h = Math.round( h );
    this.xCentre = this.x + this.w / 2;
    this.yCentre = this.y + this.h / 2;
    this.xMax = x + w, this.yMax = y + h;
    this.lastX = 0, this.lastY = 0; // dernières positions pr interpolations
    this.onInit = [];
    this.onTick = false;
    this.child = false; // stocke si oui ou non c'est un enfant
    this.parent = false; // stocke son parent objet
    this.childs = []; // stocke tout les ID de ses enfants
    this.offsetX = 0;
    this.offsetY = 0;
    this.friction = 0.96; // 0.93 et 1 friction du materiel
    this.platform = false;
    this.projectile = false;
    this.canJumpGe = true;
    this.player = false;
    this.lifeSpan = false;
    this.hit = hitter => true; // pr eviter undefined

    this.addChild = o => {
        o.parent = this;
        o.child = true;
        this.childs.push( o );
    };

    this.kill = function () { // gestion des suppression d'objets et réferences dans les arrays (rien d autre)
        if ( this.onKill() !== false ) { // il faut que onKill retourne false pour annuler la procédure de kill
            GE.killDemAll.push( this ); // evite les doublons
        }
    };

    this.onKill = killer => true; // @custom

    this.updatePos = () => {
        this.xMax = this.x + this.w;
        this.yMax = this.y + this.h;
        this.xCentre = this.x + this.w / 2;
        this.yCentre = this.y + this.h / 2;
    }

    if ( shape == 'rond' ) {
        this.rX = w / 2;
        this.rY = h / 2;
        this.x = x + this.rX; // a partir du centre
        this.y = y + this.rY;
    }

    this.beforeTick = []; // @custom arr de fonctions au format string (appelle ce qui se trouve dans GE.IA)
    this.afterTick = []; // @custom arr de fonctions
};

//---------------------
// Visible
//---------------------

GE.obj.visible = {
    visible: true,
    zIndex: 0,
    img( img, cropX = 0, cropY = 0, w, h ) {

        !isset( GE.res.image[ img ] ) && console.error( "Aucune image trouvée avec l'id " + img );
        !isset( w ) && ( w = GE.res.image[ img ].width ); // largeur par defaut = largeur de l image
        !isset( h ) && ( h = GE.res.image[ img ].height );
        this.spriteSheet = [ img, cropX, cropY, w, h ];
        this.visible = true;
    },
    spriteSheet: [ false ], // [img, x, y, w, h] CROP
    imageOffset: [ 0, 0 ], // si la taille n'est pas la même que l image
    animations: {}, // définition des animations
    direction: 'd', // left, right
    animation: 's', // jump, walk, s
    animationPrec: 's',
    animationOverride: 's',
    isAnimationOverride: false,
    fOverride: 0,
    anim: 'def', // animation format anim_direction
    animOverride: 'def',
    waiting: 0, // stocke le nb de millisecondes en attende avt next frame
    nextAnim: false,
    animable: false, // si animé
    animPrec: false,
    effectInit: false, // effet qd init
    effectKill: false,
    effectHit: false,
    effectHitI: 0,
    player: false,
    isVision: false,
    f: 0, // frame
    // animation: false, // si le visuel est animé
    animRalenti: 1, // répétition de chaques frames
    frameLength: 1, // nb de frames
    onInit: [
        function ( o ) {
            //var o = GE.objects[id];

            if ( o.frameLength !== 1 ) {
                // gestion des animations en direct
                o.anim = 'def';
                if ( !Object.keys( o.animations ).length ) {
                    o.animations = {
                        def: [ 'l' ] // l == loop
                    }
                }
                for ( let i = o.frameLength - 1; i >= 0; i-- ) {
                    for ( let i2 = 1; i2 <= o.animRalenti; o.animations.def.unshift( i ), i2++ );
                }
            }
        }
    ],
};

//---------------------
// Collidable
//---------------------

GE.obj.collidable = {
    collidable: true,
    collisionGroup: 0, // ex bonus etc ou heros passe a travers...pkoi objet: plus facile pr intersection entre 2 elm
    collisionHard: true, // hard == s'influencent physiquement, soft == passe au travers mais compte la collision (ex: bonus)
    onCollide: colliders => false, // @custom fonction
    colliders: [], // array des futurs colliders
    rebond: 0.1, // [0-1] restitution de la force
    cachedCollisions: [] // ?!
};

//---------------------
// Non-statique
//---------------------

GE.obj.dynamic = {
    static: false,
    accel: 0.7, // variable selon le niveau d'acceleration de 0 à vitesseMax
    vitesseMax: 7,
    masse: 1, // influence collision entre lourd et léger
    inertie: [ 0, 0 ], // énergie emmagasinée [x, y]
    influenceGravite: 1,
    frictionInfluence: 1,
    rotation: [ 0, 0 ],
    impulse: [ 0, 0 ], // important pr les saut...etc (override vitMax...etc)
    move: [ 0, 0 ], //
    grounded: false,
    groundFriction: 1, // config.friction des elements sur lesquels on se trouve
    respawnPosition: [ 0, 0 ],
    respawn( x = this.respawnPosition[ 0 ], y = this.respawnPosition[ 1 ] ) {
        this.x = Math.round( x ), this.y = Math.round( y ); // important qu'ils soient arrondis pr perfs ! /!\ Le moteur physique ne permet que des nombres entiers
        this.xCentre = this.x + this.w / 2;
        this.yCentre = this.y + this.h / 2;
        this.xMax = x + this.w, this.yMax = y + this.h;
        this.lastX = 0, this.lastY = 0; // dernières positions pr interpolations
    }
};

//---------------------
// Player
//---------------------

GE.obj.player = {
    platform: false, // a enlever ?  @TODO @verif 
    collisionGroup: 2,
    collideWith: [ 0, 1, 4 ], // mur, hero, projectile allie
    pv: 1,
    isIntoPlatform: [],
    hit( val = 1, hitterId = 0 ) { // mecanique de hit (gestion des pv, declanchement du onKill)

        if ( this.hitCache[ hitterId ] !== true ) {

            // mise en cache des hit pr pas qu'on puisse avoir des situations ou on compte 1 hit par frames..
            this.hitCache[ hitterId ] = true;
            setTimeout( () => {
                this.hitCache[ hitterId ] = false;
            }, 500 );

            // effet de hit
            if ( this.effectHit ) {

                // l'effet peut aussi être un array d'effet
                var effect = typeof this.effectHit === 'string' ? this.effectHit : ( this.effectHitI++, this.effectHit[ this.effectHitI % this.effectHit.length ] );

                var o = GE.objects[ this.id ];

                GE.create( {
                    type: 'effet',
                    classe: effect,
                    w: GE.classes[ effect ].spriteSheet[ 3 ],
                    h: GE.classes[ effect ].spriteSheet[ 4 ],
                    options: {
                        init: function () {
                            this.x = o.xCentre - this.w / 2;
                            this.y = o.yCentre - this.h / 2;
                        }
                    }
                } );
            }

            // déclanchement du onHit, si il retourne pas false on compte les PV
            if ( this.onHit( val, hitterId ) !== false ) {
                this.pv -= val;
                if ( this.pv < 1 ) {
                    this.kill( hitterId ); // tué par hitterId
                }
            }
        }
    },
    onHit( val, hitterId ) {}, // @custom
    hitCache: [],
    // Gestion de vision
    visionIdsForKill: [], // arr des id d'objets visions pr les delete
    vision: {}, // array des objets de visions
    groundedIds: [], //    ""           ""                ""
    see: { // pr certaines IA array des objets en vision directe
        //hg: [collisionneur] // haut gauche => arr de collisionneurs
        h: [],
        b: [],
        g: [],
        d: [],
        hg: [],
        bg: [],
        hd: [],
        bd: []
    },
    seeType: { // arr des filtres pr les visions
        h: [],
        b: [],
        g: [],
        d: [],
        hg: [],
        bg: [],
        hd: [],
        bd: []
    },
    seeClasses: { // arr des filtres pr les visions { bd : ['classe', 'hero', 'wall']}
        h: [],
        b: [],
        g: [],
        d: [],
        hg: [],
        bg: [],
        hd: [],
        bd: []
    },
    groundVision: {
        h: [],
        b: [],
        g: [],
        d: [],
        hg: [],
        bg: [],
        hd: [],
        bd: []
    },
    reinitVisions() {
        this.see = {
            h: [],
            b: [],
            g: [],
            d: [],
            hg: [],
            bg: [],
            hd: [],
            bd: []
        }
        this.groundVision = {
            h: [],
            b: [],
            g: [],
            d: [],
            hg: [],
            bg: [],
            hd: [],
            bd: []
        }
        this.seeType = {
            h: [],
            b: [],
            g: [],
            d: [],
            hg: [],
            bg: [],
            hd: [],
            bd: []
        }
        this.seeClasses = {
            h: [],
            b: [],
            g: [],
            d: [],
            hg: [],
            bg: [],
            hd: [],
            bd: []
        }
    },
    onInit: [
        o => GE.createVision( o, [ 'b', /*'g', 'h', 'd', */ 'grounded' ], 5 ) // pr savoir si grounded
    ],
    jumpForce: 16,
    onJump() {},
    jump() {
        if ( this.grounded && this.canJumpGe && this.isIntoPlatform.length === 0 ) {
            this.onJump();
            this.impulse[ 1 ] += -1 * this.jumpForce;
            if ( isset( this.animations.saut_d ) || isset( this.animations.saut ) ) this.animation = 'saut'
            this.canJumpGe = false; // HACK TODO trouver un truc + propre : le grounded reste activé sur les explosifs sinon pr les zombies...
            setTimeout( () => {
                this.canJumpGe = true;
            }, 100 )
        }
    },
    player: true
};
//---------------------
// Autres
//---------------------

GE.obj.ennemi = {
    // gestion de l'IA
    actualIA: false, //string ou false
    IA: function ( ia ) { // ia == string. L'intelligence artificielle s'initialise ici !

        if ( this.actualIA ) {
            // kill l'ancienne IA
            typeof GE.IA[ this.actualIA ].kill === 'function' && GE.IA[ this.actualIA ].kill( this );

            // la suppr du tableau beforeTick
            this.beforeTick.splice( this.beforeTick.indexOf( this.actualIA ), 1 );
        }

        // init nouvelle IA
        this.actualIA = ia;

        typeof GE.IA[ this.actualIA ].init === 'function' && GE.IA[ this.actualIA ].init( this );

        this.beforeTick.push( ia );
    }
};

GE.obj.hero = {
    id: 0,
    collisionGroup: 1,
    collideWith: [ 0, 2, 3, 5 ], // mur, ennemi, bonus projectile ennemi
};

GE.obj.bonus = {
    platform: false, // @TODO @verif a enlever ?
    collisionGroup: 3,
    collideWith: [ 1 ],
    collisionHard: false,
    influenceGravite: 0 // les bonus peuvent être dynamiques mais par défaut ne comptent pas la gravité
};


GE.obj.vision = {
    isVision: true,
    collisionHard: false,
    collisionGroup: 7,
    collideWith: [ 0, 1, 2 ], // murs, trigger, ennemis
    influenceGravite: 0,
}

GE.obj.projectile = {
    masse: 0.3,
    rebond: 1,
    influenceGravite: 0,
    projectile: true,
    frictionInfluence: 0,
    collisionHard: true,
    vitesseMax: 99,
    dureeVie: 2000, // ms
    onInit: [
        o => setTimeout( () => isset( o ) && o.kill(), o.dureeVie ) // durée de vie 2 sec pr les projectiles
    ]
}

GE.obj.projectileEnnemi = {
    collisionGroup: 4, // projectile ennemi
    collideWith: [ 0, 1 ], // murs, hero
}

GE.obj.projectileAllie = {
    collisionGroup: 5, // projectile allié
    collideWith: [ 0, 2 ], // murs, ennemis
}

GE.obj.effet = {
    animations: {
        def: [ 'k' ] // k == kill
    },
    zIndex: 1
}

GE.obj.visuel = {
    masse: 0, // influence collision entre lourd et léger
    influenceGravite: 0
}

GE.trigger = {
    collisionHard: false,
    collisionGroup: 6,
    collideWith: [ 1, 2 ] // hero, players
}

/*GE.obj.animation = { // TODO le mettre dans visuel
    onInit: [
        id => {
            
        }
    ],
    animRalenti : 1
};*/

//---------------------
// TYPES
// détermine quels blocs utiliser selon les types de GameObjects
//---------------------

GE.obj.types = { // tableaux des "blocs" à merger selon le type (le type "base" est commun à tous) (héritage: le dernier à raison)
    collider: [ GE.obj.visible, GE.obj.collidable, {
        collideWith: [ 1, 2 ]
    } ],
    ennemi: [ GE.obj.visible, GE.obj.collidable, GE.obj.dynamic, GE.obj.player, GE.obj.ennemi ],
    hero: [ GE.obj.visible, GE.obj.collidable, GE.obj.dynamic, GE.obj.player, GE.obj.hero ],
    bonus: [ GE.obj.visible, GE.obj.collidable, /*GE.obj.dynamic,*/ GE.obj.bonus ],
    vision: [ GE.obj.collidable, GE.obj.dynamic, GE.obj.vision ],
    visuel: [ GE.obj.visible, GE.obj.dynamic, GE.obj.visuel ],
    projectileAllie: [ GE.obj.visible, GE.obj.collidable, GE.obj.dynamic, GE.obj.projectile, GE.obj.projectileAllie ],
    projectileEnnemi: [ GE.obj.visible, GE.obj.collidable, GE.obj.dynamic, GE.obj.projectile, GE.obj.projectileEnnemi ],
    effet: [ GE.obj.visible, GE.obj.dynamic, GE.obj.visuel, GE.obj.effet ],
    trigger: [ GE.obj.collidable, GE.trigger ]
};

GE.createVision = function ( o, directions, wG, wH = wG, wD = wG, wB = isset( wH ) ? wH : wG ) {

    // wG, wH, wD, wB | taille du champ de vision, seul le premier paramètre est obligatoire, si seulement 2 sont définis, ils vaudront aussi pr les directions opposées
    // x = gauche, xm = droite

    var grounded = false;

    if ( directions.includes( 'grounded' ) ) {
        grounded = true;
        delete directions[ directions.indexOf( 'grounded' ) ];
    }

    // Array de conversion pr placer (x, y, w, h)
    // offset de 3px de chaques cotés pr éviter les bugs
    var dirs = {
        h: [ 3, o.y - wH, o.w - 6, wH ],
        b: [ 3, o.yMax, o.w - 6, wB ],
        g: [ o.x - wG, o.y + 3, wG, o.h - 6 ],
        d: [ o.x + o.w, o.y + 3, wD, o.h - 6 ],
        hg: [ o.x - wG, o.y - wH, wG, wH ],
        hd: [ o.x + o.w, o.y - wH, wD, wH ],
        bg: [ o.x - wG, o.yMax, wG, wB ],
        bd: [ o.x + o.w, o.yMax, wD, wB ]
    };

    // array pr les placement (offset = x / y parent + offset)
    var offsets = {
        h: [ 3, -wH ],
        b: [ 3, o.h ],
        g: [ -wG, 3 ],
        d: [ o.w, 3 ],
        hg: [ -wG, -wH ],
        hd: [ o.w, -wH ],
        bg: [ -wG, o.h ],
        bd: [ o.w, o.h ]
    };

    directions.forEach( dir => {

        var v = GE.create( {
            type: 'vision',
            x: dirs[ dir ][ 0 ],
            y: dirs[ dir ][ 1 ],
            w: dirs[ dir ][ 2 ],
            h: dirs[ dir ][ 3 ]
        } );

        v.child = true;
        v.parent = o;
        v.parent.childs.push( v )
        v.offsetX = offsets[ dir ][ 0 ];
        v.offsetY = offsets[ dir ][ 1 ];
        v.visionDirection = dir;

        if ( grounded ) {
            // push l'array des visions de l'objet avec l'id de la vision pr pouvoir ensuite le delete onKill()
            o.groundedIds.push( v.id );
            v.classe = 'groundVision';

        } else {
            o.visionIdsForKill.push( v.id );
            o.vision[ dir ] = v // stocke une ref de la vision dans l'objet parent
        }
    } );
}


//---------------------
// 
// GE.create( { type, classe, x, y, width, height, shape, options })
// Tout les paramètres sont optionnels
// Default: {
//    type: 'collider', x: 0, y: 0, w: GE.config.tailleCase,
//    h: isset( options.w ) ? options.w : GE.config.tailleCase, classe: '', shape: 'rect',
//    options: {}, // remplace tout ces parametres dans l'objet crée (ex: {onKill() = alert('you hit zombie2')}) ecrase type et classe...etc
//    classOverrideOption: false // si la classe extend les options ou l'inverse
//}
//---------------------

GE.create = function ( options ) {

    // meilleure gestion des 'par defaut'... classOverrideOption == si la classe extend les options ou l'inverse
    var opt = $.extend( true, {
        type: 'collider',
        x: 0,
        y: 0,
        w: GE.config.tailleCase,
        h: isset( options.w ) ? options.w : GE.config.tailleCase,
        classe: '',
        shape: 'rect',
        options: {},
        classOverrideOption: false
    }, options );
    var o = {};
    var classeName = opt.classe;
    opt.classe = opt.classe ? GE.classes[ opt.classe ] : {}; // classe par defaut
    //console.log(opt.classe);
    isset( opt.classe ) && isset( opt.classe.type ) && ( opt.type = opt.classe.type );

    // gestion mess d'erreur
    !GE.obj.types.hasOwnProperty( opt.type ) && console.error( 'Un objet est crée avec le type "' + opt.type + '" non défini.' );
    !isset( opt.classe ) && console.warn( 'Un objet est crée avec la classe "' + classeName + '" non définie.' );

    GE.obj.base.call( o, opt.x, opt.y, opt.w, opt.h, opt.shape ); // héritage constructeur de base

    GE.obj.types[ opt.type ].forEach( ( elm, i ) => $.extend( true, o, GE.obj.types[ opt.type ][ i ] ) ); // héritage de blocs

    $.extend( true, o, ( !opt.classOverrideOption ? opt.classe : {} ), opt.options, ( opt.classOverrideOption ? opt.classe : {} ), {
        type: opt.type,
        classe: classeName
    } ); // héritage de classe

    GE.objects[ o.id ] = o; // le stocker dans le tableau des objets

    // appel des fonction du onInit (géré par des plugins externes par exemple)
    for ( let elm of o.onInit ) {
        elm( o );
    }

    o.init();

    // lance l'effet du init si il existe
    if ( o.effectInit ) {
        GE.create( {
            type: 'effet',
            classe: o.effectInit,
            w: GE.classes[ o.effectInit ].spriteSheet[ 3 ],
            h: GE.classes[ o.effectInit ].spriteSheet[ 4 ],
            options: {
                init: () => {
                    this.x = o.xCentre - this.w / 2;
                    this.y = o.yCentre - this.h / 2;
                }
            }
        } );
    }

    // si c'est l'id de l'image qui est renseigné à la place de l'image elle même
    if ( isset( o.spriteSheet ) && typeof o.spriteSheet[ 0 ] === 'string' ) o.spriteSheet[ 0 ] = GE.res.image[ o.spriteSheet[ 0 ] ];

    // si des animations sont définies: animation activée
    if ( GE.objects[ o.id ].visible && Object.keys( GE.objects[ o.id ].animations ).length ) GE.objects[ o.id ].animable = true;

    // gère les animations par defaut
    if ( isset( GE.objects[ o.id ].animations ) && !isset( GE.objects[ o.id ].animations.def ) ) GE.objects[ o.id ].animations.def = [ 0 ];

    // debug si manque spriteSheet
    if ( GE.objects[ o.id ].visible && !GE.objects[ o.id ].spriteSheet[ 0 ] ) GE.objects[ o.id ].visible = false;

    // debug grounded
    if ( GE.objects[ o.id ].static && isset( GE.objects[ o.id ].groundedIds ) && GE.objects[ o.id ].groundedIds.length ) GE.objects[ o.id ].groundedIds.forEach( e => GE.objects[ e ].kill() ), GE.objects[ o.id ].groundedIds = [];

    // init du onTick()
    if ( GE.objects[ o.id ].onTick !== false ) GE.beforeTick.push( GE.objects[ o.id ].onTick );

    // ajuste la taille du groundedVision au cas ou la taille du gameObject a changé
    if ( isset( GE.objects[ o.id ].groundedIds ) && GE.objects[ o.id ].groundedIds.length ) GE.objects[ GE.objects[ o.id ].groundedIds[ 0 ] ].w = 48 - 6; // grounded vision

    return GE.objects[ o.id ]; // retourner sa référence

};