const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'threat-consumer',
    brokers: ['localhost:9092']
});

const consumer = kafka.consumer({
    groupId: 'security-group'
});

async function runConsumer() {

    await consumer.connect();

    await consumer.subscribe({
        topic: 'low',
        fromBeginning: true
    });

    await consumer.subscribe({
        topic: 'medium',
        fromBeginning: true
    });

    await consumer.subscribe({
        topic: 'critical',
        fromBeginning: true
    });

    console.log('👂 Escuchando amenazas...');

    await consumer.run({

        eachMessage: async ({ topic, message }) => {

            const threat = JSON.parse(message.value.toString());

            console.log(`
🚨 ALERTA DETECTADA
━━━━━━━━━━━━━━━━━━
Topic: ${topic}
Mensaje: ${threat.message}
IP: ${threat.ip}
━━━━━━━━━━━━━━━━━━
`);
        }
    });
}

runConsumer();
