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

var TEXTURE_WIDTH = settings.simulatorTextureWidth;
var TEXTURE_HEIGHT = settings.simulatorTextureHeight;
var AMOUNT = TEXTURE_WIDTH * TEXTURE_HEIGHT;

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
}

function _applyPaletteToUniforms(uniforms, cols) {
    var last = cols[cols.length - 1] || '#000000';
    var arr = [];
    for (var i = 0; i < 6; i++) arr[i] = cols[i] || last;

    // push colors
    ['palette0','palette1','palette2','palette3','palette4','palette5'].forEach(function (key, i) {
        var u = uniforms[key];
        if (!u || !u.value) uniforms[key] = { value: new THREE.Color(arr[i]) };
        else u.value.setStyle(arr[i]);
    });

    // paletteCount = index of last non-black (min 2)
    var tmp = _tmpColor || new THREE.Color();
    var count = 0;
    for (var j = 0; j < 6; j++) {
        tmp.setStyle(arr[j]);
        var isBlack = (tmp.r === 0 && tmp.g === 0 && tmp.b === 0);
        if (!isBlack) count = j + 1;
    }
    if (count < 2) count = 2;

    if (!uniforms.paletteCount) uniforms.paletteCount = { value: count };
    else uniforms.paletteCount.value = count;

    // ensure lifeCurveExp exists (1.0 = equal span)
    if (!uniforms.lifeCurveExp) uniforms.lifeCurveExp = { value: 1.0 };
}

function _refreshPaletteUniforms(baseMaterial) {
    var cols = _getColors();
    if (!Array.isArray(cols)) cols = ['#ffffff', '#000000'];
    if (cols.length < 2) cols = ['#ffffff', '#000000'];
    if (cols.length > 6) cols = cols.slice(0, 6);

    var mats = [baseMaterial, baseMaterial && baseMaterial.customDistanceMaterial, baseMaterial && baseMaterial.motionMaterial];
    mats.forEach(function (m) {
        if (!m || !m.uniforms) return;
        _applyPaletteToUniforms(m.uniforms, cols);
    });
}

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

    _refreshPaletteUniforms(material);

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

    _refreshPaletteUniforms(material);
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

function update(dt) {
    if (!simulator.positionRenderTarget || !simulator.prevPositionRenderTarget) {
        if (!update._warnedOnce) {
            console.warn('[particles] sim targets not ready yet');
            update._warnedOnce = true;
        }
        return;
    }

    var mesh;
    _triangleMesh.visible = settings.useTriangleParticles;
    _particleMesh.visible = !settings.useTriangleParticles;

    for (var i = 0; i < 2; i++) {
        mesh = _meshes[i];
        mesh.material.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.customDistanceMaterial.uniforms.texturePosition.value = simulator.positionRenderTarget;
        mesh.motionMaterial.uniforms.texturePrevPosition.value = simulator.prevPositionRenderTarget;

        _refreshPaletteUniforms(mesh.material);

        if (mesh.material.uniforms.flipRatio !== undefined) {
            mesh.material.uniforms.flipRatio.value ^= 1;
            mesh.customDistanceMaterial.uniforms.flipRatio.value ^= 1;
            mesh.motionMaterial.uniforms.flipRatio.value ^= 1;
        }
    }
}

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
}
