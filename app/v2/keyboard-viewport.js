// Use the layout viewport when the iOS keyboard is dismissed. Safari can keep
// 100dvh at its keyboard-shrunken size briefly even after visualViewport recovers.
// Only shrink the workspace while an editable field *inside* it has focus.
export function keyboardWorkspaceHeight({layoutHeight,visualHeight,offsetTop=0,editing=false}){
 const layout=Number(layoutHeight);
 if(!Number.isFinite(layout)||layout<=0)return null;
 const visual=Number(visualHeight);
 const bottom=visual+Math.max(0,Number(offsetTop)||0);
 const keyboardVisible=editing&&Number.isFinite(visual)&&visual>0&&layout-bottom>120;
 return Math.round(keyboardVisible?bottom:layout);
}
