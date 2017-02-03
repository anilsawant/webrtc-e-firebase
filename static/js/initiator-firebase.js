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
  window.myFirebaseObj.makeCall = function (props, done) {
    if (done && typeof done == 'function') {
      if (props && props.from && props.to) {
        if (props.from == props.to) {
          alert("Can't call yourself!")
        } else {
          window.currentCall = {
            "from": props.from,
            "to": props.to,
            "state": "CONNECTING",
            "requestTimeStamp": Date.now()
          }
          let self = this;
          let newCallRef = self.exchangeRef.push(window.currentCall);
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
      if (props && props.callKey && props.to) {
        window.currentCall.timeout = setTimeout(function () {
          window.currentCall.isTimedOut = true;
          console.log('Ack wait timeout called:');
          window.myFirebaseObj.exchangeRef.child(props.callKey).transaction(function(currentCallProps) {
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
                return currentCallProps;
              } else if (currentCallProps.state == "ACTIVE") {
                currentCallProps.state = "FINISHED";
                currentCallProps.by = window.user.userId;
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
  if (userReference) {
    userReference.child(userId).off('value');
    userReference.child(userId).child('status').off('value');
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
