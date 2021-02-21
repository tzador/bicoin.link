const Redis = require("ioredis");
const uuid = require("uuid");

const HISTORY_LENGTH = 60 * 10; // Ten minutes

const redis = new Redis(process.env.REDIS_URL);

function scoreKey(ticker, user_id) {
  return "score#" + ticker + "#" + user_id;
}

exports.set_ticker = async (ticker, seconds, price) => {
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

exports.getBets = async (ticker, user_id) => {
  const key = "bets#" + ticker + "#" + user_id;
  return (await redis.zrange(key, 0, -1)).map(JSON.parse);
};

exports.getScore = async (ticker, user_id) => {
  const value = await redis.get(scoreKey(ticker, user_id));
  return JSON.parse(value);
};

exports.setScore = async (ticker, user_id, score) => {
  const json = JSON.stringify(score);
  await redis.set(scoreKey(ticker, user_id), json);
};

exports.diffScore = async (ticker, user_id, diff) => {
  const score = await this.getScore(ticker, user_id);
  await this.setScore(ticker, user_id, score + diff);
};

exports.newBet = async (ticker, user_id, is_up) => {
  const seconds = Math.ceil(last_time);
  const bet = {
    bet_id: uuid.v4(),
    user_id,
    seconds,
    is_up,
    open_price: last_price,
    close_price: null,
    win: null,
  };
  const key = "bets#" + ticker + "#" + user_id;
  await redis.zadd(key, seconds, JSON.stringify(bet));
  return bet;
};
