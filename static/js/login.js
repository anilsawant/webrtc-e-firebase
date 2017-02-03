let setupLogin = function () {
  let loginCard = document.querySelector('.loginCard'),
      txtLoginId = loginCard.querySelector('#txtLoginId'),
      txtPassword = loginCard.querySelector('#txtPassword'),
      btnSignIn = loginCard.querySelector('#btnSignIn'),
      spanResetPassword = loginCard.querySelector('#spanResetPassword'),
      navbar = document.querySelector('.navbar'),
      userNameElm = navbar.querySelector('.username'),
      $alert = $('.loginCard .alert');

  window.$loginOverlay = $('.login-overlay');

  btnSignIn.addEventListener('click', function () {
    let userId = txtLoginId.value.trim(),
        password = txtPassword.value.trim();
    if (userId && password) {
      $alert.slideUp(function () {
        $alert.find('.msg').html('');
      });
      let userType = document.body.getAttribute('data-usertype');
      if (userType) {
        let userIdRegEx = '',
            userReference = null,
            matchMsg = 'Invalid Id.';
        if (userType == "initiator") {
          userIdRegEx = /^2\d{3}$/;
          userReference = window.initiatorsReference;
          matchMsg = "Initiator's id should start with 2 and contain 4 digits.";
        } else if (userType == "receiver") {
          userIdRegEx = /^1\d{3}$/;
          userReference = window.receiversReference;
          matchMsg = "Receiver's id should start with 1 and contain 4 digits.";
        }
        if (userIdRegEx.test(userId)) {
          if (password == 'as') {
            userReference.child(userId).once('value', function (snapshot) {
              let user = snapshot.val();
              if (user) {
                userReference.child(userId).child("status").set("online").then(function () {
                  txtPassword.value = '';
                  window.user = user;
                  userNameElm.textContent = user.name;
                  addUserStatusListener(userReference, userId);
                  if (userType == "receiver")
                    addIncomingCallListeners(window.receiversReference, window.user.userId);
                });
              } else {
                let user = {
                  "name": "New User",
                  "userId": userId,
                  "status": "online"
                };
                userReference.child(userId).set(user).then(function () {
                  txtPassword.value = '';
                  window.user = user;
                  userNameElm.textContent = user.name;
                  addUserStatusListener(userReference, userId);
                  if (userType == "receiver")
                    addIncomingCallListeners(window.receiversReference, window.user.userId);
                });
              }
            });
          } else {
            alert('Invalid password');
          }
        } else {
          alert(matchMsg);
        }
      } else {
        console.log("FATAL: User type is", userType);
      }
    } else {
      $alert.find('.msg').html("Kindly enter login id and password.");
      $alert.slideDown();
    }
  });
  loginCard.addEventListener('keypress', function (evt) {
    if (evt.which == 13) {
      btnSignIn.click();
    }
  })
}
