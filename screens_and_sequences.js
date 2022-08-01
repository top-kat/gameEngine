//--------------------------
// SEQUENCES
//--------------------------


Object.assign( GE, {
    seqPlaying: false,
    playSequence( seq ) {

        GE.seqPlaying = true;

        this.changeMode( 'menu' );

        this.seqIndex = 0;
        this.actualSequence = seq;

        this.seqNext();

    },
    seqNext() {
        clearTimeout( GE.seqTo );
        GE.hideAllScreens()
        var elm = this.actualSequence[ GE.seqIndex ];
        this.seqIndex++;

        if ( isset( elm ) ) {
            if ( typeof elm === 'string' ) { // l'écriture en string possible qd il n y a pas d'arguments
                this[ elm ]();
            } else {
                console.log(elm);
                this[ elm.shift() ]( elm[ 0 ], elm[ 1 ], elm[ 2 ] );
            }
        }

        if ( GE.seqIndex + 1 >= GE.actualSequence.length ) {
            GE.seqEnd();
        }
    },
    seqEnd() {
        GE.seqPlaying = false;
    },
    showScreen( id, time ) {

        if ( GE.mode != "menu" ) GE.pause()

        if ( this.activeScreen ) {
            this.previousScreens.push( this.activeScreen );
        }

        this.activeScreen = id; //

        //var screen = this.screens[0];
        $( '#screen-' + id ).fadeIn( 0, () => {
            // if nav
            if ( $( '#screen-' + id + ' nav' ).length ) {
                GE.nav.init();
            }
        } );

        if ( typeof time !== 'undefined' ) {
            if ( time === 'a' ) {

                GE.evt.action.menu( GE.hideScreen() );
            } else if ( time ) {

                GE.seqTo = setTimeout( function () {
                    GE.hideScreen();
                    GE.seqNext();
                }, time );
            }
        }
    },
    hideScreen( clbk = () => {} ) {

        $( '#screen-' + GE.activeScreen ).fadeOut( 0, clbk );

        this.activeScreen = false;

        // permet la superpositions d'écrans
        if ( this.previousScreens.length ) {
            this.showScreen( this.previousScreens.pop() );
        }
    },
    hideAllScreens() {
        while ( this.activeScreen ) {
            GE.hideScreen();
        }
    },
    activeScreen: false, // faux quand aucun screen
    stopSound( id ) {
        GE.res.sound[ id ][ 0 ].pause();
        GE.res.sound[ id ][ 0 ].currentTime = 0;
        GE.res.sound[ id ][ 1 ].pause();
        GE.res.sound[ id ][ 1 ].currentTime = 0;
        GE.res.sound[ id ][ 2 ].pause();
        GE.res.sound[ id ][ 2 ].currentTime = 0;
    }, // TODO
    playSound( id, volume = 1 ) {
        // pr pouvoir looper avec les clones
        GE.res.sound[ id ][ GE.res.sound[ id ][ 99 ] ].currentTime = 0;
        GE.res.sound[ id ][ GE.res.sound[ id ][ 99 ] ].volume = volume;
        GE.res.sound[ id ][ GE.res.sound[ id ][ 99 ] ].play();
        GE.res.sound[ id ][ 99 ]++;
        if ( GE.res.sound[ id ][ 99 ] > 2 ) {
            GE.res.sound[ id ][ 99 ] = 0;
        }
        if ( GE.seqPlaying ) {
            GE.seqNext();
        }
    },
    seqTo: null, // timeout
    wait: ms => GE.seqTo = setTimeout( GE.seqNext, ms ),
    gameStart: () => {
        GE.seqEnd();
        GE.changeMode( 'game' );
    }, // alias
    previousScreens: [],
    // gestion des messages
    messageSuivant() {
        let mess = $( '#screen-' + GE.activeScreen + ' .message.active' );
        let messSuiv = $( '#screen-' + GE.activeScreen + ' .message.active' ).nextAll( '.message' )

        if ( messSuiv.length ) {
            mess.removeClass( 'active' )
            messSuiv.addClass( 'active' )
        } else {
            GE.seqNext();
        }
    },
    hud: {
        show: () => $( '#hud' ).show( 0 ),
        hide: () => $( '#hud' ).hide( 0 )
    }
} );