//-----------------------------
//  Intélligences Artificielles
//-----------------------------

GE.IA = {};

GE.IAdef = {
    deGaD: { // marche de gauche à droite
        init: ( o ) => {
            o.animStatus = 'marche';
            o.animDir = 'd';
            // permet de voir ce qui se passe en à gauche / droite, coin Bas droite, coin Bas gauche
            GE.createVision( o, [ 'bg', 'bd', 'g', 'd' ], 2 ); // 2 est la portée de la vision en px
        },
        tick: ( o ) => {

            // bouge continuellement
            o.move[ 0 ] = Math.sign( o.move[ 0 ] ) ? 0.16 * Math.sign( o.move[ 0 ] ) : 0.16;

            // marche de gauche à droite:
            // si il y à un vide en bg ou bd dans sa direction || si il y à un mur en face de lui : on inverse la direction

            if ( ( o.move[ 0 ] < 0 && ( o.seeType.g.includes( 'collider' ) || ( o.classe !== 'volant' && !o.seeType.bg.includes( 'collider' ) ) ) ) ||
                // si les coins Bas n'incluent aucun collider,on est au bord d'une plateforme (et que ce n'est pas un volant)
                ( o.move[ 0 ] > 0 && ( o.seeType.d.includes( 'collider' ) || ( o.classe !== 'volant' && !o.seeType.bd.includes( 'collider' ) ) ) ) ) {

                o.move[ 0 ] *= -1;
                o.animDir = o.animDir === 'd' ? 'g' : 'd';
                o.anim = o.animStatus + '_' + o.animDir;
            }
        }
    }
};