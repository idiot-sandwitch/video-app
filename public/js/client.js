socket = io();

const displayError = (msg, error) => {
  if (!error) {
    error = new Error(msg);
  }
  const errorElement = document.getElementById("errors");
  errorElement.innerHTML += `<p>${msg}</p>`;
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

document.querySelector("#join-video").addEventListener("click", async () => {
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
  }
  //check user media for video false
  if (!(await checkUserMedia("audio"))) {
    displayError("Audio Feed is broken");
    constraints.audio = false;
  }
  //set stream to user media output
  const stream = await navigator.mediaDevices.getUserMedia(constraints);
  const feed = document.getElementById("video-feed");
  feed.srcObject = stream;
});
