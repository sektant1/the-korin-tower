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
    float x = (float)raquete.x; /* posição em float: somar frações de pixel por quadro */

    int rodando = 1;
    while (rodando) {
        SDL_Event e;
        while (SDL_PollEvent(&e)) {
            if (e.type == SDL_QUIT) rodando = 0;
        }

        /* TODO: calcular dt (segundos desde o quadro anterior) com SDL_GetTicks() */
        /* TODO: ler as setas (ou A/D) com SDL_GetKeyboardState e mover x */
        /* TODO: manter a raquete dentro da tela */

        raquete.x = (int)x;

        SDL_SetRenderDrawColor(r, 0, 0, 16, 255);
        SDL_RenderClear(r);
        SDL_SetRenderDrawColor(r, 51, 255, 51, 255);
        SDL_RenderFillRect(r, &raquete);
        SDL_RenderPresent(r);

        SDL_Delay(16); /* ~60 quadros por segundo; no navegador, devolve o controle à página */
    }

    SDL_Quit();
    return 0;
}
