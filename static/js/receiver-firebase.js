let initializeFirebase = function (reinitialize) {
  let config = {
    apiKey: "AIzaSyDGGFYyPbrX6YtNGHIKzdUtAEpD4bnMM8o",
    authDomain: "myfirebaseproject-c1059.firebaseapp.com",
    databaseURL: "https://myfirebaseproject-c1059.firebaseio.com",
    storageBucket: "myfirebaseproject-c1059.appspot.com",
    messagingSenderId: "367980625448"
  };
  let app = window.app = firebase.initializeApp(config);
  let fdb = window.fdb = firebase.database();
  window.receiversReference = window.fdb.ref("app/contacts/receivers");
  window.initiatorsReference = window.fdb.ref("app/contacts/initiators");
  window.exchangeReference = window.fdb.ref("app/exchange");
  window.currentCall = {
    "callTo": '',
    "callFrom": '',
    "timeout": '',
    "initiator": false
  }
  window.myFirebaseObj = {
    "userRef": window.receiversReference,
    "exchangeRef": window.exchangeReference
  }
  window.myFirebaseObj.logout = function (done) {
    if (done && typeof done == 'function') {
      let self = this,
          user = window.user;
      if (user && user.userId) {
        this.userRef.child(user.userId).transaction(function(currentUserStats) {
          if (currentUserStats) {
            if (currentUserStats.status == 'online') {
              currentUserStats.status = "offline";
              return currentUserStats;
            }
            return;
          }
          return currentUserStats;
        }, function (err, committed, snap) {
          if (err) {
            console.error(err);
            done({"message":"Firebase Error", "code":"FIREBASE_ERROR"});
          } else {
            let updatedUserStats = snap ? snap.val() : null;
            if (updatedUserStats) {
              if (committed == true ) {
                removeAllUserListeners(self.userRef, user.userId);
                done(null, true);
              } else if (committed == false) {
                done({"message":"Transaction failed.", "code":"TRANSACTION_ERROR"});
              }
            } else {
              done({"message":"User doesn't exist.", "code":"NOT_FOUND"});
            }
          }
        }, false);
      } else {
        console.log("ERROR: Take break failed. User is", user);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };
  window.myFirebaseObj.takeBreak = function (done) {
    if (done && typeof done == 'function') {
      let self = this,
          user = window.user;
      if (user && user.userId) {
        this.userRef.child(user.userId).transaction(function(currentUserStats) {
          if (currentUserStats) {
            if (currentUserStats.status == 'online') {
              currentUserStats.status = "busy";
              return currentUserStats;
            }
            return;
          }
          return currentUserStats;
        }, function (err, committed, snap) {
          if (err) {
            console.error(err);
            done({"message":"Firebase Error", "code":"FIREBASE_ERROR"});
          } else {
            let updatedUserStats = snap ? snap.val() : null;
            if (updatedUserStats) {
              if (committed == true ) {
                done(null, true);
              } else if (committed == false) {
                done({"message":"Transaction failed.", "code":"TRANSACTION_ERROR"});
              }
            } else {
              done({"message":"User doesn't exist.", "code":"NOT_FOUND"});
            }
          }
        }, false);
      } else {
        console.log("ERROR: Take break failed. User is", user);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };
  window.myFirebaseObj.endBreak = function (done) {
    if (done && typeof done == 'function') {
      let self = this,
          user = window.user;
      if (user && user.userId) {
        this.userRef.child(user.userId).transaction(function(currentUserStats) {
          if (currentUserStats) {
            if (currentUserStats.status == 'busy') {
              currentUserStats.status = "online";
              return currentUserStats;
            }
            return;
          }
          return currentUserStats;
        }, function (err, committed, snap) {
          if (err) {
            console.error(err);
            done({"message":"Firebase Error", "code":"FIREBASE_ERROR"});
          } else {
            let updatedUserStats = snap ? snap.val() : null;
            if (updatedUserStats) {
              if (committed == true ) {
                done(null, true);
              } else if (committed == false) {
                done({"message":"Transaction failed.", "code":"TRANSACTION_ERROR"});
              }
            } else {
              done({"message":"User doesn't exist.", "code":"NOT_FOUND"});
            }
          }
        }, false);
      } else {
        console.log("ERROR: Take break failed. User is", user);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };
  window.myFirebaseObj.sendCallAck =  function (callKey, done) {
    if (callKey) {
      if (done && typeof done == 'function') {
        let self = this,
            user = window.user;
        if (user && user.userId) {
          this.exchangeRef.child(callKey).transaction(function(currentCallProps) {
            if (currentCallProps) {
              //acknowledgement succeeds only if it's "my turn to acknowledge" and "the acknowledgement has not been done before".
              // if (currentCallProps.turn == user.userId && !currentCallProps.to && currentCallProps.state == 'CONNECTING') {
              if (currentCallProps.state == 'CONNECTING') {
                currentCallProps.to = user.userId;
                currentCallProps.turn = currentCallProps.from;
                window.currentCall.callFrom = currentCallProps.from;
                currentCallProps.startTimeStamp = Date.now();
                currentCallProps.state = "ACTIVE";
                return currentCallProps;
              }
              return;
            }
            return currentCallProps;
          }, function (err, committed, snap) {
            if (err) {
              console.error(err);
              done({"message":"Firebase Error.", "code":"FIREBASE_ERROR"});
              // receiversReference.child(userId).child('call').remove();
            } else {
              let updatedCallProps = snap ? snap.val() : null;
              if (updatedCallProps) {
                if (committed == true ) {
                  done(null, true);
                } else if (committed == false) {
                  done({"message":"Acknowledgement failed.", "code":"NOT_MY_TURN"});
                }
              } else {
                done({"message":"Acknowledgement failed.", "code":"INVALID_KEY"});
              }
            }
          });
        } else {
          console.log("ERROR: Take break failed. User is", user);
        }
      } else {
        console.log("ERROR: Incorrect usage. User callback argument missing.");
      }
    } else {
      console.log("ERROR: callKey is", callKey);
    }
  };
  window.myFirebaseObj.endCall = function (sendEndCallMsg) {
    if (window.currentCall && window.currentCall.timeOut  && !window.currentCall.isTimedOut) {
      clearTimeout(window.currentCall.timeOut);
    }
    let callKey = window.currentCall.callKey;
    if (callKey) {
      if (sendEndCallMsg == true) {
        window.exchangeReference.child(callKey).child('toEndCall').set(true).then(function () {
          window.exchangeReference.child(callKey).remove();
        });
      } else if (window.currentCall.isInitiator == true) {
        window.exchangeReference.child(callKey).remove();
      }
    }
    window.receiversReference.child(window.user.userId).child('call').remove();
    window.currentCall = {};
  }// ./endCall()
};

let addUserStatusListener = function (userReference, userId) {
  if (userReference && userId) {
    userReference.child(userId).child('status').on('value', function (snap) {
      let status = snap.val();
      if (status) {
        console.log("User is", status);
        switch (status) {
          case "online":
          window.$loginOverlay.slideUp();
            break;
          case "offline":
          window.$loginOverlay.slideDown();
            break;
          case "busy":
            break;
        }
      }
    });
  } else {
    console.log("FATAL: Users firebase references is", userReference);
  }
};// end addUserStatusListener()
let removeAllUserListeners = function (userReference, userId) {
  if (userReference && userId) {
    userReference.child(userId).child('call').off();
    userReference.child(userId).child('status').off();
  } else {
    console.log("FATAL: Users firebase references is", userReference);
  }
}
let addIncomingCallListeners = function (userReference, userId) {
  if (userReference && userId) {
    userReference.child(userId).child('call').on('value', function (snap) {
      let newCallKey = snap.val();
      if (newCallKey) {
        console.log("Received: callKey=", newCallKey);
        window.currentCall.callKey = newCallKey;
        window.exchangeReference.child(newCallKey).once('value', function (snap) {
          let callStats = snap.val();
          if (callStats) {
            if (callStats.state != "CONNECTING") {
              console.log("WARN: call not in CONNECTING state", callStats);
              userReference.child(userId).child('call').remove();
              window.exchangeReference.child(newCallKey).remove();
              window.currentCall = {};
            } else {
              window.initiatorsReference.child(callStats.from).once('value', function (snap) {//to get caller details
                let caller = snap.val();
                if (caller) {
                  popupCall(caller, function (accepted) {
                    if (accepted == true) {
                      console.log("Call: Accepted");
                      intitiateCall(caller, function (initiateResult) {
                        if (initiateResult == true) {
                          window.myFirebaseObj.sendCallAck(newCallKey, function (err, ackSent) {
                            if (err) {
                              console.log("ERROR: send call ack", err);
                              if (err.code == "INVALID_KEY") {
                                userReference.child(userId).child('call').remove();
                              } else if (err.code == "NOT_MY_TURN") {
                                userReference.child(userId).child('call').remove();
                                window.exchangeReference.child(newCallKey).remove();
                              }
                              return;
                            }
                            if (ackSent == true) {
                              // on success start listening for remote sdp
                              window.exchangeReference.child(newCallKey).child('fromSDP').on('value', function (snap) {
                                let fromSDP = snap.val();
                                if (fromSDP) {
                                  console.log("Received:fromSDP=", fromSDP);
                                  let toSDP = "This is a toSDP of " + userId;
                                  window.exchangeReference.child(newCallKey).child("toSDP").set(toSDP);
                                }
                              });
                              //on success start listening for toSDP
                              window.exchangeReference.child(newCallKey).child('fromCandidate').on('value', function (snap) {
                                let toCandidate = snap.val();
                                if (toCandidate) {
                                  console.log("Received:toCandidate=", toCandidate);
                                }
                              });
                            }
                          });
                        } else if (initiateResult == false) {
                          endCallHandler(true);
                        }
                      });
                    } else if (accepted == false) {
                      console.log("Call: Rejected");
                      window.myFirebaseObj.endCall(true);
                    } else if (accepted == 'timeout') {
                      window.myFirebaseObj.endCall(false);
                    }
                  });
                  //listen to end-call before hand
                  window.exchangeReference.child(newCallKey).child('fromEndCall').on('value', function (snap) {
                    let endCallMsg = snap.val();
                    if (endCallMsg == true) {
                      console.log("Received:fromEndCall=", endCallMsg);
                      endCallHandler(false);
                      popupCall.done();//NOTE: remove this after call screen creation
                    }
                  });
                }
              });
            }
          } else {
            console.log("Error: Call already terminated.");
            userReference.child(userId).child('call').remove();
          }
        });
      }
    });
  } else {
    console.log("ERROR: Cannot listen to incoming calls.", userReference, userId);
  }
};// end addIncomingCallListeners()
