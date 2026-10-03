# LUVI Finanças Pessoais

Aplicação simples para controle de receitas e despesas familiares.

## Tecnologias

- Java 17
- Spring Boot 3.5.6
- Spring Web
- Spring Data JPA
- Spring Security
- Thymeleaf
- PostgreSQL
- HTML/CSS/JavaScript

## Variáveis de ambiente

### Autenticação da aplicação
A aplicação possui um único acesso compartilhado.

As credenciais NÃO ficam gravadas no código.

Configure:

```text
LUVI_APP_USERNAME=<usuário-aplicação>
LUVI_APP_PASSWORD=<senha-aplicação>
```

A senha é transformada em hash BCrypt em memória quando a aplicação inicia.

### Outras: Obrigatórias em produção

```text
LUVI_DB_URL=<URL-do-banco>
LUVI_DB_USERNAME=<usuario-do-banco>
LUVI_DB_PASSWORD=<senha-do-banco>
LUVI_JPA_DDL_AUTO=update
LUVI_JPA_SHOW_SQL=false
PORT=8080
```

## Criar banco Postgree local

Criação do banco:

```sql
CREATE DATABASE luvi_financas;
```

## IntelliJ

Você pode configurar as variáveis em:

Run > Edit Configurations > Environment variables

OBS.: Não coloque senhas no `application.properties`.

## Executar

Execute `LuviFinancasPessoaisApplication`.

Abra no navegador:

```text
http://localhost:8080
```

## Hospedagem

Na hospedagem, configure as mesmas variáveis de ambiente no painel da plataforma.

A aplicação usa `PORT` quando a plataforma fornece essa variável.

O PostgreSQL pode estar no mesmo servidor ou em um serviço PostgreSQL externo.

Para publicação na internet, use HTTPS no domínio/proxy da hospedagem.