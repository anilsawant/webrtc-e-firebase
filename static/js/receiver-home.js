window.onload = function () {
  initializeFirebase();
  setupLogin();
  setupHome();
}
let setupHome = function () {
  setupVideoCall();

  let btnTakeBreak = document.getElementById('btnTakeBreak'),
      btnLogout = document.getElementById('btnLogout');

  btnTakeBreak.addEventListener('click', function (evt) {
    if (evt.target.textContent == 'Take Break') {
      window.myFirebaseObj.takeBreak(function (err, result) {
        if (err) {
          console.log("ERROR: Take break", err);
          return;
        }
        if (result == true) {
          evt.target.textContent = 'End Break';
        }
      });
    } else {
      window.myFirebaseObj.endBreak(function (err, result) {
        if (err) {
          console.log("ERROR: End break", err);
          return;
        }
        if (result == true) {
          evt.target.textContent = 'Take Break';
        }
      });
    }
  });

  btnLogout.addEventListener('click', function (evt) {
    evt.preventDefault();
    window.myFirebaseObj.logout(function (err, result) {
      if (err) {
        console.log("ERROR: Logout", err);
        return;
      }
      if (result == true) {
        console.log("SUCCESS: Logout.");
      }
    });
  });
}
let setupVideoCall = function () {
  let videoOverlay = document.querySelector('.video-overlay'),
      localVideo = window.localVideoElm = videoOverlay.querySelector('#localVideo'),
      remoteVideo = window.remoteVideoElm = videoOverlay.querySelector('#remoteVideo'),
      btnEndCall = window.btnEndCall = videoOverlay.querySelector('.glyphicon-remove-sign');

  window.$videoOverlay = $(videoOverlay);
  btnEndCall.addEventListener('click', function () {
    endCallHandler(true);
  });
}
let popupCall = function(caller, done) {
  if (caller && done && (typeof done == 'function')) {
    let callerName = caller.name || 'Call',
        callerPic = caller.photoURL || "static/img/default-avatar.png",
        popupOverlay = document.createElement('div'),
        callBox = `<div class="call-box margin-auto text-center">
                      <div><span class="glyphicon glyphicon-phone-alt"></span> <span>${callerName}</span></div>
                      <div>
                        <img class="caller-pic" src="${callerPic}" alt="Caller pic">
                      </div>
                      <div class="call-controls"></div>
                    </div>`;
    popupOverlay.className = 'incoming-call-overlay display-flex';
    popupOverlay.innerHTML = callBox;
    popupOverlay.tabIndex = 1;

    let callWaitTimeout = setTimeout(function () {
      done('timeout');
      // popupCall.done();
    }, 10*1000);// wait for 10s for user action, then timeout
    let btnReject = document.createElement('button');
    btnReject.className = 'btn-reject btn btn-sm btn-danger';
    btnReject.textContent = 'Reject';
    btnReject.addEventListener('click', function() {
      clearTimeout(callWaitTimeout);
      done(false);
      btnAccept.setAttribute('disabled', true);
      // popupCall.done();
    });
    let btnAccept = document.createElement('button');
    btnAccept.className = 'btn-accept btn btn-sm btn-success';
    btnAccept.textContent = 'Accept';
    btnAccept.addEventListener('click', function() {
      clearTimeout(callWaitTimeout);
      done(true);
      btnAccept.setAttribute('disabled', true);
      // popupCall.done();
    });
    popupOverlay.querySelector('.call-controls').appendChild(btnReject);
    popupOverlay.querySelector('.call-controls').appendChild(btnAccept);
    document.body.appendChild(popupOverlay);
    setTimeout(function () {
      popupCall.isActive = true;
      popupOverlay.querySelector('.call-box').style.transform = 'scale(1)';
      popupOverlay.style.opacity = 1;
      btnAccept.focus();
    }, 10);
  } else {
    console.log("ERROR: cannot show call.", caller, done);
  }
}
popupCall.done = function () {
  let popupOverlay = document.querySelector('.incoming-call-overlay');
  if (popupOverlay) {
    popupCall.isActive = false;
    btnAccept.setAttribute('disabled', true);
    btnReject.setAttribute('disabled', true);
    popupOverlay.querySelector('.call-box').style.transform = 'scale(.2)';
    popupOverlay.style.opacity = 0;
    setTimeout(function () {
      document.body.removeChild(popupOverlay);
    }, 300);//more than transform-scale time
  }
}

let receiveCall = function (caller, offerSDP, done) {
  if (done && typeof done == 'function') {
    window.$videoOverlay.find('.call-msg').text("Call from " + caller.userId + "...");
    window.$videoOverlay.fadeIn(function () {
      createReceiverPeerConnection(offerSDP, function (err, result) {
        if (err) {
          window.$videoOverlay.fadeOut(function () {
            window.$videoOverlay.find('.call-msg').text("Calling...");
          });
          done(err);
          return;
        }
        done(null, result);
      });// end create Receiver PeerConnection()
    });
  } else {
    console.log("ERROR: Incorrect usage. User callback missing.");
  }
}
let endCallHandler = function (iRejected) {
  if (window.localStream) {
    if (window.localStream.stop)
      window.localStream.stop();
    window.localStream.getTracks().forEach(function (track) { track.stop(); });
    window.localStream = null;
  }
  if (window.receiverPeer) {
    window.receiverPeer.close();
    window.receiverPeer = null;
  }
  window.myFirebaseObj.endCall(iRejected, function (err, result) {
    if (err) {
      console.log("End call", err);
      return;
    }
    console.log("End call success", result);
  });
  if (popupCall.isActive) {
    popupCall.done();
  } else {
    window.$videoOverlay.fadeOut(function () {
      window.$videoOverlay.find('.call-msg').text("Calling...");
    });
  }
}
