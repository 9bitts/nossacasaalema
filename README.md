# Nossa Casa Alemanha

Arquivo familiar de documentos organizados por categoria, com busca, download e upload.

**Site:** https://9bitts.github.io/nossacasaalema/

## Acesso

Login com um único e-mail e senha (configurados em `auth-config.js`):

| Campo | Valor padrão |
|-------|----------------|
| E-mail | `familia@nossacasaalema.de` |
| Senha | `NossaCasa2026!` |

Para alterar a senha:

```powershell
powershell -File scripts/hash-password.ps1 "NovaSenhaAqui"
```

Copie o hash gerado para `AUTH_PASSWORD_HASH` em `auth-config.js` e altere `AUTH_EMAIL` se necessário.

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
