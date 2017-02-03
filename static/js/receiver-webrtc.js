let createReceiverPeerConnection = function (offerSDP, done) {
  if (done && typeof done == "function") {
    if (window.exchangeReference) {
      getWebcamAccess(window.localVideoElm, function (err, localStream) {
        if (err) {
          done(err);
          return;
        }
        if (localStream) {
          let receiverPeer = window.receiverPeer = new RTCPeerConnection(null),
              newCallRef = window.exchangeReference.child(window.currentCall.callKey);
          receiverPeer.addStream(localStream);//imp to add stream b4 answering
          receiverPeer.onaddstream = function (evt) {
            console.log("Received remote stream.");
            window.remoteStream = window.remoteVideoElm.srcObject = evt.stream;
          }
          receiverPeer.onicecandidate =  function (evt) {
            if(evt.candidate) {
              console.log("Generated answerCandidate.");
              newCallRef.child("answerCandidate").set(JSON.stringify(evt.candidate));
            }
          };
          receiverPeer.addEventListener('iceconnectionstatechange', function (evt) {
            console.log("iceConnectionState", evt.target.iceConnectionState);
          });
          window.receiverPeer.setRemoteDescription(offerSDP);
          window.receiverPeer.createAnswer().then(function (rtcAnswerSDP) {
            window.receiverPeer.setLocalDescription(rtcAnswerSDP);
            newCallRef.child("answerSDP").set(JSON.stringify(rtcAnswerSDP));
            done(null, true);
          }).catch(function (err) {
            console.error(err);
            done(err);
          });
          /*NOTE: The following should not be done on the receiver side
          newCallRef.child('offerCandidate').on('value', function (snapshot) {
            let remoteICECandidate = snapshot.val();
            if (remoteICECandidate) {
              console.log('remoteICECandidate', remoteICECandidate);
              if (window.receiverPeer) {
                //The following should not be done on the receiver end
                //window.receiverPeer.addIceCandidate(new RTCIceCandidate(JSON.parse(remoteICECandidate)));
              } else {
                console.log("WARN: add ice candiate called too early");
              }
            }
          });*/
        } else {
          done({"message": "localStream is" + localStream, "code":"ERROR"});
        }
      });
    } else {
      done({"message": "exchangeReference is" + window.exchangeReference, "code":"ERROR"});
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
