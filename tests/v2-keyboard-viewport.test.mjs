import test from 'node:test';
import assert from 'node:assert/strict';
import {keyboardWorkspaceHeight} from '../app/v2/keyboard-viewport.js';

test('Safari keyboard makes only an actively edited workspace shorter',()=>{
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:410,editing:true}),410);
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:400,offsetTop:24,editing:true}),424);
});
test('keyboard Done returns to the full layout height even if visualViewport is still stale',()=>{
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:410,editing:false}),700);
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:700,editing:true}),700);
});
test('ignore small mobile browser toolbar differences and bad viewport readings',()=>{
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:660,editing:true}),700);
 assert.equal(keyboardWorkspaceHeight({layoutHeight:700,visualHeight:NaN,editing:true}),700);
 assert.equal(keyboardWorkspaceHeight({layoutHeight:0,visualHeight:320,editing:false}),null);
});
