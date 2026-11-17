// The fixed interpreter shell follows the visible viewport's origin and size.
// Unlike a normal-flow element, it must not shrink a second time when Safari pans.
export function interpreterViewport({layoutHeight,visualHeight,offsetTop=0,editing=false,scale=1}){
 const layout=Number(layoutHeight);
 if(!Number.isFinite(layout)||layout<=0)return null;
 const visual=Number(visualHeight);
 const valid=Number.isFinite(visual)&&visual>0;
 const zoomed=Number.isFinite(Number(scale))&&Math.abs(Number(scale)-1)>.03;
 const keyboard=editing&&valid&&!zoomed&&layout-visual>120;
 if(keyboard){
  const top=Math.min(Math.max(0,layout-visual),Math.max(0,Number(offsetTop)||0));
  return {height:Math.round(visual),top:Math.round(top),keyboard:true};
 }
 // Restore the layout viewport when focus leaves, even if WebKit's
 // visualViewport height still reflects the dismissed keyboard.
 return {height:Math.round(!zoomed&&valid&&layout-visual<=120?Math.min(layout,visual):layout),top:0,keyboard:false};
}
