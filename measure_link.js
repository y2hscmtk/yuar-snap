import LZString from 'lz-string';

const KEY_MAP = {
    contractorName: 'n',
    contractorEmail: 'e',
    venue: 'v',
    contact: 'c',
    weddingDate: 'd',
    weddingTime: 't',
    packageConfig: 'p',
    options: 'o',
    hasCustomOption: 'h',
    customOptions: 'co',
    discountItems: 'di',
    finalPrice: 'fp',
    signature: 's'
}

const minifyData = (data) => {
    const minified = {}
    for (const [key, value] of Object.entries(data)) {
        if (!value || value === '' || value === 'none' || value === false || (Array.isArray(value) && value.length === 0)) {
            continue
        }
        const shortKey = KEY_MAP[key] || key
        if (key === 'customOptions' && Array.isArray(value)) {
            minified[shortKey] = value.map(opt => ({
                i: opt.id,
                n: opt.name,
                p: opt.price,
                s: opt.sign
            }))
        } else {
            minified[shortKey] = value
        }
    }
    return minified
}

const sampleData = {
    contractorName: '홍길동',
    contractorEmail: 'hong@example.com',
    venue: '서울신라호텔 다이너스티홀',
    contact: '010-1234-5678',
    weddingDate: '2024-12-25',
    weddingTime: '12:00',
    packageConfig: 'premium',
    options: 'banquet',
    hasCustomOption: true,
    customOptions: [{ id: 1, name: 'Very Long Option Name Testing Length', price: 100000, sign: 1 }],
    discountItems: ['portrait', 'today'],
    finalPrice: '500,000원',
    signature: null,
};

const minified = minifyData(sampleData);
const json = JSON.stringify(minified);
console.log('JSON Length:', json.length);

const compressed = LZString.compressToEncodedURIComponent(json);
console.log('Compressed Length:', compressed.length);
console.log('Sample URL Query:', `?data=${compressed}`);
