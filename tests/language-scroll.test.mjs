import test from 'node:test';
import assert from 'node:assert/strict';
import {captureLanguageScroll,restoreLanguageScroll} from '../app/lib/language-scroll.js';
function fixture(){
 const scroller={top:100,scrollTop:200,scrollHeight:1500,getBoundingClientRect(){return {top:this.top,bottom:this.top+400}},querySelectorAll(){return this.nodes},contains(node){return this.nodes.includes(node)}};
 const node=(contentTop,height)=>({contentTop,height,isConnected:true,getBoundingClientRect(){const top=scroller.top+this.contentTop-scroller.scrollTop;return {top,bottom:top+this.height,height:this.height}}});
 scroller.nodes=[node(0,1000),node(205,30),node(300,60)];
 return scroller;
}
test('reading anchor survives translated preceding history and a changed viewport top',()=>{
 const s=fixture(),snapshot=captureLanguageScroll(s,'guide');assert.equal(snapshot.anchor,s.nodes[1]);
 s.nodes[1].contentTop+=295;s.top+=20;restoreLanguageScroll(s,snapshot);
 assert.equal(s.nodes[1].getBoundingClientRect().top-s.top,5);
 const top=s.scrollTop;restoreLanguageScroll(s,snapshot);assert.equal(s.scrollTop,top,'second-frame correction must be idempotent');
});
test('chat language marker requests the bottom rather than preserving the old answer position',()=>{
 const s=fixture();restoreLanguageScroll(s,captureLanguageScroll(s,'chat'));assert.equal(s.scrollTop,s.scrollHeight);
});
test('detached anchors safely fall back to the previous scroll position',()=>{
 const s=fixture(),snapshot=captureLanguageScroll(s,'guide');snapshot.anchor.isConnected=false;s.scrollTop=900;
 restoreLanguageScroll(s,snapshot);assert.equal(s.scrollTop,200);
});
