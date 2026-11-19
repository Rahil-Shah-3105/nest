import express from 'express';
const logger = new ConsoleLogger('TestContext', { forceConsole: true });

const app = express();

app.get('/', async (_, res) => {
logger.error(`>>> Entering GET_root(_=${_},res=${res})`, { "event.action": "GET_root", "logrite._": _ });
  res.send('Hello world');
});

app.listen(3000);
