Luvi Finanças - observação de esquema

A versão atual não usa mais o conceito de dependente.
Se a base foi executada com uma versão anterior, as estruturas antigas `dependentes` e
`contas_financeiras.dependente_id` podem continuar fisicamente no PostgreSQL porque
`spring.jpa.hibernate.ddl-auto=update` não remove colunas/tabelas antigas.

Não é necessário removê-las para testar esta versão. Após validar a aplicação, elas podem
ser eliminadas por uma migração SQL controlada.
