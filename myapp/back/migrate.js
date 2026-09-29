const mysql = require('mysql2/promise');
const preguntesData = require('./preguntes.json').preguntes;
const respostesData = require('./respostes.json').respostes;

async function migrar() {
    const connexio = await mysql.createConnection(require('./config'));

    console.log(`Migrant ${preguntesData.length} preguntes...`);

    for (const pregunta of preguntesData) {
        // 1. Inserim la pregunta i recuperem el nou id autoincremental
        const [resultatPregunta] = await connexio.query(
            'INSERT INTO preguntes (pregunta, imatge) VALUES (?, ?)',
            [pregunta.pregunta, pregunta.imatge]
        );
        const novaPreguntaId = resultatPregunta.insertId;

        // 2. Busquem quina és la resposta correcta d'aquesta pregunta
        //    (ve del fitxer respostes.json, per id de pregunta original)
        const infoCorrecta = respostesData.find(r => r.pregunta_id === pregunta.id);

        // 3. Inserim totes les opcions de resposta d'aquesta pregunta
        for (const resposta of pregunta.respostes) {
            const esCorrecta = infoCorrecta && resposta.id === infoCorrecta.resposta_correcta_id;
            await connexio.query(
                'INSERT INTO respostes (pregunta_id, resposta, es_correcta) VALUES (?, ?, ?)',
                [novaPreguntaId, resposta.resposta, esCorrecta]
            );
        }
    }

    console.log('Migració completada!');
    await connexio.end();
}

migrar().catch(err => {
    console.error('Error durant la migració:', err);
    process.exit(1);
});