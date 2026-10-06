# LUVI Finanças v5.8.1 — Google opcional sem credenciais locais

## O que foi corrigido
A v5.8 declarava a registration `google` no `application.properties` mesmo sem credenciais.
Durante `mvn clean package`, o Spring validava essa registration e falhava com:
`Client id of registration 'google' must not be empty`.

A v5.8.1 usa o profile `google`.

### Local / testes
Não configure GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET nem variáveis vazias.
O profile `google` não fica ativo, portanto o login tradicional funciona e o botão Google fica oculto.

### Produção / OCI
No arquivo `/etc/luvi-financas/luvi-financas.env`, além das credenciais já cadastradas, adicione:
`SPRING_PROFILES_ACTIVE=google`

As credenciais continuam:
`GOOGLE_CLIENT_ID=...`
`GOOGLE_CLIENT_SECRET=...`

Não envie esses valores ao Git.

## Dependência Maven
Mantenha no pom.xml:
```xml
<dependency>
  <groupId>org.springframework.boot</groupId>
  <artifactId>spring-boot-starter-oauth2-client</artifactId>
</dependency>
```

## Redirect URI no Google
`https://financas.luvi.net.br/login/oauth2/code/google`

## Build local
`mvn -s .\settings-public.xml clean package`

O build local não necessita de credenciais Google.

## Deploy
1. Confirmar BUILD SUCCESS.
2. Na OCI, adicionar somente `SPRING_PROFILES_ACTIVE=google` ao env (as credenciais Google já devem estar lá).
3. Fazer backup do JAR atual.
4. Publicar o novo JAR.
5. Reiniciar `luvi-financas.service`.
6. Conferir no journal que o profile `google` está ativo e que o Flyway está em V3.
7. Testar login tradicional.
8. Testar Continuar com Google.
