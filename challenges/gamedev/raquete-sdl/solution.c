#include <SDL2/SDL.h>
#include <stdio.h>

#define LARGURA 640
#define ALTURA 360
#define VEL 420.0f /* pixels por segundo */

int main(void) {
    if (SDL_Init(SDL_INIT_VIDEO) != 0) {
        printf("SDL_Init falhou: %s\n", SDL_GetError());
        return 1;
    }
    SDL_Window *janela = NULL;
    SDL_Renderer *r = NULL;
    SDL_CreateWindowAndRenderer(LARGURA, ALTURA, 0, &janela, &r);

    SDL_Rect raquete = { LARGURA / 2 - 50, ALTURA - 30, 100, 14 };
    float x = (float)raquete.x;
    Uint32 antes = SDL_GetTicks();

    int rodando = 1;
    while (rodando) {
        SDL_Event e;
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) rodando = 0;
        }

        Uint32 agora = SDL_GetTicks();
        float dt = (agora - antes) / 1000.0f;
        antes = agora;

        /* Estado das teclas, não eventos: movimento contínuo enquanto a tecla estiver apertada. */
        const Uint8 *teclas = SDL_GetKeyboardState(NULL);
        if (teclas[SDL_SCANCODE_LEFT] || teclas[SDL_SCANCODE_A]) x -= VEL * dt;
        if (teclas[SDL_SCANCODE_RIGHT] || teclas[SDL_SCANCODE_D]) x += VEL * dt;

        if (x < 0) x = 0;
        if (x > LARGURA - raquete.w) x = (float)(LARGURA - raquete.w);
        raquete.x = (int)x;

        SDL_SetRenderDrawColor(r, 0, 0, 16, 255);
        SDL_RenderClear(r);
        SDL_SetRenderDrawColor(r, 51, 255, 51, 255);
        SDL_RenderFillRect(r, &raquete);
        SDL_RenderPresent(r);

        SDL_Delay(16);
    }

    SDL_Quit();
    return 0;
}
