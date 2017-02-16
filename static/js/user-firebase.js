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
  window.usersRef = window.fdb.ref("app2/users");
  window.phoneDirRef = window.fdb.ref("app2/phoneDirectory");
  window.exchangeReference = window.fdb.ref("app2/exchange");
  window.myFirebaseObj = {
    "phoneDirRef": window.phoneDirRef,
    "exchangeRef": window.exchangeReference,
    "usersRef": window.usersRef
  }
  window.myFirebaseObj.logout = function (done) {
    if (done && typeof done == 'function') {
      let self = this,
          user = window.user;
      if (user && user.userId) {
        this.usersRef.child(user.userId).transaction(function(currentUserStats) {
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
                removeAllUserListeners(self.usersRef, user.userId);
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
        this.usersRef.child(user.userId).transaction(function(currentUserStats) {
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
        this.usersRef.child(user.userId).transaction(function(currentUserStats) {
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
  window.myFirebaseObj.offerCall = function (props, done) {
    if (done && typeof done == 'function') {
      if (props && props.from && props.to && props.offerSDP) {
        if (props.from == props.to) {
          done({"message":"Cannot call yourself.","code":"ERROR"});
        } else {
          window.currentCall = {
            "from": props.from,
            "to": props.to,
            "offerSDP": props.offerSDP,
            "state": "CONNECTING",
            "offerTimeStamp": Date.now()
          }
          let self = this,
              newCallRef = self.exchangeRef.push(window.currentCall),
              callKey = newCallRef.key;
          self.usersRef.child(props.to).transaction(function(currentReceiversStats) {
            if (currentReceiversStats) {
              if (currentReceiversStats.status == 'online' && !currentReceiversStats.call) {
                currentReceiversStats.call = callKey;
                return currentReceiversStats;
              }
              return;
            }
            return currentReceiversStats;
          }, function (err, committed, snap) {
            if (err) {
              console.error(err);
              done({"message": "Transaction aborted.","code":"FIREBASE_ERROR"});
              newCallRef.remove();
            } else {
              let updatedReceiversStats = snap ? snap.val() : null;
              if (updatedReceiversStats) {
                if (committed == true ) {
                  props.callKey = callKey;
                  done(null, props);// offer done. Start listening for call state change now
                  window.myFirebaseObj.setCallTimeout(props, function (err, timedoutData) {
                    if (err) {
                      console.log("Call timeout error",err);
                      if (err.code == "FIREBASE_ERROR") {
                        window.currentCall = {};
                        newCallRef.remove();
                        self.usersRef.child(callerId).child('call').remove();
                      } else if (err.code == "TRANSACTION_ERROR") {//call is not in CONNECTING state
                        done(err);
                      } else if (err.code == "NOT_FOUND") {
                        console.log("ERROR: callKey is",props.callKey );
                      } else if (err.code == "CALL_IS_ACTIVE") {
                        console.log("ERROR: CALL_IS_ACTIVE callKey is",props.callKey );
                        done(err);
                      }
                      return;
                    }
                    done({"message": "Call timed out.","code":"TIMEDOUT"});
                  });
                } else if (committed == false) {
                  done({"message": "Transaction failed.","code":"TRANSACTION_ERROR"});
                  window.currentCall = {};
                  newCallRef.remove();
                }
              } else {
                done({"message": "Transaction failed.","code":"NOT_FOUND"});
                window.currentCall = {};
                newCallRef.remove();
              }
            }
          }, false);
        }
      } else {
        console.log("ERROR: Cannot make call. Call properties obj is", props);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };
  window.myFirebaseObj.setCallTimeout = function (props, done) {
    if (done && typeof done == 'function') {
      let self = this;
      if (props && props.callKey && props.to) {
        window.currentCall.timeout = setTimeout(function () {
          window.currentCall.isTimedOut = true;
          console.log('Ack wait timeout called:');
          self.exchangeRef.child(props.callKey).transaction(function(currentCallProps) {
            if (currentCallProps) {
              if (currentCallProps.state == "CONNECTING") {
                currentCallProps.state = "TIMEDOUT";
                return currentCallProps;
              }
              return;
            }
            return currentCallProps;
          }, function (err, committed, snap) {
            if (err) {
              console.error(err);
              done({"message":"Firebase Error.", "code":"FIREBASE_ERROR"});
            } else {
              let updatedCallProps = snap ? snap.val() : null;
              if (updatedCallProps) {
                if (committed == true ) {
                  done(null, true);
                } else if (committed == false) {
                  if (updatedCallProps.state == "ACTIVE") {
                    done({"message":"Call was answered exactly at timeout or just before.", "code":"CALL_IS_ACTIVE"});
                  } else {
                    done({"message":"Call timeOut failed.", "code":"TRANSACTION_ERROR"});
                  }
                }
              } else {
                done({"message":"Call timeOut failed.", "code":"NOT_FOUND"});
              }
            }
          }, false);
        }, props.timeOut || 10*1000);//default timeout is 10s
      } else {
        console.log("ERROR: Call timeOut cannot be initiated for", props);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };// ./setCallTimeout()
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
  };// ./end send acknowledgement
  window.myFirebaseObj.clearCurrentCall = function () {
    if (window.currentCall.from == window.user.userId) {
      this.usersRef.child(window.currentCall.to).child('call').remove();
    } else {
      this.usersRef.child(window.user.userId).child('call').remove();
    }
    window.currentCall = {};
  }
  window.myFirebaseObj.endCall = function (iRejected, done) {
    if (done && typeof done == 'function') {
      let self = this;
      if (window.currentCall && window.currentCall.timeout  && !window.currentCall.isTimedOut) {
        clearTimeout(window.currentCall.timeout);
      }
      let callKey = window.currentCall.callKey;
      if (callKey) {
        if (iRejected) {
          self.exchangeRef.child(callKey).transaction(function(currentCallProps) {
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
let addUserStatusListener = function (usersRef, userId) {
  if (usersRef) {
    usersRef.child(userId).off();
    usersRef.child(userId).child('status').off();
    usersRef.child(userId).child('status').on('value', function (snap) {
      let status = snap.val();
      if (status) {
        console.log("User is", status);
        switch (status) {
          case "online":
            break;
          case "offline":
            window.location.href = "signin.html";
            break;
          case "busy":
            break;
        }
      }
    });
  } else {
    console.log("FATAL: Users firebase references is", usersRef);
  }
};// end addUserStatusListener()
let removeAllUserListeners = function (usersRef, userId) {
  if (usersRef && userId) {
    usersRef.child(userId).child('call').off();
    usersRef.child(userId).child('status').off();
  } else {
    console.log("FATAL: Users firebase references is", usersRef);
  }
}
let addIncomingCallListeners = function (usersRef, userId) {
  if (usersRef && userId) {
    usersRef.child(userId).child('call').on('value', function (snap) {
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
              usersRef.child(userId).child('call').remove();
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
                        let rejectedCallStats = snap.val();
                        if (rejectedCallStats && rejectedCallStats.by != window.user.userId) {
                          endCallHandler(false);
                        }
                      });
                      break;

                  }
                }
              });

              //get caller details
              window.phoneDirRef.child(callStats.from).once('value', function (snap) {
                let caller = snap.val();
                if (caller) {
                  popupCall(caller, function (accepted) {
                    if (accepted == true) {
                      popupCall.done();
                      window.myFirebaseObj.sendCallAck(newCallKey, function (err, ackSent) {
                        if (err) {
                          console.log("ERROR: send call ack", err);
                          if (err.code == "INVALID_KEY") {
                            phoneDirRef.child(userId).child('call').remove();
                          } else if (err.code == "INVALID_CALL_STATE") {
                            phoneDirRef.child(userId).child('call').remove();
                          }
                          return;
                        }
                        if (ackSent == true) {
                          let offerSDP = JSON.parse(callStats.offerSDP);
                          receiveCall(caller, offerSDP, function (err, initiateResult) {
                            if (err) {
                              console.log("ERROR: intitiate Call", err);
                              if (err.name) {
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
                } else {
                  console.log("User not there on phone directory.", callStats.from);
                }
              });
            }
          } else {
            console.log("Error: Call already terminated.");
            usersRef.child(userId).child('call').remove();
          }
        });
      }
    });
  } else {
    console.log("ERROR: Cannot listen to incoming calls.", usersRef, userId);
  }
};// end add Incoming CallListeners()
