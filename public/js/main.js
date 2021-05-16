$(document).ready(function () {
  socket = io();
  let videoGrid = document.getElementById("root-video-grid");
  let joinForm = document.getElementById("join-room-form");
  let roomInput = document.getElementById("room-name");
  let selfStream;

  let rootErrorElement = document.getElementById("errors");
  const displayError = async (message, error) => {
    if (!error) error = new Error(message);
    console.log(message);
    const newError = document.createElement("p");
    newError.classList.add("error-element");
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

  /*0: InputDeviceInfo
deviceId: ""
groupId: "e21434bb369a3f5cf04421caa570acbf40d772ae6236a19c491993ebdd4b48d1"
kind: "audioinput"
label: ""
__proto__: InputDeviceInfo*/

  const peer = new Peer();
  const peers = {};
  joinForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    if (roomInput.value === "")
      return displayError("Please enter a room name!");
    //DEBUG LOG: console.log(`client ${socket.id} passed a join request`);
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

    joinForm.style = "display:none";
    selfStream = await navigator.mediaDevices.getUserMedia(constraints);
    let selfVideo = document.createElement("video");
    selfVideo.classList.add("self-video");
    selfVideo.muted = true;
    await addVideoTrack(selfVideo, selfStream, videoGrid);
    socket.emit("join-room", peer._id, roomInput.value);
  });

  peer.on("call", async (call) => {
    await call.answer(selfStream);
    console.log(`answered call from ${call.peer} with`, selfStream);
    let peerVideo = document.createElement("video");
    peerVideo.classList.add(`video-${call.peer}`);
    call.on(
      "stream",
      async (peerStream) =>
        await addVideoTrack(peerVideo, peerStream, videoGrid)
    );
    peers[call.peer] = call;
  });

  socket.on("new-user-connected", (userId) => {
    connectToNewUser(userId, selfStream);
  });

  socket.on("user-disconnected", (userId) => {
    if (peers[userId]) peers[userId].close();
  });

  socket.on("room-full", () => {
    return displayError("room is already full.");
  });

  const connectToNewUser = (userId, stream) => {
    console.log(`calling ${userId} with`, stream);
    let call = peer.call(userId, stream);
    let peerVideo = document.createElement("video");
    peerVideo.classList.add(`video-${userId}`);
    call.on(
      "stream",
      async (peerStream) =>
        await addVideoTrack(peerVideo, peerStream, videoGrid)
    );
    call.on("close", () => {
      peerVideo.remove();
    });
    peers[userId] = call;
  };

  const addVideoTrack = async (videoElement, mediaStream, rootElement) => {
    videoElement.srcObject = mediaStream;
    videoElement.autoplay = true;
    await rootElement.appendChild(videoElement);

    // videoElement.setAttribute('autoplay','')
    // videoElement.onloadedmetadata = () => {
    //   videoElement.play();
    //   rootElement.appendChild(videoElement);
    // }
  };
});
