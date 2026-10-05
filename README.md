# Luvi Finanças Pessoais

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

## Autenticação

A aplicação possui um único acesso compartilhado.

As credenciais NÃO ficam gravadas no código.

Configure:

```text
LUVI_APP_USERNAME=familia
LUVI_APP_PASSWORD=sua-senha
```

A senha é transformada em hash BCrypt em memória quando a aplicação inicia.

## Variáveis de ambiente

### Obrigatórias em produção

```text
LUVI_APP_USERNAME
LUVI_APP_PASSWORD
LUVI_DB_URL
LUVI_DB_USERNAME
LUVI_DB_PASSWORD
```

### Opcionais

```text
LUVI_JPA_DDL_AUTO=update
LUVI_JPA_SHOW_SQL=false
PORT=8080
```

## Banco local

Crie o banco:

```sql
CREATE DATABASE luvi_financas;
```

Depois configure as variáveis de ambiente.

Exemplo:

```text
LUVI_DB_URL=jdbc:postgresql://localhost:5432/luvi_financas
LUVI_DB_USERNAME=postgres
LUVI_DB_PASSWORD=sua_senha
LUVI_APP_USERNAME=familia
LUVI_APP_PASSWORD=sua_senha_do_luvi
```

## IntelliJ

Você pode configurar as variáveis em:

Run > Edit Configurations > Environment variables

Não coloque senhas no `application.properties`.

## Executar

```bash
mvn spring-boot:run
```

ou execute `LuviFinancasPessoaisApplication`.

Abra:

```text
http://localhost:8080
```

## Hospedagem

Na hospedagem, configure as mesmas variáveis de ambiente no painel da plataforma.

A aplicação usa `PORT` quando a plataforma fornece essa variável.

O PostgreSQL pode estar no mesmo servidor ou em um serviço PostgreSQL externo.

Para publicação na internet, use HTTPS no domínio/proxy da hospedagem.

## Próximos passos sugeridos

1. Testar o login localmente.
2. Testar cadastro/edição/exclusão.
3. Criar o PostgreSQL de produção.
4. Publicar a aplicação.
5. Configurar HTTPS.
6. Criar rotina de backup do PostgreSQL.
