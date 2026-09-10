# Summoner Lab

Dashboard open source para analisar arquivos JSON gerados pelo [Summoners War Exporter](https://github.com/Xzandro/sw-exporter). O projeto transforma o export da conta em uma visão visual de monstros, armazenamento, progresso, runas e prioridades para PvE.

O Summoner Lab inicia vazio. O jogador escolhe um JSON no navegador e toda a análise acontece localmente, durante aquela sessão. O arquivo bruto não é enviado para um servidor, não é salvo no navegador e desaparece da aplicação quando a página é recarregada ou fechada.

> O Summoner Lab é um projeto independente, feito pela comunidade, e não possui vínculo oficial com a Com2uS ou com o Summoners War.

## Recursos atuais

- Visão geral da conta e distribuição da box por elemento.
- Lista de monstros ativos com nível, evolução, runas, artefatos e habilidades.
- Detalhes das seis runas equipadas em cada monstro.
- Armazenamento ordenado da maior para a menor quantidade.
- Insights genéricos calculados a partir da melhor cópia de cada monstro.
- Pontuação baseada em evolução, nível, runas, artefatos, habilidades e despertar.
- Otimização PvE usando somente as runas existentes no próprio export.
- Sugestões de trocas e de runas que merecem ser aumentadas.
- Filtros por nome, família, elemento e quantidade de estrelas.
- Processamento temporário no navegador, sem persistência da conta.

As recomendações de runas são heurísticas. Elas ajudam a comparar alternativas, mas não garantem tempos de dungeon ou resultados específicos dentro do jogo.

## Como obter o JSON

O arquivo utilizado pelo dashboard é extraído pelo **Summoners War Exporter**, também conhecido como **SWEX**.

1. Acesse a página oficial de [releases do Summoners War Exporter](https://github.com/Xzandro/sw-exporter/releases/latest).
2. Baixe o pacote correspondente ao seu sistema operacional. O projeto oferece versões para Windows, macOS e Linux; no Windows também pode haver uma opção portátil.
3. Instale ou execute o SWEX.
4. Siga a seção **Help** do próprio aplicativo para configurar o proxy e o certificado exigidos pelo seu dispositivo.
5. Inicie a captura no SWEX e abra o Summoners War conforme as instruções apresentadas pelo aplicativo.
6. Quando os dados da conta forem capturados, localize o arquivo `.json` gerado pelo SWEX.
7. Abra o Summoner Lab, clique em **Selecionar arquivo JSON** e escolha esse arquivo.

Baixe o SWEX somente pelo [repositório oficial](https://github.com/Xzandro/sw-exporter). As etapas de proxy e certificado podem mudar entre sistemas e versões, portanto a ajuda incluída na versão instalada deve ser considerada a referência principal.

## Privacidade e segurança

Exports do Summoners War podem conter identificadores e dados de sessão. Por isso:

- nunca publique o seu JSON em um repositório;
- não envie o arquivo para serviços ou pessoas em quem você não confia;
- remova exports antes de compartilhar logs ou pastas do projeto;
- mantenha `private-data/*.json` ignorado pelo Git.

Na versão atual, o Summoner Lab usa a API de arquivos do navegador e mantém os dados somente no estado temporário da página. O projeto não usa `localStorage`, cookies para guardar a conta, banco de dados ou upload para uma API.

## Executar localmente

### Requisitos

- Node.js 22.13 ou mais recente.
- npm.

### Instalação

```bash
git clone https://github.com/Marcus-Brasizza-Softwares/summoner-wars-box.git
cd summoner-wars-box
npm install
npm run dev
```

Abra [http://localhost:3000](http://localhost:3000) e selecione um JSON gerado pelo SWEX.

O projeto deve abrir sem nenhuma conta carregada. Como não há persistência, atualizar a página volta para a tela inicial.

## Comandos

```bash
# Ambiente de desenvolvimento
npm run dev

# Compilação de produção
npm run build

# Executar a compilação local do Cloudflare Worker
npm run start

# Verificação de código
npm run lint

# Formatação
npm run format
```

Os scripts `npm run refresh` e `npm run optimize` são ferramentas auxiliares para desenvolvimento local. Eles esperam um arquivo em `private-data/account.json`; essa pasta está no `.gitignore` e nunca deve ser enviada ao Git.

## Como funciona

```text
JSON do SWEX
    ↓
Leitura temporária no navegador
    ↓
Normalização de monstros, runas e armazenamento
    ├── Dashboard da conta
    ├── Pontuação e insights de evolução
    └── Otimizador de runas PvE
```

O catálogo público de monstros é usado para converter os identificadores do export em nomes, elementos, imagens e informações básicas. O JSON da conta permanece separado desse catálogo e nunca faz parte da compilação do site.

## Tecnologias

- React 19
- TypeScript
- Vinext e Vite
- Tailwind CSS
- componentes Shadcn
- Cloudflare Workers para a versão de produção

## Estrutura principal

```text
app/page.tsx                       Interface e fluxo de upload
lib/summoner.ts                    Leitura do export e cálculo dos insights
lib/rune-optimizer.ts              Otimização de runas no navegador
public/data/monster-catalog.json   Catálogo público de monstros
scripts/                            Ferramentas auxiliares de desenvolvimento
```

## Contribuindo

Contribuições são bem-vindas. Você pode abrir uma issue com um problema ou proposta, criar um fork e enviar um pull request.

Ao contribuir:

1. não inclua exports reais de contas em testes, issues ou commits;
2. use dados fictícios ou sanitizados;
3. explique quais áreas do jogo e cenários foram considerados;
4. execute `npm run build` antes de enviar a alteração.

Algumas boas áreas para contribuição são novos perfis PvE, melhoria do cálculo de runas, speed tuning de equipes, traduções, acessibilidade e testes com exports sanitizados.

## Licenças e atribuições

O [Summoners War Exporter](https://github.com/Xzandro/sw-exporter) é distribuído sob a licença Apache 2.0. O [SWARFARM](https://github.com/swarfarm/swarfarm), usado como referência para dados públicos do catálogo, também possui código sob Apache 2.0. Marcas, nomes e imagens do Summoners War pertencem aos seus respectivos detentores.

O código do Summoner Lab é distribuído sob a [licença MIT](LICENSE).
