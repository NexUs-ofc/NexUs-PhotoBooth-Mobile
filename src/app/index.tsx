import { CameraView, useCameraPermissions } from 'expo-camera';
import { StatusBar } from 'expo-status-bar';
import { captureRef } from 'react-native-view-shot';
import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Image,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  type ViewInstance,
  useWindowDimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

const PURPLE = '#59247b';
const PURPLE_LIGHT = '#eadcf1';
const INK = '#26232a';
const MUTED = '#73717a';
const PAPER = '#fbf9fc';
const TEMPLATE = require('@/assets/templates/expotech-2026.png');
const API_URL = process.env.EXPO_PUBLIC_PHOTOBOOTH_API_URL?.replace(/\/$/, '');
const API_KEY = process.env.EXPO_PUBLIC_PHOTOBOOTH_API_KEY;

const INITIAL_FORM = { name: '', email: '', phone: '' };

type Phase = 'form' | 'validating' | 'permission' | 'camera' | 'review' | 'compose' | 'finished';
type FormErrors = Partial<Record<keyof typeof INITIAL_FORM | 'consent', string>>;

const MESSAGE = (name: string) => `Obrigado por visitar nosso stand ${name}!💜`;

function normalizeBrazilianPhone(value: string) {
  const digits = value.replace(/\D/g, '');
  if (digits.length === 10 || digits.length === 11) return `55${digits}`;
  if ((digits.length === 12 || digits.length === 13) && digits.startsWith('55')) return digits;
  return null;
}

function DecorativeGeometry() {
  const shapes = [
    { right: -20, bottom: 20, size: 116, rotate: '45deg', opacity: 0.46 },
    { right: 76, bottom: -4, size: 74, rotate: '45deg', opacity: 0.34 },
    { right: 175, bottom: 24, size: 52, rotate: '45deg', opacity: 0.4 },
    { right: 20, bottom: 146, size: 42, rotate: '45deg', opacity: 0.45 },
    { right: 125, bottom: 112, size: 32, rotate: '45deg', opacity: 0.5 },
    { right: 238, bottom: 4, size: 84, rotate: '45deg', opacity: 0.3 },
    { right: 280, bottom: 78, size: 22, rotate: '45deg', opacity: 0.45 },
    { right: 292, bottom: 166, size: 28, rotate: '45deg', opacity: 0.36 },
    { right: 326, bottom: -22, size: 50, rotate: '45deg', opacity: 0.3 },
  ];

  return (
    <View pointerEvents="none" style={styles.geometry}>
      {shapes.map((shape, index) => (
        <View
          key={index}
          style={[
            styles.geometryShape,
            {
              right: shape.right,
              bottom: shape.bottom,
              width: shape.size,
              height: shape.size,
              opacity: shape.opacity,
              transform: [{ rotate: shape.rotate }],
            },
          ]}
        />
      ))}
    </View>
  );
}

type PrimaryButtonProps = {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  loading?: boolean;
  secondary?: boolean;
};

function PrimaryButton({ label, onPress, disabled, loading, secondary }: PrimaryButtonProps) {
  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        styles.primaryButton,
        secondary && styles.secondaryButton,
        (disabled || loading) && styles.disabledButton,
        pressed && !disabled && styles.pressedButton,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={secondary ? PURPLE : '#fff'} />
      ) : (
        <Text style={[styles.primaryButtonText, secondary && styles.secondaryButtonText]}>{label}</Text>
      )}
    </Pressable>
  );
}

export default function PhotoBoothScreen() {
  const { width: screenWidth, height: screenHeight } = useWindowDimensions();
  const [permission, requestPermission] = useCameraPermissions();
  const [phase, setPhase] = useState<Phase>('form');
  const [form, setForm] = useState(INITIAL_FORM);
  const [errors, setErrors] = useState<FormErrors>({});
  const [consent, setConsent] = useState(false);
  const [facing, setFacing] = useState<'front' | 'back'>('front');
  const [cameraReady, setCameraReady] = useState(false);
  const [takingPhoto, setTakingPhoto] = useState(false);
  const [sharing, setSharing] = useState(false);
  const [shareError, setShareError] = useState('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [photoLoaded, setPhotoLoaded] = useState(false);
  const [templateLoaded, setTemplateLoaded] = useState(false);
  const cameraRef = useRef<CameraView>(null);
  const compositionRef = useRef<ViewInstance>(null);
  const boardSize = Math.max(250, Math.min(screenWidth - 36, screenHeight * 0.45));

  const updateField = (field: keyof typeof INITIAL_FORM, value: string) => {
    setForm((current) => ({ ...current, [field]: value }));
    setErrors((current) => ({ ...current, [field]: undefined }));
  };

  const validateForm = useCallback(() => {
    const nextErrors: FormErrors = {};
    const name = form.name.trim();
    if (name.length < 2) nextErrors.name = 'Digite seu nome.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      nextErrors.email = 'Digite um e-mail válido.';
    }
    if (!normalizeBrazilianPhone(form.phone)) {
      nextErrors.phone = 'Informe um celular com DDD e código do Brasil.';
    }
    if (!consent) nextErrors.consent = 'Precisamos da sua autorização para usar e compartilhar a foto.';
    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }, [consent, form.email, form.name, form.phone]);

  const startPhotoFlow = async () => {
    if (!validateForm()) return;
    setPhase('validating');
    await new Promise((resolve) => setTimeout(resolve, 800));
    const cameraPermission = permission?.granted ? permission : await requestPermission();
    if (cameraPermission.granted) {
      setCameraReady(false);
      setPhase('camera');
    } else {
      setPhase('permission');
    }
  };

  const takePhoto = async () => {
    if (!cameraRef.current || !cameraReady || takingPhoto) return;
    setTakingPhoto(true);
    try {
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.94 });
      if (!picture?.uri) throw new Error('A câmera não retornou a foto.');
      setCapturedPhoto(picture.uri);
      setPhotoLoaded(false);
      setPhase('review');
    } catch {
      Alert.alert('Não foi possível tirar a foto', 'Confira se a câmera está livre e tente novamente.');
    } finally {
      setTakingPhoto(false);
    }
  };

  const openComposition = () => {
    setPhotoLoaded(false);
    setTemplateLoaded(false);
    setShareError('');
    setPhase('compose');
  };

  const sendToWhatsApp = async () => {
    if (!compositionRef.current || !capturedPhoto) return;
    const whatsappNumber = normalizeBrazilianPhone(form.phone);
    if (!whatsappNumber) {
      setShareError('Confira o número de celular informado.');
      return;
    }

    setSharing(true);
    setShareError('');
    try {
      if (!API_URL || !API_KEY) {
        throw new Error('O envio ainda não foi configurado. Fale com a equipe do estande.');
      }
      await new Promise((resolve) => requestAnimationFrame(() => resolve(null)));
      const imageUri = await captureRef(compositionRef, {
        format: 'jpg',
        quality: 0.96,
        result: 'tmpfile',
        width: 1600,
        height: 1600,
      });
      const body = new FormData();
      body.append('name', form.name.trim());
      body.append('phone', whatsappNumber);
      body.append('consent', 'true');
      body.append('photo', {
        uri: imageUri,
        name: 'expotech-2026.jpg',
        type: 'image/jpeg',
      } as unknown as Blob);
      const response = await fetch(`${API_URL}/photobooth/send`, {
        method: 'POST',
        headers: { 'X-PhotoBooth-Key': API_KEY },
        body,
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(typeof result.detail === 'string' ? result.detail : 'Não foi possível enviar a foto. Tente novamente.');
      }
      setPhase('finished');
    } catch (error) {
      setShareError(error instanceof Error ? error.message : 'Não foi possível enviar a foto. Tente novamente.');
    } finally {
      setSharing(false);
    }
  };

  const restart = () => {
    setForm(INITIAL_FORM);
    setErrors({});
    setConsent(false);
    setCapturedPhoto(null);
    setShareError('');
    setCameraReady(false);
    setPhase('form');
  };

  const goBack = () => {
    if (phase === 'camera') setPhase('form');
    else if (phase === 'review') setPhase('camera');
    else if (phase === 'compose') setPhase('review');
    else if (phase === 'permission') setPhase('form');
  };

  return (
    <SafeAreaView style={[styles.safeArea, phase === 'camera' && styles.cameraSafeArea]} edges={['top', 'bottom']}>
      <StatusBar style={phase === 'camera' ? 'light' : 'dark'} hidden={phase === 'camera'} />
      {phase === 'camera' ? (
        <View style={styles.cameraScreen}>
          <CameraView
            ref={cameraRef}
            style={StyleSheet.absoluteFill}
            facing={facing}
            mirror={facing === 'front'}
            animateShutter
            onCameraReady={() => setCameraReady(true)}
          />
          <View style={styles.cameraTopBar}>
            <Pressable accessibilityRole="button" accessibilityLabel="Voltar" onPress={goBack} style={styles.cameraBack}>
              <Text style={styles.cameraBackText}>‹</Text>
            </Pressable>
            <View style={styles.cameraHeading}>
              <Text style={styles.cameraKicker}>EXPOTECH 2026</Text>
              <Text style={styles.cameraTitle}>Hora da foto</Text>
            </View>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Alternar câmera"
              onPress={() => {
                setCameraReady(false);
                setFacing((current) => (current === 'front' ? 'back' : 'front'));
              }}
              style={styles.cameraFlip}
            >
              <Text style={styles.cameraFlipText}>↻</Text>
            </Pressable>
          </View>
          <View style={styles.cameraBottom}>
            <Text style={styles.cameraHint}>Enquadre-se e sorria para a lembrança!</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Tirar foto"
              onPress={takePhoto}
              disabled={!cameraReady || takingPhoto}
              style={[styles.shutterOuter, (!cameraReady || takingPhoto) && styles.shutterDisabled]}
            >
              {takingPhoto ? <ActivityIndicator color={PURPLE} /> : <View style={styles.shutterInner} />}
            </Pressable>
          </View>
        </View>
      ) : (
        <View style={styles.page}>
          <DecorativeGeometry />
          {phase === 'form' && (
            <KeyboardAvoidingView
              style={styles.flex}
              behavior={Platform.OS === 'ios' ? 'padding' : undefined}
            >
              <ScrollView contentContainerStyle={styles.formScroll} keyboardShouldPersistTaps="handled">
                <View style={styles.brandLine}>
                  <View style={styles.brandDot} />
                  <Text style={styles.brandText}>EXPOTECH 2026</Text>
                  <Text style={styles.brandDivider}>·</Text>
                  <Text style={styles.brandPartner}>Ceris</Text>
                </View>
                <View style={styles.formHeading}>
                  <Text style={styles.title}>Bem-vindo(a)!</Text>
                  <Text style={styles.subtitle}>Preencha seus dados e leve uma lembrança da feira.</Text>
                </View>

                <View style={styles.fields}>
                  <Field
                    label="Nome"
                    placeholder="Como podemos chamar você?"
                    value={form.name}
                    onChangeText={(value) => updateField('name', value)}
                    error={errors.name}
                    autoCapitalize="words"
                    returnKeyType="next"
                  />
                  <Field
                    label="E-mail"
                    placeholder="voce@exemplo.com"
                    value={form.email}
                    onChangeText={(value) => updateField('email', value)}
                    error={errors.email}
                    keyboardType="email-address"
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="next"
                  />
                  <Field
                    label="WhatsApp com DDD"
                    placeholder="(11) 99999-9999"
                    value={form.phone}
                    onChangeText={(value) => updateField('phone', value)}
                    error={errors.phone}
                    keyboardType="phone-pad"
                    returnKeyType="done"
                  />
                </View>

                <Pressable
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: consent }}
                  onPress={() => {
                    setConsent((current) => !current);
                    setErrors((current) => ({ ...current, consent: undefined }));
                  }}
                  style={styles.consentRow}
                >
                  <View style={[styles.checkbox, consent && styles.checkboxChecked]}>
                    {consent && <Text style={styles.checkmark}>✓</Text>}
                  </View>
                  <Text style={styles.consentText}>Autorizo o uso dos meus dados e o compartilhamento desta foto pelo WhatsApp.</Text>
                </Pressable>
                {errors.consent && <Text style={styles.errorText}>{errors.consent}</Text>}

                <PrimaryButton label="Tirar foto!" onPress={startPhotoFlow} />
                <Text style={styles.privacyNote}>Sua foto será preparada aqui e você confirma o envio no WhatsApp.</Text>
              </ScrollView>
            </KeyboardAvoidingView>
          )}

          {phase === 'validating' && (
            <View style={styles.centerStage}>
              <Text style={styles.stageTitle}>Validando informações…</Text>
              <View style={styles.loaderRing}><ActivityIndicator size="large" color={PURPLE} /></View>
              <Text style={styles.stageStrong}>Aguarde um momento</Text>
              <Text style={styles.stageCaption}>Estamos preparando a câmera para sua foto.</Text>
            </View>
          )}

          {phase === 'permission' && (
            <View style={styles.centerStage}>
              <Text style={styles.stageTitle}>Precisamos da câmera</Text>
              <Text style={styles.stageCaption}>Autorize o acesso à câmera para tirar sua foto no estande.</Text>
              <PrimaryButton label="Tentar novamente" onPress={startPhotoFlow} />
              <Pressable onPress={() => Linking.openSettings()} style={styles.settingsLink}>
                <Text style={styles.settingsLinkText}>Abrir ajustes do aparelho</Text>
              </Pressable>
            </View>
          )}

          {phase === 'review' && capturedPhoto && (
            <View style={styles.reviewScreen}>
              <View style={styles.pageHeader}>
                <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>‹</Text>
                </Pressable>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>ETAPA 2 DE 3</Text>
                  <Text style={styles.sectionTitle}>Gostou da foto?</Text>
                </View>
              </View>
              <Image source={{ uri: capturedPhoto }} style={styles.reviewPhoto} resizeMode="cover" onLoadEnd={() => setPhotoLoaded(true)} />
              <Text style={styles.reviewHint}>Confira sua foto antes de aplicar a moldura.</Text>
              <View style={styles.actionStack}>
                <PrimaryButton label="Usar esta foto" onPress={openComposition} disabled={!photoLoaded} />
                <PrimaryButton label="Tirar outra" onPress={goBack} secondary />
              </View>
            </View>
          )}

          {phase === 'compose' && capturedPhoto && (
            <View style={styles.composeScreen}>
              <View style={styles.pageHeader}>
                <Pressable accessibilityRole="button" onPress={goBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>‹</Text>
                </Pressable>
                <View style={styles.headerCopy}>
                  <Text style={styles.eyebrow}>ETAPA 3 DE 3</Text>
                  <Text style={styles.sectionTitle}>Sua lembrança</Text>
                </View>
              </View>
              <View
                ref={compositionRef}
                collapsable={false}
                style={[styles.templateBoard, { width: boardSize, height: boardSize }]}
              >
                <Image
                  source={TEMPLATE}
                  style={styles.templateImage}
                  resizeMode="stretch"
                  onLoadEnd={() => setTemplateLoaded(true)}
                />
                <Image
                  source={{ uri: capturedPhoto }}
                  style={styles.templatePhoto}
                  resizeMode="cover"
                  onLoadEnd={() => setPhotoLoaded(true)}
                />
              </View>
              <Text style={styles.messagePreview}>{MESSAGE(form.name.trim())}</Text>
              <Text style={styles.sendHint}>Vamos abrir o WhatsApp com a foto e a mensagem para você confirmar.</Text>
              {shareError ? <Text style={styles.errorText}>{shareError}</Text> : null}
              <View style={styles.actionStack}>
                <PrimaryButton
                  label="Enviar pelo WhatsApp"
                  onPress={sendToWhatsApp}
                  loading={sharing}
                  disabled={!photoLoaded || !templateLoaded}
                />
                <PrimaryButton label="Refazer foto" onPress={() => setPhase('camera')} secondary />
              </View>
            </View>
          )}

          {phase === 'finished' && (
            <View style={styles.centerStage}>
              <View style={styles.successBadge}><Text style={styles.successCheck}>✓</Text></View>
              <Text style={styles.finishTitle}>Obrigado pela atenção!</Text>
              <Text style={styles.finishText}>Sua foto foi encaminhada para o WhatsApp. A entrega pode levar alguns instantes.</Text>
              <PrimaryButton label="Finalizar" onPress={restart} />
            </View>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

type FieldProps = {
  label: string;
  placeholder: string;
  value: string;
  onChangeText: (value: string) => void;
  error?: string;
  keyboardType?: 'default' | 'email-address' | 'phone-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
  autoCorrect?: boolean;
  returnKeyType?: 'next' | 'done';
};

function Field({ label, placeholder, value, onChangeText, error, ...inputProps }: FieldProps) {
  return (
    <View style={styles.fieldBlock}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#92909a"
        style={[styles.input, error && styles.inputError]}
        selectionColor={PURPLE}
        {...inputProps}
      />
      {error && <Text style={styles.errorText}>{error}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: PAPER },
  cameraSafeArea: { backgroundColor: '#050507' },
  page: { flex: 1, backgroundColor: PAPER, overflow: 'hidden' },
  flex: { flex: 1 },
  geometry: { ...StyleSheet.absoluteFill, overflow: 'hidden' },
  geometryShape: { position: 'absolute', borderWidth: 1.5, borderColor: '#cdaedb', borderRadius: 3 },
  formScroll: { flexGrow: 1, paddingHorizontal: 34, paddingTop: 28, paddingBottom: 44 },
  brandLine: { alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 48 },
  brandDot: { width: 8, height: 8, borderRadius: 4, backgroundColor: PURPLE },
  brandText: { color: PURPLE, fontSize: 11, fontWeight: '800', letterSpacing: 1.4 },
  brandDivider: { color: '#b4a4be', fontSize: 17 },
  brandPartner: { color: '#756c7c', fontSize: 13, fontWeight: '600' },
  formHeading: { alignItems: 'center', marginBottom: 28 },
  title: { color: INK, fontSize: 31, fontWeight: '500', letterSpacing: -0.7, textAlign: 'center' },
  subtitle: { color: '#697287', fontSize: 16, textAlign: 'center', marginTop: 4, lineHeight: 23, maxWidth: 310 },
  fields: { gap: 13 },
  fieldBlock: { gap: 6 },
  fieldLabel: { color: '#5b5660', fontSize: 12, fontWeight: '600', marginLeft: 3 },
  input: {
    height: 54,
    borderWidth: 1,
    borderColor: '#d4d0d7',
    borderRadius: 28,
    backgroundColor: 'rgba(255,255,255,0.92)',
    paddingHorizontal: 19,
    color: INK,
    fontSize: 15,
  },
  inputError: { borderColor: '#bc3f63' },
  errorText: { color: '#ad3154', fontSize: 12, lineHeight: 17, marginHorizontal: 5, marginTop: 4 },
  consentRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 20, marginBottom: 3 },
  checkbox: { width: 21, height: 21, borderRadius: 6, borderWidth: 1.3, borderColor: '#aaa4af', backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: PURPLE, borderColor: PURPLE },
  checkmark: { color: '#fff', fontWeight: '800', fontSize: 14, lineHeight: 17 },
  consentText: { flex: 1, color: '#696570', fontSize: 12, lineHeight: 18 },
  primaryButton: {
    minHeight: 52,
    width: '100%',
    borderRadius: 28,
    backgroundColor: PURPLE,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    marginTop: 22,
  },
  primaryButtonText: { color: '#fff', fontSize: 16, fontWeight: '600', letterSpacing: 0.1, textAlign: 'center' },
  secondaryButton: { backgroundColor: '#f3edf7', borderWidth: 1, borderColor: '#e0d1e9', marginTop: 0 },
  secondaryButtonText: { color: PURPLE },
  disabledButton: { opacity: 0.48 },
  pressedButton: { opacity: 0.82, transform: [{ scale: 0.99 }] },
  privacyNote: { color: '#87828b', fontSize: 11, lineHeight: 17, textAlign: 'center', marginTop: 12, paddingHorizontal: 12 },
  centerStage: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingHorizontal: 32, gap: 13 },
  stageTitle: { color: INK, fontSize: 24, fontWeight: '500', textAlign: 'center', marginBottom: 20 },
  loaderRing: { width: 90, height: 90, borderRadius: 45, borderWidth: 4, borderColor: PURPLE_LIGHT, alignItems: 'center', justifyContent: 'center', marginBottom: 4 },
  stageStrong: { color: INK, fontSize: 15, fontWeight: '700', marginTop: 8 },
  stageCaption: { color: MUTED, fontSize: 14, lineHeight: 21, textAlign: 'center', maxWidth: 300 },
  settingsLink: { marginTop: 8, padding: 12 },
  settingsLinkText: { color: PURPLE, fontSize: 14, fontWeight: '600' },
  cameraScreen: { flex: 1, backgroundColor: '#000', justifyContent: 'space-between' },
  cameraTopBar: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18, paddingTop: 12 },
  cameraBack: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.38)' },
  cameraBackText: { color: '#fff', fontSize: 36, lineHeight: 39, marginTop: -4 },
  cameraHeading: { alignItems: 'center' },
  cameraKicker: { color: '#e8d9f1', fontSize: 10, fontWeight: '800', letterSpacing: 1.8 },
  cameraTitle: { color: '#fff', fontSize: 18, fontWeight: '600', marginTop: 3 },
  cameraFlip: { width: 42, height: 42, alignItems: 'center', justifyContent: 'center', borderRadius: 21, backgroundColor: 'rgba(0,0,0,0.38)' },
  cameraFlipText: { color: '#fff', fontSize: 28 },
  cameraBottom: { alignItems: 'center', paddingBottom: 24, gap: 19 },
  cameraHint: { color: '#fff', fontSize: 14, fontWeight: '500', textShadowColor: '#000', textShadowRadius: 4 },
  shutterOuter: { width: 76, height: 76, borderRadius: 38, borderWidth: 4, borderColor: '#fff', alignItems: 'center', justifyContent: 'center', backgroundColor: 'rgba(255,255,255,0.18)' },
  shutterInner: { width: 58, height: 58, borderRadius: 29, backgroundColor: '#fff' },
  shutterDisabled: { opacity: 0.56 },
  reviewScreen: { flex: 1, alignItems: 'center', paddingHorizontal: 22, paddingTop: 12, paddingBottom: 20 },
  pageHeader: { width: '100%', flexDirection: 'row', alignItems: 'center', marginBottom: 18, gap: 13 },
  backButton: { width: 42, height: 42, borderRadius: 21, backgroundColor: '#f0e8f4', alignItems: 'center', justifyContent: 'center' },
  backButtonText: { color: PURPLE, fontSize: 34, lineHeight: 38, marginTop: -4 },
  headerCopy: { flex: 1 },
  eyebrow: { color: PURPLE, fontSize: 10, fontWeight: '800', letterSpacing: 1.4 },
  sectionTitle: { color: INK, fontSize: 22, fontWeight: '600', marginTop: 2 },
  reviewPhoto: { width: '100%', flex: 1, maxHeight: 540, borderRadius: 24, backgroundColor: '#e7e1e9' },
  reviewHint: { color: MUTED, textAlign: 'center', fontSize: 13, marginTop: 15, marginBottom: 8 },
  actionStack: { width: '100%', gap: 10 },
  composeScreen: { flex: 1, alignItems: 'center', paddingHorizontal: 18, paddingTop: 10, paddingBottom: 13 },
  templateBoard: { overflow: 'hidden', backgroundColor: PURPLE },
  templateImage: { width: '100%', height: '100%', position: 'absolute', left: 0, top: 0 },
  templatePhoto: { position: 'absolute', left: '20%', top: '20.75%', width: '60%', height: '60%' },
  messagePreview: { color: PURPLE, fontSize: 15, fontWeight: '700', textAlign: 'center', marginTop: 11 },
  sendHint: { color: MUTED, fontSize: 12, textAlign: 'center', lineHeight: 17, marginTop: 5, marginBottom: 2, maxWidth: 340 },
  successBadge: { width: 66, height: 66, borderRadius: 33, backgroundColor: '#efe3f5', alignItems: 'center', justifyContent: 'center', marginBottom: 7 },
  successCheck: { color: PURPLE, fontSize: 32, fontWeight: '700' },
  finishTitle: { color: INK, fontSize: 28, fontWeight: '600', textAlign: 'center', marginBottom: 3 },
  finishText: { color: MUTED, fontSize: 15, lineHeight: 23, textAlign: 'center', maxWidth: 320 },
});
