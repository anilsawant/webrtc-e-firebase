window.onload = function () {
  let fireCallUserStr = window.localStorage.getItem("fireCallUser");
  if (fireCallUserStr) {
    window.user = JSON.parse(fireCallUserStr);
    document.body.style.opacity = 1;
    initializeFirebase();
    init();
  } else {
    window.location.href = "signin.html";
  }
}
let init = function () {
  document.querySelector('.navbar .username').textContent = window.user.username;
  addUserStatusListener(window.usersRef, window.user.userId);
  addIncomingCallListeners(window.usersRef, window.user.userId);
  setupHome();
}
let setupHome = function () {
  setupContactGroupsTab();
  setupPhoneBook();
  setupVideoCall();
  setupAddGroupTab();

  let btnLogout = document.getElementById('btnLogout');
  btnLogout.addEventListener('click', function (evt) {
    evt.preventDefault();
    window.myFirebaseObj.logout(function (err, result) {
      if (err) {
        console.log("ERROR: Logout", err);
        return;
      }
      if (result == true) {
        window.user = null;
        window.localStorage.removeItem("fireCallUser");
      }
    });
  });
}
let setupPhoneBook = function () {
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
  if (window.phoneDirRef) {
    window.phoneDirRef.on('value', function (snap) {
      window.contacts = snap.val();
      if (window.contacts) {
        window.contactIds = Object.keys(window.contacts);
        txtSearchUsers.removeAttribute('disabled');
      }
    });
  } else {
    console.log("ERROR: Cannot setup contacts book. phoneDirRef is", window.phoneDirRef);
  }

  btnToggleLeftSlider.addEventListener('click', function () {
    toggleLeftSlider();
  });
  searchContainer.style.display = 'none';
  ownContactsContainer.style.display = 'block';
  txtSearchUsers.addEventListener('keypress', function (evt) {
    if (evt.which == 13) {
      btnSearchContacts.click();
    }
  });
  btnSearchContacts.addEventListener('click', function (evt) {
    evt.stopPropagation();
    if (!txtSearchUsers.disabled) {
      let qId = txtSearchUsers.value.trim();
      if (qId && qId.length>2) {
        let matchedContacts = [];
        searchContactsList.innerHTML = '';
        $searchContainer.slideUp();
        if (window.contactIds) {
          for (id of window.contactIds) {
            if (id.includes(qId) && id != window.user.userId) {
              matchedContacts.push(window.contacts[id]);
            }
          }
          searchContainer.querySelector('.header .title').textContent = matchedContacts.length + " contact(s) found!";
          for (contact of matchedContacts) {
            let contactLi = document.createElement('li');
            contactLi.className = 'contact';
            let contactInnerHtml = `<span class="glyphicon glyphicon-user"></span>
                                  <span class="contact-name">${contact.username}</span>
                                  (<span class="contact-id">${contact.userId}</span>)
                                  <span class="contact-ops dropdown">
                                    <span class="glyphicon glyphicon-earphone" title="Call ${contact.username}"></span>
                                    <span class="glyphicon glyphicon-plus" title="Add to group" data-toggle="dropdown" aria-haspopup="false" aria-expanded="false"></span>
                                  `;
            let groupsDropdown = `<ul class="dropdown-menu dropdown-menu-right">`;
            let userGroups = (window.user.phoneBook && window.user.phoneBook.groups) ? Object.keys(window.user.phoneBook.groups) : [];
            if (!userGroups.length) {
              groupsDropdown += "<li>No groups. Add from the '+ Add' tab.</li>"
            } else {
              for (group of userGroups) {
                groupsDropdown += '<li class="add-to-group">' + group + '</li>';
              }
            }
            groupsDropdown += "</ul></span>";
            contactLi.innerHTML = contactInnerHtml + groupsDropdown;
            searchContactsList.appendChild(contactLi);
          }
          $ownContactsContainer.hide(function () {
            $searchContainer.slideDown();
          });
        } else {
          console.log("ERROR: No contacts to search.", window.contactIds);
        }
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
    if (evt.target.className.includes('glyphicon-earphone')) {
      evt.stopPropagation();
      let $contact = $(evt.target).parents('.contact');
      let callerId = $contact.find('.contact-id').text();
      if (callerId) {
        if (callerId == window.user.userId) {
          alert("Smart guy! Cannot call yourself.")
        } else {
          window.phoneDirRef.child(callerId).once('value', function (snap) {
            let caller = snap.val();
            if (caller) {
              initiateCall(caller, function (err, result) {
                if (err) {
                  console.log("ERROR: Initiate call.", err);
                  return;
                }
                if (result == true) {
                  console.log("SUCCESS: Call initiated :)");
                }
              });// ./ end initiate call()
            } else {
              console.log("Caller does not exist on phone directory.", callerId);
            }
          });// ./ end get caller details
        }
      } else {
        console.log("Can't call to ", callerId);
      }
    } else if (evt.target.className.includes('add-to-group')) {
      let groupName = evt.target.textContent,
          $contact = $(evt.target).parents('.contact'),
          contactId = $contact.find('.contact-id').text(),
          contactName = $contact.find('.contact-name').text();
      if (groupName && contactId && contactName) {
        window.usersRef.child(window.user.userId)
            .child("phoneBook").child("groups")
              .child(groupName).child(contactId).set(contactName)
              .then(function () {
                alert(contactName + ' added to ' + groupName + ".")
              });
      } else {
        console.log("ERROR: Cannot add to group.", groupName, contactId, contactName);
      }
    }
  }); // ./end search ContactsList click()
}
let setupContactGroupsTab = function () {
  let contactGroupsTabId = "contactGroupsTab",
      contactGroupsTab = document.getElementById(contactGroupsTabId);
  contactGroupsTab.addEventListener('click', function (evt) {
    if (evt.target.className.includes('delete-group')) {
      evt.stopPropagation();
      let $groupDiv = $(evt.target).parents('.group'),
          groupName = $groupDiv.find('.group-name').text();
      if (confirm("Delete group " + groupName + "?")) {
        window.usersRef.child(window.user.userId)
          .child("phoneBook").child("groups").child(groupName).remove();
      }
    } else if (evt.target.className.includes('earphone')) {
      let $contact = $(evt.target).parents('.contact'),
          callerId = $contact.attr("data-callerid");
      if (callerId) {
        window.phoneDirRef.child(callerId).once('value', function (snap) {
          let caller = snap.val();
          if (caller) {
            initiateCall(caller, function (err, result) {
              if (err) {
                console.log("ERROR: Initiate call.", err);
                return;
              }
              if (result == true) {
                console.log("SUCCESS: Call initiated :)");
              }
            });// ./ end initiate call()
          } else {
            console.log("Caller does not exist on phone directory.", callerId);
          }
        });// ./ end get caller details
      } else {
        console.log("ERROR: cannot call contact", callerId);
      }
    } else if (evt.target.className.includes('trash')) {
      let $contact = $(evt.target).parents('.contact'),
          callerId = $contact.attr("data-callerid"),
          $group = $contact.parents('.group'),
          groupName = $group.find('.group-name').text();
      if (callerId) {
        let groupMembers = Object.keys(window.user.phoneBook.groups[groupName]);
        if (groupMembers.length == 1) {
          window.usersRef.child(window.user.userId)
            .child("phoneBook").child("groups")
              .child(groupName).set(true);
        } else {
          window.usersRef.child(window.user.userId)
            .child("phoneBook").child("groups")
              .child(groupName).child(callerId).remove();
        }
      } else {
        console.log("ERROR: cannot delete contact", callerId);
      }
    }
  });
  window.usersRef.child(window.user.userId).child("phoneBook").child("groups").on('value', function (snap) {
    let userGroupsObj = snap.val();
    if (userGroupsObj) {
      if (window.user.phoneBook) {
        window.user.phoneBook.groups = userGroupsObj;
      } else {
        window.user.phoneBook = {
          "groups": userGroupsObj
        }
      }
      let userGroups = Object.keys(userGroupsObj);
      if (userGroups && userGroups.length) {
        contactGroupsTab.innerHTML = '';
        contactGroupsTab.style.paddingLeft = 0;
        for (groupName of userGroups) {
          let groupId = groupName.replace(/ +/g,''),
              groupMembers = userGroupsObj[groupName],
              newGroupDiv = document.createElement('div');
          newGroupDiv.className = "group";
          let groupInnerHtml = `
          <div class="header" data-toggle="collapse" data-parent="#${contactGroupsTabId}" data-target="#collapse${groupId}" aria-expanded="true" aria-controls="collapse${groupId}">
            <span class="glyphicon glyphicon-triangle-right"></span>
            <span class="group-name">${groupName}</span>
            <span class="delete-group">&times;</span>
          </div>
          <div id="collapse${groupId}" class="collapse">
            <div class="body">
              <ul class="contacts">`;
          let contactsStr = "No contacts. Add from search.";
          if (groupMembers) {
            let contacts = Object.keys(groupMembers);
            if (contacts.length) {
              contactsStr = "";
              for (contactId of contacts) {
                contactsStr += `<li class="contact" data-callerid="${contactId}">
                  <span class="glyphicon glyphicon-user"></span> ${groupMembers[contactId]} (${contactId})
                  <span class="contact-ops">
                    <span class="glyphicon glyphicon-earphone" title="Call ${groupMembers[contactId]}"></span>
                    <span class="glyphicon glyphicon-trash" title="Delete from group"></span>
                  </span>
                </li>`
              }
            }
          }
          groupInnerHtml += (contactsStr + "</ul></div></div>");
          newGroupDiv.innerHTML = groupInnerHtml
          contactGroupsTab.appendChild(newGroupDiv);
        }
      } else {
        contactGroupsTab.textContent = "No groups. Add from '+ Add' tab."
        contactGroupsTab.style.paddingLeft = "2px";
        if (window.user.phoneBook) {
          window.user.phoneBook.groups = undefined;
        }
      }
    } else {
      contactGroupsTab.textContent = "No groups. Add from '+ Add' tab."
      contactGroupsTab.style.paddingLeft = "2px";
      if (window.user.phoneBook) {
        window.user.phoneBook.groups = undefined;
      }
    }
  });
}
let setupAddGroupTab = function () {
  let addContactsTab = document.getElementById('addContactsTab'),
      contactGroupsTab = document.getElementById("contactGroupsTab"),
      txtGroupName = addContactsTab.querySelector('.txt-group-name'),
      btnCreateGroup = addContactsTab.querySelector('.btn-create-group'),
      $alert = $(addContactsTab).find('.alert');

  btnCreateGroup.addEventListener('click', function () {
    let newGroupName = txtGroupName.value.trim();
    if (newGroupName) {
      if (window.user.phoneBook && window.user.phoneBook.groups) {
        if (window.user.phoneBook.groups[newGroupName.toUpperCase()]) {
          $alert.removeClass("alert-success")
                .addClass("alert-danger")
                  .find('.msg').text("Group already exists!");
          $alert.slideDown();
          return;
        }
      }
      $alert.slideUp();
      btnCreateGroup.setAttribute("disabled", true);
      window.usersRef.child(window.user.userId).child("phoneBook").child("groups").child(newGroupName.toUpperCase()).set(true).then(function () {
        txtGroupName.value = '';
        $alert.removeClass("alert-danger")
              .addClass("alert-success")
                .find('.msg').text("Group added :)");
        $alert.slideDown();
        btnCreateGroup.removeAttribute("disabled");
      });
    } else {
      $alert.removeClass("alert-success")
            .addClass("alert-danger")
              .find('.msg').text("Enter the new group's name.")
      $alert.slideDown();
    }
  });
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
      localVideo = window.localVideoElm = videoOverlay.querySelector('#localVideo'),
      remoteVideo = window.remoteVideoElm = videoOverlay.querySelector('#remoteVideo'),
      btnEndCall = window.btnEndCall = videoOverlay.querySelector('.glyphicon-remove-sign');

  window.$videoOverlay = $(videoOverlay);
  btnEndCall.addEventListener('click', function () {
    endCallHandler(true);
  });
}
let initiateCall = function (caller, done) {
  if (done && typeof done == 'function') {
    hideLeftSlider();
    window.$videoOverlay.find('.call-msg').text("Calling " + (caller.username || '') + "...");
    window.$videoOverlay.fadeIn(function () {
      createInitiatorPeerAndOffer(function (err, rtcOfferSDP) {
        if (err) {
          window.$videoOverlay.fadeOut(function () {
            window.$videoOverlay.find('.call-msg').text("Calling...");
          });
          done(err);
          return;
        }
        if (rtcOfferSDP) {
          let callProps = {
            "from": window.user.userId,
            "offerSDP": JSON.stringify(rtcOfferSDP),
            "to": caller.userId,
            "timeOut": 20*1000 // timeOut call after this time
          }
          window.myFirebaseObj.offerCall(callProps, function (err, callData) {
            if (err) {
              if (err.code == "NOT_FOUND") {
                console.log("Receiver " + caller.userId + " was not found.");
                endCallHandler(false);
              } else if (err.code == "TRANSACTION_ERROR") {
                console.log("Receiver " + caller.userId + " is not online or is already on a call.");
                // endCallHandler(false);
                console.log("Alert the user about this. Write endCallHandler2");
              } else if (err.code == "TIMEDOUT") {
                endCallHandler(false);
              } else if (err.code == "CALL_IS_ACTIVE") {
                if (window.currentCall.state == "ACTIVE") {
                  // window.myFirebaseObj.exchangeRef(callData.callKey).child("fromSDP").set(rtcOfferSDP);
                } else {
                  console.log("FATAL: Call failed.", window.currentCall);
                }
              }
              done(err);
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
                        clearTimeout(window.currentCall.timeout);//clear ack-wait timeout
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
              });// ./end callRef child('state').on()
              //on success start listening for answerSDP
              newCallRef.child('answerSDP').on('value', function (snap) {
                let answerSDP = snap.val();
                if (answerSDP) {
                  window.initiatorPeer.setRemoteDescription(JSON.parse(answerSDP));
                }
              });
              //on success start listening for answerCandidate
              newCallRef.child('answerCandidate').on('value', function (snap) {
                let answerCandidate = snap.val();
                if (answerCandidate) {
                  console.log("Received:answerCandidate");
                  window.initiatorPeer.addIceCandidate(new RTCIceCandidate(JSON.parse(answerCandidate)));
                }
              });
              done(null, true);
            } else {
              done({"message": "CallData is" + callData, "code":"ERROR"});
            }
          });// ./end  offer Call()
        } else {
          done({"message": "Offer SDP is" + rtcOfferSDP, "code":"ERROR"});
        }
      });// ./end create initiator Peer And Offer()
    });
  } else {
    console.log("ERROR: Incorrect usage. User callback missing.");
  }
}
let receiveCall = function (caller, offerSDP, done) {
  if (done && typeof done == 'function') {
    window.$videoOverlay.find('.call-msg').text("Call from " + caller.username || caller.userId + "...");
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
let popupCall = function(caller, done) {
  if (caller && done && (typeof done == 'function')) {
    let callerName = caller.username || 'Call',
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
    popupOverlay.querySelector('.btn-accept').setAttribute('disabled', true);
    popupOverlay.querySelector('.btn-reject').setAttribute('disabled', true);
    popupOverlay.querySelector('.call-box').style.transform = 'scale(.2)';
    popupOverlay.style.opacity = 0;
    setTimeout(function () {
      document.body.removeChild(popupOverlay);
    }, 300);//more than transform-scale time
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
  if (window.initiatorPeer) {
    window.initiatorPeer.close();
    window.initiatorPeer = null;
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
