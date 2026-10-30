// Browser-side helpers shared by /tour-test and V2. No API key is used here.
export async function requestTour(params, { signal } = {}) {
  const response = await fetch(`/api/tour-test?${new URLSearchParams(params)}`, { cache:'no-store', signal });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || '정보를 불러오지 못했습니다.');
  return result;
}
export function currentLocation() {
  return new Promise((resolve, reject) => {
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      const error = new Error('이 브라우저에서는 현재 위치를 확인할 수 없습니다.');error.code='UNSUPPORTED';reject(error);return;
    }
    navigator.geolocation.getCurrentPosition(resolve, failure => {
      const messages={
        1:'위치 권한이 차단되어 있습니다. 브라우저 또는 기기 설정에서 이 사이트의 위치 접근을 허용한 뒤 다시 조회해 주세요.',
        2:'현재 위치를 확인할 수 없습니다. 기기의 위치 서비스를 켜고 신호가 잡히는 곳에서 다시 시도해 주세요.',
        3:'위치 확인 시간이 초과됐습니다. 신호가 잡히는 곳에서 다시 조회해 주세요.',
      };
      const error=new Error(messages[failure.code]||'현재 위치 확인에 실패했습니다. 다시 조회해 주세요.');error.code=failure.code;reject(error);
    },{enableHighAccuracy:true,timeout:12000,maximumAge:0});
  });
}
