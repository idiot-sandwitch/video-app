socket = io();
let root = document.getElementById("video-chat-lobby");
let divVideoChat = document.getElementById("video-chat-room");
let joinButton = document.getElementById("join-video");
const userFeed = document.getElementById("user-video");
const peerFeed = document.getElementById("peer-video");
let roomInput = document.getElementById("roomName");
let rtcPeerConnection;
let userStream;

//Ice Server Configuration, currently includes only stun servers.
let iceServers = {
  iceServers: [
    { urls: "stun:stun.ekiga.net:3478" },
    { urls: "stun:stun.l.google.com:19302" },
  ],
};

//initializes user media and broadcasts ready for p2p status if the second user has joined.
let isOwner = false;
socket.on("room-joined", async (isNew) => {
  //DEBUG LOG: console.log(`room-joined request caught by client ${socket.id}`);
  isOwner = isNew;
  const constraints = {};
  const cameras = await listMediaDevice("videoinput");
  const mics = await listMediaDevice("audioinput");

  constraints.video = cameras.length !== 0 ? true : false;
  constraints.audio = mics.length !== 0 ? true : false;

  //Check for constraint video and audio true or not
  if (constraints.video === false)
    return displayError("Video Device doesn't exist");
  if (constraints.audio === false)
    return displayError("Audio Device doesn't exist");

  //check user media for audio false
  if (!(await checkUserMedia("video"))) {
    displayError("Video Feed is broken");
    constraints.video = false;
    return;
  }
  //check user media for video false
  if (!(await checkUserMedia("audio"))) {
    displayError("Audio Feed is broken");
    constraints.audio = false;
    return;
  }
  //set stream to user media output

  root.style = "display:none";
  userStream = await navigator.mediaDevices.getUserMedia(constraints);
  userFeed.srcObject = userStream;
  userFeed.onloadedmetadata = () => userFeed.play();
  if (!isOwner) socket.emit("ready", roomInput.value);
});

socket.on("room-full", () => {
  displayError("cannot join room as it is full!");
});

socket.on("ready", () => {
  //DEBUG LOG: console.log(
  //   `client ${socket.id} recieved forwarded ready request from server.`
  // );
  if (isOwner) {
    rtcpConnection = new RTCPeerConnection(iceServers);
    rtcpConnection.onicecandidate = (e) => {
      if (e.candidate) socket.emit("candidate", e.candidate, roomInput.value);
    };
    rtcpConnection.ontrack = onTrackFn;
    rtcpConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcpConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcpConnection
      .createOffer()
      .then((offer) => {
        rtcpConnection.setLocalDescription(offer);
        socket.emit("offer", offer, roomInput.value);
      })
      .catch((error) => handleError(error.message, error));
  }
});

socket.on("candidate", (candidate) => {
  let icecandidate = new RTCIceCandidate({
    candidate: candidate.candidate,
    sdpMid: candidate.sdpMid,
    sdpMLineIndex: candidate.sdpMLineIndex,
  });
  rtcpConnection.addIceCandidate(icecandidate);
});

socket.on("offer", (offer) => {
  //DEBUG LOG: console.log(
  //   `client ${socket.id} recieved forwarded offer request from server.`
  // );
  if (!isOwner) {
    rtcpConnection = new RTCPeerConnection(iceServers);
    rtcpConnection.onicecandidate = (e) => {
      if (e.candidate) socket.emit("candidate", e.candidate, roomInput.value);
    };
    rtcpConnection.ontrack = onTrackFn;
    rtcpConnection.addTrack(userStream.getTracks()[0], userStream);
    rtcpConnection.addTrack(userStream.getTracks()[1], userStream);
    rtcpConnection.setRemoteDescription(offer);
    rtcpConnection.createAnswer(
      (answer) => {
        rtcpConnection.setLocalDescription(answer);
        socket.emit("answer", answer, roomInput.value);
      },
      (error) => handleError(error.message, error)
    );
  }
});

socket.on("answer", (answer) => {
  rtcpConnection.setRemoteDescription(answer);
});

const onTrackFn = (e) => {
  peerFeed.srcObject = e.streams[0];
  peerFeed.onloadedmetadata = () => peerFeed.play();
};

const displayError = (msg, error) => {
  if (!error) {
    error = new Error(msg);
  }
  const errorElement = document.getElementById("errors");
  const newError = document.createElement("p");
  newError.textContent = msg;
  errorElement.appendChild(newError);
  setTimeout(() => {
    errorElement.removeChild(newError);
  }, 3000);
  if (typeof error !== "undefined") {
    console.error(error);
  }
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

document.getElementById("join-video").addEventListener("click", async () => {
  if (roomInput.value === "") return displayError("Please enter a room name!");
  //DEBUG LOG: console.log(`client ${socket.id} passed a join request`);
  socket.emit("join", roomInput.value);
});
