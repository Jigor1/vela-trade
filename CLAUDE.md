# Vela (nome provisório): plataforma pessoal de trade

## Quem é o usuário

- Igor, trader de cripto (majors e memecoins da Solana). **Não sabe programar.**
- Quer entregas prontas para usar no navegador, com link. Nada de "rode este comando no terminal".
- Fale com ele em português, em linguagem simples. Código, nomes de variáveis e commits podem ser em inglês. A interface é toda em português.
- Ao fim de cada fase, pare e entregue: (1) o link para testar, (2) um checklist curto do que ele deve clicar e conferir, (3) o que ficou de fora ou é limitação conhecida.

## O problema que o produto resolve

Três dores que as ferramentas atuais (TradingView, GoCharting, GMGN) não resolvem juntas:

1. **Tempos gráficos flexíveis.** Uma lista ampla de intervalos (incluindo 45m, 2D, 3M, que as ferramentas costumam não ter) e uma barra de acesso rápido com **10 slots** configuráveis. Intervalos totalmente customizados ficam para o futuro (o motor já nasce preparado).
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
| `binance` | Majors (BTC, ETH, SOL…) | Intervalos nativos da API (de 1m até 1M) | Endpoint público de klines. Confirme o CORS no navegador. Se falhar, use `data-api.binance.vision`. Sem base em segundos por enquanto. |
| `solana-dex` | Memecoins da Solana | Intervalos nativos do GeckoTerminal (minuto, hora e dia; sem semana e sem mês) | GeckoTerminal OHLCV (pool), paginando com `before_timestamp`. Busca e metadados (nome, logo, pool principal) via DexScreener. |

Cada adaptador declara a lista de intervalos nativos que realmente oferece (confirmada na documentação atual, não de memória). O motor usa essa lista para decidir de onde montar cada intervalo.

Antes de implementar, verifique na documentação atual de cada API os limites, os parâmetros e o CORS. Não confie em memória. Trate erro 429 com espera e nova tentativa.

## Motor de tempo gráfico (o coração da Fase 1)

- **Sem intervalos em segundos por enquanto** (nem base de 1s).
- **Lista fixa no menu:** `5m, 15m, 30m, 45m, 1h, 2h, 4h, 6h, 8h, 12h, 1D, 2D, 3D, 1W, 1M, 3M`.
- **Convenção (exibir exatamente assim na interface):** `m` = minutos, `h` = horas, `D` = dias, `W` = semanas, `M` = meses (M maiúsculo).
- **Calendário em UTC:** meses são meses de calendário (a vela começa no dia 1º), não blocos de 30 dias. Semanas começam na **segunda-feira**, igual à Binance. Os demais candles são alinhados ao horário UTC, igual às exchanges.
- **Montagem dos intervalos:** o intervalo que a API não oferece pronto é montado a partir do **maior intervalo nativo que divide o pedido** (ex.: 45m a partir de 15m, 2D a partir de 1D, 3M a partir de 1M). No GeckoTerminal, que não tem mês, 1M e 3M são montados a partir de 1D. A agregação é feita no navegador: open do primeiro, high máx, low mín, close do último, volume somado.
- **Motor genérico:** o parser e a agregação aceitam qualquer múltiplo (e unidades m/h/D/W/M), mesmo que a interface mostre só a lista fixa, para liberar intervalos customizados no futuro sem refazer nada.
- **Barra rápida com 10 slots:** vem preenchida por padrão com `5m, 15m, 30m, 1h, 4h, 12h, 1D, 1W, 1M, 3M`. O usuário troca qualquer slot por outro intervalo da lista, reordena arrastando e usa os atalhos `1`–`0` do teclado. A configuração é salva.
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
- Motor de intervalo (lista fixa na interface, agregação genérica), barra de 10 slots, atalhos de teclado, cache e paginação.
- Exportar e importar backup.
- **Aceite:** abrir SOLUSDT em 45m, 2D e 3M, abrir uma memecoin em 45m e 1M, trocar 2 slots da barra rápida e ver que continuam trocados depois de recarregar a página.

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
Sincronização com Supabase, lembretes pelo Telegram com o app fechado, importação automática da carteira Solana (Helius), intervalos customizados, intervalos em segundos (base 1s).

## Regras de trabalho

- Antes de cada fase, mostre um plano curto (o que será feito e quais arquivos) e siga.
- Teste no navegador antes de dizer que terminou. Se uma API não se comportar como esperado, avise e proponha uma alternativa; não invente dados.
- Nunca apague dados do usuário em migrações do banco local. Versione o schema do Dexie.
- Mantenha a interface limpa: o gráfico é o protagonista e os painéis são recolhíveis.
