// Uniforms: iResolution (vec3), iTime (float), iMouse (vec4)
const int MAX_ITER = 256;

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // TODO: c = centro + p * escala (com zoom no tempo)
    vec2 c = p * 3.0 - vec2(0.5, 0.0);

    vec2 z = vec2(0.0);
    int i;
    for (i = 0; i < MAX_ITER; i++) {
        // TODO: z = z^2 + c; pare quando |z| > 2
        break;
    }

    // TODO: preto dentro do conjunto, cor pelas iterações fora
    vec3 col = vec3(float(i) / float(MAX_ITER));
    fragColor = vec4(col, 1.0);
}
