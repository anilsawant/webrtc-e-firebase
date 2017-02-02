let webRTC = {
  "myId": "1001",
  "makeCallTo": function (callerId) {
    if (callerId) {
      engineersReference.child(this.myId).child('status').set('busy').then(function () {
        exchangeReference.child(callerId).child('from').set(callerId);//Call setup request sent to remote user
        console.log("INFO: Call setup request sent to ", callerId, " @", new Date());
      });
    } else {
      console.log("ERROR: Cannot make call to ", callerId);
    }
  }
};

let getWebcamAccess = function (localVideoElm, done) {
  if (localVideoElm) {
    window.navigator.mediaDevices.getUserMedia({
      video: true,
      audio: false
    }).then(function (stream) {
      window.localStream = localVideoElm.srcObject = stream;
      if (done && typeof done == "function")
        done(true);
      // createRTCPeerConnectionAndCreateOffer(ackFrom);
    }).catch(function (err) {
      if (err.name == "PermissionDeniedError") {
        console.log("ERROR: You cannot make a call without giving permission to access Webcam.");
      } else {
        console.error(err);
      }
      if (done && typeof done == "function")
        done(false);
    });
  }
}
