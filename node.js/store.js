const Redis = require("ioredis");
const uuid = require("uuid");

const redis = new Redis(process.env.REDIS_URL);

function scoreKey(ticker, user_id) {
  return "score#" + ticker + "#" + user_id;
}

exports.set_ticker = async (ticker, seconds, price) => {
  const json = JSON.stringify({ ticker, seconds, price });
  await this.redis.set("ticker#" + ticker, json);
  await this.redis.zadd("history#" + ticker, seconds, json);
};

exports.getTicker = async (ticker) => {
  const value = await this.redis.get("ticker#" + ticker);
  return JSON.parse(value);
};

exports.getHistory = async (ticker) => {
  return (await this.redis.zrange("history#" + ticker, -history_length, -1)).map(JSON.parse);
};

exports.getBets = async (ticker, user_id) => {
  const key = "bets#" + ticker + "#" + user_id;
  return (await this.redis.zrange(key, 0, -1)).map(JSON.parse);
};

exports.getScore = async (ticker, user_id) => {
  const value = await this.redis.get(this.scoreKey(ticker, user_id));
  return JSON.parse(value);
};

exports.setScore = async (ticker, user_id, score) => {
  const json = JSON.stringify(score);
  await this.redis.set(this.scoreKey(ticker, user_id), json);
};

exports.diffScore = async (ticker, user_id, diff) => {
  const score = await this.getScore(ticker, user_id);
  await this.setScore(ticker, user_id, score + diff);
};

exports.putBet = async (ticker, user_id, is_up) => {
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
  await this.redis.zadd(key, seconds, JSON.stringify(bet));
  wssPrivateBroadcast(user_id, "bet-update", bet);
  setTimeout(async () => {
    const close_ticker = JSON.parse(await this.redis.get("ticker#" + ticker));
    // update the bet
    // store it back to user bets table
    // delete it from root bets table
    wssPrivateBroadcast(user_id, "bet-resolve", bet);
  }, 1000 * 5);
  return bet;
};
