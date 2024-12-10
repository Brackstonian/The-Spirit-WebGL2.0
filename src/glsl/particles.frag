#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <fog_pars_fragment>

varying float vLife;
uniform vec3 color1;
uniform vec3 color2;
uniform float shadowIntensity; // Add a uniform to control shadow intensity

void main() {

    vec3 outgoingLight = mix(color2, color1, smoothstep(0.0, 0.7, vLife));
    
    // Modify the shadow mask application to make shadows less dark
    float shadow = getShadowMask();
    shadow = mix(1.0, shadow, shadowIntensity); // Blend shadow mask with lighter value

    outgoingLight *= shadow;

    // Apply gamma correction
    outgoingLight = pow(outgoingLight, vec3(1.0 / 2.2));

    gl_FragColor = vec4(outgoingLight, 1.0);

    #include <fog_fragment>
}
