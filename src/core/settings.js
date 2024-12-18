var parse = require('mout/queryString/parse');
var keys = require('mout/object/keys');
var query = exports.query = parse(window.location.href.replace('#', '?'));

// Texture/Resolution settings
var amountMap = {
    '4k': [64, 64, 0.29],
    '8k': [128, 64, 0.42],
    '16k': [128, 128, 0.48],
    '32k': [256, 128, 2.5],
    '65k': [256, 256, 2.5],
    '131k': [512, 256, 0.85],
    '252k': [512, 512, 1.2],
    '524k': [64, 1024, 0.5],
    '1m': [1024, 1024, 1.6],
    '2m': [2048, 1024, 2],
    '4m': [2048, 2048, 2.5]
};
exports.amountList = keys(amountMap);
query.amount = amountMap[query.amount] ? query.amount : '524k';
var amountInfo = amountMap[query.amount];


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



exports.simulatorTextureWidth = amountInfo[0];
exports.simulatorTextureHeight = amountInfo[1];



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
