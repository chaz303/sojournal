import React from "react";
import { View, Text, TouchableOpacity, Platform } from "react-native";
import { Permissions, Location, ImagePicker } from "expo";
import { AntDesign } from "react-native-vector-icons";

import axios from "axios";

import styles from "../components/styles";
import CaptureView from "../components/CaptureView";
import CaptureToolbar from "../components/CaptureToolbar";
import CommentModal from "../components/CommentModal";

export default class CameraPage extends React.Component {
  camera = null;
  static navigationOptions = {
    header: null
  };
  state = {
    capture: null,
    imageView: false,
    modalVisible: false,
    permissions: {
      hasLocationPermission: null,
      hasCameraPermission: null
    }
  };

  checkPermissions = async () => {
    // const camera = await Permissions.askAsync(Permissions.CAMERA);
    // const hasCameraPermission = camera.status === "granted";

    // const cameraRoll = await Permissions.askAsync(Permissions.CAMERA_ROLL);
    // const hasCameraRollPermission = cameraRoll.status === "granted";

    // const location = await Permissions.askAsync(Permissions.LOCATION);
    // const hasLocationPermission = location.status === "granted";

    // return (
    //   hasCameraPermission && hasCameraRollPermission && hasLocationPermission
    // );
    const {
      hasLocationPermission,
      hasCameraPermission
    } = this.state.permissions;
    return hasLocationPermission && hasCameraPermission;
  };

  getDateFromCamera = input => {
    const separators = new RegExp("[: ]", "g");
    if (!input) return new Date().getTime();
    return new Date(...input.split(separators)).getTime();
  };

  launchCamera = async () => {
    await Permissions.askAsync(
      Permissions.CAMERA,
      Permissions.CAMERA_ROLL,
      Permissions.LOCATION
    )
      .then(async res => {
        if (res.status !== "granted") {
          return alert(
            "The application needs access to your camera and current location in order to take photos and geo-locate them for your use."
          );
        } else {
          await ImagePicker.launchCameraAsync({
            base64: true,
            exif: true
          }).then(async res => {
            let capture;
            if (!res.cancelled) {
              if (Platform.OS === "ios") {
                const location = await Location.getCurrentPositionAsync({});
                capture = {
                  latitude: location.coords.latitude,
                  longitude: location.coords.longitude,
                  base64: res.base64,
                  timestamp: this.getDateFromCamera(res.exif.DateTimeDigitized),
                  uri: res.uri
                };
              } else {
                capture = {
                  latitude: res.exif.GPSLatitude,
                  longitude: res.exif.GPSLongitude,
                  base64: res.base64,
                  timestamp: this.getDateFromCamera(res.exif.DateTime),
                  uri: res.uri
                };
              }
              this.setState({ capture, imageView: true });
            }
          });
        }
      })
      .catch(error => {
        throw error;
      });
  };

  launchLibrary = async () => {
    await Permissions.askAsync(Permissions.CAMERA_ROLL).then(async res => {
      if (res.status === "granted") {
        await ImagePicker.launchImageLibraryAsync({
          type: "Images",
          base64: true,
          exif: true
        }).then(async res => {
          let capture;
          if (!res.cancelled) {
            if (Platform.OS === "ios") {
              const location = await Location.getCurrentPositionAsync({});
              capture = {
                latitude: location.coords.latitude,
                longitude: location.coords.longitude,
                base64: res.base64,
                timestamp: this.getDateFromCamera(res.exif.DateTimeDigitized),
                uri: res.uri
              };
            } else {
              capture = {
                latitude: res.exif.GPSLatitude,
                longitude: res.exif.GPSLongitude,
                base64: res.base64,
                timestamp: this.getDateFromCamera(res.exif.DateTime),
                uri: res.uri
              };
            }
            this.setState({ capture, imageView: true });
          }
        });
      } else {
        alert("Access to the library is required in order to upload a photo.");
      }
    });
  };

  trashPicture = () => {
    this.setState({ imageView: false, capture: {} });
  };

  uploadPicture = async () => {
    const { capture } = this.state;

    axios({
      url:
        "http://ec2-54-199-164-132.ap-northeast-1.compute.amazonaws.com:4000/graphql",
      method: "post",
      data: {
        query: `mutation
          {CreatePhoto(
            input:{
              imageFile:${JSON.stringify(capture.base64)}
              longitude:${capture.longitude}
              latitude: ${capture.latitude}
              createdAt: "${capture.timestamp}"
              comment: "${capture.comment}"
          })}`
      }
    }).then(() => this.setState({ imageView: false }));
  };

  addStory = () => {
    this.setModalVisible();
  };
  setModalVisible = () => {
    this.setState({ modalVisible: !this.state.modalVisible });
  };
  setComment = comment => {
    const current = this.state.capture;
    current.comment = comment;
    this.setState({ capture: current });
    this.setModalVisible();
  };

  async componentDidMount() {}

  render() {
    const { capture, imageView, modalVisible } = this.state;
    return imageView === true ? (
      <React.Fragment>
        <CaptureView capture={capture} />

        <CaptureToolbar
          trashPicture={this.trashPicture}
          uploadPicture={this.uploadPicture}
          addStory={this.addStory}
        />
        {modalVisible ? (
          <CommentModal
            modalVisible={modalVisible}
            setModalVisible={this.setModalVisible}
            setComment={this.setComment}
            saved={this.state.capture.comment}
          />
        ) : null}
      </React.Fragment>
    ) : (
      <View style={styles.choicePage}>
        <TouchableOpacity
          style={styles.choiceButtons}
          onPress={this.launchCamera}
        >
          <AntDesign name="camera" color="white" size={100} />
          <Text>Take Photo</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.choiceButtons}
          onPress={this.launchLibrary}
        >
          <AntDesign name="picture" color="white" size={100} />
          <Text>Pick Photo</Text>
        </TouchableOpacity>
      </View>
    );
  }
}
