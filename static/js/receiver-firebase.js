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
              if (currentCallProps.state == 'CONNECTING') {
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
                  done({"message":"Acknowledgement failed.", "code":"INVALID_CALL_STATE"});
                }
              } else {
                done({"message":"Acknowledgement failed.", "code":"INVALID_KEY"});
              }
            }
          }, false);
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
  window.myFirebaseObj.clearCurrentCall = function () {
    if (window.currentCall.from == window.user.userId) {
      window.receiversReference.child(window.currentCall.to).child('call').remove();
    } else {
      window.receiversReference.child(window.user.userId).child('call').remove();
    }
    window.currentCall = {};
  }
  window.myFirebaseObj.endCall = function (iRejected, done) {
    if (done && typeof done == 'function') {
      if (window.currentCall && window.currentCall.timeout  && !window.currentCall.isTimedOut) {
        clearTimeout(window.currentCall.timeout);
      }
      let callKey = window.currentCall.callKey;
      if (callKey) {
        if (iRejected) {
          window.myFirebaseObj.exchangeRef.child(callKey).transaction(function(currentCallProps) {
            if (currentCallProps) {
              if (currentCallProps.state == "CONNECTING") {
                currentCallProps.state = "REJECTED";
                currentCallProps.by = window.user.userId;
                currentCallProps.offerSDP = null;
                currentCallProps.answerSDP = null;
                currentCallProps.answerCandidate = null;
                return currentCallProps;
              } else if (currentCallProps.state == "ACTIVE") {
                currentCallProps.state = "FINISHED";
                currentCallProps.by = window.user.userId;
                currentCallProps.offerSDP = null;
                currentCallProps.answerSDP = null;
                currentCallProps.answerCandidate = null;
                currentCallProps.endTimeStamp = Date.now();
                return currentCallProps;
              }
              return;
            }
            return currentCallProps;
          }, function (err, committed, snap) {
            if (err) {
              console.error(err);
              window.myFirebaseObj.clearCurrentCall();
              done({"message":"Firebase Error.", "code":"FIREBASE_ERROR"});
            } else {
              let updatedCallProps = snap ? snap.val() : null;
              if (updatedCallProps) {
                window.myFirebaseObj.clearCurrentCall();
                done(null, committed);
              } else {
                window.myFirebaseObj.clearCurrentCall();
                done({"message":"Call end failed.", "code":"NOT_FOUND"});
              }
            }
          }, false);
        } else {
          window.myFirebaseObj.clearCurrentCall();
          done(null, true);
        }
      } else {
        done({"message":"Call key not found.", "code":"NOT_FOUND"});
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  }// ./endCall2()
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
    console.log("FATAL: User's firebase references is", userReference);
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
        let newCallRef = window.exchangeReference.child(newCallKey);
        newCallRef.once('value', function (snap) {
          let callStats = snap.val();
          if (callStats) {
            window.currentCall = callStats;
            window.currentCall.callKey = newCallKey;
            if (callStats.state != "CONNECTING") {
              console.log("WARN: invalid call state", callStats.state);
              userReference.child(userId).child('call').remove();
              window.currentCall = {};
            } else {
              //on success start listening for the call state changes
              newCallRef.child('state').on('value', function (snap) {
                let callState = snap.val();
                if (callState) {
                  console.log("Call state is", callState);
                  switch (callState) {
                    case "CONNECTING":
                      break;
                    case "ACTIVE":

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

              //get caller details
              window.initiatorsReference.child(callStats.from).once('value', function (snap) {
                let caller = snap.val();
                if (caller) {
                  popupCall(caller, function (accepted) {
                    if (accepted == true) {
                      popupCall.done();
                      window.myFirebaseObj.sendCallAck(newCallKey, function (err, ackSent) {
                        if (err) {
                          console.log("ERROR: send call ack", err);
                          if (err.code == "INVALID_KEY") {
                            userReference.child(userId).child('call').remove();
                          } else if (err.code == "INVALID_CALL_STATE") {
                            userReference.child(userId).child('call').remove();
                          }
                          return;
                        }
                        if (ackSent == true) {
                          let offerSDP = JSON.parse(callStats.offerSDP);
                          receiveCall(caller, offerSDP, function (err, initiateResult) {
                            if (err) {
                              console.log("ERROR: intitiate Call", err);
                              if (err.name == "PermissionDeniedError") {
                                endCallHandler(true);
                              } else {
                                endCallHandler(false);
                              }
                              return;
                            }
                            if (initiateResult == true) {
                              console.log("SUCCESS: Call initiated");
                            } else {
                              endCallHandler(false);
                            }
                          });
                        }
                      });// ./end send acknowledgement
                    } else if (accepted == false) {//rejected by user
                      endCallHandler(true);
                    } else if (accepted == 'timeout') {
                      popupCall.done();
                      window.myFirebaseObj.clearCurrentCall();
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
};// end add Incoming CallListeners()
