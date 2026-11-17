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

import {interpreterViewport} from '../app/interpreter-test/viewport.js';
test('interpreter owns the visible viewport, including the iOS keyboard pan',()=>{
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:405,offsetTop:0,editing:true}),{height:405,top:0,keyboard:true});
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:405,offsetTop:225,editing:true}),{height:405,top:225,keyboard:true});
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:405,offsetTop:999,editing:true}),{height:405,top:355,keyboard:true});
});
test('interpreter restores after Done with or without blur and handles browser toolbar changes',()=>{
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:405,offsetTop:225,editing:false}),{height:760,top:0,keyboard:false});
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:760,editing:true}),{height:760,top:0,keyboard:false});
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:720,editing:false}),{height:720,top:0,keyboard:false});
 assert.deepEqual(interpreterViewport({layoutHeight:760,visualHeight:NaN,editing:true}),{height:760,top:0,keyboard:false});
});
