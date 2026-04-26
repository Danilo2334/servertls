async function login() {
    const username = document.getElementById('username').value;
    const password = document.getElementById('password').value;

    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password })
    });

    const data = await res.json();

    if (data.token) {
        localStorage.setItem('token', data.token);

        if (data.has2FA) {
            alert("🔐 Ingresa tu código 2FA");
        } else {
            alert("⚠️ Configura 2FA primero");
        }

        document.getElementById('section-2fa').style.display = 'block';
    } else {
        alert(data.error);
    }
}