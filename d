  <script type="module">
    import { initializeApp } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-app.js';
    import {
      getFirestore,
      collection,
      getDocs,
      addDoc,
      setDoc,
      doc,
      deleteDoc
    } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-firestore.js';
    import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-storage.js';
    import { getAuth, signInAnonymously, onAuthStateChanged } from 'https://www.gstatic.com/firebasejs/9.23.0/firebase-auth.js';

    const firebaseConfig = {
      apiKey: "AIzaSyBowmtuLTQvmT9hxMIegrACBOcfQsZ53Ow",
      authDomain: "inventario-exceed.firebaseapp.com",
      projectId: "inventario-exceed",
      storageBucket: "inventario-exceed.appspot.com",
      messagingSenderId: "391201279361",
      appId: "1:391201279361:web:bfbb6ee1e19ef780372c80",
      measurementId: "G-DVEB6FGELT"
    };

    try {
      const app = initializeApp(firebaseConfig);
      const db = getFirestore(app);
      const storage = getStorage(app);
      const auth = getAuth(app);
      window.db = db;
      window.storage = storage;
      window.auth = auth;
      window.firestoreFunctions = {
        collection,
        getDocs,
        addDoc,
        setDoc,
        doc,
        deleteDoc
      };
      window.storageFunctions = {
        ref,
        uploadBytes,
        getDownloadURL
      };

      signInAnonymously(auth).then(() => {
        console.log("Login anônimo bem-sucedido");
        onAuthStateChanged(auth, (user) => {
          if (user) {
            console.log("Usuário autenticado:", user.uid);
            import('./script.js').then(() => {
              if (window.onload) window.onload();
            });
          } else {
            console.error("Nenhum usuário autenticado");
            alert("Erro: Usuário não autenticado.");
          }
        });
      }).catch((error) => {
        console.error("Erro ao fazer login anônimo:", error);
        alert("Erro ao autenticar: " + error.message);
      });
    } catch (error) {
      console.error("Erro ao inicializar Firebase:", error);
      alert("Erro ao iniciar Firebase: " + error.message);
    }

 import './script.js';