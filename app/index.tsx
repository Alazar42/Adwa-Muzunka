import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, TouchableOpacity, View, Image, ScrollView } from 'react-native';
import * as MediaLibrary from 'expo-media-library';
import { useEffect, useState } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import Slider from '@react-native-community/slider';
import { MaterialIcons } from '@expo/vector-icons';

interface MusicFile {
  id: string;
  filename: string;
  uri: string;
  duration: number;
}

const defaultThumbnail = require('../assets/images/default-thumbnail.png'); // Update with your asset path

export default function Index() {
  const [musicFiles, setMusicFiles] = useState<MusicFile[]>([]);
  const [playing, setPlaying] = useState<number>(-1);
  const [isPlaying, setIsPlaying] = useState(false);
  const [sound, setSound] = useState<Audio.Sound | null>(null);
  const [progressDuration, setProgressDuration] = useState<number>(0);
  const [totalDuration, setTotalDuration] = useState<number>(0);
  const [isShuffle, setIsShuffle] = useState<boolean>(false);
  const [isRepeat, setIsRepeat] = useState<boolean>(false);
  const [isModalVisible, setIsModalVisible] = useState<boolean>(true); // State to manage modal visibility

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
    setIsPlaying(true);
    await newSound.playAsync();
    if (status.isLoaded) {
      setTotalDuration(status.durationMillis ?? 0);
    }
  };

  const resumeMusic = async () => {
    if (sound) {
      setIsPlaying(true);
      await sound.playAsync();
    }
  };

  const pauseMusic = async () => {
    if (sound) {
      setIsPlaying(false);
      await sound.pauseAsync();
    }
  };

  const handleSliderChange = async (value: number) => {
    if (sound) {
      await sound.setPositionAsync(value);
    }
  };

  const playNext = async () => {
    let nextIndex = playing + 1;
    if (isShuffle) {
      nextIndex = Math.floor(Math.random() * musicFiles.length);
    } else if (nextIndex >= musicFiles.length) {
      nextIndex = 0;
    }
    await playMusic(musicFiles[nextIndex].uri);
    setPlaying(nextIndex);
  };

  const playPrevious = async () => {
    let prevIndex = playing - 1;
    if (isShuffle) {
      prevIndex = Math.floor(Math.random() * musicFiles.length);
    } else if (prevIndex < 0) {
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

    const updatePlaybackStatus = async (status: AVPlaybackStatus) => {
      if (status.isLoaded) {
        setProgressDuration(status.positionMillis ?? 0); // Update the slider with the current position
        setTotalDuration(status.durationMillis ?? 0); // Set the total duration of the track

        // Handle track finishing
        if (status.didJustFinish) {
          if (isRepeat) {
            await sound.setPositionAsync(0); // Restart the current track from the beginning
            await sound.playAsync(); // Replay the current track
          } else {
            await playNext(); // Play the next track
          }
        }
      }
    };

    // Set the playback status update function
    sound.setOnPlaybackStatusUpdate(updatePlaybackStatus);

    // Clean up the effect by removing the status update listener when the component unmounts
    return () => {
      sound.setOnPlaybackStatusUpdate(null);
    };
  }, [sound, playing, isRepeat]);

  useEffect(() => {
    fetchMusicFiles();
  }, []);

  const playPressed = async () => {
    if (isPlaying) {
      await pauseMusic();
    } else {
      await resumeMusic();
    }
  };

  const closeModal = () => {
    setIsModalVisible(false);
    pauseMusic();
    setPlaying(-1);
  };

  const openModal = () => {
    setIsModalVisible(true)
  }

  return (
    <View style={styles.container}>
      <StatusBar style="auto" />
      <View style={styles.header}>
        <Text style={styles.heading}>Uzum Player</Text>
      </View>
      <ScrollView contentContainerStyle={styles.list}>
        {musicFiles.map((file, index) => (
          <TouchableOpacity
            key={file.id}
            onPress={
              playing === index
                ? () => {
                    pauseMusic();
                    setPlaying(-1);
                  }
                : () => {
                    openModal()
                    playMusic(file.uri);
                    setPlaying(index);
                  }
            }
            style={[styles.playButton, playing === index && styles.playingButton]}
          >
            <Image source={defaultThumbnail} style={styles.thumbnail} />
            <View style={styles.trackInfo}>
              <Text style={styles.fileName}>{file.filename}</Text>
              <Text style={styles.duration}>{(file.duration/100).toFixed(1)} Min</Text>
            </View>
            <MaterialIcons
              name={playing === index ? "pause-circle" : "play-circle"}
              size={40}
              color="#1976D2"
            />
          </TouchableOpacity>
        ))}
      </ScrollView>

      {isModalVisible && playing !== -1 && (
        <View style={styles.footer}>
          <TouchableOpacity style={styles.closeButton} onPress={closeModal}>
            <MaterialIcons name="close" size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={styles.currentTrack}>{musicFiles[playing]?.filename}</Text>
          <Slider
            style={styles.slider}
            minimumValue={0}
            maximumValue={totalDuration}
            value={progressDuration}
            onValueChange={handleSliderChange}
            minimumTrackTintColor="#64B5F6"
            maximumTrackTintColor="#BBDEFB"
            thumbTintColor="#E3F2FD"
          />
          <Text style={styles.progressText}>
            {new Date(progressDuration).toISOString().substr(14, 5)} / {new Date(totalDuration).toISOString().substr(14, 5)}
          </Text>
          <View style={styles.controls}>
            <MaterialIcons
              name="shuffle"
              size={30}
              color={isShuffle ? "#E3F2FD" : "#BBDEFB"}
              onPress={handleShuffle}
            />
            <MaterialIcons
              name="skip-previous"
              size={30}
              color="#E3F2FD"
              onPress={playPrevious}
            />
            <MaterialIcons
              name={isPlaying ? "pause-circle" : "play-circle"}
              size={50}
              color="#E3F2FD"
              onPress={playPressed}
            />
            <MaterialIcons
              name="skip-next"
              size={30}
              color="#E3F2FD"
              onPress={playNext}
            />
            <MaterialIcons
              name="repeat"
              size={30}
              color={isRepeat ? "#E3F2FD" : "#BBDEFB"}
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
    flex: 1,
    backgroundColor: "#F5F5F5",
    justifyContent: "center",
  },
  header: {
    backgroundColor: "#003366",
    padding: 20,
    alignItems: "center",
    position: "absolute",
    top: 0,
    width: "100%",
  },
  heading: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    fontFamily: 'monospace',
  },
  list: {
    paddingVertical: 10,
    alignItems: "center",
    marginTop: 80, // Adjust to account for header height
  },
  playButton: {
    backgroundColor: "#E3F2FD",
    borderRadius: 20,
    padding: 15,
    marginVertical: 10,
    width: "90%",
    flexDirection: "row",
    alignItems: "center",
    elevation: 2,
  },
  playingButton: {
    backgroundColor: "#fff",
  },
  thumbnail: {
    width: 60,
    height: 60,
    marginRight: 20,
    borderRadius: 30,
  },
  trackInfo: {
    flex: 1,
    flexDirection: "column",
    justifyContent: "center",
  },
  fileName: {
    color: "#003366",
    fontSize: 16,
    fontWeight: "bold",
    fontFamily: 'monospace',
  },
  duration: {
    color: "#64B5F6",
    fontSize: 14,
    marginTop: 5,
    fontFamily: 'monospace',
  },
  footer: {
    backgroundColor: "#003366",
    padding: 15,
    borderRadius: 20,
    margin: 10,
    elevation: 5,
  },
  closeButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    zIndex: 1,
  },
  currentTrack: {
    color: "#FFF",
    fontSize: 18,
    textAlign: "center",
    marginBottom: 10,
    fontWeight: "bold",
    fontFamily: 'monospace',
  },
  slider: {
    width: "100%",
    height: 40,
    marginBottom: 10,
  },
  progressText: {
    color: "#E3F2FD",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 10,
  },
  controls: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
