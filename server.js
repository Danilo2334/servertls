const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('<h1>Servidor funcionando 🚀</h1>');
});

app.listen(3000, () => {
    console.log('Deploy funcionando 🔥');
});
