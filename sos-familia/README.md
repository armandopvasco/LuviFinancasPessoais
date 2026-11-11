# S.O.S. Família

Aplicativo Android para um idoso chamar a ambulância ou um familiar com um toque.
Não existe servidor: nome, sangue, alergias, telefones e o último endereço ficam no SQLite do próprio celular.

O projeto Spring do Luvi Finanças não é alterado. Abra **esta pasta** (`sos-familia`) no Android Studio, não a raiz do repositório.

## Por que esta stack

Kotlin + Jetpack Compose + Room.

- Quem programa Java lê Kotlin sem trocar de linguagem de verdade. Room é o JPA deste aplicativo: `@Entity`, `@Dao` e um banco SQLite, no lugar de `@Entity` JPA e PostgreSQL.
- Um único Android Studio gera o APK. Não há Flutter SDK, Xcode nem conta de nuvem.
- No Brasil o celular de uso diário é Android. Discador, GPS e WhatsApp são intents nativos.
- Flutter seria a escolha se o iPhone entrasse no primeiro dia. Dá para reescrever a mesma tela depois; a regra de negócio cabe em poucos arquivos.

O app pede Android 8 ou mais novo.

## Como gerar o APK

1. Instale o [Android Studio](https://developer.android.com/studio).
2. File → Open → pasta `sos-familia`.
3. Espere o Gradle baixar as dependências.
4. Se quiser uma chave Pix padrão, edite `app/src/main/java/br/com/sosfamilia/util/Apoio.kt`. Também dá para digitar a chave na tela de ajustes, sem recompilar.
5. Conecte um celular com a depuração USB ligada, ou crie um emulador.
6. Run. O botão vermelho abre o discador no 192 (SAMU). O cuidador pode trocar esse número.

Para montar pela linha de comando, com o Android SDK instalado:

```text
export ANDROID_HOME=$HOME/Android/Sdk
./gradlew test assembleDebug
```

O APK de teste sai em `app/build/outputs/apk/debug/`.

## Pastas

```text
sos-familia/
  app/src/main/java/br/com/sosfamilia/
    MainActivity.kt              abre a tela
    data/
      Perfil.kt                  nome, sangue, alergias, senha, Pix, último endereço
      ContatoEmergencia.kt       até 3 familiares (a ordem 1, 2, 3 é a chave)
      PerfilDao.kt               consulta, no papel do repository Spring Data
      ContatoDao.kt
      SosDatabase.kt             SQLite "sos_familia.db"
      SosRepository.kt           grava o cadastro sem apagar a localização
      CadastroLocal.kt
    localizacao/
      LocalizacaoHelper.kt       GPS, sem Google Play Services
      Geocodificador.kt          latitude/longitude → rua
      EnderecoLegivel.kt         texto curto para ler em voz alta
      Coordenadas.kt
      Distancia.kt
    util/
      Telefone.kt                192, máscara e DDI 55 do WhatsApp
      MensagemAjuda.kt           "Preciso de ajuda, veja minha localização."
      Chamadas.kt                discador e WhatsApp
      SenhaCuidador.kt
      FotosContato.kt
      Apoio.kt                   chave Pix opcional
    ui/
      PainelMontador.kt          decide o que a tela mostra, inclusive offline
      SosViewModel.kt
      SosApp.kt                  liga GPS, discador e navegação
      Tema.kt
      painel/PainelScreen.kt     tela do idoso
      ajustes/AjustesScreen.kt   tela do cuidador
      ajustes/TelaSenha.kt
  app/src/test/                   regras de telefone, endereço e cache do GPS
```

## O que funciona sem internet

- Abrir o discador da ambulância e dos familiares.
- Ler nome, sangue, alergias e telefones já gravados.
- Mostrar a coordenada que o GPS entregar (o satélite não usa a rede).
- Mostrar o último endereço se a pessoa ainda estiver a menos de 150 metros dele.

O nome da rua novo depende do geocodificador do Android, que na maioria dos aparelhos consulta a rede. Sem rede, a tela avisa e pede para ler a latitude e a longitude. Não há backend nosso em nenhum desses caminhos.

A ligação não sai sozinha: o botão abre o telefone do celular com o número preenchido. A pessoa ainda toca no botão verde. A frase embaixo do botão vermelho diz isso.

## Trava dos ajustes

No fim da tela, segure **Ajustes do cuidador** por 2 segundos. Se houver senha de 4 números, ela é pedida em seguida. Com o TalkBack ligado, o mesmo controle vira um botão normal, porque o gesto de segurar não é confiável no leitor de tela.

Um toque no familiar não liga. Segurar o nome liga. Dois toques no nome abrem o WhatsApp com a localização. Os botões LIGAR e WHATSAPP repetem esses gestos.
