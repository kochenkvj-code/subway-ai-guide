// Restore a visible section relative to the chat viewport, not an absolute
// scrollTop: translating earlier cards can change the height of the history.
const ANCHORS = [
  '.sag-row', '.sag-answer', 'h2', 'h3', 'h4', 'summary',
  '.sag-gate-notice', '.sag-gate-result-heading', '.sag-gate-steps li',
  '.sag-gate-code-grid button', '.sag-gate-result-actions',
  '.sag-fare-info-section', '.sag-fare-expand', '.sag-fare-actions',
  '.srg-result-label', '.srg-metrics', '.srg-ride-card', '.srg-transfer-card',
  '.srg-result-actions', '.srg-search-wrap', '.sag-purchase-card',
  '.np-place-title', '.np-card h3',
].join(',');
export function captureLanguageScroll(scroller, kind) {
  if (!scroller) return {kind};
  const viewport=scroller.getBoundingClientRect();
  const candidates=[...scroller.querySelectorAll(ANCHORS)].map(node=>({node,rect:node.getBoundingClientRect()}))
    .filter(({rect})=>rect.height>0 && rect.bottom>viewport.top+8 && rect.top<viewport.bottom);
  const crossing=candidates.filter(({rect})=>rect.top<=viewport.top+12 && rect.bottom>viewport.top+12);
  crossing.sort((a,b)=>a.rect.height-b.rect.height);
  candidates.sort((a,b)=>a.rect.top-b.rect.top || a.rect.height-b.rect.height);
  const anchor=crossing[0] || candidates[0];
  return {kind,anchor:anchor?.node,offset:anchor?anchor.rect.top-viewport.top:0,scrollTop:scroller.scrollTop};
}
export function restoreLanguageScroll(scroller, snapshot) {
  if(snapshot.kind==='chat') {
    scroller.scrollTop=scroller.scrollHeight;
  } else if(snapshot.anchor?.isConnected && scroller.contains(snapshot.anchor)) {
    const offset=snapshot.anchor.getBoundingClientRect().top-scroller.getBoundingClientRect().top;
    scroller.scrollTop+=offset-snapshot.offset;
  } else {
    scroller.scrollTop=snapshot.scrollTop || 0;
  }
}
