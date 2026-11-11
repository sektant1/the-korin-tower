# Piston com os compiladores do site já embutidos (nada é baixado no primeiro boot).
# `gcc` cobre C, C++, D e Fortran; os demais vêm em pacotes próprios.
# A imagem fica grande (~3 GB) e a primeira build demora: é o preço de a VPS
# sempre ter os runtimes, mesmo sem rede no momento em que o container sobe.
FROM ghcr.io/engineer-man/piston

# Lista separada por vírgula. Para trocar sem editar o compose:
#   PISTON_PACKAGES="gcc,rust,go" docker compose build piston
ARG PISTON_PACKAGES="gcc,rust"
ENV PISTON_PACKAGES=${PISTON_PACKAGES}

COPY install.cjs /piston-install.cjs
RUN mkdir -p /piston/packages \
 && node /piston-install.cjs \
 && rm /piston-install.cjs
