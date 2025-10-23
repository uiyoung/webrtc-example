const socket = io();

let roomId;
let localStream = null;
let peerConnection;

const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const roomInput = document.querySelector('#roomId');
const joinButton = document.querySelector('#joinButton');

async function getMedia() {
  try {
    localStream = await navigator.mediaDevices.getUserMedia({
      video: true,
      audio: true,
    });
    localVideo.srcObject = localStream;
  } catch (error) {
    console.error('미디어 장치 접근 실패', error);
    throw error;
  }
}

// PeerConnection을 생성하고 ICE candidate를 처리하는 함수
function createPeerConnection() {
  const configuration = {
    iceServers: [
      {
        urls: [
          'stun:stun.l.google.com:19302',
          'stun:stun1.l.google.com:19302',
          'stun:stun2.l.google.com:19302',
          'stun:stun3.l.google.com:19302',
        ],
      },
    ],
  };
  peerConnection = new RTCPeerConnection(configuration);

  peerConnection.onicecandidate = (event) => {
    if (event.candidate) {
      socket.emit('candidate', { roomId, candidate: event.candidate });
    }
  };

  peerConnection.ontrack = (event) => {
    remoteVideo.srcObject = event.streams[0];
  };

  // stream 추가
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });
}

async function initCall() {
  await getMedia();
  createPeerConnection();
}

joinButton.addEventListener('click', async () => {
  roomId = roomInput.value.trim();
  if (!roomId) {
    alert('please enter a room ID');
    return;
  }

  try {
    await initCall();
    socket.emit('join', roomId);
  } catch (err) {
    alert('카메라나 마이크를 사용할 수 없습니다. 브라우저 설정을 확인해주세요.');
  }
});

// 방에 참가한 경우, 로컬 비디오 스트림을 추가하고 offer를 생성
socket.on('welcome', async () => {
  console.log('receive welcome');

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('offer', { roomId, offer });
});

// 상대방이 offer를 수신한 경우, answer를 생성
socket.on('offer', async (offer) => {
  console.log('receive offer');

  await peerConnection.setRemoteDescription(offer);

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', { roomId, answer });
});

// 상대방이 answer를 수신한 경우, remoteDescription을 설정
socket.on('answer', async (answer) => {
  console.log('receive answer');
  await peerConnection.setRemoteDescription(answer);
});

// ICE candidate를 수신한 경우, peerConnection에 추가
socket.on('candidate', async (ice) => {
  console.log('receive ice candidate');
  await peerConnection.addIceCandidate(ice);
});
