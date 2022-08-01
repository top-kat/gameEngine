//--------------------------------------------------
//           CONFIGURATION PAR DEFAUT
//--------------------------------------------------

GE.config = {
    //--------------------
    // Config Build APK (App mobile)
    //--------------------
    nom: 'GE', // nom de l'app
    auteur: 'Sébastien GARCIA-ROMEU', // nom de l'auteur ou de la team
    description: `Un autre jeu Geek School`, // courte description
    email: 'seb@geekschool.fr', // adresse email de contact
    site: 'http://.fr', // site de la team
    version: '1.0.0', // version du jeu
    mobile: {
        orientation: 'landscape', // all, portrait, landscape
        fullScreen: 'true',
        backgroundColor: '000000ff', // #rgba
    },
    //--------------------
    // DEBUG
    //--------------------
    debugMode: true, // (defaut:true)
    debugOptions: {
        showIds: true, // (defaut:true)
        showColliders: true, // (defaut:true)
        showVisions: true, // (defaut:true)
        showAnim: true, // (defaut:true)
        nbElmMoyenneFps: 30, // calcule sur les 30 dernières frames (defaut:30)
    },
    // permet de gérer manuellement les fps (en nb de fps. Ex: 60 ou 999 pr desactiver la limite) (defaut:false)
    fpsManuel: false,
    //--------------------
    // GAMEENGINE
    //--------------------
    GEversion: '1.7.1', // version du GameEngine
    animFPS: 12, // fps pour les animations (en frames par secondes) (defaut:12)
    tailleCase: 64, // si besoin de la taille des tiles / sprites...etc (defaut:64)
    gravite: [ 0, 0.5 ], // [x, y] (defaut: [0, 0.5])
    friction: 0.08, // friction par defaut des materiaux (defaut: 0.08)
    // Précision des calculs physiques
    // 'auto': s'adapte à la puissance de l'ordinateur; 1,2,3,4 => du plus précis au plus econome en perf
    physiquePrecision: 'auto', //'auto',
    // Permet de désactiver les collision group afin de gagner en performances
    // Collision groups: hero = 1,2; énnemi = 1; bonus = 2; Ex: le hero collide avec ennemis et bonus, mais bonus ne collide pas ac ennemis
    collisionGroups: true,
    // élimination intélligente des calculs : la physique ne s'applique pas à une certaine distance du viewport (de l'écran), permet de gagner en perf.
    limitPhysicsArea: {
        // nb de fois le viewport. Si l'une des 2 valeurs == 0 desactive le limiteur de calculs. Note: doit être un objet
        x: 2,
        y: 2,
        // taille max d'un non-static, marge en pixel entre limitPhysicsArea et limitMoveArea, évite les bugs de perso qui tombent à travers un collider quand le perso est tjs dans la zone et le collider non
        marge: 150
    },
    // permet d'économiser des ressources dans les cas extrêmes
    draw1on2frame: false,
    //--------------------
    // GAMEPLAY
    //--------------------
    cameraFollowHero: true, // la camera suit t'elle le hero ? (defaut:true)
    // la camera doit elle NE PAS dépasser les limites de la map (par exemple jamais descendre en dessous du point 0) defaut: false
    // valeurs possibles: false, 'x', 'y', true
    cameraClampToMapLimits: false,
    enableKeyboard: true, // activer clavier (defaut:true)
    enableMouse: false, // activer souris (defaut:false)
    mouseMode: 'vector', // 'relative' | 'screen' | 'vector' <= vecteur d'angle (defaut:vector)
    enablePointerLock: false, // @TODO (defaut:false)
    playersSoftCollision: true, // est-ce que les players softCollident en général (ils se passent à travers) (defaut:true)
    bulletsSoftCollision: true, // si la collision entre players et bullets est true (defaut:true)
    enableJump: true, // autorise le saut (vue de coté) (defaut:false)
}

if ( typeof module != 'undefined' ) module.exports = config
