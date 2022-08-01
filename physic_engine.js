//--------------------
//  MOTEUR PHYSIQUE
//--------------------

Object.assign( GE, {
    // NOTE: certains paramètres ont été reportés dans la config
    collidables: [], // DELETE array de tout les collidables à tester au tick en cours avec x en index voir #arrCollidable
    limitVisibleArea: {},
    limitAreaInit: function () { // 1 fois par frame met les ressources en cache
        // PHYSIQUE
        GE.config.limitPhysicsArea.xMin = GE.vx - GE.config.limitPhysicsArea.offsetLeft // offset défini dans GE.config !!
        GE.config.limitPhysicsArea.yMin = GE.vy - GE.config.limitPhysicsArea.offsetTop
        GE.config.limitPhysicsArea.xMax = GE.vxMax + GE.config.limitPhysicsArea.offsetLeft
        GE.config.limitPhysicsArea.yMax = GE.vyMax + GE.config.limitPhysicsArea.offsetTop
        // VISUELS
        GE.limitVisibleArea.xMin = GE.vx - GE.config.tailleCase
        GE.limitVisibleArea.yMin = GE.vy - GE.config.tailleCase
        GE.limitVisibleArea.xMax = GE.vxMax + GE.config.tailleCase
        GE.limitVisibleArea.yMax = GE.vyMax + GE.config.tailleCase
        // MOVE
        GE.config.limitPhysicsArea.xMinMove = GE.config.limitPhysicsArea.xMin + GE.config.limitPhysicsArea.marge / 2
        // !Attention si la gravité est inversé
        GE.config.limitPhysicsArea.yMinMove = GE.config.limitPhysicsArea.yMin
        GE.config.limitPhysicsArea.xMaxMove = GE.config.limitPhysicsArea.xMax - GE.config.limitPhysicsArea.marge / 2
        GE.config.limitPhysicsArea.yMaxMove = GE.config.limitPhysicsArea.yMax - GE.config.limitPhysicsArea.marge
    },
    limitPhysicsAreaFn( x, y, xMax, yMax ) { // retourne true si pas de limitations
        return xMax > this.config.limitPhysicsArea.xMin &&
            x < this.config.limitPhysicsArea.xMax &&
            yMax > this.config.limitPhysicsArea.yMin &&
            y < this.config.limitPhysicsArea.yMax
    },
    limitVisibleAreaFn( x, y, xMax, yMax ) { // retourne true si limitation
        return xMax > this.limitVisibleArea.xMin &&
            x < this.limitVisibleArea.xMax &&
            yMax > this.limitVisibleArea.yMin &&
            y < this.limitVisibleArea.yMax
    },
    // l'aire de calcul des mouvements doit être plus petite que celle des calculs physiques,
    // sinon dans certaines conditions, les personnages passent au travers des colliders
    limitMoveAreaFn( x, y, xMax, yMax ) { // retourne true si pas de limitations
        return xMax > this.config.limitPhysicsArea.xMinMove &&
            x < this.config.limitPhysicsArea.xMaxMove &&
            yMax > this.config.limitPhysicsArea.yMin &&
            y < this.config.limitPhysicsArea.yMaxMove
    },
} );

//-----------------------------------------
//          GESTION DU MOUVEMENT
//-----------------------------------------

GE.move = function ( o ) {

    o.lastX = o.x;
    o.lastY = o.y;

    if ( o.child ) {
        o.x = o.offsetX + o.parent.x;
        o.y = o.offsetY + o.parent.y;
    } else {

        // MOUVEMENT si en dessous de la vitMax on ajoute ( + prends en compte la config.friction du sol en x )
        o.inertie[ 0 ] += Math.abs( o.inertie[ 0 ] ) > o.vitesseMax ? 0 : o.move[ 0 ] * o.accel * GE.delta;
        o.inertie[ 1 ] += Math.abs( o.inertie[ 1 ] ) > o.vitesseMax ? 0 : o.move[ 1 ] * o.accel * GE.delta;

        // GRAVITE (ne tient pas compte de la vitMax)
        o.inertie[ 0 ] += GE.config.gravite[ 0 ] * o.influenceGravite * GE.delta;
        o.inertie[ 1 ] += GE.config.gravite[ 1 ] * o.influenceGravite * GE.delta;

        // FRICTIONS pr les x ajoute la config.friction du sol
        let frictionX = ( GE.config.friction + ( o.grounded && o.move[ 0 ] == 0 ? o.groundFriction : 0 ) ) * GE.delta;
        let frictionY = GE.config.friction * GE.delta;

        o.inertie[ 0 ] = Math.abs( o.inertie[ 0 ] ) < frictionX ? 0 : o.inertie[ 0 ] - ( Math.sign( o.inertie[ 0 ] ) * frictionX * o.frictionInfluence ); // magnétisme à 0
        o.inertie[ 1 ] = Math.abs( o.inertie[ 1 ] ) < frictionY ? 0 : o.inertie[ 1 ] - ( Math.sign( o.inertie[ 1 ] ) * frictionY * o.frictionInfluence );

        // IMPULSION pas de delta car tt se joue sur 1 frame
        o.inertie[ 0 ] += o.impulse[ 0 ]
        o.inertie[ 1 ] += o.impulse[ 1 ]
        o.impulse = [ 0, 0 ] // reset impulsion

        // gestion des parents
        if ( o.parent ) {

        }

        // calcul coord (ne pas mettre +=)
        o.x = Math.round( o.x + o.inertie[ 0 ] * GE.delta )
        o.y = Math.round( o.y + o.inertie[ 1 ] * GE.delta )
    }

    o.xMax = o.x + o.w;
    o.yMax = o.y + o.h;
    o.xCentre = o.x + o.w / 2;
    o.yCentre = o.y + o.h / 2;
    o.grounded = false;

};


//-------------------------------------
//  COLLISIONS fonction générale
//-------------------------------------

GE.physics = function () {

    // envoi les GameObjects au moteur physique (calcul de toutes les collisions pr la frame en cours)
    GE.testCollisions();

    // déclenchement des fonctions onCollide pr les collidés
    GE.onCollideFn.forEach( o => {
        o.colliders.forEach( o2 => {
            o2.onCollide( o )
        } );
    } );

    // nettoyage des collisions en cache (on met en cache par exemple pr les plateforme car sinon bloquage lorsqu'il redescend!)
    GE.cachedCollisions.forEach( ( arr, i ) => {

        let a = arr[ 0 ],
            b = arr[ 1 ]

        if ( !isset( a ) ) {
            GE.cachedCollisions.splice( i, 1 )
        } else if ( !a.colliders.includes( b ) ) {
            GE.cachedCollisions.splice( i, 1 )
            a.isIntoPlatform.splice( a.isIntoPlatform.indexOf( b ), 1 )
        }
    } );
};


//------------------------------------------------------------
// COLLISIONS DETECTION intelligente
//------------------------------------------------------------

/*  BROADPHASE
 Lors du calcul du mvt de l'objet on stocke l'id, x et xMax dans #arrCollidable
 Nous avons un tableau ordonné des positions en x de tout les collidables:

 i   valeur
 ------------------------------------
 x   [[id, xMax], [id2, xMax2]]
 ------------------------------------
 6   [[a, 9],     [b, 12]]
 8   [[c, 12],    [d, 18]]
 ...

 On calcule si les intervals se touchent et si oui on les stocke dans un array de collisions à tester
 On lance cette fonction qu'une seule fois par tick :)
 En code cela donne:
 */

GE.testCollisions = function () {

    var activeIds = []; // mémoire tampon
    var collisions = []; // collisions à tester

    GE.collidables.forEach( function ( objets, x ) { // objects == [o1, o2...] == tout les objets du x en cours

        objets.forEach( a => {

            for ( let i = activeIds.length - 1; i >= 0; i-- ) {

                let b = activeIds[ i ] //

                if ( b.xMax < x ) {
                    // si le xMax d'un activeId est plus petit que le x en cours on le vire (aucune colision possible)
                    activeIds.splice( i, 1 );
                } else {
                    // sinon on l'envoie en "narrow phase" test de collision. On teste en 1er les parents car ils influencent leurs enfants
                    a.child || b.child ? collisions.push( [ a, b ] ) : collisions.unshift( [ a, b ] )
                }

            }
            activeIds.push( a ); // l'ajoute pr qu il puisse être testé aussi avec ses frères de x
        } );
    } );

    // on teste tte les collisions dans l'ordre: d'abord les parents, puis les enfants
    collisions.forEach( e => {

        var a = e[ 0 ],
            b = e[ 1 ];

        if ( !( a.static && b.static ) && // si ce ne sont pas 2 statics
            // collision entre les groupes de collisions
            ( a.collideWith.includes( b.collisionGroup ) || b.collideWith.includes( a.collisionGroup ) ) &&
            // collision entre parents enfants (évite l'inceste)
            !( ( a.parent && b.parent && a.parent === b.parent ) || ( a.child && a.parent.id === b.id ) || ( b.child && b.parent.id === a.id ) ) &&
            // A partir de la, la collision est sure en X entre les 2 AABB
            // Donc on passe les 2 objets dans le résolveur de contraintes qui va vérifier et résoudre la contrainte
            // GE.solver retourne true en cas de collision
            GE.solver[ a.shape ][ b.shape ]( a, b )
        ) {
            // COllision détectée

            //--------------------------------------------------
            //                 Gestion des visions
            //--------------------------------------------------

            // (x = a) && (y = b) => notation raccourcie pr assigner les variables
            if ( ( a.classe === 'groundVision' && ( x = a ) && ( y = b ) ) || ( b.classe === 'groundVision' && ( x = b ) && ( y = a ) ) ) {
                // gestion du grounded
                if ( x.visionDirection === 'b' && y.collisionGroup == 0 && !y.player /*&& !(GE.cachedCollisions.includes(y.id + '+' + x.parent.id) || GE.cachedCollisions.includes(x.parent.id + '+' + y.id))*/ ) {

                    x.parent.grounded = true;
                    x.parent.groundFriction = y.friction; // sol glissant ?
                }

                x.parent.groundVision[ x.visionDirection ].push( y.id ); // push l'array des visions du parent de la vision

            } else if ( ( a.type === 'vision' && ( x = a, y = b ) ) || ( b.type === 'vision' && ( x = b, y = a ) ) ) {

                x.parent.see[ x.visionDirection ].push( y ); // push l'array des visions du parent de la vision
                x.parent.seeType[ x.visionDirection ].push( y.type );
                x.parent.seeClasses[ x.visionDirection ].push( y.classe );

            }

            //--------------------------------------------------
            //           Ajout à l'array des colliders
            //--------------------------------------------------

            b.colliders.push( a );
            b.collidersClasse.push( a.classe );
            b.collidersType.push( a.type );
            a.colliders.push( b );
            a.collidersClasse.push( b.classe );
            a.collidersType.push( b.type );

            // déclencheur des custom event listener pr onCollide();
            GE.onCollideFn[ a.id ] = a; // permet de remplacer
            GE.onCollideFn[ b.id ] = b;

        }
    } );
};



//--------------------------------
// Resolveur de contraintes
//--------------------------------

// appelé de la maniere:
// GE.solver[shapeA][shapeB](objectA, objectB)
// @TODO intégrer le script de Michael sur les collisions rond / rect
// Pr l instant seul les rect / rect fonctionnent

GE.solver = {
    rond: {
        rond: function ( a, b ) {

            // collision facile ! mais résolution de contrainte difficile

            var dist = a.radius + b.radius; // distance
            var hard = a.collisionHard && b.collisionHard;

            // INTERPOLATION

            var steps = GE.interpolationSteps;
            // nb == calcul à l'avance de la taille d'une step pr chaques x y de chaques points
            // ex: si 'a' s'est déplacé de 4 sur l'axe des X et que step vaut 4 alors nb vaudra 1
            var nb = [ ( a.x - a.lastX ) / steps, ( a.y - a.lastY ) / steps, ( b.x - b.lastX ) / steps, ( b.y - b.lastY ) / steps ];
            var aX, bX, aY, bY;

            for ( var i = 1; i <= steps; i++ ) {

                // déduit la position de x selon la step en cours ( i+i == division de step 2 puis 4 )
                aX = a.lastX + ( nb[ 0 ] * i );
                aY = a.lastY + ( nb[ 2 ] * i );
                bX = b.lastX + ( nb[ 1 ] * i );
                bY = b.lastY + ( nb[ 3 ] * i );

                if ( dist < GE.Vdist( [ aX, aY ], [ bX, bY ] ) ) {
                    if ( !hard ) {
                        return true; // si soft colision (pas besoin d'en savoir plus, pas de calc des points de contacts...etc.)
                    }

                    break;
                }
            }

            if ( i === steps ) {
                return false; // aucune collision detectée
            }

            // bouge au der endroit libre (dernière position sans collision (reviens à reculer d'une step))

            a.x = aX - nb[ 0 ] + a.rX;
            a.y = aY - nb[ 2 ] + a.rY;
            b.x = bX - nb[ 1 ] + b.rX;
            b.y = bY - nb[ 3 ] + b.rY;

            // TODO trouver le vecteur résultant (par rapport au point de contact !)
            // prendre en compte si l'un est static, la masse et le coef de rebond

            var rebond = ( a.rebond + b.rebond ) / 2;

            // multiplier vecteur résultant par coef d'absorbtion

            if ( GE.config.physiquePrecision === 3 ) {
                // calcul de réponse
                var tmp = steps - i;
                var distRestante = [ nb[ 0 ] * tmp, nb[ 1 ] * tmp, nb[ 2 ] * tmp, nb[ 3 ] * tmp ];

                // TODO bouger de la distance selon le nouveau vecteur d'inertie
            }

            return true;

        },
        rect: function ( a, b ) { // a rond || b rect

            //https://developer.mozilla.org/en-US/docs/Games/Techniques/3D_collision_detection
            // get box closest point to sphere center by clamping
            var x = Math.max( box.minX, Math.min( sphere.x, box.maxX ) );
            var y = Math.max( box.minY, Math.min( sphere.y, box.maxY ) );
            var z = Math.max( box.minZ, Math.min( sphere.z, box.maxZ ) );

            // this is the same as isPointInsideSphere
            var distance = Math.sqrt( ( x - sphere.x ) * ( x - sphere.x ) +
                ( y - sphere.y ) * ( y - sphere.y ) +
                ( z - sphere.z ) * ( z - sphere.z ) );

            return distance < sphere.radius;

        }
    },
    rect: {
        rond: function ( a, b ) {
            this.rond.rect( b, a );
        },
        rect: function ( a, b ) {


            if ( a.yMax >= b.y && b.yMax >= a.y && a.xMax >= b.x && b.xMax >= a.x ) { // on reteste en x pr les enfant dont les x-y on été modifs par leurs parents

                //if([a.id,b.id].includes(41) && [a.id,b.id].includes(26) ) debugger;
                // gestion du caching de collision pour les plateformes...// si il vient d'en bas !
                // on met en cache les collisions pr éviter que le player reste coincé si il redescend d'un saut
                if ( ( a.platform && b.player && b.lastY + b.h > a.y ) || ( b.platform && a.player && a.lastY + a.h > b.y ) ) {
                    let player = a.player ? a : b
                    let platform = a.platform ? a : b
                    player.isIntoPlatform.push( platform )
                    GE.cachedCollisions.push( [ player, platform ] );
                    return true;
                }

                // soft collision OU collision en cache
                if ( !( a.collisionHard && b.collisionHard ) || ( GE.config.playersSoftCollision && a.player && b.player ) || ( a.player && a.isIntoPlatform.includes( b ) ) || ( b.player && b.isIntoPlatform.includes( a ) ) || ( GE.config.bulletsSoftCollision && ( ( a.projectile && b.player ) || ( b.projectile && a.player ) ) ) /*GE.cachedCollisions.includes(a.id + '+' + b.id) || GE.cachedCollisions.includes(b.id + '+' + a.id)*/ ) {
                    return true; // soft collision pas besoin d'en savoir plus
                }

                // restitution des forces
                let rebond = Math.min( a.rebond, b.rebond )

                // taux de chevauchement dans chaque direction (économies de calculs + rendu)
                let yChevauchement = Math.max( 0, Math.min( a.xMax, b.xMax ) - Math.max( a.x, b.x ) )
                let xChevauchement = Math.max( 0, Math.min( a.yMax, b.yMax ) - Math.max( a.y, b.y ) )

                //--------------------------------------------------
                // Si un des 2 est static (divise les calculs par 2)
                //--------------------------------------------------

                if ( a.static || b.static ) {

                    aStat = a.static ? a : b
                    bDyn = a.static ? b : a

                    // INTERPOLATION pixel perfect
                    // basé sur le plus grands nombre de pixels parcourus
                    let pxParcouruX = Math.abs( bDyn.x - bDyn.lastX )
                    let pxParcouruY = Math.max( bDyn.y - bDyn.lastY )

                    // optimisation des calculs + optimisation du rendu
                    if ( xChevauchement > yChevauchement ) {
                        // permet de vérifier si les 2 angles sont touchés
                        if ( GE.solver.interpolation.xStatic( aStat, bDyn, pxParcouruX, rebond ) ) GE.solver.interpolation.yStatic( aStat, bDyn, pxParcouruY, rebond )
                    } else {
                        if ( GE.solver.interpolation.yStatic( aStat, bDyn, pxParcouruY, rebond ) ) GE.solver.interpolation.xStatic( aStat, bDyn, pxParcouruX, rebond )
                    }

                } else {

                    //--------------------------------------------------
                    //                 les 2 sont NON STATIQUES
                    //--------------------------------------------------

                    let pxParcouruX = Math.max( Math.abs( a.x - a.lastX ), Math.abs( b.x - b.lastX ) )
                    let pxParcouruY = Math.max( Math.abs( a.y - a.lastY ), Math.abs( b.y - b.lastY ) )

                    // optimisation des calculs + optimisation du rendu
                    if ( xChevauchement > yChevauchement ) {
                        // permet de vérifier si les 2 angles sont touchés
                        xChevauchement = true
                        yChevauchement = false
                        GE.solver.interpolation.x( a, b, pxParcouruX )
                    } else {
                        xChevauchement = false
                        yChevauchement = true
                        GE.solver.interpolation.y( a, b, pxParcouruY )
                    }

                    // influence de la masse
                    let ma = b.static ? 0 : ( 1 / a.masse ) // static = masse infinie
                    let mb = a.static ? 0 : ( 1 / a.masse )
                    // coefA + coefB est tjs = à 1
                    let coefA = ma / ( ma + mb )
                    let coefB = mb / ( ma + mb )

                    if ( xChevauchement ) { // un seul des 2 peut être possible comme c'est un rect

                        // on calcule la direction du rebond
                        let xReb = a.xCentre > b.xCentre ? 1 : -1;

                        // on prends la différence de vélocité entre les 2
                        let diffX = Math.abs( a.inertie[ 0 ] - b.inertie[ 0 ] ) // ex 1 - 2 = 1

                        // puis on ajoute à l'un et retire à l'autre la moitié de la diff afin d'équilibrer l'équation
                        a.inertie[ 0 ] += ( -diffX ) + ( xReb * diffX * coefA * rebond )
                        b.inertie[ 0 ] -= ( -diffX ) + ( xReb * diffX * coefB * rebond )
                    } else {

                        let yReb = a.yCentre > b.yCentre ? 1 : -1;

                        let diffY = Math.abs( a.inertie[ 1 ] - b.inertie[ 1 ] )

                        a.inertie[ 1 ] += ( -diffY ) + ( yReb * diffY * coefA * rebond )
                        b.inertie[ 1 ] -= ( -diffY ) + ( yReb * diffY * coefB * rebond )
                    }

                }


                // Calculs des xMax / xCentre...etc.
                a.updatePos()
                b.updatePos()

                a.childs.forEach( o => {
                    o.x = o.offsetX + o.parent.x
                    o.y = o.offsetY + o.parent.y;
                    o.updatePos()
                    // TODO: recursive child ?? risque de boucle infinie:
                    // ex: if(o.parent) o.childs.forEach...
                    // OU créer un fn o.updateChilds()
                } )
                b.childs.forEach( o => {
                    o.x = o.offsetX + o.parent.x
                    o.y = o.offsetY + o.parent.y;
                    o.updatePos()
                } )

                return true;
            }

            return false;
        }
    },
    interpolation: {
        // INTERPOLATION pixel perfect
        // basé sur le plus grands nombre de pixels parcourus
        // valable pour X ou Y
        xStatic( aStat, bDyn, pxParcouru, rebond, x = 'x', xMax = 'xMax', lastX = 'lastX', xCentre = 'xCentre', w = 'w', y = 'y', yMax = 'yMax', lastY = 'lastY', inertie = 0, m = 1 ) {

            //if(bDyn.id == 0 && aStat.id != 24) debugger

            var steps = Math.ceil( pxParcouru / GE.config.physiquePrecision )

            // longueur d'une step en px
            var L = ( bDyn[ x ] - bDyn[ lastX ] ) / steps

            for ( var i = 0; i < steps; i++ ) {
                bDyn[ x ] = Math.round( bDyn[ lastX ] + i * L )
                bDyn[ xMax ] = bDyn[ x ] + bDyn[ w ]
                // on test si il y a une collisions
                if ( aStat[ xMax ] >= bDyn[ x ] && bDyn[ xMax ] >= aStat[ x ] ) break // cassé ! 
            }

            if ( i == 0 ) {
                // ici on voit que la même la première step collide, donc on le met hors de collision "manuellement"
                bDyn[ x ] = aStat[ xCentre ] > bDyn[ xCentre ] ? aStat[ x ] - bDyn[ w ] - 1 : aStat[ xMax ] + 1
            } else {
                // sinon on récupère la dernière step qui ne collisionne pas
                bDyn[ x ] = Math.round( bDyn[ lastX ] + ( i - 1 ) * L )
                //bDyn[y] = Math.round(bDyn[lastY] + (i - 1) * ((bDyn[y] - bDyn[lastY]) / steps))
            }

            // on revoie la totalité de l'énergie * rebond sur l'axe de collision
            bDyn.inertie[ inertie ] *= rebond * -1

            // on teste si il y a tjs un chevaucheent sur l'autre axe
            let chevauchement = Math.max( 0, Math.min( aStat[ xMax ], bDyn[ xMax ] ) - Math.max( aStat[ x ], bDyn[ x ] ) ) > 3 //GE.config.physiquePrecision + 1;

            if ( chevauchement ) return true
            return false

        },
        // alias
        yStatic: ( aStat, bDyn, pxParcouruY, rebond ) => GE.solver.interpolation.xStatic( aStat, bDyn, pxParcouruY, rebond, 'y', 'yMax', 'lastY', 'yCentre', 'h', 'x', 'xMax', 'lastX', 1, -1 ),
        x( aStat, bDyn, pxParcouruX ) {

            let a = aStat,
                b = bDyn

            var steps = Math.ceil( pxParcouruX / GE.config.physiquePrecision )

            // longueur d'une step en px
            var axL = a.lastX - a.x
            var bxL = b.lastX - b.x

            for ( var i = 1; i <= steps; i++ ) {
                a.x = Math.round( a.lastX - i * bxL )
                a.xMax = a.x + a.w
                b.x = Math.round( b.lastX - i * bxL )
                b.xMax = b.x + b.w
                // retest des collisions de chaques steps
                if ( a.xMax >= a.x && b.xMax >= b.x ) break;
            }

            // remet la der frame avant impact
            a.x = Math.round( a.lastX - ( i - 1 ) * axL )
            a.xMax = a.x + a.w
            b.x = Math.round( b.lastX - ( i - 1 ) * bxL )
            b.xMax = b.x + b.w

        },
        y( a, b, pxParcouruY ) {
            var steps = Math.ceil( pxParcouruY / GE.config.physiquePrecision )

            var ayL = a.lastY - a.y
            var byL = b.lastY - b.y

            for ( var i = 1; i <= steps; i++ ) {
                a.y = Math.round( a.lastY - i * byL )
                a.yMax = a.y + a.h
                b.y = Math.round( b.lastY + i * byL )
                b.yMax = b.y + b.h
                if ( a.yMax >= b.y && b.yMax >= a.y ) break;
            }

            // remet la der frame avant impact
            a.y = Math.round( a.lastY - ( i - 1 ) * ayL )
            a.yMax = a.y + a.h
            b.y = Math.round( b.lastY - ( i - 1 ) * byL )
            b.yMax = b.y + b.h
        },
    }
};