import {
  Button,
  View,
  Text,
  PermissionsAndroid,
  FlatList,
  Pressable,
} from 'react-native';

import DocumentPicker from 'react-native-document-picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import React, {useEffect, useState} from 'react';
import {NativeModules} from 'react-native';

// Custom native module for walking directory and extracting music data
const {FilePathResolverModule} = NativeModules;

export interface Song {
  url: string;
  title: string;
  artist: string;
  duration: number;
}

const requestExternalStorageReadPermissions = async () => {
  const granted = await PermissionsAndroid.request(
    PermissionsAndroid.PERMISSIONS.READ_EXTERNAL_STORAGE,
    {
      title: 'Permissions Required for Reading Music Files',
      message: "We're not doing anything fishy with this, trust us.",
      buttonNegative: 'Cancel',
      buttonPositive: 'OK',
    },
  );
  if (granted === PermissionsAndroid.RESULTS.GRANTED) {
    console.log('Permissions granted');
  }
};

const MusicChooser = (props: {
  onClick?: (item: Song) => void;
  showLoader: any;
  hideLoader: any;
  musicUris: Song[];
  setMusicUris: any;
  cacheKey?: string;
}) => {
  const [directoryUri, setDirectoryUri] = useState('');

  useEffect(() => {
    if (!props.cacheKey) {
      return;
    }

    AsyncStorage.getItem(props.cacheKey).then(songsJsonString => {
      if (!songsJsonString) {
        return;
      }

      console.log('Fetched cached training songs');
      const songs: Song[] = JSON.parse(songsJsonString);
      props.setMusicUris(songs);
    });
  }, []);

  async function openFolder() {
    try {
      await requestExternalStorageReadPermissions();
      const pickDirectoryResult = await DocumentPicker.pickDirectory();
      if (!pickDirectoryResult) {
        return;
      }

      const uri = pickDirectoryResult.uri;
      setDirectoryUri(uri);

      console.log(uri);
      props.showLoader(() => {
        setTimeout(() => {
          FilePathResolverModule.getDirectoryMusicFiles(uri, (res: Song[]) => {
            console.log(`Found ${res.length} songs.`);
            props.setMusicUris(res);
            if (props.cacheKey) {
              AsyncStorage.setItem(props.cacheKey, JSON.stringify(res)).then(
                () => props.hideLoader(),
              );
            } else {
              props.hideLoader();
            }
          });
        }, 1000);
      });

      /*
      setDirectoryUri(pickDirectoryResult);

      const dirReadResult = await RNFS.readDir(pickDirectoryResult);*/
      //console.log(pickDirectoryResult);
    } catch (err) {
      if (DocumentPicker.isCancel(err)) {
        // User cancelled the picker, exit any dialogs or menus and move on
      } else {
        throw err;
      }
    }
  }

  const clickHandler = props.onClick || (() => {});
  const renderMusic = ({item}: {item: Song}) => {
    return (
      <Pressable
        style={{padding: 10}}
        onPress={() => clickHandler(item)}
        android_ripple={{color: 'lightblue'}}>
        <Text>{item.title}</Text>
        <Text>{item.artist}</Text>
      </Pressable>
    );
  };

  return (
    <View>
      <View style={{padding: 10}}>
        <Button title={'Choose Folder'} onPress={openFolder} />
        <Text>Current directory: {directoryUri}</Text>
      </View>
      <View style={{padding: 10}}>
        <FlatList data={props.musicUris} renderItem={renderMusic} />
      </View>
    </View>
  );
};

export default MusicChooser;
