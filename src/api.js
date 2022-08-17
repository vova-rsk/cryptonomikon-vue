const API_KEY = process.env.VUE_APP_API_KEY;
const AGGREGATE_INDEX = 5;
const ERROR_INDEX = 500;
const INVALID_TICKER_MSG = "INVALID_SUB";
const EXCHANGE = "CCCAGG";
const QUOTE = "USD";
const WS_ACTION_TYPE = { sub: "subscribe", unSub: "unsubscribe" };

const delayedLaunchFns = [];
const tickersHandlers = new Map();
let socket = null;

export const wsConnectionStart = () => {
  socket = new WebSocket(
    `wss://streamer.cryptocompare.com/v2?api_key=${API_KEY}`
  );
  socket.onopen = () => {
    delayedLaunchFns.forEach((fn) => fn());
  };
  socket.onmessage = wsMessageHandler;
};

function wsMessageHandler(message) {
  const data = JSON.parse(message.data);
  const {
    TYPE: type,
    FROMSYMBOL: tickerName,
    PRICE: tickerPrice,
    MESSAGE: invalidMsg,
    PARAMETER: invalidParam,
  } = data;

  const invalidTickerMsg =
    parseInt(type) === ERROR_INDEX && invalidMsg === INVALID_TICKER_MSG;
  const validTickerMsg =
    parseInt(type) === AGGREGATE_INDEX && tickerPrice && tickerName;

  if (!invalidTickerMsg && !validTickerMsg) return;

  const tickerData = {};

  if (validTickerMsg) {
    tickerData.isValid = true;
    tickerData.name = tickerName.toLowerCase();
    tickerData.price = tickerPrice;
  }

  if (invalidTickerMsg) {
    tickerData.isValid = false;
    tickerData.name = invalidParam.split("~")[2].toLowerCase();
  }

  const handlers = tickersHandlers.get(tickerData.name) || [];
  handlers.forEach((fn) => fn(tickerData));
}

const sendMessageToWs = (tickersList, action = WS_ACTION_TYPE.sub) => {
  const subs = tickersList.map((ticker) =>
    [AGGREGATE_INDEX, EXCHANGE, ticker.toUpperCase(), QUOTE].join("~")
  );

  const subRequest = {
    action: action === WS_ACTION_TYPE.unSub ? "SubRemove" : "SubAdd",
    subs,
  };

  socket.send(JSON.stringify(subRequest));
};

const subscribeToSingleTickerOnWs = (tickerName) => {
  if (socket.readyState === WebSocket.OPEN) {
    sendMessageToWs([tickerName.toUpperCase()]);
    return;
  }
  delayedLaunchFns.push(() => sendMessageToWs([tickerName.toUpperCase()]));
};

const unSubscribeFromSingleTickerOnWs = (tickerName) => {
  sendMessageToWs([tickerName.toUpperCase()], WS_ACTION_TYPE.unSub);
};

export const loadTickersList = async () => {
  const res = await fetch(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );
  const exchangeData = await res.json();
  return exchangeData;
};

export const wsConnectionClose = () => {
  socket.close();
};

export const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);

  subscribeToSingleTickerOnWs(tickerName);
};

export const unsubscribeFromTicker = (tickerName) => {
  tickersHandlers.delete(tickerName);

  unSubscribeFromSingleTickerOnWs(tickerName);
};
