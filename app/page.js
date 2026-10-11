"use client";

import { useEffect, useRef, useState } from "react";

const GA_ID = process.env.NEXT_PUBLIC_GA_ID || "";

const STATION = {
  ko: "종로5가역",
  en: "Jongno 5-ga Station",
  ja: "鍾路5街駅",
  zh: "钟路5街站",
};

const TEXT = {
  ko: {
    title: "AI 안내",
    status: "AI 안내 운영중",
    bannerTitle: "종로5가역 AI 안내",
    bannerBody: "역 관련 일반 문의는 Google 검색을 바탕으로 안내합니다. 길찾기는 별도 Google 검색으로 연결됩니다.",
    quick: "빠른 안내",
    placeholder: "궁금한 것을 입력하세요",
    routePlaceholder: "목적지를 입력하세요 (예: 명동)",
    send: "전송",
    greeting: "안녕하세요. 종로5가역 AI 안내입니다. 무엇을 도와드릴까요?",
    routePrompt: "목적지를 입력해주세요. 예: 명동, 서울역, 강남",
    route: "길찾기",
    restroom: "화장실",
    ticket: "게이트 오류",
    fares: "승차권·교통카드",
    facilities: "시설안내",
    exchange: "환전소 안내",
    office: "역무실 위치",
    exit: "출구 안내",
    elevator: "엘리베이터",
    staff: "역무원 문의",
    loading: "AI가 답변을 생성하고 있습니다…",
    error: "검색 기반 답변을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.",
    sources: "출처",
    source: "출처",
    feedbackQuestion: "이 안내로 해결됐나요?",
    solved: "해결됨",
    notSolved: "해결 안 됨",
    feedbackThanks: "피드백 감사합니다.",
  },
  en: {
    title: "AI Guide",
    status: "AI Guide Online",
    bannerTitle: "Jongno 5-ga Station AI Guide",
    bannerBody: "General station questions use Google Search grounding. Route searches open separately in Google.",
    quick: "Quick guide",
    placeholder: "Type your question",
    routePlaceholder: "Enter destination (e.g. Myeong-dong)",
    send: "Send",
    greeting: "Hello. This is the Jongno 5-ga Station AI Guide. How can I help?",
    routePrompt: "Enter your destination. Example: Myeong-dong, Seoul Station, Gangnam",
    route: "Route",
    restroom: "Restroom",
    ticket: "Gate / Card Error",
    fares: "Tickets · Cards",
    facilities: "Facilities",
    exchange: "Currency Exchange",
    office: "Station Office",
    exit: "Exit guide",
    elevator: "Elevator",
    staff: "Ask staff",
    loading: "AI is generating an answer…",
    error: "I couldn't load a search-grounded answer. Please try again.",
    sources: "Sources",
    source: "Source",
    feedbackQuestion: "Did this solve it?",
    solved: "Solved",
    notSolved: "Not solved",
    feedbackThanks: "Thanks for your feedback.",
  },
  ja: {
    title: "AI案内",
    status: "AI案内 稼働中",
    bannerTitle: "鍾路5街駅 AI案内",
    bannerBody: "駅に関する一般的な質問はGoogle検索をもとに案内します。経路検索はGoogle検索を別に開きます。",
    quick: "クイック案内",
    placeholder: "質問を入力してください",
    routePlaceholder: "目的地を入力（例：明洞）",
    send: "送信",
    greeting: "こんにちは。鍾路5街駅AI案内です。何をお手伝いしましょうか？",
    routePrompt: "目的地を入力してください。例：明洞、ソウル駅、江南",
    route: "経路検索",
    restroom: "トイレ",
    ticket: "カードエラー",
    fares: "乗車券・交通カード",
    facilities: "駅の設備",
    exchange: "両替所",
    office: "駅務室の場所",
    exit: "出口案内",
    elevator: "エレベーター",
    staff: "駅員に相談",
    loading: "AIが回答を生成しています…",
    error: "検索に基づく回答を読み込めませんでした。もう一度お試しください。",
    sources: "出典",
    source: "出典",
    feedbackQuestion: "解決しましたか？",
    solved: "解決した",
    notSolved: "未解決",
    feedbackThanks: "ご協力ありがとうございます。",
  },
  zh: {
    title: "AI 指南",
    status: "AI 指南运行中",
    bannerTitle: "钟路5街站 AI 指南",
    bannerBody: "一般车站问题会参考 Google 搜索进行回答，路线查询会单独打开 Google 搜索。",
    quick: "快捷指南",
    placeholder: "请输入问题",
    routePlaceholder: "请输入目的地（例如：明洞）",
    send: "发送",
    greeting: "您好，这里是钟路5街站 AI 指南。请问需要什么帮助？",
    routePrompt: "请输入目的地。例如：明洞、首尔站、江南",
    route: "路线",
    restroom: "洗手间",
    ticket: "闸机/交通卡错误",
    fares: "车票·交通卡",
    facilities: "车站设施",
    exchange: "货币兑换",
    office: "站务室位置",
    exit: "出口指南",
    elevator: "电梯",
    staff: "咨询站务员",
    loading: "AI 正在生成回答…",
    error: "无法加载基于搜索的回答，请稍后重试。",
    sources: "来源",
    source: "来源",
    feedbackQuestion: "问题解决了吗？",
    solved: "已解决",
    notSolved: "未解决",
    feedbackThanks: "感谢您的反馈。",
  },
};

const LANGUAGE_BUTTONS = [
  ["ko", "한국어"],
  ["en", "English"],
  ["ja", "日本語"],
  ["zh", "中文"],
];

const GATE_MENU = {
  ko: {
    prompt: "**올바른 게이트(초록색 화살표)에 카드를 태그해 오류 코드를 확인한 뒤, 아래에서 선택해 주세요.**\n다시 태그해도 **추가요금은 발생하지 않습니다.**",
    options: [
      { id: "e01", label: "E-01 카드 중복" },
      { id: "e03", label: "E-03 하차 처리 누락" },
      { id: "e04", label: "E-04 승차 처리 누락" },
      { id: "e05", label: "E-05 이용시간 초과" },
      { id: "e06", label: "E-06 카드 사용 불가" },
      { id: "e14", label: "E-14 잔액 부족" },
      { id: "e33", label: "E-33 당역 재승차" },
      { id: "e44", label: "E-44 당역 재하차" },
      { id: "opposite", label: "↔ 반대편 승강장으로 이동", wide: true },
    ],
  },
  en: {
    prompt: "**Tap at a green-arrow gate and select the error code below.**\nRetapping **does not charge extra.**",
    options: [
      { id: "e01", label: "E-01 Multiple cards" },
      { id: "e03", label: "E-03 No exit record" },
      { id: "e04", label: "E-04 No entry record" },
      { id: "e05", label: "E-05 Time limit" },
      { id: "e06", label: "E-06 Card unavailable" },
      { id: "e14", label: "E-14 Low balance" },
      { id: "e33", label: "E-33 Already entered" },
      { id: "e44", label: "E-44 Already exited" },
      { id: "opposite", label: "↔ Opposite platform", wide: true },
    ],
  },
  ja: {
    prompt: "**緑の矢印の改札にタッチし、表示されたコードを選んでください。**\n再タッチしても**追加料金はかかりません。**",
    options: [
      { id: "e01", label: "E-01 カード重複" },
      { id: "e03", label: "E-03 出場記録なし" },
      { id: "e04", label: "E-04 入場記録なし" },
      { id: "e05", label: "E-05 時間超過" },
      { id: "e06", label: "E-06 カード利用不可" },
      { id: "e14", label: "E-14 残高不足" },
      { id: "e33", label: "E-33 入場済み" },
      { id: "e44", label: "E-44 出場済み" },
      { id: "opposite", label: "↔ 反対側ホーム", wide: true },
    ],
  },
  zh: {
    prompt: "**请在绿色箭头闸机刷卡，并选择显示的错误代码。**\n再次刷卡**不会额外扣费。**",
    options: [
      { id: "e01", label: "E-01 多卡识别" },
      { id: "e03", label: "E-03 无出站记录" },
      { id: "e04", label: "E-04 无进站记录" },
      { id: "e05", label: "E-05 超时" },
      { id: "e06", label: "E-06 卡片无法使用" },
      { id: "e14", label: "E-14 余额不足" },
      { id: "e33", label: "E-33 已进站" },
      { id: "e44", label: "E-44 已出站" },
      { id: "opposite", label: "↔ 对面站台", wide: true },
    ],
  },
};

const GATE_GUIDES = {
  e01: {
    ko: "지갑이나 휴대폰 케이스 안의 교통카드가 2장 이상 동시에 인식된 경우입니다.\n\n**사용할 카드 1장만 꺼내서 다시 태그해 주세요.**",
    en: "Two or more transit cards may have been detected at the same time.\n\n**Take out only the card you want to use and tap it again.**",
    ja: "財布やスマートフォンケース内の交通カードが2枚以上同時に読み取られた可能性があります。\n\n**使用するカード1枚だけを取り出して、もう一度タッチしてください。**",
    zh: "可能同时识别到了钱包或手机壳中的两张以上交通卡。\n\n**请只取出要使用的一张卡，再次刷卡。**",
  },
  e03: {
    ko: "**집표(하차) 처리가 되지 않은 카드입니다.**\n\n하차할 때 카드가 정상적으로 태그되지 않았거나 하차 기록이 남지 않은 경우 표시될 수 있습니다.\n\n**스피드(휠체어)게이트를 통과한 뒤 역무실로 방문하여 카드를 확인하고 정산해 주세요.**",
    en: "**This card does not have a recorded exit.**\n\nThis may appear if the card was not tapped correctly when exiting or the exit record was not saved.\n\n**Pass through the speed gate (wheelchair gate), then visit the station office to have the card checked and the fare adjusted.**",
    ja: "**出場（降車）処理が記録されていないカードです。**\n\n降車時にカードが正常にタッチされなかった、または出場記録が残っていない場合に表示されることがあります。\n\n**スピードゲート（車いす用ゲート）を通過した後、駅務室でカードの確認と精算をしてください。**",
    zh: "**此卡没有出站（下车）记录。**\n\n下车时未正确刷卡，或出站记录未保存时可能会显示此错误。\n\n**请先通过无障碍宽闸机（轮椅闸机），然后前往站务室检查交通卡并办理结算。**",
  },
  e04: {
    ko: "**개표(승차) 처리가 되지 않은 카드입니다.**\n\n승차할 때 카드가 정상적으로 태그되지 않았거나 승차 기록이 남지 않은 경우 표시될 수 있습니다.\n\n**스피드(휠체어)게이트를 통과한 뒤 역무실로 방문하여 카드를 확인하고 정산해 주세요.**",
    en: "**This card does not have a recorded entry.**\n\nThis may appear if the card was not tapped correctly when entering or the entry record was not saved.\n\n**Pass through the speed gate (wheelchair gate), then visit the station office to have the card checked and the fare adjusted.**",
    ja: "**入場（乗車）処理が記録されていないカードです。**\n\n乗車時にカードが正常にタッチされなかった、または入場記録が残っていない場合に表示されることがあります。\n\n**スピードゲート（車いす用ゲート）を通過した後、駅務室でカードの確認と精算をしてください。**",
    zh: "**此卡没有进站（乘车）记录。**\n\n乘车时未正确刷卡，或进站记录未保存时可能会显示此错误。\n\n**请先通过无障碍宽闸机（轮椅闸机），然后前往站务室检查交通卡并办理结算。**",
  },
  e05: {
    ko: "지하철 이용 가능 시간이 초과되어 **정산이 필요한 상태**입니다.\n\n**스피드게이트(휠체어 게이트)를 통과한 뒤 역무실로 방문하여 정산해 주세요.**",
    en: "The allowed subway travel time has been exceeded, so **fare adjustment is required**.\n\n**Pass through the speed gate (wheelchair gate), then visit the station office for fare adjustment.**",
    ja: "地下鉄の利用可能時間を超えているため、**精算が必要な状態**です。\n\n**スピードゲート（車いす用ゲート）を通過し、駅務室で精算してください。**",
    zh: "已超过地铁允许的乘车时间，**需要进行补票/结算**。\n\n**请通过无障碍宽闸机（轮椅闸机），然后前往站务室办理结算。**",
  },
  e06: {
    ko: "현재 카드가 정상적으로 사용할 수 없는 상태입니다.\n\n**다른 교통카드를 사용할 수 있다면 이용해 주세요. 계속 오류가 발생하면 역무실을 방문해 주세요.**",
    en: "The card is currently not available for normal use.\n\n**Use another transit card if possible. If the error continues, visit the station office.**",
    ja: "現在、このカードは正常に利用できない状態です。\n\n**別の交通カードがあれば使用してください。エラーが続く場合は駅務室へお越しください。**",
    zh: "当前这张卡无法正常使用。\n\n**如有其他交通卡，请改用其他卡。若仍持续出现错误，请前往站务室。**",
  },
  e14: {
    ko: "교통카드의 **잔액이 부족**합니다.\n\n**카드를 충전한 뒤 다시 태그해 주세요.**",
    en: "Your transit card has **insufficient balance**.\n\n**Add value to the card and tap it again.**",
    ja: "交通カードの**残高が不足**しています。\n\n**カードをチャージしてから、もう一度タッチしてください。**",
    zh: "交通卡**余额不足**。\n\n**请充值后再次刷卡。**",
  },
  e33: {
    ko: "**이미 개표(승차) 처리된 카드입니다.**\n\n같은 역에서 이미 승차 처리된 카드를 다시 태그하면 표시됩니다.\n\n**별도의 정산이나 처리는 필요하지 않습니다. 비프음이 나더라도 스피드게이트(휠체어 게이트)를 통해 통과해 주세요.**",
    en: "**This card has already been processed for entry.**\n\nThis message appears when a card that has already been processed for entry at the same station is tapped again.\n\n**No additional fare adjustment is needed. Even if you hear a beep, pass through the speed gate (wheelchair gate).**",
    ja: "**すでに入場（乗車）処理済みのカードです。**\n\n同じ駅で入場処理済みのカードを再度タッチすると表示されます。\n\n**追加の精算や処理は不要です。ビープ音が鳴っても、スピードゲート（車いす用ゲート）を通ってください。**",
    zh: "**此卡已经完成进站（乘车）处理。**\n\n在同一车站再次刷已经完成进站处理的卡时会显示此提示。\n\n**无需另外结算或处理。即使发出提示音，也请通过无障碍宽闸机（轮椅闸机）。**",
  },
  e44: {
    ko: "**이미 집표(하차) 처리된 카드입니다.**\n\n같은 역에서 이미 하차 처리된 카드를 다시 태그하면 표시됩니다.\n\n**별도의 정산이나 처리는 필요하지 않습니다. 비프음이 나더라도 스피드게이트(휠체어 게이트)를 통해 통과해 주세요.**",
    en: "**This card has already been processed for exit.**\n\nThis message appears when a card that has already been processed for exit at the same station is tapped again.\n\n**No additional fare adjustment is needed. Even if you hear a beep, pass through the speed gate (wheelchair gate).**",
    ja: "**すでに出場（降車）処理済みのカードです。**\n\n同じ駅で出場処理済みのカードを再度タッチすると表示されます。\n\n**追加の精算や処理は不要です。ビープ音が鳴っても、スピードゲート（車いす用ゲート）を通ってください。**",
    zh: "**此卡已经完成出站（下车）处理。**\n\n在同一车站再次刷已经完成出站处理的卡时会显示此提示。\n\n**无需另外结算或处理。即使发出提示音，也请通过无障碍宽闸机（轮椅闸机）。**",
  },
  opposite: {
    ko: "방향을 잘못 탔거나 목적지역을 지나쳐 **반대편 승강장으로 이동하려는 경우**입니다.\n\n**스피드게이트(휠체어 게이트)를 통해 반대편 승강장으로 이동해 주세요.**",
    en: "Use this option if you took the wrong direction or passed your destination and need to reach the **opposite platform**.\n\n**Use the speed gate (wheelchair gate) to move to the opposite platform.**",
    ja: "乗る方向を間違えた、または目的駅を通り過ぎて**反対側のホームへ移動したい場合**です。\n\n**スピードゲート（車いす用ゲート）を通って反対側のホームへ移動してください。**",
    zh: "如果您坐错方向，或坐过了目的站，需要前往**对面站台**，请选择此项。\n\n**请通过无障碍宽闸机（轮椅闸机）前往对面站台。**",
  },
};

// 구매/충전 하위 선택은 고정 안내로 동작합니다. 시설안내는 Gemini 검색 기반 응답을 사용합니다.
// 실제 역사 내 발매기 위치와 결제수단 확인 후 안내 문구를 갱신하세요.
const SUBMENU_TEXT = {
  ko: {
    labels: {
      buy: "구매·발급", topup: "충전", single: "1회용 승차권",
      tmoney: "티머니", climateShort: "기후동행카드 단기권",
      climatePass: "모두의카드(기후동행패스)", cash: "현금",
      domestic: "국내 발급 카드", foreign: "해외 발급 카드",
      restroom: "화장실", elevator: "엘리베이터", lockers: "물품보관함",
      facilityBack: "시설안내 다시 선택", buyBack: "다른 승차권 보기",
      fareBack: "다른 승차권·카드 선택", topupBack: "다른 교통카드 선택",
    },
    prompts: {
      facility: "**어떤 시설을 찾으시나요?**\n아래에서 선택해 주세요.",
      fare: "**안내받을 승차권·교통카드를 선택해 주세요.**\n상품명을 누르면 구매 장소·구매 결제수단과 충전 방법·충전 결제수단을 확인할 수 있습니다.",
      buy: "**어떤 승차권·교통카드를 찾으시나요?**",
      topup: "**어떤 교통카드를 충전하시나요?**\n카드 종류에 따라 가능한 결제수단이 다를 수 있습니다.",
      payment: "**어떤 방법으로 충전하시나요?**\n결제수단을 선택해 주세요.",
    },
    facilityPending: (name) => `**${name} 위치 안내**\n\n현재 정확한 시설 위치를 확인 중입니다. 확인된 안내를 등록하기 전까지는 역무실에 문의해 주세요.`,
    exchange: "**환전소 안내**\n\n종로5가역 **8번 출구 방향**으로 이동해 주세요. 환전소 운영 여부와 영업시간은 변동될 수 있으니 현장에서 확인해 주세요.",
    buyDescriptions: {
      single: "지하철 1회 이용",
      tmoney: "충전식 버스·지하철 교통카드",
      climateShort: "1·2·3·5·7일권 / 서울 대중교통 무제한 이용",
      climatePass: "선불 충전형 / 사용 실적에 따른 교통비 환급",
    },
    buyGuides: {
      single: "**1회용 승차권**\n\n지하철을 한 번 이용할 때 사용하는 승차권입니다. 발매기에서 목적지를 선택해 운임과 보증금 500원을 결제합니다. 이용 후 보증금 환급기에서 보증금을 돌려받을 수 있습니다.\n\n아래 기기별 안내에서 이용 가능한 결제수단을 확인해 주세요.",
      tmoney: "**티머니 교통카드**\n\n금액을 충전해 버스와 지하철에서 사용하는 충전식 교통카드입니다. 잔액이 부족하면 추가 충전해 계속 이용할 수 있습니다.\n\n구매와 충전은 이용 가능한 기기 및 결제수단이 다릅니다.",
      climateShort: "**기후동행카드 단기권**\n\n**1·2·3·5·7일권** 중 선택할 수 있으며, 유효기간 동안 **서울의 지정된 대중교통 구간에서 무제한 이용**할 수 있습니다. 일부 노선과 구간은 제외됩니다.\n\n상세 적용 노선과 제외 구간은 방문 전에 확인해 주세요.",
      climatePass: "**모두의카드(기후동행패스)**\n\n기존 기후동행카드 30일권을 대체하는 **교통비 환급 제도**입니다. **선불형은 금액을 충전해 이용**합니다. 실제 구매·충전 가능 기기는 아래 안내를 확인해 주세요.\n\n매월 대중교통 **이용 실적과 자격 조건에 따라 교통비를 환급**받을 수 있습니다. 환급 혜택을 받으려면 해당 카드 및 K-패스 관련 등록·자격 확인이 필요하며, **카드 구매나 충전만으로 환급이 자동 보장되지는 않습니다.**\n\n**후불형 신용·체크카드**도 있으나 역에서 구매하는 방식이 아니며 해당 카드사를 통해 별도 발급받습니다. 단기 방문객에게 환급을 보장하지 않습니다.",
    },
    topupGuide: (card, method) => `**충전 안내: ${card} / ${method}**\n\n선택하신 카드와 결제수단을 지원하는 발매기·충전기 및 위치를 확인 중입니다. **해당 조합으로 충전할 수 있다고 아직 확정된 것은 아닙니다.** 현장 직원에게 문의해 주세요.`,
  },
  en: {
    labels: {
      buy: "Buy / Issue", topup: "Top up", single: "Single-journey ticket",
      tmoney: "T-money", climateShort: "Climate Card short-term pass",
      climatePass: "Modu Card (Climate Pass)", cash: "Cash", domestic: "Korean-issued card",
      foreign: "Overseas-issued card", restroom: "Restroom", elevator: "Elevator",
      lockers: "Lockers", facilityBack: "Other facilities", buyBack: "Other tickets",
      fareBack: "Choose another ticket / card", topupBack: "Other card",
    },
    prompts: {
      facility: "**Which facility do you need?**",
      fare: "**Select a ticket or transit card.**\nTap a product for where to buy, how to top up, and accepted payment methods.",
      buy: "**Which ticket or transit card do you need?**",
      topup: "**Which card would you like to top up?**\nAvailable payment methods depend on the card.",
      payment: "**How would you like to pay for the top-up?**",
    },
    facilityPending: (name) => `**${name} location**\n\nWe are verifying the exact location. Please ask at the station office until the information is confirmed.`,
    exchange: "**Currency exchange**\n\nHead toward **Exit 8** at Jongno 5-ga Station. Business status and hours may change; please check on site.",
    buyDescriptions: {
      single: "One subway journey",
      tmoney: "Reloadable subway and bus card",
      climateShort: "1/2/3/5/7 days · Unlimited eligible Seoul transit",
      climatePass: "Prepaid top-up · Fare refunds based on eligible use",
    },
    buyGuides: {
      single: "**Single-journey ticket**\n\nFor one subway journey. Select your destination at a ticket machine and pay the fare plus a refundable KRW 500 deposit. After your trip, use a deposit-refund machine to claim it back.\n\nSee the machine-specific payment information below.",
      tmoney: "**T-money**\n\nA reloadable transit card for buses and subways. Add credit and continue using the card as needed.\n\nPurchase and top-up support different payment methods; see below.",
      climateShort: "**Climate Card short-term pass**\n\nChoose a **1-, 2-, 3-, 5-, or 7-day pass** for unlimited rides on **eligible public transit routes in Seoul** during its validity. Some routes and sections are excluded.\n\nCheck the latest eligible routes and exclusions before travel.",
      climatePass: "**Modu Card (Climate Pass)**\n\nA public transport **fare-refund program** replacing the former 30-day Climate Card product. The **prepaid version** is loaded with credit before use; see below for machine-specific availability.\n\nRefunds depend on monthly travel usage, registration and eligibility. **Buying or loading the card alone does not guarantee a refund.**\n\nA separate **postpaid credit/debit-card version** is available through participating card issuers, not for direct purchase at the station. Short-term visitors are not guaranteed refund eligibility.",
    },
    topupGuide: (card, method) => `**Top-up: ${card} / ${method}**\n\nWe are checking which machines accept this card and payment method. **This combination has not yet been confirmed as supported.** Please ask station staff.`,
  },
  ja: {
    labels: {
      buy: "購入・発行", topup: "チャージ", single: "1回用乗車券",
      tmoney: "T-money", climateShort: "気候同行カード短期券",
      climatePass: "モドゥカード(気候同行パス)", cash: "現金", domestic: "韓国発行カード",
      foreign: "海外発行カード", restroom: "トイレ", elevator: "エレベーター",
      lockers: "コインロッカー", facilityBack: "ほかの設備", buyBack: "ほかの乗車券",
      fareBack: "ほかの乗車券・カード", topupBack: "ほかのカード",
    },
    prompts: {
      facility: "**お探しの設備を選んでください。**",
      fare: "**乗車券・交通カードを選択してください。**\n商品名を押すと購入場所・決済方法とチャージ方法・決済方法をご案内します。",
      buy: "**乗車券・交通カードを選んでください。**",
      topup: "**チャージするカードを選んでください。**\n利用できる決済方法はカードによって異なります。",
      payment: "**チャージの支払い方法を選んでください。**",
    },
    facilityPending: (name) => `**${name}の場所**\n\n正確な位置を確認中です。案内が登録されるまでは駅務室でお尋ねください。`,
    exchange: "**両替所のご案内**\n\n鍾路5街駅の**8番出口方面**へお進みください。営業状況・営業時間は現地でご確認ください。",
    buyDescriptions: {
      single: "地下鉄を1回利用",
      tmoney: "チャージ式の地下鉄・バス用交通カード",
      climateShort: "1・2・3・5・7日券／ソウルの対象交通機関が乗り放題",
      climatePass: "前払いチャージ式／利用実績に応じて交通費還付",
    },
    buyGuides: {
      single: "**1回用乗車券**\n\n地下鉄を1回利用するための乗車券です。券売機で目的地を選び、運賃と保証金500ウォンを支払います。利用後、保証金払戻機で保証金を受け取れます。\n\n機器ごとの決済方法は下記をご確認ください。",
      tmoney: "**T-money**\n\n地下鉄やバスで使えるチャージ式の交通カードです。残高が少なくなったら追加チャージして利用できます。\n\n購入とチャージでは対応する決済方法が異なります。",
      climateShort: "**気候同行カード短期券**\n\n**1・2・3・5・7日券**から選べ、有効期間中は**ソウル市内の対象公共交通機関が乗り放題**です。一部の路線・区間は対象外です。\n\n最新の対象路線・区間をご確認ください。",
      climatePass: "**モドゥカード（気候同行パス）**\n\n従来の気候同行カード30日券に代わる**交通費還付制度**です。**前払い式は金額をチャージして利用**します。購入・チャージ可能な機器は下記をご確認ください。\n\n月ごとの利用実績と資格に応じて還付されます。カードの登録・資格確認が必要で、**購入・チャージだけでは還付は保証されません。**\n\n**後払い式のクレジット・デビットカード**もありますが、駅では購入できず、カード会社から別途発行します。短期旅行者には還付を保証できません。",
    },
    topupGuide: (card, method) => `**チャージ：${card}／${method}**\n\nこの組み合わせに対応する機器と設置場所を確認中です。**利用可能と確定したわけではありません。** 駅係員にお問い合わせください。`,
  },
  zh: {
    labels: {
      buy: "购买·办理", topup: "充值", single: "单程票",
      tmoney: "T-money", climateShort: "气候同行卡短期票",
      climatePass: "Modu卡（气候同行通行证）", cash: "现金", domestic: "韩国发行银行卡",
      foreign: "境外发行银行卡", restroom: "洗手间", elevator: "电梯",
      lockers: "寄存柜", facilityBack: "其他设施", buyBack: "其他车票",
      fareBack: "选择其他车票/交通卡", topupBack: "其他交通卡",
    },
    prompts: {
      facility: "**请选择要查找的设施。**",
      fare: "**请选择车票或交通卡。**\n点击名称查看购卡地点、购卡支付方式及充值方法和支付方式。",
      buy: "**请选择车票或交通卡。**",
      topup: "**您要充值哪种交通卡？**\n可用支付方式因卡种而异。",
      payment: "**请选择充值支付方式。**",
    },
    facilityPending: (name) => `**${name}位置**\n\n正在核实准确位置。确认前请向站务室咨询。`,
    exchange: "**货币兑换指引**\n\n请前往钟路5街站**8号出口方向**。营业状态和时间可能变动，请到现场确认。",
    buyDescriptions: {
      single: "乘坐地铁一次",
      tmoney: "可充值的地铁·公交交通卡",
      climateShort: "1·2·3·5·7日票／首尔适用公共交通不限次数",
      climatePass: "预付充值型／按符合条件的乘车记录返还车费",
    },
    buyGuides: {
      single: "**单程票**\n\n适用于一次地铁行程。在自动售票机选择目的地，支付车费及500韩元押金。乘车结束后可在押金退还机办理退款。\n\n请参考下方不同设备的支付方式。",
      tmoney: "**T-money**\n\n可充值的公交、地铁交通卡。余额不足时可继续充值使用。\n\n购买和充值支持的支付方式不同，详见下方。",
      climateShort: "**气候同行卡短期票**\n\n可选择**1、2、3、5或7日票**，有效期内可不限次数乘坐**首尔指定范围内的公共交通**。部分线路和区间不适用。\n\n请事先确认最新适用线路及不适用区间。",
      climatePass: "**Modu卡（气候同行通行证）**\n\n这是一项取代原气候同行卡30日票的**交通费返还制度**。**预付卡需要充值金额后使用**。具体可购买和充值的设备请参考下方。\n\n返还金额取决于每月乘车记录和资格条件。需完成办卡登记及资格确认，**仅购买或充值并不保证返还交通费。**\n\n也有通过发卡机构单独办理的**后付费信用卡、借记卡版本**，不能在车站直接购买。不保证短期游客符合返还条件。",
    },
    topupGuide: (card, method) => `**充值：${card} / ${method}**\n\n正在核实支持该卡种及支付方式的设备和位置。**目前尚未确认该组合可以充值。** 请咨询站务人员。`,
  },
};


// 결제 안내는 실제 기기와 업무를 동시에 확인해야 합니다.
// 키오스크가 해외카드를 받더라도, 티머니 충전은 현금 전용 등 상품별 제한이 있습니다.
// 출처: 역사 제공 '키오스크 결제수단별 서비스 구현 현황' 및 현장 설명 (2026-10).
const DEVICE_PAYMENT_NOTES = {
  ko: {
    location: "**기기 위치**\n구형 발매기와 신형 키오스크는 역사 내 별도로 설치되어 있습니다. 종로5가역의 정확한 설치 위치(출구 방향)는 확인 후 안내할 예정입니다.",
    single: "**① 구매·발매 장소**\n구형 발매기 또는 신형 키오스크\n**구매 결제수단**\n• 구형 발매기: **현금 · 국내 발급 카드**\n• 신형 키오스크: **현금 · 국내/해외 발급 카드 · 지원되는 간편결제**\n\n**② 충전 안내**\n1회용 승차권은 충전식 카드가 아닙니다. 이용 후 **보증금 환급기**에서 보증금 500원을 돌려받을 수 있습니다.",
    tmoney: "**① 카드 구매 장소**\n**신형 키오스크에서만 구매 가능** (구형 발매기에서는 카드 판매 불가)\n**구매 결제수단**\n**현금 · 국내 발급 카드 · 지원되는 간편결제**\n※ 해외 발급 카드로 티머니 카드 구매 불가\n\n**② 카드 충전 장소·방법**\n신형 키오스크에서 **티머니 충전**을 선택하고, 화면 안내에 따라 카드 인식 및 충전 금액을 선택하세요.\n**충전 결제수단**\n**현금만 가능** (국내/해외 카드·간편결제 불가)\n※ 구형 발매기의 티머니 충전 지원 여부는 추가 확인 필요",
    climateShort: "**① 실물 기후동행카드 구매 장소**\n**신형 키오스크에서만 구매 가능** (구형 발매기에서는 카드 판매 불가)\n**카드 구매 결제수단**\n**현금 · 국내/해외 발급 카드 · 지원되는 간편결제**\n\n**② 단기권 충전 장소·방법**\n신형 키오스크에서 **기후동행카드 단기권 충전**을 선택하고, **1·2·3·5·7일권** 중 이용권을 고른 후 화면 안내에 따라 결제하세요.\n**단기권 충전 결제수단**\n**현금 · 국내/해외 발급 카드 · 지원되는 간편결제**\n※ 해외 발급 카드 충전은 **단기권에 한정**. 구형 발매기의 단기권 충전 지원 여부는 확인 필요",
    climatePass: "**① 선불형 카드 구매 장소**\n구형 발매기는 **실물 교통카드를 판매하지 않습니다.** 모두의카드 선불형의 **신형 키오스크 판매 지원 여부는 확인 중**입니다.\n**구매 결제수단**\n키오스크의 모두의카드 선불형 지원 및 결제수단 **확인 필요**\n\n**② 선불형 충전 장소·방법**\n선불형은 금액을 충전해 사용합니다. 다만 모두의카드 선불형의 **키오스크 충전 지원 여부·절차·결제수단은 확인 중**입니다.\n**충전 결제수단**\n**확인 필요** — 다른 기후동행카드 상품의 결제수단을 그대로 적용하지 않습니다.\n\n※ 후불형은 카드사에서 별도로 발급받습니다. 환급은 카드 등록·자격 및 이용 실적에 따라 달라집니다.",
  },
  en: {
    location: "**Machine locations**\nOlder ticket machines and new kiosks are installed in the station. Exact exit-area locations at Jongno 5-ga Station will be added after verification.",
    single: "**① Where to buy**\nOlder ticket machine or new kiosk\n**Payment for purchase**\n• Older machine: **Cash · Korean-issued card**\n• New kiosk: **Cash · Korean/overseas-issued card · supported mobile payment**\n\n**② Top-up**\nSingle-journey tickets cannot be reloaded. After travel, reclaim the refundable **KRW 500 deposit** at a deposit-refund machine.",
    tmoney: "**① Where to buy the card**\n**New kiosk only** (older machines do not sell transit cards)\n**Payment for purchase**\n**Cash · Korean-issued card · supported mobile payment**\n※ Overseas-issued cards cannot be used to buy T-money at this kiosk.\n\n**② Where and how to top up**\nAt the new kiosk, choose **T-money top-up** and follow the on-screen instructions to present the card and choose an amount.\n**Payment for top-up**\n**Cash only** (no Korean/overseas cards or mobile payment).\n※ Older machine top-up support is not yet verified.",
    climateShort: "**① Where to buy a physical Climate Card**\n**New kiosk only** (older machines do not sell cards)\n**Payment for card purchase**\n**Cash · Korean/overseas-issued card · supported mobile payment**\n\n**② Where and how to load a short-term pass**\nAt the new kiosk, choose the **Climate Card short-term pass**, select **1/2/3/5/7 days**, and follow the on-screen payment steps.\n**Payment for short-term pass loading**\n**Cash · Korean/overseas-issued card · supported mobile payment**\n※ Overseas-issued card payments for loading are **limited to short-term passes**. Older-machine support is unverified.",
    climatePass: "**① Where to buy the prepaid card**\nOlder machines **do not sell physical transit cards**. Availability of prepaid Modu Card purchases at the **new kiosk is still being verified**.\n**Payment for purchase**\n**Not yet confirmed** for the prepaid Modu Card\n\n**② Where and how to top up**\nThe prepaid version is loaded with money before use. **Whether the kiosk supports loading, its steps and accepted payment methods are not yet confirmed**.\n**Payment for top-up**\n**Not yet confirmed** — do not apply other Climate Card rules to this product.\n\n※ Postpaid cards are issued separately by card companies. Fare refunds require registration, eligibility and qualifying travel.",
  },
  ja: {
    location: "**機器の設置場所**\n駅構内には従来型券売機と新型キオスクがあります。鍾路5街駅での詳しい出口方面・設置場所は確認後にご案内します。",
    single: "**① 発売場所**\n従来型券売機または新型キオスク\n**購入時の決済方法**\n• 従来型券売機：**現金・韓国発行カード**\n• 新型キオスク：**現金・韓国/海外発行カード・対応するモバイル決済**\n\n**② チャージ**\n1回用乗車券はチャージできません。利用後は保証金払戻機で**500ウォンの保証金**を返金できます。",
    tmoney: "**① カードの購入場所**\n**新型キオスクのみ**（従来型券売機ではカードを販売しません）\n**購入時の決済方法**\n**現金・韓国発行カード・対応するモバイル決済**\n※ 海外発行カードでのT-money購入不可\n\n**② チャージ場所・方法**\n新型キオスクで**T-moneyチャージ**を選び、画面の案内に従ってカードを読み取り、金額を選択してください。\n**チャージ時の決済方法**\n**現金のみ**（韓国/海外発行カード・モバイル決済不可）\n※ 従来型券売機のチャージ対応は確認中です。",
    climateShort: "**① 気候同行カード本体の購入場所**\n**新型キオスクのみ**（従来型券売機でのカード販売なし）\n**カード購入時の決済方法**\n**現金・韓国/海外発行カード・対応するモバイル決済**\n\n**② 短期券のチャージ場所・方法**\n新型キオスクで**気候同行カード短期券**を選び、**1・2・3・5・7日券**のいずれかを選択して画面に従ってお支払いください。\n**短期券チャージ時の決済方法**\n**現金・韓国/海外発行カード・対応するモバイル決済**\n※ 海外発行カードでのチャージは**短期券のみ**。従来型券売機での対応は確認中です。",
    climatePass: "**① 前払い式カードの購入場所**\n従来型券売機では実物交通カードを販売していません。前払い式モドゥカードを**新型キオスクで購入できるかは確認中**です。\n**購入時の決済方法**\n**確認中**（前払い式モドゥカード）\n\n**② チャージ場所・方法**\n前払い式は金額をチャージして利用します。ただし、**キオスクでの対応・操作方法・決済方法は確認中**です。\n**チャージ時の決済方法**\n**確認中** — 別の気候同行カード商品のルールを流用しません。\n\n※ 後払い式はカード会社から別途発行します。還付には登録・資格・利用実績が必要です。",
  },
  zh: {
    location: "**设备位置**\n车站内设有旧式售票机和新型自助终端。钟路5街站各设备对应的具体出口方向仍在核实中。",
    single: "**① 购买地点**\n旧式售票机或新型自助终端\n**购票支付方式**\n• 旧式售票机：**现金、韩国发行的银行卡**\n• 新型自助终端：**现金、韩国/境外发行的银行卡、支持的移动支付**\n\n**② 充值说明**\n单程票不可充值。乘车后可在押金退还机领取**500韩元押金**。",
    tmoney: "**① 购卡地点**\n**仅限新型自助终端**（旧式售票机不出售实体卡）\n**购卡支付方式**\n**现金、韩国发行的银行卡、支持的移动支付**\n※ 不支持使用境外银行卡购买T-money。\n\n**② 充值地点及方法**\n在新型自助终端选择**T-money充值**，根据屏幕提示感应交通卡并选择充值金额。\n**充值支付方式**\n**仅支持现金**（不支持韩国/境外银行卡及移动支付）\n※ 旧式售票机是否支持充值仍待核实。",
    climateShort: "**① 气候同行实体卡购买地点**\n**仅限新型自助终端**（旧式售票机不售卡）\n**购卡支付方式**\n**现金、韩国/境外发行的银行卡、支持的移动支付**\n\n**② 短期票充值地点及方法**\n在新型自助终端选择**气候同行卡短期票**，选择**1、2、3、5或7日票**，并按屏幕提示完成付款。\n**短期票充值支付方式**\n**现金、韩国/境外发行的银行卡、支持的移动支付**\n※ 境外银行卡仅支持**短期票充值**。旧式售票机的支持情况仍待核实。",
    climatePass: "**① 预付卡购买地点**\n旧式售票机**不销售实体交通卡**。新型自助终端能否购买**预付式Modu卡尚待核实**。\n**购卡支付方式**\n**待确认**（预付式Modu卡）\n\n**② 充值地点及方法**\n预付卡需先充值金额再使用，但**新型自助终端是否支持充值、操作方式和支付方式均待核实**。\n**充值支付方式**\n**待确认**，不直接套用其他气候同行卡的支付规则。\n\n※ 后付费卡由发卡机构另行发行。车费返还须符合注册、资格和乘车记录要求。",
  },
};

function productGuideWithDevicePayments(lang, product) {
  const locale = SUBMENU_TEXT[lang] ? lang : "ko";
  const ui = SUBMENU_TEXT[locale];
  const note = DEVICE_PAYMENT_NOTES[locale];
  return `${ui.buyGuides[product]}\n\n${note[product]}\n\n${note.location}`;
}

const FACILITY_TYPES = ["restroom", "elevator", "lockers"];
const FARE_TYPES = ["single", "tmoney", "climateShort", "climatePass"];

const FACILITY_QUESTIONS = {
  restroom: {
    ko: "종로5가역 화장실은 어느 층, 어느 개찰구 또는 출구 방향에 있나요? 검증된 정보를 바탕으로 승객이 따라갈 수 있는 경로를 간단히 안내해 주세요. 위치가 확인되지 않으면 추측하지 말고 역무실에 문의하라고 안내해 주세요.",
    en: "Where is the restroom at Jongno 5-ga Station? Give verified floor, gate or exit-direction information and clear walking directions. If the location cannot be confirmed, do not guess; suggest asking the station office.",
    ja: "鍾路5街駅のトイレはどこですか？確認できる階・改札・出口方面を使ってわかりやすく案内してください。場所が確認できなければ推測せず駅務室への問い合わせを案内してください。",
    zh: "钟路5街站的洗手间在哪里？请根据可核实的信息说明楼层、闸机或出口方向以及步行路线。如果无法确认，不要猜测，请建议咨询站务室。",
  },
  elevator: {
    ko: "종로5가역 엘리베이터 위치와 연결되는 층, 승강장 및 출구 동선을 안내해 주세요. 확인된 자료만 사용하고, 정보가 불확실하면 추측하지 말고 역무실에 문의하라고 안내해 주세요.",
    en: "Where are the elevators at Jongno 5-ga Station, and which levels, platforms and exits do they connect? Use confirmed information only; if uncertain, advise the station office rather than guessing.",
    ja: "鍾路5街駅のエレベーターの場所と、接続する階・ホーム・出口を案内してください。確実な情報だけを用い、不明な場合は推測せず駅務室への問い合わせを案内してください。",
    zh: "请介绍钟路5街站电梯的位置以及连接的楼层、站台和出口。只使用可确认的信息；如无法确认，请建议咨询站务室，不要猜测。",
  },
  lockers: {
    ko: "종로5가역에 물품보관함이 실제 설치되어 있는지 먼저 확인하고, 확인된다면 위치와 찾아가는 경로를 안내해 주세요. 설치 여부나 위치가 확인되지 않으면 단정하지 말고 역무실 문의를 권해 주세요.",
    en: "First verify whether luggage lockers are installed at Jongno 5-ga Station. If confirmed, give their location and directions. If installation or location is unverified, do not invent details; suggest asking the station office.",
    ja: "鍾路5街駅にコインロッカーが実際に設置されているか確認し、確認できれば場所と行き方を案内してください。不明な場合は断定せず、駅務室への問い合わせを案内してください。",
    zh: "请先确认钟路5街站是否设有行李寄存柜。如已确认，请说明位置及前往路线。如无法确认，请不要编造信息，建议咨询站务室。",
  },
};

const TOPUP_TYPES = ["tmoney", "climateShort", "climatePass"];
const PAYMENT_TYPES = ["cash", "domestic", "foreign"];

function makeSubmenu(lang, menuName, cardType = null) {
  const ui = SUBMENU_TEXT[lang] || SUBMENU_TEXT.ko;
  const option = (id, label, wide = false, description = null) => ({ id, label, wide, description });
  let options = [];
  if (menuName === "facility") {
    options = FACILITY_TYPES.map((id) => option(`facility_${id}`, ui.labels[id]));
  } else if (menuName === "fare" || menuName === "buy") {
    options = FARE_TYPES.map((id) => option(`buy_${id}`, ui.labels[id], false, ui.buyDescriptions[id]));
  }
  const normalizedMenu = menuName === "buy" ? "fare" : menuName;
  return { role: "assistant", text: ui.prompts[normalizedMenu], options, optionsKind: normalizedMenu === "fare" ? "purchaseTable" : "submenu", menuPhase: "selection" };
}

function normalizeDestination(value, lang) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;

  if (lang === "ko") return trimmed.endsWith("역") ? trimmed : `${trimmed}역`;
  if (lang === "en") return /station$/i.test(trimmed) ? trimmed : `${trimmed} Station`;
  if (lang === "ja") return trimmed.endsWith("駅") ? trimmed : `${trimmed}駅`;
  if (lang === "zh") return trimmed.endsWith("站") ? trimmed : `${trimmed}站`;
  return trimmed;
}


function quickQuestion(type, lang) {
  const q = {
    restroom: {
      ko: "화장실은 어디에 있나요?",
      en: "Where is the restroom?",
      ja: "トイレはどこですか？",
      zh: "洗手间在哪里？",
    },
    ticket: {
      ko: "종로5가역 개찰구에서 교통카드 또는 승차권 오류가 발생했을 때 어떻게 해야 하나요? 게이트에서 자주 발생하는 카드 오류와 승객이 취해야 할 조치를 간단히 안내해주세요.",
      en: "What should a passenger do if a transit card or ticket error occurs at the fare gate at Jongno 5-ga Station? Briefly explain common gate/card errors and the appropriate next steps.",
      ja: "鍾路5街駅の改札で交通カードや乗車券のエラーが出た場合、どうすればいいですか？よくあるカードエラーと乗客が取るべき対応を簡潔に案内してください。",
      zh: "在钟路5街站闸机处，如果交通卡或车票发生错误，乘客应该怎么办？请简要说明常见的闸机/交通卡错误和处理方法。",
    },
    exit: {
      ko: "출구 위치와 주요 출구 안내를 해주세요.",
      en: "Please explain the station exits and their locations.",
      ja: "出口の場所と主な出口を案内してください。",
      zh: "请介绍各出口的位置。",
    },
    elevator: {
      ko: "엘리베이터는 어디에 있나요?",
      en: "Where is the elevator?",
      ja: "エレベーターはどこですか？",
      zh: "电梯在哪里？",
    },
    staff: {
      ko: "역무실은 어디에 있고 역무원에게 어떻게 문의하나요?",
      en: "Where is the station office and how can I ask station staff for help?",
      ja: "駅務室はどこにあり、駅員にはどう相談できますか？",
      zh: "站务室在哪里，如何向站务员求助？",
    },
  };

  return q[type]?.[lang] || "";
}


function renderBoldMarkdown(text) {
  if (!text) return null;

  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={index}>{part.slice(2, -2)}</strong>;
    }

    return <span key={index}>{part}</span>;
  });
}

export default function Home() {
  const [lang, setLang] = useState("ko");
  const [mode, setMode] = useState(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState([
    { role: "assistant", text: TEXT.ko.greeting },
  ]);
  const [feedbackByIndex, setFeedbackByIndex] = useState({});
  const [gateEntry, setGateEntry] = useState(false);
  const gateEntryRef = useRef(false);
  const gateAutoOpenedRef = useRef(false);
  const chatRef = useRef(null);
  const [scrollIndicator, setScrollIndicator] = useState({
    visible: false,
    height: 100,
    top: 0,
  });

  const t = TEXT[lang];

  function updateScrollIndicator() {
    const el = chatRef.current;
    if (!el) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    const scrollable = scrollHeight > clientHeight + 2;

    if (!scrollable) {
      setScrollIndicator({
        visible: false,
        height: 100,
        top: 0,
      });
      return;
    }

    const height = Math.max(18, (clientHeight / scrollHeight) * 100);
    const maxScroll = scrollHeight - clientHeight;
    const maxTop = 100 - height;
    const top = maxScroll > 0 ? (scrollTop / maxScroll) * maxTop : 0;

    setScrollIndicator({
      visible: true,
      height,
      top,
    });
  }

  useEffect(() => {
    if (!GA_ID || typeof window === "undefined") return;

    window.dataLayer = window.dataLayer || [];
    window.gtag =
      window.gtag ||
      function gtag() {
        window.dataLayer.push(arguments);
      };

    window.gtag("js", new Date());
    window.gtag("config", GA_ID, {
      anonymize_ip: true,
    });

    if (!document.querySelector(`script[data-sag-ga="${GA_ID}"]`)) {
      const script = document.createElement("script");
      script.async = true;
      script.src = `https://www.googletagmanager.com/gtag/js?id=${GA_ID}`;
      script.dataset.sagGa = GA_ID;
      document.head.appendChild(script);
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined" || gateAutoOpenedRef.current) return;

    const params = new URLSearchParams(window.location.search);
    if (params.get("from") !== "gate") return;

    gateAutoOpenedRef.current = true;
    gateEntryRef.current = true;
    setGateEntry(true);
    setMode(null);
    setInput("");
    setFeedbackByIndex({});

    const gateMenu = GATE_MENU.ko;
    setMessages([
      {
        role: "assistant",
        text: gateMenu.prompt,
        options: gateMenu.options,
      },
    ]);

    if (GA_ID && typeof window.gtag === "function") {
      window.gtag("event", "gate_qr_open", {
        language: "ko",
        entry_source: "gate_qr",
      });
    }
  }, []);

  useEffect(() => {
    const el = chatRef.current;
    if (!el) return;

    requestAnimationFrame(() => {
      el.scrollTo({
        top: el.scrollHeight,
        behavior: "smooth",
      });

      requestAnimationFrame(() => {
        updateScrollIndicator();
      });
    });
  }, [messages, loading]);

  function changeLanguage(nextLang) {
    setLang(nextLang);
    setMode(null);
    setInput("");
    setLoading(false);
    setFeedbackByIndex({});

    if (gateEntryRef.current) {
      const gateMenu = GATE_MENU[nextLang] || GATE_MENU.ko;
      setMessages([
        {
          role: "assistant",
          text: gateMenu.prompt,
          options: gateMenu.options,
        },
      ]);
      return;
    }

    setMessages([{ role: "assistant", text: TEXT[nextLang].greeting }]);
  }

  async function askGoogle(question, visibleUserText = question, feedbackKey = "free_question") {
    setLoading(true);

    setMessages((prev) => [
      ...prev,
      { role: "user", text: visibleUserText },
      { role: "assistant", text: t.loading, pending: true },
    ]);

    try {
      const response = await fetch("/api/google-search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json; charset=utf-8",
        },
        body: JSON.stringify({
          question,
          lang,
        }),
      });

      const data = await response.json();

      if (!response.ok || !data.ok) {
        throw new Error(data?.error || "Search request failed");
      }

      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.findLastIndex((m) => m.pending);

        const message = {
          role: "assistant",
          text: data.answer,
          sources: data.sources || [],
          searchSuggestion: data.searchSuggestion || null,
          feedbackKey,
        };

        if (pendingIndex >= 0) {
          next[pendingIndex] = message;
        } else {
          next.push(message);
        }

        return next;
      });
    } catch (error) {
      setMessages((prev) => {
        const next = [...prev];
        const pendingIndex = next.findLastIndex((m) => m.pending);

        const message = {
          role: "assistant",
          text: t.error,
          error: true,
        };

        if (pendingIndex >= 0) {
          next[pendingIndex] = message;
        } else {
          next.push(message);
        }

        return next;
      });
    } finally {
      setLoading(false);
    }
  }

  function handleGateOption(option) {
    if (loading) return;

    const guide = GATE_GUIDES[option.id]?.[lang] || GATE_GUIDES[option.id]?.ko;

    setMessages((prev) => [
      ...prev,
      { role: "user", text: option.label },
      {
        role: "assistant",
        text: guide,
        feedbackKey: `gate_${option.id}`,
      },
    ]);
  }

  function handleFeedback(index, message, result) {
    if (feedbackByIndex[index]) return;

    setFeedbackByIndex((prev) => ({
      ...prev,
      [index]: result,
    }));

    if (GA_ID && typeof window !== "undefined" && typeof window.gtag === "function") {
      window.gtag(
        "event",
        result === "solved" ? "feedback_solved" : "feedback_not_solved",
        {
          answer_type: message.feedbackKey || "unknown",
          language: lang,
          entry_source: gateEntry ? "gate_qr" : "general",
        }
      );
    }
  }

  function showMenu(menuName, selectedText = null, cardType = null) {
    setMode(null);
    const menu = makeSubmenu(lang, menuName, cardType);
    setMessages((prev) => {
      const next = [...prev];
      // 중간 선택 단계는 같은 말풍선에서 교체해 채팅 기록이 길어지지 않게 합니다.
      if (next[next.length - 1]?.menuPhase === "selection") next.pop();
      else if (selectedText) next.push({ role: "user", text: selectedText });
      next.push(menu);
      return next;
    });
  }

  function handleSubmenuOption(option) {
    if (loading) return;
    const ui = SUBMENU_TEXT[lang] || SUBMENU_TEXT.ko;
    const id = option.id;
    if (id === "menu_fare" || id === "menu_facility" || id === "fare_buy") {
      const menuName = id === "menu_facility" ? "facility" : "fare";
      showMenu(menuName, option.label);
      return;
    }
    if (id.startsWith("facility_")) {
      const facilityType = id.slice("facility_".length);
      const question = FACILITY_QUESTIONS[facilityType]?.[lang];
      if (!question) return;
      // 위치·설치 여부는 검색 기반 Gemini 답변으로 안내하되, 불확실하면 추측하지 않도록 요청합니다.
      setMessages((prev) => prev[prev.length - 1]?.menuPhase === "selection" ? prev.slice(0, -1) : prev);
      askGoogle(question, ui.labels[facilityType], `facility_${facilityType}`);
      return;
    }
    if (id.startsWith("buy_")) {
      const product = id.slice("buy_".length);
      setMessages((prev) => [...prev.filter((m, i) => i !== prev.length - 1 || m.menuPhase !== "selection"),
        {
          role: "assistant", text: productGuideWithDevicePayments(lang, product),
          options: [{ id: "menu_fare", label: ui.labels.fareBack }],
          optionsKind: "submenu", feedbackKey: `buy_${product}`,
        },
      ]);
      return;
    }

  }

  function quickAction(type, label) {
    if (loading) return;

    if (type === "facility" || type === "fares") {
      showMenu(type === "facility" ? "facility" : "fare", label);
      return;
    }

    if (type === "exchange") {
      const ui = SUBMENU_TEXT[lang] || SUBMENU_TEXT.ko;
      setMode(null);
      setMessages((prev) => [...prev, { role: "user", text: label }, { role: "assistant", text: ui.exchange, feedbackKey: "exchange" }]);
      return;
    }

    if (type === "gate") {
      setMode(null);
      const gateMenu = GATE_MENU[lang] || GATE_MENU.ko;

      setMessages((prev) => [
        ...prev,
        { role: "user", text: label },
        {
          role: "assistant",
          text: gateMenu.prompt,
          options: gateMenu.options,
        },
      ]);
      return;
    }

    if (type === "route") {
      setMode("route");
      setMessages((prev) => [
        ...prev,
        { role: "user", text: label },
        { role: "assistant", text: t.routePrompt },
      ]);
      return;
    }

    setMode(null);
    const question = quickQuestion(type, lang);
    askGoogle(question, label, type);
  }

  async function submitMessage(event) {
    event.preventDefault();
    if (loading) return;

    const raw = input.trim();
    if (!raw) return;

    setInput("");

    if (mode === "route") {
      const destination = normalizeDestination(raw, lang);

      const routeQuestions = {
        ko: `${STATION.ko}에서 ${destination}까지 지하철만 이용하는 경로를 알려주세요. 가능한 한 간단하고 빠른 경로를 우선하고, 탑승 호선, 환승역, 환승 후 호선과 방향, 예상 소요시간을 간단히 알려주세요. 버스는 제외해주세요.`,
        en: `How do I get from ${STATION.en} to ${destination} using subway only? Prefer a simple and fast route, and briefly include the line to board, transfer station, next line and direction, and estimated travel time. Do not include buses.`,
        ja: `${STATION.ja}から${destination}まで地下鉄だけで行く経路を案内してください。できるだけ簡単で速い経路を優先し、乗車路線、乗換駅、乗換後の路線と方面、所要時間の目安を簡潔に示してください。バスは除外してください。`,
        zh: `请告诉我从${STATION.zh}到${destination}只乘地铁的路线。优先选择简单且较快的路线，并简要说明乘坐线路、换乘站、换乘后的线路和方向以及预计所需时间。不要包含公交车。`,
      };

      setMode(null);
      await askGoogle(routeQuestions[lang] || routeQuestions.ko, raw, "route");
      return;
    }

    await askGoogle(raw, raw, "free_question");
  }

  const actions = [
    ["route", "🚇", t.route],
    ["gate", "🚪", t.ticket],
    ["fares", "🎫", t.fares],
    ["facility", "♿", t.facilities],
    ["exchange", "💱", t.exchange],
    ["staff", "📍", t.office],
  ];

  return (
    <main className="sag-page">
      <section className="sag-phone">
        <header className="sag-header">
          <div>
            <div className="sag-kicker">SUBWAY AI GUIDE</div>
            <h1>{STATION[lang]} {t.title}</h1>
          </div>
          <div className="sag-status">
            <span className={loading ? "loading" : ""} />
            {t.status}
          </div>
        </header>

        <div className="sag-languages">
          {LANGUAGE_BUTTONS.map(([code, label]) => (
            <button
              key={code}
              className={lang === code ? "active" : ""}
              onClick={() => changeLanguage(code)}
              disabled={loading}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="sag-section-title">{t.quick}</div>

        <div className="sag-actions">
          {actions.map(([type, icon, label]) => (
            <button
              key={type}
              onClick={() => quickAction(type, label)}
              disabled={loading}
            >
              <span className="sag-action-icon">{icon}</span>
              <span>{label}</span>
            </button>
          ))}
        </div>

        <div className="sag-chat-shell">
          <div
            className="sag-chat"
            ref={chatRef}
            onScroll={updateScrollIndicator}
          >
          {messages.map((message, index) => (
            <div key={index} className={`sag-row ${message.role}`}>
              <div className={`sag-bubble ${message.role} ${message.pending ? "pending" : ""} ${message.options ? "has-options" : ""}`}>
                <div className="sag-answer">{renderBoldMarkdown(message.text)}</div>

                {message.options?.length > 0 && (
                  message.optionsKind === "purchaseTable" ? (
                    <div className="sag-purchase-wrap">
                      <div className="sag-purchase-grid" role="table" aria-label={t.fares}>
                        {message.options.filter((option) => option.description).map((option) => (
                          <div className="sag-purchase-row" role="row" key={option.id}>
                            <button
                              type="button"
                              role="cell"
                              className="sag-purchase-select"
                              onClick={() => handleSubmenuOption(option)}
                              disabled={loading}
                              aria-label={option.label}
                            >
                              <span>{option.label}</span>
                              <span className="sag-purchase-chevron" aria-hidden="true">›</span>
                            </button>
                            <div className="sag-purchase-description" role="cell">{option.description}</div>
                          </div>
                        ))}
                      </div>
                      <div className="sag-purchase-back">
                        {message.options.filter((option) => !option.description).map((option) => (
                          <button key={option.id} type="button" onClick={() => handleSubmenuOption(option)} disabled={loading}>
                            ← {option.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={message.optionsKind === "submenu" ? "sag-submenu-options" : "sag-gate-options"}>
                      {message.options.map((option) => (
                        <button
                          key={option.id}
                          type="button"
                          className={option.wide ? "wide" : ""}
                          onClick={() => message.optionsKind === "submenu" ? handleSubmenuOption(option) : handleGateOption(option)}
                          disabled={loading}
                        >
                          {option.label}
                        </button>
                      ))}
                    </div>
                  )
                )}

                {message.url && (
                  <>
                    <a
                      className="sag-google-button"
                      href={message.url}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      🔎 {message.linkLabel}
                    </a>
                    <div className="sag-query">{message.query}</div>
                  </>
                )}

                {message.searchSuggestion && (
                  <div
                    className="sag-search-suggestion"
                    dangerouslySetInnerHTML={{ __html: message.searchSuggestion }}
                  />
                )}

                {GA_ID && message.feedbackKey && !message.pending && !message.error && (
                  <div className="sag-feedback">
                    {feedbackByIndex[index] ? (
                      <span className="sag-feedback-thanks">{t.feedbackThanks}</span>
                    ) : (
                      <>
                        <span className="sag-feedback-question">{t.feedbackQuestion}</span>
                        <div className="sag-feedback-buttons">
                          <button
                            type="button"
                            onClick={() => handleFeedback(index, message, "solved")}
                          >
                            ✓ {t.solved}
                          </button>
                          <button
                            type="button"
                            onClick={() => handleFeedback(index, message, "not_solved")}
                          >
                            ✕ {t.notSolved}
                          </button>
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))}
          </div>

          <div
            className={`sag-scroll-track ${scrollIndicator.visible ? "visible" : ""}`}
            aria-hidden="true"
          >
            <div
              className="sag-scroll-thumb"
              style={{
                height: `${scrollIndicator.height}%`,
                top: `${scrollIndicator.top}%`,
              }}
            />
          </div>
        </div>

        <form className="sag-input-wrap" onSubmit={submitMessage}>
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={mode === "route" ? t.routePlaceholder : t.placeholder}
            aria-label="message"
            disabled={loading}
          />
          <button type="submit" disabled={loading}>
            {loading ? "…" : t.send}
          </button>
        </form>
      </section>

      <style>{`
        * { box-sizing: border-box; }
        html, body { margin: 0; min-height: 100%; background: #eef4f8; }
        body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif; color: #14202b; }
        button, input { font: inherit; }
        button:disabled, input:disabled { opacity: .62; cursor: default; }

        .sag-page {
          min-height: 100dvh;
          display: flex;
          justify-content: center;
          padding: 24px 12px;
          background: #eef4f8;
        }

        .sag-phone {
          width: 100%;
          max-width: 520px;
          height: calc(100dvh - 48px);
          min-height: 0;
          background: white;
          border-radius: 28px;
          box-shadow: 0 14px 45px rgba(28, 55, 78, .12);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }

        .sag-header {
          padding: 18px 20px 13px;
          border-bottom: 1px solid #e6edf2;
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 14px;
        }

        .sag-kicker {
          color: #0c7a61;
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.8px;
        }

        .sag-header h1 {
          margin: 3px 0 0;
          font-size: 25px;
          letter-spacing: -1px;
        }

        .sag-status {
          white-space: nowrap;
          color: #6b7883;
          font-size: 13px;
          padding-top: 4px;
        }

        .sag-status span {
          display: inline-block;
          width: 8px;
          height: 8px;
          margin-right: 6px;
          border-radius: 50%;
          background: #20a675;
        }

        .sag-status span.loading {
          background: #f2a51a;
          animation: pulse 1s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: .35; }
          50% { opacity: 1; }
        }

        .sag-languages {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 6px;
          padding: 9px 16px 0;
        }

        .sag-languages button {
          border: 1px solid #dfe8ed;
          background: white;
          border-radius: 10px;
          padding: 6px 3px;
          color: #53616c;
          cursor: pointer;
          font-size: 12px;
        }

        .sag-languages button.active {
          border-color: #14785f;
          color: #14785f;
          background: #eff8f5;
          font-weight: 700;
        }

        .sag-section-title {
          padding: 10px 16px 7px;
          font-weight: 800;
          font-size: 14px;
        }

        .sag-actions {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 7px;
          padding: 0 16px 10px;
        }

        .sag-actions button {
          min-height: 55px;
          border: 1px solid #d9e4ea;
          border-radius: 14px;
          background: white;
          cursor: pointer;
          color: #17232d;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          font-weight: 700;
          font-size: 12px;
        }

        .sag-actions button:active {
          transform: scale(.98);
          background: #f7fafb;
        }

        .sag-action-icon { font-size: 19px; }

        .sag-chat-shell {
          position: relative;
          flex: 1 1 auto;
          min-height: 0;
          overflow: hidden;
        }

        .sag-chat {
          height: 100%;
          min-height: 0;
          padding: 6px 18px 14px 16px;
          display: flex;
          flex-direction: column;
          gap: 9px;
          overflow-y: auto;
          overscroll-behavior: contain;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
        }

        .sag-chat::-webkit-scrollbar {
          width: 0;
          height: 0;
        }

        .sag-scroll-track {
          position: absolute;
          top: 7px;
          right: 5px;
          bottom: 10px;
          width: 5px;
          border-radius: 999px;
          background: rgba(62, 82, 96, .10);
          opacity: 0;
          pointer-events: none;
          transition: opacity .18s ease;
        }

        .sag-scroll-track.visible {
          opacity: 1;
        }

        .sag-scroll-thumb {
          position: absolute;
          left: 0;
          width: 100%;
          min-height: 24px;
          border-radius: 999px;
          background: rgba(31, 72, 66, .68);
          box-shadow: 0 0 0 1px rgba(255, 255, 255, .55);
          transition: top .08s linear, height .12s ease;
        }

        .sag-row {
          display: flex;
          width: 100%;
        }

        .sag-chat::after {
          content: "";
          display: block;
          flex: 0 0 2px;
        }

        .sag-row.user { justify-content: flex-end; }
        .sag-row.assistant { justify-content: flex-start; }

        .sag-bubble {
          max-width: 86%;
          border-radius: 15px;
          padding: 11px 13px;
          line-height: 1.5;
          font-size: 14px;
          overflow-wrap: anywhere;
        }

        .sag-bubble.assistant {
          background: #f0f4f6;
          color: #2c3943;
          border-bottom-left-radius: 5px;
        }

        .sag-bubble.user {
          background: #14785f;
          color: white;
          border-bottom-right-radius: 5px;
        }

        .sag-bubble.pending {
          color: #687781;
        }

        .sag-answer {
          white-space: pre-wrap;
        }

        .sag-answer strong {
          font-weight: 800;
          color: inherit;
        }

        .sag-bubble.has-options {
          width: 97%;
          max-width: 97%;
          padding: 7px 8px;
          line-height: 1.3;
        }

        .sag-gate-options {
          display: grid;
          grid-template-columns: repeat(3, minmax(0, 1fr));
          gap: 5px;
          margin-top: 7px;
        }

        .sag-gate-options button {
          border: 1px solid #bdd8cf;
          background: white;
          color: #166b56;
          border-radius: 9px;
          min-height: 38px;
          padding: 5px 5px;
          font-size: 11px;
          font-weight: 750;
          line-height: 1.2;
          cursor: pointer;
          text-align: center;
        }


        /* 구매·발급: 4행 × 2열, 왼쪽은 선택 버튼/오른쪽은 요약 설명 */
        .sag-purchase-wrap { margin-top: 9px; }
        .sag-purchase-grid {
          overflow: hidden;
          border: 1px solid #c9dbe8;
          border-radius: 10px;
          background: #fff;
        }
        .sag-purchase-row {
          display: grid;
          grid-template-columns: minmax(0, 44%) minmax(0, 56%);
          min-height: 55px;
        }
        .sag-purchase-row + .sag-purchase-row { border-top: 1px solid #dfe8ef; }
        .sag-purchase-select {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 3px;
          width: 100%;
          border: 0;
          border-right: 1px solid #dfe8ef;
          background: #edf5fc;
          color: #124b79;
          cursor: pointer;
          font-size: 11.5px;
          font-weight: 800;
          text-align: left;
          padding: 9px 6px 9px 8px;
          line-height: 1.35;
          overflow-wrap: anywhere;
        }
        .sag-purchase-select:active { background: #d8eafa; }
        .sag-purchase-chevron { font-size: 19px; color: #3177ad; flex: 0 0 auto; }
        .sag-purchase-description {
          display: flex;
          align-items: center;
          padding: 8px;
          background: #fff;
          color: #314350;
          line-height: 1.4;
          font-size: 11.5px;
          overflow-wrap: anywhere;
          word-break: keep-all;
        }
        .sag-purchase-back { margin-top: 8px; display: flex; justify-content: flex-start; }
        .sag-purchase-back button {
          border: 1px solid #b7d1e0;
          background: #fff;
          color: #17618a;
          border-radius: 9px;
          padding: 7px 10px;
          font-size: 11.5px;
          font-weight: 750;
          cursor: pointer;
        }

        .sag-submenu-options {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 7px;
          margin-top: 9px;
        }
        .sag-submenu-options button {
          min-height: 40px;
          border: 1px solid #b7d1e0;
          background: white;
          color: #17618a;
          border-radius: 10px;
          padding: 7px 6px;
          font-size: 12px;
          font-weight: 750;
          cursor: pointer;
          line-height: 1.35;
        }
        .sag-submenu-options button.wide { grid-column: 1 / -1; }
        .sag-submenu-options button:active { background: #ecf6fc; }

        .sag-gate-options button:active {
          transform: scale(.98);
          background: #edf8f4;
        }

        .sag-gate-options button.wide {
          grid-column: 1 / -1;
        }

        .sag-google-button {
          margin-top: 10px;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          text-decoration: none;
          background: white;
          color: #11694f;
          border: 1px solid #a9d7c9;
          border-radius: 10px;
          padding: 10px 12px;
          font-weight: 800;
          font-size: 13px;
        }

        .sag-query {
          margin-top: 8px;
          font-size: 11px;
          color: #7b8992;
          word-break: keep-all;
        }

        .sag-search-suggestion {
          margin-top: 10px;
          overflow: hidden;
        }

        .sag-feedback {
          margin-top: 9px;
          padding-top: 8px;
          border-top: 1px solid rgba(44, 57, 67, .10);
        }

        .sag-feedback-question {
          display: block;
          margin-bottom: 6px;
          color: #66747e;
          font-size: 11px;
          font-weight: 700;
        }

        .sag-feedback-buttons {
          display: flex;
          gap: 6px;
        }

        .sag-feedback-buttons button {
          border: 1px solid #cbd9df;
          background: white;
          color: #40505b;
          border-radius: 8px;
          padding: 5px 8px;
          font-size: 11px;
          font-weight: 750;
          cursor: pointer;
        }

        .sag-feedback-buttons button:active {
          transform: scale(.98);
          background: #f3f7f8;
        }

        .sag-feedback-thanks {
          color: #14785f;
          font-size: 11px;
          font-weight: 750;
        }

        .sag-input-wrap {
          flex: 0 0 auto;
          position: relative;
          z-index: 5;
          background: white;
          border-top: 1px solid #e5edf1;
          padding: 10px 14px calc(10px + env(safe-area-inset-bottom));
          display: flex;
          gap: 8px;
          box-shadow: 0 -6px 18px rgba(20, 40, 55, .04);
        }

        .sag-input-wrap input {
          flex: 1;
          min-width: 0;
          border: 1px solid #d5e0e6;
          border-radius: 12px;
          padding: 12px 13px;
          outline: none;
          color: #18242e;
          background: white;
        }

        .sag-input-wrap input:focus {
          border-color: #14785f;
          box-shadow: 0 0 0 3px rgba(20, 120, 95, .08);
        }

        .sag-input-wrap button {
          border: 0;
          border-radius: 12px;
          padding: 0 17px;
          background: #14785f;
          color: white;
          font-weight: 800;
          cursor: pointer;
          min-width: 62px;
        }

        @media (max-width: 560px) {
          html, body {
            height: 100%;
            overflow: hidden;
          }

          .sag-page {
            height: 100dvh;
            min-height: 100dvh;
            padding: 0;
            overflow: hidden;
          }

          .sag-phone {
            max-width: none;
            width: 100%;
            height: 100dvh;
            min-height: 0;
            border-radius: 0;
            box-shadow: none;
          }

          .sag-header {
            padding: calc(10px + env(safe-area-inset-top)) 16px 10px;
          }

          .sag-kicker {
            font-size: 10px;
            letter-spacing: 1.4px;
          }

          .sag-header h1 {
            font-size: 22px;
            margin-top: 2px;
          }

          .sag-status {
            font-size: 11px;
            padding-top: 2px;
          }

          .sag-languages {
            padding: 7px 12px 0;
            gap: 5px;
          }

          .sag-languages button {
            padding: 5px 2px;
            font-size: 11px;
          }

          .sag-section-title {
            padding: 8px 12px 6px;
            font-size: 13px;
          }

          .sag-actions {
            padding: 0 12px 8px;
            gap: 6px;
          }

          .sag-actions button {
            min-height: 58px;
            border-radius: 12px;
            font-size: 11.5px;
          }

          .sag-action-icon {
            font-size: 18px;
          }

          .sag-gate-options {
            gap: 4px;
          }

          .sag-gate-options button {
            min-height: 34px;
            padding: 3px 3px;
            font-size: 10px;
          }

          .sag-chat {
            padding-top: 5px;
            padding-bottom: 10px;
          }

          .sag-input-wrap {
            padding: 8px 10px calc(8px + env(safe-area-inset-bottom));
          }
        }
      `}</style>
    </main>
  );
}
