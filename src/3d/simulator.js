import THREE from '../utils/three.js';

let settings = require('../core/settings');
const patterns = require('../core/patterns'); // Import the patterns from patterns.js


let glslify = require('glslify');
let shaderParse = require('../helpers/shaderParse');

let _copyShader;
let _textureDefaultPosition;
let _renderer;
let _mesh;
let _scene;
let _camera;

let positionShaders = []; // Array to hold position shaders for each orb
exports.positionShaders = positionShaders;
let positionRenderTargets = []; // Array to hold render targets for each orb
let positionRenderTargets2 = []; // Array for secondary render targets (for swapping)

let followPoints = []; // Array to hold follow points
exports.followPoints = followPoints;
let followPointTimes = []; // Array to hold time for each follow point

let followPointStates = []; // Array to hold states for each follow point
exports.followPointStates = followPointStates;

let pointDistance = 150; // Set the distance between follow points

let TEXTURE_WIDTH = exports.TEXTURE_WIDTH = settings.simulatorTextureWidth;
let TEXTURE_HEIGHT = exports.TEXTURE_HEIGHT = settings.simulatorTextureHeight;
let AMOUNT = exports.AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

exports.init = init;
exports.update = update;
exports.initAnimation = 0;

exports.positionRenderTarget = [];

let currentPattern = settings.pattern; // This is an array ['default', 'spiral']

exports.setPattern = (patternInput) => {
    if (Array.isArray(patternInput)) {
        const validPatterns = patternInput.filter(patternName => patterns[patternName]);
        currentPattern = validPatterns;

        // Start transition for all follow points
        followPointStates.forEach(state => {
            state.transitioning = true;
            state.transitionProgress = 0;
        });
    } else if (patterns[patternInput]) {
        currentPattern = [patternInput];

        followPointStates.forEach(state => {
            state.transitioning = true;
            state.transitionProgress = 0;
        });
    }
};

// Function to add a new follow point
function addFollowPoint() {
    let newPoint = new THREE.Vector3();
    followPoints.push(newPoint);
    followPointTimes.push(0); // Initialize time for the new follow point
    followPointStates.push({
        currentPatternIndex: 0,
        transitionProgress: 0,
        transitioning: false
    });
}

// Modified init function to initialize multiple follow points and shaders
function init(renderer, numOrbs = 2) {
    _renderer = renderer;
    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.position.z = 1;

    let rawShaderPrefix = 'precision ' + renderer.capabilities.precision + ' float;\n';

    let gl = _renderer.getContext();
    if (!gl.getParameter(gl.MAX_VERTEX_TEXTURE_IMAGE_UNITS)) {
        alert('No support for vertex shader textures!');
        return;
    }

    _copyShader = new THREE.RawShaderMaterial({
        uniforms: {
            resolution: { type: 'v2', value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_HEIGHT) },
            texture: { type: 't', value: undefined }
        },
        vertexShader: rawShaderPrefix + shaderParse(glslify('../glsl/quad.vert')),
        fragmentShader: rawShaderPrefix + shaderParse(glslify('../glsl/through.frag'))
    });

    _mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), _copyShader);
    _scene.add(_mesh);

    // Initialize shaders, render targets, and follow points for each orb
    for (let i = 0; i < numOrbs; i++) {
        addFollowPoint();

        const newShader = new THREE.RawShaderMaterial({
            uniforms: {
                resolution: { type: 'v2', value: new THREE.Vector2(TEXTURE_WIDTH, TEXTURE_HEIGHT) },
                texturePosition: { type: 't', value: undefined },
                textureDefaultPosition: { type: 't', value: undefined },
                mouse3d: { type: 'v3', value: new THREE.Vector3() },
                color1: { type: 'c', value: undefined },
                color2: { type: 'c', value: undefined },
                speed: { type: 'f', value: 1 },
                dieSpeed: { type: 'f', value: 0 },
                radius: { type: 'f', value: 0 },
                curlSize: { type: 'f', value: 0 },
                attraction: { type: 'f', value: 0 },
                time: { type: 'f', value: 0 },
                initAnimation: { type: 'f', value: 0 }
            },
            vertexShader: rawShaderPrefix + shaderParse(glslify('../glsl/quad.vert')),
            fragmentShader: rawShaderPrefix + shaderParse(glslify('../glsl/position.frag')),
            blending: THREE.NoBlending,
            transparent: false,
            depthWrite: false,
            depthTest: false
        });

        positionShaders.push(newShader);
        _scene.add(_mesh);

        const renderTarget = new THREE.WebGLRenderTarget(TEXTURE_WIDTH, TEXTURE_HEIGHT, {
            wrapS: THREE.ClampToEdgeWrapping,
            wrapT: THREE.ClampToEdgeWrapping,
            minFilter: THREE.NearestFilter,
            magFilter: THREE.NearestFilter,
            format: THREE.RGBAFormat,
            type: THREE.FloatType,
            depthWrite: false,
            depthBuffer: false,
            stencilBuffer: false
        });

        const renderTarget2 = renderTarget.clone();
        positionRenderTargets.push(renderTarget);
        positionRenderTargets2.push(renderTarget2);

        exports.positionRenderTargets = positionRenderTargets;

        const texture = _createPositionTexture();
        _copyTexture(texture, renderTarget);
        _copyTexture(texture, renderTarget2);
    }
}

function _copyTexture(input, output) {
    _mesh.material = _copyShader;
    _copyShader.uniforms.texture.value = input;
    _renderer.setRenderTarget(output);
    _renderer.render(_scene, _camera);
    _renderer.setRenderTarget(null);
}

function _updatePosition(dt) {
    positionShaders.forEach((shader, index) => {
        // Swap render targets for each orb
        const tmp = positionRenderTargets[index];
        positionRenderTargets[index] = positionRenderTargets2[index];
        positionRenderTargets2[index] = tmp;

        _mesh.material = shader;
        shader.uniforms.textureDefaultPosition.value = _textureDefaultPosition;
        shader.uniforms.texturePosition.value = positionRenderTargets2[index].texture;
        shader.uniforms.time.value += dt * 0.001;

        _renderer.setRenderTarget(positionRenderTargets[index]);
        _renderer.render(_scene, _camera);
        _renderer.setRenderTarget(null);
    });
}

function _createPositionTexture() {
    let positions = new Float32Array(AMOUNT * 4);
    let i4;
    let r, phi, theta;
    for (let i = 0; i < AMOUNT; i++) {
        i4 = i * 4;
        r = (0.5 + Math.random() * 0.5) * 50;
        phi = (Math.random() - 0.5) * Math.PI;
        theta = Math.random() * Math.PI * 2;
        positions[i4 + 0] = r * Math.cos(theta) * Math.cos(phi);
        positions[i4 + 1] = r * Math.sin(phi);
        positions[i4 + 2] = r * Math.sin(theta) * Math.cos(phi);
        positions[i4 + 3] = Math.random();
    }
    let texture = new THREE.DataTexture(positions, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
    texture.minFilter = THREE.NearestFilter;
    texture.magFilter = THREE.NearestFilter;
    texture.needsUpdate = true;
    texture.generateMipmaps = false;
    texture.flipY = false;
    _textureDefaultPosition = texture;
    return texture;
}

function update(dt) {
    let r = 200, h = 60;
    if (settings.isMobile) {
        r = 100;
        h = 40;
    }
    let autoClearColor = _renderer.autoClearColor;
    let clearColor = _renderer.getClearColor(new THREE.Color()).getHex();
    let clearAlpha = _renderer.getClearAlpha();

    _renderer.autoClearColor = false;

    followPoints.forEach((point, index) => {
        const state = followPointStates[index];
        const shader = positionShaders[index];

        shader.uniforms.speed.value = settings.speed[index];
        shader.uniforms.dieSpeed.value = settings.dieSpeed[index];
        shader.uniforms.radius.value = settings.radius[index];
        shader.uniforms.curlSize.value = settings.curlSize[index];
        shader.uniforms.attraction.value = settings.attraction[index];
        shader.uniforms.initAnimation.value = exports.initAnimation;

        if (settings.followMouse[index]) {
            // If following the mouse, copy the mouse position directly
            shader.uniforms.mouse3d.value.copy(settings.mouse3d);
        } else {
            // Handle transition between patterns
            if (state.transitioning) {
                const targetPattern = patterns[currentPattern[index]] || patterns.default;
                const targetStartPoint = targetPattern[0];

                state.transitionProgress += dt * 0.001 * (settings.transitionSpeed || 1);
                if (state.transitionProgress >= 1) {
                    state.transitioning = false;
                    state.currentPatternIndex = 0;
                    point.copy(targetStartPoint);
                    followPointTimes[index] = 0; // Reset time for the new pattern
                } else {
                    // Interpolate between the current position and the starting point of the new pattern
                    point.lerpVectors(point, targetStartPoint, state.transitionProgress);
                }
            } else {
                // Normal pattern animation
                const pattern = patterns[currentPattern[index]] || patterns.default;
                const patternLength = pattern.length;
                const totalTime = patternLength; // Assuming each segment takes 1 unit of time
                const time = followPointTimes[index] % totalTime;
                const segmentIndex = Math.floor(time);
                const nextSegmentIndex = (segmentIndex + 1) % patternLength;

                const startPoint = pattern[segmentIndex];
                const endPoint = pattern[nextSegmentIndex];

                const t = time - segmentIndex; // Interpolation factor between 0 and 1
                point.lerpVectors(startPoint, endPoint, t);

                followPointTimes[index] += dt * 0.001 * settings.speed[index];
            }

            // Adjust position based on orb index and settings
            if (currentPattern[0] === currentPattern[1] && settings.orbDisplay[0] === settings.orbDisplay[1]) {
                point.z -= (pointDistance / 2);
            }

            if (index === 1 && currentPattern[0] === currentPattern[1]) {
                point.z += pointDistance;
            }

            // Update shader uniform with the new position
            shader.uniforms.mouse3d.value.copy(point);
        }
    });

    _updatePosition(dt);

    _renderer.setClearColor(clearColor, clearAlpha);
    _renderer.autoClearColor = autoClearColor;
}

