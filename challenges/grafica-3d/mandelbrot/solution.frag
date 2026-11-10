// Zoom contínuo na borda do Mandelbrot com coloração suave.
const int MAX_ITER = 300;

vec3 palette(float t) {
    return 0.5 + 0.5 * cos(6.2831 * (t + vec3(0.0, 0.10, 0.20)));
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Zoom em ciclos de 20 s: depois disso o float de 32 bits não tem precisão.
    float t = mod(iTime, 20.0);
    float scale = 2.5 * exp(-t * 0.45);
    vec2 center = vec2(-0.743643887, 0.131825904);
    vec2 c = center + p * scale;

    vec2 z = vec2(0.0);
    float escaped = -1.0;
    for (int i = 0; i < MAX_ITER; i++) {
        z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
        float r2 = dot(z, z);
        if (r2 > 256.0) { // raio de escape maior deixa o "smooth" mais preciso
            escaped = float(i) - log2(log2(r2)) + 4.0;
            break;
        }
    }

    vec3 col = escaped < 0.0 ? vec3(0.0) : palette(escaped * 0.02 + t * 0.03);
    fragColor = vec4(col, 1.0);
}
