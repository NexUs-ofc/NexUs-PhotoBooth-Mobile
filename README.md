# NexUs PhotoBooth Mobile

Aplicativo mobile multiplataforma feito com React Native e Expo Router.

## Requisitos

- Node.js 22.13 ou superior (Expo SDK 58)
- Android Studio com Android SDK 37 instalado para compilar no Android

## Abrir no Android Studio

1. Instale as dependências na raiz do repositório:

   ```powershell
   npm install
   ```

2. Abra a pasta `android` deste repositório no Android Studio e aguarde a sincronização do Gradle.
3. Selecione um emulador Android ou conecte um aparelho com depuração USB e execute a configuração `app`.

O projeto Gradle está em `android/`. O identificador Android atual é `com.nexus.photoboothmobile`.

## Rodar pelo terminal

Na raiz do repositório:

```powershell
npm run android
```

Para iniciar apenas o servidor Expo:

```powershell
npm start
```

## Atualizar o projeto nativo Android

Depois de alterar configurações nativas em `app.json` ou adicionar um módulo nativo, regenere a pasta Android a partir da raiz:

```powershell
npx expo prebuild --platform android
```

A pasta `android/` é gerada pelo Expo Prebuild e está versionada para poder ser aberta diretamente no Android Studio. Evite editar arquivos gerados manualmente; configure o app em `app.json` ou por plugins Expo e gere novamente.

## iOS

O código React Native também suporta iOS. Para compilar e abrir o projeto nativo iOS é necessário macOS com Xcode; a pasta `ios/` pode ser gerada nesse ambiente com `npx expo prebuild --platform ios`.
