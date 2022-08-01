GE.map = {
    index: 0,
    active: false,
    create( id, json, url ) {

        if ( !isset( GE.res.map ) ) GE.res.map = {}

        var map = GE.res.map[ id ] = json;
        GE.res.tilesets[ id ] = [];

        // enleve la dernière partie de l url (ex level1.json)
        var tmp = url.split( '/' );
        tmp.pop();
        url = tmp.join( '/' ) + '/';

        var loaded2 = json.tilesets.length + 1;

        // charge les images des tilesets
        for ( let elm of map.tilesets ) {

            var img = new Image();
            img.src = url + elm.image;
            img.onload = () => loaded2--;

            var ts = {
                firstgid: elm.firstgid,
                img: img,
                // tileWidth & Height
                tW: elm.tilewidth,
                tH: elm.tileheight,
                name: elm.name,
                // w h en tile
                w: Math.floor( elm.imagewidth / elm.tilewidth ),
                h: Math.floor( elm.imageheight / elm.tileheight )
            };
            GE.res.tilesets[ id ].push( ts );

        }

        if ( GE.map.index == 0 ) GE.map.active = id

        // caching des variables (optionnel)
        map.x = map.y = 0 // coord par defaut
        map.w = map.width; // width totale en carreaux
        map.visible = GE.map.index == 0 ? true : false
        map.h = map.height;
        map.tW = map.tilewidth; // width d'un carreau (tileWidth)
        map.tH = map.tileheight;
        map.wPx = map.w * map.tW; // width totale en px
        map.hPx = map.h * map.tH;

        var toSplice = [];

        // création des objets depuis tiled
        for ( let l of map.layers ) {

            if ( l.type === "objectgroup" ) { // objectgroup == calque d'objets vs tilelayer

                var type = 'collider';
                l.name = l.name.toLowerCase();

                type = [ 'ennemi', 'ennemis', 'ennemy', 'enemy' ].includes( l.name ) ? 'ennemi' : l.name;

                l.objects.forEach( elm => this.objFromTiled( elm, type, id ) );

                toSplice.push( map.layers.indexOf( l ) ); // suppr array a partir de la référence


            } else { // calque de tiles

                if ( typeof l.data[ 0 ][ 0 ] == 'string' ) console.error( `ATTENTION ! La map "${id}" est compréssée en zLib. Veuillez désactiver l'option de compression zLib dans Tiled (Carte => map properties) et mettre en XML.` )

                // formaliser l'array pr éliminer plus facilement les cases qui ne sont pas dans le viewport
                // input : array de toutes les cases à la suite
                // output: 2 array des x et y. Ex: case[y][x]

                var d = l.data;
                var i4 = 0;
                var arr = [];

                for ( var i2 = 0; i2 < map.h; i2++ ) {

                    arr[ i2 ] = [];

                    for ( var i3 = 0; i3 < map.w; i3++ ) {

                        arr[ i2 ].push( d[ i4 ] );

                        i4++;
                    }
                }

                l.data = arr; // et la on gagne 100% perf !!!!!! voir #drawMap
            }

        }

        for ( var i = toSplice.length - 1; i >= 0; i-- ) {
            map.layers.splice( toSplice[ i ], 1 ); // nettoyage car passe dn boucle de rendu
        }

        loaded2--;

        var tmpInterval = setInterval( function () {
            if ( loaded2 === 0 ) {
                GE.resMgr.loading.splice( GE.resMgr.loading.indexOf( 'map' ), 1 )
                clearInterval( tmpInterval )
            }
        }, 100 )

        GE.map.index++
    },
    objFromTiled( opt, type, mapId ) { // objet direct de tiled


        // la classe peut être définie dans tiled avec .name || .class || .classe
        var classe = ( isset( opt.classe ) ? opt.classe : isset( opt.class ) ? opt.class : isset( opt.name ) ? opt.name : '' ).toLowerCase();

        if ( opt.type ) type = opt.type // enlève majuscules...
        type = type.toLowerCase();
        if ( classe == 'hero' ) type = 'hero'

        var platform = false;

        // String.includes() est plus sur car il permet d'accepter les fautes d'orthographes (c'est normal que ce soit écrit sans e: String.include())
        if ( type.includes( 'platform' ) || type.includes( 'plateform' ) || classe.includes( 'platform' ) || classe.includes( 'plateform' ) ) {
            type = "collider";
            platform = true;
        }

        let types = Object.keys( GE.obj.types );

        types.forEach( e => {
            if ( type.includes( e ) ) type = e;
            return false;
        } )

        //var animation = false;

        if ( classe.includes( 'animation' ) || type.includes( 'animation' ) ) {
            // pour les animations, le type est animation et la classe est animation_1_2 ou les chiffres sont nbFrames et vitesse
            type = 'visuel';
            var tmp = classe.split( '_' );
            //classe = '';
            opt.animable = true;
            opt.frameLength = tmp[ 1 ];
            isset( tmp[ 2 ] ) && ( opt.animRalenti = tmp[ 2 ] );
        }

        var shape = isset( opt.shape ) ? opt.shape : 'rect';

        var IA = isset( opt.IA ) ? opt.IA : false; // gestion de l'IA depuis Tiled

        delete opt.visible; // nettoyage

        if ( isset( opt.gid ) ) {
            opt.spriteSheet = this.getTileSet( opt.gid, mapId );
            opt.visible = true;
            // pb de tiled ac les positions des objets de type tile
            opt.y = opt.y - opt.height;
        }

        var w = opt.width,
            h = opt.height,
            x = opt.x,
            y = opt.y;

        // nettoyage avt de merger les 2 objets
        // (ce qui nous permettra d'éditer autant de propriétés d'objets qu'on veut directement dans Tiled)
        delete opt.rotation;
        delete opt.type; // ?!?! permettre de mettre le type dans tiled??
        delete opt.id;
        delete opt.IA;
        delete opt.gid;
        delete opt.name;
        delete opt.x;
        delete opt.y;
        delete opt.width;
        delete opt.height;

        var o = GE.create( {
            type: type,
            x: x - GE.vx,
            y: y - GE.vy,
            w: w,
            h: h,
            classe: classe,
            shape: shape,
            options: opt,
            classOverrideOption: true
        } );

        if ( !o.platform ) o.platform = platform

        if ( IA ) o.IA( IA )

    },
    getTileSet: function ( id, mapId ) { // retrouve quelle image et coord selon le l'id du tile
        // TODO @perf mettre en cache les gid lors de la création de l'array de map car getTileset est appelé dn rendu
        for ( var i = GE.res.tilesets[ mapId ].length - 1; i >= 0; i-- ) {
            if ( id >= GE.res.tilesets[ mapId ][ i ].firstgid ) break;
        }
        var img = GE.res.tilesets[ mapId ][ i ].img;

        var localId = id - GE.res.tilesets[ mapId ][ i ].firstgid;
        var x = Math.floor( localId % GE.res.tilesets[ mapId ][ i ].w );
        var y = Math.floor( localId / GE.res.tilesets[ mapId ][ i ].w );
        x = ( x * GE.res.tilesets[ mapId ][ i ].tW );
        y = ( y * GE.res.tilesets[ mapId ][ i ].tH );

        return [ img, x, y, GE.res.tilesets[ mapId ][ i ].tW, GE.res.tilesets[ mapId ][ i ].tH ];
    }
};