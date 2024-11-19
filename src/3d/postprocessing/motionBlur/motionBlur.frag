uniform sampler2D u_texture;
uniform sampler2D u_linesTexture;
uniform float u_lineAlphaMultiplier;

varying vec2 v_uv;

void main() {
    // Sample the base texture (with alpha) and the lines texture
    vec4 base = texture2D(u_texture, v_uv.xy);
    vec4 lines = texture2D(u_linesTexture, v_uv.xy);

    // Calculate the combined RGB color
    vec3 color = (base.rgb + lines.rgb * u_lineAlphaMultiplier) / (lines.a * u_lineAlphaMultiplier + 1.0);

    // Preserve the alpha from the base texture, modulated by the line's alpha multiplier
    float alpha = base.a * (1.0 - lines.a * u_lineAlphaMultiplier);

    // Output the final color and alpha
    gl_FragColor = vec4(color, alpha);
}
