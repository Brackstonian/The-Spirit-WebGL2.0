#include <common>
#include <packing>
#include <lights_pars_begin>
#include <shadowmap_pars_fragment>
#include <shadowmask_pars_fragment>
#include <fog_pars_fragment>

varying float vLife;
uniform vec3 color1;
uniform vec3 color2;

void main() {

    vec3 outgoingLight = mix(color2, color1, smoothstep(0.0, 0.7, vLife));
	
    outgoingLight *=  getShadowMask();

	outgoingLight = pow( outgoingLight, vec3( 1.0 / 2.2 ) );

    gl_FragColor = vec4( outgoingLight, 0.1 );
	
	#include <fog_fragment>
}