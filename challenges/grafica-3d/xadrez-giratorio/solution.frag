// Tabuleiro girando em torno do centro, com zoom pulsante e vinheta.
mat2 rot(float a) {
    float c = cos(a), s = sin(a);
    return mat2(c, -s, s, c);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    // Centro em (0,0) e y de -0.5 a 0.5: casas quadradas em qualquer tela.
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Bônus: arrastar o mouse controla o ângulo.
    float angle = iMouse.z > 0.0 ? (iMouse.x / iResolution.x) * 6.2831 : iTime * 0.5;
    vec2 q = rot(angle) * p;
    q *= 8.0 * (1.0 + 0.35 * sin(iTime * 1.3));

    vec2 cell = floor(q);
    float check = mod(cell.x + cell.y, 2.0);

    vec3 a = vec3(0.95, 0.85, 0.30); // dourado
    vec3 b = vec3(0.10, 0.12, 0.35); // azul-noite
    vec3 col = mix(a, b, check);

    col *= 1.0 - 0.8 * dot(p, p); // vinheta
    fragColor = vec4(col, 1.0);
}
