const { Kafka } = require('kafkajs');

const kafka = new Kafka({
    clientId: 'threat-producer',
    brokers: ['localhost:9092']
});

const producer = kafka.producer();

async function sendThreat(threat) {

    await producer.connect();

    await producer.send({

        topic: threat.severity,

        messages: [
            {
                value: JSON.stringify(threat)
            }
        ]
    });

    console.log('🚨 Amenaza enviada:', threat);

    await producer.disconnect();
}

module.exports = { sendThreat };