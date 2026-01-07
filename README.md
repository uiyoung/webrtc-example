# WebRTC example
simple webrtc example

## Run
```bash
$ cd server
$ npm i
$ npm run dev
```

then open http://localhost:3000 in your browser.

## WebRTC 연결 flow(1:1)
1. A가 B와 연결을 시도한다. 
    - A는 피어 간 연결을 시작하려고 한다.
2. A가 `offer`를 생성한다.
    - A는 자신의 오디오/비디오 형식, 암호화 방식, 네트워크 정보 등을 포함한 SDP 데이터를 만든다.
    - 이후 ICE candidate 를 수집하기 시작한다.
3. A가 signaling 채널을 통해 B에게 offer를 전달한다.
    - 이때 signaling 채널은 WebSocket, HTTP, Socket.io 등 어떤 통신 수단이든 될 수 있다.
4. B는 A의 offer를 remote description으로 설정한 뒤 `answer`를 생성한다.
    - B 역시 자신의 오디오/비디오 및 보안 설정을 포함한 SDP를 생성한다.
5. B가 signaling 채널을 통해 `answer`를 A에게 전달한다.
6. 양쪽이 SDP와 ICE candidate 정보를 모두 교환하면, P2P 연결이 수립된다.
    - 이 시점에서 A와 B는 직접 미디어(영상/음성) 및 데이터 전송이 가능한 상태가 된다.

##  TODO
- mesh 4명까지 접속할수있게 
- SFU
