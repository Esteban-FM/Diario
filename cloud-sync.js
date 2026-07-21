(function () {
  "use strict";

  var firebaseConfig = {
    apiKey: "AIzaSyASxye5F0PTmEzeo1nmbZeiInOXZDxkQNY",
    authDomain: "dosis-diaria-305b7.firebaseapp.com",
    projectId: "dosis-diaria-305b7",
    storageBucket: "dosis-diaria-305b7.firebasestorage.app",
    messagingSenderId: "178351779252",
    appId: "1:178351779252:web:9a4541122d95392eb096e1"
  };

  if (typeof firebase === "undefined") return;

  firebase.initializeApp(firebaseConfig);
  var auth = firebase.auth();
  var db = firebase.firestore();

  function docRef(uid) {
    return db.collection("users").doc(uid);
  }

  window.DosisCloud = {
    onAuthChange: function (cb) {
      auth.onAuthStateChanged(cb);
    },
    signIn: function () {
      var provider = new firebase.auth.GoogleAuthProvider();
      return auth.signInWithRedirect(provider);
    },
    signOut: function () {
      return auth.signOut();
    },
    fetchRemote: function (uid) {
      return docRef(uid)
        .get()
        .then(function (snap) {
          return snap.exists ? snap.data() : null;
        });
    },
    pushRemote: function (uid, data) {
      return docRef(uid).set(data);
    },
    subscribe: function (uid, cb) {
      return docRef(uid).onSnapshot(function (snap) {
        if (snap.exists) cb(snap.data());
      });
    }
  };

  // Resolves a pending signInWithRedirect(); rejects harmlessly if none was pending.
  auth.getRedirectResult().catch(function () {});
})();
