$(document).ready(function () {
  socket = io();
  let videoGrid = document.getElementById("root-video-grid");
  let joinForm = document.getElementById("join-room-form");
  let roomInput = document.getElementById("room-name");
  let roomTitle = document.getElementById("room-title");
  let selfStream;
  let rootErrorElement = document.getElementById("errors");
  const peer = new Peer();
  const peers = {};

  //displays errors for 3 seconds.
  const displayError = async (message, error) => {
    if (!error) error = new Error(message);
    console.log(message);
    const newError = document.createElement("p");
    newError.classList.add("error-element");
    newError.textContent = message;
    rootErrorElement.appendChild(newError);
    setTimeout(() => {
      rootErrorElement.remove(newError);
    }, 3000);
  };

  //returns devices of kind audioInput or videoInput if exist else returns undefined
  const listMediaDevice = async (type) => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      return devices.filter((device) => device.kind === type);
    } catch (e) {
      console.log(e);
    }
  };

  const checkUserMedia = async (media) => {
    try {
      let stream = null;
      switch (media) {
        case "video":
          stream = await navigator.mediaDevices.getUserMedia({
            video: true,
            audio: false,
          });
          break;
        case "audio":
          stream = await navigator.mediaDevices.getUserMedia({
            video: false,
            audio: true,
          });
          break;
      }
      if (!stream) {
        return false;
      } else return true;
    } catch (e) {
      console.log(e);
    }
  };

  //gets constraints and returns self stream.
  const getSelfStream = async () => {
    const constraints = {};
    const cameras = await listMediaDevice("videoinput");
    const mics = await listMediaDevice("audioinput");

    constraints.video = cameras.length !== 0 ? true : false;
    constraints.audio = mics.length !== 0 ? true : false;

    //Check for constraint video and audio true or not
    if (constraints.video === false) displayError("Video Device doesn't exist");
    if (constraints.audio === false) displayError("Audio Device doesn't exist");

    //check user media for audio false
    if (!(await checkUserMedia("video"))) {
      displayError("Video Feed is broken");
      constraints.video = false;
    }
    //check user media for video false
    if (!(await checkUserMedia("audio"))) {
      displayError("Audio Feed is broken");
      constraints.audio = false;
    }
    let stream = await navigator.mediaDevices.getUserMedia(constraints);
    return stream;
  };

  //room joining initiation callback.
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (roomInput.value === "")
      return displayError("Please enter a room name!");

    selfStream = await getSelfStream();

    joinForm.style = "display:none";
    roomTitle.innerHTML = `Room name: ${roomInput.value}`;
    roomTitle.style = "display:block";

    let selfVideo = document.createElement("div");
    selfVideo.id = `video-element-self`;
    formatVideoElement(selfVideo, peer._id);

    addVideoTrack(selfVideo, selfStream, videoGrid);
    socket.emit("join-room", peer._id, roomInput.value);
  });
  const addVideoTrack = (windowElement, mediaStream, rootElement) => {
    let videoElement = windowElement.children[0];
    videoElement.srcObject = mediaStream;
    videoElement.autoplay = true;

    videoElement.onloadedmetadata = () => {
      videoElement.play();
      rootElement.appendChild(windowElement);
    };
  };

  //adds a video stream and controller buttons to user's window.
  const formatVideoElement = (containerElement, peerId) => {
    const id = peerId === peer._id ? "self" : `${peerId}`;

    let videoElement = document.createElement("video");
    videoElement.id = "video";
    if (self) videoElement.muted = true;

    let controlElement = document.createElement("div");
    controlElement.id = `stream-controls-${id}`;

    let toggleAudioButton = document.createElement("button");
    toggleAudioButton.id = "toggle-mute";
    toggleAudioButton.innerHTML = "toggle audio";
    toggleAudioButton.addEventListener("click", toggleAudio.bind(this, peerId));

    let toggleVideoButton = document.createElement("button");
    toggleVideoButton.id = "toggle-video";
    toggleVideoButton.innerHTML = "toggle Video";
    toggleVideoButton.addEventListener("click", toggleVideo.bind(this, peerId));

    controlElement.appendChild(toggleAudioButton);
    controlElement.appendChild(toggleVideoButton);

    containerElement.appendChild(videoElement);
    containerElement.appendChild(controlElement);
  };

  //TODO: Add real time stream peroperty toggle here.
  const toggleAudio = async (peerId) => {
    console.log(`toggleAudio called with peerId = ${peerId}.`);
    socket.emit("toggle-user-audio", peerId);
  };
  const toggleVideo = async (peerId) => {
    console.log(`toggleVideo called with peerId = ${peerId}.`);
    socket.emit("toggle-user-video", peerId);
  };

  //local rtcp call handler.
  peer.on("call", async (call) => {
    await call.answer(selfStream);
    //LOG: console.log(`answered call from ${call.peer} with`, selfStream);
    let peerVideo = document.createElement("div");
    peerVideo.id = `video-element-${call.peer}`;
    formatVideoElement(peerVideo, call.peer);
    call.on("stream", (peerStream) =>
      addVideoTrack(peerVideo, peerStream, videoGrid)
    );
    call.on("close", () => {
      //LOG: console.log(`Peer Video removed: ${peerVideo.classList}`);
      peerVideo.remove();
    });
    peers[call.peer] = call;
  });

  socket.on("new-user-connected", (peerId) => {
    connectToNewUser(peerId, selfStream);
  });

  socket.on("user-disconnected", (peerId) => {
    //LOG: console.log("disconnecting with user: ", peerId);
    if (peers[peerId]) peers[peerId].close();
  });

  socket.on("room-full", () => {
    return displayError("room is already full.");
  });

  socket.on("admin-audio-toggle", async () => {
    await modifySelfStream("audio");
  });
  socket.on("admin-video-toggle", async () => {
    await modifySelfStream("video");
  });

  const modifySelfStream = async (type) => {
    let enabled;
    switch (type) {
      case "audio":
        enabled = await selfStream.getAudioTracks()[0].enabled;
        selfStream.getAudioTracks()[0].enabled = enabled ? false : true;
        break;
      case "video":
        enabled = await selfStream.getVideoTracks()[0].enabled;
        selfStream.getVideoTracks()[0].enabled = enabled ? false : true;
        break;
    }
  };

  const connectToNewUser = (peerId, stream) => {
    //LOG: console.log(`calling ${peerId} with`, stream);
    let call = peer.call(peerId, stream);
    let peerVideo = document.createElement("div");
    peerVideo.id = `video-element-${peerId}`;
    formatVideoElement(peerVideo, peerId);
    call.on("stream", (peerStream) =>
      addVideoTrack(peerVideo, peerStream, videoGrid)
    );
    call.on("close", () => {
      //LOG: console.log(`Peer Video removed: ${peerVideo.classList}`);
      peerVideo.remove();
    });
    peers[peerId] = call;
    //TODO: add on("error") handling in case call fails
  };

  // muteAudio.addEventListener("click", async () => {
  //   //LOG: console.log("togled audio");
  //   const enabled = await selfStream.getAudioTracks()[0].enabled;
  //   if (enabled) {
  //     selfStream.getAudioTracks()[0].enabled = false;
  //     await setAudioButton();
  //   } else {
  //     selfStream.getAudioTracks()[0].enabled = true;
  //     await setAudioButton();
  //   }
  // });

  // muteVideo.addEventListener("click", async () => {
  //   const enabled = await selfStream.getVideoTracks()[0].enabled;
  //   if (enabled) {
  //     selfStream.getVideoTracks()[0].enabled = false;
  //     await setVideoButton();
  //   } else {
  //     selfStream.getVideoTracks()[0].enabled = true;
  //     await setVideoButton();
  //   }
  // });

  // const setAudioButton = async (button, enabled) => {
  //   if (selfStream.getAudioTracks()[0].enabled) {
  //     muteAudio.innerHTML = "Mute audio";
  //   } else {
  //     muteAudio.innerHTML = "Unmute Audio";
  //   }
  // };

  // const setVideoButton = async () => {
  //   if (selfStream.getVideoTracks()[0].enabled) {
  //     muteVideo.innerHTML = "Disable Video";
  //   } else {
  //     muteVideo.innerHTML = "Enable Video";
  //   }
  // };
});
