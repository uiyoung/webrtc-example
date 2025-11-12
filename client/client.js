const socket = io();

let peerConnection = null;
let localStream = null;
let roomId = null;

const rtcConfig = {
  // ICE 서버 설정(Google 공개 STUN 서버 사용)
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

const localVideo = document.querySelector('#localVideo');
const remoteVideo = document.querySelector('#remoteVideo');
const roomIdInput = document.querySelector('#roomId');
const readyButton = document.querySelector('#readyButton');
const mediaToggleButton = document.querySelector('#mediaToggleButton');
const joinButton = document.querySelector('#joinButton');
const leaveButton = document.querySelector('#leaveButton');
const videoContainer = document.querySelector('#videoContainer');

// 미디어스트림 가져오기(camera, mic)
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

function enableMedia() {
  localStream?.getTracks().forEach((track) => {
    track.enabled = true;
    console.log(`${track.kind} ${track.id} enabled`);
  });
}

function disableMedia() {
  localStream?.getTracks().forEach((track) => {
    track.enabled = false;
    console.log(`${track.kind} ${track.id} disabled`);
  });
}

// WebRTC 연결객체(RTCPeerConnection)을 생성하고 모든 이벤트 핸들러를 설정하는 초기화 함수
function createPeerConnection() {
  peerConnection = new RTCPeerConnection(rtcConfig);

  // 로컬 트랙을 RTCPeerConnection에 추가하여 상대방에게 전송 준비
  localStream.getTracks().forEach((track) => {
    peerConnection.addTrack(track, localStream);
  });

  // 로컬 ICE 후보 수집 및 시그널링 서버를 통해 상대 피어에게 전달
  peerConnection.addEventListener('icecandidate', (e) => {
    if (e.candidate) {
      socket.emit('candidate', { roomId, candidate: e.candidate });
      addLog('ICE candidate sent');
    }
  });

  // 상대방으로부터 스트림(트랙) 수신 시 <video>에 연결
  peerConnection.addEventListener('track', (e) => {
    remoteVideo.srcObject = e.streams[0];
  });

  // 연결 상태 로깅
  peerConnection.addEventListener('connectionstatechange', () => {
    addLog(`Connection: ${peerConnection.connectionState}`);
  });
}

function cleanup() {
  roomIdInput.disabled = false;
  joinButton.disabled = false;
  leaveButton.disabled = true;
}

function addLog(message) {
  const now = new Date();

  const timeString = [now.getHours(), now.getMinutes(), now.getSeconds()]
    .map((n) => String(n).padStart(2, '0'))
    .join(':');

  const msString = String(now.getMilliseconds()).padStart(3, '0');

  const newItem = document.createElement('li');
  newItem.textContent = `[${timeString}.${msString}] ${message}`;

  const list = document.getElementById('log-container');
  list.appendChild(newItem);
  list.scrollTop = list.scrollHeight;
}

readyButton.addEventListener('click', async () => {
  try {
    await getMedia();
    addLog('getMedia Success');

    roomIdInput.disabled = false;
    readyButton.disabled = true;
    joinButton.disabled = false;
    videoContainer.style.display = 'flex';
  } catch (error) {
    alert('카메라나 마이크를 사용할 수 없습니다. 브라우저 설정을 확인해주세요.');
  }
});

joinButton.addEventListener('click', () => {
  roomId = roomIdInput.value.trim();
  if (!roomId) {
    alert('please enter a room id');
    roomIdInput.focus();
    return;
  }

  createPeerConnection();

  // socket.io 서버에 방 참가 요청
  socket.emit('join', roomId);

  joinButton.disabled = true;
  roomIdInput.disabled = true;
});

// TODO: 
leaveButton.addEventListener('click', () => {

});

mediaToggleButton.addEventListener('click', () => {
  mediaToggleButton.classList.toggle('on');
  const isCurrentlyOn = mediaToggleButton.classList.contains('on');

  if (isCurrentlyOn) {
    disableMedia();
    mediaToggleButton.textContent = 'on';
  } else {
    enableMedia();
    mediaToggleButton.textContent = 'off';
  }
});

/* socket.io 시그널링 수신 처리 */

// 방 참가가 되었음을 알림
socket.on('joined', ({ roomId }) => {
  leaveButton.disabled = false;
  addLog(`joined room #${roomId}`);
});

// 방이 full임을 알림
socket.on('room-full', ({roomId, clientCount}) =>{
  cleanup();
  addLog(`room #${roomId} is full.`);
})

// 상대방 피어 접속 감지 시, WebRTC 세션을 시작하기 위해 Offer를 생성하고 전송 (세션 시작자)
socket.on('peer-joined', async () => {
  addLog('peer joined');

  const offer = await peerConnection.createOffer();
  await peerConnection.setLocalDescription(offer);

  socket.emit('offer', { roomId, offer });
  addLog('offer sent');
});

// Offer 수신 시, remoteDescription을 설정하고 Answer를 생성/전송 (세션 응답자)
socket.on('offer', async (offer) => {
  addLog('offer recieved');

  await peerConnection.setRemoteDescription(offer);
  addLog('remoteDescription set (offer)');

  const answer = await peerConnection.createAnswer();
  await peerConnection.setLocalDescription(answer);

  socket.emit('answer', { roomId, answer });
  addLog('answer sent');
});

// 상대방이 보낸 answer를 수신한 경우, remoteDescription을 설정
socket.on('answer', async (answer) => {
  addLog('answer recieved');

  await peerConnection.setRemoteDescription(answer);
  addLog('remoteDescription set (answer)');
});

// ICE candidate를 수신한 경우, peerConnection에 추가
socket.on('candidate', async (ice) => {
  addLog('ICE candidate recieved');
  await peerConnection.addIceCandidate(ice);
});
