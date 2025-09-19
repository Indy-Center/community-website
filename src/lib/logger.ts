import { consola } from 'consola';
import { env } from '$env/dynamic/public';

let logger = consola.create({ level: Number(env.PUBLIC_CONSOLA_LEVEL) });

export { logger };
