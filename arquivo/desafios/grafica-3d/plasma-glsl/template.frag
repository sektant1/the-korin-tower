// Uniforms: iResolution (vec3), iTime (float), iMouse (vec4)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;

    // TODO: troque este gradiente por um plasma animado
    vec3 col = vec3(uv, 0.5 + 0.5 * sin(iTime));

    fragColor = vec4(col, 1.0);
}
