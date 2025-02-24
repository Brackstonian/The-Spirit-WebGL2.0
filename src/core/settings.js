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
let query = (exports.query = parse(window.location.href.replace('#', '?')));

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

const calcGPUPerformance = (iterations = 10) => {
    return new Promise((resolve) => {
        const canvas = document.createElement('canvas');
        canvas.width = 512;
        canvas.height = 512;
        canvas.style.visibility = "hidden";

        const gl = canvas.getContext('webgl');
        if (!gl) {
            console.error('WebGL not supported');
            resolve(null);
            return;
        }

        const vsSource = `
            attribute vec4 aVertexPosition;
            void main() {
            gl_Position = aVertexPosition;
            }
        `;

        const fsSource = `
            precision mediump float;
            uniform float uTime;
            void main() {
            // Create a shifting color pattern using sin and cos functions
            gl_FragColor = vec4(abs(sin(uTime)), abs(cos(uTime)), abs(sin(uTime * 0.5)), 1.0);
            }
        `;

        const loadShader = (type, source) => {
            const shader = gl.createShader(type);
            gl.shaderSource(shader, source);
            gl.compileShader(shader);
            if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
                console.error(
                    'Error compiling shader: ' + gl.getShaderInfoLog(shader)
                );
                gl.deleteShader(shader);
                return null;
            }
            return shader;
        };

        const vertexShader = loadShader(gl.VERTEX_SHADER, vsSource);
        const fragmentShader = loadShader(gl.FRAGMENT_SHADER, fsSource);

        const shaderProgram = gl.createProgram();
        gl.attachShader(shaderProgram, vertexShader);
        gl.attachShader(shaderProgram, fragmentShader);
        gl.linkProgram(shaderProgram);
        if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
            console.error(
                'Unable to initialize shader program: ' +
                    gl.getProgramInfoLog(shaderProgram)
            );
            resolve(null);
            return;
        }
        gl.useProgram(shaderProgram);

        const vertices = new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]);
        const vertexBuffer = gl.createBuffer();
        gl.bindBuffer(gl.ARRAY_BUFFER, vertexBuffer);
        gl.bufferData(gl.ARRAY_BUFFER, vertices, gl.STATIC_DRAW);

        const aVertexPosition = gl.getAttribLocation(
            shaderProgram,
            'aVertexPosition'
        );
        gl.enableVertexAttribArray(aVertexPosition);
        gl.vertexAttribPointer(aVertexPosition, 2, gl.FLOAT, false, 0, 0);

        const uTimeLocation = gl.getUniformLocation(shaderProgram, 'uTime');

        let frame = 0;
        const startTime = performance.now();

        const render = () => {
            if (frame < iterations) {
                const now = performance.now();
                const elapsed = (now - startTime) / 1000;
                gl.uniform1f(uTimeLocation, elapsed);
                gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
                frame++;
                requestAnimationFrame(render);
            } else {
                const gpuTime = performance.now() - startTime;
                resolve(gpuTime);
            }
        };

        requestAnimationFrame(render);
    });
};

calcGPUPerformance().then((gpuTime) => { 
    if (gpuTime && gpuTime < 150) {
        exports.motionBlur = true;
        exports.bloom = true;
    } else {
        exports.motionBlur = false;
        exports.bloom = false;
    }
    console.log(
        'screenCategory:',
        screenCategory,
        'cpuResultPerformance:',
        resultPerformance.toFixed(2),
        'gpuResultPerformance:',
        gpuTime.toFixed(2), 'ms ',
        'fxaa:',
        exports.fxaa,
        'bloom:',
        exports.bloom,
        'motionBlur:',
        exports.motionBlur
    );
});

window.cpuPerformance = {};
cpuPerformance.value = resultPerformance;
// Adjust settings based on screen width
let screenCategory;
if (screenWidth <= 394) {
    screenCategory = 'mobile';
    exports.particleAmount = 1500;
} else if (screenWidth <= 768) {
    screenCategory = 'tablet';
    exports.particleAmount = 3000;
} else if (screenWidth <= 1024) {
    screenCategory = 'ipadPro';
    exports.particleAmount = 10000;
} else {
    screenCategory = 'desktop';
    exports.particleAmount = 5000;
}

let amountMap = {
    mobile: { amount: '65k', texture: [256, 256], radius: 0.6 },
    tablet: { amount: '524k', texture: [512, 128], radius: 0.6 },
    ipadPro: { amount: '524k', texture: [1024, 512], radius: 1.2 },
    desktop: { amount: '524k', texture: [1024, 512], radius: 1.6 },
};

if (screenCategory === 'desktop') {
    if (resultPerformance > 190) {
        amountMap.desktop.amount = '65k';
        amountMap.desktop.texture = [256, 256];
        amountMap.desktop.radius = 1;
    } else if (resultPerformance > 90) {
        amountMap.desktop.amount = '262k';
        amountMap.desktop.texture = [512, 384];
        amountMap.desktop.radius = 1.3;
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
exports.color1 = ['#6998AB', '#B1D0E0']; // Medium blue
exports.color2 = ['#B1D0E0', '#6998AB']; // Light blue
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
let motionBlurQualityMap = (exports.motionBlurQualityMap = {
    best: 1,
    high: 0.5,
    medium: 1 / 3,
    low: 0.25,
});
exports.motionBlurQualityList = keys(motionBlurQualityMap);
query.motionBlurQuality = motionBlurQualityMap[query.motionBlurQuality]
    ? query.motionBlurQuality
    : 'medium';

// Optimize post-processing for mobile
exports.motionBlurPause = false;
// exports.bloom = screenCategory !== 'mobile';
// exports.bloom = screenCategory !== 'mobile' && resultPerformance < 20;
exports.fxaa = screenCategory !== 'mobile' && resultPerformance < 40;