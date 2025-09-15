var settings = require('../core/settings');
var THREE = require('three');
var shaderParse = require('../helpers/shaderParse');
var glslify = require('glslify');
var simulator = require('./simulator');
var MeshMotionMaterial = require('./postprocessing/motionBlur/MeshMotionMaterial');

var undef;

var container = exports.container = undef;
exports.init = init;
exports.update = update;
exports.dispose = dispose;

var _renderer;
var _particleMesh;
var _triangleMesh;
var _meshes;

var _tmpColor;

// sim dims
var TEXTURE_WIDTH = settings.simulatorTextureWidth;
var TEXTURE_HEIGHT = settings.simulatorTextureHeight;
var AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

/* ========= Palette LERP state (time-based) ========= */
var _palettePrev = null;       // [THREE.Color x6]  current displayed start
var _paletteNext = null;       // [THREE.Color x6]  target to lerp to
var _paletteCountTarget = 2;   // target paletteCount for current _paletteNext
var _lerpStart = 0;            // performance.now() at start
var _lerpEnd = 0;              // performance.now() at end
var _lastTargetKey = '';       // joined string of hex6 to detect change
/* =================================================== */

var _getColors = function () {
    if (Array.isArray(settings.colors) && settings.colors.length >= 2) return settings.colors;
    return ['#ffffff', '#000000'];
};

function init(renderer, getColors, opts) {
    _getColors = getColors || _getColors;

    container = exports.container = new THREE.Object3D();

    _tmpColor = new THREE.Color();

    _meshes = [
        _triangleMesh = _createTriangleMesh(),
        _particleMesh = _createParticleMesh()
    ];
    _triangleMesh.visible = false;
    _particleMesh.visible = false;

    _renderer = renderer;

    // initial palette -> set immediately
    var hex6 = _normHexArray(_getColors());
    _setImmediatePalette(hex6);
}

function _now() {
    if (typeof performance !== 'undefined' && performance.now) return performance.now();
    return Date.now();
}

function _smoothstep(t) {
    // cubic smoothstep 0..1
    t = Math.max(0, Math.min(1, t));
    return t * t * (3 - 2 * t);
}

function _normHexArray(cols) {
    if (!Array.isArray(cols) || cols.length < 2) cols = ['#ffffff', '#000000'];
    var last = cols[cols.length - 1] || '#000000';
    var arr = [];
    for (var i = 0; i < 6; i++) arr[i] = cols[i] || last;
    return arr.slice(0, 6);
}

function _hexToColorArray(hex6) {
    return hex6.map(function (h) { return new THREE.Color(h); });
}

function _colorArrayClone(arr) {
    return arr.map(function (c) { return c.clone(); });
}

function _paletteCountForHex(hex6) {
    var tmp = _tmpColor || new THREE.Color();
    var count = 0;
    for (var j = 0; j < 6; j++) {
        tmp.setStyle(hex6[j]);
        var isBlack = (tmp.r === 0 && tmp.g === 0 && tmp.b === 0);
        if (!isBlack) count = j + 1;
    }
    return Math.max(2, count);
}

function _readCurrentUniformColors() {
    // read from particle material if available, fallback to triangle
    var m = _particleMesh && _particleMesh.material;
    if (!m || !m.uniforms) m = _triangleMesh && _triangleMesh.material;
    var out = [];
    if (m && m.uniforms && m.uniforms.palette0) {
        for (var i = 0; i < 6; i++) {
            var u = m.uniforms['palette' + i];
            out[i] = (u && u.value) ? u.value.clone() : new THREE.Color(0,0,0);
        }
    } else {
        // fallback: use target colors
        out = _hexToColorArray(_normHexArray(_getColors()));
    }
    return out;
}

function _setImmediatePalette(hex6) {
    var colors = _hexToColorArray(hex6);
    _palettePrev = _colorArrayClone(colors);
    _paletteNext = _colorArrayClone(colors);
    _paletteCountTarget = _paletteCountForHex(hex6);
    _lerpStart = _lerpEnd = _now();
    _writeUniforms(colors, _paletteCountTarget);
}

function _beginLerpTo(hex6) {
    var target = _hexToColorArray(hex6);
    var currentDisplayed = _readCurrentUniformColors(); // start from what's on-screen now
    _palettePrev = currentDisplayed;
    _paletteNext = target;
    _paletteCountTarget = _paletteCountForHex(hex6);

    var dur = typeof settings.paletteLerpSeconds === 'number' ? settings.paletteLerpSeconds : 0.6;
    dur = Math.max(0, dur);
    var t0 = _now();
    _lerpStart = t0;
    _lerpEnd = t0 + dur * 1000.0;

    // if duration == 0 → snap
    if (dur === 0) {
        _writeUniforms(_paletteNext, _paletteCountTarget);
        _lerpStart = _lerpEnd = _now();
    }
}

function _maybeStartNewLerpFromSettings() {
    var targetHex = _normHexArray(_getColors());
    var key = targetHex.join('|');
    if (key !== _lastTargetKey) {
        _lastTargetKey = key;
        if (!_palettePrev || !_paletteNext) {
            _setImmediatePalette(targetHex);
        } else {
            _beginLerpTo(targetHex);
        }
    }
}

function _lerpedColorsAtNow() {
    if (!_palettePrev || !_paletteNext) return _hexToColorArray(_normHexArray(_getColors()));
    var t;
    if (_lerpEnd <= _lerpStart) t = 1.0;
    else t = Math.max(0, Math.min(1, (_now() - _lerpStart) / (_lerpEnd - _lerpStart)));
    var e = _smoothstep(t);
    var out = new Array(6);
    for (var i = 0; i < 6; i++) {
        // out[i] = prev + e*(next-prev)
        out[i] = _palettePrev[i].clone().lerp(_paletteNext[i], e);
    }
    return out;
}

function _writeUniforms(colors /* THREE.Color[6] */, paletteCount) {
    var mats = [];
    if (_particleMesh) mats.push(_particleMesh.material, _particleMesh.customDistanceMaterial, _particleMesh.motionMaterial);
    if (_triangleMesh) mats.push(_triangleMesh.material, _triangleMesh.customDistanceMaterial, _triangleMesh.motionMaterial);

    for (var m = 0; m < mats.length; m++) {
        var mat = mats[m];
        if (!mat || !mat.uniforms) continue;
        for (var i = 0; i < 6; i++) {
            var key = 'palette' + i;
            var u = mat.uniforms[key];
            if (!u || !u.value) mat.uniforms[key] = { value: colors[i].clone() };
            else u.value.copy(colors[i]);
        }
        if (!mat.uniforms.paletteCount) mat.uniforms.paletteCount = { value: paletteCount };
        else mat.uniforms.paletteCount.value = paletteCount;

        if (!mat.uniforms.lifeCurveExp) mat.uniforms.lifeCurveExp = { value: 1.0 };

        // IMPORTANT: do NOT set mat.needsUpdate here. Uniform changes don’t require recompile.
    }
}

/* ---------- mesh creation (unchanged shaders) ---------- */
function _createParticleMesh() {
    var position = new Float32Array(AMOUNT * 3);
    for (var i = 0; i < AMOUNT; i++) {
        var i3 = i * 3;
        position[i3 + 0] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        position[i3 + 1] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));

    var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.shadowmap,
            {
                texturePosition: { type: 't', value: undef },
                palette0: { type: 'c', value: new THREE.Color(0x000000) },
                palette1: { type: 'c', value: new THREE.Color(0x000000) },
                palette2: { type: 'c', value: new THREE.Color(0x000000) },
                palette3: { type: 'c', value: new THREE.Color(0x000000) },
                palette4: { type: 'c', value: new THREE.Color(0x000000) },
                palette5: { type: 'c', value: new THREE.Color(0x000000) },
                paletteCount: { type: 'f', value: 2.0 },
                lifeCurveExp: { type: 'f', value: 1.0 }
            }
        ]),
        vertexShader: shaderParse(glslify('../glsl/particles.vert')),
        fragmentShader: shaderParse(glslify('../glsl/particles.frag')),
        blending: THREE.NoBlending
    });

    // initialize uniforms from current settings immediately
    var hex6 = _normHexArray(_getColors());
    _setImmediatePalette(hex6);
    _writeUniforms(_paletteNext, _paletteCountTarget);

    var mesh = new THREE.Points(geometry, material);

    mesh.customDistanceMaterial = new THREE.ShaderMaterial({
        uniforms: {
            lightPos:        { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
            texturePosition: { type: 't',  value: undef },
            palette0: { type: 'c', value: new THREE.Color(0x000000) },
            palette1: { type: 'c', value: new THREE.Color(0x000000) },
            palette2: { type: 'c', value: new THREE.Color(0x000000) },
            palette3: { type: 'c', value: new THREE.Color(0x000000) },
            palette4: { type: 'c', value: new THREE.Color(0x000000) },
            palette5: { type: 'c', value: new THREE.Color(0x000000) },
            paletteCount: { type: 'f', value: 2.0 },
            lifeCurveExp: { type: 'f', value: 1.0 }
        },
        vertexShader: shaderParse(glslify('../glsl/particlesDistance.vert')),
        fragmentShader: shaderParse(glslify('../glsl/particlesDistance.frag')),
        depthTest: true,
        depthWrite: true,
        side: THREE.BackSide,
        blending: THREE.NoBlending
    });

    mesh.motionMaterial = new MeshMotionMaterial({
        uniforms: {
            texturePosition:     { type: 't', value: undef },
            texturePrevPosition: { type: 't', value: undef },
            palette0: { type: 'c', value: new THREE.Color(0x000000) },
            palette1: { type: 'c', value: new THREE.Color(0x000000) },
            palette2: { type: 'c', value: new THREE.Color(0x000000) },
            palette3: { type: 'c', value: new THREE.Color(0x000000) },
            palette4: { type: 'c', value: new THREE.Color(0x000000) },
            palette5: { type: 'c', value: new THREE.Color(0x000000) },
            paletteCount: { type: 'f', value: 2.0 },
            lifeCurveExp: { type: 'f', value: 1.0 }
        },
        vertexShader: shaderParse(glslify('../glsl/particlesMotion.vert')),
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending
    });

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    container.add(mesh);

    material.needsUpdate = true;
    return mesh;
}

function _createTriangleMesh() {
    var position = new Float32Array(AMOUNT * 3 * 3);
    var positionFlip = new Float32Array(AMOUNT * 3 * 3);
    var fboUV = new Float32Array(AMOUNT * 2 * 3);

    var PI = Math.PI;
    var angle = PI * 2 / 3;
    var angles = [
        Math.sin(angle * 2 + PI), Math.cos(angle * 2 + PI),
        Math.sin(angle + PI), Math.cos(angle + PI),
        Math.sin(angle * 3 + PI), Math.cos(angle * 3 + PI),
        Math.sin(angle * 2), Math.cos(angle * 2),
        Math.sin(angle), Math.cos(angle),
        Math.sin(angle * 3), Math.cos(angle * 3)
    ];
    var i6, i9;
    for (var i = 0; i < AMOUNT; i++) {
        i6 = i * 6;
        i9 = i * 9;
        if (i % 2) {
            position[i9 + 0] = angles[0]; position[i9 + 1] = angles[1];
            position[i9 + 3] = angles[2]; position[i9 + 4] = angles[3];
            position[i9 + 6] = angles[4]; position[i9 + 7] = angles[5];

            positionFlip[i9 + 0] = angles[6]; positionFlip[i9 + 1] = angles[7];
            positionFlip[i9 + 3] = angles[8]; positionFlip[i9 + 4] = angles[9];
            positionFlip[i9 + 6] = angles[10]; positionFlip[i9 + 7] = angles[11];
        } else {
            positionFlip[i9 + 0] = angles[0]; positionFlip[i9 + 1] = angles[1];
            positionFlip[i9 + 3] = angles[2]; positionFlip[i9 + 4] = angles[3];
            positionFlip[i9 + 6] = angles[4]; positionFlip[i9 + 7] = angles[5];

            position[i9 + 0] = angles[6]; position[i9 + 1] = angles[7];
            position[i9 + 3] = angles[8]; position[i9 + 4] = angles[9];
            position[i9 + 6] = angles[10]; position[i9 + 7] = angles[11];
        }

        fboUV[i6 + 0] = fboUV[i6 + 2] = fboUV[i6 + 4] = (i % TEXTURE_WIDTH) / TEXTURE_WIDTH;
        fboUV[i6 + 1] = fboUV[i6 + 3] = fboUV[i6 + 5] = ~~(i / TEXTURE_WIDTH) / TEXTURE_HEIGHT;
    }
    var geometry = new THREE.BufferGeometry();
    geometry.addAttribute('position', new THREE.BufferAttribute(position, 3));
    geometry.addAttribute('positionFlip', new THREE.BufferAttribute(positionFlip, 3));
    geometry.addAttribute('fboUV', new THREE.BufferAttribute(fboUV, 2));

    var material = new THREE.ShaderMaterial({
        uniforms: THREE.UniformsUtils.merge([
            THREE.UniformsLib.shadowmap,
            {
                texturePosition: { type: 't', value: undef },
                flipRatio: { type: 'f', value: 0 },
                palette0: { type: 'c', value: new THREE.Color(0x000000) },
                palette1: { type: 'c', value: new THREE.Color(0x000000) },
                palette2: { type: 'c', value: new THREE.Color(0x000000) },
                palette3: { type: 'c', value: new THREE.Color(0x000000) },
                palette4: { type: 'c', value: new THREE.Color(0x000000) },
                palette5: { type: 'c', value: new THREE.Color(0x000000) },
                paletteCount: { type: 'f', value: 2.0 },
                lifeCurveExp: { type: 'f', value: 1.0 },
                cameraMatrix: { type: 'm4', value: undef }
            }
        ]),
        vertexShader: shaderParse(glslify('../glsl/triangles.vert')),
        fragmentShader: shaderParse(glslify('../glsl/particles.frag')),
        blending: THREE.NoBlending
    });

    // init uniforms
    var hex6 = _normHexArray(_getColors());
    _setImmediatePalette(hex6);
    _writeUniforms(_paletteNext, _paletteCountTarget);
    material.uniforms.cameraMatrix.value = settings.camera.matrixWorld;

    var mesh = new THREE.Mesh(geometry, material);

    mesh.customDistanceMaterial = new THREE.ShaderMaterial({
        uniforms: {
            lightPos:        { type: 'v3', value: new THREE.Vector3(0, 0, 0) },
            texturePosition: { type: 't',  value: undef },
            flipRatio:       { type: 'f',  value: 0 },
            palette0: { type: 'c', value: new THREE.Color(0x000000) },
            palette1: { type: 'c', value: new THREE.Color(0x000000) },
            palette2: { type: 'c', value: new THREE.Color(0x000000) },
            palette3: { type: 'c', value: new THREE.Color(0x000000) },
            palette4: { type: 'c', value: new THREE.Color(0x000000) },
            palette5: { type: 'c', value: new THREE.Color(0x000000) },
            paletteCount: { type: 'f', value: 2.0 },
            lifeCurveExp: { type: 'f', value: 1.0 }
        },
        vertexShader: shaderParse(glslify('../glsl/trianglesDistance.vert')),
        fragmentShader: shaderParse(glslify('../glsl/particlesDistance.frag')),
        depthTest: true,
        depthWrite: true,
        side: THREE.BackSide,
        blending: THREE.NoBlending
    });

    mesh.motionMaterial = new MeshMotionMaterial({
        uniforms: {
            texturePosition:     { type: 't', value: undef },
            texturePrevPosition: { type: 't', value: undef },
            flipRatio:           { type: 'f', value: 0 },
            palette0: { type: 'c', value: new THREE.Color(0x000000) },
            palette1: { type: 'c', value: new THREE.Color(0x000000) },
            palette2: { type: 'c', value: new THREE.Color(0x000000) },
            palette3: { type: 'c', value: new THREE.Color(0x000000) },
            palette4: { type: 'c', value: new THREE.Color(0x000000) },
            palette5: { type: 'c', value: new THREE.Color(0x000000) },
            paletteCount: { type: 'f', value: 2.0 },
            lifeCurveExp: { type: 'f', value: 1.0 }
        },
        vertexShader: shaderParse(glslify('../glsl/trianglesMotion.vert')),
        depthTest: true,
        depthWrite: true,
        side: THREE.DoubleSide,
        blending: THREE.NoBlending
    });

    mesh.castShadow = true;
    mesh.receiveShadow = true;
    container.add(mesh);

    material.needsUpdate = true;
    return mesh;
}

/* ================== MAIN UPDATE ================== */
function update(dt) {
    if (!simulator.positionRenderTarget || !simulator.prevPositionRenderTarget) {
        if (!update._warnedOnce) {
            console.warn('[particles] sim targets not ready yet');
            update._warnedOnce = true;
        }
        return;
    }

    // detect target change & start new lerp if needed
    _maybeStartNewLerpFromSettings();

    // compute current lerped colors and write to uniforms
    var colorsNow = _lerpedColorsAtNow();
    _writeUniforms(colorsNow, _paletteCountTarget);

    // mesh vis + sim textures + flip
    var mesh;
    _triangleMesh.visible = settings.useTriangleParticles;
    _particleMesh.visible = !settings.useTriangleParticles;

    for (var i = 0; i < 2; i++) {
        mesh = _meshes[i];
        mesh.material.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.customDistanceMaterial.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.motionMaterial.uniforms.texturePrevPosition.value = simulator.prevPositionRenderTarget;

        if (mesh.material.uniforms.flipRatio !== undefined) {
            mesh.material.uniforms.flipRatio.value ^= 1;
            mesh.customDistanceMaterial.uniforms.flipRatio.value ^= 1;
            mesh.motionMaterial.uniforms.flipRatio.value ^= 1;
        }
    }
}
/* ================================================ */

function _disposeMaterial(mat) {
    if (!mat) return;
    try {
        if (mat.uniforms) {
            Object.keys(mat.uniforms).forEach(function (k) {
                var v = mat.uniforms[k] && mat.uniforms[k].value;
                if (v && typeof v.dispose === 'function') {
                    try { v.dispose(); } catch (_) { }
                }
            });
        }
        mat.dispose && mat.dispose();
    } catch (_) { }
}

function dispose() {
    if (!container) return;

    [_particleMesh, _triangleMesh].forEach(function (m) {
        if (!m) return;
        try { container.remove(m); } catch (_) { }
        try { m.geometry && m.geometry.dispose(); } catch (_) { }
        _disposeMaterial(m.material);
        _disposeMaterial(m.customDistanceMaterial);
        _disposeMaterial(m.motionMaterial);
    });

    try {
        if (container.parent) container.parent.remove(container);
    } catch (_) { }
    container = exports.container = null;

    _renderer = null;
    _particleMesh = null;
    _triangleMesh = null;
    _meshes = null;
    _tmpColor = null;

    _palettePrev = _paletteNext = null;
    _lastTargetKey = '';
    _lerpStart = _lerpEnd = 0;
}
