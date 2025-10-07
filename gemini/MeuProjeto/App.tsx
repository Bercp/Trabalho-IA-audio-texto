// App.tsx (Expo / React Native) — STT + TTS com Gemini

import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  Button,
  Image,
  StyleSheet,
  ScrollView,
  ActivityIndicator,
  Platform,
  Alert,
} from "react-native";

import * as ImagePicker from "expo-image-picker";
import { Audio } from "expo-av";
import axios from "axios";

// Ajuste este IP ao seu cenário local.
const API_BASE =
  Platform.OS === "android"
    ? "http://192.168.64.133:3001"
    : "http://192.168.64.133:3001";

export default function App() {
  const [prompt, setPrompt] = useState("");
  const [image, setImage] = useState<{ uri: string; type: string; name: string } | null>(null);
  const [reply, setReply] = useState<string>("");

  const [soundObj, setSoundObj] = useState<Audio.Sound | null>(null);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);

  const [loading, setLoading] = useState<boolean>(false);
  const [statusMsg, setStatusMsg] = useState<string>("");

  useEffect(() => {
    (async () => {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== "granted") {
        Alert.alert("Permissão", "Permissão para acessar fotos é necessária.");
      }
      const mic = await Audio.requestPermissionsAsync();
      if (mic.status !== "granted") {
        Alert.alert("Permissão", "Permissão de microfone é necessária.");
      }
    })();

    return () => {
      if (soundObj) soundObj.unloadAsync().catch(() => {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function pickImage() {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      quality: 0.7,
      allowsMultipleSelection: false,
    });

    if (!result.canceled && result.assets && result.assets.length > 0) {
      const asset = result.assets[0];
      const uri = asset.uri;
      const name = uri.split("/").pop() || "image.jpg";
      const extMatch = /\.(\w+)$/.exec(name);
      const ext = extMatch ? extMatch[1].toLowerCase() : "jpg";
      const type =
        asset.mimeType && asset.mimeType.startsWith("image/")
          ? asset.mimeType
          : `image/${ext}`;
      setImage({ uri, name, type });
    }
  }

  async function sendText() {
    if (!prompt.trim()) {
      Alert.alert("Validação", "Digite um texto antes de enviar.");
      return;
    }
    setLoading(true);
    setStatusMsg("Enviando texto...");
    try {
      const resp = await axios.post(`${API_BASE}/chat`, { prompt }, { timeout: 30000 });
      setReply(resp.data.reply || "");
      setStatusMsg("Resposta recebida com sucesso.");
    } catch (err: any) {
      console.error("Erro chat:", err?.message || err);
      setStatusMsg("Erro ao enviar texto.");
      Alert.alert("Erro", err?.message || "Falha ao enviar texto.");
    } finally {
      setLoading(false);
    }
  }

  async function sendImageText() {
    if (!image) {
      Alert.alert("Validação", "Selecione uma imagem primeiro.");
      return;
    }
    setLoading(true);
    setStatusMsg("Enviando imagem + texto...");
    try {
      const form = new FormData();
      form.append("image", { uri: image.uri, name: image.name, type: image.type } as any);
      form.append("prompt", prompt);

      const resp = await axios.post(`${API_BASE}/chat-image`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 60000,
      });

      setReply(resp.data.reply || "");
      setStatusMsg("Resposta (imagem + texto) recebida.");
    } catch (err: any) {
      console.error("Erro chat-image:", err?.message || err);
      setStatusMsg("Erro ao enviar imagem + texto.");
      Alert.alert("Erro", err?.message || "Falha ao enviar imagem + texto.");
    } finally {
      setLoading(false);
    }
  }

  async function playAudioBase64(base64Str: string) {
    try {
      const uri = `data:audio/mp3;base64,${base64Str}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSoundObj(sound);
      await sound.playAsync();
    } catch (e) {
      console.error("Erro ao tocar áudio:", e);
      Alert.alert("Erro", "Não foi possível reproduzir o áudio.");
    }
  }

  // ====== STT ======
  async function startRecording() {
    try {
      await Audio.setAudioModeAsync({ allowsRecordingIOS: true, playsInSilentModeIOS: true });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setStatusMsg("Gravando...");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao iniciar gravação");
    }
  }

  async function stopRecordingAndTranscribe() {
    try {
      if (!recording) return;
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      setRecording(null);
      if (!uri) return;

      setLoading(true);
      setStatusMsg("Enviando áudio...");
      const name = uri.split("/").pop() || "audio.m4a";
      // Expo GRAVA .m4a no iOS e .3gp/.m4a no Android em alguns casos
      const type = Platform.OS === "ios" ? "audio/m4a" : "audio/3gpp";

      const form = new FormData();
      form.append("audio", { uri, name, type } as any);

      const resp = await axios.post(`${API_BASE}/stt`, form, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120000,
      });
      setReply(resp.data.text || "");
      setStatusMsg("Transcrição concluída.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha ao transcrever");
    } finally {
      setLoading(false);
    }
  }

  // ====== TTS ======
  async function sendTTS() {
    if (!prompt.trim()) {
      Alert.alert("Validação", "Digite um texto antes de sintetizar.");
      return;
    }
    try {
      setLoading(true);
      setStatusMsg("Gerando áudio...");
      const resp = await axios.post(
        `${API_BASE}/tts`,
        { text: prompt, voiceName: "Kore" },
        { timeout: 120000 }
      );
      const { audioBase64, mimeType } = resp.data || {};
      if (!audioBase64) throw new Error("Sem áudio na resposta.");
      const uri = `data:${mimeType || "audio/wav"};base64,${audioBase64}`;
      const { sound } = await Audio.Sound.createAsync({ uri });
      setSoundObj(sound);
      await sound.playAsync();
      setStatusMsg("Áudio reproduzido.");
    } catch (e: any) {
      Alert.alert("Erro", e?.message || "Falha no TTS");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>Chat com Gemini</Text>

      <TextInput
        style={styles.input}
        placeholder="Digite algo..."
        value={prompt}
        onChangeText={setPrompt}
        multiline
        editable={!loading}
      />

      <View style={styles.buttonsRow}>
        <Button title="Enviar Texto" onPress={sendText} disabled={loading} />
        <Button title="Selecionar Imagem" onPress={pickImage} disabled={loading} />
      </View>

      <View style={styles.singleButton}>
        <Button title="Enviar Texto + Imagem" onPress={sendImageText} disabled={loading} />
      </View>

      <View style={styles.buttonsRow}>
        <Button
          title={recording ? "Gravando..." : "Gravar Áudio"}
          onPress={recording ? undefined : startRecording}
          disabled={loading || !!recording}
        />
        <Button
          title="Parar & Transcrever"
          onPress={stopRecordingAndTranscribe}
          disabled={loading || !recording}
        />
      </View>

      <View style={styles.singleButton}>
        <Button
          title="Texto ➜ Falar (TTS)"
          onPress={sendTTS}
          disabled={loading || !prompt.trim()}
        />
      </View>

      {loading && (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" />
          <Text style={styles.statusMsg}>{statusMsg}</Text>
        </View>
      )}

      {!loading && statusMsg ? <Text style={styles.statusMsg}>{statusMsg}</Text> : null}

      {image && <Image source={{ uri: image.uri }} style={styles.previewImage} />}

      <Text style={styles.replyTitle}>Resposta:</Text>
      <Text style={styles.replyText}>{reply}</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    paddingTop: 60,
    backgroundColor: "#f9f9f9",
    alignItems: "center",
  },
  title: { fontSize: 24, fontWeight: "700", marginBottom: 16 },
  input: {
    width: "100%",
    minHeight: 60,
    borderWidth: 1,
    borderColor: "#aaa",
    borderRadius: 8,
    padding: 10,
    backgroundColor: "#fff",
  },
  buttonsRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    width: "100%",
    marginTop: 12,
    gap: 12,
  },
  singleButton: { width: "100%", marginTop: 12 },
  loadingContainer: { marginTop: 16, alignItems: "center", justifyContent: "center", gap: 8 },
  statusMsg: { marginTop: 8, fontSize: 12, color: "#555", textAlign: "center" },
  previewImage: {
    width: "100%",
    height: 220,
    marginTop: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#ddd",
    resizeMode: "cover",
  },
  replyTitle: {
    width: "100%",
    fontSize: 18,
    fontWeight: "600",
    marginTop: 16,
    marginBottom: 6,
  },
  replyText: {
    width: "100%",
    fontSize: 14,
    lineHeight: 20,
    color: "#222",
    backgroundColor: "#fff",
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#eee",
    marginBottom: 24,
  },
});
