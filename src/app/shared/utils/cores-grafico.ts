/**
 * Cores dos gráficos (Canvas não entende `var()`). Espelham src/styles/tokens.css — manter sincronizado.
 * Destaque e contexto validados contra a superfície dos cards (#131b2e): destaque passa no validador
 * de paleta (faixa de luminosidade, croma, contraste) e o cinza de contexto tem contraste 3,6:1.
 */
export const CORES_GRAFICO = {
  superficie: '#131b2e', // --color-surface (fundo dos cards; usado nos espaços de 2px entre marcas)
  grade: '#263449', // --color-border (grade e eixos: linha fina, sólida, recessiva)
  textoPrimario: '#f8fafc', // --color-text-primary
  textoSecundario: '#94a3b8', // --color-text-secondary
  textoMudo: '#64748b', // --color-text-muted (rótulos dos eixos)
  destaque: '#3b82f6', // período atual (mesmo azul da clínica 1)
  contexto: '#64748b', // período anterior / "Outras": cinza de ênfase
} as const;
