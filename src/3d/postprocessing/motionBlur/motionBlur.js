import THREE from '../../../utils/three';

let Effect = require('../Effect');
let effectComposer = require('../effectComposer');
let fboHelper = require('../../fboHelper');

let glslify = require('glslify');

let undef;

let exports = module.exports = new Effect();
let _super = Effect.prototype;

exports.init = init;
exports.resize = resize;
exports.render = render;

exports.useSampling = false;

// for debug
exports.skipMatrixUpdate = false;

exports.fadeStrength = 2;
exports.motionMultiplier = 500;
exports.maxDistance = 300;
exports.targetFPS = 60;
exports.leaning = 0.5;

// lines method only options
exports.jitter = 0;
exports.opacity = 1;
exports.depthBias = 0.002;
exports.depthTest = false;
exports.useDithering = false;

exports.motionRenderTargetScale = 1;
exports.linesRenderTargetScale = 1 / 2;

let _motionRenderTarget;
let _linesRenderTarget;

let _lines;
let _linesCamera;
let _linesScene;
let _linesPositions;
let _linesPositionAttribute;
let _linesGeometry;
let _linesMaterial;

let _samplingMaterial;

let _prevUseDithering;
let _prevUseSampling;

let _visibleCache = [];

let _width;
let _height;

function init(sampleCount) {

    let gl = effectComposer.renderer.getContext();
    // if(!gl.getExtension('OES_texture_float') || !gl.getExtension('OES_texture_float_linear')) {
		// alert('no float linear support');
    //}

    _motionRenderTarget = fboHelper.createRenderTarget(1, 1, THREE.RGBAFormat, THREE.FloatType);
    _motionRenderTarget.depthBuffer = true;

    _linesRenderTarget = fboHelper.createRenderTarget(1, 1, THREE.RGBAFormat, THREE.FloatType);
    _linesCamera = new THREE.Camera();
    _linesCamera.position.z = 1.0;
    _linesScene = new THREE.Scene();

    _super.init.call(this, {
        uniforms: {
            u_lineAlphaMultiplier: { type: 'f', value: 1 },
            u_linesTexture: { type: 't', value: _linesRenderTarget.texture }
            // u_motionTexture: { type: 't', value: _motionRenderTarget }
        },
        fragmentShader: glslify('./motionBlur.frag')
    });

    _linesPositions = [];
    _linesGeometry = new THREE.BufferGeometry();
    _linesMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_motionTexture: { type: 't', value: _motionRenderTarget.texture },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_maxDistance: { type: 'f', value: 1 },
            u_jitter: { type: 'f', value: 0.3 },
            u_fadeStrength: { type: 'f', value: 1 },
            u_motionMultiplier: { type: 'f', value: 1 },
            u_depthTest: { type: 'f', value: 0 },
            u_opacity: { type: 'f', value: 1 },
            u_leaning: { type: 'f', value: 0.5 },
            u_depthBias: { type: 'f', value: 0.01 }
        },
        vertexShader: fboHelper.rawShaderPrefix + glslify('./motionBlurLines.vert'),
        fragmentShader: fboHelper.rawShaderPrefix + glslify('./motionBlurLines.frag'),

        blending : THREE.CustomBlending,
        blendEquation : THREE.AddEquation,
        blendSrc : THREE.OneFactor,
        blendDst : THREE.OneFactor ,
        blendEquationAlpha : THREE.AddEquation,
        blendSrcAlpha : THREE.OneFactor,
        blendDstAlpha : THREE.OneFactor,
        depthTest: false,
        depthWrite: false,
        transparent: true
    });
    _lines = new THREE.LineSegments(_linesGeometry, _linesMaterial);
    _linesScene.add(_lines);

    _samplingMaterial = new THREE.RawShaderMaterial({
        uniforms: {
            u_texture: { type: 't', value: undef },
            u_motionTexture: { type: 't', value: _motionRenderTarget.texture },
            u_resolution: { type: 'v2', value: effectComposer.resolution },
            u_maxDistance: { type: 'f', value: 1 },
            u_fadeStrength: { type: 'f', value: 1 },
            u_motionMultiplier: { type: 'f', value: 1 },
            u_leaning: { type: 'f', value: 0.5 }
        },
        defines: {
            SAMPLE_COUNT:  Math.min(sampleCount || 21, 64)
        },
        vertexShader: this.material.vertexShader,
        fragmentShader: fboHelper.rawShaderPrefix + '#define SAMPLE_COUNT ' + (sampleCount || 21) + '\n' + glslify('./motionBlurSampling.frag')
    });
}

function resize(width, height) {

    if(!width) {
        width = _width;
        height = _height;
    } else {
        _width = width;
        _height = height;
    }

    let motionWidth = ~~(width * exports.motionRenderTargetScale);
    let motionHeight = ~~(height * exports.motionRenderTargetScale);
    _motionRenderTarget.setSize(motionWidth , motionHeight);

    if(!exports.useSampling) {
        let linesWidth = ~~(width * exports.linesRenderTargetScale);
        let linesHeight = ~~(height * exports.linesRenderTargetScale);
        _linesRenderTarget.setSize(linesWidth, linesHeight);

        let i;
        let noDithering = !exports.useDithering;
        let amount = noDithering ? linesWidth * linesHeight : _getDitheringAmount(linesWidth, linesHeight);
        let currentLen = _linesPositions.length / 6;
        if(amount > currentLen) {
            _linesPositions = new Float32Array(amount * 6);
            _linesPositionAttribute = new THREE.BufferAttribute(_linesPositions, 3);
            //_linesGeometry.removeAttribute('position');
            _linesGeometry.setAttribute( 'position', _linesPositionAttribute );
        }
        let i6 = 0;
        let x, y;
        let size = linesWidth * linesHeight;
        for(i = 0; i < size; i++) {
            x = i % linesWidth;
            y = ~~(i / linesWidth);
            if(noDithering || ((x + (y & 1)) & 1)) {
                _linesPositions[i6 + 0] = _linesPositions[i6 + 3] = (x + 0.5) / linesWidth;
                _linesPositions[i6 + 1] = _linesPositions[i6 + 4] = (y + 0.5) / linesHeight;
                _linesPositions[i6 + 2] = 0;
                _linesPositions[i6 + 5] = (0.001 + 0.999 * Math.random());
                i6 += 6;
            }
        }
        _linesPositionAttribute.needsUpdate = true;
        _linesGeometry.drawRange.count = amount * 2;
    }

    _prevUseDithering = exports.useDithering;
    _prevUseSampling = exports.useSampling;

}

// dithering
function _getDitheringAmount(width, height) {
    if((width & 1) && (height & 1)) {
        return (((width - 1) * (height - 1)) >> 1) + (width >> 1) + (height >> 1);
    } else {
        return (width * height) >> 1;
    }
}

function render(dt, renderTarget, toScreen) {
    if (_prevUseDithering !== exports.useDithering || _prevUseSampling !== exports.useSampling) {
        resize();
    }

    const fpsRatio = Math.min(1000 / Math.max(dt, 16.667), exports.targetFPS) / exports.targetFPS;

    // Prepare motion render target
    _prepareMotionRenderTarget();

    if (!exports.useSampling) {
        _updateLinesMaterialUniforms(fpsRatio, renderTarget);
        _renderLines();
    }

    // Final compositing
    if (exports.useSampling) {
        _renderWithSampling(renderTarget, toScreen, fpsRatio);
    } else {
        this.uniforms.u_lineAlphaMultiplier.value = 1 + exports.useDithering;
        _super.render.call(this, dt, renderTarget, toScreen);
    }
}

function _prepareMotionRenderTarget() {
    const state = fboHelper.getColorState();
    effectComposer.renderer.setClearColor(0, 1);
    effectComposer.renderer.setRenderTarget(_motionRenderTarget);
    effectComposer.renderer.clear();
    effectComposer.renderer.setRenderTarget(null);

    effectComposer.scene.traverseVisible(_setObjectBeforeState);
    effectComposer.renderScene(_motionRenderTarget);
    _visibleCache.forEach(_setObjectAfterState);
    _visibleCache = [];
}

function _updateLinesMaterialUniforms(fpsRatio, renderTarget) {
    Object.assign(_linesMaterial.uniforms, {
        u_maxDistance: { value: exports.maxDistance },
        u_jitter: { value: exports.jitter },
        u_fadeStrength: { value: exports.fadeStrength },
        u_motionMultiplier: { value: exports.motionMultiplier * fpsRatio },
        u_depthTest: { value: exports.depthTest },
        u_opacity: { value: exports.opacity },
        u_leaning: { value: Math.max(0.001, Math.min(0.999, exports.leaning)) },
        u_depthBias: { value: Math.max(0.00001, exports.depthBias) },
        u_texture: { value: renderTarget.texture },
    });
}


function _setObjectBeforeState(obj) {
    if(obj.motionMaterial) {
        obj._tmpMaterial = obj.material;
        obj.material = obj.motionMaterial;
        obj.material.uniforms.u_motionMultiplier.value = obj.material.motionMultiplier;
    } else if(obj.material) {
        obj.visible = false;
    }

    _visibleCache.push(obj);
}

function _renderLines() {
    effectComposer.renderer.setClearColor(0, 0); // Set clear color for the lines render
    effectComposer.renderer.setRenderTarget(_linesRenderTarget); // Render to the lines render target
    effectComposer.renderer.clear(); // Clear the render target
    effectComposer.renderer.render(_linesScene, _linesCamera); // Render the lines scene using the lines camera
    effectComposer.renderer.setRenderTarget(null); // Reset render target to the default
}

function _setObjectAfterState(obj) {
    if(obj.motionMaterial) {
        obj.material = obj._tmpMaterial;
        obj._tmpMaterial = undef;
        if(!exports.skipMatrixUpdate) {
            obj.motionMaterial.uniforms.u_prevModelViewMatrix.value.copy(obj.modelViewMatrix);
        }
    } else {
        obj.visible = true;
    }
}
