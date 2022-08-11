// const API_KEY = process.env.VUE_APP_API_KEY;

const tickersHandlers = new Map();

export const loadTickersStatistics = async () => {
  if (tickersHandlers.size === 0) {
    return;
  }

  const url = new URL("https://min-api.cryptocompare.com/data/pricemulti");
  const tickersList = [...tickersHandlers].map(([name]) => name);
  url.search = new URLSearchParams({
    fsyms: tickersList.join(","),
    tsyms: "USD",
  });

  const res = await fetch(url.toString());
  const exchangeData = await res.json();

  Object.entries(exchangeData).forEach(([tickerName, newPriceData]) => {
    const handlers = tickersHandlers.get(tickerName.toLowerCase()) || [];
    handlers.forEach((fn) => fn(newPriceData.USD));
  });
};

export const loadTickersList = async () => {
  const res = await fetch(
    "https://min-api.cryptocompare.com/data/all/coinlist?summary=true"
  );
  const exchangeData = await res.json();
  return exchangeData;
};

export const subscribeToTicker = (tickerName, cb) => {
  const subscribers = tickersHandlers.get(tickerName) || [];
  tickersHandlers.set(tickerName, [...subscribers, cb]);
};

export const unsubscribeFromTicker = (tickerName) => {
  tickersHandlers.delete(tickerName);
};
