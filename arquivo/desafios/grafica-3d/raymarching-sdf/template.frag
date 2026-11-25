// Uniforms: iResolution (vec3), iTime (float), iMouse (vec4)

// Distância com sinal da cena inteira.
float map(vec3 p) {
    // TODO: esfera + chão (min das duas SDFs)
    return length(p - vec3(0.0, 1.0, 0.0)) - 1.0;
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;
    vec3 ro = vec3(0.0, 1.0, -4.0);      // origem da câmera
    vec3 rd = normalize(vec3(p, 1.5));   // direção do raio

    // TODO: ray marching, normal, luz difusa e sombra
    vec3 col = vec3(0.5, 0.7, 1.0) - 0.5 * rd.y; // céu

    fragColor = vec4(col, 1.0);
}
