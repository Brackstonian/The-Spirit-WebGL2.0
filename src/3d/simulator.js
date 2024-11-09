var settings = require('../core/settings');
const patterns = require('../core/patterns'); // Import the patterns from patterns.js

var THREE = window.THREE;
var glslify = require('glslify');
var shaderParse = require('../helpers/shaderParse');

var _copyShader;
var _textureDefaultPosition;
var _renderer;
var _mesh;
var _scene;
var _camera;

var positionShaders = []; // Array to hold position shaders for each orb
exports.positionShaders = positionShaders;
var positionRenderTargets = []; // Array to hold render targets for each orb
var positionRenderTargets2 = []; // Array for secondary render targets (for swapping)

var followPoints = []; // Array to hold follow points
exports.followPoints = followPoints;
var followPointTimes = []; // Array to hold time for each follow point
var pointDistance = 150; // Set the distance between follow points

var TEXTURE_WIDTH = exports.TEXTURE_WIDTH = settings.simulatorTextureWidth;
var TEXTURE_HEIGHT = exports.TEXTURE_HEIGHT = settings.simulatorTextureHeight;
var AMOUNT = exports.AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

exports.init = init;
exports.update = update;
exports.initAnimation = 0;

exports.positionRenderTarget = [];

var currentPattern = settings.pattern; // this is an array  ['default', 'spiral'];

exports.setPattern = (patternInput) => {
    if (Array.isArray(patternInput)) {
        currentPattern = patternInput.filter(patternName => patterns[patternName]);
    } else if (patterns[patternInput]) {
        currentPattern = [patternInput];
    }
};

// Function to add a new follow point
function addFollowPoint() {
    var newPoint = new THREE.Vector3();
    followPoints.push(newPoint);
    followPointTimes.push(0); // Initialize time for the new follow point
}

// Modified init function to initialize multiple follow points and shaders
function init(renderer, numOrbs = 2) {
    _renderer = renderer;
    _scene = new THREE.Scene();
    _camera = new THREE.Camera();
    _camera.position.z = 1;

    var rawShaderPrefix = 'precision ' + renderer.capabilities.precision + ' float;\n';

    var gl = _renderer.getContext();
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
    var positions = new Float32Array(AMOUNT * 4);
    var i4;
    var r, phi, theta;
    for (var i = 0; i < AMOUNT; i++) {
        i4 = i * 4;
        r = (0.5 + Math.random() * 0.5) * 50;
        phi = (Math.random() - 0.5) * Math.PI;
        theta = Math.random() * Math.PI * 2;
        positions[i4 + 0] = r * Math.cos(theta) * Math.cos(phi);
        positions[i4 + 1] = r * Math.sin(phi);
        positions[i4 + 2] = r * Math.sin(theta) * Math.cos(phi);
        positions[i4 + 3] = Math.random();
    }
    var texture = new THREE.DataTexture(positions, TEXTURE_WIDTH, TEXTURE_HEIGHT, THREE.RGBAFormat, THREE.FloatType);
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
    var autoClearColor = _renderer.autoClearColor;
    var clearColor = _renderer.getClearColor(new THREE.Color()).getHex();
    var clearAlpha = _renderer.getClearAlpha();

    _renderer.autoClearColor = false;

    followPoints.forEach((point, index) => {
        positionShaders[index].uniforms.mouse3d.value.copy(point);
        positionShaders[index].uniforms.speed.value = settings.speed[index];
        positionShaders[index].uniforms.dieSpeed.value = settings.dieSpeed[index];
        positionShaders[index].uniforms.radius.value = settings.radius[index];
        positionShaders[index].uniforms.curlSize.value = settings.curlSize[index];
        positionShaders[index].uniforms.attraction.value = settings.attraction[index];
        positionShaders[index].uniforms.initAnimation.value = exports.initAnimation;

        if (settings.followMouse[index]) {
            positionShaders[index].uniforms.mouse3d.value.copy(settings.mouse3d);
        } else {
            followPointTimes[index] += dt * 0.001 * settings.speed[index];
            const pattern = patterns[currentPattern[index]] || patterns.default;
            const segmentIndex = Math.floor(followPointTimes[index] % pattern.length);
            const nextSegmentIndex = (segmentIndex + 1) % pattern.length;
        
            const startPoint = pattern[segmentIndex];
            const endPoint = pattern[nextSegmentIndex];
        
            const t = followPointTimes[index] % 1; // Interpolation factor
            point.lerpVectors(startPoint, endPoint, t);
        
            followPointTimes[index] += dt * 0.001 * settings.speed[index];
        }
    });

    _updatePosition(dt);

    _renderer.setClearColor(clearColor, clearAlpha);
    _renderer.autoClearColor = autoClearColor;
}

