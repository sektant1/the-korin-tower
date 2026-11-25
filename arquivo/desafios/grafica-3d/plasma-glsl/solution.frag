// Plasma clássico: soma de senos + paleta de cossenos.
void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 uv = fragCoord / iResolution.xy;
    vec2 p = uv * 2.0 - 1.0;
    p.x *= iResolution.x / iResolution.y;

    // Bônus: o mouse puxa o centro dos anéis.
    vec2 m = iMouse.z > 0.0 ? (iMouse.xy / iResolution.xy) * 2.0 - 1.0 : vec2(0.0);
    float t = iTime;

    float v = 0.0;
    v += sin(p.x * 3.0 + t);
    v += sin((p.y * 3.0 + t) * 0.5);
    v += sin((p.x + p.y) * 2.5 + t * 0.7);
    v += sin(length(p - m) * 6.0 - t * 1.5);
    v *= 0.25;

    vec3 col = 0.5 + 0.5 * cos(6.2831 * (v + vec3(0.0, 0.33, 0.67) + t * 0.05));
    fragColor = vec4(col, 1.0);
}
