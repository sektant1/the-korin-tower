#include "raylib.h"

#define LARGURA 640
#define ALTURA 360
#define RAIO 20.0f

int main(void) {
    InitWindow(LARGURA, ALTURA, "Bolinha quicando");
    SetTargetFPS(60);

    Vector2 pos = { LARGURA / 2.0f, ALTURA / 2.0f };
    Vector2 vel = { 220.0f, 160.0f }; /* pixels por segundo */
    Color cor = YELLOW;

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();

        /* TODO: mover a bola usando vel e dt */
        /* TODO: quicar nas quatro bordas e trocar a cor a cada batida */
        (void)dt;
        (void)vel;

        BeginDrawing();
        ClearBackground((Color){ 0, 0, 16, 255 });
        DrawCircleV(pos, RAIO, cor);
        DrawText("faca a bola quicar!", 10, 10, 20, RAYWHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
