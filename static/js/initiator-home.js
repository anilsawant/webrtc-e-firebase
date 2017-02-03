window.onload = function () {
  initializeFirebase();
  setupLogin();
  setupHome();
}
let setupHome = function () {
  setupContactsBook();
  setupVideoCall();

  let btnLogout = document.getElementById('btnLogout');
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
let setupContactsBook = function () {
  let contactsContainer = document.querySelector('.contacts-container'),
      txtSearchUsers = contactsContainer.querySelector('.txt-search-users'),
      btnSearchContacts = contactsContainer.querySelector('#btnSearchContacts'),
      searchContainer = contactsContainer.querySelector('.search-container'),
      $searchContainer = $(searchContainer),
      ownContactsContainer = contactsContainer.querySelector('.own-contacts'),
      $ownContactsContainer = $(ownContactsContainer),
      searchContactsList = searchContainer.querySelector('ul.contacts'),
      leftSlider = document.querySelector('.left-slider'),
      btnToggleLeftSlider = leftSlider.querySelector('.toggle-btn');

  txtSearchUsers.value = '';
  txtSearchUsers.setAttribute('disabled',true);
  window.receiversReference.on('value', function (snap) {
    window.contacts = snap.val();
    if (window.contacts) {
      window.contactIds = Object.keys(window.contacts);
      txtSearchUsers.removeAttribute('disabled');
    }
  });

  btnToggleLeftSlider.addEventListener('click', function () {
    toggleLeftSlider();
  });
  searchContainer.style.display = 'none';
  ownContactsContainer.style.display = 'block';
  txtSearchUsers.addEventListener('keypress', function (evt) {
    if (evt.which == 13) {
      btnSearchContacts.click();
    }
  })
  btnSearchContacts.addEventListener('click', function (evt) {
    evt.stopPropagation();
    if (!txtSearchUsers.disabled) {
      let qId = txtSearchUsers.value.trim();
      if (qId && qId.length>2) {
        let matchedContacts = [];
        searchContactsList.innerHTML = '';
        $searchContainer.slideUp();
        for (id of window.contactIds) {
          if (id.includes(qId)) {
            matchedContacts.push(window.contacts[id]);
          }
        }
        searchContainer.querySelector('.header .title').textContent = matchedContacts.length + " contact(s) found!";
        for (contact of matchedContacts) {
          let contactLi = document.createElement('li');
          contactLi.className = 'contact';
          contactLi.innerHTML = `<span class="glyphicon glyphicon-user"></span>
                                ${contact.name} (${contact.userId})
                                <span data-callerid='${contact.userId}' class="glyphicon glyphicon-earphone"></span>`;
          searchContactsList.appendChild(contactLi);
        }
        $ownContactsContainer.hide(function () {
          $searchContainer.slideDown();
        });
      } else {
        alert('Enter an id with minimun 3 characters to search.')
      }
    }
  });
  searchContainer.addEventListener('click', function (evt) {
    if (evt.target.className.includes('glyphicon-chevron-left')) {
      $searchContainer.hide(function () {
        txtSearchUsers.value = '';
        $ownContactsContainer.slideDown();
      })
    }
  });
  searchContactsList.addEventListener('click', function (evt) {
    evt.stopPropagation();
    if (evt.target.className.includes('glyphicon-earphone')) {
      let callerId = evt.target.getAttribute('data-callerid');
      if (callerId) {
        if (window.$videoOverlay) {
          window.$videoOverlay.find('.call-to').text("Calling " + callerId + "...");
          window.$videoOverlay.fadeIn(function () {
            hideLeftSlider();
            getWebcamAccess(window.localVideo, function (accessReceived) {
              if (!accessReceived) {
                console.log("ERROR: Did not get Webcam access.");
                window.$videoOverlay.fadeOut(function () {
                  window.$videoOverlay.find('.call-to').text("Calling...");
                });
              } else {
                let callProps = {
                  "from": window.user.userId,
                  "to": callerId,
                  "timeOut": 20*1000 // timeOut call after this time
                }
                window.myFirebaseObj.makeCall(callProps, function (err, callData) {
                  if (err) {
                    console.log("Make call error",err);
                    if (err.code == "NOT_FOUND") {
                      console.log("Receiver " + callerId + " was not found.");
                      endCallHandler(false);
                    } else if (err.code == "TRANSACTION_ERROR") {
                      console.log("Receiver " + callerId + " is not online or is already on a call.");
                      // endCallHandler(false);
                      console.log("Alert the user about this.");
                    } else if (err.code == "TIMEDOUT") {
                      endCallHandler(false);
                    } else if (err.code == "CALL_IS_ACTIVE") {
                      if (window.currentCall.state == "ACTIVE") {
                        let fromSDP = "This is a FromSDP of " + window.user.userId;
                        window.myFirebaseObj.exchangeRef(callData.callKey).child("fromSDP").set(fromSDP);
                      } else {
                        console.log("FATAL: Call failed.", window.currentCall);
                      }
                    }
                    return;
                  }

                  if (callData && callData.callKey) {
                    window.currentCall.callKey = callData.callKey;
                    let newCallRef = window.myFirebaseObj.exchangeRef.child(callData.callKey);
                    //on success start listening for the call state changes
                    newCallRef.child('state').on('value', function (snap) {
                      let callState = snap.val();
                      if (callState) {
                        console.log("Call state is", callState);
                        window.currentCall.state = callState;
                        switch (callState) {
                          case "CONNECTING":
                            break;
                          case "ACTIVE":
                            if (!window.currentCall.isTimedOut) {
                              clearTimeout(window.currentCall.timeout);//clear ack wait timeout
                              let fromSDP = "This is a FromSDP of " + window.user.userId;
                              newCallRef.child("fromSDP").set(fromSDP);
                            }
                            break;
                          case "TIMEDOUT":

                            break;
                          case "FINISHED":
                            newCallRef.once('value', function (snap) {
                              let finishedCallStats = snap.val();
                              if (finishedCallStats && finishedCallStats.by != window.user.userId) {
                                endCallHandler(false);
                              }
                            });
                            break;
                          case "REJECTED":
                            newCallRef.once('value', function (snap) {
                              let finishedCallStats = snap.val();
                              if (finishedCallStats && finishedCallStats.by != window.user.userId) {
                                endCallHandler(false);
                              }
                            });
                            break;
                        }
                      }
                    });
                    //on success start listening for toSDP
                    newCallRef.child('toSDP').on('value', function (snap) {
                      let toSDP = snap.val();
                      if (toSDP) {
                        console.log("Received:toSDP=", toSDP);
                      }
                    });
                    //on success start listening for toCandidate
                    newCallRef.child('toCandidate').on('value', function (snap) {
                      let toCandidate = snap.val();
                      if (toCandidate) {
                        console.log("Received:toCandidate=", toCandidate);
                      }
                    });
                  } else {
                    console.log("ERROR: callData is", callData);
                  }
                });
              }
            });
          });
        }
      } else {
        console.log("Can't call to ", callTo);
      }
    }
  })
}
let toggleLeftSlider = function () {
  let leftSlider = document.querySelector('.left-slider');
  if (leftSlider.className.includes('open')) {
    leftSlider.classList.remove('open');
  } else {
    leftSlider.classList.add('open');
  }
}
let hideLeftSlider = function () {
  let leftSlider = document.querySelector('.left-slider');
  if (leftSlider.className.includes('open'))
    leftSlider.classList.remove('open');
}
let setupVideoCall = function () {
  let videoOverlay = document.querySelector('.video-overlay'),
      localVideo = window.localVideo = videoOverlay.querySelector('#localVideo'),
      remoteVideo = window.remoteVideo = videoOverlay.querySelector('#remoteVideo'),
      btnEndCall = window.btnEndCall = videoOverlay.querySelector('.glyphicon-remove-sign');

  window.$videoOverlay = $(videoOverlay);
  btnEndCall.addEventListener('click', function () {
    endCallHandler(true);
  });
}
let endCallHandler = function (iRejected) {
  if (window.localStream) {
    if (window.localStream.stop)
      window.localStream.stop();
    window.localStream.getTracks().forEach(function (track) { track.stop(); });
    window.localStream = null;
  }
  window.myFirebaseObj.endCall(iRejected, function (err, result) {
    if (err) {
      console.log("End call", err);
      return;
    }
    console.log("End call success", result);
  });
  window.$videoOverlay.fadeOut(function () {
    window.$videoOverlay.find('.call-to').text("Calling...");
  });
}
