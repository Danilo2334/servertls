const express = require('express');
const app = express();

app.get('/', (req, res) => {
    res.send('Hola mundo 🚀NUEVO');
});

app.listen(3000, () => {
    console.log('Deploy funcionando 🔥');
});
