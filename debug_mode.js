GE.debugger = {
    init() {

        var fps = new Stats();
        document.body.appendChild( fps.dom );
        GE.beforeTick.push( fps.begin );
        GE.afterTick.push( fps.end );
        GE.frameTimeMoy = 0;
        GE.moyenneFps = []


        $( 'body' ).append( "<canvas id='debugPanel' height='42px' width='290px' style='width:auto; height:auto;'></canvas>" );
        GE.debugPanelctx = document.getElementById( 'debugPanel' ).getContext( "2d" );
        GE.debugPanelctx.font = "10px PressStart2P";

        GE.beforeTick.push( function () {
            GE.t1 = Date.now();
        } );

        GE.afterTick.push( function () {

            GE.t2 = Date.now();

            GE.frameTimeMoy += GE.t2 - GE.t1;

            // moyenne
            if ( GE.config.debugOptions.nbElmMoyenneFps > GE.moyenneFps.length ) GE.moyenneFps.shift()
            // > 5 car qd l onglet est inactif on descend à ~3
            if ( GE.fpsReal > 5 ) GE.moyenneFps.push( GE.fpsReal )

            var refresh = GE.fpsReal > 60 ? 60 : 16;

            if ( GE.f % refresh === 0 ) {

                // 47 - ((16.7 / 47) * GE.frameTimeMoy)
                GE.frameTimeMoy = Math.round( ( GE.frameTimeMoy / refresh ) * 10 ) / 10;
                GE.debugPanelctx.clearRect( 0, 0, 500, 100 );

                var prcent = 42 - ( ( 42 / 16.7 ) * GE.frameTimeMoy );

                let moyenneFps = 0;
                GE.moyenneFps.forEach( e => moyenneFps += e )
                moyenneFps /= GE.moyenneFps.length

                // FILL
                GE.debugPanelctx.fillStyle = prcent < 10 ? '#ad2424' : prcent < 25 ? "#b5b915" : "#22a522";
                GE.debugPanelctx.fillRect( 0, 0, 20, 42 );

                // CACHE
                GE.debugPanelctx.fillStyle = prcent < 10 ? '#320909' : prcent < 25 ? '#322609' : '#093209';
                GE.debugPanelctx.fillRect( 0, 0, 20, prcent );

                GE.debugPanelctx.fillStyle = '#22a522';
                GE.debugPanelctx.fillText( "Debug mode " + GE.fps, 30, 18 );
                GE.debugPanelctx.fillText( GE.frameTimeMoy.toFixed( 1 ) + 'ms ' + Math.round( ( 100 / 16.66 ) * GE.frameTimeMoy ) + '% D:' + ( Math.round( GE.delta * 100 ) / 100 ).toFixed( 2 )
                    // moyenne fps
                    +
                    ' Moy:' + Math.round( moyenneFps ) + 'fps', 30, 34 );
                GE.frameTimeMoy = 0;
            }
        } );
    }
}









/**
 * @author mrdoob / http://mrdoob.com/
 * VERSION CUSTOM MODIFIEE PAR SebRomeo de la GEEK SCHOOL
 */

var Stats = function () {

    var container = document.createElement( 'div' );
    container.style.cssText = 'position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000';

    var beginTime = ( performance || Date ).now(),
        prevTime = beginTime,
        frames = 0;

    var fpsPanel = new Stats.Panel( 'fps', '#ee2222', '#320909' )
    container.appendChild( fpsPanel.dom );

    container.children[ 0 ].style.display = 'block'

    return {

        dom: container,
        begin: () => beginTime = ( performance || Date ).now(),
        end: function () {

            frames++;
            var time = ( performance || Date ).now();
            if ( time > prevTime + 1000 ) {
                fpsPanel.update( ( frames * 1000 ) / ( time - prevTime ), 100 );
                prevTime = time;
                frames = 0;
            }

            return time;
        },
        update: () => beginTime = this.end(),
        domElement: container,
    };
};

Stats.Panel = function ( name, fg, bg ) {

    var min = Infinity,
        max = 0,
        round = Math.round;
    var PR = round( window.devicePixelRatio || 1 );

    var WIDTH = 80 * PR,
        HEIGHT = 48 * PR,
        /*TEXT_X = 3 * PR, TEXT_Y = 2 * PR,*/
        GRAPH_X = 3 * PR,
        GRAPH_Y = 3 * PR,
        GRAPH_WIDTH = 74 * PR,
        GRAPH_HEIGHT = 42 * PR;

    var tailleBarre = 5;

    var canvas = document.createElement( 'canvas' );
    canvas.width = WIDTH;
    canvas.height = HEIGHT;
    canvas.style.cssText = 'width:80px;height:48px';

    var context = canvas.getContext( '2d' );
    /*context.font = 'bold ' + (9 * PR) + 'px Helvetica,Arial,sans-serif';
    context.textBaseline = 'top';*/

    context.fillStyle = '#000';
    context.fillRect( 0, 0, WIDTH, HEIGHT );

    context.fillStyle = fg;
    //context.fillText( name, TEXT_X, TEXT_Y );
    context.fillRect( GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT );

    context.fillStyle = bg;
    context.globalAlpha = 0.9;
    context.fillRect( GRAPH_X, GRAPH_Y, GRAPH_WIDTH, GRAPH_HEIGHT );

    return {

        dom: canvas,
        update: function ( value ) {

            min = Math.min( min, value );
            max = Math.max( max, value );

            GE.fpsReal = value;

            var color = value > 105 ? '#f80' : fg;

            value = Math.min( value, 105 );

            context.fillStyle = bg;
            context.globalAlpha = 1;
            context.fillRect( 0, 0, WIDTH, GRAPH_Y );
            context.fillStyle = fg;

            GE.fps = round( GE.fpsReal ) + '' + name + ' (' + round( min ) + '-' + round( max ) + ') ';

            // redessine le tableau un peu plus loin
            context.drawImage( canvas, GRAPH_X + tailleBarre, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT, GRAPH_X, GRAPH_Y, GRAPH_WIDTH - PR, GRAPH_HEIGHT );
            context.fillStyle = bg;
            // peint une barre rouge
            context.fillRect( GRAPH_X + GRAPH_WIDTH - PR - 2, GRAPH_Y, tailleBarre, GRAPH_HEIGHT );
            context.fillStyle = color;
            // puis cache
            context.fillRect( GRAPH_X + GRAPH_WIDTH - PR - 2, 43 - ( 0.383 * value ), tailleBarre, 2 ); // entre 20 et 43
        }
    };
};