#include "raylib.h"

#define LARGURA 640
#define ALTURA 360
#define RAIO 20.0f

static const Color CORES[] = { YELLOW, LIME, SKYBLUE, MAGENTA, ORANGE, RAYWHITE };
#define N_CORES (int)(sizeof CORES / sizeof CORES[0])

int main(void) {
    InitWindow(LARGURA, ALTURA, "Bolinha quicando");
    SetTargetFPS(60);

    Vector2 pos = { LARGURA / 2.0f, ALTURA / 2.0f };
    Vector2 vel = { 220.0f, 160.0f }; /* pixels por segundo */
    int cor = 0;

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        pos.x += vel.x * dt;
        pos.y += vel.y * dt;

        /* Inverte a velocidade e recoloca a bola dentro, para ela não grudar na parede. */
        if (pos.x - RAIO < 0)        { pos.x = RAIO;           vel.x = -vel.x; cor++; }
        if (pos.x + RAIO > LARGURA)  { pos.x = LARGURA - RAIO; vel.x = -vel.x; cor++; }
        if (pos.y - RAIO < 0)        { pos.y = RAIO;           vel.y = -vel.y; cor++; }
        if (pos.y + RAIO > ALTURA)   { pos.y = ALTURA - RAIO;  vel.y = -vel.y; cor++; }

        BeginDrawing();
        ClearBackground((Color){ 0, 0, 16, 255 });
        DrawCircleV(pos, RAIO, CORES[cor % N_CORES]);
        DrawText(TextFormat("batidas: %d", cor), 10, 10, 20, RAYWHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
