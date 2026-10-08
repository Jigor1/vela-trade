# Vela (nome provisório): plataforma pessoal de trade

## Quem é o usuário

- Igor, trader de cripto (majors e memecoins da Solana). **Não sabe programar.**
- Quer entregas prontas para usar no navegador, com link. Nada de "rode este comando no terminal".
- Fale com ele em português, em linguagem simples. Código, nomes de variáveis e commits podem ser em inglês. A interface é toda em português.
- Ao fim de cada fase, pare e entregue: (1) o link para testar, (2) um checklist curto do que ele deve clicar e conferir, (3) o que ficou de fora ou é limitação conhecida.

## O problema que o produto resolve

Três dores que as ferramentas atuais (TradingView, GoCharting, GMGN) não resolvem juntas:

1. **Tempos gráficos sem limite.** Qualquer intervalo (ex.: 45s, 7m, 13m, 3h, 2D) e uma barra de acesso rápido com **10 slots** configuráveis.
2. **Anotações com memória.** Escrever no gráfico, preso a um ativo, a um momento e a um preço, e ser lembrado no futuro. Depois, revisar o que foi escrito e comparar com o que aconteceu. Também uma lista de "ativos para olhar só no futuro" que fica escondida até a data.
3. **Carteira e histórico de operações.** Preço médio, PNL realizado e não realizado, compras e vendas marcadas no gráfico. No MVP o registro é **manual**. Integração automática com carteira fica para depois.

Este projeto é novo e independente. Não reaproveite código de outros projetos do Igor (ex.: o rastreador de carteira Solana).

## Stack

- **Vite + React + TypeScript**, site estático.
- **Gráfico:** TradingView Lightweight Charts (open source, Apache-2.0). Não usar o widget do TradingView, porque ele traz as mesmas limitações que queremos evitar.
- **Dados locais:** IndexedDB via Dexie. Sem login no MVP. Botões de **Exportar/Importar backup (JSON)** desde a Fase 1, para o usuário não perder anotações.
- **Hospedagem:** GitHub Pages com deploy automático via GitHub Actions a cada push na `main`.
- **Sem chaves de API no repositório.** Se alguma fonte exigir chave, o usuário cola na tela de Configurações e ela fica salva só no navegador.
- **Depois do MVP (não fazer agora):** Supabase para sincronizar entre PC e celular, e um bot de Telegram para lembretes com o app fechado.

## Fontes de dados (via adaptadores)

Crie uma interface única `DataSource` (buscar símbolos, buscar candles por intervalo-base e período, preço atual) com duas implementações:

| Adaptador | Mercado | Resolução-base | Observações |
|---|---|---|---|
| `binance` | Majors (BTC, ETH, SOL…) | **1s** e 1m | Endpoint público de klines. Confirme o CORS no navegador. Se falhar, use `data-api.binance.vision`. |
| `solana-dex` | Memecoins da Solana | 1m | GeckoTerminal OHLCV (pool), paginando com `before_timestamp`. Busca e metadados (nome, logo, pool principal) via DexScreener. |

Antes de implementar, verifique na documentação atual de cada API os limites, os parâmetros e o CORS. Não confie em memória. Trate erro 429 com espera e nova tentativa.

## Motor de tempo gráfico (o coração da Fase 1)

- O usuário digita qualquer intervalo: `30s`, `45s`, `1m`, `7m`, `13m`, `90m`, `3h`, `2D`, `1W`. O parser aceita s/m/h/D/W.
- O app busca a **maior resolução-base que divide o intervalo** e **agrega no navegador** (open do primeiro, high máx, low mín, close do último, volume somado). Os candles são alinhados ao horário UTC, igual às exchanges.
- Intervalos em segundos só aparecem quando a fonte tem base em segundos. Para memecoins (base 1m), a interface mostra que segundos não estão disponíveis para aquele ativo, em vez de falhar em silêncio.
- **Barra rápida com 10 slots:** o usuário escolhe quais intervalos ficam nela, reordena arrastando e usa os atalhos `1`–`0` do teclado. A configuração é salva.
- Cache dos candles em IndexedDB para trocar de intervalo sem baixar tudo de novo.
- Rolagem para o passado carrega mais histórico (paginação).

## Modelo de dados (Dexie)

```
assets      { id, source, symbol, name, logoUrl, poolAddress? }
notes       { id, assetId, createdAt, anchorTime, anchorPrice, timeframe,
              text, tags[], kind: 'ideia'|'alerta'|'licao',
              remindAt?, remindPriceAbove?, remindPriceBelow?,
              status: 'ativa'|'pendente_revisao'|'revisada',
              outcome?: 'acertei'|'errei'|'neutro', reflection? }
watchlater  { id, assetId, reason, wakeAt, createdAt, dismissed }
trades      { id, assetId, side: 'buy'|'sell', time, qty, priceUsd,
              feeUsd?, note? }
settings    { quickTimeframes[10], theme, apiKeys{} }
```

## Fases

Faça **uma fase por vez**. Ao terminar cada fase: commit, deploy, checklist para o Igor e **pare**.

### Fase 0: esqueleto e deploy
- Projeto Vite, deploy automático no GitHub Pages funcionando, layout escuro com área do gráfico, barra superior e painel lateral.
- **Aceite:** o Igor abre o link e vê a tela vazia publicada.

### Fase 1: gráfico + tempos gráficos ilimitados
- Busca de ativo nos dois adaptadores (majors por símbolo; memecoin por nome ou endereço do contrato).
- Motor de intervalo customizado, barra de 10 slots, atalhos de teclado, cache e paginação.
- Exportar e importar backup.
- **Aceite:** abrir SOLUSDT em 45s e em 7m, abrir uma memecoin em 13m e montar a barra com 10 intervalos que continua lá depois de recarregar a página.

### Fase 2: anotações com memória
- **Criar nota:** atalho `N` ou clique no gráfico. A nota fica presa ao ponto (tempo + preço) e aparece como marcador. Ao passar o mouse, mostra o texto; ao clicar, abre para editar.
- **Lembrete opcional:** por data/hora ("rever em 3 dias", "dia 20 às 9h") e/ou por preço (acima ou abaixo de X). O de preço é checado quando o app está aberto, usando o preço atual dos ativos com nota ativa.
- **Caixa "Para revisar":** junta notas vencidas e lembretes de preço disparados. Mostra badge com contagem e notificação do navegador (Notification API) com o app aberto. Ao abrir o app, mostra o que venceu enquanto ele estava fechado.
- **Modo revisão:** abre o gráfico no ativo, centralizado no momento da nota. Mostra preço na nota → preço agora (%), e o campo "acertei / errei / neutro" + reflexão.
- **Diário:** lista de todas as notas com filtro por ativo, tag, tipo e resultado. Mostra a taxa de acerto por tag.
- **"Olhar no futuro":** adiciona um ativo com motivo e data. Ele some da lista e reaparece na caixa "Para revisar" na data marcada.
- **Aceite:** criar uma nota com lembrete para daqui a 2 minutos, fechar a aba, reabrir e ver a nota na caixa de revisão; concluir a revisão com o resultado marcado.

### Fase 3: carteira manual
- Formulário rápido de operação: ativo, compra/venda, data/hora, quantidade e **preço OU total pago** (em USD; se for em SOL, converter pelo preço do SOL na data).
- Custo médio ponderado: vendas dão baixa pelo custo médio. Calcular PNL realizado, PNL não realizado e PNL total, em US$ e em %.
- **No gráfico:** setas de compra e venda nos candles e linha horizontal do preço médio.
- **Painel de posições:** Saldo · Comprado · Vendido · PNL, em colunas de largura fixa e alinhadas, ordenado por PNL em US$.
- **Aceite:** registrar 2 compras e 1 venda parcial de um ativo e conferir o preço médio e o PNL com uma conta feita à mão.

### Fase 4+ (somente quando o Igor pedir)
Sincronização com Supabase, lembretes pelo Telegram com o app fechado, importação automática da carteira Solana (Helius), candles em segundos para memecoins.

## Regras de trabalho

- Antes de cada fase, mostre um plano curto (o que será feito e quais arquivos) e siga.
- Teste no navegador antes de dizer que terminou. Se uma API não se comportar como esperado, avise e proponha uma alternativa; não invente dados.
- Nunca apague dados do usuário em migrações do banco local. Versione o schema do Dexie.
- Mantenha a interface limpa: o gráfico é o protagonista e os painéis são recolhíveis.
