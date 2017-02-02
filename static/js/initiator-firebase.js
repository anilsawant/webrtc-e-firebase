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
    "userRef": window.initiatorsReference,
    "exchangeRef": window.exchangeReference,
    "receiverRef": window.receiversReference
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
                done(null, true);
              } else if (committed == false) {
                done({"message":"Transaction failed.", "code":"TRANSACTION_ERROR"});
              }
            } else {
              done({"message":"User doesn't exist.", "code":"NOT_FOUND"});
            }
          }
        });
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
        });
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
        });
      } else {
        console.log("ERROR: Take break failed. User is", user);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };
  window.myFirebaseObj.makeCall = function (props, done) {
    if (done && typeof done == 'function') {
      if (props && props.from && props.to) {
        if (props.from == props.to) {
          alert("Can't call yourself!")
        } else {
          let self = this;
          let newCallRef = self.exchangeRef.push({
            "from": props.from,
            "to": props.to,
            "state": "CONNECTING",//CONNECTING -> ACTIVE/TIMEDOUT -> FINISHED/REJECTED
            "requestTimeStamp": Date.now()
          });
          let callKey = newCallRef.key;
          self.receiverRef.child(props.to).transaction(function(currentReceiversStats) {
            if (currentReceiversStats) {
              if (currentReceiversStats.status == 'online' && !currentReceiversStats.call) {
                currentReceiversStats.call = callKey;
                return currentReceiversStats;
              }
              return;
            }
            return currentReceiversStats;
          }, function (err, committed, snapshot) {
            if (err) {
              console.error(err);
              done({"message": "Transaction aborted.","code":"FIREBASE_ERROR"});
              newCallRef.remove();
            } else {
              let updatedReceiversStats = snapshot ? snapshot.val() : null;
              if (updatedReceiversStats) {
                if (committed == true ) {
                  props.callKey = callKey;
                  done(null, props);
                  window.myFirebaseObj.setCallTimeout(props, function (err, timedoutData) {
                    if (err) {
                      console.log("Call timeout error",err);
                      if (err.code == "FIREBASE_ERROR") {
                        window.currentCall = {};
                        newCallRef.remove();
                        window.myFirebaseObj.receiverRef.child(callerId).child('call').remove();
                      } else if (err.code == "TRANSACTION_ERROR") {//call is not in CONNECTING state
                        done(err);
                      } else if (err.code == "NOT_FOUND") {
                        console.log("ERROR: callKey is",props.callKey );
                      } else if (err.code == "CALL_IS_ACTIVE") {
                        console.log("ERROR: callKey is",props.callKey );
                        done(err);
                      }
                      return;
                    }
                    done({"message": "Call timed out.","code":"TIMEDOUT"});
                  });
                } else if (committed == false) {
                  done({"message": "Transaction failed.","code":"TRANSACTION_ERROR"});
                  newCallRef.remove();
                }
              } else {
                done({"message": "Transaction failed.","code":"NOT_FOUND"});
                newCallRef.remove();
              }
            }
          });
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
      if (props && props.callKey && props.to) {
        window.currentCall.timeout = setTimeout(function () {
          window.currentCall.isTimedOut = true;
          console.log('Ack wait timeout called:');
          window.myFirebaseObj.exchangeRef.child(props.callKey).transaction(function(currentCallProps) {
            if (currentCallProps) {
              if (currentCallProps.state == "CONNECTING") {//since ack was not received, turn will be of 'to'
                currentCallProps.turn = currentCallProps.from;
                currentCallProps.state = "TIMEDOUT";
                return currentCallProps;
              }
              return;
            }
            return currentCallProps;
          }, function (err, committed, snapshot) {
            if (err) {
              console.error(err);
              done({"message":"Firebase Error.", "code":"FIREBASE_ERROR"});
            } else {
              let updatedCallProps = snapshot ? snapshot.val() : null;
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
          });;
        }, props.timeOut || 10*1000);//default timeout is 10s
      } else {
        console.log("ERROR: Call timeOut cannot be initiated for", props);
      }
    } else {
      console.log("ERROR: Incorrect usage. User callback argument missing.");
    }
  };// ./setCallTimeout()
  window.myFirebaseObj.endCall = function (sendEndCallMsg) {
    if (window.currentCall && window.currentCall.timeout  && !window.currentCall.isTimedOut) {
      clearTimeout(window.currentCall.timeout);
    }
    let callKey = window.currentCall.callKey;
    if (callKey) {
      if (sendEndCallMsg == true) {
        window.exchangeReference.child(callKey).child('fromEndCall').set(true).then(function () {
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
  if (userReference) {
    userReference.child(userId).off('value');
    userReference.child(userId).child('status').off('value');
    userReference.child(userId).child('status').on('value', function (snapshot) {
      let status = snapshot.val();
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
