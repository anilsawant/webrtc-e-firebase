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
      if (password == 'as') {
        $alert.slideUp();
        let userRef = window.userReference;
        if (userRef) {
          userRef.child(userId).once('value', function (snapshot) {
            let user = snapshot.val();
            if (user) {
              userRef.child(userId).child("status").set("online").then(function () {
                txtPassword.value = '';
                window.user = user;
                userNameElm.textContent = user.name;
                addUserStatusListener(userRef, userId);
                addIncomingCallListeners(userRef, window.user.userId);
              });
            } else {
              let user = {
                "name": "New User",
                "userId": userId,
                "status": "online"
              };
              userRef.child(userId).set(user).then(function () {
                txtPassword.value = '';
                window.user = user;
                userNameElm.textContent = user.name;
                addUserStatusListener(userRef, userId);
                addIncomingCallListeners(userRef, window.user.userId);
              });
            }
          });
        } else {
          console.log("ERROR: User ref is", userRef);
          $alert.find('.msg').html("Login failed.");
          $alert.slideDown();
        }
      } else {
        $alert.find('.msg').html("Invalid password.");
        $alert.slideDown();
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
