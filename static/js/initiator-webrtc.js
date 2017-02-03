let createRTCPeerConnectionAndOffer = function (localStream, done) {
  if (done && typeof done == "function") {
    if (localStream) {
      let initiatorPeer = window.initiatorPeer = new RTCPeerConnection(null);
      initiatorPeer.onaddstream = function (evt) {
        console.log("Received remote stream.");
        window.remoteStream = window.remoteVideoElm.srcObject = evt.stream;
      }
      initiatorPeer.addEventListener('iceconnectionstatechange', function (evt) {
        console.log("iceConnectionState", evt.target.iceConnectionState);
      });
      initiatorPeer.addStream(localStream);//imp to add stream b4 offering
      initiatorPeer.createOffer().then(function (rtcOfferSDP) {
        initiatorPeer.setLocalDescription(rtcOfferSDP);
        done(null, rtcOfferSDP);
      }).catch(function (err) {
        console.error(err);
        done(err)
      });
      /*NOTE: The following should not be done on initiator side
      initiatorPeer.onicecandidate = function (evt) {
        if(evt.candidate){
          console.log('INFO: Local onicecandidate @ ',new Date(), evt.candidate);
          exchangeReference.child(receiverId).child('icecandidate').set(JSON.stringify(evt.candidate))
          .then(function () {
            console.log('Added icecandidate from Initiator side');
          });
        }
      };*/
    } else {
      console.log("ERROR: localStream is", localStream);
    }
  } else {
    console.log("ERROR: Incorrect usage. User callback missing.");
  }
}
let getWebcamAccess = function (localVideoElm, done) {
  if (done && typeof done == "function") {
    if (localVideoElm) {
      window.navigator.mediaDevices.getUserMedia({
        video: true,
        audio: false
      }).then(function (stream) {
        window.localStream = localVideoElm.srcObject = stream;
        done(null, stream);
      }).catch(function (err) {
        if (err.name == "PermissionDeniedError") {
          console.log("ERROR: You cannot make a call without giving permission to access Webcam.");
        } else {
          console.error(err);
        }
        done(err);
      });
    } else {
      done({"message": "localVideoElm is" + localVideoElm, "code":"ERROR"});
    }
  } else {
    console.log("ERROR: Incorrect usage. User callback missing.");
  }
}
