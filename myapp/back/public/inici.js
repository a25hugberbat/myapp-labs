//--------------------------------FUNCIONS

// Mira el localStorage i ensenya el login o les opcions segons si hi ha nom
function mostrarSegonsSessio() {
  const nom = localStorage.getItem("nom");

  if (nom != null) {
    // REGISTRAT: saludem, amaguem la capsa de text i ensenyem les opcions
    document.getElementById("divBenvinguda").innerHTML = "Hola <span class='fw-bold fs-5 text-primary'>" + nom + "</span> benvingut"
    document.getElementById("inputNom").classList.add("d-none")
    document.getElementById("btnGuardar").classList.add("d-none")
    document.getElementById("btnEsborrar").classList.remove("d-none")
    document.getElementById("divOpcions").classList.remove("d-none")
  } else {
    // NO REGISTRAT: demanem el nom i amaguem les opcions
    document.getElementById("divBenvinguda").innerHTML = ""
    document.getElementById("inputNom").classList.remove("d-none")
    document.getElementById("btnGuardar").classList.remove("d-none")
    document.getElementById("btnEsborrar").classList.add("d-none")
    document.getElementById("divOpcions").classList.add("d-none")
  }
}


//------------------------------MAIN------------------------
window.addEventListener("load", function () {

  // ACTIVAR TOOLTIPS: Bootstrap no els activa sols, cal fer-ho amb JavaScript
  document.querySelectorAll('[data-bs-toggle="tooltip"]').forEach(function (element) {
    new bootstrap.Tooltip(element)
  })

  // Segons si ja hi ha nom guardat, ensenyem una cosa o l'altra
  mostrarSegonsSessio()

  // INICIAR SESSIÓ: guarda el nom al localStorage
  document.getElementById("btnGuardar").addEventListener("click", function () {
    let nom = document.getElementById("inputNom").value.trim()

    // Sense nom no ens registrem
    if (nom == "") {
      Swal.fire({ icon: 'warning', title: "Escriu el teu nom" })
      return
    }

    localStorage.setItem("nom", nom)
    document.getElementById("inputNom").value = ""
    mostrarSegonsSessio()
    Swal.fire({ icon: 'success', title: "Benvingut/a " + nom })
  })

  // TANCAR SESSIÓ: esborra el nom del localStorage
  document.getElementById("btnEsborrar").addEventListener("click", function () {
    localStorage.removeItem("nom")
    mostrarSegonsSessio()
  })

});