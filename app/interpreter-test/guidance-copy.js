import {copy,menuItems} from '../v2/copy';
export const guidanceWords={ko:{back:'통역으로 돌아가기',choose:'안내 전달',proxy:'대신 검색해서 전달',menu:'길찾기 메뉴 전달',result:'길찾기 결과',live:'실시간 열차 정보',send:'안내 보기'},en:{back:'Back to conversation',choose:'Share guidance',proxy:'Find a route for passenger',menu:'Send route menu',result:'Route result',live:'Live arrivals',send:'Open guidance'},ja:{back:'通訳に戻る',choose:'案内を送信',proxy:'代わりに経路検索',menu:'経路検索メニューを送信',result:'経路検索結果',live:'列車到着情報',send:'案内を見る'},zh:{back:'返回对话',choose:'发送指南',proxy:'代为查询路线',menu:'发送路线菜单',result:'路线结果',live:'实时列车信息',send:'查看指南'}};
export function menuLabel(id,lang){const i=menuItems.findIndex(x=>x.id===id);return id==='live'?guidanceWords[lang].live:copy[lang]?.menu[i]||id;}

export const guidanceUI={
 ko:{routeTitle:'길찾기',searchTitle:'목적지 길찾기',menuHint:'승객이 직접 검색',proxyHint:'검색한 경로를 승객에게 전달',sent:'안내 전달',received:'직원이 보낸 안내',viewRoute:'경로 확인하기',close:'닫기',cancel:'취소',sendNow:'승객에게 전달',sending:'전달 중…',confirm:'이 안내를 전달할까요?'},
 en:{routeTitle:'Route guidance',searchTitle:'Find a destination',menuHint:'Passenger searches on their device',proxyHint:'Send a completed route',sent:'Guidance sent',received:'From station staff',viewRoute:'View directions',close:'Close',cancel:'Cancel',sendNow:'Send to passenger',sending:'Sending…',confirm:'Send this guidance?'},
 ja:{routeTitle:'経路案内',searchTitle:'目的地への行き方',menuHint:'乗客が自分で検索',proxyHint:'検索した経路を乗客に送信',sent:'案内を送信',received:'駅員からの案内',viewRoute:'経路を見る',close:'閉じる',cancel:'キャンセル',sendNow:'乗客に送信',sending:'送信中…',confirm:'この案内を送信しますか？'},
 zh:{routeTitle:'路线指南',searchTitle:'查询目的地',menuHint:'乘客自行查询',proxyHint:'将查询好的路线发送给乘客',sent:'已发送指南',received:'工作人员发送的指南',viewRoute:'查看路线',close:'关闭',cancel:'取消',sendNow:'发送给乘客',sending:'发送中…',confirm:'发送此指南吗？'}
};
