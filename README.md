# Expotech PhotoBooth 2026

Aplicativo de photo booth multiplataforma feito com React Native, Expo Router e TypeScript.

## Fluxo do participante

1. Preenche nome, e-mail e WhatsApp com DDD e autoriza o uso da foto.
2. Tira a foto e confirma ou refaz.
3. A foto é composta na moldura oficial da Expotech 2026.
4. O app envia a imagem composta à API PhotoBooth, que encaminha a foto para o WhatsApp informado com a mensagem `Obrigado por visitar nosso stand [nome]!💜`.

O backend mantém as credenciais GreenAPI fora do app. O envio só é aceito quando a instância WhatsApp estiver autorizada; a confirmação da GreenAPI significa que a mensagem entrou na fila de envio, não que já foi entregue.

## Configuração da API PhotoBooth

Crie um `.env` local com `EXPO_PUBLIC_PHOTOBOOTH_API_URL` apontando para a URL HTTPS pública da API e `EXPO_PUBLIC_PHOTOBOOTH_API_KEY` igual à chave dedicada `PHOTOBOOTH_API_KEY` configurada no backend. Reinicie o Expo após mudar essas variáveis. A chave do app é uma chave de cabine e pode ser extraída do binário; restrinja seu uso, faça rotação após o evento e nunca coloque credenciais GreenAPI no mobile.

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

O código React Native suporta iOS. Para compilar e abrir o projeto nativo iOS é necessário macOS com Xcode; gere a pasta com `npx expo prebuild --platform ios` nesse ambiente.
