import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, Image, ScrollView } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Ionicons from '@expo/vector-icons/Ionicons';
import Slider from '@react-native-community/slider';

interface MusicFile {
  id: string;
  filename: string;
  uri: string;
  duration: number;
}

// Import a default thumbnail image
const defaultThumbnail = require('../assets/images/default-thumbnail.png'); // Update with your asset path

export default function Index() {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [playing, setPlaying] = useState<number>(-1);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [progressDuration, setProgressDuration] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);

  const fetchMusicFiles = async () => {
    const permission = await MediaLibrary.requestPermissionsAsync();
    if (permission.granted) {
      const media = await MediaLibrary.getAssetsAsync({
        mediaType: MediaLibrary.MediaType.audio,
      });
      setMusicFiles(media.assets as MusicFile[]);
    }
  };

  const playMusic = async (fileUri: string) => {
    if (sound) {
      await sound.unloadAsync();
    }
    const { sound: newSound, status } = await Audio.Sound.createAsync({ uri: fileUri });
    setSound(newSound);
    await newSound.playAsync();
    if (status.isLoaded) {
      setTotalDuration(status.durationMillis ?? 0);
    }
  };

  const pauseMusic = async () => {
    if (sound) {
      await sound.pauseAsync();
    }
  };

  const handleSliderChange = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value * 10000);
    }
  };

  const playNext = async () => {
    let nextIndex = playing + 1;
    if (nextIndex >= musicFiles.length) {
      nextIndex = 0;
    }
    await playMusic(musicFiles[nextIndex].uri);
    setPlaying(nextIndex);
  };

  const playPrevious = async () => {
    let prevIndex = playing - 1;
    if (prevIndex < 0) {
      prevIndex = musicFiles.length - 1;
    }
    await playMusic(musicFiles[prevIndex].uri);
    setPlaying(prevIndex);
  };

  const handleShuffle = () => {
    setIsShuffle(!isShuffle);
  };

  const handleRepeat = () => {
    setIsRepeat(!isRepeat);
  };

  useEffect(() => {
    if (!sound) {
      return;
    }
    sound.setOnPlaybackStatusUpdate(
      async (status: AVPlaybackStatus) => {
        if (status.isLoaded) {
          if (status.didJustFinish) {
            if (isRepeat) {
              await playMusic(musicFiles[playing].uri);
            } else {
              await playNext();
            }
          } else {
            setProgressDuration(status.positionMillis / 10000);
          }
        }
      }
    );
  }, [sound]);

  useEffect(() => {
    fetchMusicFiles();
  }, []);

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.heading}>Adwa Muzunka</Text>
      </View>
      <ScrollView style={styles.list}>
        {musicFiles.map((file) => (
          <TouchableOpacity
            key={file.id}
            onPress={
              playing !== -1 && playing === musicFiles.indexOf(file)
                ? () => {
                    pauseMusic();
                    setPlaying(-1);
                  }
                : () => {
                    playMusic(file.uri);
                    setPlaying(musicFiles.indexOf(file));
                  }
            }
            style={styles.playButton}
          >
            <View style={styles.row}>
              <Image
                source={defaultThumbnail}
                style={styles.thumbnail}
              />
              <Text style={styles.fileName}>{file.filename}</Text>
              <Ionicons
                name={playing === musicFiles.indexOf(file) ? "pause" : "play"}
                size={40}
                color="white"
              />
            </View>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {playing !== -1 && (
        <View style={styles.footer}>
          <Text style={styles.currentTrack}>
            {musicFiles[playing]?.filename}
          </Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={totalDuration / 10000}
            value={progressDuration}
            onValueChange={handleSliderChange}
            minimumTrackTintColor="#FFFFFF"
            maximumTrackTintColor="#888888"
          />
          <Text style={styles.progressText}>
            {(progressDuration/10).toFixed(2)} / {(totalDuration / 100000).toFixed(2)}
          </Text>
          <View style={styles.controls}>
            <Ionicons
              name="shuffle"
              size={30}
              color={isShuffle ? "white" : "#888888"}
              onPress={handleShuffle}
            />
            <Ionicons
              name="play-skip-back"
              size={30}
              color="white"
              onPress={playPrevious}
            />
            <Ionicons
              name={playing !== -1 && sound && sound._loaded ? "pause" : "play"}
              size={50}
              color="white"
              onPress={
                playing !== -1 && sound && sound._loaded ? pauseMusic : () => playMusic(musicFiles[playing].uri)
              }
            />
            <Ionicons
              name="play-skip-forward"
              size={30}
              color="white"
              onPress={playNext}
            />
            <Ionicons
              name="repeat"
              size={30}
              color={isRepeat ? "white" : "#888888"}
              onPress={handleRepeat}
            />
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: "#121212",
    flex: 1,
    paddingTop: 50,
  },
  header: {
    backgroundColor: "#1F1F1F",
    padding: 20,
    alignItems: "center",
  },
  heading: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "bold",
  },
  list: {
    flex: 1,
    marginTop: 20,
    paddingHorizontal: 10,
  },
  playButton: {
    backgroundColor: "#1F1F1F",
    borderRadius: 10,
    padding: 15,
    marginVertical: 5,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  thumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginRight: 10,
  },
  fileName: {
    fontSize: 18,
    color: "#FFFFFF",
    flex: 1,
  },
  footer: {
    backgroundColor: "#1F1F1F",
    padding: 15,
    alignItems: "center",
  },
  footerThumbnail: {
    width: 50,
    height: 50,
    borderRadius: 5,
    marginBottom: 10,
  },
  currentTrack: {
    color: "#FFFFFF",
    fontSize: 18,
    marginBottom: 10,
  },
  slider: {
    width: "100%",
    height: 40,
  },
  progressText: {
    color: "#FFFFFF",
    marginTop: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 10,
    width: "80%",
  },
});
