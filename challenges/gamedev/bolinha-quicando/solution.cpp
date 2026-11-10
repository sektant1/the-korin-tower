#include "raylib.h"

#include <array>

constexpr int LARGURA = 640;
constexpr int ALTURA = 360;
constexpr float RAIO = 20.0f;

int main() {
    InitWindow(LARGURA, ALTURA, "Bolinha quicando");
    SetTargetFPS(60);

    const std::array<Color, 6> cores{ YELLOW, LIME, SKYBLUE, MAGENTA, ORANGE, RAYWHITE };
    Vector2 pos{ LARGURA / 2.0f, ALTURA / 2.0f };
    Vector2 vel{ 220.0f, 160.0f }; // pixels por segundo
    int batidas = 0;

    // Quica num eixo: inverte a velocidade e recoloca a bola dentro, para ela não grudar na parede.
    auto quicar = [&batidas](float& p, float& v, float limite) {
        if (p - RAIO < 0) {
            p = RAIO;
            v = -v;
            batidas++;
        } else if (p + RAIO > limite) {
            p = limite - RAIO;
            v = -v;
            batidas++;
        }
    };

    while (!WindowShouldClose()) {
        float dt = GetFrameTime();
        pos.x += vel.x * dt;
        pos.y += vel.y * dt;
        quicar(pos.x, vel.x, LARGURA);
        quicar(pos.y, vel.y, ALTURA);

        BeginDrawing();
        ClearBackground(Color{ 0, 0, 16, 255 });
        DrawCircleV(pos, RAIO, cores[batidas % cores.size()]);
        DrawText(TextFormat("batidas: %d", batidas), 10, 10, 20, RAYWHITE);
        EndDrawing();
    }

    CloseWindow();
    return 0;
}
