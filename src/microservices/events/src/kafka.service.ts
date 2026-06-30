import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from '@nestjs/common';
import { Kafka, Producer, Consumer } from 'kafkajs';

@Injectable()
export class KafkaService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(KafkaService.name);
  private kafka: Kafka;
  private producer: Producer;
  private consumer: Consumer;

  constructor() {
    const brokers = (process.env.KAFKA_BROKERS || 'kafka:9092').split(',');
    this.kafka = new Kafka({
      clientId: 'events-service',
      brokers,
      retry: {
        initialRetryTime: 300,
        retries: 10
      }
    });
    this.producer = this.kafka.producer();
    this.consumer = this.kafka.consumer({ groupId: 'events-group' });
  }

  async onModuleInit() {
    let connected = false;
    let retries = 0;
    const maxRetries = 15;
    while (!connected && retries < maxRetries) {
      try {
        this.logger.log(`Connecting to Kafka (attempt ${retries + 1}/${maxRetries})...`);
        await this.producer.connect();
        connected = true;
        this.logger.log('Kafka Producer connected successfully');
      } catch (err) {
        retries++;
        this.logger.error(`Kafka connection failed: ${err.message}. Retrying in 3 seconds...`);
        await new Promise(resolve => setTimeout(resolve, 3000));
      }
    }

    if (!connected) {
      this.logger.error('Could not connect to Kafka after max retries. Exiting.');
      process.exit(1);
    }

    // Start background consumer
    this.runConsumer().catch(err => {
      this.logger.error('Failed to start consumer', err);
    });
  }

  async onModuleDestroy() {
    await this.producer.disconnect();
    await this.consumer.disconnect();
    this.logger.log('Kafka disconnected.');
  }

  async sendMessage(topic: string, payload: any) {
    try {
      await this.producer.send({
        topic,
        messages: [
          { value: JSON.stringify(payload) }
        ],
      });
      this.logger.log(`Sent message to topic ${topic}`);
    } catch (error) {
      this.logger.error(`Error sending message to topic ${topic}: ${error.message}`);
      throw error;
    }
  }

  private async runConsumer() {
    try {
      await this.consumer.connect();
      this.logger.log('Kafka Consumer connected successfully');

      await this.consumer.subscribe({ topic: 'movie-events', fromBeginning: true });
      await this.consumer.subscribe({ topic: 'user-events', fromBeginning: true });
      await this.consumer.subscribe({ topic: 'payment-events', fromBeginning: true });

      this.logger.log('Subscribed to topics: movie-events, user-events, payment-events');

      await this.consumer.run({
        eachMessage: async ({ topic, partition, message }) => {
          const payloadStr = message.value?.toString();
          this.logger.log(`Received message from topic [${topic}]: ${payloadStr}`);
        },
      });
    } catch (error) {
      this.logger.error(`Error in Kafka consumer: ${error.message}`);
    }
  }
}
