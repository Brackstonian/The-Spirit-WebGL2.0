
// let amountMap = {
//     '4k' : [64, 64, 0.29],
//     '8k' : [128, 64, 0.42],
//     '16k' : [128, 128, 0.48],
//     '32k' : [256, 128, 0.55],
//     '65k' : [256, 256, 0.6],
//     '131k' : [512, 256, 0.85],
//     '252k' : [512, 512, 1.2],
//     '524k' : [1024, 512, 1.4],
//     '1m' : [1024, 1024, 1.6],
//     '2m' : [2048, 1024, 2],
//     '4m' : [2048, 2048, 2.5]
// };
let parse = require('mout/queryString/parse');
let keys = require('mout/object/keys');
let query = exports.query = parse(window.location.href.replace('#', '?'));

let screenWidth = window.innerWidth;

const calcPerformance = (iterations = 10_000_000) => {
    const start = performance.now();
    
    let sum = 0;
    for (let i = 0; i < iterations; i++) {
        sum += i;
    }
    const end = performance.now();
    
    return end - start; // milliseconds
};

let resultPerformance = calcPerformance();

window.cpuPerformance = {}
cpuPerformance.value = resultPerformance;
// Adjust settings based on screen width
let screenCategory;
if (screenWidth <= 394) {
    screenCategory = 'mobile';
    exports.particleAmount = 1500
} else if (screenWidth <= 768) {
    screenCategory = 'tablet';
    exports.particleAmount = 3000
} else if (screenWidth <= 1024) {
    screenCategory = 'ipadPro';
    exports.particleAmount = 10000
} else {
    screenCategory = 'desktop';
    exports.particleAmount = 5000
}

let amountMap = {
    mobile:  { amount: '65k', texture: [256, 256], radius: 0.6 },
    tablet:  { amount: '524k', texture: [512, 128], radius: 0.6 },
    ipadPro: { amount: '524k', texture: [1024, 512], radius: 1.2 },
    desktop: { amount: '524k', texture: [1024, 512], radius: 1.6 }
};

if (screenCategory === 'desktop') {
    if (resultPerformance > 190) {
        amountMap.desktop.amount  = '65k';
        amountMap.desktop.texture = [256, 256];
        amountMap.desktop.radius  = 1;
    } else if (resultPerformance > 90) {
        amountMap.desktop.amount  = '262k';
        amountMap.desktop.texture = [512, 384];
        amountMap.desktop.radius  = 1.3;
    }
    // else < 70ms => keep default (524k)
}

// Apply the chosen settings
let { amount, texture, radius } = amountMap[screenCategory];
query.amount = amount;

exports.simulatorTextureWidth = texture[0];
exports.simulatorTextureHeight = texture[1];

// Core orb behavior
exports.orbDisplay = [false, false];
exports.speed = [1, 10];
exports.dieSpeed = [0.015, 0.015];
exports.radius = [radius, radius];
exports.curlSize = [0.02, 0.04];
exports.attraction = [1, 2];
exports.color1 = ['#6998AB', '#B1D0E0'];  // Medium blue
exports.color2 = ['#B1D0E0', '#6998AB'];  // Light blue
exports.pattern = ['still', 'still'];
exports.followMouse = [true, false];

// Scene settings
exports.bgColor = '#FFFFFF';
exports.bgOpacity = 1;
exports.lightIntensity = 0.1;

exports.bloomAmount = 1;

// System detection / Debugging
exports.useStats = false;
exports.isMobile = /(iPad|iPhone|Android)/i.test(navigator.userAgent);

// Post-processing settings
let motionBlurQualityMap = exports.motionBlurQualityMap = {
    best: 1,
    high: 0.5,
    medium: 1 / 3,
    low: 0.25
};
exports.motionBlurQualityList = keys(motionBlurQualityMap);
query.motionBlurQuality = motionBlurQualityMap[query.motionBlurQuality] ? query.motionBlurQuality : 'medium';

// Optimize post-processing for mobile
exports.motionBlur = screenCategory !== 'mobile' && (resultPerformance < 15);
exports.motionBlurPause = false;
// exports.bloom = screenCategory !== 'mobile';
exports.bloom = (screenCategory !== 'mobile') && (resultPerformance < 20);
exports.fxaa = screenCategory !== 'mobile' && (resultPerformance < 40);


console.log(
    "screenCategory:",
    screenCategory,
    "resultPerformance:",
    resultPerformance,
    "fxaa:",
    exports.fxaa,
    "bloom:",
    exports.bloom,
    "motionBlur:",
    exports.motionBlur
  );