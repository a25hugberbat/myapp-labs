const express = require('express');
const { v4: uuidv4 } = require('uuid');
const app = express();
const fs = require('fs');
const path = require('path');
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

app.listen(port, () => {
    console.log(`Example app listening on port ${port}`);
});

// --- Consultar preguntes ---
app.get('/preguntes', (req, res) => {
    // Mismo SELECT que en /json1: traemos pregunta + cada respuesta.
    const sql = `
        SELECT p.id AS pregunta_id, p.pregunta, p.imatge,
               r.id AS resposta_id, r.resposta, r.es_correcta
        FROM preguntes p
        JOIN respostes r ON r.pregunta_id = p.id
        ORDER BY p.id, r.id
    `;

    con.query(sql, (err, files) => {
        if (err) {
            return res.status(500).json({ error: 'Error consultant la base de dades' });
        }
        // Aquí sí devolvemos es_correcta (a diferencia de /json1),
        // porque esta ruta es para gestión, no para jugar.
        res.json(agruparPreguntes(files));
    });
});


// --- Afegir una pregunta ---
app.post('/preguntes', (req, res) => {
    // Sacamos los campos esperados del cuerpo de la petición.
    const { pregunta, imatge, respostes } = req.body;

    // Validación básica: sin pregunta o sin respuestas, no seguimos.
    if (!pregunta || !Array.isArray(respostes) || respostes.length === 0) {
        return res.status(400).json({ error: 'Falten dades: pregunta i respostes són obligatòries' });
    }

    // Insertamos primero la pregunta, sin sus respuestas todavía.
    con.query(
        'INSERT INTO preguntes (pregunta, imatge) VALUES (?, ?)',
        [pregunta, imatge || null],
        (err, resultatPregunta) => {
            if (err) {
                return res.status(500).json({ error: 'Error creant la pregunta' });
            }

            // Id autogenerado por MySQL, necesario para relacionar las respuestas.
            const novaPreguntaId = resultatPregunta.insertId;

            // Contador de inserciones pendientes: con callbacks no podemos
            // usar await dentro de un for, así que llevamos la cuenta a mano
            // para saber cuándo han terminado todas las respuestas.
            let pendents = respostes.length;

            // Recorremos cada opción de respuesta recibida.
            respostes.forEach(r => {
                // Insertamos esta opción, apuntando a la pregunta recién creada.
                con.query(
                    'INSERT INTO respostes (pregunta_id, resposta, es_correcta) VALUES (?, ?, ?)',
                    [novaPreguntaId, r.resposta, !!r.es_correcta],
                    (err2) => {
                        if (err2) {
                            return res.status(500).json({ error: 'Error creant les respostes' });
                        }

                        // Restamos una del contador de pendientes.
                        pendents--;

                        // Cuando ya no queda ninguna pendiente, respondemos al cliente.
                        if (pendents === 0) {
                            res.status(201).json({ id: novaPreguntaId, pregunta, imatge, respostes });
                        }
                    }
                );
            });
        }
    );
});


// --- Modificar una pregunta ---
app.put('/preguntes/:id', (req, res) => {
    // Id de la pregunta a modificar.
    const id = req.params.id;

    // Nuevos valores recibidos.
    const { pregunta, imatge } = req.body;

    // El texto de la pregunta es obligatorio.
    if (!pregunta) {
        return res.status(400).json({ error: 'Falta el camp pregunta' });
    }

    // Ejecutamos el UPDATE con los nuevos valores.
    con.query(
        'UPDATE preguntes SET pregunta = ?, imatge = ? WHERE id = ?',
        [pregunta, imatge || null, id],
        (err, resultat) => {
            if (err) {
                return res.status(500).json({ error: 'Error modificant la pregunta' });
            }

            // Si no se actualizó ninguna fila, es que ese id no existía.
            if (resultat.affectedRows === 0) {
                return res.status(404).json({ error: 'Pregunta no trobada' });
            }

            // Confirmamos los nuevos datos al cliente.
            res.json({ id, pregunta, imatge });
        }
    );
});


// --- Eliminar una pregunta ---
app.delete('/preguntes/:id', (req, res) => {
    // Id de la pregunta a borrar.
    const id = req.params.id;

    // Ejecutamos el DELETE (las respuestas se borran solas por el
    // ON DELETE CASCADE definido en la clave foránea).
    con.query(
        'DELETE FROM preguntes WHERE id = ?',
        [id],
        (err, resultat) => {
            if (err) {
                return res.status(500).json({ error: 'Error eliminant la pregunta' });
            }

            // Si no se borró ninguna fila, ese id no existía.
            if (resultat.affectedRows === 0) {
                return res.status(404).json({ error: 'Pregunta no trobada' });
            }

            // 204 = éxito, sin contenido que devolver.
            res.status(204).send();
        }
    );
});