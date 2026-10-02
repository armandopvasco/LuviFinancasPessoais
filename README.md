# Luvi Finanças Pessoais

Sistema simples para controle mensal de receitas e despesas.

## Tecnologias

- Java 17
- Spring Boot
- Spring Web
- Spring Data JPA
- Hibernate
- PostgreSQL
- HTML
- CSS
- JavaScript

## Banco de dados

Crie o banco no PostgreSQL:

```sql
CREATE DATABASE luvi_financas;
```

Depois ajuste usuário e senha em:

`src/main/resources/application.properties`

Por padrão o projeto está configurado para:

- host: localhost
- porta: 5432
- banco: luvi_financas
- usuário: postgres
- senha: postgres

## Executar

No IntelliJ, execute:

`LuviFinancasPessoaisApplication`

Depois acesse:

`http://localhost:8080`

O Hibernate criará/atualizará a tabela `lancamentos` automaticamente.

## Funcionalidades

- Cadastrar receita
- Cadastrar despesa
- Editar lançamento
- Excluir lançamento
- Filtrar por mês
- Visualizar total de receitas
- Visualizar total de despesas
- Visualizar saldo mensal
