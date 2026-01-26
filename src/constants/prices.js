export const PRICING = {
    packages: {
        standard: { label: '스탠다드', price: 300000 },
        premium: { label: '프리미엄', price: 350000 },
    },
    options: {
        none: { label: '선택 안함', price: 0 },
        original: { label: '원판 추가', price: 30000 },
        pyebaek: { label: '폐백 추가', price: 30000 },
        part2: { label: '2부 추가', price: 50000 },
        add30min: { label: '30분 추가 촬영', price: 30000 },
        correction: { label: '보정본 추가', price: 10000 },
        reels: { label: '~60초 릴스제작', price: 30000 },
    },
    discounts: [
        { id: 'portrait', label: '초상권 2인 동의', price: -20000 },
        { id: 'disagree1', label: '초상권 1인 동의', price: -10000 },
        { id: 'today', label: '당일 계약', price: -10000 },
    ]
};
