let setupLogin = function () {
  let loginCard = document.querySelector('.loginCard'),
      txtLoginId = loginCard.querySelector('#txtLoginId'),
      txtPassword = loginCard.querySelector('#txtPassword'),
      btnSignIn = loginCard.querySelector('#btnSignIn'),
      spanSignUp = loginCard.querySelector('#spanSignUp'),
      spanResetPassword = loginCard.querySelector('#spanResetPassword'),
      navbar = document.querySelector('.navbar'),
      userNameElm = navbar.querySelector('.username'),
      $alert = $('.loginCard .alert');

  window.$loginOverlay = $('.login-overlay');
  window.$signUpOverlay = $('.signup-overlay');
  spanSignUp.addEventListener('click', function () {
    window.$loginOverlay.slideUp(function () {
      txtLoginId.value = '';
      txtPassword.value = '';
      window.$signUpOverlay.slideDown();
    })
  });
  btnSignIn.addEventListener('click', function () {
    let userId = txtLoginId.value.trim(),
        password = txtPassword.value.trim();
    if (userId && password) {
      if (window.phoneDirRef && window.usersRef) {
        window.usersRef.child(userId).once('value', function (snapshot) {
          let user = snapshot.val();
          if (user) {
            if (password == user.password) {
              $alert.slideUp();
              window.usersRef.child(userId).child("status").set("online").then(function () {
                window.user = user;
                userNameElm.textContent = user.username;
                addUserStatusListener(window.usersRef, userId);
                addIncomingCallListeners(window.usersRef, window.user.userId);
              });
            } else {
              $alert.find('.msg').html("Invalid password.");
              $alert.slideDown();
            }
          } else {// signup
            $alert.find('.msg').html("Login id does not exist. Kindly sign up.");
            $alert.slideDown();
          }
        });
      } else {
        console.log("ERROR: Firebase references are", window.phoneDirRef, window.usersRef);
        $alert.find('.msg').html("Login failed.");
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

let setupSignup = function () {
  let signupCard = document.querySelector('.signupCard'),
      txtLoginId = signupCard.querySelector('.txt-login-id'),
      txtPassword = signupCard.querySelector('.txt-password'),
      txtCPassword = signupCard.querySelector('.txt-c-password'),
      txtUsername = signupCard.querySelector('.txt-username'),
      txtEmail = signupCard.querySelector('.txt-email'),
      txtPhotoURL = signupCard.querySelector('.txt-photo-url'),
      btnSignUp = signupCard.querySelector('.btn-signup'),
      spanSignIn = signupCard.querySelector('#spanSignIn'),
      $alert = $('.signupCard .alert');

  window.$loginOverlay = $('.login-overlay');
  window.$signUpOverlay = $('.signup-overlay');
  spanSignIn.addEventListener('click', function () {
    window.$signUpOverlay.slideUp(function () {
      txtLoginId.value = '';
      txtPassword.value = '';
      txtCPassword.value = '';
      txtUsername.value = '';
      txtEmail.value = '';
      txtPhotoURL.value = '';
      window.$loginOverlay.slideDown();
    })
  });

  btnSignUp.addEventListener('click', function () {
    let userId = txtLoginId.value.trim(),
        password = txtPassword.value.trim(),
        cpassword = txtCPassword.value.trim(),
        username = txtUsername.value.trim(),
        photoURL = txtPhotoURL.value.trim(),
        email = txtEmail.value.trim();

    let errMsgs = [],
        finalErrMsg = "";
    if (!userId)
      errMsgs.push("Login id");
    if (!password)
      errMsgs.push("Password");
    if (!cpassword)
      errMsgs.push("Confirm password");
    for (var i = 0; i < errMsgs.length; i++) {
      if (i == 0)
        finalErrMsg = "Kindly enter "
      finalErrMsg += errMsgs[i];
      i == errMsgs.length-1 ? finalErrMsg += "." : finalErrMsg += ", " ;
    }
    if (finalErrMsg) {
      $alert.find('.msg').html(finalErrMsg);
      $alert.slideDown();
    } else {
      let userIdRegExp = /^\d{4}$/;
      if (userIdRegExp.test(userId)) {
        if (password == cpassword) {
          $alert.slideUp();
          if (window.phoneDirRef && window.usersRef) {
            window.usersRef.child(userId).once('value', function (snapshot) {
              let user = snapshot.val();
              if (user) {
                $alert.find('.msg').html("Login id already in use. Use a different Login id.");
                $alert.slideDown();
              } else {// create a new user
                user = {
                  "userId": userId,
                  "password": password,
                  "username": username || "New User",
                  "photoURL": photoURL || "",
                  "email": email || ""
                };
                let phoneDirUser = {
                  "userId": userId,
                  "username": username || "username",
                  "photoURL": photoURL || ""
                }
                window.phoneDirRef.child(userId).set(phoneDirUser);
                window.usersRef.child(userId).set(user).then(function () {
                  txtLoginId.value = '';
                  txtPassword.value = '';
                  txtCPassword.value = '';
                  txtUsername.value = '';
                  txtEmail.value = '';
                  txtPhotoURL.value = '';
                  window.$signUpOverlay.slideUp(function () {
                    window.$loginOverlay.slideDown();
                  });
                });
              }
            });
          } else {
            console.log("ERROR: Firebase references are", window.phoneDirRef, window.usersRef);
            $alert.find('.msg').html("Signup failed.");
            $alert.slideDown();
          }
        } else {
          $alert.find('.msg').html("Passwords do not match!");
          $alert.slideDown();
        }
      } else {
        $alert.find('.msg').html("Login Id should contain 4 digits.");
        $alert.slideDown();
      }
    }
  });
}
