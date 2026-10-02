//------------------------------INICI (index.html)------------------------
// Gestiona la sessió de l'usuari amb localStorage i mostra les opcions
// (Començar Quiz / Gestionar Preguntes) només quan hi ha un nom guardat.

// Ensenya l'estat "amb sessió": benvinguda, botó de sortir i opcions
function mostrarSessio(nom) {
  document.getElementById("divBenvinguda").textContent = "Hola " + nom + ", benvingut/da"
  document.getElementById("inputNom").classList.add("d-none")
  document.getElementById("btnGuardar").classList.add("d-none")
  document.getElementById("btnEsborrar").classList.remove("d-none")
  document.getElementById("divOpcions").classList.remove("d-none")
}

// Ensenya l'estat "sense sessió": capsa de text i botó d'iniciar
function amagarSessio() {
  document.getElementById("divBenvinguda").textContent = ""
  document.getElementById("inputNom").value = ""
  document.getElementById("inputNom").classList.remove("d-none")
  document.getElementById("btnGuardar").classList.remove("d-none")
  document.getElementById("btnEsborrar").classList.add("d-none")
  document.getElementById("divOpcions").classList.add("d-none")
}

window.addEventListener("load", function () {

  // Activem els tooltips de Bootstrap
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(el => new bootstrap.Tooltip(el))

  //------------------ persistencia ------------------
  // Miro LS a veure si hi ha alguna cosa
  let nomLS = localStorage.getItem("nom");

  if (nomLS != null) {
    Swal.fire({ icon: 'success', title: "Benvingut/da " + nomLS });
    mostrarSessio(nomLS)
  } else {
    amagarSessio()
  }

  // Guardar el nom al localStorage i ensenyar les opcions
  document.getElementById("btnGuardar").addEventListener("click", function () {
    let nom = document.getElementById("inputNom").value.trim()
    if (nom == "") {
      Swal.fire({ icon: 'warning', title: "Posa el teu nom" });
      return
    }
    localStorage.setItem("nom", nom)
    mostrarSessio(nom)
  })

  // Enter a la capsa de text = Iniciar Sessió
  document.getElementById("inputNom").addEventListener("keydown", function (e) {
    if (e.key === "Enter") document.getElementById("btnGuardar").click()
  })

  // Esborrar el nom del localStorage i tornar a l'estat inicial
  document.getElementById("btnEsborrar").addEventListener("click", function () {
    localStorage.removeItem("nom")
    amagarSessio()
  })
});
