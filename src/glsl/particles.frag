// chunk(common);
// chunk(fog_pars_fragment);
// chunk(shadowmap_pars_fragment);

varying float vLife;

// Fixed-size palette uniforms (up to 6 stops)
uniform vec3  palette0;
uniform vec3  palette1;
uniform vec3  palette2;
uniform vec3  palette3;
uniform vec3  palette4;
uniform vec3  palette5;
uniform float paletteCount;   // float for WebGL1 safety

// Optional shaping if you want to tweak distribution later (1.0 = linear)
uniform float lifeCurveExp;   // set to 1.0 if you want strict equality

vec3 getStop(float idx) {
    if (idx < 0.5) return palette0;
    if (idx < 1.5) return palette1;
    if (idx < 2.5) return palette2;
    if (idx < 3.5) return palette3;
    if (idx < 4.5) return palette4;
    return palette5;
}

vec3 samplePaletteEqual(float t) {
    // guard: at least two stops
    float count = (paletteCount < 2.0) ? 2.0 : paletteCount;

    // equal segment length from 0..1 across (count-1) segments
    float segs   = count - 1.0;
    float x      = clamp(t, 0.0, 1.0) * segs;
    float iFloat = floor(x);                 // segment index
    float f      = fract(x);                 // intra-segment lerp 0..1

    // clamp index to valid range [0, count-2]
    float maxIdx = max(0.0, count - 2.0);
    iFloat = clamp(iFloat, 0.0, maxIdx);

    // fetch the two neighbors (no dynamic array indexing in WebGL1)
    vec3 c0 = getStop(iFloat);
    vec3 c1 = getStop(iFloat + 1.0);

    return mix(c0, c1, f);
}

void main() {
    // life -> t. keep it linear so each color spans the same length
    float t = clamp(pow(clamp(vLife, 0.0, 1.0), lifeCurveExp), 0.0, 1.0);

    vec3 outgoingLight = samplePaletteEqual(t);

    // chunk(shadowmap_fragment);
    outgoingLight *= shadowMask;

    // chunk(fog_fragment);
    // chunk(linear_to_gamma_fragment);

    gl_FragColor = vec4(outgoingLight, 1.0);
}
