// Uniforms: iResolution (vec3), iTime (float), iMouse (vec4)
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // TODO: centralize e corrija a proporção (dica 1)
    vec2 p = fragCoord / iResolution.xy;

    // TODO: gire p com o tempo, aplique o zoom pulsante e faça o quadriculado
    vec3 col = vec3(p, 0.0);

    fragColor = vec4(col, 1.0);
}
