//--------------------------------------VARIABLES GLOBALS
const TEMPSLIMIT = 5
let pregActual = 0
let temps = 0;
let idTimer;
let sessionId;   // identificador de la partida, ens el dona el back
// Creo una variable global per a guardar les preguntes rebudes
let arrayPreguntas = [];

let estatDeLaPartida = {
  contadorPreguntes: 0,
  respostesUsuari: []  // Aquí anirem guardant les respostes
};


//--------------------------------FUNCIONS
function iniciarPartida(preguntes) {
  // una posició per pregunta, de moment totes buides
  estatDeLaPartida.respostesUsuari = new Array(preguntes.length).fill(null);

  let htmlStr = ""
  for (let i = 0; i < preguntes.length; i++) {
    htmlStr += `<div class="pregunta text-center d-flex flex-column align-items-center py-2" data-id-preg="${i}">
                  <img class="shadow p-3 mb-5 bg-body-tertiary rounded" style="max-height:180px; width:auto; max-width:100%;" src="${preguntes[i].imatge}">
                  <p class="fw-medium mb-2">${i + 1}. ${preguntes[i].pregunta}</p>
                  <div class="d-grid gap-1 w-100" style="max-width: 420px;">
                    <button data-id-preg="${i}" data-id-resp="0" class="btnRespuesta btn btn-outline-primary btn-sm">a.  ${preguntes[i].respostes[0].resposta}</button>
                    <button data-id-preg="${i}" data-id-resp="1" class="btnRespuesta btn btn-outline-primary btn-sm">b.  ${preguntes[i].respostes[1].resposta}</button>
                    <button data-id-preg="${i}" data-id-resp="2" class="btnRespuesta btn btn-outline-primary btn-sm">c. ${preguntes[i].respostes[2].resposta}</button>
                    <button data-id-preg="${i}" data-id-resp="3" class="btnRespuesta btn btn-outline-primary btn-sm">d. ${preguntes[i].respostes[3].resposta}</button>
                  </div>
                </div>`
  }
  document.getElementById("partida").innerHTML = htmlStr;

  // Un sol listener per a tots els botons de resposta
  document.getElementById("partida").addEventListener("click", function (e) {
    if (e.target.classList.contains("btnRespuesta")) {
      marcar(e.target.dataset.idPreg, e.target.dataset.idResp)
    }
  })

  //REACCIONAR AL BOTO ANTERIOR
  document.getElementById("btnAnterior").addEventListener("click", function () {
    //reduim un l'actual
    pregActual--
    //mostrem
    mostrarPregunta()
  })

  //REACCIONAR AL BOTO SEGÜENT
  document.getElementById("btnSeguent").addEventListener("click", function () {
    //augmentem un l'actual
    pregActual++
    //mostrem
    mostrarPregunta()
  })

  // Mostro la primera pregunta (la resta queden ocultes)
  mostrarPregunta()
  // Pinto el marcador a 0
  renderMarcador()
}

function mostrarPregunta() {
  //POSAR TOTES OCULTES
  let divPreguntes = document.getElementsByClassName("pregunta")
  for (let i = 0; i < divPreguntes.length; i++) {
    divPreguntes[i].classList.add("d-none")
  }
  //Mostro només l'actual
  document.querySelector(`.pregunta[data-id-preg="${pregActual}"]`).classList.remove("d-none")

  //Actualitzo l'indicador i els botons de navegació
  document.getElementById("indicador").textContent = "Pregunta " + (pregActual + 1) + " de " + arrayPreguntas.length
  document.getElementById("btnAnterior").disabled = (pregActual == 0)
  document.getElementById("btnSeguent").disabled = (pregActual == arrayPreguntas.length - 1)
}

function marcar(preg, resp) {
  // preg i resp arriben com a text des del dataset, els passo a número
  preg = Number(preg)
  resp = Number(resp)
  console.log("En la pregunta " + preg + " has marcado " + resp)

  // Deixo tots els botons d'AQUESTA pregunta com a normals
  const botonsPregunta = document.querySelectorAll(`.btnRespuesta[data-id-preg="${preg}"]`)
  botonsPregunta.forEach(boton => {
    boton.classList.remove("btn-primary")
    boton.classList.add("btn-outline-primary")
  })

  // Marco només el botó premut
  const botonPulsado = document.querySelector(`.btnRespuesta[data-id-preg="${preg}"][data-id-resp="${resp}"]`)
  botonPulsado.classList.remove("btn-outline-primary")
  botonPulsado.classList.add("btn-primary")

  // Miro si la pregunta ja ha estat contestada abans, si és així, no incremento
  if (estatDeLaPartida.respostesUsuari[preg] == null) {
    estatDeLaPartida.contadorPreguntes++
  }

  // En qualsevol cas, guardo la nova resposta al array de respostes
  estatDeLaPartida.respostesUsuari[preg] = {
    id: arrayPreguntas[preg].id,  // id de la pregunta
    resp: resp
  }

  // Si ja estan totes contestades, mostro el botó d'enviar
  if (estatDeLaPartida.contadorPreguntes == arrayPreguntas.length) {
    document.getElementById("btnEnviar").classList.remove("d-none")
  }

  // Actualitzem el marcador
  renderMarcador()
}

function renderMarcador() {
  let pctActual = (estatDeLaPartida.contadorPreguntes / arrayPreguntas.length) * 100
  document.getElementById("marcador").innerHTML = `
    <div class="progress">
      <div class="progress-bar" role="progressbar"
          style="width: ${pctActual}%"
          aria-valuenow="${pctActual}"
          aria-valuemin="1"
          aria-valuemax="${arrayPreguntas.length}">
      </div>
    </div>`
}

function enviarRespostes() {
  fetch("./json2", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      sessionId: sessionId,
      respostesUsuari: estatDeLaPartida.respostesUsuari
    })
  })
    .then(response => response.json())
    .then(resultat => {
      if (resultat.error) {
        Swal.fire({ icon: "error", title: "Error", text: resultat.error })
        return
      }

      const aprovat = resultat.correctes >= resultat.total * 0.9
      Swal.fire({
        icon: aprovat ? "success" : "error",
        title: aprovat ? "Molt bé!" : "Segueix practicant",
        text: "Has encertat " + resultat.correctes + " de " + resultat.total,
        confirmButtonText: "Acceptar"
      })
    })
    .catch(error => {
      console.error("Error verificant respostes:", error)
      alert("Hi ha hagut un error verificant les respostes.")
    })
}

//------------------ timer ------------------
function iniciarCronometre() {
  // Evitem engegar-lo dues vegades si ja estava en marxa
  if (idTimer != null) return;

  idTimer = setInterval(function () {
    temps = temps + 1;
    document.getElementById("cronometre").innerHTML = temps;
    if (temps == TEMPSLIMIT) {
      Swal.fire({ icon: 'warning', title: "S'ha acabat el temps" });
      //cancelare el timer
      clearInterval(idTimer);
      idTimer = null;
    }
  }, 1000);
}


//------------------------------MAIN------------------------
window.addEventListener("load", function () {

  document.getElementById("btnIniciarCronometre").addEventListener("click", function () {
    iniciarCronometre();
  })

  //------------------ persistencia ------------------
  //Miro LS a veure si hi ha alguna cosa
  let nomLS = localStorage.getItem("nom");

  //si hi ha informacio al localstorage, posa el missatge de benvinguda i oculta la capsa de text
  if (nomLS != null) {
    Swal.fire({ icon: 'success', title: "Benvingut/a " + nomLS });
    document.getElementById("divBenvinguda").innerHTML = "Hola " + nomLS + " benvingut"
    document.getElementById("inputNom").style.display = "none"
    document.getElementById("btnGuardar").style.display = "none"
  }
  //Si no hi ha informacio al local storage, oculta el boto "btnEsborrar"
  if (nomLS == null) {
    Swal.fire({ icon: 'warning', title: "No registrat" });
    document.getElementById("btnEsborrar").style.display = "none"
  }

  //posem un listener al boto "btnGuardar" per guardar la informacio al localstorage i mostrar el missatge
  document.getElementById("btnGuardar").addEventListener("click", function () {
    let contingutCapsaText = document.getElementById("inputNom").value
    localStorage.setItem("nom", contingutCapsaText)
    document.getElementById("divBenvinguda").innerHTML = "Hola " + contingutCapsaText + " benvingut"
    document.getElementById("inputNom").style.display = "none"
    document.getElementById("btnGuardar").style.display = "none"
    document.getElementById("btnEsborrar").style.display = "block"
  })

  //posem un listener al boto esborrar per borrar la info al local storage, mostrar la capsa de text...
  document.getElementById("btnEsborrar").addEventListener("click", function () {
    localStorage.removeItem("nom")
    document.getElementById("divBenvinguda").innerHTML = ""
    document.getElementById("inputNom").style.display = "block"
    document.getElementById("btnGuardar").style.display = "block"
    document.getElementById("btnEsborrar").style.display = "none"
  })

  //------------------ fetch a les preguntes ------------------
  fetch('./json1') // 1. Demanem les preguntes al servidor (ja venen a l'atzar + sessionId)
    .then(dades => dades.json()) // 2. Quan arriba, el convertim a format JSON
    .then(data => { // 3. Un cop convertit, ja el podem fer servir!
      console.log("Dades carregades!", data);
      if (data.error) {
        Swal.fire({ icon: 'error', title: 'Error', text: data.error });
        return;
      }
      // Guardo les dades rebudes
      arrayPreguntas = data.preguntes;
      sessionId = data.sessionId;
      // crido a la funció per pintar la partida
      iniciarPartida(data.preguntes);
    })
    .catch(error => {
      console.error("Error carregant les preguntes:", error);
    });

});