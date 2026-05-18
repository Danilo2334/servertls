const { sendThreat } = require('./kafkaClient/producer');
const fs = require('fs');
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

const PRIVATE_KEY = fs.readFileSync('./keys/private.pem');
const PUBLIC_KEY = fs.readFileSync('./keys/public.pem');

let db;
let refreshTokens = []; // Para almacenar tokens de refresco (en memoria para demo)

setupDB().then(database => {
    db = database;
    console.log('✅ DB lista');
});

// 🔐 Middleware JWT
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: "Token requerido" });

    jwt.verify(
        token,
        PUBLIC_KEY,
        { algorithms: ['RS256'] },
        (err, user) => {
        if (err) return res.status(403).json({ error: "Token inválido" });
        req.user = user;
        next();
    });
}

// 🧾 Registro
app.post('/api/register', async (req, res) => {
    const { username, password, role } = req.body;

    const hash = await bcrypt.hash(password, 10);

    try {
        await db.run(
            `INSERT INTO users (username, password_hash, role)
             VALUES (?, ?, ?)`,
            [username, hash, role || 'analyst']
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

    // 🔐 Admin requiere 2FA
    if (user.role === 'admin' && !user.twofa_secret) {

        const tempToken = jwt.sign(
            {
                name: user.username,
                role: user.role,
                setup2FA: true
            },
            PRIVATE_KEY,
            {
                algorithm: 'RS256',
                expiresIn: '10m'
            }
        );

        return res.status(403).json({
            error: "Admin debe activar 2FA",
            setupToken: tempToken
        });
    }

    const accessToken = jwt.sign(
        { name: user.username },
        PRIVATE_KEY,
        {
            algorithm: 'RS256',
            expiresIn: '15m'
        }
    );

    const refreshToken = jwt.sign(
        { name: user.username },
        PRIVATE_KEY,
        {
            algorithm: 'RS256',
            expiresIn: '7d'
        }
    );

    refreshTokens.push(refreshToken);

    res.json({
        accessToken,
        refreshToken,
        has2FA: !!user.twofa_secret
    });
});

// 🔄 Refresh Token
app.post('/api/refresh', (req, res) => {

    const { refreshToken } = req.body;

    if (!refreshToken) {

        return res.status(401).json({
            error: 'Refresh token requerido'
        });
    }

    if (!refreshTokens.includes(refreshToken)) {

        return res.status(403).json({
            error: 'Refresh token inválido'
        });
    }

    jwt.verify(

        refreshToken,

        PUBLIC_KEY,

        { algorithms: ['RS256'] },

        (err, user) => {

            if (err) {

                return res.status(403).json({
                    error: 'Refresh token expirado'
                });
            }

            const newAccessToken = jwt.sign(

                { name: user.name },

                PRIVATE_KEY,

                {
                    algorithm: 'RS256',
                    expiresIn: '15m'
                }
            );

            res.json({
                accessToken: newAccessToken
            });
        }
    );
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

// ✅ Endpoint seguro contra SQL Injection
app.get('/api/search', async (req, res) => {

    const username = req.query.username;

    try {

        const users = await db.all(
            'SELECT * FROM users WHERE username = ?',
            [username]
        );

        res.json(users);

    } catch (e) {

        res.status(500).json({
            error: e.message
        });
    }
});

// � Enviar amenaza a Kafka
app.post('/api/threat', async (req, res) => {

    try {

        const { severity, message, ip } = req.body;

        await db.run(
            `INSERT INTO threats (severity, message, ip)
             VALUES (?, ?, ?)`,
            [severity, message, ip]
        );

        await sendThreat({
            severity,
            message,
            ip
        });

        console.log("🚨 Amenaza enviada:", {
            severity,
            message,
            ip
        });

        res.json({
            success: true,
            threat: {
                severity,
                message,
                ip
            }
        });

    } catch (e) {

        console.error(e);

        res.status(500).json({
            error: e.message
        });
    }
});
// 📋 Obtener amenazas
app.get('/api/alerts', authenticateToken, async (req, res) => {

    const alerts = await db.all(`
        SELECT *
        FROM threats
        ORDER BY created_at DESC
    `);

    res.json(alerts);
});
// �🚀 Servidor
app.listen(3000, () => {
    console.log("🚀 Servidor corriendo en http://localhost:3000");
});