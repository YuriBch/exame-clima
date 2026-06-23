const express = require('express');
const mysql = require('mysql2');
const axios = require('axios');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Substitua pelo seu token real da OpenWeatherMap aqui:
const SU_CHAVE_OPENWEATHER = '6be89edcddac14bb39044ee30ae12141';

// Conexão direta com o MySQL do XAMPP (Sem senha por padrão)
const db = mysql.createPool({
    host: '127.0.0.1',
    user: 'root',
    password: '', 
    database: 'clima_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// TESTE AUTOMÁTICO DE CONEXÃO COM O BANCO
db.getConnection((err, connection) => {
    if (err) {
        console.error('\n❌ ERRO AO CONECTAR NO MYSQL:', err.message);
    } else {
        console.log('\n✅ Conexão com o Banco de Dados MySQL realizada com sucesso!');
        connection.release();
    }
});

// 1. ROTA POST: Pesquisa o clima e salva no MySQL
app.post('/api/pesquisa', async (req, res) => {
    const { cidade } = req.body;
    if (!cidade) return res.status(400).json({ error: 'Cidade é obrigatória.' });

    try {
        const url = `https://api.openweathermap.org/data/2.5/weather?q=${encodeURIComponent(cidade)},BR&appid=${SU_CHAVE_OPENWEATHER}&units=metric&lang=pt_br`;
        const response = await axios.get(url);
        const dadosClima = response.data;

        const resultado = {
            cidade: dadosClima.name,
            temperatura: dadosClima.main.temp,
            condicao: dadosClima.weather[0].description,
            umidade: dadosClima.main.humidity,
            vento: dadosClima.wind.speed
        };

        const queryInsert = 'INSERT INTO historico_pesquisas (cidade, temperatura, condicao_climatica) VALUES (?, ?, ?)';
        db.query(queryInsert, [resultado.cidade, resultado.temperatura, resultado.condicao], (err) => {
            if (err) return res.status(500).json({ error: 'Erro ao salvar no banco.' });
            res.json(resultado);
        });
    } catch (error) {
        if (error.response && error.response.status === 404) {
            return res.status(404).json({ error: 'Cidade não encontrada no Brasil.' });
        }
        res.status(500).json({ error: 'Erro ao consultar a API externa.' });
    }
});

// 2. ROTA GET: Busca o histórico
app.get('/api/historico', (req, res) => {
    db.query('SELECT * FROM historico_pesquisas ORDER BY data_hora DESC', (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

// 3. ROTA PUT: Edita um registro
app.put('/api/historico/:id', (req, res) => {
    const { id } = req.params;
    const { cidade, temperatura, condicao_climatica } = req.body;
    const queryUpdate = 'UPDATE historico_pesquisas SET cidade = ?, temperatura = ?, condicao_climatica = ? WHERE id = ?';
    db.query(queryUpdate, [cidade, temperatura, condicao_climatica, id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Atualizado com sucesso.' });
    });
});

// 4. ROTA DELETE: Excluir registro
app.delete('/api/historico/:id', (req, res) => {
    const { id } = req.params;
    db.query('DELETE FROM historico_pesquisas WHERE id = ?', [id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ message: 'Excluído com sucesso.' });
    });
});

app.listen(5000, () => console.log('🚀 Servidor rodando na porta 5000'));