const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');
const speakeasy = require('speakeasy');
const qrcode = require('qrcode');
const bcrypt = require('bcryptjs');
const { setupDB } = require('./database');

const app = express();
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const SECRET_KEY = "mi_clave_super_secreta_123";

let db;

setupDB().then(database => {
    db = database;
    console.log('✅ DB lista');
});

// 🔐 Middleware JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Token requerido" });

    jwt.verify(token, SECRET_KEY, (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido" });
        req.user = user;
        next();
    });
}

// 🧾 Registro
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    const hash = await bcrypt.hash(password, 10);

    try {
        await db.run(
            'INSERT INTO users (username, password_hash) VALUES (?, ?)',
            [username, hash]
        );

        res.json({ mensaje: "Usuario creado" });
    } catch (e) {
        res.status(400).json({ error: "Usuario ya existe" });
    }
});

// 🔑 Login
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    const user = await db.get(
        'SELECT * FROM users WHERE username = ?',
        [username]
    );

    if (!user) return res.status(401).json({ error: "Usuario no existe" });

    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) return res.status(401).json({ error: "Contraseña incorrecta" });

    const token = jwt.sign({ name: user.username }, SECRET_KEY, { expiresIn: '1h' });

    res.json({
        token,
        has2FA: !!user.twofa_secret
    });
});

// 🔐 Generar QR
app.post('/api/2fa/setup', authenticateToken, (req, res) => {
    const secret = speakeasy.generateSecret({
        name: `ServidorTLS (${req.user.name})`
    });

    qrcode.toDataURL(secret.otpauth_url, (err, data_url) => {
        res.json({
            qrCode: data_url,
            secret: secret.base32
        });
    });
});

// 🔐 Verificar 2FA
app.post('/api/2fa/verify', authenticateToken, async (req, res) => {
    const { token, secret } = req.body;

    const verified = speakeasy.totp.verify({
        secret,
        encoding: 'base32',
        token,
        window: 1
    });

    if (verified) {
        await db.run(
            'UPDATE users SET twofa_secret = ? WHERE username = ?',
            [secret, req.user.name]
        );

        res.json({ success: true });
    } else {
        res.status(400).json({ success: false });
    }
});

// 🚀 Servidor
app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en http://localhost:3000");
});