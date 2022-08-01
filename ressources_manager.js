//--------------------------
// GESTIONNAIRE DE RESSOURCES
//--------------------------

Object.assign( GE, {
    res: { // ressources du niveau en cours
        sound: {},
        image: {},
        sequence: {}
    },
    ressources: {

    }
} );

GE.resMgr = { // ressources manager (mettre directement une fonction !)

    init: function ( callBack ) {

        GE.map.index = 0

        GE.changeMode( 'lock' );
        $( '#preloader' ).show( 0 );

        var ressources = GE.level === 'game' ? $.extend( true, {}, GE.ressourcesDefault, GE.ressources.global ) : $.extend( true, {}, GE.ressources.global, GE.ressources[ GE.level ] );

        GE.prlx.arr = []; // reset

        GE.resMgr.loading = [];

        //-----------------
        //   load IMAGES
        //-----------------

        if ( !isset( ressources ) ) console.error( 'Aucun niveau défini avec le nom:' + GE.level + '. Vérifiez le niveau appelé dans la sequence (ressources.js) ou dans un onclick (dans ressources/screens/mon_screen.html)' );

        $.each( ressources.images, ( id, url ) => { // i==id, val=='url'
            GE.resMgr.loading.push( id )
            var args = [ 0 ];

            if ( url.constructor === Array ) { // si un array et non une string
                args = url;
                url = args.shift(); // je retire le 1er elm de args et le met dans id
            }

            if ( typeof GE.res.image[ id ] === 'undefined' ) { // si elle n'est pas déja chargée

                GE.res.image[ id ] = new Image();
                GE.res.image[ id ].src = url;
                GE.res.image[ id ].onerror = GE.res.image[ id ].onabort = () => console.error( "Impossible de charger l'image " + url );
                GE.res.image[ id ].onload = () => {

                    gestionParallax()

                    GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
                };
            } else {
                gestionParallax()
                GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
            }

            function gestionParallax() {
                if ( id === 'background' ) {

                    $( GE.container ).prepend( '<div id="game-background" class="ol"></div>' );

                    GE.backgroundHeightPrcent = 100 / ( args[ 0 ] || GE.res.image[ id ].height );

                    var bgSize = GE.backgroundHeightPrcent * GE.res.image[ id ].height; // taille en %

                    $( '#game-background' ).css( {
                        backgroundImage: 'url(' + url + ')',
                        backgroundSize: 'auto ' + bgSize + '%'
                    } );

                } else if ( id.includes( 'parallax' ) ) {

                    var nb = id.split( 'ax' )[ 1 ]; // recup l'id

                    GE.res.image[ id ].decalageY = args[ 0 ];

                    $( GE.container ).prepend( '<div id="parallax' + nb + '" class="ol parallax"></div>' );

                    var bgSize = GE.backgroundHeightPrcent * GE.res.image[ id ].height; // taille en %
                    var bgPos = ( ( GE.backgroundHeightPrcent * args[ 0 ] ) / 100 ) * GE.vh;

                    $( '#parallax' + nb ).css( {
                        backgroundImage: 'url(' + url + ')',
                        backgroundPositionY: bgPos + 'px',
                        backgroundSize: 'auto ' + bgSize + '%'
                    } );

                    // stocke l'élément et la largeur pr calculer dn draw avec GE.prlx.init()
                    GE.prlx.arr.push( document.getElementById( 'parallax' + nb ) );

                }
            }

        } );

        //-----------------
        //  load SOUNDS
        //-----------------

        $.each( ressources.sounds, ( id, url ) => {
            GE.resMgr.loading.push( id )

            if ( typeof GE.res.sound[ id ] === 'undefined' ) {

                GE.res.sound[ id ] = []; // array de clone + index de loop

                GE.res.sound[ id ][ 0 ] = new Audio( url );
                GE.res.sound[ id ][ 0 ].onerror = GE.res.sound[ id ].onabort = () => console.error( "Impossible de charger le son " + url );
                GE.res.sound[ id ][ 0 ].oncanplaythrough = () => {
                    GE.res.sound[ id ][ 1 ] = GE.res.sound[ id ][ 0 ].cloneNode( false ); // pr pouvoir looper sans couper le son
                    GE.res.sound[ id ][ 2 ] = GE.res.sound[ id ][ 0 ].cloneNode( false );
                    GE.res.sound[ id ][ 99 ] = 0;
                    GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
                };
            } else {
                GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
            }
        } );

        //-----------------
        //   load SCREENS
        //-----------------

        $.each( ressources.screens, ( id, url ) => {
            GE.resMgr.loading.push( id )

            // si un screen du meme nom existe on le suppr
            if ( $( '#screen-' + id ).length ) $( '#screen-' + id ).remove();

            GE.resMgr.loadTemplate( url, function ( text ) {
                $( '#screen-container' ).append( '<div id="screen-' + id + '" class="screen" style="display:none">' + text + '</div>' );
                GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
            } );
        } );

        //-----------------
        //   load HUD
        //-----------------

        if ( isset( ressources.hud ) ) GE.resMgr.loadTemplate( ressources.hud, function ( text ) {
            GE.resMgr.loading.push( 'hud' );
            if ( $( '#hud' ).length ) $( '#hud' ).remove();
            $( '#screen-container' ).append( '<div id="hud" style="display:none">' + text + '</div>' );
            GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( 'hud' ), 1 )
        } );

        //-----------------
        //    load MAP
        //-----------------

        $.each( ressources.map, ( id, url ) => {
            GE.resMgr.loading.push( id + '1', 'map' ) // la map prends bcp de ressources

            $.ajax( {
                dataType: "json",
                url: url,
                mimeType: "application/json", // /!\ evite une erreur xml mal formé en local
                success: function ( json ) {
                    GE.map.create( id, json, url );
                    GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id + '1' ), 1 )
                }
            } );
        } );

        //-----------------
        //  load SEQUENCES
        //-----------------
        GE.res.sequence = {}
        $.each( ressources.sequences, ( id, arr ) => {
            GE.resMgr.loading.push( id )
            GE.res.sequence[ id ] = arr
            GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( id ), 1 )
        } );

        this.initLoader( callBack );

    },
    initLoader( callBack ) {

        var nbRes = GE.resMgr.loading.length
        var hasChanged = 0
        var loadingTimeout = 0

        this.interval = setInterval( () => {

            // loading
            var prcent = Math.round( ( 1000 / nbRes ) * ( nbRes - GE.resMgr.loading.length ) ) / 10;
            $( '#barre-chargement > div' ).width( prcent + '%' );
            $( '#prcent-txt' ).text( prcent );

            // permet de mettre un timeout de chargement en cas de ressources non trouvées
            // en gros il ne doit pas se passer 3 secondes sans ressources chargées
            if ( hasChanged != GE.resMgr.loading.length ) {
                loadingTimeout = 0 // remet le compteur à zero
                hasChanged = GE.resMgr.loading.length
            }

            if ( loadingTimeout > 30 ) { // 3 sec
                console.error( 'Une de ces ressources est manquante ou inaccessible: ' + GE.resMgr.loading.join( ', ' ) + `\nSi il s'agit de la map, vérifiez que toutes les ressources appelées dans la map existent et sont au bon endroit (tileset, spriteSheets...)` )
            }
            loadingTimeout++

            if ( !GE.resMgr.loading.length ) {
                // loadé
                clearInterval( GE.resMgr.interval );
                // enlève la selection de texte et drag and drop des images natif
                $( document ).bind( 'selectstart dragstart', function ( e ) {
                    e.preventDefault();
                    return false;
                } );
                GE.resMgr.onLoad( callBack );
            }
        }, 100 );
    },
    preloader: null, // element
    loadTemplate: function ( url, callBack ) {
        $.ajax( {
            type: "GET",
            url: url,
            dataType: "text",
            contentType: false,
            mimeType: "text/plain",
            success: function ( text ) {
                if ( typeof callBack === 'function' ) {
                    callBack( text );
                }
            },
            error: function () {
                console.error( `Impossible de charger cette ressource:` + url + `. Vérifier que cette ressource existe.` )
            }
        } );
    },
    nbRes: 0,
    loading: 0, // nb de ressources à loader, if(0) -> en avant la musique
    onLoad: function ( callBack ) {

        // err quand on clamp la cam aux limites de la map et qu'il y a plusieurs maps PAS SUR
        // if(GE.config.cameraClampToMapLimits != false && Object.keys(GE.res.map) != 1 )

        if ( GE.level !== 'game' /*&& !GE.gameStarted*/ ) {
            GE.ready();
            if ( isset( GE.levelReady[ ( GE.level ) ] ) ) GE.levelReady[ ( GE.level ) ]();
            GE.gameStarted = true;
        }

        GE.prlx.arr.length && GE.prlx.init();

        callBack(); // callback défini dans GE.startLevel('mon niveau', maCallback)

        $( '#preloader' ).hide( 0 );
        // permet d'avoir une belle image si des messages ou un ecran apparaissent
        if ( Object.keys( GE.res.map ).length ) {
            setTimeout( () => {
                //GE.changeMode( 'game' );
                GE.physics()
                GE.camera()
                GE.draw()
                //GE.changeMode( 'menu' );
            }, 300 ) // pr etre sur que tt soit chargé
        }
        GE.onStartLevelFn.forEach( fn => isset( fn ) && fn() )

        if ( isset( GE.res.sequence.intro ) ) { // ne joue pas l intro en mode Debug
            // Quand on à loadé on lance sequence intro si existe sinon demarre le jeu
            GE.playSequence( GE.res.sequence.intro );
            console.log( 'ee', GE.res.sequence.intro );
        } else {
            // start game
            console.log( 'ee' );
            GE.changeMode( 'game' );
        }
    }
};