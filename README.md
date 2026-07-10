# Nossa Casa Alemanha

Arquivo familiar de documentos organizados por categoria, com busca, download e upload.

**Site:** https://9bitts.github.io/nossacasaalema/

## Acesso (Railway)

Credenciais ficam **somente no Railway**, nunca no codigo:

| Variavel | Descricao |
|----------|-----------|
| `AUTH_EMAIL` | E-mail unico permitido |
| `AUTH_PASSWORD_HASH` | SHA-256 da senha |
| `SESSION_SECRET` | String aleatoria longa (ex.: 32+ caracteres) |

Gerar hash da senha:

```powershell
powershell -File scripts/hash-password.ps1 "SuaSenha"
```

## Conferir se esta privado

1. **GitHub repo privado** — Settings → Danger Zone → Change visibility → Private  
   (senao qualquer pessoa clona todos os PDFs do repositorio)
2. **GitHub Pages desligado** — Settings → Pages → Source: None
3. **Teste no Railway (aba anonima):**
   - Abra a URL do Railway → deve pedir login
   - Tente abrir direto um PDF, ex.: `https://SEU-APP.up.railway.app/Organizado/Identidade/Reisepass%20Diego.jpg`
   - Deve retornar **401 Acesso negado** sem login
4. **Nao use** a URL `github.io/nossacasaalema` se Pages estiver ativo

## Estrutura

```
Organizado/          # Documentos por categoria
manifest.json        # Índice gerado automaticamente
index.html           # Página principal
app.js / styles.css  # Interface
```

## Categorias

| Pasta | Descrição |
|-------|-----------|
| Identidade | Passaportes, certidões, IDs |
| Saude_Seguros | AOK, seguros |
| Moradia | Contratos, aluguel |
| Anmeldung | Registro de endereço |
| Trabalho_Renda | Contratos, extratos bancários |
| Jobcenter_Beneficios | Bürgergeld, Jobcenter |
| Kindergeld | Benefícios familiares |
| Escola | Escola e catering |
| Imigracao | Vistos, Ausländerbehörde |
| Casamento_Divorcio | Certidões civis |
| Correspondencia_Outros | Cartas e diversos |

## Upload de novos documentos

1. Abra o site e clique em **Enviar documento**
2. Crie um [Personal Access Token](https://github.com/settings/tokens) com permissão **Contents: Read and write**
3. Selecione a categoria e o(s) arquivo(s)
4. O arquivo é enviado ao repositório e o índice é atualizado

## Regenerar manifest localmente

```powershell
powershell -File scripts/generate-manifest.ps1
```

## Privacidade

Este repositório contém documentos pessoais sensíveis. **Recomenda-se mantê-lo privado** em GitHub Settings → Danger Zone → Change visibility.
