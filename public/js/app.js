// Selectors
const videoContent = document.getElementById('video-content');
const turnOff = document.getElementById('turn_off_button');
const muteButton= document.getElementById('mute_button');
const shareScreen= document.getElementById('share_screen_button');
const camSelect= document.getElementById('camera_select');
const micSelect = document.getElementById('mic_select');
const chatForm = document.getElementById('chat_form');



// Socket Initialize
const socket = io();



// Variables
let mediaStream;
let cam = true;
let mute = false;
let currentCamera;
let RTCPeer;
let myVideoId;
let datachannel;



// Mute Button Event
muteButton.addEventListener('click', (e) => {

    if (mute) {
        mute = false;
        muteButton.textContent = "Mute";

        mediaStream.getAudioTracks().forEach(singleTrack => {
            singleTrack.enabled = true;
        })

    } else {
        mute = true;
        muteButton.textContent = "Unmute";
        mediaStream.getAudioTracks().forEach(singleTrack => {
            singleTrack.enabled = false;
        })
    }
})



// Camera Turn Off Event
turnOff.addEventListener('click', (e) => {

    if (cam) {
        cam = false;
        turnOff.textContent = "Camera Turn On";

        mediaStream.getVideoTracks().forEach(singleTrack => {
            singleTrack.enabled = false;
        })

        } else {
        cam = true;
        turnOff.textContent = "Camera Turn Off";

        mediaStream.getVideoTracks().forEach(singleTrack => {
            singleTrack.enabled = true;
        })
        }
})



// Get Media Function
async function getMediaUser(camId, micId) {

    currentCamera = camId === null ? currentCamera : camId;

    const camOption = currentCamera ? {
        deviceId: currentCamera
    } : true

    const initialConstraits = {
        video: true,
        audio: true
    }

    const preferenceCamContraits = {
        video: {
            deviceId:  camId 
        },
        audio: true
    }

    const preferenceMicContraits = {
        video: camOption,
        audio: {
            deviceId:  micId 
        }
    }
   
    try {
        const stream = await window.navigator.mediaDevices.getUserMedia(camId || micId ? camId ? preferenceCamContraits : preferenceMicContraits : initialConstraits)

        mediaStream = stream;
        
        if (!(camId || micId)) {
            mediaDisplay(mediaStream, true);
            getAllCams();
            getAllMics();
            webRTCConnect();


            // Joining Room Event
            socket.emit('joinRoom', roomId)
            
        } else {
            const myVideoElement = document.getElementById(myVideoId);
            myVideoElement.srcObject = mediaStream;


            // Add Two Types Media Tracks in RTC
            const videoTrack = mediaStream.getVideoTracks()[0];
            const audioTrack = mediaStream.getAudioTracks()[0];


            if (RTCPeer) {
                const senders = RTCPeer.getSenders();

            if (camId) {
                const videoSender = senders.find(sender => sender.track.kind === "video");
                videoSender.replaceTrack(videoTrack);

            } else if (micId) {
                const audioSender = senders.find(sender => sender.track.kind === "audio");
                audioSender.replaceTrack(audioTrack);
           }
            }

        }
              
       
    } catch (error) {
        console.log(error);
    }
}

getMediaUser();



// Get Share Screen
async function getScreenShare() {
    try {
        mediaStream = await window.navigator.mediaDevices.getDisplayMedia({
            video: true,
            audio: true
        })

        const trackMic = await window.navigator.mediaDevices.getUserMedia({
            audio: true
        })


        mediaStream.addTrack(trackMic.getAudioTracks()[0], trackMic);

        const myVideoElement = document.getElementById(myVideoId);
        myVideoElement.srcObject = mediaStream;


        const videoTrack = mediaStream.getVideoTracks()[0];
        const systemAudioTrack = mediaStream.getAudioTracks().find(track => {
            return track.label === "System Audio"
        });
        const micAudioTrack = mediaStream.getAudioTracks().find(track => {
            return track.label !== "System Audio"
        });


        if (systemAudioTrack) {
            RTCPeer.addTrack(systemAudioTrack, mediaStream);
        }
        

        const senders = RTCPeer.getSenders();

        const videoSender = senders.find(sender => sender.track.kind === "video");
        const audioSenders = senders.filter(sender => sender.track.kind === "audio");

        videoSender.replaceTrack(videoTrack);
        
        
        if (systemAudioTrack) {
            audioSenders[0].replaceTrack(systemAudioTrack);
            audioSenders[1].replaceTrack(micAudioTrack);
        } else {
            audioSenders[1].replaceTrack(micAudioTrack);
        }

        
    } catch (error) {
        console.log(error);
    }
}



// Share Screen Event
shareScreen.addEventListener('click', getScreenShare)



// Media Display Function
function mediaDisplay(stream, selfStream) {
    const video = document.createElement('video');

    if (selfStream) {
        myVideoId = stream.id;
        video.muted = true;
    };
 
    video.id = stream.id;
    video.srcObject = stream;
    video.addEventListener('loadedmetadata', () => {
        video.play();
    })
    videoContent.appendChild(video)
}



// Access To All Cameras
async function getAllCams() {

    const currentCam = mediaStream.getVideoTracks()[0];
    const allCams = await window.navigator.mediaDevices.enumerateDevices();
    camSelect.innerText = "";

    allCams.forEach(singleCam => {
        if (singleCam.kind === "videoinput") {
            const option = document.createElement('option');
            option.value = singleCam.deviceId;
            option.textContent = singleCam.label;
            option.selected = singleCam.label === currentCam.label ? true : false;
            camSelect.appendChild(option);
    }
})
    
}



// Select Specific Camera
camSelect.addEventListener('input', (e) => {
    const camId = e.target.value;
    getMediaUser(camId);
})



// Access To All Microphones
async function getAllMics() {

    const currentMic = mediaStream.getAudioTracks()[0];
    const allMics = await window.navigator.mediaDevices.enumerateDevices();
    micSelect.innerText = "";

    allMics.forEach(singleMic => {
        if (singleMic.kind === "audioinput") {
            const option = document.createElement('option');
            option.value = singleMic.deviceId;
            option.textContent = singleMic.label;
            option.selected = singleMic.label === currentMic.label ? true : false;
            micSelect.appendChild(option);
    }
})
    
}



// Select Specific Microphone
micSelect.addEventListener('input', (e) => {
    const micId = e.target.value;
    getMediaUser(currentCamera, micId);
})



// Chat Form Handle
chatForm.addEventListener('submit', function (e) {
    e.preventDefault();
    const chat = chatForm[0].value;
    console.log(chat);
    const chatUl = document.querySelector('.chat_display');
    const li = document.createElement('li');
    li.style.listStyle = "none";
    li.style.color = "#E9FFFF";
    li.textContent = "You : " + chat;

    chatUl.appendChild(li);

    datachannel.send(chat);
    chatForm[0].value = ''
})






// Notification About New Joining To Active Users
socket.on('newJoined', () => {
    makeOffer();
})



// Web RTC Connection
function webRTCConnect() {

    // RTC Initialize
    RTCPeer = new RTCPeerConnection( {
        iceServers: [
            {
                urls: [
                   "stun:stun.l.google.com:19302",
                   "stun:stun1.l.google.com:19302",
                   "stun:stun2.l.google.com:19302",
                   "stun:stun3.l.google.com:19302",
                   "stun:stun4.l.google.com:19302",
               ]
            }
        ]
    });
    

    // Add Media Tracks in RTC
    mediaStream.getTracks().forEach(track => {
        RTCPeer.addTrack(track, mediaStream)
    })


    // Send Ice Candidate To Others
    RTCPeer.addEventListener('icecandidate', (data) => {
        socket.emit('iceCandidateSend', data.candidate, roomId);
    })


    // Send Ice Candidate To Others
    RTCPeer.addEventListener('addstream', (data) => {
        mediaDisplay(data.stream)
       
    })
}



// Make An Offer
async function makeOffer() {

    datachannel = RTCPeer.createDataChannel("chat");

    datachannel.addEventListener('open', () => {
        datachannel.addEventListener('message', (e) => {

            const chatUl = document.querySelector('.chat_display');
            const li = document.createElement('li');
            li.style.color = "#E9FFFF";
            li.style.listStyle = "none";
            li.textContent = "Someone : " + e.data;

            chatUl.appendChild(li);
        })
    })

    const offer = await RTCPeer.createOffer();
    RTCPeer.setLocalDescription(offer);

    // Send Offer Event
    socket.emit('sendOffer', offer, roomId);

}



// Receive An Offer
socket.on('receiveOffer', async (offer) => {

    RTCPeer.addEventListener('datachannel', (e) => {
        datachannel = e.channel;
        datachannel.addEventListener('message', (e) => {
            
            const chatUl = document.querySelector('.chat_display');
            const li = document.createElement('li');
            li.style.color = "#E9FFFF";
            li.style.listStyle = "none";
            li.textContent = "Someone : " + e.data;

            chatUl.appendChild(li);
        })
    })


    RTCPeer.setRemoteDescription(offer);
    const answer = await RTCPeer.createAnswer();
    RTCPeer.setLocalDescription(answer);

    // Send Answer Event
    socket.emit('sendAnswer', answer, roomId);
})



// Receive An Answer
socket.on('receiveAnswer', async (answer) => {
    RTCPeer.setRemoteDescription(answer);
})



// Receive Ice Candidate
socket.on('iceCandidateReceive', async (candidate) => {
    RTCPeer.addIceCandidate(candidate)
})



// 
socket.on('someoneLeft', (socketId)=>{

})




