const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const port = Number(process.argv[2]) ||20000;


// Importamos la conexión a la base de datos.
const con = require('./db');                            

// Aquí guardem cada partida: la clau és el sessionId (UUID) i el valor,
// les 10 preguntes que li han tocat a aquell usuari, en aquell ordre.
// Mentre el servidor estigui engegat, aquesta informació hi és; si es
// reinicia el servidor, es perd (per aquesta activitat no cal ni
// eliminar-la ni fer-la caducar).
const sessions = new Map();

app.get('/funcions.js', (req, res) => {
    let contingut = fs.readFileSync(path.join(__dirname, 'public', 'funcions.js'), 'utf8');
    contingut = contingut.replace(/http:\/\/localhost:\d+/g, `http://localhost:${port}`);
    res.type('application/javascript');
    res.send(contingut);
});

app.use(express.static('public'));
app.use(express.json()); // per poder llegir el body JSON dels POST


//=================================================================
//=========================FUNCIONS================================
//=================================================================

// Recibe las filas "planas" que devuelve el JOIN de SQL (una fila
// por cada pregunta+opción) y las reagrupa en objetos anidados.
function agruparPreguntes(files) {
    // Usamos un Map para agrupar filas por pregunta, sin duplicar.
    const mapa = new Map();

    // Recorremos cada fila del resultado.
    for (const fila of files) {
        // Si es la primera vez que vemos esta pregunta...
        if (!mapa.has(fila.pregunta_id)) {
            // ...creamos su objeto base en el Map.
            mapa.set(fila.pregunta_id, {
                id: fila.pregunta_id,       // id de la pregunta
                pregunta: fila.pregunta,    // texto de la pregunta
                imatge: fila.imatge,        // url de la imagen
                respostes: []                // array donde iremos añadiendo sus opciones
            });
        }
        // Añadimos la opción de esta fila al array de esa pregunta.
        mapa.get(fila.pregunta_id).respostes.push({
            id: fila.resposta_id,            // id de la opción
            resposta: fila.resposta,         // texto de la opción
            es_correcta: !!fila.es_correcta  // !! convierte 0/1 a booleano true/false
        });
    }

    // Convertimos el Map en un array normal de preguntas.
    return Array.from(mapa.values());
}

// Barreja un array amb l'algoritme Fisher-Yates i en retorna "cantidad"
// elements, sense repetir-ne cap.
// Recorre la còpia de darrere cap endavant: a cada pas tria una posició
// a l'atzar entre 0 i la posició actual (inclosa) i intercanvia els dos
// elements. Així cada ordre possible té la mateixa probabilitat.
function preguntasAleatorias(llista, cantidad) {
    let copia = [...llista]; // còpia, per no alterar l'array original
    for (let i = copia.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copia[i], copia[j]] = [copia[j], copia[i]]; // intercanvi
    }
    return copia.slice(0, cantidad);
}
//=================================================================

// RUTA 1: inicia una partida.
// Selecciona 10 preguntes a l'atzar, crea una sessió nova (UUID),
// hi guarda les preguntes al servidor, i retorna al client el
// sessionId + les preguntes SENSE la resposta correcta.

// Ruta GET, usamos callback.
app.get('/json1', (req, res) => {
    // Consulta que trae cada pregunta unida (JOIN) con cada una de
    // sus respuestas, en filas planas, ordenadas por pregunta.
    const sql = `
        SELECT p.id AS pregunta_id, p.pregunta, p.imatge,
               r.id AS resposta_id, r.resposta, r.es_correcta
        FROM preguntes p
        JOIN respostes r ON r.pregunta_id = p.id
        ORDER BY p.id, r.id
    `;

    // Ejecutamos la consulta; el resultado llega en el callback.
    con.query(sql, (err, files) => {
        // Si algo falla, respondemos 500 en vez de tumbar el servidor.
        if (err) {
            return res.status(500).json({ error: 'Error consultant la base de dades' });
        }

        // Reagrupamos las filas planas en preguntas con su array de respuestas.
        const totesLesPreguntes = agruparPreguntes(files);

        // Elegimos 10 preguntas al azar, igual que antes.
        const preguntesSeleccionades = preguntasAleatorias(totesLesPreguntes, 10);

        // Generamos un id de sesión nuevo.
        const sessionId = uuidv4();

        // Guardamos las preguntas de esta partida en memoria del servidor.
        sessions.set(sessionId, { preguntes: preguntesSeleccionades });

        // Preparamos la versión pública para el cliente, sin es_correcta.
        const preguntesPerAlClient = preguntesSeleccionades.map(pregunta => ({
            id: pregunta.id,
            pregunta: pregunta.pregunta,
            imatge: pregunta.imatge,
            respostes: pregunta.respostes.map(r => ({ id: r.id, resposta: r.resposta }))
        }));

        // Enviamos la respuesta al cliente.
        res.json({ sessionId, preguntes: preguntesPerAlClient });
    });
});

// RUTA 2: rep el sessionId + les respostes marcades per l'usuari,
// les compara amb les correctes (que el servidor coneix internament)
// i retorna la puntuació.

app.post('/json2', (req, res) => {
    // Extraemos los datos que envía el cliente.
    const { sessionId, respostesUsuari } = req.body;

    // Validamos que vengan ambos campos y bien formados.
    if (!sessionId || !Array.isArray(respostesUsuari)) {
        return res.status(400).json({ error: 'Petición inválida' });
    }

    // Recuperamos las preguntas que le tocaron a esta sesión.
    const partida = sessions.get(sessionId);
    const preguntesDeLaPartida = partida.preguntes;

    // Contador de aciertos.
    let correctes = 0;

    // Recorremos cada pregunta de la partida, con su índice i.
    preguntesDeLaPartida.forEach((pregunta, i) => {
        // Respuesta que dio el usuario para esa pregunta (o undefined).
        const respostaUsuari = respostesUsuari[i];

        // Si no la contestó, la saltamos.
        if (!respostaUsuari) return;

        // Opción que marcó, por su posición en el array.
        const opcioMarcada = pregunta.respostes[respostaUsuari.resp];

        // Si existe esa opción y su flag es_correcta es true, sumamos acierto.
        if (opcioMarcada && opcioMarcada.es_correcta) {
            correctes++;
        }
    });

    // Devolvemos el resultado final.
    res.json({ total: preguntesDeLaPartida.length, correctes: correctes });
});

// =================================================================
// ========================= CRUD PREGUNTES ========================
// =================================================================

// Versió amb promeses del mateix pool de db.js: així podem fer servir
// async/await al CRUD sense tocar db.js ni les rutes /json1 i /json2.
const db = con.promise();

// --- Configuració de multer (rep els fitxers del formulari) ---
// Les imatges es guarden a la carpeta public/images. Com que ja fem
// express.static('public'), un fitxer public/images/a.jpg es pot veure
// al navegador amb la URL /images/a.jpg
const carpetaImatges = path.join(__dirname, 'public', 'images');
fs.mkdirSync(carpetaImatges, { recursive: true }); // crea la carpeta si no existeix

const upload = multer({
  storage: multer.diskStorage({
    destination: carpetaImatges,
    // nom únic per a no trepitjar altres imatges: pregunta + data + extensió
    filename: (req, file, cb) => {
      cb(null, "pregunta" + Date.now() + path.extname(file.originalname));
    }
  })
});


// GET - obtenir totes les preguntes (amb les seves respostes)
app.get("/preguntes", async (req, res) => {
  try {
    const [files] = await db.query(`
      SELECT p.id AS pregunta_id, p.pregunta, p.imatge,
             r.id AS resposta_id, r.resposta, r.es_correcta
      FROM preguntes p
      JOIN respostes r ON r.pregunta_id = p.id
      ORDER BY p.id, r.id
    `);

    // Aquí sí retornem es_correcta: aquesta ruta és de gestió, no de joc
    res.json(agruparPreguntes(files));

  } catch (error) {
    console.error(error);
    res.status(500).send("Error llegint preguntes");
  }
});


// POST - crear una pregunta amb les seves respostes
// Ara la petició és multipart/form-data, per això posem upload.single("imatge"):
// multer agafa el fitxer del camp "imatge" i el desa a la carpeta.
// Els altres camps del formulari queden a req.body (com a text).
app.post("/preguntes", upload.single("imatge"), async (req, res) => {
  try {
    const pregunta = req.body.pregunta;
    // "respostes" arriba com a text JSON, el convertim a array
    const respostes = JSON.parse(req.body.respostes || "[]");

    if (!pregunta || !Array.isArray(respostes) || respostes.length === 0) {
      return res.status(400).send("Falten dades: pregunta i respostes són obligatòries");
    }

    // Només guardem el path a la BD (si s'ha pujat imatge)
    const imatge = req.file ? "/images/" + req.file.filename : null;

    const [resultat] = await db.query(
      "INSERT INTO preguntes (pregunta, imatge) VALUES (?, ?)",
      [pregunta, imatge]
    );

    const idPregunta = resultat.insertId;

    for (const r of respostes) {
      await db.query(
        "INSERT INTO respostes (pregunta_id, resposta, es_correcta) VALUES (?, ?, ?)",
        [idPregunta, r.resposta, !!r.es_correcta]
      );
    }

    res.json({ missatge: "Pregunta creada" });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error creant pregunta");
  }
});


// PUT - modificar una pregunta, les seves respostes i quina és la correcta
app.put("/preguntes/:id", upload.single("imatge"), async (req, res) => {
  try {
    const id = req.params.id;
    const pregunta = req.body.pregunta;
    const respostes = JSON.parse(req.body.respostes || "[]");

    if (!pregunta) {
      return res.status(400).send("Falta el camp pregunta");
    }

    // Si no s'ha pujat cap imatge nova, posem null i amb COALESCE
    // la BD es queda amb la imatge que ja tenia.
    const imatge = req.file ? "/images/" + req.file.filename : null;

    const [resultat] = await db.query(
      "UPDATE preguntes SET pregunta = ?, imatge = COALESCE(?, imatge) WHERE id = ?",
      [pregunta, imatge, id]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).send("Pregunta no trobada");
    }

    // Actualitzem cada resposta pel seu id (text + si és la correcta)
    for (const r of respostes) {
      await db.query(
        "UPDATE respostes SET resposta = ?, es_correcta = ? WHERE id = ? AND pregunta_id = ?",
        [r.resposta, !!r.es_correcta, r.id, id]
      );
    }

    res.json({ missatge: "Pregunta modificada" });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error modificant pregunta");
  }
});


// DELETE - eliminar una pregunta (les respostes s'esborren pel ON DELETE CASCADE)
app.delete("/preguntes/:id", async (req, res) => {
  try {
    const id = req.params.id;

    const [resultat] = await db.query(
      "DELETE FROM preguntes WHERE id = ?",
      [id]
    );

    if (resultat.affectedRows === 0) {
      return res.status(404).send("Pregunta no trobada");
    }

    res.json({ missatge: "Pregunta eliminada" });

  } catch (error) {
    console.error(error);
    res.status(500).send("Error eliminant pregunta");
  }
});


app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});