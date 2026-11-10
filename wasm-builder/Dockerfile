# Construtor WASM (Fase 4): emcc + raylib (PLATFORM_WEB) + SDL2, atrás de um HTTP mínimo.
# A imagem do emsdk já traz Node, usado pelo próprio emcc e pelo server.mjs.
FROM emscripten/emsdk:3.1.74

ARG RAYLIB_VERSION=5.5
# raylib para a web. O nome da biblioteca mudou entre versões (libraylib.a / libraylib.web.a).
RUN git clone --depth 1 --branch ${RAYLIB_VERSION} https://github.com/raysan5/raylib.git /tmp/raylib \
 && make -C /tmp/raylib/src PLATFORM=PLATFORM_WEB -B \
 && mkdir -p /opt/raylib/include /opt/raylib/lib \
 && cp /tmp/raylib/src/raylib.h /tmp/raylib/src/raymath.h /tmp/raylib/src/rlgl.h /opt/raylib/include/ \
 && cp "$(ls /tmp/raylib/src/libraylib*.a | head -n 1)" /opt/raylib/lib/libraylib.a \
 && rm -rf /tmp/raylib

# Pré-compila o port do SDL2: sem isto o primeiro build baixaria o SDL2 da internet.
RUN embuilder build sdl2

# Aquece o cache da libc com as mesmas flags do site, para o primeiro build de usuário ser rápido.
RUN printf 'int main(void){return 0;}\n' > /tmp/warm.c \
 && emcc /tmp/warm.c -o /tmp/warm.js -O1 -sSINGLE_FILE=1 -sENVIRONMENT=web -sALLOW_MEMORY_GROWTH=1 -sASYNCIFY -sEXIT_RUNTIME=1 \
 && rm /tmp/warm.*

ENV RAYLIB_WEB_DIR=/opt/raylib
WORKDIR /srv
COPY build.mjs server.mjs ./
# O cache do emscripten precisa ser gravável por quem roda o serviço.
RUN chmod -R a+rwX /emsdk/upstream/emscripten/cache
USER emscripten
EXPOSE 2100
CMD ["node", "server.mjs"]
