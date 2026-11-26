// Atributos do herói. Passivas e a loja da Torre Korin somam aqui; técnicas leem daqui.
export interface Stats {
  maxHp: number;
  recovery: number; // HP/s
  armor: number; // reduz cada golpe recebido (mínimo 1)
  moveSpeed: number; // multiplicador
  might: number; // multiplicador de dano
  area: number; // multiplicador de área
  projSpeed: number;
  duration: number;
  cooldown: number; // multiplicador do tempo de recarga (menor = mais rápido)
  amount: number; // projéteis extras
  magnet: number; // raio de coleta em px
  luck: number;
  growth: number; // multiplicador de XP
  greed: number; // multiplicador de Zeni
  crit: number; // chance de crítico
  critMult: number; // multiplicador do crítico
  pierce: number; // inimigos extras atravessados pelos projéteis
  curse: number; // maldição: inimigos mais fortes e numerosos, mais XP (1 = normal)
  dodge: number; // chance de esquivar um golpe
  knockback: number; // multiplicador do empurrão
  thorns: number; // dano devolvido a quem encosta no herói
  bossDmg: number; // dano extra em elites e chefes (0.1 = +10%)
  barrier: number; // cargas do Escudo de Ki: cada uma anula um golpe; volta uma a cada SHIELD_REGEN s
  foodHeal: number; // multiplicador da cura de comida (Carne Assada)
}

export const BASE_STATS: Stats = {
  maxHp: 100,
  recovery: 0,
  armor: 0,
  moveSpeed: 1,
  might: 1,
  area: 1,
  projSpeed: 1,
  duration: 1,
  cooldown: 1,
  amount: 0,
  magnet: 60,
  luck: 1,
  growth: 1,
  greed: 1,
  crit: 0,
  critMult: 2,
  pierce: 0,
  curse: 1,
  dodge: 0,
  knockback: 1,
  thorns: 0,
  bossDmg: 0,
  barrier: 0,
  foodHeal: 1,
};

export const SHIELD_REGEN = 14; // s para recuperar uma carga do Escudo de Ki

export const PLAYER_SPEED = 130; // px/s com moveSpeed 1
