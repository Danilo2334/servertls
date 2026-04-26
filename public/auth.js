let tempSecret = "";

async function configurar2FA() {
    const token = localStorage.getItem('token');

    const res = await fetch('/api/2fa/setup', {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` }
    });

    const data = await res.json();

    tempSecret = data.secret;

    document.getElementById('qr-container').innerHTML =
        `<img src="${data.qrCode}" width="200">`;
}

async function verificar2FA() {
    const token = localStorage.getItem('token');
    const code = document.getElementById('codigo2fa').value;

    const res = await fetch('/api/2fa/verify', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
            token: code,
            secret: tempSecret
        })
    });

    const data = await res.json();

    if (data.success) {
        alert("✅ 2FA activado");
    } else {
        alert("❌ Código incorrecto");
    }
}