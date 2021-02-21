const Redis = require("ioredis");
const uuid = require("uuid");

const HISTORY_LENGTH = 60 * 10; // 10 minutes

const redis = new Redis(process.env.REDIS_URL);

function scoreKey(ticker, user_id) {
  return "score#" + ticker + "#" + user_id;
}

function betKey(ticker, user_id) {
  return "bets#" + ticker + "#" + user_id;
}

exports.setTicker = async (ticker, seconds, price) => {
  const json = JSON.stringify({ ticker, seconds, price });
  await redis.set("ticker#" + ticker, json);
  await redis.zadd("history#" + ticker, seconds, json);
};

exports.getTicker = async (ticker) => {
  const value = await redis.get("ticker#" + ticker);
  return JSON.parse(value);
};

exports.getHistory = async (ticker) => {
  return (await redis.zrange("history#" + ticker, -HISTORY_LENGTH, -1)).map(JSON.parse);
};

exports.getScore = async (ticker, user_id) => {
  return JSON.parse((await redis.get(scoreKey(ticker, user_id))) || "0");
};

exports.setScore = async (ticker, user_id, score) => {
  await redis.set(scoreKey(ticker, user_id), score);
  return score;
};

exports.diffScore = async (ticker, user_id, diff) => {
  const score = await this.getScore(ticker, user_id);
  await this.setScore(ticker, user_id, score + diff);
  return score + diff;
};

exports.getBets = async (ticker, user_id) => {
  const key = "bets#" + ticker + "#" + user_id;
  return (await redis.zrange(key, 0, -1)).map(JSON.parse);
};

exports.newBet = async (ticker, user_id, open_seconds, open_price, is_up) => {
  const bet = {
    ticker,
    bet_id: uuid.v4(),
    user_id,
    is_up,
    open_seconds,
    close_seconds: null,
    open_price,
    close_price: null,
    win: null,
  };
  await redis.zadd(betKey(ticker, user_id), open_seconds, JSON.stringify(bet));
  return bet;
};

exports.saveBet = async (bet) => {
  const key = betKey(bet.ticker, bet.user_id);
  await redis.zremrangebyscore(key, bet.open_seconds, bet.open_seconds);
  await redis.zadd(key, bet.open_seconds, JSON.stringify(bet));
};
