/**
 * Created by gjrwcs on 9/15/2016.
 */
const MDT = require('./mallet.dependency-tree').MDT;

'use strict';

require('angular').module('mallet').directive('mEasel', [
    MDT.Easel,
    MDT.Scheduler,
    MDT.State,
    easelDirective]);

function easelDirective(MEasel, Scheduler, MState){

    var canvas, ctx, scale = 1;

    return {
        restrict: 'E',
        scope: {
            context: '&'
        },
        replace: true,
        template: '<div class="easel"><canvas>Your browser does not support canvas</canvas></div>',
        link: function(scope, elem, attr){

            canvas = elem[0].querySelector('canvas');
            canvas.style.background = '#000';
            ctx = canvas.getContext(attr.context || '2d');

            window.addEventListener('resize', ()=>{
                MEasel.resizeCanvas(canvas, ctx);
                const baseCanvas =  MEasel.context.canvas;
                MEasel.createNewCanvas('quarterRender', baseCanvas.width / 2, baseCanvas.height / 2);
            });
            MEasel.resizeCanvas(canvas, ctx);
            MEasel.setActiveContext(ctx);

            //Create a context to hold pre-rendered data
            var baseCanvas = MEasel.context.canvas;
            MEasel.createNewCanvas('quarterRender', baseCanvas.width / 2, baseCanvas.height / 2);

            Scheduler.schedule(()=>{
                var lowResScale = 0.75;
                //Reduce canvas resolution is performance is bad
                if(Scheduler.FPS < 30 && scale === 1){
                    scale = lowResScale;
                    MEasel.resizeCanvas(canvas, ctx, scale);
                }
                else if(Scheduler.FPS > 40 && scale === lowResScale){
                    scale = 1;
                    MEasel.resizeCanvas(canvas, ctx, scale);
                }

                Scheduler.draw(()=>MEasel.clearCanvas(ctx), -1);
                Scheduler.draw(()=>MEasel.clearCanvas(MEasel.getContext('quarterRender')), -1);

                if(MState.is(MState.Debug)){
                    Scheduler.draw(() => {
                        ctx.fillStyle = '#fff';
                        ctx.fillText('FPS: ' + (~~Scheduler.FPS), 25, 25);
                    }, 1);
                }
            });
        }
    };
}