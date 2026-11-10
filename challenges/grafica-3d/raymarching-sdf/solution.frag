// Esfera quicando sobre um chão quadriculado: ray marching, Lambert, sombra suave e fog.
const int STEPS = 128;
const float FAR = 40.0;

float smin(float a, float b, float k) {
    float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
    return mix(b, a, h) - k * h * (1.0 - h);
}

float map(vec3 p) {
    float bounce = abs(sin(iTime * 2.0)) * 1.2;
    float ball = length(p - vec3(0.0, 1.0 + bounce, 0.0)) - 1.0;
    float buddy = length(p - vec3(1.4 * cos(iTime), 0.6, 1.4 * sin(iTime))) - 0.5; // orbita a esfera
    float ground = p.y;
    return min(smin(ball, buddy, 0.4), ground);
}

vec3 normal(vec3 p) {
    vec2 e = vec2(0.001, 0.0);
    return normalize(vec3(map(p + e.xyy) - map(p - e.xyy), map(p + e.yxy) - map(p - e.yxy), map(p + e.yyx) - map(p - e.yyx)));
}

float march(vec3 ro, vec3 rd) {
    float t = 0.0;
    for (int i = 0; i < STEPS; i++) {
        float d = map(ro + rd * t);
        if (d < 0.001) return t;
        t += d;
        if (t > FAR) break;
    }
    return -1.0;
}

// Sombra suave (Inigo Quilez): quanto mais perto o raio passa de algo, mais escuro.
float softShadow(vec3 ro, vec3 rd, float k) {
    float res = 1.0;
    float t = 0.02;
    for (int i = 0; i < 64; i++) {
        float d = map(ro + rd * t);
        if (d < 0.0005) return 0.0;
        res = min(res, k * d / t);
        t += clamp(d, 0.02, 0.5);
        if (t > 20.0) break;
    }
    return clamp(res, 0.0, 1.0);
}

void mainImage(out vec4 fragColor, in vec2 fragCoord) {
    vec2 p = (fragCoord - 0.5 * iResolution.xy) / iResolution.y;

    // Câmera orbitando devagar, olhando para a esfera.
    float a = iTime * 0.2;
    vec3 ro = vec3(5.0 * sin(a), 2.2, -5.0 * cos(a));
    vec3 target = vec3(0.0, 1.0, 0.0);
    vec3 fw = normalize(target - ro);
    vec3 rt = normalize(cross(vec3(0.0, 1.0, 0.0), fw));
    vec3 up = cross(fw, rt);
    vec3 rd = normalize(p.x * rt + p.y * up + 1.5 * fw);

    vec3 sky = vec3(0.55, 0.75, 1.0) - 0.4 * rd.y;
    vec3 col = sky;

    float t = march(ro, rd);
    if (t > 0.0) {
        vec3 pos = ro + rd * t;
        vec3 n = normal(pos);
        vec3 light = normalize(vec3(0.6, 0.8, -0.4));

        vec3 albedo = vec3(0.9, 0.35, 0.15); // esferas laranja (Dragon Ball!)
        if (pos.y < 0.001) {
            float check = mod(floor(pos.x) + floor(pos.z), 2.0);
            albedo = mix(vec3(0.85), vec3(0.25), check);
        }

        float diff = max(dot(n, light), 0.0);
        float shadow = softShadow(pos + n * 0.01, light, 12.0);
        float amb = 0.15 + 0.1 * n.y;
        col = albedo * (amb + diff * shadow);

        // Brilho especular simples.
        vec3 h = normalize(light - rd);
        col += 0.3 * pow(max(dot(n, h), 0.0), 32.0) * shadow;

        col = mix(col, sky, 1.0 - exp(-0.002 * t * t)); // fog
    }

    col = pow(col, vec3(0.4545)); // gama
    fragColor = vec4(col, 1.0);
}
