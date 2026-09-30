let seleccionadas; // les preguntes d'aquesta partida (ja triades pel back)
let sessionId;      // identificador de la partida, ens el dona el back
const TEMPSLIMIT = 5
let temps=0;
let idTimer;
let indexActual = 0; // Índice de la pregunta actual que se está mostrando

//------------------ FUNCIONS ------------------

function finalitzarTest() {
    fetch('./json2', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            sessionId: sessionId,
            respostesUsuari: estatDeLaPartida.respostesUsuari
        })
    })
        .then(res => res.json())
        .then(resultat => {
            if (resultat.error) {
                Swal.fire({
                    icon: 'error',
                    title: 'Error',
                    text: resultat.error
                });
                return;
            }

            const aprovat = resultat.correctes >= resultat.total * 0.9;
            Swal.fire({
                icon: aprovat ? 'success' : 'error',
                title: aprovat ? 'Molt bé!' : 'Segueix practicant',
                text: 'Has encertat ' + resultat.correctes + ' de ' + resultat.total,
                confirmButtonText: 'Acceptar'
            })
        })
        .catch(err => {
            console.error("Error verificant respostes:", err);
            alert("Hi ha hagut un error verificant les respostes.");
        });
}

function renderitzarMarcador() {
    const total = seleccionadas.length; // el total és el que ens ha enviat el back
    pctActual = (estatDeLaPartida.contadorPreguntes / total) * 100;
    document.getElementById("marcador").innerHTML = `
        <div class="progress">
            <div class="progress-bar" role="progressbar"
                style="width: ${pctActual}%"
                  aria-valuenow="${pctActual}"
                  aria-valuemin="1"
                  aria-valuemax="${total}">
            </div>
        </div>`;
    if (estatDeLaPartida.contadorPreguntes == total) {
        document.getElementById("btnEnviar").classList.remove("d-none");
    } else {
        document.getElementById("btnEnviar").classList.add("d-none");
    }
}

function iniciarPartida(preguntes) {
    estatDeLaPartida.respostesUsuari = new Array(preguntes.length).fill(null); // una posició per pregunta
    let htmlStr = ""
    for (let i = 0; i < preguntes.length; i++) {
        //POSAR TOTES OCULTES (d-none)
        htmlStr += `<div class="pregunta d-none text-center d-flex flex-column align-items-center py-2">
                        <img class="shadow-sm p-1 mb-2 bg-body-tertiary rounded" style="max-height:180px; width:auto; max-width:100%;" src="${preguntes[i].imatge}">
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
    renderitzarMarcador();

    mostrarPregunta(0); // enseña la primera pregunta y activa los botones

    // Delegación de eventos: un solo listener para todos los botones de respuesta
    document.getElementById("partida").addEventListener("click", function (e) {
        if (e.target.classList.contains("btnRespuesta")) {
            marcar(e.target.dataset.idPreg, e.target.dataset.idResp);
        }
    });
}

function mostrarPregunta(nou) {
    const divs = document.querySelectorAll(".pregunta");
    divs[indexActual].classList.add("d-none"); // oculta la actual
    divs[nou].classList.remove("d-none");      // muestra la nueva
    indexActual = nou;
    actualitzarNavegacio();
}

function actualitzarNavegacio() {
    const total = document.querySelectorAll(".pregunta").length;
    document.getElementById("indicador").textContent = "Pregunta " + (indexActual + 1) + " de " + total;
    document.getElementById("btnAnterior").disabled = indexActual === 0;
    document.getElementById("btnSeguent").disabled = indexActual === total - 1;
}

function marcar(preg, resp) {
    // preg y resp llegan como strings desde dataset, los convertimos a número
    preg = Number(preg);
    resp = Number(resp);

    console.log("En la pregunta " + preg + " has marcado " + resp)
    if (estatDeLaPartida.respostesUsuari[preg] == null) {
        estatDeLaPartida.contadorPreguntes++;
    }
    estatDeLaPartida.respostesUsuari[preg] = {
        pr: preg,
        resp: resp
    }

    // Desmarcamos todos los botones de ESTA pregunta
    const botonsPregunta = document.querySelectorAll(`.btnRespuesta[data-id-preg="${preg}"]`);
    botonsPregunta.forEach(boton => {
        boton.classList.remove("btn-primary");
        boton.classList.add("btn-outline-primary");
    });

    // Marcamos solo el botón pulsado
    const botonPulsado = document.querySelector(`.btnRespuesta[data-id-preg="${preg}"][data-id-resp="${resp}"]`);
    botonPulsado.classList.remove("btn-outline-primary");
    botonPulsado.classList.add("btn-primary");

    console.log(estatDeLaPartida.contadorPreguntes);
    renderitzarMarcador();
}

let estatDeLaPartida = {
    contadorPreguntes: 0,
    respostesUsuari: []  // Aqui se guardan las respuestas
};

//------------------ timer ------------------    
function iniciarCronometre() {
    // Evitem engegar-lo dues vegades si ja estava en marxa
    if (idTimer != null) return;
    
    idTimer=setInterval(function(){
        temps=temps+1;
        document.getElementById("cronometre").innerHTML=temps;
        if (temps==TEMPSLIMIT){
            Swal.fire({ icon: 'warning', title: "S'ha acabat el temps" });
            //cancelare el timer
            clearInterval(idTimer);
            idTimer = null;
        }
    },1000);
}
//------------------ MAIN ------------------

window.addEventListener("load", function() {
        document.getElementById("btnIniciarCronometre").addEventListener("click", function () {
        iniciarCronometre();
    });
//------------------ persistencia ------------------

    //Miro LS a veure si hi ha alguna cosa
    let nomLS = localStorage.getItem("nom");
        //si hi ha informacion al localstorage, posa el missatge de benvinguda i oculta la capsa de text
        if (nomLS!=null){
             Swal.fire({ icon: 'success', title: "Benvingut/a " + nomLS});
            document.getElementById("divBenvinguda").innerHTML="Hola "+ nomLS + " benvingut"
            document.getElementById("inputNom").style.display="none"
            document.getElementById("btnGuardar").style.display="none"
        }
        //Si no hi ha informacio al local storage, oculta el boto de "btnEsborrar"
        if (nomLS==null){
            Swal.fire({ icon: 'warning', title: "No registrat" });
            document.getElementById("btnEsborrar").style.display="none"
        }
        //posem un listener al boto "btnGuardar" per guardar la informacio al localstorage i mostra el  missatge    
        document.getElementById("btnGuardar").addEventListener("click", function(){
            let contingutCapsaText = document.getElementById("inputNom").value
                //alert("has posat" + contingutCapsaText)
                localStorage.setItem("nom", contingutCapsaText)
                document.getElementById("divBenvinguda").innerHTML="Hola "+ contingutCapsaText + " benvingut"
                document.getElementById("inputNom").style.display="none"
                document.getElementById("btnGuardar") .style.display="none"
                document.getElementById("btnEsborrar") .style.display="block"

        })

        //posem un listener al boto esborrar per borrar la info al local storage, mostrar la capsa de text....
        document.getElementById("btnEsborrar").addEventListener("click", function(){
            localStorage.removeItem("nom")
            document.getElementById("divBenvinguda").innerHTML=""
            document.getElementById("inputNom").style.display="block"
            document.getElementById("btnGuardar") .style.display="block"
            document.getElementById("btnEsborrar") .style.display="none"

        })



//------------------ fetch a les preguntes ------------------
        
    fetch('./json1') // el back ja retorna les preguntes a l'atzar + sessionId
    .then(dades => dades.json())
    .then(dadesenjson => {
        console.log("Dades carregades!", dadesenjson);
        seleccionadas = dadesenjson.preguntes;
        sessionId = dadesenjson.sessionId;
        iniciarPartida(seleccionadas);
    });
//------------------ navegació entre preguntes ------------------
    document.getElementById("btnAnterior").addEventListener("click", function () {
        if (indexActual > 0) {
            mostrarPregunta(indexActual - 1);
        }
    });
 
    document.getElementById("btnSeguent").addEventListener("click", function () {
        const total = document.querySelectorAll(".pregunta").length;
        if (indexActual < total - 1) {
            mostrarPregunta(indexActual + 1);
        }
    });
});