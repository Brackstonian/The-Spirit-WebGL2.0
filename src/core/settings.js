var parse = require('mout/queryString/parse');
var keys = require('mout/object/keys');
var query = exports.query = parse(window.location.href.replace('#', '?'));

// Texture/Resolution settings
var amountMap = {
    '4k' : [64, 64, 0.29],
    '8k' : [128, 64, 0.42],
    '16k' : [128, 128, 0.48],
    '32k' : [256, 128, 0.55],
    '65k' : [256, 256, 0.6],
    '131k' : [512, 256, 0.85],
    '252k' : [512, 512, 1.2],
    '524k' : [1024, 512, 1.4],
};

exports.amountList = keys(amountMap);


function detectDeviceCategory() {
    const ua = navigator.userAgent;

    if (/iPad/i.test(ua)) {
        if (window.devicePixelRatio >= 2 && screen.width >= 1024) {
            return 'ipad-pro'; // iPad Pro (Gen 3+)
        }
        return 'ipad'; // Older iPads
    }

    if (/iPhone/i.test(ua)) {
        return 'iphone'; // All iPhones
    }

    if (/Android/i.test(ua)) {
        const isHighEnd = navigator.deviceMemory >= 6 || screen.width >= 1440;
        const isMidEnd = navigator.deviceMemory >= 4 || screen.width >= 1080;
        return isHighEnd ? 'android-high' : isMidEnd ? 'android-mid' : 'android-low';
    }

    if (/Windows|Macintosh|Linux/i.test(ua)) {
        const isHighPerformance = navigator.deviceMemory >= 8 || screen.width >= 1440;
        const isDesktop = /Win|Mac|Linux/.test(ua) && screen.width >= 1024;
        return isHighPerformance && isDesktop ? 'desktop-high' : isDesktop ? 'desktop-low' : 'laptop';
    }

    return 'unknown';
}

// Map device category to resolution
function getResolutionByDevice(deviceCategory) {
    switch (deviceCategory) {
        case 'iphone': return '8k';
        case 'ipad': return '8k';
        case 'ipad-pro': return '524k';
        case 'android-low': return '8k';
        case 'android-mid': return '16k';
        case 'android-high': return '32k';
        case 'laptop': return '16k';
        case 'desktop-low': return '32k';
        case 'desktop-high': return '131k';
        default: return '4k';
    }
}

const deviceCategory = detectDeviceCategory();
const bestAmount = getResolutionByDevice(deviceCategory);
query.amount = amountMap[query.amount] ? query.amount : bestAmount;
var amountInfo = amountMap[query.amount];
console.log(`🚀 Detected Device: ${deviceCategory}, Amount Info:`, amountInfo);

exports.simulatorTextureWidth = amountInfo[0];
exports.simulatorTextureHeight = amountInfo[1];

// Core orb behavior
exports.orbDisplay = [false, false];
exports.speed = [1, 10];
exports.dieSpeed = [0.015, 0.015];
exports.radius = [1, 1];
exports.curlSize = [0.02, 0.04];
exports.attraction = [1, 2];
exports.color1 = ['#6998AB', '#B1D0E0'];  // Medium blue
exports.color2 = ['#B1D0E0', '#6998AB'];  // Light blue
exports.pattern = ['default', 'spiral'];
exports.followMouse = [true, false];

// Scene settings
exports.bgColor = '#FFFFFF';
exports.bgOpacity = 0.5;
exports.lightIntensity = 0.1;

exports.bloomAmount = 1;

// System detection / Debugging
exports.useStats = false;
exports.isMobile = /(iPad|iPhone|Android)/i.test(navigator.userAgent);

// Post-processing settings
exports.fxaa = true;
var motionBlurQualityMap = exports.motionBlurQualityMap = {
    best: 1,
    high: 0.5,
    medium: 1 / 3,
    low: 0.25
};
exports.motionBlurQualityList = keys(motionBlurQualityMap);
query.motionBlurQuality = motionBlurQualityMap[query.motionBlurQuality] ? query.motionBlurQuality : 'medium';
exports.motionBlur = true;
exports.motionBlurPause = false;
exports.bloom = true;
