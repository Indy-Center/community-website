import { env } from '$env/dynamic/private';
import winston from 'winston';

const logger = winston.createLogger({
	level: env.LOG_LEVEL,
	format: env.NODE_ENV === 'production' ? winston.format.json() : winston.format.simple(),
	transports: [new winston.transports.Console()]
});

export default logger;
