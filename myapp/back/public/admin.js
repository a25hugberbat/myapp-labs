//--------------------------------------VARIABLES GLOBALS
let preguntes = [];     // totes les preguntes que ens dona el servidor
let idEditant = null;   // id de la pregunta que modifiquem (null = estem creant)
let idsRespostes = [];  // ids de les 4 respostes de la pregunta que modifiquem


//--------------------------------FUNCIONS

// CONSULTAR: demana les preguntes al servidor i les pinta
function carregarPreguntes() {
  fetch("./preguntes")
    .then(resposta => resposta.json())
    .then(data => {
      preguntes = data;
      pintarLlista();
    });
}

// Dibuixa les preguntes amb les seves respostes (la correcta en negreta)
function pintarLlista() {
  let htmlStr = "";
  for (let i = 0; i < preguntes.length; i++) {
    const p = preguntes[i];

    // Cada pregunta és una targeta
    htmlStr += `<div class="card shadow-sm mb-2"><div class="card-body">`;
    htmlStr += `<p><b>${p.id}. ${p.pregunta}</b></p>`;
    if (p.imatge) {
      htmlStr += `<img src="${p.imatge}" height="60">`;
    }

    htmlStr += "<ul>";
    for (let j = 0; j < p.respostes.length; j++) {
      if (p.respostes[j].es_correcta) {
        htmlStr += `<li><b>${p.respostes[j].resposta} (correcta)</b></li>`;
      } else {
        htmlStr += `<li>${p.respostes[j].resposta}</li>`;
      }
    }
    htmlStr += "</ul>";

    htmlStr += `<button class="btnEditar btn btn-primary btn-sm" data-pos="${i}">Modificar</button>
                <button class="btnEliminar btn btn-danger btn-sm" data-id="${p.id}">Eliminar</button>
                </div></div>`;
  }
  document.getElementById("llista").innerHTML = htmlStr;
}

// Deixa el formulari buit, en mode "crear"
function netejarFormulari() {
  idEditant = null;
  idsRespostes = [];
  document.getElementById("titolFormulari").textContent = "Nova pregunta";
  document.getElementById("pregunta").value = "";
  document.getElementById("imatge").value = "";
  for (let i = 0; i < 4; i++) {
    document.getElementById("resposta" + i).value = "";
  }
  document.getElementsByName("correcta")[0].checked = true;
}

// Posa una pregunta al formulari per modificar-la
function editarPregunta(pos) {
  const p = preguntes[pos];
  idEditant = p.id;
  idsRespostes = [];

  document.getElementById("titolFormulari").textContent = "Modificar pregunta " + p.id;
  document.getElementById("pregunta").value = p.pregunta;
  for (let i = 0; i < 4; i++) {
    document.getElementById("resposta" + i).value = p.respostes[i].resposta;
    document.getElementsByName("correcta")[i].checked = p.respostes[i].es_correcta;
    idsRespostes.push(p.respostes[i].id);
  }
    // Pugem a dalt de tot de la pàgina (on hi ha el formulari), amb moviment suau
  window.scrollTo({ top: 0, behavior: "smooth" });

}

// CREAR o MODIFICAR (segons si idEditant té valor)
function guardarPregunta() {
  // Preparem l'array de les 4 respostes
  const respostes = [];
  for (let i = 0; i < 4; i++) {
    respostes.push({
      id: idsRespostes[i],  // només té valor si estem modificant
      resposta: document.getElementById("resposta" + i).value,
      es_correcta: document.getElementsByName("correcta")[i].checked
    });
  }

  // Com que enviem un fitxer, fem servir FormData (multipart/form-data)
  const dades = new FormData();
  dades.append("pregunta", document.getElementById("pregunta").value);
  dades.append("respostes", JSON.stringify(respostes));
  const fitxer = document.getElementById("imatge").files[0];
  if (fitxer) {
    dades.append("imatge", fitxer);
  }

  // Si modifiquem: PUT /preguntes/id. Si creem: POST /preguntes
  let url = "./preguntes";
  let metode = "POST";
  if (idEditant != null) {
    url = "./preguntes/" + idEditant;
    metode = "PUT";
  }

  // No posem Content-Type: el navegador el posa sol quan és FormData
  fetch(url, { method: metode, body: dades })
    .then(resposta => resposta.json())
    .then(resultat => {
      alert(resultat.missatge);
      netejarFormulari();
      carregarPreguntes();
    });
}

// ELIMINAR
function eliminarPregunta(id) {
  if (!confirm("Vols eliminar la pregunta " + id + "?")) return;

  fetch("./preguntes/" + id, { method: "DELETE" })
    .then(resposta => resposta.json())
    .then(resultat => {
      alert(resultat.missatge);
      carregarPreguntes();
    });
}


//------------------------------MAIN------------------------
window.addEventListener("load", function () {
  document.getElementById("btnGuardar").addEventListener("click", guardarPregunta);
  document.getElementById("btnCancelar").addEventListener("click", netejarFormulari);

  // Un sol listener per a tots els botons de la llista
  document.getElementById("llista").addEventListener("click", function (e) {
    if (e.target.classList.contains("btnEditar")) {
      editarPregunta(e.target.dataset.pos);
    }
    if (e.target.classList.contains("btnEliminar")) {
      eliminarPregunta(e.target.dataset.id);
    }
  });

  carregarPreguntes();
});