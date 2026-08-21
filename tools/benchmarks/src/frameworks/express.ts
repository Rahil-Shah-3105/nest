import express from 'express';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

const app = express();

app.get('/', async (_, res) => {
logger.debug(`>>> Entering GET_root(_=${_},res=${res})`);
  res.send('Hello world');
});

app.listen(3000);
