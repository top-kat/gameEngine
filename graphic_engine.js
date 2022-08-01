//--------------------------
//          DRAW
//--------------------------

Object.assign( GE, {
    drawables: [], // les drawables sont définit dans physique car .forEach + limitPhysicsArea
    animableFrame: false,
    draw() {

        //------------------------------------
        //  Performances
        //  Taux de rafraichissement des animations 12fps
        //  Taux de rafraichissement image 30fps https://paulbakaus.com/tutorials/immersion/10-reasons-for-60fps/
        //  Taux rafraichissement Physics 60fps
        //------------------------------------

        GE.ctx.clearRect( 0, 0, GE.vw, GE.vh ); // clear canvas

        // parallax
        GE.prlx.fn();

        GE.drawMap();

        // interpolation pour permettre une animation à un fps différent du FPS du jeu
        GE.animNextFrame -= GE.frameTime;
        if ( GE.animNextFrame <= 0 ) {
            GE.animableFrame = true
            GE.animNextFrame = GE.config.animFPSms;
        }

        GE.drawObj();

        GE.animableFrame = false

    },
    camera() {

        // suit le joueur
        if ( GE.config.cameraFollowHero ) {

            GE.vx = GE.objects[ 0 ].x + ( GE.objects[ 0 ].w / 2 ) - GE.vw / 2
            GE.vy = GE.objects[ 0 ].y + ( GE.objects[ 0 ].h / 2 ) - GE.vh / 2

            if ( GE.config.cameraClampToMapLimits == true || GE.config.cameraClampToMapLimits == 'x' ) {
                let mapXMin = GE.res.map[ GE.map.active ].x
                let mapXMax = GE.res.map[ GE.map.active ].x + GE.res.map[ GE.map.active ].wPx
                GE.vx = Math.min( mapXMax - GE.vw, Math.max( mapXMin, GE.vx ) )
            }

            if ( GE.config.cameraClampToMapLimits == true || GE.config.cameraClampToMapLimits == 'y' ) {
                let mapYMin = GE.res.map[ GE.map.active ].y
                let mapYMax = GE.res.map[ GE.map.active ].y + GE.res.map[ GE.map.active ].hPx
                GE.vy = Math.min( mapYMax - GE.vh, Math.max( mapYMin, GE.vy ) )
            }
        }

        // cache des coord max
        GE.vxMax = GE.vx + GE.vw;
        GE.vyMax = GE.vy + GE.vh;

        // TODO !! différents types de cam + Math.max(xLimit et xPerso - width / 2)
    },
    drawMap() {

        let firstMapActive = false

        for ( let id in GE.res.map ) {

            let map = GE.res.map[ id ]

            if ( map.visible && !( ( map.x + map.wPx ) < GE.vx || map.x > GE.vxMax || ( map.y + map.wPx ) < GE.vy || map.y > GE.vyMax ) ) {

                if ( !firstMapActive ) GE.map.active = id // premiere map visible devient active

                // les layers objects ont été remove()
                for ( let i = 0, l2 = map.layers.length; i < l2; i++ ) {

                    var l = map.layers[ i ];
                    var dta = l.data;

                    // elimination intelligente des tiles
                    // coordonnées en TILES !
                    var xMin = Math.max( 0, Math.floor( ( GE.vx - map.x ) / map.tW ) ); // camera par rapport à la map / tileWidth (48)
                    var xMax = Math.min( map.w - 1, Math.ceil( ( GE.vxMax - map.x ) / map.tW ) ); // vx + vw / tileWidth
                    var yMin = Math.max( 0, Math.floor( ( GE.vy - map.y ) / map.tH ) );
                    var yMax = Math.min( map.h - 1, Math.ceil( ( GE.vyMax - map.y ) / map.tH ) );

                    for ( var i2 = yMin; i2 <= yMax; i2++ ) {
                        for ( var i3 = xMin; i3 <= xMax; i3++ ) {

                            var tileId = dta[ i2 ][ i3 ]; // id de la tile à placer

                            if ( tileId ) { // si != 0 (car 0 == vide)

                                var arr = GE.map.getTileSet( tileId, id ); // [img, sx, sy, sLargeur, sHauteur] xy dans l'image du tileset (pr cropper)

                                var dx = ( i3 * map.tW ) - GE.vx; // coordonnées dans le canvas
                                var dy = ( i2 * map.tH ) - GE.vy; // caseX * taillePxTile) - viewportX

                                // ctx.drawImage(image, sx, sy, sLargeur, sHauteur, dx, dy, dLargeur, dHauteur);
                                GE.ctx.drawImage( arr[ 0 ], Math.round( arr[ 1 ] ), Math.round( arr[ 2 ] ), Math.round( arr[ 3 ] ), Math.round( arr[ 4 ] ), Math.round( dx ), Math.round( dy ), Math.round( arr[ 3 ] ), Math.round( arr[ 4 ] ) );

                            }
                        }
                    }
                }
            }
        }


    },
    drawObj() {

        GE.drawables.forEach( z => z.forEach( o => { // pr chanques plans (z-index) et chaques gameObjects

            // A savoir:
            // o.anim = marche_d (droite)
            // o.f = frame en cours
            // o.animation = marche
            // o.isAnimationOverride // permet de faire des animations "par dessus" l'anim actuelle. ex: le mec marche et se prends un degat

            // récup la définition de l'animation
            let anim = o.animable ? ( o.isAnimationOverride ? o.animations[ o.animOverride ][ o.fOverride ] : o.animations[ o.anim ][ o.f ] ) : 0;

            // var echelle = o.f == 'left' ? -1 : 1; // @TODO gestion de l'inversion miroir
            echelle = 1;
            // if( echelle === -1) ctx.scale(echelle, 1); // @PERF scale consomme bcp

            GE.ctx.drawImage(
                typeof o.spriteSheet[ 0 ] === 'string' ? GE.res.image[ o.spriteSheet[ 0 ] ] : o.spriteSheet[ 0 ], // image png
                ( anim * o.spriteSheet[ 3 ] ) + o.spriteSheet[ 1 ], // cropX
                o.spriteSheet[ 2 ], // cropY
                o.spriteSheet[ 3 ], // width source
                o.spriteSheet[ 4 ], // height source
                echelle * ( o.x + o.imageOffset[ 0 ] - GE.vx ), // position
                o.y + o.imageOffset[ 1 ] - GE.vy,
                echelle * o.spriteSheet[ 3 ], // width canvas
                o.spriteSheet[ 4 ] // height
            );

            //if( echelle === -1) ctx.scale(1, 1);

            if ( GE.animableFrame && o.animable ) {
                // GESTION de l'anim pr prochaine step

                // animation == saut, marche, degats...direction == g , d ... le nom d'une animation est composé du status_dir (Ex: marche_g)
                // si on change de status on réinitialise la frame en cours
                // o.animationPrec sert à stocker l'nim en cours et représente l'ancienne si on change animation
                // o.animprec
                if ( o.animation !== o.animationPrec ) {
                    o.f = 0;
                    o.animPrec = o.animationPrec; // stocke la précédente pr si jamais une anim est lancé avec un retour à l'anim prec
                    o.animationPrec = o.animation;
                    o.anim = o.animation + '_' + o.direction; // Ex: saut_g, marche_d...
                    if ( typeof o.animations[ o.anim ] === 'undefined' ) {
                        o.anim = o.animation; // permet d'utiliser à la fois status_direction et status en tant que o.anim
                        typeof o.animations[ o.anim ] === 'undefined' && console.error( 'Erreur: aucune animation existe avec le nom ' + o.anim + ' pour l\'objet id:' + o.id + ' type:' + o.type + ' classe:' + o.classe );
                    }
                    // gère le case exceptionnel ou la premiere frame est une instruction
                    if ( typeof o.animations[ o.anim ][ 0 ] === 'string' ) o.f = -1;
                }

                // Ici ce n'est que next qui est testé, une string NE DOIT JAMAIS passer dans o.f !

                // evite de garder un status jump
                if ( o.animation === 'saut' && o.grounded ) o.animation = 's';

                GE.spriteAnimCond( o );

            }
        } ) );

    },
    spriteAnim() {

        for ( let i = GE.drawables.length - 1; i >= 0; i-- ) {

            var o = GE.drawables[ i ];


        }
    },
    spriteAnimCond( o ) {

        // valeur de la frame suivante
        let next = o.isAnimationOverride ? o.animations[ o.animOverride ][ o.fOverride + 1 ] : o.animations[ o.anim ][ o.f + 1 ]
        // index dans l'array de frames
        let f = o.isAnimationOverride ? o.fOverride : o.f;

        if ( isset( next ) ) {

            if ( typeof next === 'number' ) {
                // si c'est un nb on peut passer à la frame suivante
                o.isAnimationOverride ? o.fOverride++ : o.f++;
            } else {
                // sinon c'est une action et elle est executée
                switch ( next ) {
                    case 'o': // passe en mode animationOverride (par ex si on se prends un degat, ou on attaque)
                        o.isAnimationOverride = true
                        // l'anim actuelle "monte" en override
                        o.animOverride = o.anim
                        o.animationOverride = o.animation
                        // et l'anim devient anim prec
                        o.anim = o.animPrec + '_' + o.direction;
                        o.animation = o.animPrec;
                        o.f = 0;
                        // relance
                        GE.spriteAnimCond( o, o.animations[ o.animOverride ][ f + 1 ] );
                        break;
                    case 'l': // loop
                        o.isAnimationOverride ? o.fOverride = 0 : o.f = 0;
                        break;
                    case 'w': // pause l'anim pdt un nb de millisecondes
                        // si wait
                        if ( o.waiting === false ) {
                            // initialisation
                            o.waiting = parseInt( o.animations[ o.anim ][ f + 2 ] );
                        } else if ( o.waiting <= 0 ) {
                            // si le timer est fini
                            f += 2;
                            o.waiting = false;
                            GE.spriteAnimCond( o, o.animations[ o.anim ][ f + 1 ] ); // permet de gérer si c'est une string ensuite
                        } else {
                            o.waiting -= GE.config.animFPS;
                        }
                        break;
                    case 'k': // kill l'objet
                        o.kill();
                        break;

                }
            }
        } else if ( o.isAnimationOverride ) { // si next n'est pas défini
            // passer en animNormale
            o.isAnimationOverride = false
            o.fOverride = 0
            o.f = 0
            // relance l'anim
            GE.spriteAnimCond( o, o.animations[ o.anim ][ o.f ] );
        } else {
            o.f = 0;
        }
    },
    drawCollidables( o ) {

        GE.drawablesColliders.forEach( o => {

            // dessine les contours des colliders et optionnellement des visions en mode DEBUG
            if ( GE.config.debugOptions.showColliders && !( o.type === 'vision' && !GE.config.debugOptions.showVisions ) ) {
                GE.ctx.globalAlpha = 0.7;
                GE.ctx.beginPath();
                GE.ctx.rect( o.x - GE.vx, o.y - GE.vy, o.w, o.h );
                GE.ctx.lineWidth = 2;
                GE.ctx.strokeStyle = o.grounded ? 'yellow' : o.colliders.length ? "red" : o.type == 'vision' ? "blue" : "green";
                GE.ctx.stroke();
                GE.ctx.globalAlpha = 1;
            }
            // infos sur les objets en texte
            if ( GE.config.debugOptions.showIds && o.h > 6 && o.w > 10 ) {
                GE.ctx.fillStyle = '#FFFFFF';
                GE.ctx.fillText( o.id, o.x - GE.vx, o.y - GE.vy + 10 );
            }
            if ( GE.config.debugOptions.showAnim && isset( o.anim ) && !( o.anim === 'def' ) ) {
                GE.ctx.fillStyle = '#FFFFFF';
                GE.ctx.fillText( o.anim, o.x - GE.vx, o.y - GE.vy + 20 );
            }
        } )
    },
    prlx: {
        init: function () {

            var l = GE.prlx.arr.length;
            GE.arrFn = [];
            var r = 1 / ( l + 2 ); // ratio de mvt

            for ( var i = l; i > 0; i-- ) {

                var elm = GE.prlx.arr[ i ];

                GE.arrFn.push( i2 => {
                    GE.prlx.arr[ i2 ].style.backgroundPositionX = -( GE.vx / ( l - i2 + 2 ) ) + 'px';
                } );
            }

            // initialise la fonction draw parallax
            GE.prlx.fn = () => {
                for ( var i = 0; i < l; i++ ) {
                    GE.arrFn[ i ]( i );
                }
            };
        },
        arr: [],
        fn: () => false
    }
} );