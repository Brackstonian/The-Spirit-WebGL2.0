uniform sampler2D u_texture;
uniform sampler2D u_blurTexture;

uniform float u_amount;

varying vec2 v_uv;

void main()
{
    // Sample base color and blur color
    vec4 baseColor = texture2D(u_texture, v_uv);
    vec4 blurColor = texture2D(u_blurTexture, v_uv);

    // Blend the colors using the bloom amount
    vec3 color = mix(baseColor.rgb, 1.0 - ((1.0 - baseColor.rgb) * (1.0 - blurColor.rgb)), u_amount);

    // Preserve the alpha from the base texture
    float alpha = baseColor.a;

    // Output the final color with preserved alpha
    gl_FragColor = vec4(color, alpha);
}
