//-----------------------------
//  KeyMap global (actions par defaut des touches)
//-----------------------------


Object.assign( GE, {
    mouseDirection: [ 0, 0 ],
    //
    // création d'une fonction sur une touche, un curseur...
    //
    assign: function ( nom, func, mode = 'game', keyCode = false ) {

        if ( nom.includes( 'custom' ) ) {
            var i = parseInt( nom.split( 'om' )[ 1 ] ) - 1;
            if ( keyCode ) {
                this.evt.customKey[ mode ][ i ] = keyCode;
            } else {
                console.error( 'Aucun keyCode définit pour la fonction GE.assign("' + nom + '")' );
            }
        }

        this.keyMap[ nom ][ mode ] = func;
    },
    //
    // fonctions définies sur les listeners (clavier souris)
    //
    keyMap: {
        action: { // 0 espace / entrée
            game: () => false,
            menu: () => { // valider
                if ( $( '#screen-' + GE.activeScreen + ' .active' ).length ) {
                    // si il y a un .active on clique dessus
                    $( '#screen-' + GE.activeScreen + ' .active' ).first().click();
                } else if ( isset( GE.actualSequence[ GE.seqIndex ] ) ) {
                    // sinon si une séquence existe et est en cours on passe à la suivante
                    GE.seqNext()
                }
            },
            lock: () => false
        },
        direction: { // 3 touches directionelles (z,q,s,d et haut, bas, gauche, droite)
            game: dir => {
                var hero = GE.objects[ 0 ];
                hero.nextAnim = dir;
                switch (dir) {
                    case 'up':
                        hero.move = [0, -1]; // mouvement du héros
                        if (!GE.config.enableMouse) GE.mouseDirection = [0, -1];
                        break;
                    case 'down':
                        hero.move = [0, 1];
                        if (!GE.config.enableMouse) GE.mouseDirection = [0, 1];
                        break;
                    case 'left':
                        hero.move = [-1, 0];
                        if (!GE.config.enableMouse) GE.mouseDirection = [-1, 0];
                        break;
                    case 'right':
                        hero.move = [1, 0];
                        if (!GE.config.enableMouse) GE.mouseDirection = [1, 0];
                        break;
                    case 's':
                        hero.move = [0, 0];
                }
            },
            menu: dir => {
                if ( dir === 'h' || dir === 'g' ) { // haut gauche
                    GE.nav.prec();
                } else if ( dir === 'd' || dir === 'b' ) { // droite bas
                    GE.nav.suiv();
                }
            },
            lock: () => false
        },
        esc: {
            game: () => {
                //GE.pause = true;
                GE.changeMode( 'menu' );
                GE.showScreen( 'pause' );
            },
            menu: () => {
                if ( GE.activeScreen === 'pause' ) {
                    setTimeout( GE.changeMode( 'game' ), 50 );
                }
                GE.hideScreen();
            },
            lock: () => false
        },
        clicG: { // clic G
            game: ( e ) => {
                GE.keyMap[ 'action' ]();
            }, // function
            menu: ( e ) => {
                if ( $( e.target ).attr( 'onClick' ) ) {
                    GE.playSound( 'valider' );
                }
            },
            lock: () => false
        },
        clicD: { // clic D
            game: ( e ) => {
                GE.keyMap[ 'action' ]();
            }, // function
            menu: ( e ) => {

            },
            lock: () => false
        },
        curseur: { // curseurs
            game: ( x, y ) => {

            }, // function
            menu: ( x, y ) => {},
            lock: () => false
        },
        custom1: { // custom
            game: () => false,
            menu: () => false,
            lock: () => false
        },
        custom2: { // custom
            game: () => false,
            menu: () => false,
            lock: () => false
        },
        custom3: { // custom
            game: () => false,
            menu: () => false,
            lock: () => false
        },
        custom4: { // custom
            game: () => false,
            menu: () => false,
            lock: () => false
        }
    }
} );




//-----------------------------
//  Evt listeners
//-----------------------------

GE.evt = {
    init() {

        GE.evt.resizeEvt(); // evt lié au redimensionnement de la fenêtre

        if ( GE.config.enableKeyboard ) {

            this.keyEnabledArray = Array( 222 ).fill( true ); // remplit un array de 222 true

            window.addEventListener( 'keydown', function ( e ) {
                //$( window ).keydown( function ( e ) {

                if ( GE.evt.keyEnabledArray[ e.keyCode ] ) {

                    GE.evt.keyEnabledArray[ e.keyCode ] = false;

                    // PERF simplifier la route des evt: if mode == jeu GE.actions... else this.actins.mode.....
                    switch ( e.keyCode ) {
                        case 32: // espace
                        case 13: // entrée
                            e.preventDefault();
                            GE.keyMap.action[ GE.mode ]();
                            break;
                        case 38:
                        case 90: // z
                            e.preventDefault();
                            GE.keyMap.direction[ GE.mode ]( 'h' );
                            break;
                        case 37: // gauche
                        case 81: // q
                            e.preventDefault();
                            GE.keyMap.direction[ GE.mode ]( 'g' );
                            break;
                        case 39: // droite
                        case 68: // d
                            e.preventDefault();
                            GE.keyMap.direction[ GE.mode ]( 'd' );
                            break;
                        case 40: // bas
                        case 83: // s
                            e.preventDefault();
                            GE.keyMap.direction[ GE.mode ]( 'b' );
                            break;
                        case 27: // esc
                            e.preventDefault();
                            GE.keyMap.esc[ GE.mode ]();
                            break;
                        case GE.evt.customKey[ 0 ]:
                            e.preventDefault();
                            GE.keyMap.custom1[ GE.mode ]();
                            break;
                        case GE.evt.customKey[ 1 ]:
                            e.preventDefault();
                            GE.keyMap.custom2[ GE.mode ]();
                            break;
                        case GE.evt.customKey[ 2 ]:
                            e.preventDefault();
                            GE.keyMap.custom3[ GE.mode ]();
                            break;
                        case GE.evt.customKey[ 3 ]:
                            e.preventDefault();
                            GE.keyMap.custom4[ GE.mode ]();
                            break;
                    }
                }
            } );

            // évite l'effet mitraillette qd on reste appuyé sur les touches
            window.addEventListener( 'keyup', function ( e ) {
                //$( window ).keyup( e => {
                GE.evt.keyEnabledArray[ e.keyCode ] = true;

                switch ( e.keyCode ) {
                    case 38:
                    case 90: // z
                    case 37:
                    case 81: // q
                    case 39:
                    case 68: // d
                    case 40:
                    case 83: // s
                        if ( GE.evt.keyEnabledArray[ 38 ] &&
                            GE.evt.keyEnabledArray[ 38 ] &&
                            GE.evt.keyEnabledArray[ 90 ] &&
                            GE.evt.keyEnabledArray[ 37 ] &&
                            GE.evt.keyEnabledArray[ 81 ] &&
                            GE.evt.keyEnabledArray[ 39 ] &&
                            GE.evt.keyEnabledArray[ 68 ] &&
                            GE.evt.keyEnabledArray[ 40 ] &&
                            GE.evt.keyEnabledArray[ 83 ]
                        ) {
                            GE.keyMap.direction[ GE.mode ]( 's' );
                        }
                        break;
                }
            } );
        }

        if ( GE.config.enableMouse ) {

            this.mouse = true;

            this.mouseEvt();

            window.onmousedown = function ( e ) {
                e.preventDefault();
                if ( e.button === 0 ) { // clic gauche
                    GE.keyMap.clicG[ GE.mode ]( e );
                } else if ( e.button === 3 ) { // droit
                    GE.keyMap.clicD[ GE.mode ]( e );
                }
            };
        }

    },
    resizeEvt: function () { // resize evt listener

        window.addEventListener( 'resize', function ( e ) {
            GE.vw = GE.canvas.offsetWidth;
            GE.vh = GE.canvas.offsetHeight;
            GE.ctx.canvas.width = window.innerWidth;
            GE.ctx.canvas.height = window.innerHeight;
            if ( GE.config.enableMouse ) {
                GE.evt.mouseEvt();
            }
            $( '.parallax' ).each( function () { // obligé de positionner en px car % est bizarre sur les bg

                var offset = GE.res.image[ $( this ).attr( 'id' ) ].decalageY;

                var bgPos = ( ( GE.backgroundHeightPrcent * offset ) / 100 ) * GE.vh;

                $( this ).css( {
                    backgroundPositionY: bgPos + 'px'
                } );
            } );
        } );
    },
    mouseEvt: function () { // Coordonnées depuis le centre du canvas

        // gagne en perf
        if ( GE.config.mouseMode == 'relative' ) {

            window.addEventListener( 'mousemove', function ( e ) {
                var x = event.movementX;
                var y = event.movementY;
                // ne change qu'à partir d'un certain seuil
                if ( true || Math.abs( x ) > 5 || Math.abs( y ) > 5 ) {
                    GE.mouseDirection[ 0 ] += x;
                    GE.mouseDirection[ 1 ] += y;
                }
            } );

        } else if ( GE.config.mouseMode == 'vector' ) {
            var xM = Math.round( GE.canvas.offsetLeft + ( GE.canvas.offsetWidth / 2 ) );
            var yM = Math.round( GE.canvas.offsetTop + ( GE.canvas.offsetHeight / 2 ) );

            window.addEventListener( 'mousemove', function ( e ) {
                var x = e.clientX - xM;
                var y = e.clientY - yM;

                GE.mouseDirection = [ x, y ];
                GE.keyMap.curseur[ GE.mode ]( x, y ); // actions du curseur
            } );

        } else if ( GE.config.mouseMode == 'screen' ) {

            window.addEventListener( 'mousemove', function ( e ) {
                var x = e.clientX;
                var y = e.clientY;

                GE.mouseDirection = [ x, y ];
                GE.keyMap.curseur[ GE.mode ]( x, y ); // actions du curseur
            } );
        }
    },
    customKey: [ false, false, false, false ]
};




//-----------------------------
//  Navigation dans les menus
//-----------------------------

GE.nav = {
    init: function () {
        $( '#screen-' + GE.activeScreen + ' nav' ).children().first().addClass( 'active' );
    },
    suiv: function () {
        var $elm = $( '#screen-' + GE.activeScreen + ' nav .active' );
        if ( $elm.next().length ) {
            GE.playSound( 'select' );
            $elm.removeClass( 'active' ).next().addClass( 'active' );
        }
    },
    prec: function () {
        var $elm = $( '#screen-' + GE.activeScreen + ' nav .active' );
        if ( $elm.prev().length ) {
            GE.playSound( 'select' );
            $elm.removeClass( 'active' ).prev().addClass( 'active' );
        }
    }
};